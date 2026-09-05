import {
  type AuthGameRequestDto,
  type AuthResponseDto,
  type GameEvent,
  GameEventType,
  GameParticipantType,
  type GameTokenDto,
  type SubmitQuestionAnswerRequestDto,
  TokenScope,
} from '@klurigo/common'
import { jwtDecode } from 'jwt-decode'

export type GamePlayerIdentity = {
  readonly gameId: string
  readonly participantId: string
}

type GameEventOfType<T extends GameEventType> = Extract<GameEvent, { type: T }>

type EventWaiter = {
  matches: (event: GameEvent) => boolean
  resolve: (event: GameEvent) => void
  reject: (error: Error) => void
}

type RequestOptions = {
  body?: object
  token?: string
  accept?: string
}

const SIMULATED_PLAYER_USER_AGENT = 'klurigo-playwright-e2e'

/**
 * A wire-level client for one anonymous player in a Klurigo game.
 *
 * It intentionally only wraps the public game authentication, join, answer,
 * and SSE endpoints. Game progression remains the responsibility of the host
 * or another real participant.
 */
export class GamePlayerClient {
  private readonly apiBaseUrl: string
  private readonly abortController = new AbortController()
  private readonly queuedEvents: GameEvent[] = []
  private readonly eventWaiters: EventWaiter[] = []

  private accessToken: string | undefined
  private gameId: string | undefined
  private connectionPromise: Promise<void> | undefined
  private connectionStarted = false
  private streamError: Error | undefined
  private closed = false

  public constructor(apiBaseUrl: string) {
    if (!apiBaseUrl.trim()) {
      throw new Error('An API base URL is required')
    }

    this.apiBaseUrl = apiBaseUrl.replace(/\/+$/, '')
  }

  /**
   * Authenticates an anonymous player and joins the identified game.
   *
   * @returns The participant and game IDs decoded from the real game token.
   */
  public async authenticateAndJoin(
    target: AuthGameRequestDto,
    nickname: string,
  ): Promise<GamePlayerIdentity> {
    this.ensureOpen()
    this.validateAuthenticationTarget(target)

    if (this.accessToken) {
      throw new Error('This game player client is already authenticated')
    }

    const authentication = await this.post<AuthResponseDto>('/auth/game', {
      body: target,
    })

    const token = authentication.accessToken
    const claims = jwtDecode<GameTokenDto>(token)

    if (
      claims.scope !== TokenScope.Game ||
      claims.participantType !== GameParticipantType.PLAYER ||
      !claims.gameId ||
      !claims.sub
    ) {
      throw new Error('Game authentication did not return a player token')
    }

    this.accessToken = token
    this.gameId = claims.gameId

    await this.postNoContent(this.gamePath('players'), {
      body: { nickname },
      token,
    })

    return { gameId: claims.gameId, participantId: claims.sub }
  }

  /**
   * Opens the player's public game-event stream.
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
   * predicate can distinguish multiple events with the same type.
   */
  public waitForEvent<T extends GameEventType>(
    type: T,
    predicate?: (event: GameEventOfType<T>) => boolean,
  ): Promise<GameEventOfType<T>> {
    this.ensureOpen()

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
      this.eventWaiters.push({
        matches: (event) =>
          isEventOfType(event, type) && (!predicate || predicate(event)),
        resolve: (event) => {
          if (isEventOfType(event, type)) {
            resolve(event)
          }
        },
        reject,
      })
    })
  }

  /**
   * Submits one answer through the public game API.
   */
  public async submitAnswer(
    answer: SubmitQuestionAnswerRequestDto,
  ): Promise<void> {
    this.ensureOpen()
    const { accessToken } = this.requireSession()

    await this.postNoContent(this.gamePath('answers'), {
      body: answer,
      token: accessToken,
    })
  }

  /**
   * Idempotently closes the player's SSE connection and rejects pending waits.
   */
  public close(): void {
    if (this.closed) return

    this.closed = true
    this.abortController.abort()

    const error = new Error('Game player client closed')
    for (const waiter of this.eventWaiters) {
      waiter.reject(error)
    }
    this.eventWaiters.length = 0
    this.queuedEvents.length = 0
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
    if (typeof parsed !== 'object' || parsed === null || !('type' in parsed)) {
      throw new Error('Game event payload is not a typed event object')
    }

    this.handleEvent(parsed as GameEvent)
  }

  private handleEvent(event: GameEvent): void {
    if (event.type === GameEventType.GameHeartbeat) return

    const waiterIndex = this.eventWaiters.findIndex((waiter) =>
      waiter.matches(event),
    )
    if (waiterIndex === -1) {
      this.queuedEvents.push(event)
      return
    }

    const waiter = this.eventWaiters.splice(waiterIndex, 1)[0]
    waiter?.resolve(event)
  }

  private handleStreamError(error: unknown): void {
    if (this.closed) return

    this.streamError = error instanceof Error ? error : new Error(String(error))

    for (const waiter of this.eventWaiters) {
      waiter.reject(this.streamError)
    }
    this.eventWaiters.length = 0
  }

  private async post<T extends object>(
    path: string,
    options: RequestOptions,
  ): Promise<T> {
    const response = await this.request('POST', path, options)
    await this.throwIfNotOk('POST', path, response)
    return (await response.json()) as T
  }

  private async postNoContent(
    path: string,
    options: RequestOptions,
  ): Promise<void> {
    const response = await this.request('POST', path, options)
    await this.throwIfNotOk('POST', path, response)
  }

  private request(
    method: 'GET' | 'POST',
    path: string,
    options: RequestOptions = {},
  ): Promise<Response> {
    const headers: Record<string, string> = {
      Accept: options.accept ?? 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': SIMULATED_PLAYER_USER_AGENT,
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

  private gamePath(suffix: string): string {
    const { gameId } = this.requireSession()
    return `/games/${encodeURIComponent(gameId)}/${suffix}`
  }

  private requireSession(): { accessToken: string; gameId: string } {
    if (!this.accessToken || !this.gameId) {
      throw new Error('Authenticate and join a game before using this client')
    }

    return { accessToken: this.accessToken, gameId: this.gameId }
  }

  private ensureOpen(): void {
    if (this.closed) {
      throw new Error('Game player client is closed')
    }
  }

  private validateAuthenticationTarget(target: AuthGameRequestDto): void {
    const hasGameId = Boolean(target.gameId)
    const hasGamePIN = Boolean(target.gamePIN)

    if (hasGameId === hasGamePIN) {
      throw new Error('Provide exactly one gameId or gamePIN')
    }
  }
}

function isEventOfType<T extends GameEventType>(
  event: GameEvent,
  type: T,
): event is GameEventOfType<T> {
  return event.type === type
}
