import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { DeviceType } from '../../utils/device-size.types'
import { useDeviceSizeType } from '../../utils/useDeviceSizeType'

import Select from './Select'
import styles from './Select.module.scss'

vi.mock('../../utils/useDeviceSizeType', () => ({
  useDeviceSizeType: vi.fn(),
}))

const values = [
  { key: 'option-1', value: 'option-1', valueLabel: 'Option 1' },
  { key: 'option-2', value: 'option-2', valueLabel: 'Option 2' },
  { key: 'option-3', value: 'option-3', valueLabel: 'Option 3' },
]

describe('Select', () => {
  beforeEach(() => {
    vi.mocked(useDeviceSizeType).mockReturnValue(DeviceType.Desktop)
  })

  describe('rendering', () => {
    it('should render with default props', () => {
      render(<Select id="my-select" values={values} />)

      const select = screen.getByTestId('test-my-select-select')
      const container = select.parentElement

      expect(select).toHaveAttribute('id', 'my-select')
      expect(select).toHaveAttribute('name', 'my-select')

      expect(container).toHaveClass(
        styles.selectInputContainer,
        styles.surfaceBrand,
      )

      expect(container).not.toHaveClass(styles.surfaceLight)
      expect(container).not.toHaveClass(styles.sizeSmall)
      expect(container).not.toHaveClass(styles.disabled)
      expect(container).not.toHaveClass(styles.error)
    })

    it('should use the provided name', () => {
      render(<Select id="my-select" name="custom-name" values={values} />)

      expect(screen.getByTestId('test-my-select-select')).toHaveAttribute(
        'name',
        'custom-name',
      )
    })

    it('should render all values', () => {
      render(<Select id="my-select" values={values} />)

      expect(
        screen.getByRole('option', { name: 'Option 1' }),
      ).toBeInTheDocument()
      expect(
        screen.getByRole('option', { name: 'Option 2' }),
      ).toBeInTheDocument()
      expect(
        screen.getByRole('option', { name: 'Option 3' }),
      ).toBeInTheDocument()
    })
  })

  describe('surfaces', () => {
    it('should use the brand surface by default', () => {
      render(<Select id="my-select" values={values} />)

      expect(
        screen.getByTestId('test-my-select-select').parentElement,
      ).toHaveClass(styles.surfaceBrand)
    })

    it('should support the light surface', () => {
      render(<Select id="my-select" surface="light" values={values} />)

      expect(
        screen.getByTestId('test-my-select-select').parentElement,
      ).toHaveClass(styles.surfaceLight)
    })
  })

  describe('size', () => {
    it('should use normal size by default on desktop', () => {
      render(<Select id="my-select" values={values} />)

      expect(
        screen.getByTestId('test-my-select-select').parentElement,
      ).not.toHaveClass(styles.sizeSmall)
    })

    it('should support small size', () => {
      render(<Select id="my-select" size="small" values={values} />)

      expect(
        screen.getByTestId('test-my-select-select').parentElement,
      ).toHaveClass(styles.sizeSmall)
    })

    it('should force small size on mobile', () => {
      vi.mocked(useDeviceSizeType).mockReturnValue(DeviceType.Mobile)

      render(<Select id="my-select" size="normal" values={values} />)

      expect(
        screen.getByTestId('test-my-select-select').parentElement,
      ).toHaveClass(styles.sizeSmall)
    })
  })

  describe('value', () => {
    it('should render the provided value', () => {
      render(<Select id="my-select" value="option-2" values={values} />)

      expect(screen.getByTestId('test-my-select-select')).toHaveValue(
        'option-2',
      )
    })

    it('should update the value when an option changes', () => {
      render(<Select id="my-select" values={values} />)

      const select = screen.getByTestId('test-my-select-select')

      fireEvent.change(select, {
        target: { value: 'option-2' },
      })

      expect(select).toHaveValue('option-2')
    })

    it('should call onChange with the selected value', () => {
      const onChange = vi.fn()

      render(<Select id="my-select" values={values} onChange={onChange} />)

      fireEvent.change(screen.getByTestId('test-my-select-select'), {
        target: { value: 'option-2' },
      })

      expect(onChange).toHaveBeenCalledTimes(1)
      expect(onChange).toHaveBeenCalledWith('option-2')
    })

    it('should update when the value prop changes', () => {
      const { rerender } = render(
        <Select id="my-select" value="option-1" values={values} />,
      )

      expect(screen.getByTestId('test-my-select-select')).toHaveValue(
        'option-1',
      )

      rerender(<Select id="my-select" value="option-3" values={values} />)

      expect(screen.getByTestId('test-my-select-select')).toHaveValue(
        'option-3',
      )
    })
  })

  describe('state', () => {
    it('should render disabled', () => {
      render(<Select id="my-select" values={values} disabled />)

      const select = screen.getByTestId('test-my-select-select')

      expect(select).toBeDisabled()
      expect(select.parentElement).toHaveClass(styles.disabled)
    })

    it('should apply the error state when validation fails', () => {
      render(
        <Select
          id="my-select"
          required
          value=""
          values={values}
          forceValidate
        />,
      )

      expect(
        screen.getByTestId('test-my-select-select').parentElement,
      ).toHaveClass(styles.error)

      expect(screen.getByText('This field is required')).toBeInTheDocument()
    })

    it('should render a custom error message', () => {
      render(
        <Select
          id="my-select"
          values={values}
          customErrorMessage="Invalid selection"
          forceValidate
        />,
      )

      expect(screen.getByText('Invalid selection')).toBeInTheDocument()
    })
  })

  describe('validation', () => {
    it('should call onValid when validity changes', () => {
      const onValid = vi.fn()

      render(
        <Select
          id="my-select"
          required
          value=""
          values={values}
          onValid={onValid}
        />,
      )

      expect(onValid).toHaveBeenCalledWith(false)
    })

    it('should use additional validation', () => {
      const onAdditionalValidation = vi.fn(() => 'Invalid value')

      render(
        <Select
          id="my-select"
          value="option-1"
          values={values}
          forceValidate
          onAdditionalValidation={onAdditionalValidation}
        />,
      )

      expect(onAdditionalValidation).toHaveBeenCalledWith('option-1')
      expect(screen.getByText('Invalid value')).toBeInTheDocument()
    })

    it('should ignore required validation when disabled', () => {
      render(
        <Select
          id="my-select"
          required
          value=""
          values={values}
          disabled
          forceValidate
        />,
      )

      expect(
        screen.queryByText('This field is required'),
      ).not.toBeInTheDocument()
    })
  })
})
