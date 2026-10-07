import { ResizeObserver } from '@juggle/resize-observer'
import { cleanup, configure } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, expect, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'

configure({
  asyncUtilTimeout: 2000,
})

if (!('ResizeObserver' in globalThis)) {
  globalThis.ResizeObserver = ResizeObserver
}

export const restHandlers = [
  http.get('/klurigo-service/api/hello', () => {
    return HttpResponse.json({ value: 'Hello, World!' })
  }),
]

const server = setupServer(...restHandlers)

type PendingReq = { method: string; url: string }
const pending = new Map<Request, PendingReq>()

function currentTestLabel() {
  // Works in Vitest; returns something like:
  // "ProgressBar > should render a ProgressBar with initial progress"
  return expect.getState().currentTestName ?? '(unknown test)'
}

function failWithTestContext(err: unknown): never {
  const name = currentTestLabel()
  const message = err instanceof Error ? err.message : String(err)
  const stack = err instanceof Error && err.stack ? `\n${err.stack}` : ''
  throw new Error(`[teardown failure] ${name}\n${message}${stack}`)
}

function failOnReactActWarnings() {
  const original = console.error

  return vi.spyOn(console, 'error').mockImplementation((...args) => {
    const msg = String(args[0] ?? '')

    if (
      msg.includes('was not wrapped in act') ||
      msg.includes('A suspended resource finished loading inside a test')
    ) {
      throw new Error(
        `[react act warning] ${currentTestLabel()}\n${args.map(String).join(' ')}`,
      )
    }

    original(...args)
  })
}

function trackPendingMswRequests() {
  server.events.on('request:start', ({ request }) => {
    pending.set(request, {
      method: request.method,
      url: request.url.toString(),
    })
  })

  const done = ({ request }: { request: Request }) => {
    pending.delete(request)
  }

  server.events.on('request:match', done)
  server.events.on('request:unhandled', done)
  server.events.on('response:mocked', done)
  server.events.on('response:bypass', done)
}

function flushMicrotasks() {
  return new Promise<void>((r) => queueMicrotask(r))
}

function assertNoPendingNetwork() {
  if (pending.size === 0) return

  const list = [...pending.values()]
    .map((p) => `${p.method} ${p.url}`)
    .join('\n')
  pending.clear()
  throw new Error(`Test finished with pending network requests:\n${list}`)
}

function assertNoLeakedTimers() {
  try {
    const count = vi.getTimerCount()
    if (count > 0) throw new Error(`Leaked timers: ${count}`)
  } catch {
    // Real timers active -> nothing to inspect
  }
}

function resetTimers() {
  vi.useRealTimers()
  vi.clearAllTimers()
}

let consoleErrorSpy: ReturnType<typeof vi.spyOn> | undefined

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' })
  trackPendingMswRequests()
  consoleErrorSpy = failOnReactActWarnings()
})

afterAll(() => {
  server.close()
  consoleErrorSpy?.mockRestore()
})

afterEach(async () => {
  server.resetHandlers()
  cleanup()

  await flushMicrotasks()

  try {
    assertNoPendingNetwork()
    assertNoLeakedTimers()
  } catch (err) {
    failWithTestContext(err)
  } finally {
    resetTimers()
    vi.resetModules()
  }
})
