import { GameEventType } from '@klurigo/common'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { GameSessionEventClient } from '../../e2e-tests/support/api/game-event-client'

const API_BASE_URL = 'http://klurigo-service.local/api'
const GAME_ID = 'game-123'

class TestGameEventClient extends GameSessionEventClient {
  public constructor() {
    super(API_BASE_URL, 'test', 'Authenticate before using this client')
  }

  public authenticate(): void {
    this.setSession('game-token', GAME_ID)
  }
}

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('GameSessionEventClient', () => {
  it('returns events received before a waiter is registered', async () => {
    const { client, emit } = await createConnectedClient()

    await emit(frame(event(GameEventType.GameLoading)))

    await expect(
      client.waitForEvent(GameEventType.GameLoading),
    ).resolves.toEqual(event(GameEventType.GameLoading))

    client.close()
  })

  it('resolves a waiter when an event is received afterwards', async () => {
    const { client, emit } = await createConnectedClient()
    const pending = client.waitForEvent(GameEventType.GameBeginHost)

    await emit(frame(event(GameEventType.GameBeginHost)))

    await expect(pending).resolves.toEqual(event(GameEventType.GameBeginHost))
    client.close()
  })

  it('resolves multiple simultaneous waiters independently', async () => {
    const { client, emit } = await createConnectedClient()
    const hostWait = client.waitForEvent(GameEventType.GameBeginHost)
    const playerWait = client.waitForEvent(GameEventType.GameBeginPlayer)

    await emit(
      `${frame(event(GameEventType.GameBeginPlayer))}${frame(event(GameEventType.GameBeginHost))}`,
    )

    await expect(hostWait).resolves.toEqual(event(GameEventType.GameBeginHost))
    await expect(playerWait).resolves.toEqual(
      event(GameEventType.GameBeginPlayer),
    )
    client.close()
  })

  it('uses predicates to select a matching event and queues the others', async () => {
    const { client, emit } = await createConnectedClient()
    const matchingWait = client.waitForEvent(
      GameEventType.GameLobbyPlayer,
      (received) => received.player.nickname === 'Ada',
    )

    await emit(frame(lobbyPlayerEvent('Other')))
    await emit(frame(lobbyPlayerEvent('Ada')))

    await expect(matchingWait).resolves.toEqual(lobbyPlayerEvent('Ada'))
    await expect(
      client.waitForEvent(GameEventType.GameLobbyPlayer),
    ).resolves.toEqual(lobbyPlayerEvent('Other'))
    client.close()
  })

  it('retains queued events independently from bounded diagnostic history', async () => {
    vi.useFakeTimers()
    const { client, emit } = await createConnectedClient()

    await emit(frame(event(GameEventType.GameLoading)))
    for (let index = 0; index < 50; index += 1) {
      await emit(frame(lobbyPlayerEvent(`Later-${index}`)))
    }

    await expect(
      client.waitForEvent(GameEventType.GameLoading),
    ).resolves.toEqual(event(GameEventType.GameLoading))

    const pending = client.waitForEvent(
      GameEventType.GameBeginHost,
      undefined,
      { timeout: 10 },
    )
    const timeoutError = pending.then(
      () => {
        throw new Error('Expected the event wait to time out')
      },
      (caught: unknown) => {
        if (!(caught instanceof Error)) throw caught
        return caught
      },
    )
    await vi.advanceTimersByTimeAsync(10)
    const error = await timeoutError
    const recentEvents = Array.from(
      { length: 50 },
      () => GameEventType.GameLobbyPlayer,
    ).join(', ')

    expect(error.message).toContain(
      `Recently received non-heartbeat event types: ${recentEvents}. `,
    )
    expect(error.message).not.toContain(GameEventType.GameLoading)
    client.close()
  })

  it('ignores heartbeat events', async () => {
    vi.useFakeTimers()
    const { client, emit } = await createConnectedClient()
    const heartbeatWait = client.waitForEvent(
      GameEventType.GameHeartbeat,
      undefined,
      { timeout: 10 },
    )

    await emit(frame(event(GameEventType.GameHeartbeat)))
    const timeoutAssertion = expect(heartbeatWait).rejects.toThrow(
      'Recently received non-heartbeat event types: none',
    )
    await vi.advanceTimersByTimeAsync(10)
    await timeoutAssertion
    client.close()
  })

  it('parses frames split across stream chunks', async () => {
    const { client, emit } = await createConnectedClient()
    const pending = client.waitForEvent(GameEventType.GameLoading)
    const serializedFrame = frame(event(GameEventType.GameLoading))
    const midpoint = Math.floor(serializedFrame.length / 2)

    await emit([
      serializedFrame.slice(0, midpoint),
      serializedFrame.slice(midpoint),
    ])

    await expect(pending).resolves.toEqual(event(GameEventType.GameLoading))
    client.close()
  })

  it('parses normal and CRLF SSE frame separators', async () => {
    const { client, emit } = await createConnectedClient()
    const firstWait = client.waitForEvent(GameEventType.GameLoading)
    const secondWait = client.waitForEvent(GameEventType.GameBeginHost)

    await emit(
      `${frame(event(GameEventType.GameLoading))}`.replace('\n\n', '\r\n\r\n') +
        frame(event(GameEventType.GameBeginHost)),
    )

    await expect(firstWait).resolves.toEqual(event(GameEventType.GameLoading))
    await expect(secondWait).resolves.toEqual(
      event(GameEventType.GameBeginHost),
    )
    client.close()
  })

  it('rejects pending waits when an event payload is malformed', async () => {
    const { client, emit } = await createConnectedClient()
    const pending = client.waitForEvent(GameEventType.GameLoading)

    await emit('data: {"notAnEvent":true}\n\n')

    await expect(pending).rejects.toThrow(
      'Game event payload is not a typed event object',
    )
    expect(() => client.waitForEvent(GameEventType.GameLoading)).toThrow(
      'Game event payload is not a typed event object',
    )
    client.close()
  })

  it('rejects pending waits when the stream closes unexpectedly', async () => {
    const { client, controller } = await createConnectedClient()
    const pending = client.waitForEvent(GameEventType.GameLoading)

    controller.close()

    await expect(pending).rejects.toThrow(
      'Game event stream closed unexpectedly',
    )
    expect(() => client.waitForEvent(GameEventType.GameLoading)).toThrow(
      'Game event stream closed unexpectedly',
    )
    client.close()
  })

  it('rejects pending waits and clears state on explicit close', async () => {
    const { client, emit } = await createConnectedClient()
    await emit(frame(event(GameEventType.GameBeginHost)))
    const pending = client.waitForEvent(GameEventType.GameLoading)

    client.close()
    client.close()

    await expect(pending).rejects.toThrow('Game test client closed')
    expect(
      (client as unknown as { queuedEvents: unknown[] }).queuedEvents,
    ).toHaveLength(0)
    expect(() => client.waitForEvent(GameEventType.GameLoading)).toThrow(
      'Game test client is closed',
    )
  })

  it('removes timed-out waiters so later events are queued', async () => {
    vi.useFakeTimers()
    const { client, emit } = await createConnectedClient()
    const timedOut = client.waitForEvent(GameEventType.GameLoading, undefined, {
      timeout: 10,
    })

    const timeoutAssertion = expect(timedOut).rejects.toThrow(
      'Timed out after 10ms',
    )
    await vi.advanceTimersByTimeAsync(10)
    await timeoutAssertion

    await emit(frame(event(GameEventType.GameLoading)))
    await expect(
      client.waitForEvent(GameEventType.GameLoading),
    ).resolves.toEqual(event(GameEventType.GameLoading))
    client.close()
  })

  it('reports timeout diagnostics for queued events', async () => {
    vi.useFakeTimers()
    const { client, emit } = await createConnectedClient()

    await emit(frame(event(GameEventType.GameBeginHost)))
    const pending = client.waitForEvent(GameEventType.GameLoading, undefined, {
      timeout: 10,
    })
    const timeoutAssertion = expect(pending).rejects.toThrow(
      'Queued events that did not satisfy this wait: {"type":"GAME_BEGIN_HOST"}',
    )
    await vi.advanceTimersByTimeAsync(10)
    await timeoutAssertion
    client.close()
  })
})

async function createConnectedClient(): Promise<{
  client: TestGameEventClient
  controller: ReadableStreamDefaultController<Uint8Array>
  emit: (chunks: string | string[]) => Promise<void>
}> {
  let streamController: ReadableStreamDefaultController<Uint8Array> | undefined
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      streamController = controller
    },
  })

  vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
    new Response(stream, { headers: { 'Content-Type': 'text/event-stream' } }),
  )

  const client = new TestGameEventClient()
  client.authenticate()
  await client.connect()

  if (!streamController) throw new Error('SSE stream is not ready')
  const controller = streamController

  return {
    client,
    controller,
    emit: async (chunks) => {
      const encoder = new TextEncoder()
      for (const chunk of Array.isArray(chunks) ? chunks : [chunks]) {
        controller.enqueue(encoder.encode(chunk))
      }
      await Promise.resolve()
      await Promise.resolve()
    },
  }
}

function event(type: GameEventType): object {
  return type === GameEventType.GameBeginPlayer
    ? { type, player: { nickname: 'Ada' } }
    : { type }
}

function lobbyPlayerEvent(nickname: string): object {
  return { type: GameEventType.GameLobbyPlayer, player: { nickname } }
}

function frame(payload: object): string {
  return `data: ${JSON.stringify(payload)}\n\n`
}
