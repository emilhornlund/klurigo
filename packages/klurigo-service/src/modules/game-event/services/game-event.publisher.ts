import { GameEvent } from '@klurigo/common'
import { Injectable, Logger } from '@nestjs/common'
import { InjectRedis } from '@nestjs-modules/ioredis'
import Redis from 'ioredis'

import {
  GameDocument,
  Participant,
} from '../../game-core/repositories/models/schemas'

import { GameParticipantEventBuilder } from './game-participant-event.builder'
import { DistributedEvent } from './models/event'

const REDIS_PUBSUB_CHANNEL = 'events'

/**
 * GameEventPublisher is responsible for broadcasting game events to connected players
 * using Redis Pub/Sub for distributed event handling.
 */
@Injectable()
export class GameEventPublisher {
  private readonly logger = new Logger(GameEventPublisher.name)

  /**
   * Constructs an instance of GameEventPublisher.
   *
   * @param redis - Redis instance for Pub/Sub operations.
   * @param gameParticipantEventBuilder - Shared builder used to construct participant-specific game events.
   */
  constructor(
    @InjectRedis() private readonly redis: Redis,
    private readonly gameParticipantEventBuilder: GameParticipantEventBuilder,
  ) {}

  /**
   * Publishes game events to all participants for the provided game document.
   *
   * The publisher builds a participant-specific `GameEvent` payload and emits it via Redis Pub/Sub
   * so that all service instances can relay the event to connected SSE clients.
   *
   * Notes:
   * - Events are published per participant to support participant-specific views (e.g. host vs player).
   * - The method awaits publication for all participants before resolving.
   *
   * @param document - The game document to publish an update for.
   *
   * @returns A promise that resolves once events for all participants have been published.
   */
  public async publish(document: GameDocument): Promise<void> {
    const context =
      await this.gameParticipantEventBuilder.createContext(document)

    await Promise.all(
      document.participants.map(async (participant) => {
        try {
          const event =
            await this.gameParticipantEventBuilder.buildParticipantEvent(
              document,
              participant,
              context,
            )

          await this.publishParticipantEvent(participant, event)
        } catch (error) {
          const { message, stack } = error as Error
          this.logger.warn(
            `Error publishing event for participant ${participant.participantId}: ${message}`,
            stack,
          )
        }
      }),
    )
  }

  /**
   * Publishes a game event for a single participant.
   *
   * @param participant - The participant the event should be delivered to.
   * @param event - The event payload to publish. If omitted, nothing is published.
   *
   * @returns A promise that resolves once the event has been published (or immediately if `event` is undefined).
   */
  public async publishParticipantEvent(
    participant: Participant,
    event?: GameEvent,
  ): Promise<void> {
    if (!event) return Promise.resolve()

    return this.publishDistributedEvent({
      playerId: participant.participantId,
      event,
    })
  }

  /**
   * Publishes a distributed event to the Redis Pub/Sub channel.
   *
   * This message is consumed by subscribers in all running service instances and relayed to local SSE streams.
   *
   * @param event - The distributed event containing the participant routing key and the game event payload.
   *
   * @private
   */
  private async publishDistributedEvent(
    event: DistributedEvent,
  ): Promise<void> {
    try {
      const message = JSON.stringify(event)
      await this.redis.publish(REDIS_PUBSUB_CHANNEL, message)
      if (event.playerId) {
        this.logger.debug(`Published event for playerId: ${event.playerId}`)
      } else {
        this.logger.debug('Published event for all players')
      }
    } catch (error) {
      this.logger.error('Error publishing event:', error)
    }
  }
}
