import { GameEventType, HEARTBEAT_INTERVAL } from '@klurigo/common'
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ConnectionStatus } from './event-source.types'
import {
  GAME_EVENT_STREAM_CONNECTION_ID_STORAGE_KEY,
  useEventSource,
} from './useEventSource'

vi.mock('../config', () => ({
  default: { klurigoServiceUrl: 'http://klurigo-service.local' },
}))

vi.mock('event-source-polyfill', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const instances: any[] = []

  class MockEventSourcePolyfill {
    static readonly CLOSED = 2
    static readonly CONNECTING = 0
    static readonly OPEN = 1

    readyState = MockEventSourcePolyfill.CONNECTING

    onopen: ((ev: Event) => void) | null = null
    onmessage: ((ev: MessageEvent) => void) | null = null
    onerror: ((ev: Event) => void) | null = null

    close = vi.fn(() => {
      this.readyState = MockEventSourcePolyfill.CLOSED
    })

    constructor(
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      public url: string,
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      public init: Record<string, unknown>,
    ) {
      instances.push(this)
    }
  }

  const _getInstances = () => instances
  const _last = () => instances[instances.length - 1]

  return {
    EventSourcePolyfill: MockEventSourcePolyfill,
    _getInstances,
    _last,
  }
})

// eslint-disable-next-line import/order
import * as ESP from 'event-source-polyfill'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ESHelpers = { _getInstances: () => any[]; _last: () => any }
const { _getInstances, _last } = ESP as unknown as ESHelpers

const instances = () => _getInstances()
const last = () => _last()
const setVisibilityState = (state: DocumentVisibilityState) => {
  Object.defineProperty(document, 'visibilityState', {
    value: state,
    configurable: true,
  })
}

describe('useEventSource', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    instances().length = 0
    setVisibilityState('visible')
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  it('does not connect without gameID or token', () => {
    const { result } = renderHook(() => useEventSource(undefined, undefined))
    expect(result.current[1]).toBe(ConnectionStatus.INITIALIZED)
    expect(instances().length).toBe(0)
  })

  it('opens EventSource and moves to CONNECTED after the authoritative snapshot', () => {
    const { result } = renderHook(() => useEventSource('g1', 't1'))
    expect(instances().length).toBe(1)

    act(() => last().onopen?.(new Event('open')))

    expect(result.current[1]).toBe(ConnectionStatus.INITIALIZED)

    act(() => {
      last().onmessage?.({
        data: JSON.stringify({ type: 'GAME_LOBBY_PLAYER' }),
      } as MessageEvent)
    })

    expect(result.current[1]).toBe(ConnectionStatus.CONNECTED)
    const streamUrl = new URL(last().url)
    expect(streamUrl.pathname).toBe('/games/g1/events')
    expect(streamUrl.searchParams.get('connectionId')).toBe(
      window.sessionStorage.getItem(
        GAME_EVENT_STREAM_CONNECTION_ID_STORAGE_KEY,
      ),
    )
    expect(last().init).toMatchObject({
      headers: {
        Authorization: 'Bearer t1',
        Accept: 'text/event-stream',
      },
    })
  })

  it('passes heartbeatTimeout based on HEARTBEAT_INTERVAL', () => {
    renderHook(() => useEventSource('g1', 't1'))

    expect(last().init).toMatchObject({
      heartbeatTimeout: HEARTBEAT_INTERVAL * 3,
    })
  })

  it('ignores heartbeat events', () => {
    const { result } = renderHook(() => useEventSource('g1', 't1'))
    act(() => last().onopen?.(new Event('open')))

    act(() => {
      last().onmessage?.({
        data: JSON.stringify({ type: GameEventType.GameHeartbeat }),
      } as MessageEvent)
    })

    expect(result.current[0]).toBeUndefined()
  })

  it('stores latest non-heartbeat event', () => {
    const { result } = renderHook(() => useEventSource('g1', 't1'))
    act(() => last().onopen?.(new Event('open')))
    act(() => {
      last().onmessage?.({
        data: JSON.stringify({ type: 'SomethingElse', payload: 123 }),
      } as MessageEvent)
    })
    expect(result.current[0]).toMatchObject({
      type: 'SomethingElse',
      payload: 123,
    })
  })

  it('retries with exponential backoff and updates status', () => {
    const { result } = renderHook(() => useEventSource('g1', 't1'))
    expect(instances().length).toBe(1)

    act(() => last().onerror?.(new Event('error')))
    expect(result.current[1]).toBe(ConnectionStatus.RECONNECTING)

    act(() => vi.advanceTimersByTime(1000))
    expect(instances().length).toBe(2)

    act(() => last().onerror?.(new Event('error')))
    expect(result.current[1]).toBe(ConnectionStatus.RECONNECTING)

    act(() => vi.advanceTimersByTime(2000))
    expect(instances().length).toBe(3)
  })

  it('keeps reconnecting until the replacement stream delivers a snapshot', () => {
    const { result } = renderHook(() => useEventSource('g1', 't1'))
    const first = last()

    act(() => first.onopen?.(new Event('open')))
    act(() => {
      first.onmessage?.({
        data: JSON.stringify({ type: 'OLD_STATE' }),
      } as MessageEvent)
    })
    expect(result.current[1]).toBe(ConnectionStatus.CONNECTED)

    act(() => first.onerror?.(new Event('error')))
    expect(result.current[1]).toBe(ConnectionStatus.RECONNECTING)

    act(() => vi.advanceTimersByTime(1000))
    const replacement = last()
    act(() => replacement.onopen?.(new Event('open')))
    expect(result.current[1]).toBe(ConnectionStatus.RECONNECTING)

    act(() => {
      replacement.onmessage?.({
        data: JSON.stringify({ type: 'AUTHORITATIVE_STATE' }),
      } as MessageEvent)
    })

    expect(result.current[0]).toEqual({ type: 'AUTHORITATIVE_STATE' })
    expect(result.current[1]).toBe(ConnectionStatus.CONNECTED)
  })

  it('reports a terminal failure when the stream is closed before reconnecting', () => {
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {})

    const { result } = renderHook(() => useEventSource('g1', 't1'))
    const current = last()

    act(() => {
      current.onmessage?.({
        data: JSON.stringify({ type: 'STALE_STATE' }),
      } as MessageEvent)
    })
    expect(result.current[0]).toEqual({ type: 'STALE_STATE' })

    ;(current as { readyState: number }).readyState = (
      ESP as unknown as { EventSourcePolyfill: { CLOSED: number } }
    ).EventSourcePolyfill.CLOSED

    act(() => {
      current.onerror?.(Object.assign(new Event('error'), { status: 401 }))
    })
    act(() => vi.runAllTimers())

    expect(instances().length).toBe(1)
    expect(result.current[0]).toBeUndefined()
    expect(result.current[1]).toBe(ConnectionStatus.RECONNECTING_FAILED)
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Game event stream closed before recovery could complete.',
    )

    consoleErrorSpy.mockRestore()
  })

  it('retries a closed stream after a transient snapshot failure', () => {
    const { result } = renderHook(() => useEventSource('g1', 't1'))
    const current = last()

    ;(current as { readyState: number }).readyState = (
      ESP as unknown as { EventSourcePolyfill: { CLOSED: number } }
    ).EventSourcePolyfill.CLOSED

    act(() => {
      current.onerror?.(Object.assign(new Event('error'), { status: 500 }))
    })

    expect(result.current[1]).toBe(ConnectionStatus.RECONNECTING)

    act(() => vi.advanceTimersByTime(1000))

    expect(instances().length).toBe(2)
  })

  it('retries a closed stream after a transport interruption without an HTTP status', () => {
    const { result } = renderHook(() => useEventSource('g1', 't1'))
    const current = last()

    ;(current as { readyState: number }).readyState = (
      ESP as unknown as { EventSourcePolyfill: { CLOSED: number } }
    ).EventSourcePolyfill.CLOSED

    act(() => current.onerror?.(new Event('error')))

    expect(result.current[1]).toBe(ConnectionStatus.RECONNECTING)

    act(() => vi.advanceTimersByTime(1000))

    expect(instances().length).toBe(2)
  })

  it('stops after MAX_RETRIES and sets RECONNECTING_FAILED', () => {
    vi.useFakeTimers()

    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {})

    const { result } = renderHook(() => useEventSource('g1', 't1'))

    for (let i = 0; i < 10; i++) {
      act(() => {
        last().onerror?.(new Event('error'))
      })
      act(() => {
        vi.advanceTimersByTime(30_000)
      })
    }

    expect(result.current[1]).toBe(ConnectionStatus.RECONNECTING_FAILED)

    const countAfter = instances().length

    act(() => {
      vi.advanceTimersByTime(30_000)
    })

    expect(instances().length).toBe(countAfter)

    // More robust than toHaveBeenCalledWith if the code logs extra args
    expect(consoleErrorSpy).toHaveBeenCalled()
    expect(
      consoleErrorSpy.mock.calls.some(
        (c) =>
          c[0] ===
          'Max retry attempts reached. Stopping reconnection attempts.',
      ),
    ).toBe(true)

    consoleErrorSpy.mockRestore()
    vi.useRealTimers()
  })

  it('closes EventSource on unmount', () => {
    const { unmount } = renderHook(() => useEventSource('g1', 't1'))
    const current = last()
    unmount()
    expect(current.close).toHaveBeenCalledTimes(1)
    expect(current.onopen).toBeNull()
    expect(current.onmessage).toBeNull()
    expect(current.onerror).toBeNull()
  })

  it('recreates the connection when gameID or token change', () => {
    const { rerender } = renderHook(
      ({ gid, tkn }) => useEventSource(gid, tkn),
      { initialProps: { gid: 'g1', tkn: 't1' } },
    )

    const first = last()

    rerender({ gid: 'g2', tkn: 't1' })
    expect(instances().length).toBe(2)
    expect(first.close).toHaveBeenCalled()
    expect(first.onopen).toBeNull()
    expect(first.onmessage).toBeNull()
    expect(first.onerror).toBeNull()

    rerender({ gid: 'g2', tkn: 't2' })
    expect(instances().length).toBe(3)
  })

  it('clears the event when the authenticated session changes', () => {
    const { result, rerender } = renderHook(
      ({ gid, tkn }) => useEventSource(gid, tkn),
      { initialProps: { gid: 'g1', tkn: 't1' } },
    )

    act(() => {
      last().onmessage?.({
        data: JSON.stringify({ type: 'OLD_SESSION_STATE' }),
      } as MessageEvent)
    })
    expect(result.current[0]).toEqual({ type: 'OLD_SESSION_STATE' })

    rerender({ gid: 'g2', tkn: 't2' })

    expect(result.current[0]).toBeUndefined()
    expect(instances().length).toBe(2)
  })

  it('closes EventSource on pagehide and does not reconnect on subsequent errors', () => {
    const { result } = renderHook(() => useEventSource('g1', 't1'))
    const current = last()

    act(() => {
      window.dispatchEvent(new Event('pagehide'))
    })

    expect(current.close).toHaveBeenCalledTimes(1)
    expect(current.onopen).toBeNull()
    expect(current.onmessage).toBeNull()
    expect(current.onerror).toBeNull()

    act(() => current.onerror?.(new Event('error')))
    expect(result.current[1]).toBe(ConnectionStatus.INITIALIZED)

    act(() => vi.runAllTimers())
    expect(instances().length).toBe(1)
  })

  it('closes EventSource on beforeunload and does not reconnect', () => {
    renderHook(() => useEventSource('g1', 't1'))
    const current = last()

    act(() => {
      window.dispatchEvent(new Event('beforeunload'))
    })

    expect(current.close).toHaveBeenCalledTimes(1)

    act(() => current.onerror?.(new Event('error')))
    act(() => vi.runAllTimers())

    expect(instances().length).toBe(1)
  })

  it('ignores onerror when document is hidden', () => {
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {})

    const { result } = renderHook(() => useEventSource('g1', 't1'))
    const current = last()

    setVisibilityState('hidden')

    act(() => current.onerror?.(new Event('error')))

    expect(result.current[1]).toBe(ConnectionStatus.INITIALIZED)

    act(() => vi.runAllTimers())
    expect(instances().length).toBe(1)

    expect(consoleErrorSpy).not.toHaveBeenCalledWith(
      'Connection error, retrying...',
    )

    consoleErrorSpy.mockRestore()
  })

  it('registers and unregisters page lifecycle listeners', () => {
    const addSpy = vi.spyOn(window, 'addEventListener')
    const removeSpy = vi.spyOn(window, 'removeEventListener')

    const { unmount } = renderHook(() => useEventSource('g1', 't1'))

    expect(addSpy).toHaveBeenCalledWith('pagehide', expect.any(Function))
    expect(addSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function))

    unmount()

    expect(removeSpy).toHaveBeenCalledWith('pagehide', expect.any(Function))
    expect(removeSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function))

    addSpy.mockRestore()
    removeSpy.mockRestore()
  })

  it('ignores events from stale instances after reconnect', () => {
    const { result } = renderHook(() => useEventSource('g1', 't1'))
    const first = last()
    const staleMessage = first.onmessage

    act(() => first.onerror?.(new Event('error')))
    act(() => vi.advanceTimersByTime(1000))
    const second = last()

    act(() => {
      staleMessage?.({
        data: JSON.stringify({ type: 'STALE_STATE' }),
      } as MessageEvent)
    })
    expect(result.current[0]).toBeUndefined()

    act(() => first.onopen?.(new Event('open')))
    expect(result.current[1]).not.toBe(ConnectionStatus.CONNECTED)

    act(() => second.onopen?.(new Event('open')))
    act(() => {
      second.onmessage?.({
        data: JSON.stringify({ type: 'CURRENT_STATE' }),
      } as MessageEvent)
    })
    expect(result.current[1]).toBe(ConnectionStatus.CONNECTED)
  })

  it('does not update state when the same non-heartbeat event is received twice', () => {
    const { result } = renderHook(() => useEventSource('g1', 't1'))
    act(() => last().onopen?.(new Event('open')))

    const eventPayload = { type: 'SomethingElse', payload: 123 }

    act(() => {
      last().onmessage?.({ data: JSON.stringify(eventPayload) } as MessageEvent)
    })

    const firstEventRef = result.current[0]

    act(() => {
      last().onmessage?.({ data: JSON.stringify(eventPayload) } as MessageEvent)
    })

    expect(result.current[0]).toBe(firstEventRef)
  })
})
