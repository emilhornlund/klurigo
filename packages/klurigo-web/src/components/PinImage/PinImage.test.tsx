import {
  QUESTION_PIN_TOLERANCE_RADIUS,
  QuestionPinTolerance,
} from '@klurigo/common'
import { act, fireEvent, render, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import type { Mock } from 'vitest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { DeviceType } from '../../utils/device-size.types'
import { useDeviceSizeType } from '../../utils/useDeviceSizeType'

import PinImage from './PinImage'
import { PinColor, type PinImageValue } from './types'

vi.mock('../../utils/useDeviceSizeType', () => ({
  useDeviceSizeType: vi.fn(),
}))

vi.mock('../ResponsiveImage', () => ({
  __esModule: true,
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}))

type PinProps = {
  width: number
  height: number
  x: number
  y: number
  toleranceSizePx?: {
    width: number
    height: number
  }
  color?: PinColor
  disabled?: boolean
}

const pinCalls: PinProps[] = []

vi.mock('./Pin', () => ({
  __esModule: true,
  default: (props: PinProps) => {
    pinCalls.push(props)
    return (
      <div
        data-testid="pin"
        data-x={props.x}
        data-y={props.y}
        data-width={props.width}
        data-height={props.height}
        data-tolerance-width={props.toleranceSizePx?.width ?? 0}
        data-tolerance-height={props.toleranceSizePx?.height ?? 0}
        data-color={props.color}
        data-disabled={props.disabled ? 'true' : 'false'}
      />
    )
  },
}))

class ResizeObserverMock {
  static instances: ResizeObserverMock[] = []

  private cb: ResizeObserverCallback

  constructor(cb: ResizeObserverCallback) {
    this.cb = cb
    ResizeObserverMock.instances.push(this)
  }

  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()

  trigger(width: number, height: number) {
    this.cb(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      [{ contentRect: { width, height } as DOMRectReadOnly } as any],
      this,
    )
  }
}

const getOverlay = (container: HTMLElement) => {
  const el = container.querySelector('.overlay') as HTMLDivElement | null
  expect(el).toBeTruthy()
  return el!
}

const setOverlayRect = (overlay: HTMLDivElement, w: number, h: number) => {
  overlay.getBoundingClientRect = vi.fn(() => ({
    width: w,
    height: h,
    top: 0,
    left: 0,
    right: w,
    bottom: h,
    x: 0,
    y: 0,
    toJSON: () => ({}),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  })) as any
}

describe('PinImage', () => {
  beforeEach(() => {
    pinCalls.length = 0
    ;(useDeviceSizeType as unknown as Mock).mockReturnValue(DeviceType.Desktop)

    ResizeObserverMock.instances = []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.stubGlobal('ResizeObserver', ResizeObserverMock as any)

    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      cb(0)
      return 1
    })
    vi.stubGlobal('cancelAnimationFrame', () => undefined)
  })

  it('renders with default props and uses default cursor when no interactive pin exists', () => {
    const { container } = render(<PinImage />)

    const overlay = getOverlay(container)
    expect(overlay.style.cursor).toBe('default')
    expect(pinCalls.length).toBe(0)
  })

  it('sets pin size based on device type (Mobile/Tablet/Desktop)', () => {
    ;(useDeviceSizeType as unknown as Mock).mockReturnValue(DeviceType.Mobile)
    render(<PinImage value={{ x: 0.1, y: 0.2, color: PinColor.Red }} />)
    expect(pinCalls[0].width).toBe(30)
    expect(pinCalls[0].height).toBe(30)

    pinCalls.length = 0
    ;(useDeviceSizeType as unknown as Mock).mockReturnValue(DeviceType.Tablet)
    render(<PinImage value={{ x: 0.1, y: 0.2, color: PinColor.Red }} />)
    expect(pinCalls[0].width).toBe(35)
    expect(pinCalls[0].height).toBe(35)

    pinCalls.length = 0
    ;(useDeviceSizeType as unknown as Mock).mockReturnValue(DeviceType.Desktop)
    render(<PinImage value={{ x: 0.1, y: 0.2, color: PinColor.Red }} />)
    expect(pinCalls[0].width).toBe(40)
    expect(pinCalls[0].height).toBe(40)
  })

  it('uses grab cursor when interactive pin exists and not disabled', () => {
    const { container } = render(
      <PinImage value={{ x: 0.1, y: 0.2, color: PinColor.Red }} />,
    )

    const overlay = getOverlay(container)
    expect(overlay.style.cursor).toBe('grab')
  })

  it('uses default cursor when disabled even if interactive pin exists', () => {
    const { container } = render(
      <PinImage disabled value={{ x: 0.1, y: 0.2, color: PinColor.Red }} />,
    )

    const overlay = getOverlay(container)
    expect(overlay.style.cursor).toBe('default')
  })

  it('clamps interactive value into [0..1] and syncs when value prop changes', async () => {
    const { rerender } = render(
      <PinImage value={{ x: -1, y: 2, color: PinColor.Red }} />,
    )

    expect(pinCalls.at(-1)?.x).toBe(0)
    expect(pinCalls.at(-1)?.y).toBe(1)

    rerender(<PinImage value={{ x: 0.25, y: 0.75, color: PinColor.Red }} />)

    await waitFor(() => {
      const last = pinCalls.at(-1)
      expect(last?.x).toBeCloseTo(0.25)
      expect(last?.y).toBeCloseTo(0.75)
    })
  })

  it('clamps array pins (values) into [0..1]', () => {
    render(
      <PinImage
        values={[
          { x: -0.5, y: 0.5, color: PinColor.Green },
          { x: 1.5, y: 2, color: PinColor.Red },
        ]}
      />,
    )

    expect(pinCalls.length).toBe(2)
    expect(pinCalls[0].x).toBe(0)
    expect(pinCalls[0].y).toBe(0.5)
    expect(pinCalls[1].x).toBe(1)
    expect(pinCalls[1].y).toBe(1)
  })

  it('computes toleranceSizePx based on overlay size and tolerance', async () => {
    const { container } = render(
      <PinImage
        value={{
          x: 0.1,
          y: 0.2,
          color: PinColor.Red,
          tolerance: QuestionPinTolerance.Medium,
        }}
      />,
    )

    const overlay = getOverlay(container)
    setOverlayRect(overlay, 300, 200)

    await act(async () => {
      const ro = ResizeObserverMock.instances[0]
      expect(ro).toBeTruthy()
      ro.trigger(300, 200)
    })

    const radius = QUESTION_PIN_TOLERANCE_RADIUS[QuestionPinTolerance.Medium]
    const expectedWidth = Math.max(0, radius * 300 * 2)
    const expectedHeight = Math.max(0, radius * 200 * 2)

    const interactivePin = pinCalls[pinCalls.length - 1]
    expect(interactivePin.toleranceSizePx?.width).toBeCloseTo(expectedWidth)
    expect(interactivePin.toleranceSizePx?.height).toBeCloseTo(expectedHeight)
  })

  it('uses a circular tolerance area for square overlays', async () => {
    const { container } = render(
      <PinImage
        value={{
          x: 0.5,
          y: 0.5,
          color: PinColor.Red,
          tolerance: QuestionPinTolerance.Medium,
        }}
      />,
    )

    const overlay = getOverlay(container)
    setOverlayRect(overlay, 240, 240)

    await act(async () => {
      const ro = ResizeObserverMock.instances[0]
      expect(ro).toBeTruthy()
      ro.trigger(240, 240)
    })

    const interactivePin = pinCalls[pinCalls.length - 1]
    expect(interactivePin.toleranceSizePx?.width).toBeCloseTo(
      interactivePin.toleranceSizePx?.height ?? 0,
    )
  })

  it('dragging updates cursor to grabbing on pointer down, back to grab on pointer up', async () => {
    const { container } = render(
      <PinImage value={{ x: 0.5, y: 0.5, color: PinColor.Red }} />,
    )

    const overlay = getOverlay(container)
    setOverlayRect(overlay, 200, 100)

    expect(overlay.style.cursor).toBe('grab')

    fireEvent.pointerDown(overlay, { clientX: 100, clientY: 50, pointerId: 1 })
    expect(overlay.style.cursor).toBe('grabbing')

    fireEvent.pointerUp(overlay, { pointerId: 1 })
    expect(overlay.style.cursor).toBe('grab')
  })

  it('pointercancel stops dragging and resets cursor', () => {
    const { container } = render(
      <PinImage value={{ x: 0.5, y: 0.5, color: PinColor.Red }} />,
    )

    const overlay = getOverlay(container)
    setOverlayRect(overlay, 200, 100)

    fireEvent.pointerDown(overlay, { clientX: 100, clientY: 50, pointerId: 1 })
    expect(overlay.style.cursor).toBe('grabbing')

    fireEvent.pointerCancel(overlay, { pointerId: 1 })
    expect(overlay.style.cursor).toBe('grab')
  })

  it('dragging calls onChange with clamped normalized coords and onValid(true)', () => {
    const onChange = vi.fn()
    const onValid = vi.fn()

    const initial: PinImageValue = { x: 0.5, y: 0.5, color: PinColor.Red }

    const { container } = render(
      <PinImage value={initial} onChange={onChange} onValid={onValid} />,
    )

    const overlay = getOverlay(container)
    setOverlayRect(overlay, 200, 100)

    fireEvent.pointerDown(overlay, { clientX: 100, clientY: 50, pointerId: 1 })

    fireEvent.pointerMove(overlay, { clientX: 150, clientY: 0, pointerId: 1 })
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onValid).toHaveBeenCalledTimes(1)
    expect(onValid).toHaveBeenLastCalledWith(true)

    const pos = onChange.mock.calls[0][0]
    expect(pos.x).toBeCloseTo(0.75) // (100px start) + 50px => 150px / 200px
    expect(pos.y).toBeCloseTo(0) // (50px start) - 50px => 0px / 100px

    fireEvent.pointerMove(overlay, { clientX: 999, clientY: 999, pointerId: 1 })
    const last = onChange.mock.calls[onChange.mock.calls.length - 1][0]
    expect(last.x).toBe(1)
    expect(last.y).toBe(1)
  })

  it('does not call onChange/onValid when disabled', () => {
    const onChange = vi.fn()
    const onValid = vi.fn()

    const { container } = render(
      <PinImage
        disabled
        value={{ x: 0.5, y: 0.5, color: PinColor.Red }}
        onChange={onChange}
        onValid={onValid}
      />,
    )

    const overlay = getOverlay(container)
    setOverlayRect(overlay, 200, 100)

    fireEvent.pointerDown(overlay, { clientX: 100, clientY: 50, pointerId: 1 })
    fireEvent.pointerMove(overlay, { clientX: 150, clientY: 0, pointerId: 1 })

    expect(onChange).not.toHaveBeenCalled()
    expect(onValid).not.toHaveBeenCalled()
    expect(overlay.style.cursor).toBe('default')
  })

  it('does not call onChange/onValid if pointerMove resolves to same value coords', () => {
    const onChange = vi.fn()
    const onValid = vi.fn()

    const { container } = render(
      <PinImage
        value={{ x: 0.5, y: 0.5, color: PinColor.Red }}
        onChange={onChange}
        onValid={onValid}
      />,
    )

    const overlay = getOverlay(container)
    setOverlayRect(overlay, 200, 100)

    fireEvent.pointerDown(overlay, { clientX: 100, clientY: 50, pointerId: 1 })
    fireEvent.pointerMove(overlay, { clientX: 100, clientY: 50, pointerId: 1 })

    expect(onChange).not.toHaveBeenCalled()
    expect(onValid).not.toHaveBeenCalled()
  })

  it('renders children inside the children container', () => {
    const { container, getByText } = render(
      <PinImage value={{ x: 0.2, y: 0.3, color: PinColor.Red }}>
        <div>extra</div>
      </PinImage>,
    )

    expect(getByText('extra')).toBeTruthy()

    const childrenWrapper = container.querySelector('.children')
    expect(childrenWrapper).toBeTruthy()
  })

  it('matches snapshot', () => {
    const { container } = render(
      <PinImage
        imageURL="https://example.com/image.png"
        value={{ x: 0.1, y: 0.9, tolerance: QuestionPinTolerance.Medium }}
        values={[
          { x: 0.5, y: 0.45, color: PinColor.Green },
          { x: 0.3, y: 0.25, color: PinColor.Red },
        ]}
      />,
    )

    expect(container).toMatchSnapshot()
  })
})
