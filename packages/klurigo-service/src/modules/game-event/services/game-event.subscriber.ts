import { randomUUID } from 'node:crypto'

import {
  GameEventType,
  GameStatus,
  HEARTBEAT_INTERVAL,
  isDefined,
} from '@klurigo/common'
import {
  Injectable,
  Logger,
  MessageEvent,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { InjectRedis } from '@nestjs-modules/ioredis'
import type { Redis } from 'ioredis'
import {
  concat,
  defer,
  EMPTY,
  finalize,
  fromEvent,
  Observable,
  of,
  ReplaySubject,
  Subject,
} from 'rxjs'
import { filter, map, takeUntil } from 'rxjs/operators'

import { PlayerNotFoundException } from '../../game-core/exceptions'
import { GameRepository } from '../../game-core/repositories'

import { GameParticipantEventBuilder } from './game-participant-event.builder'
import { DistributedEvent } from './models/event'

const REDIS_PUBSUB_CHANNEL = 'events'
const LOCAL_EVENT_EMITTER_CHANNEL = 'event'

type LocalHeartbeatEvent = {
  gameId?: never
  playerId?: never
  event: { type: GameEventType.GameHeartbeat }
}

type LocalEvent = DistributedEvent | LocalHeartbeatEvent

type Connection = {
  close: () => void
}

const isDistributedEvent = (value: unknown): value is DistributedEvent => {
  if (typeof value !== 'object' || value === null) return false

  const candidate = value as Record<string, unknown>
  const event = candidate.event

  return (
    typeof candidate.gameId === 'string' &&
    typeof event === 'object' &&
    event !== null &&
    typeof (event as Record<string, unknown>).type === 'string' &&
    (candidate.playerId === undefined ||
      typeof candidate.playerId === 'string') &&
    (candidate.version === undefined ||
      (typeof candidate.version === 'number' &&
        Number.isSafeInteger(candidate.version) &&
        candidate.version >= 0))
  )
}

const getEventVersion = (event: LocalEvent): number | undefined =>
  'version' in event ? event.version : undefined

/**
 * GameEventSubscriber bridges distributed game events to local SSE connections.
 *
 * Responsibilities:
 * - Subscribes to Redis Pub/Sub and converts published messages into local in-process events.
 * - Exposes a per-participant SSE-compatible observable stream using a local event emitter.
 * - Emits heartbeat events while at least one SSE connection is active to keep streams alive.
 *
 * Design notes:
 * - Redis Pub/Sub is used for cross-instance distribution.
 * - A local EventEmitter is used to fan out events to all connections within the current instance.
 */
@Injectable()
export class GameEventSubscriber implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(GameEventSubscriber.name)
  private readonly redisSubscriber: Redis

  private heartbeatIntervalId: NodeJS.Timeout | undefined

  /**
   * Tracks active SSE connections per participantId.
   * Needed because the same participant can have multiple concurrent connections (tabs, refresh race, etc).
   */
  private readonly connectionCountsByParticipantId = new Map<string, number>()
  private readonly connectionClosersByConnection = new Map<string, Connection>()

  /**
   * Creates a new GameEventSubscriber.
   *
   * @param redis - The primary Redis client used for queries and for duplicating a dedicated Pub/Sub subscriber connection.
   * @param gameRepository - Repository used to validate games and participants before opening an SSE stream.
   * @param gameParticipantEventBuilder - Shared builder used to construct initial participant-specific events.
   * @param eventEmitter - Local event emitter used to broadcast distributed events to all SSE subscriptions within this instance.
   */
  constructor(
    @InjectRedis() private readonly redis: Redis,
    private readonly gameRepository: GameRepository,
    private readonly gameParticipantEventBuilder: GameParticipantEventBuilder,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.redisSubscriber = redis.duplicate()
  }

  /**
   * Handles incoming Redis Pub/Sub messages.
   *
   * The payload is expected to be a JSON-encoded {@link DistributedEvent}. Invalid JSON or malformed payloads
   * are ignored and logged as warnings to avoid crashing the process or breaking message handling.
   *
   * @param _channel - The Redis channel name (unused because the subscriber listens to a single configured channel).
   * @param message - The raw message string received from Redis.
   */
  private readonly onRedisMessage = (
    _channel: string,
    message: string,
  ): void => {
    try {
      const parsed: unknown = JSON.parse(message)
      if (!isDistributedEvent(parsed)) {
        this.logger.warn(
          'Ignoring malformed distributed event (missing gameId or event property).',
        )
        return
      }
      this.emitEvent(parsed)
    } catch (error) {
      const { message: errorMessage, stack } = error as Error
      this.logger.warn(
        `Ignoring invalid JSON on Redis Pub/Sub channel: ${errorMessage}`,
        stack,
      )
    }
  }

  /**
   * Handles Redis subscriber connection errors.
   *
   * @param error - The error emitted by the Redis subscriber client.
   */
  private readonly onRedisError = (error: unknown): void => {
    const { message, stack } = error as Error
    this.logger.error(`Redis subscriber error: ${message}`, stack)
  }

  /**
   * Subscribes the dedicated Redis Pub/Sub client to the game events channel and wires up listeners.
   *
   * This runs once during module initialization. If the Redis subscription fails, initialization fails
   * to ensure the service does not run without the ability to consume distributed events.
   */
  async onModuleInit(): Promise<void> {
    try {
      const count = await this.redisSubscriber.subscribe(REDIS_PUBSUB_CHANNEL)
      this.logger.log(`Subscribed to ${count} channels.`)
    } catch (error) {
      const { message, stack } = error as Error
      this.logger.error(
        `Failed to subscribe to Redis channel "${REDIS_PUBSUB_CHANNEL}": ${message}`,
        stack,
      )
      try {
        this.redisSubscriber.disconnect()
      } catch {
        // Preserve the subscription failure as the actionable error.
      }
      throw error
    }

    this.redisSubscriber.on('message', this.onRedisMessage)
    this.redisSubscriber.on('error', this.onRedisError)
  }

  /**
   * Gracefully tears down timers and the dedicated Redis subscriber connection.
   *
   * Ensures the service can shut down cleanly without leaking event listeners, open Redis connections,
   * or active heartbeat intervals.
   */
  async onModuleDestroy(): Promise<void> {
    for (const connection of this.connectionClosersByConnection.values()) {
      connection.close()
    }
    this.stopHeartbeatIfRunning()

    let shutdownError: unknown

    try {
      this.redisSubscriber.off('message', this.onRedisMessage)
      this.redisSubscriber.off('error', this.onRedisError)
      await this.redisSubscriber.unsubscribe(REDIS_PUBSUB_CHANNEL)
    } catch (error) {
      shutdownError = error
      const { message, stack } = error as Error
      this.logger.warn(
        `Error while unsubscribing Redis subscriber: ${message}`,
        stack,
      )
    }

    try {
      await this.redisSubscriber.quit()
    } catch (error) {
      shutdownError ??= error
      const { message, stack } = error as Error
      this.logger.warn(
        `Error while quitting Redis subscriber: ${message}`,
        stack,
      )
    }

    if (shutdownError !== undefined) {
      try {
        this.redisSubscriber.disconnect()
      } catch {
        // ignore
      }
      throw shutdownError
    }
  }

  /**
   * Emits a local event onto the event channel for consumption by active SSE subscriptions.
   *
   * @param event - The distributed event or local heartbeat to broadcast.
   *
   * @private
   */
  private emitEvent(event: LocalEvent): void {
    this.eventEmitter.emit(LOCAL_EVENT_EMITTER_CHANNEL, event)
  }

  /**
   * Starts the heartbeat interval if at least one SSE connection is active and the interval is not already running.
   *
   * Heartbeats are emitted locally as regular game events and are primarily used to keep proxies and clients from timing out
   * idle connections.
   *
   * @private
   */
  private startHeartbeatIfNeeded(): void {
    if (this.heartbeatIntervalId) return
    if (this.getTotalConnectionCount() === 0) return

    this.heartbeatIntervalId = setInterval(() => {
      this.emitEvent({ event: { type: GameEventType.GameHeartbeat } })
    }, HEARTBEAT_INTERVAL)
  }

  /**
   * Stops the heartbeat interval if it is currently running.
   *
   * @private
   */
  private stopHeartbeatIfRunning(): void {
    if (!this.heartbeatIntervalId) return
    clearInterval(this.heartbeatIntervalId)
    this.heartbeatIntervalId = undefined
  }

  /**
   * Computes the total number of active SSE connections across all participants.
   *
   * @returns The total active connection count in this service instance.
   *
   * @private
   */
  private getTotalConnectionCount(): number {
    let total = 0
    for (const count of this.connectionCountsByParticipantId.values())
      total += count
    return total
  }

  /**
   * Increments the active SSE connection count for a participant.
   *
   * @param participantId - The participant ID whose connection count should be incremented.
   *
   * @private
   */
  private incrementConnections(participantId: string): void {
    const current = this.connectionCountsByParticipantId.get(participantId) ?? 0
    this.connectionCountsByParticipantId.set(participantId, current + 1)
  }

  /**
   * Decrements the active SSE connection count for a participant.
   *
   * When the last connection for a participant closes, the participant entry is removed entirely.
   *
   * @param participantId - The participant ID whose connection count should be decremented.
   *
   * @private
   */
  private decrementConnections(participantId: string): void {
    const current = this.connectionCountsByParticipantId.get(participantId) ?? 0
    if (current <= 1) {
      this.connectionCountsByParticipantId.delete(participantId)
    } else {
      this.connectionCountsByParticipantId.set(participantId, current - 1)
    }
  }

  /**
   * Closes one active stream for a game participant.
   *
   * This is used by the test-only interruption endpoint to exercise the
   * frontend's transport recovery path against a real server-side stream.
   */
  public closeConnection(
    gameId: string,
    participantId: string,
    connectionId: string,
  ): void {
    this.connectionClosersByConnection
      .get(this.connectionKey(gameId, participantId, connectionId))
      ?.close()
  }

  private connectionKey(
    gameId: string,
    participantId: string,
    connectionId: string,
  ): string {
    return `${gameId}:${participantId}:${connectionId}`
  }

  /**
   * Creates an SSE-compatible observable stream for a specific game and participant.
   *
   * Behavior:
   * - Validates that the game exists and that the participant is part of the game.
   * - Emits an initial authoritative snapshot event describing the current game state for the subscriber.
   *   Snapshot construction errors reject stream establishment so clients do not treat an incomplete
   *   recovery as a connected session.
   * - Relays subsequent events matching both the game and participant (or game-scoped broadcast events).
   * - Manages per-participant connection reference counting to support multiple concurrent connections (e.g. multiple tabs).
   *
   * @param gameId - The game ID to subscribe to.
   * @param participantId - The participant ID subscribing to events.
   * @param connectionId - The client-provided connection ID, or a generated ID
   * for clients that do not provide one.
   *
   * @returns An observable of {@link MessageEvent} where `data` is a JSON-encoded game event payload.
   *
   * @throws {PlayerNotFoundException} If the participant does not exist in the game.
   * @throws {GameNotFoundException} If the game does not exist or is not active/completed.
   */
  public async subscribe(
    gameId: string,
    participantId: string,
    connectionId: string = randomUUID(),
  ): Promise<Observable<MessageEvent>> {
    const connectionKey = this.connectionKey(
      gameId,
      participantId,
      connectionId,
    )
    // A reconnect that reuses an ID must replace, rather than stack on top of,
    // the existing stream. This also makes cleanup safe if both streams race.
    this.connectionClosersByConnection.get(connectionKey)?.close()

    this.incrementConnections(participantId)
    this.startHeartbeatIfNeeded()

    const closeSignal = new Subject<void>()

    const source = fromEvent(
      this.eventEmitter,
      LOCAL_EVENT_EMITTER_CHANNEL,
    ) as Observable<LocalEvent>
    const bufferedEvents = new ReplaySubject<LocalEvent>()
    const sourceSubscription = source
      .pipe(
        takeUntil(closeSignal),
        filter(
          (event): event is LocalEvent =>
            isDefined(event) &&
            (event.gameId === gameId ||
              (event.gameId === undefined &&
                event.event.type === GameEventType.GameHeartbeat)) &&
            (event.playerId === undefined || event.playerId === participantId),
        ),
      )
      .subscribe({
        next: (event) => bufferedEvents.next(event),
        complete: () => bufferedEvents.complete(),
      })
    let isCleanedUp = false

    const cleanup = (): void => {
      if (isCleanedUp) return
      isCleanedUp = true

      sourceSubscription?.unsubscribe()
      bufferedEvents.complete()
      closeSignal.complete()
      if (
        this.connectionClosersByConnection.get(connectionKey) === connection
      ) {
        this.connectionClosersByConnection.delete(connectionKey)
      }
      this.decrementConnections(participantId)
      if (this.getTotalConnectionCount() === 0) {
        this.stopHeartbeatIfRunning()
      }
    }

    const connection: Connection = {
      close: () => {
        closeSignal.next()
        cleanup()
      },
    }
    this.connectionClosersByConnection.set(connectionKey, connection)

    try {
      const document =
        await this.gameRepository.findGameByIDWithStatusesOrThrow(gameId, [
          GameStatus.Active,
          GameStatus.Completed,
        ])

      const participant = document.participants.find(
        (p) => p.participantId === participantId,
      )

      if (!participant) {
        throw new PlayerNotFoundException(participantId)
      }

      const initialEvent: DistributedEvent = {
        gameId,
        playerId: participantId,
        version: document.version,
        event: await this.gameParticipantEventBuilder.buildParticipantEvent(
          document,
          participant,
        ),
      }

      return defer(() => {
        if (isCleanedUp) return EMPTY

        let lastVersion = -1

        return concat(of(initialEvent), bufferedEvents).pipe(
          filter((event) => {
            const version = getEventVersion(event)
            if (version === undefined) return true
            if (version <= lastVersion) return false

            lastVersion = version
            return true
          }),
          map((event) => ({
            data: JSON.stringify(event.event),
            ...(getEventVersion(event) !== undefined
              ? { id: String(getEventVersion(event)) }
              : {}),
          })),
        )
      }).pipe(finalize(cleanup))
    } catch (error) {
      const { message, stack } = error as Error
      this.logger.warn(
        `Error building initial event for participant ${participantId}: ${message}`,
        stack,
      )
      cleanup()
      throw error
    }
  }
}
