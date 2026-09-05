import { type GameEvent, GameEventType, QuestionType } from '@klurigo/common'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { GamePlayerClient } from '../../e2e-tests/support/game-player-client'

const API_BASE_URL = 'http://klurigo-service.local/api'
const GAME_ID = 'game-123'
const PLAYER_ID = 'player-123'

const gameToken = createToken({
  sub: PLAYER_ID,
  scope: 'GAME',
  gameId: GAME_ID,
  participantType: 'PLAYER',
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('GamePlayerClient', () => {
  it('authenticates, joins, and submits through the public API', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(jsonResponse({ accessToken: gameToken }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
    const client = new GamePlayerClient(`${API_BASE_URL}/`)

    await expect(
      client.authenticateAndJoin({ gamePIN: '123456' }, 'Ada'),
    ).resolves.toEqual({ gameId: GAME_ID, participantId: PLAYER_ID })
    await client.submitAnswer({
      type: QuestionType.MultiChoice,
      optionIndex: 2,
    })

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      `${API_BASE_URL}/auth/game`,
      expect.objectContaining({
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'User-Agent': 'klurigo-playwright-e2e',
        },
        body: JSON.stringify({ gamePIN: '123456' }),
      }),
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      `${API_BASE_URL}/games/${GAME_ID}/players`,
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: `Bearer ${gameToken}`,
        }),
        body: JSON.stringify({ nickname: 'Ada' }),
      }),
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      `${API_BASE_URL}/games/${GAME_ID}/answers`,
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: `Bearer ${gameToken}`,
        }),
        body: JSON.stringify({
          type: QuestionType.MultiChoice,
          optionIndex: 2,
        }),
      }),
    )

    client.close()
  })

  it('parses fragmented SSE frames, ignores heartbeats, and matches queued events', async () => {
    const { client, emit } = await createConnectedClient()

    emit({ type: GameEventType.GameHeartbeat })

    const matchingEvent = client.waitForEvent(
      GameEventType.GameLobbyPlayer,
      (event) => event.player.nickname === 'Ada',
    )
    emit({
      type: GameEventType.GameLobbyPlayer,
      player: { nickname: 'Other player' },
    })
    emit({
      type: GameEventType.GameLobbyPlayer,
      player: { nickname: 'Ada' },
    })

    await expect(matchingEvent).resolves.toEqual({
      type: GameEventType.GameLobbyPlayer,
      player: { nickname: 'Ada' },
    })
    await expect(
      client.waitForEvent(GameEventType.GameLobbyPlayer),
    ).resolves.toEqual({
      type: GameEventType.GameLobbyPlayer,
      player: { nickname: 'Other player' },
    })

    client.close()
  })

  it('includes the HTTP status and response body for failed requests', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('game not found', { status: 404 }),
    )
    const client = new GamePlayerClient(API_BASE_URL)

    await expect(
      client.authenticateAndJoin({ gamePIN: '123456' }, 'Ada'),
    ).rejects.toThrow('POST /auth/game failed with HTTP 404: game not found')
  })

  it('rejects pending event waits and closes idempotently', async () => {
    const { client } = await createConnectedClient()
    const pendingEvent = client.waitForEvent(GameEventType.GameBeginPlayer)

    client.close()
    expect(() => client.close()).not.toThrow()

    await expect(pendingEvent).rejects.toThrow('Game player client closed')
  })
})

async function createConnectedClient(): Promise<{
  client: GamePlayerClient
  emit: (event: GameEvent) => void
}> {
  let streamController: ReadableStreamDefaultController<Uint8Array> | undefined
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      streamController = controller
    },
  })

  vi.spyOn(globalThis, 'fetch')
    .mockResolvedValueOnce(jsonResponse({ accessToken: gameToken }))
    .mockResolvedValueOnce(new Response(null, { status: 204 }))
    .mockResolvedValueOnce(
      new Response(stream, {
        headers: { 'Content-Type': 'text/event-stream' },
      }),
    )

  const client = new GamePlayerClient(API_BASE_URL)
  await client.authenticateAndJoin({ gameId: GAME_ID }, 'Ada')
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
