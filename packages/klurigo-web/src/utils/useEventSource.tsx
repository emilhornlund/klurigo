import type { GameEvent } from '@klurigo/common'
import { deepEqual, GameEventType, HEARTBEAT_INTERVAL } from '@klurigo/common'
import { EventSourcePolyfill } from 'event-source-polyfill'
import { useCallback, useEffect, useRef, useState } from 'react'

import config from '../config'

import type { ConnectionFailure, ConnectionStatus } from './event-source.types'
import {
  ConnectionFailureReason,
  ConnectionStatus as ConnectionStatusValue,
} from './event-source.types'

type EventSourceErrorEvent = { status?: number }

export const GAME_EVENT_STREAM_CONNECTION_ID_STORAGE_KEY =
  'klurigo.game-event-stream-connection-id'

const isRetryableClosedError = (event: unknown): boolean => {
  const status = (event as EventSourceErrorEvent | null)?.status

  if (status === undefined || status === 0) return true

  return status === 408 || status === 425 || status === 429 || status >= 500
}

const MAX_RETRIES = 10

const generateConnectionId = (): string => {
  if (typeof window.crypto.randomUUID === 'function') {
    return window.crypto.randomUUID()
  }

  const bytes = new Uint8Array(16)
  window.crypto.getRandomValues(bytes)
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80

  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0'))
    .join('')
    .replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5')
}

const getConnectionFailure = (event: unknown): ConnectionFailure => {
  const status = (event as EventSourceErrorEvent | null)?.status

  if (status === 401 || status === 403) {
    return { reason: ConnectionFailureReason.SESSION_EXPIRED, status }
  }
  if (status === 404) {
    return { reason: ConnectionFailureReason.GAME_NOT_FOUND, status }
  }
  if (status === 410) {
    return { reason: ConnectionFailureReason.GAME_ENDED, status }
  }
  if (status !== undefined && status >= 500) {
    return { reason: ConnectionFailureReason.SERVER_ERROR, status }
  }

  return { reason: ConnectionFailureReason.UNKNOWN, status }
}

/**
 * Subscribes to server-sent events (SSE) for a given game and token, returning
 * the most recent **non-heartbeat** `GameEvent` and the current connection status.
 *
 * Behavior:
 * - Opens an `EventSource` to the game event endpoint with a connection ID that
 *   remains stable across retries.
 * - Sends `Authorization: Bearer <token>` via headers (using `EventSourcePolyfill`).
 * - Filters out `GameEventType.GameHeartbeat` messages (they do not update `gameEvent`).
 * - Ignores repeated or older SSE revisions, using the backend's persisted game version.
 * - Reports `CONNECTED` only after the stream has delivered its first
 *   non-heartbeat snapshot.
 * - On error, retries with exponential backoff (1s, 2s, 4s, ... capped at 30s) up to 10 attempts.
 * - Cleans up the EventSource on unmount and when `gameID`/`token` change.
 *
 * @param gameID Game identifier to subscribe to (required to connect).
 * @param token  Bearer token for authentication (required to connect).
 * @returns A tuple: `[latestNonHeartbeatEvent, connectionStatus, failure, retry]`.
 */
export const useEventSource = (
  gameID?: string,
  token?: string,
): [
  GameEvent | undefined,
  ConnectionStatus,
  ConnectionFailure | undefined,
  () => void,
] => {
  const [gameEvent, setGameEvent] = useState<GameEvent>()
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(
    ConnectionStatusValue.INITIALIZED,
  )
  const [connectionFailure, setConnectionFailure] =
    useState<ConnectionFailure>()

  const eventSourceRef = useRef<InstanceType<
    typeof EventSourcePolyfill
  > | null>(null)
  const reconnectTimeoutRef = useRef<number | null>(null)
  const instanceIdRef = useRef(0)
  const isShuttingDownRef = useRef(false)
  const lastEventRef = useRef<GameEvent | undefined>(undefined)
  const lastEventVersionRef = useRef<number | undefined>(undefined)
  const lastConnectionFailureRef = useRef<ConnectionFailure | undefined>(
    undefined,
  )

  const clearReconnectTimeout = () => {
    if (reconnectTimeoutRef.current !== null) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
  }

  const cleanupEventSource = useCallback(() => {
    // Invalidate callbacks captured by the connection being replaced or
    // detached, including callbacks that fire after handlers are nulled.
    instanceIdRef.current += 1
    clearReconnectTimeout()

    const current = eventSourceRef.current
    if (current) {
      current.onopen = null
      current.onmessage = null
      current.onerror = null
      current.close()
    }

    eventSourceRef.current = null
  }, [])

  const getRetryDelay = (retryCount: number) =>
    Math.min(1000 * 2 ** retryCount, 30000)

  const createEventSource = useCallback(
    (
      gameIdValue: string,
      tokenValue: string,
      retryCount = 0,
      connectionId = generateConnectionId(),
    ) => {
      if (retryCount >= MAX_RETRIES) {
        console.error(
          'Max retry attempts reached. Stopping reconnection attempts.',
        )
        cleanupEventSource()
        const failure = lastConnectionFailureRef.current ?? {
          reason: ConnectionFailureReason.UNKNOWN,
        }
        setConnectionFailure(failure)
        setConnectionStatus(ConnectionStatusValue.RECONNECTING_FAILED)
        return
      }

      let currentRetryCount = retryCount
      let hasReceivedSnapshot = false

      cleanupEventSource()
      const instanceId = ++instanceIdRef.current
      lastEventRef.current = undefined
      lastEventVersionRef.current = undefined
      window.sessionStorage.setItem(
        GAME_EVENT_STREAM_CONNECTION_ID_STORAGE_KEY,
        connectionId,
      )

      const eventSource = new EventSourcePolyfill(
        `${config.klurigoServiceUrl}/games/${gameIdValue}/events?connectionId=${encodeURIComponent(connectionId)}`,
        {
          headers: {
            Authorization: `Bearer ${tokenValue}`,
            Accept: 'text/event-stream',
          },
          heartbeatTimeout: HEARTBEAT_INTERVAL * 3,
        },
      )

      eventSourceRef.current = eventSource

      eventSource.onopen = () => {
        if (instanceId !== instanceIdRef.current) return
      }

      eventSource.onmessage = (event) => {
        if (instanceId !== instanceIdRef.current) return

        let data: GameEvent
        try {
          data = JSON.parse(event.data) as GameEvent
        } catch {
          console.error('Invalid game event received from the server.')
          eventSource.onerror?.(
            Object.assign(new Event('error'), { status: 500 }),
          )
          return
        }
        if (data.type !== GameEventType.GameHeartbeat) {
          const rawVersion = event.lastEventId
          const version = rawVersion ? Number(rawVersion) : undefined
          if (
            version !== undefined &&
            (!Number.isSafeInteger(version) || version < 0)
          ) {
            return
          }
          if (
            version !== undefined &&
            lastEventVersionRef.current !== undefined &&
            version <= lastEventVersionRef.current
          ) {
            return
          }
          if (version !== undefined) {
            lastEventVersionRef.current = version
          }

          // Only update state if the event has actually changed
          if (!deepEqual(data, lastEventRef.current)) {
            lastEventRef.current = data
            setGameEvent(data)
          }

          // The HTTP connection being open is not enough to consider recovery
          // complete. The first non-heartbeat event is the authoritative
          // snapshot emitted by the backend for this subscription.
          if (!hasReceivedSnapshot) {
            hasReceivedSnapshot = true
            currentRetryCount = 0
            lastConnectionFailureRef.current = undefined
            setConnectionFailure(undefined)
            setConnectionStatus(ConnectionStatusValue.CONNECTED)
          }
        }
      }

      eventSource.onerror = (error) => {
        if (instanceId !== instanceIdRef.current) return

        // Treat reload/navigation/background teardown as expected.
        if (
          isShuttingDownRef.current ||
          document.visibilityState === 'hidden'
        ) {
          return
        }

        const failure = getConnectionFailure(error)
        lastConnectionFailureRef.current = failure

        if (!isRetryableClosedError(error)) {
          instanceIdRef.current += 1
          lastEventRef.current = undefined
          setConnectionFailure(failure)
          console.error(
            'Game event stream closed before recovery could complete.',
          )
          setConnectionStatus(ConnectionStatusValue.RECONNECTING_FAILED)
          return
        }

        console.error('Connection error, retrying...')
        setConnectionFailure(failure)
        setConnectionStatus(ConnectionStatusValue.RECONNECTING)
        instanceIdRef.current += 1

        eventSource.onopen = null
        eventSource.onmessage = null
        eventSource.onerror = null
        eventSource.close()

        const delay = getRetryDelay(currentRetryCount)

        clearReconnectTimeout()
        reconnectTimeoutRef.current = window.setTimeout(() => {
          if (isShuttingDownRef.current) return
          // eslint-disable-next-line react-hooks/immutability
          createEventSource(
            gameIdValue,
            tokenValue,
            currentRetryCount + 1,
            connectionId,
          )
        }, delay)
      }
    },
    [cleanupEventSource],
  )

  const retryConnection = useCallback(() => {
    if (!gameID || !token) return

    isShuttingDownRef.current = false
    lastConnectionFailureRef.current = undefined
    setConnectionFailure(undefined)
    setConnectionStatus(ConnectionStatusValue.RECONNECTING)
    createEventSource(gameID, token)
  }, [createEventSource, gameID, token])

  useEffect(() => {
    if (gameID && token) {
      isShuttingDownRef.current = false
      setGameEvent(undefined)
      lastEventRef.current = undefined
      lastEventVersionRef.current = undefined
      lastConnectionFailureRef.current = undefined
      setConnectionStatus(ConnectionStatusValue.INITIALIZED)
      setConnectionFailure(undefined)
      createEventSource(gameID, token)
    } else {
      setGameEvent(undefined)
      lastEventRef.current = undefined
      lastEventVersionRef.current = undefined
      lastConnectionFailureRef.current = undefined
      setConnectionStatus(ConnectionStatusValue.INITIALIZED)
      setConnectionFailure(undefined)
    }

    return () => {
      isShuttingDownRef.current = true
      cleanupEventSource()
    }
  }, [cleanupEventSource, createEventSource, gameID, token])

  useEffect(() => {
    const shutdown = () => {
      isShuttingDownRef.current = true
      cleanupEventSource()
    }

    // pagehide fires on reload, navigation, and bfcache transitions (better than beforeunload)
    window.addEventListener('pagehide', shutdown)
    window.addEventListener('beforeunload', shutdown)

    return () => {
      window.removeEventListener('pagehide', shutdown)
      window.removeEventListener('beforeunload', shutdown)
    }
  }, [cleanupEventSource])

  return [gameEvent, connectionStatus, connectionFailure, retryConnection]
}
