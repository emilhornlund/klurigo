import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import Pin from './Pin'
import { getPinColorColor } from './pin-utils'
import { PinColor } from './types'

vi.mock('./PinImage.module.scss', () => ({
  default: {
    pin: 'pin',
    tolerance: 'tolerance',
    dot: 'dot',
  },
}))

vi.mock('@fortawesome/react-fontawesome', () => ({
  __esModule: true,
  FontAwesomeIcon: ({ icon, color }: { icon: unknown; color?: string }) => (
    <i data-testid="fa" data-color={color} data-icon={String(!!icon)} />
  ),
}))

vi.mock('@fortawesome/free-solid-svg-icons', () => ({
  __esModule: true,
  faLocationDot: { iconName: 'location-dot' },
}))

vi.mock('./pin-utils', async (importOriginal) => {
  const actual = (await importOriginal()) as object
  return {
    ...actual,
    getPinColorColor: vi.fn((c: PinColor) => `mock-color:${c}`),
  }
})

describe('Pin', () => {
  it('should match snapshot with default props (no tolerance)', () => {
    const { container } = render(
      <Pin width={40} height={40} x={0.5} y={0.25} />,
    )

    expect(container).toMatchSnapshot()
  })

  it('should match snapshot with tolerance area', () => {
    const { container } = render(
      <Pin
        width={30}
        height={30}
        x={0.1}
        y={0.9}
        toleranceSizePx={{ width: 120, height: 90 }}
        color={PinColor.Green}
      />,
    )

    expect(container).toMatchSnapshot()
  })

  it('should match snapshot when disabled (cursor default)', () => {
    const { container } = render(
      <Pin width={35} height={35} x={0.2} y={0.3} disabled />,
    )

    expect(container).toMatchSnapshot()
  })

  it('positions pin using left/top percentages and sets size', () => {
    const { container } = render(
      <Pin width={50} height={60} x={0.12} y={0.34} />,
    )

    const pin = container.querySelector('.pin') as HTMLDivElement
    expect(pin).toBeTruthy()

    expect(pin.style.width).toBe('50px')
    expect(pin.style.height).toBe('60px')
    expect(pin.style.left).toBe('12%')
    expect(pin.style.top).toBe('34%')
  })

  it('renders tolerance area only when toleranceSizePx is provided and applies sizing', () => {
    const { container, rerender } = render(
      <Pin width={40} height={40} x={0.5} y={0.5} />,
    )

    expect(container.querySelector('.tolerance')).toBeNull()

    rerender(
      <Pin
        width={40}
        height={40}
        x={0.5}
        y={0.5}
        toleranceSizePx={{ width: 88, height: 66 }}
      />,
    )

    const tolerance = container.querySelector('.tolerance') as HTMLDivElement
    expect(tolerance).toBeTruthy()
    expect(tolerance.style.width).toBe('88px')
    expect(tolerance.style.height).toBe('66px')
  })

  it('sets icon color based on getPinColorColor (default Blue)', () => {
    render(<Pin width={40} height={40} x={0.5} y={0.5} />)

    expect(getPinColorColor).toHaveBeenCalled()
    expect(getPinColorColor).toHaveBeenLastCalledWith(PinColor.Blue)
  })

  it('sets icon color based on provided color', () => {
    const { getByTestId } = render(
      <Pin width={40} height={40} x={0.5} y={0.5} color={PinColor.Red} />,
    )

    expect(getPinColorColor).toHaveBeenCalledWith(PinColor.Red)
    expect(getByTestId('fa').getAttribute('data-color')).toBe(
      `mock-color:${PinColor.Red}`,
    )
  })

  it('applies cursor default style only when disabled', () => {
    const { container, rerender } = render(
      <Pin width={40} height={40} x={0.5} y={0.5} />,
    )

    const pin = container.querySelector('.pin') as HTMLDivElement
    expect(pin.style.cursor).toBe('')

    rerender(<Pin width={40} height={40} x={0.5} y={0.5} disabled />)
    expect(pin.style.cursor).toBe('default')
  })
})
