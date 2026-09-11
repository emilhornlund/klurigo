/**
 * Runtime map of connection lifecycle status values used by the EventSource stream.
 *
 * These string literals are used at runtime for comparisons, state,
 * serialization, and logging.
 */
export const ConnectionStatus = {
  INITIALIZED: 'INITIALIZED',
  CONNECTED: 'CONNECTED',
  RECONNECTING: 'RECONNECTING',
  RECONNECTING_FAILED: 'RECONNECTING_FAILED',
} as const

/**
 * Connection lifecycle status for the EventSource stream.
 *
 * Possible values:
 * - `INITIALIZED` – Hook is set up or reconnect has just started.
 * - `CONNECTED` – The SSE connection has delivered its authoritative snapshot.
 * - `RECONNECTING` – A transient error occurred; an automatic retry is scheduled.
 * - `RECONNECTING_FAILED` – Retries exhausted; no further attempts will be made.
 */
export type ConnectionStatus =
  (typeof ConnectionStatus)[keyof typeof ConnectionStatus]
