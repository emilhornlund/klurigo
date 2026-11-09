import { act, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import InfiniteScrollContainer from './InfiniteScrollContainer'

type ROInstance = { trigger: () => void }

const resizeObservers: ROInstance[] = []

class ResizeObserverMock {
  private cb: ResizeObserverCallback

  constructor(cb: ResizeObserverCallback) {
    this.cb = cb
    resizeObservers.push({
      trigger: () => this.cb([], this as unknown as ResizeObserver),
    })
  }

  observe() {
    // noop
  }

  unobserve() {
    // noop
  }

  disconnect() {
    // noop
  }
}

let rafCb: ((t: number) => void) | null = null

const installRafMock = () => {
  rafCb = null
  vi.stubGlobal('requestAnimationFrame', (cb: (t: number) => void) => {
    rafCb = cb
    return 1
  })
  vi.stubGlobal('cancelAnimationFrame', () => {})
}

const runRaf = async (t: number) => {
  if (!rafCb) throw new Error('requestAnimationFrame callback not registered')
  await act(async () => {
    rafCb?.(t)
  })
}

const setElementHeights = (
  viewport: HTMLElement,
  firstBlock: HTMLElement,
  clientHeight: number,
  blockHeight: number,
) => {
  Object.defineProperty(viewport, 'clientHeight', {
    configurable: true,
    value: clientHeight,
  })
  Object.defineProperty(firstBlock, 'offsetHeight', {
    configurable: true,
    value: blockHeight,
  })
}

describe('InfiniteScrollContainer', () => {
  beforeEach(() => {
    resizeObservers.length = 0
    vi.stubGlobal(
      'ResizeObserver',
      ResizeObserverMock as unknown as typeof ResizeObserver,
    )
    vi.stubGlobal('performance', { now: () => 0 } as unknown as Performance)
    installRafMock()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('renders a single block when content does not overflow', async () => {
    const { container } = render(
      <InfiniteScrollContainer enabled={true} gapPx={10}>
        <div>HELLO</div>
      </InfiniteScrollContainer>,
    )

    const viewport = container.firstElementChild as HTMLElement
    const track = viewport.firstElementChild as HTMLElement
    const firstBlock = track.children[0] as HTMLElement

    setElementHeights(viewport, firstBlock, 200, 100)

    // Trigger ResizeObserver recompute (the component registers at least one RO)
    await act(async () => {
      resizeObservers.forEach((ro) => ro.trigger())
    })

    // shouldLoop false => only one block, no gap
    expect(track.children.length).toBe(1)
    expect(track.textContent).toContain('HELLO')
  })

  it('duplicates content and inserts a gap when content overflows', async () => {
    const { container } = render(
      <InfiniteScrollContainer enabled={true} gapPx={10}>
        <div>HELLO</div>
      </InfiniteScrollContainer>,
    )

    const viewport = container.firstElementChild as HTMLElement
    const track = viewport.firstElementChild as HTMLElement
    const firstBlock = track.children[0] as HTMLElement

    setElementHeights(viewport, firstBlock, 100, 200)

    await act(async () => {
      resizeObservers.forEach((ro) => ro.trigger())
    })

    // shouldLoop true => block0, gap, block1
    expect(track.children.length).toBe(3)
    expect(track.children[0]).toBe(firstBlock)

    // Gap is the middle element
    const gap = track.children[1] as HTMLElement
    expect(gap.style.height).toBe('10px')
  })

  it('does not loop when content fits and does not apply a transform', async () => {
    const { container } = render(
      <InfiniteScrollContainer enabled={true} hAlign="start" vAlign="center">
        <div>HELLO</div>
      </InfiniteScrollContainer>,
    )

    const viewport = container.firstElementChild as HTMLElement
    const track = viewport.firstElementChild as HTMLElement
    const firstBlock = track.children[0] as HTMLElement

    // Not overflowing => shouldLoop false
    setElementHeights(viewport, firstBlock, 200, 100)

    await act(async () => {
      resizeObservers.forEach((ro) => ro.trigger())
    })

    // No loop => single block, no gap, no duplicate
    expect(track.children.length).toBe(1)

    // No loop => transform is not set at all
    expect(
      track.style.transform === '' || track.style.transform === undefined,
    ).toBe(true)
  })

  it('loops when content overflows and applies a transform', async () => {
    const { container } = render(
      <InfiniteScrollContainer
        enabled={true}
        hAlign="center"
        vAlign="center"
        gapPx={10}>
        <div>HELLO</div>
      </InfiniteScrollContainer>,
    )

    const viewport = container.firstElementChild as HTMLElement
    const track = viewport.firstElementChild as HTMLElement
    const firstBlock = track.children[0] as HTMLElement

    // Overflow => shouldLoop true
    setElementHeights(viewport, firstBlock, 100, 200)

    await act(async () => {
      resizeObservers.forEach((ro) => ro.trigger())
    })

    // Looping => block0, gap, block1
    expect(track.children.length).toBe(3)

    const gap = track.children[1] as HTMLElement
    expect(gap.style.height).toBe('10px')

    // Looping => transform is set (offset starts at 0)
    expect(track.style.transform).toBe('translateY(0px)')
  })

  it('updates transform over time when enabled and looping', async () => {
    const { container } = render(
      <InfiniteScrollContainer enabled={true} pxPerSecond={10} gapPx={10}>
        <div>HELLO</div>
      </InfiniteScrollContainer>,
    )

    const viewport = container.firstElementChild as HTMLElement
    const track = viewport.firstElementChild as HTMLElement
    const firstBlock = track.children[0] as HTMLElement

    // Overflow so it loops
    setElementHeights(viewport, firstBlock, 100, 200)

    await act(async () => {
      resizeObservers.forEach((ro) => ro.trigger())
    })

    // First RAF registration happens inside effect
    // Simulate two frames: start at t=0, then t=1000ms (dt=1s) => offset += 10px
    await runRaf(0)
    await runRaf(1000)

    expect(track.style.transform).toBe('translateY(-10px)')
  })

  it('does not advance the offset when disabled, even if looping', async () => {
    const { container } = render(
      <InfiniteScrollContainer enabled={false} pxPerSecond={10} gapPx={10}>
        <div>HELLO</div>
      </InfiniteScrollContainer>,
    )

    const viewport = container.firstElementChild as HTMLElement
    const track = viewport.firstElementChild as HTMLElement
    const firstBlock = track.children[0] as HTMLElement

    setElementHeights(viewport, firstBlock, 100, 200) // overflow => shouldLoop

    await act(async () => {
      resizeObservers.forEach((ro) => ro.trigger())
    })

    // shouldLoop=true applies transform, but offset must remain 0 when disabled
    expect(track.style.transform).toBe('translateY(0px)')

    // The animation effect must not register RAF when disabled
    expect(rafCb).toBe(null)

    // No RAF => no change
    expect(track.style.transform).toBe('translateY(0px)')
  })
})
