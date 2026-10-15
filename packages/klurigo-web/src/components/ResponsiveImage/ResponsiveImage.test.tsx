import { QuestionImageRevealEffectType } from '@klurigo/common'
import { act, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import ResponsiveImage from './ResponsiveImage'

class MockImage {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onload: null | ((ev?: any) => any) = null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onerror: null | ((ev?: any) => any) = null
  naturalWidth = 400
  naturalHeight = 300
  set src(val: string) {
    if (!val || val === 'bad' || val.startsWith('invalid')) {
      this.onerror?.(new Event('error'))
    } else {
      this.onload?.(new Event('load'))
    }
  }
}

vi.stubGlobal('Image', MockImage as unknown as typeof Image)

let didNotifyResize = false

const resizeObserverImpl = vi.fn(
  ({
    onResize,
  }: {
    onResize: (size: { width: number; height: number }) => void
  }) => {
    if (!didNotifyResize) {
      didNotifyResize = true
      onResize({ width: 800, height: 600 })
    }
  },
)

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const debounceImpl = (fn: (...args: any[]) => void) => fn

vi.mock('usehooks-ts', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  useResizeObserver: (args: any) => resizeObserverImpl(args),
  useDebounceCallback: (fn: unknown) =>
    debounceImpl(fn as (...args: unknown[]) => void),
}))

vi.mock('./hook', () => ({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  useImageBlurEffect: (_box?: unknown, countdown?: unknown, _opts?: unknown) =>
    countdown ? { filter: 'blur(8px)' } : { filter: 'blur(0px)' },
}))

vi.mock('../LoadingSpinner', () => ({
  default: () => <div data-testid="loading-spinner" />,
}))

vi.mock('./components', () => ({
  ImageSquareEffect: ({
    effect,
  }: {
    effect: QuestionImageRevealEffectType
  }) => <div data-testid="square-effect" data-effect={String(effect)} />,
}))

describe('ResponsiveImage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    didNotifyResize = false
  })

  it('should render loading state when no imageURL is provided', () => {
    const { container } = render(<ResponsiveImage alt="loading" />)
    expect(container).toMatchSnapshot()
  })

  it('should render error state when image fails to load', async () => {
    const { container } = render(
      <ResponsiveImage imageURL="invalid-url" alt="error" />,
    )

    await waitFor(() => {
      expect(container.querySelector('[class*="icon"]')).toBeTruthy()
    })

    expect(container.querySelector('[class*="centerOverlay"]')).toHaveStyle({
      aspectRatio: String(16 / 10),
    })
    expect(container.querySelector('img')).toBeNull()
    expect(container).toMatchSnapshot()
  })

  it('computes box size from container and intrinsic dims (800x600 from 400x300 * 2)', async () => {
    const { container } = render(
      <ResponsiveImage imageURL="https://cdn/img.jpg" alt="computed" />,
    )

    await waitFor(() => {
      expect(container.querySelector('img')).toBeTruthy()
    })

    const box = container.querySelector('[class*="box"]') as HTMLElement | null
    expect(box).toBeTruthy()
    expect(box?.style.width).toBe('800px')
    expect(box?.style.height).toBe('600px')

    const img = container.querySelector('img')
    expect(img).toHaveAttribute('src', 'https://cdn/img.jpg')
    expect(img).toHaveAttribute('alt', 'computed')
  })

  it('shows loading overlay while image is loading (before onload fires)', async () => {
    class LoadingImage {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onload: null | ((ev?: any) => any) = null
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onerror: null | ((ev?: any) => any) = null
      naturalWidth = 0
      naturalHeight = 0
      set src(_val: string) {
        // never call onload/onerror -> stays "loading"
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prev = (globalThis as any).Image
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(globalThis as any).Image = LoadingImage

    const { container, unmount } = render(
      <ResponsiveImage imageURL="https://cdn/slow.jpg" alt="loading" />,
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
    })

    expect(container.querySelector('img')).toBeNull()

    unmount()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(globalThis as any).Image = prev
  })

  it('applies Blur effect style via hook and does NOT render square effect', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const countdown = { remainingMs: 3000 } as any

    const { container } = render(
      <ResponsiveImage
        imageURL="https://cdn/blur.jpg"
        alt="blur"
        revealEffect={{ type: QuestionImageRevealEffectType.Blur, countdown }}
      />,
    )

    await waitFor(() => {
      expect(container.querySelector('img')).toBeTruthy()
    })

    const img = container.querySelector('img') as HTMLImageElement | null
    expect(img).toBeTruthy()
    expect(img?.getAttribute('style') || '').toMatch(/blur\(8px\)/i)

    expect(screen.queryByTestId('square-effect')).toBeNull()
  })

  it('renders ImageSquareEffect for Square3x3 and does NOT apply blur style', async () => {
    const { container } = render(
      <ResponsiveImage
        imageURL="https://cdn/tiles.jpg"
        alt="squares"
        revealEffect={{ type: QuestionImageRevealEffectType.Square3x3 }}
      />,
    )

    await waitFor(() => {
      expect(screen.getByTestId('square-effect')).toBeInTheDocument()
    })

    const square = screen.getByTestId('square-effect')
    expect(square).toHaveAttribute(
      'data-effect',
      String(QuestionImageRevealEffectType.Square3x3),
    )

    const img = container.querySelector('img') as HTMLImageElement | null
    expect(img).toBeTruthy()
    expect(img?.getAttribute('style') || '').not.toMatch(/blur/i)
  })

  it('renders children into overlay when provided', async () => {
    const { container } = render(
      <ResponsiveImage imageURL="https://cdn/overlay.jpg" alt="overlay">
        <span data-testid="overlay-child">Overlay Content</span>
      </ResponsiveImage>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('overlay-child')).toBeInTheDocument()
    })

    const overlay = container.querySelector('[class*="overlay"]')
    expect(overlay).toBeTruthy()
  })

  it('respects noBorder by using the boxNoBorder class', async () => {
    const { container } = render(
      <ResponsiveImage
        imageURL="https://cdn/noborder.jpg"
        alt="noBorder"
        noBorder
      />,
    )

    await waitFor(() => {
      expect(container.querySelector('img')).toBeTruthy()
    })

    const box = container.querySelector('[class*="boxNoBorder"]')
    expect(box).toBeTruthy()

    const bordered = container.querySelector(
      '[class*="box"]:not([class*="boxNoBorder"])',
    )
    expect(bordered).toBeNull()
  })

  it('renders with fill fit — box uses 100% width and height ignoring aspect ratio', async () => {
    const { container } = render(
      <ResponsiveImage imageURL="https://cdn/fill.jpg" alt="fill" fit="fill" />,
    )

    await waitFor(() => {
      expect(container.querySelector('img')).toBeTruthy()
    })

    const box = container.querySelector('[class*="box"]') as HTMLElement | null
    expect(box).toBeTruthy()
    expect(box?.style.width).toBe('100%')
    expect(box?.style.height).toBe('100%')
  })

  it('applies noRadius class when noCornerRadius is true', async () => {
    const { container } = render(
      <ResponsiveImage
        imageURL="https://cdn/noradius.jpg"
        alt="noRadius"
        noCornerRadius
      />,
    )

    await waitFor(() => {
      expect(container.querySelector('img')).toBeTruthy()
    })

    const box = container.querySelector('[class*="noRadius"]')
    expect(box).toBeTruthy()
  })

  it('does not apply noRadius class when noCornerRadius is false', async () => {
    const { container } = render(
      <ResponsiveImage imageURL="https://cdn/radius.jpg" alt="radius" />,
    )

    await waitFor(() => {
      expect(container.querySelector('img')).toBeTruthy()
    })

    expect(container.querySelector('[class*="noRadius"]')).toBeNull()
  })

  it('resets to idle (no content) when imageURL becomes undefined after being set', async () => {
    const { rerender, container } = render(
      <ResponsiveImage imageURL="https://cdn/once.jpg" alt="once" />,
    )

    await waitFor(() => {
      expect(container.querySelector('img')).toBeTruthy()
    })

    rerender(<ResponsiveImage alt="idle" />)

    await act(async () => {})

    expect(container.querySelector('img')).toBeNull()
    expect(screen.queryByTestId('loading-spinner')).toBeNull()
  })

  it('renders nothing in ready phase if container has no measurable size (box=null)', async () => {
    resizeObserverImpl.mockImplementation(
      // eslint-disable-next-line @typescript-eslint/no-unused-vars,@typescript-eslint/no-explicit-any
      (_args: any) => {
        /* no onResize call => width/height remain 0 */
      },
    )

    const { container } = render(
      <ResponsiveImage imageURL="https://cdn/nosize.jpg" alt="nosize" />,
    )

    await act(async () => {})

    expect(container.querySelector('img')).toBeNull()
    expect(screen.queryByTestId('loading-spinner')).toBeNull()

    resizeObserverImpl.mockReset()
  })

  it('applies borderColor inline style to box in ready phase', async () => {
    const { container } = render(
      <ResponsiveImage
        imageURL="https://cdn/border.jpg"
        alt="border"
        borderColor="red"
      />,
    )

    await waitFor(() => {
      expect(container.querySelector('img')).toBeTruthy()
    })

    const box = container.querySelector('[class*="box"]') as HTMLElement | null
    expect(box).toBeTruthy()
    expect(box?.style.borderColor).toBe('red')
  })

  it('applies borderColor inline style to error state overlay', async () => {
    const { container } = render(
      <ResponsiveImage
        imageURL="invalid-url"
        alt="error-border"
        borderColor="blue"
      />,
    )

    await waitFor(() => {
      expect(container.querySelector('[class*="icon"]')).toBeTruthy()
    })

    const overlay = container.querySelector(
      '[class*="centerOverlay"]',
    ) as HTMLElement | null
    expect(overlay).toBeTruthy()
    expect(overlay?.style.borderColor).toBe('blue')
  })
})
