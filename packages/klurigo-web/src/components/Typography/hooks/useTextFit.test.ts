import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useTextFit } from './useTextFit'

describe('useTextFit', () => {
  const originalScrollHeight = Object.getOwnPropertyDescriptor(
    HTMLElement.prototype,
    'scrollHeight',
  )

  const originalRaf = globalThis.requestAnimationFrame
  const originalCaf = globalThis.cancelAnimationFrame

  afterEach(() => {
    if (originalScrollHeight) {
      Object.defineProperty(
        HTMLElement.prototype,
        'scrollHeight',
        originalScrollHeight,
      )
    }

    globalThis.requestAnimationFrame = originalRaf
    globalThis.cancelAnimationFrame = originalCaf

    vi.restoreAllMocks()
  })

  it('returns null when maxLines is 0', () => {
    const ref = { current: null }
    const { result } = renderHook(() => useTextFit(ref, 'title', 'test', 0))

    expect(result.current).toBeNull()
  })

  it('returns null when text is empty', () => {
    const ref = { current: null }
    const { result } = renderHook(() => useTextFit(ref, 'title', '', 2))

    expect(result.current).toBeNull()
  })

  it('returns null when ref is not attached', () => {
    const ref = { current: null }
    const { result } = renderHook(() =>
      useTextFit(ref, 'title', 'Some text', 2),
    )

    expect(result.current).toBeNull()
  })

  it('returns null in jsdom environment (no ResizeObserver)', () => {
    // In jsdom, window.matchMedia may be undefined or mocked
    // The hook should handle this gracefully
    const ref = { current: null }
    const { result } = renderHook(() =>
      useTextFit(ref, 'title', 'Test text', 2),
    )

    // Hook should not crash and should return null
    expect(result.current).toBeNull()
  })

  it('handles all typography variants', () => {
    const variants = [
      'extraLargeTitle',
      'title',
      'title2',
      'body',
      'link',
    ] as const

    variants.forEach((variant) => {
      const ref = { current: null }
      const { result } = renderHook(() => useTextFit(ref, variant, 'Test', 2))

      // Should handle all variants without crashing
      expect(result.current).toBeNull()
    })
  })

  it('returns a fitted result when text does not fit within maxLines', async () => {
    // Make RAF deterministic (run immediately)
    globalThis.requestAnimationFrame = (cb: FrameRequestCallback) => {
      cb(0)
      return 1
    }
    globalThis.cancelAnimationFrame = () => {}

    // Force measurer to report "too tall"
    Object.defineProperty(HTMLElement.prototype, 'scrollHeight', {
      configurable: true,
      get() {
        return 10_000
      },
    })

    // Ensure fontsLoaded becomes true immediately
    Object.defineProperty(document, 'fonts', {
      configurable: true,
      value: { status: 'loaded', ready: Promise.resolve() },
    })

    const el = document.createElement('div')
    document.body.appendChild(el)

    // jsdom has no layout → width is 0 unless we mock it
    el.getBoundingClientRect = () =>
      ({
        width: 200,
        height: 0,
        top: 0,
        left: 0,
        right: 200,
        bottom: 0,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }) as DOMRect

    const ref = { current: el }

    const { result } = renderHook(() =>
      useTextFit(ref, 'title', 'Some long text', 2),
    )

    await waitFor(() => {
      expect(result.current).not.toBeNull()
    })

    expect(result.current?.fontSize).toBeGreaterThan(0)
    expect(result.current?.lineHeight).toBeGreaterThan(0)

    document.body.removeChild(el)
  })
})
