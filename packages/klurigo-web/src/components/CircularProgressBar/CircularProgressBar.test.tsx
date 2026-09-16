import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { DeviceType } from '../../utils/device-size.types'
import { useDeviceSizeType } from '../../utils/useDeviceSizeType'

import CircularProgressBar from './CircularProgressBar'
import { CircularProgressBarKind, CircularProgressBarSize } from './types'

vi.mock('../../utils/useDeviceSizeType', () => ({
  useDeviceSizeType: vi.fn(),
}))

describe('CircularProgressBar', () => {
  it('uses the device-specific diameter and stroke for every size', () => {
    const cases = [
      [DeviceType.Mobile, CircularProgressBarSize.Small, 40, 2],
      [DeviceType.Mobile, CircularProgressBarSize.Medium, 70, 6],
      [DeviceType.Mobile, CircularProgressBarSize.Large, 100, 10],
      [DeviceType.Tablet, CircularProgressBarSize.Small, 50, 4],
      [DeviceType.Tablet, CircularProgressBarSize.Medium, 80, 8],
      [DeviceType.Tablet, CircularProgressBarSize.Large, 110, 12],
      [DeviceType.Desktop, CircularProgressBarSize.Small, 60, 6],
      [DeviceType.Desktop, CircularProgressBarSize.Medium, 100, 10],
      [DeviceType.Desktop, CircularProgressBarSize.Large, 120, 14],
    ] as const

    cases.forEach(([device, size, diameter, strokeWidth]) => {
      vi.mocked(useDeviceSizeType).mockReturnValue(device)
      const { container, unmount } = render(
        <CircularProgressBar
          progress={65}
          size={size}
          kind={CircularProgressBarKind.Secondary}
          percentageColor="white"
        />,
      )

      const svg = container.querySelector('svg')
      expect(svg).toHaveAttribute('width', String(diameter))
      expect(svg?.querySelector('circle')).toHaveAttribute(
        'stroke-width',
        String(strokeWidth),
      )
      expect(svg?.querySelector('text')).toHaveClass('white')
      unmount()
    })
  })

  it('should render a CircularProgressBar with default props', async () => {
    const { container } = render(<CircularProgressBar progress={65} />)

    expect(container).toMatchSnapshot()
  })

  it('should render a CircularProgressBar with size small props', async () => {
    const { container } = render(
      <CircularProgressBar
        progress={65}
        size={CircularProgressBarSize.Small}
      />,
    )

    expect(container).toMatchSnapshot()
  })

  it('should render a CircularProgressBar with size medium props', async () => {
    const { container } = render(
      <CircularProgressBar
        progress={65}
        size={CircularProgressBarSize.Medium}
      />,
    )

    expect(container).toMatchSnapshot()
  })

  it('should render a CircularProgressBar with size large props', async () => {
    const { container } = render(
      <CircularProgressBar
        progress={65}
        size={CircularProgressBarSize.Large}
      />,
    )

    expect(container).toMatchSnapshot()
  })

  it('should render a CircularProgressBar with kind default props', async () => {
    const { container } = render(
      <CircularProgressBar
        progress={65}
        kind={CircularProgressBarKind.Default}
      />,
    )

    expect(container).toMatchSnapshot()
  })

  it('should render a CircularProgressBar with kind correct props', async () => {
    const { container } = render(
      <CircularProgressBar
        progress={65}
        kind={CircularProgressBarKind.Correct}
      />,
    )

    expect(container).toMatchSnapshot()
  })

  it('should render a CircularProgressBar without progress text', async () => {
    const { container } = render(
      <CircularProgressBar progress={65} showPercentage={false} />,
    )

    expect(container).toMatchSnapshot()
  })
})
