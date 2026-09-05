import { type GameEvent, GameEventType } from '@klurigo/common'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { GameHostClient } from '../../e2e-tests/support/game-host-client'

const API_BASE_URL = 'http://klurigo-service.local/api'
const GAME_ID = 'game-123'
const HOST_ID = 'host-123'

const userToken = createToken({
  sub: 'user-123',
  scope: 'USER',
})
const gameToken = createToken({
  sub: HOST_ID,
  scope: 'GAME',
  gameId: GAME_ID,
  participantType: 'HOST',
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('GameHostClient', () => {
  it('authenticates through user and game auth, then completes the current task', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        jsonResponse({ accessToken: userToken, refreshToken: 'user-refresh' }),
      )
      .mockResolvedValueOnce(
        jsonResponse({ accessToken: gameToken, refreshToken: 'game-refresh' }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
    const client = new GameHostClient(`${API_BASE_URL}/`)

    await expect(
      client.authenticate(
        { email: 'host@example.com', password: 'password' },
        { gamePIN: '123456' },
      ),
    ).resolves.toEqual({ gameId: GAME_ID, participantId: HOST_ID })
    await client.completeCurrentTask()

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      `${API_BASE_URL}/auth/login`,
      expect.objectContaining({
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'User-Agent': 'klurigo-playwright-e2e',
        },
        body: JSON.stringify({
          email: 'host@example.com',
          password: 'password',
        }),
      }),
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      `${API_BASE_URL}/auth/game`,
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: `Bearer ${userToken}`,
        }),
        body: JSON.stringify({ gamePIN: '123456' }),
      }),
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      `${API_BASE_URL}/games/${GAME_ID}/tasks/current/complete`,
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: `Bearer ${gameToken}`,
        }),
      }),
    )

    client.close()
  })

  it('parses fragmented SSE frames, ignores heartbeats, and matches queued host events', async () => {
    const { client, emit } = await createConnectedClient()

    emit({ type: GameEventType.GameHeartbeat })

    const matchingEvent = client.waitForEvent(
      GameEventType.GameLobbyHost,
      (event) => event.players[0]?.nickname === 'Ada',
    )
    emit(createLobbyEvent('Other player'))
    emit(createLobbyEvent('Ada'))

    await expect(matchingEvent).resolves.toEqual(createLobbyEvent('Ada'))
    await expect(
      client.waitForEvent(GameEventType.GameLobbyHost),
    ).resolves.toEqual(createLobbyEvent('Other player'))

    client.close()
  })

  it('includes the HTTP status and response body for failed requests', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('invalid host credentials', { status: 401 }),
    )
    const client = new GameHostClient(API_BASE_URL)

    await expect(
      client.authenticate(
        { email: 'host@example.com', password: 'wrong' },
        { gameId: GAME_ID },
      ),
    ).rejects.toThrow(
      'POST /auth/login failed with HTTP 401: invalid host credentials',
    )
  })

  it('rejects pending event waits and closes idempotently', async () => {
    const { client } = await createConnectedClient()
    const pendingEvent = client.waitForEvent(GameEventType.GameBeginHost)

    client.close()
    expect(() => client.close()).not.toThrow()

    await expect(pendingEvent).rejects.toThrow('Game host client closed')
  })
})

async function createConnectedClient(): Promise<{
  client: GameHostClient
  emit: (event: GameEvent) => void
}> {
  let streamController: ReadableStreamDefaultController<Uint8Array> | undefined
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      streamController = controller
    },
  })

  vi.spyOn(globalThis, 'fetch')
    .mockResolvedValueOnce(
      jsonResponse({ accessToken: userToken, refreshToken: 'user-refresh' }),
    )
    .mockResolvedValueOnce(
      jsonResponse({ accessToken: gameToken, refreshToken: 'game-refresh' }),
    )
    .mockResolvedValueOnce(
      new Response(stream, {
        headers: { 'Content-Type': 'text/event-stream' },
      }),
    )

  const client = new GameHostClient(API_BASE_URL)
  await client.authenticate(
    { email: 'host@example.com', password: 'password' },
    { gameId: GAME_ID },
  )
  await client.connect()

  return {
    client,
    emit: (event) => {
      if (!streamController) {
        throw new Error('SSE stream is not ready')
      }

      const frame = `data: ${JSON.stringify(event)}\n\n`
      const midpoint = Math.floor(frame.length / 2)
      const encoder = new TextEncoder()
      streamController.enqueue(encoder.encode(frame.slice(0, midpoint)))
      streamController.enqueue(encoder.encode(frame.slice(midpoint)))
    },
  }
}

function createLobbyEvent(nickname: string): GameEvent {
  return {
    type: GameEventType.GameLobbyHost,
    game: {
      id: GAME_ID,
      pin: '123456',
      settings: {
        randomizeQuestionOrder: false,
        randomizeAnswerOrder: false,
      },
    },
    players: [{ id: `player-${nickname}`, nickname }],
  }
}

function jsonResponse(body: object): Response {
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
  })
}

function createToken(payload: object): string {
  const encode = (value: object): string =>
    btoa(JSON.stringify(value))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')

  return `${encode({ alg: 'none', typ: 'JWT' })}.${encode(payload)}.signature`
}
