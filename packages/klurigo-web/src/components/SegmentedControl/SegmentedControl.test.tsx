import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { DeviceType } from '../../utils/device-size.types'
import { useDeviceSizeType } from '../../utils/useDeviceSizeType'

import SegmentedControl from './SegmentedControl'
import styles from './SegmentedControl.module.scss'

vi.mock('../../utils/useDeviceSizeType', () => ({
  useDeviceSizeType: vi.fn(),
}))

const values = [
  { key: 'first', value: 'first', valueLabel: 'First' },
  { key: 'second', value: 'second', valueLabel: 'Second' },
  { key: 'third', value: 'third', valueLabel: 'Third' },
]

describe('SegmentedControl', () => {
  beforeEach(() => {
    vi.mocked(useDeviceSizeType).mockReturnValue(DeviceType.Desktop)
  })

  describe('rendering', () => {
    it('should render all values', () => {
      render(<SegmentedControl id="my-segmented-control" values={values} />)

      expect(screen.getByText('First')).toBeInTheDocument()
      expect(screen.getByText('Second')).toBeInTheDocument()
      expect(screen.getByText('Third')).toBeInTheDocument()
    })

    it('should render button identifiers', () => {
      render(<SegmentedControl id="my-segmented-control" values={values} />)

      const button = screen.getByTestId(
        'test-my-segmented-control_first-segmented-control',
      )

      expect(button).toHaveAttribute('id', 'my-segmented-control_first')

      expect(button).toHaveAttribute('name', 'my-segmented-control_first')

      expect(button).toHaveAttribute('type', 'button')
    })

    it('should render no items when values are undefined', () => {
      const { container } = render(
        <SegmentedControl id="my-segmented-control" />,
      )

      expect(container.querySelectorAll('button')).toHaveLength(0)
    })
  })

  describe('surfaces', () => {
    it('should use the brand surface by default', () => {
      render(<SegmentedControl id="my-segmented-control" values={values} />)

      expect(
        screen.getByTestId('test-my-segmented-control_first-segmented-control')
          .parentElement,
      ).toHaveClass(styles.surfaceBrand)
    })

    it('should support the light surface', () => {
      render(
        <SegmentedControl
          id="my-segmented-control"
          surface="light"
          values={values}
        />,
      )

      expect(
        screen.getByTestId('test-my-segmented-control_first-segmented-control')
          .parentElement,
      ).toHaveClass(styles.surfaceLight)
    })
  })

  describe('selection', () => {
    it('should make the first item active when no value is provided', () => {
      render(<SegmentedControl id="my-segmented-control" values={values} />)

      expect(
        screen.getByTestId('test-my-segmented-control_first-segmented-control')
          .parentElement,
      ).toHaveClass(styles.active)

      expect(
        screen.getByTestId('test-my-segmented-control_second-segmented-control')
          .parentElement,
      ).toHaveClass(styles.inactive)
    })

    it('should mark the provided value as active', () => {
      render(
        <SegmentedControl
          id="my-segmented-control"
          value="second"
          values={values}
        />,
      )

      expect(
        screen.getByTestId('test-my-segmented-control_second-segmented-control')
          .parentElement,
      ).toHaveClass(styles.active)

      expect(
        screen.getByTestId('test-my-segmented-control_first-segmented-control')
          .parentElement,
      ).toHaveClass(styles.inactive)
    })
  })

  describe('size', () => {
    it('should use normal size by default on desktop', () => {
      render(<SegmentedControl id="my-segmented-control" values={values} />)

      expect(
        screen.getByTestId('test-my-segmented-control_first-segmented-control')
          .parentElement,
      ).toHaveClass(styles.sizeNormal)
    })

    it('should support small size', () => {
      render(
        <SegmentedControl
          id="my-segmented-control"
          size="small"
          values={values}
        />,
      )

      expect(
        screen.getByTestId('test-my-segmented-control_first-segmented-control')
          .parentElement,
      ).toHaveClass(styles.sizeSmall)
    })

    it('should force small size on mobile', () => {
      vi.mocked(useDeviceSizeType).mockReturnValue(DeviceType.Mobile)

      render(
        <SegmentedControl
          id="my-segmented-control"
          size="normal"
          values={values}
        />,
      )

      expect(
        screen.getByTestId('test-my-segmented-control_first-segmented-control')
          .parentElement,
      ).toHaveClass(styles.sizeSmall)
    })
  })

  describe('events', () => {
    it('should call onChange with the clicked value', () => {
      const onChange = vi.fn()

      render(
        <SegmentedControl
          id="my-segmented-control"
          values={values}
          onChange={onChange}
        />,
      )

      fireEvent.click(
        screen.getByTestId(
          'test-my-segmented-control_second-segmented-control',
        ),
      )

      expect(onChange).toHaveBeenCalledTimes(1)
      expect(onChange).toHaveBeenCalledWith('second')
    })
  })
})
