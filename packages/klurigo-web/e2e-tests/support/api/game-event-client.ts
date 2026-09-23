import { type GameEvent, GameEventType } from '@klurigo/common'

export type GameEventOfType<T extends GameEventType> = Extract<
  GameEvent,
  { type: T }
>

export type GameEventWaitOptions = {
  timeout?: number
}

type EventWaiter = {
  matches: (event: GameEvent) => boolean
  resolve: (event: GameEvent) => void
  reject: (error: Error) => void
  timeoutId: ReturnType<typeof setTimeout>
}

type RequestOptions = {
  body?: object
  token?: string
  accept?: string
}

const SIMULATED_USER_AGENT = 'klurigo-playwright-e2e'
const DEFAULT_EVENT_WAIT_TIMEOUT_MS = 10_000
const MAX_EVENT_HISTORY_LENGTH = 50
const MAX_QUEUED_EVENT_DESCRIPTION_LENGTH = 500

/**
 * Shared authenticated transport and event-stream client for a game session.
 * Participant clients provide authentication and participant-specific actions.
 */
export class GameSessionEventClient {
  private readonly apiBaseUrl: string
  private readonly participantName: string
  private readonly sessionErrorMessage: string
  private readonly abortController = new AbortController()
  private readonly queuedEvents: GameEvent[] = []
  private readonly eventWaiters: EventWaiter[] = []
  private readonly recentEventTypes: string[] = []

  private accessToken: string | undefined
  private gameId: string | undefined
  private connectionPromise: Promise<void> | undefined
  private connectionStarted = false
  private streamError: Error | undefined
  private closed = false

  public constructor(
    apiBaseUrl: string,
    participantName: string,
    sessionErrorMessage: string,
  ) {
    if (!apiBaseUrl.trim()) {
      throw new Error('An API base URL is required')
    }

    this.apiBaseUrl = apiBaseUrl.replace(/\/+$/, '')
    this.participantName = participantName
    this.sessionErrorMessage = sessionErrorMessage
  }

  /**
   * Opens the participant's public game-event stream.
   *
   * The promise resolves once the HTTP stream is established. Events are
   * consumed in the background and can be retrieved with `waitForEvent`.
   */
  public connect(): Promise<void> {
    this.ensureOpen()
    this.requireSession()

    if (!this.connectionPromise) {
      this.connectionPromise = this.openConnection()
    }

    return this.connectionPromise
  }

  /**
   * Waits for the next non-heartbeat event of the requested type.
   *
   * Events received before this method is called remain queued. The optional
   * predicate can distinguish multiple events with the same type. The optional
   * timeout defaults to 10 seconds.
   */
  public waitForEvent<T extends GameEventType>(
    type: T,
    predicate?: (event: GameEventOfType<T>) => boolean,
    options: GameEventWaitOptions = {},
  ): Promise<GameEventOfType<T>> {
    this.ensureOpen()
    const timeout = options.timeout ?? DEFAULT_EVENT_WAIT_TIMEOUT_MS
    validateEventWaitTimeout(timeout)

    if (!this.connectionStarted) {
      throw new Error('Call connect() before waiting for game events')
    }
    if (this.streamError) {
      throw this.streamError
    }

    for (let index = 0; index < this.queuedEvents.length; index += 1) {
      const event = this.queuedEvents[index]
      if (!event || !isEventOfType(event, type)) continue
      if (predicate && !predicate(event)) continue

      this.queuedEvents.splice(index, 1)
      return Promise.resolve(event)
    }

    return new Promise<GameEventOfType<T>>((resolve, reject) => {
      const waiter: EventWaiter = {
        timeoutId: setTimeout(() => {
          const waiterIndex = this.eventWaiters.indexOf(waiter)
          if (waiterIndex === -1) return

          this.eventWaiters.splice(waiterIndex, 1)
          reject(this.createEventWaitTimeoutError(type, timeout))
        }, timeout),
        matches: (event) =>
          isEventOfType(event, type) && (!predicate || predicate(event)),
        resolve: (event) => {
          if (isEventOfType(event, type)) {
            resolve(event)
          }
        },
        reject,
      }
      this.eventWaiters.push(waiter)
    })
  }

  /**
   * Idempotently closes the SSE connection and rejects pending waits.
   */
  public close(): void {
    if (this.closed) return

    this.closed = true
    this.abortController.abort()

    const error = new Error(`Game ${this.participantName} client closed`)
    for (const waiter of this.eventWaiters) {
      clearTimeout(waiter.timeoutId)
      waiter.reject(error)
    }
    this.eventWaiters.length = 0
    this.queuedEvents.length = 0
    this.recentEventTypes.length = 0
  }

  protected setSession(accessToken: string, gameId: string): void {
    this.accessToken = accessToken
    this.gameId = gameId
  }

  protected hasSession(): boolean {
    return Boolean(this.accessToken)
  }

  protected ensureOpen(): void {
    if (this.closed) {
      throw new Error(`Game ${this.participantName} client is closed`)
    }
  }

  protected requireSession(): { accessToken: string; gameId: string } {
    if (!this.accessToken || !this.gameId) {
      throw new Error(this.sessionErrorMessage)
    }

    return { accessToken: this.accessToken, gameId: this.gameId }
  }

  protected gamePath(suffix: string): string {
    const { gameId } = this.requireSession()
    return `/games/${encodeURIComponent(gameId)}/${suffix}`
  }

  protected async post<T extends object>(
    path: string,
    options: RequestOptions,
  ): Promise<T> {
    const response = await this.request('POST', path, options)
    await this.throwIfNotOk('POST', path, response)
    return (await response.json()) as T
  }

  protected async postNoContent(
    path: string,
    options: RequestOptions,
  ): Promise<void> {
    const response = await this.request('POST', path, options)
    await this.throwIfNotOk('POST', path, response)
  }

  private async openConnection(): Promise<void> {
    const { accessToken } = this.requireSession()
    const response = await this.request('GET', this.gamePath('events'), {
      accept: 'text/event-stream',
      token: accessToken,
    })

    await this.throwIfNotOk('GET', this.gamePath('events'), response)

    if (!response.body) {
      throw new Error('Game event response did not include a readable body')
    }

    this.connectionStarted = true
    const reader = response.body.getReader()
    void this.consumeEvents(reader).catch((error: unknown) => {
      this.handleStreamError(error)
    })
  }

  private async consumeEvents(
    reader: ReadableStreamDefaultReader<Uint8Array>,
  ): Promise<void> {
    const decoder = new TextDecoder()
    let buffer = ''

    try {
      while (true) {
        const { done, value } = await reader.read()

        if (done) {
          buffer += decoder.decode()
          if (buffer) this.handleSseFrame(buffer)

          if (!this.closed) {
            throw new Error('Game event stream closed unexpectedly')
          }
          return
        }

        buffer += decoder.decode(value, { stream: true })
        const frames = buffer.split(/\r?\n\r?\n/)
        buffer = frames.pop() ?? ''

        for (const frame of frames) {
          this.handleSseFrame(frame)
        }
      }
    } finally {
      reader.releaseLock()
    }
  }

  private handleSseFrame(frame: string): void {
    const data = frame
      .split(/\r?\n/)
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice('data:'.length).trimStart())
      .join('\n')

    if (!data) return

    const parsed: unknown = JSON.parse(data)
    if (!isGameEvent(parsed)) {
      throw new Error('Game event payload is not a typed event object')
    }

    this.handleEvent(parsed)
  }

  private handleEvent(event: GameEvent): void {
    if (event.type === GameEventType.GameHeartbeat) return

    this.recentEventTypes.push(event.type)
    if (this.recentEventTypes.length > MAX_EVENT_HISTORY_LENGTH) {
      this.recentEventTypes.shift()
    }

    const waiterIndex = this.eventWaiters.findIndex((waiter) =>
      waiter.matches(event),
    )
    if (waiterIndex === -1) {
      this.queuedEvents.push(event)
      return
    }

    const waiter = this.eventWaiters.splice(waiterIndex, 1)[0]
    if (waiter) clearTimeout(waiter.timeoutId)
    waiter?.resolve(event)
  }

  private handleStreamError(error: unknown): void {
    if (this.closed) return

    this.streamError = error instanceof Error ? error : new Error(String(error))

    for (const waiter of this.eventWaiters) {
      clearTimeout(waiter.timeoutId)
      waiter.reject(this.streamError)
    }
    this.eventWaiters.length = 0
  }

  private createEventWaitTimeoutError<T extends GameEventType>(
    type: T,
    timeout: number,
  ): Error {
    const recentEvents = this.recentEventTypes.join(', ') || 'none'
    const queuedEvents =
      this.queuedEvents.map(describeQueuedEvent).join('; ') || 'none'

    return new Error(
      `Timed out after ${timeout}ms waiting for game event type "${type}". ` +
        `Recently received non-heartbeat event types: ${recentEvents}. ` +
        `Queued events that did not satisfy this wait: ${queuedEvents}`,
    )
  }

  private request(
    method: 'GET' | 'POST',
    path: string,
    options: RequestOptions = {},
  ): Promise<Response> {
    const headers: Record<string, string> = {
      Accept: options.accept ?? 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': SIMULATED_USER_AGENT,
    }

    if (options.token) {
      headers.Authorization = `Bearer ${options.token}`
    }

    return fetch(`${this.apiBaseUrl}${path}`, {
      method,
      headers,
      ...(options.body ? { body: JSON.stringify(options.body) } : {}),
      signal: this.abortController.signal,
    })
  }

  private async throwIfNotOk(
    method: 'GET' | 'POST',
    path: string,
    response: Response,
  ): Promise<void> {
    if (response.ok) return

    const body = await response.text()
    const detail = body || response.statusText || 'No response body'
    throw new Error(
      `${method} ${path} failed with HTTP ${response.status}: ${detail}`,
    )
  }
}

function isEventOfType<T extends GameEventType>(
  event: GameEvent,
  type: T,
): event is GameEventOfType<T> {
  return event.type === type
}

function isGameEvent(value: unknown): value is GameEvent {
  if (typeof value !== 'object' || value === null || !('type' in value)) {
    return false
  }

  return (
    typeof value.type === 'string' &&
    Object.values(GameEventType).includes(value.type as GameEventType)
  )
}

function validateEventWaitTimeout(timeout: number): void {
  if (!Number.isFinite(timeout) || timeout < 0) {
    throw new Error('Event wait timeout must be a finite non-negative number')
  }
}

function describeQueuedEvent(event: GameEvent): string {
  const serialized = JSON.stringify(event)
  if (serialized.length <= MAX_QUEUED_EVENT_DESCRIPTION_LENGTH) {
    return serialized
  }

  return `${serialized.slice(0, MAX_QUEUED_EVENT_DESCRIPTION_LENGTH)}...`
}
