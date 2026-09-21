import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { DeviceType } from '../../utils/device-size.types'
import { useDeviceSizeType } from '../../utils/useDeviceSizeType'
import inputErrorStyles from '../InputError/InputError.module.scss'

import TextField from './TextField'
import styles from './TextField.module.scss'

vi.mock('../../utils/useDeviceSizeType', () => ({
  useDeviceSizeType: vi.fn(),
}))

describe('TextField', () => {
  beforeEach(() => {
    vi.mocked(useDeviceSizeType).mockReturnValue(DeviceType.Desktop)
  })

  describe('rendering', () => {
    it('should render with default props', () => {
      render(
        <TextField id="my-text-field" type="text" placeholder="Placeholder" />,
      )

      const input = screen.getByTestId('test-my-text-field-textfield')
      const container = input.parentElement

      expect(input).toHaveAttribute('id', 'my-text-field')
      expect(input).toHaveAttribute('name', 'my-text-field')
      expect(input).toHaveAttribute('type', 'text')
      expect(input).toHaveAttribute('placeholder', 'Placeholder')

      expect(container).toHaveClass(
        styles.textFieldInputContainer,
        styles.surfaceBrand,
      )

      expect(container).not.toHaveClass(styles.surfaceLight)
      expect(container).not.toHaveClass(styles.sizeSmall)
    })

    it('should use the provided name', () => {
      render(<TextField id="my-text-field" name="custom-name" type="text" />)

      expect(
        screen.getByTestId('test-my-text-field-textfield'),
      ).toHaveAttribute('name', 'custom-name')
    })

    it.each(['text', 'number', 'password'] as const)(
      'should render type="%s"',
      (type) => {
        render(<TextField id={`textfield-${type}`} type={type} />)

        expect(
          screen.getByTestId(`test-textfield-${type}-textfield`),
        ).toHaveAttribute('type', type)
      },
    )
  })

  describe('surfaces', () => {
    it('should use the brand surface by default', () => {
      render(<TextField id="my-text-field" type="text" />)

      expect(
        screen.getByTestId('test-my-text-field-textfield').parentElement,
      ).toHaveClass(styles.surfaceBrand)
    })

    it('should support the light surface', () => {
      render(<TextField id="my-text-field" type="text" surface="light" />)

      expect(
        screen.getByTestId('test-my-text-field-textfield').parentElement,
      ).toHaveClass(styles.surfaceLight)
    })
  })

  describe('size', () => {
    it('should use normal size by default on desktop', () => {
      render(<TextField id="my-text-field" type="text" />)

      expect(
        screen.getByTestId('test-my-text-field-textfield').parentElement,
      ).not.toHaveClass(styles.sizeSmall)
    })

    it('should support small size', () => {
      render(<TextField id="my-text-field" type="text" size="small" />)

      expect(
        screen.getByTestId('test-my-text-field-textfield').parentElement,
      ).toHaveClass(styles.sizeSmall)
    })

    it('should use normal size by default on mobile', () => {
      vi.mocked(useDeviceSizeType).mockReturnValue(DeviceType.Mobile)

      render(<TextField id="my-text-field" type="text" />)

      expect(
        screen.getByTestId('test-my-text-field-textfield').parentElement,
      ).not.toHaveClass(styles.sizeSmall)
    })

    it.each([DeviceType.Mobile, DeviceType.Tablet, DeviceType.Desktop])(
      'should respect normal size on %s',
      (deviceType) => {
        vi.mocked(useDeviceSizeType).mockReturnValue(deviceType)

        render(<TextField id="my-text-field" type="text" size="normal" />)

        expect(
          screen.getByTestId('test-my-text-field-textfield').parentElement,
        ).not.toHaveClass(styles.sizeSmall)
      },
    )

    it.each([DeviceType.Mobile, DeviceType.Tablet, DeviceType.Desktop])(
      'should respect small size on %s',
      (deviceType) => {
        vi.mocked(useDeviceSizeType).mockReturnValue(deviceType)

        render(<TextField id="my-text-field" type="text" size="small" />)

        expect(
          screen.getByTestId('test-my-text-field-textfield').parentElement,
        ).toHaveClass(styles.sizeSmall)
      },
    )

    it('should pass the requested size to InputError on mobile', () => {
      vi.mocked(useDeviceSizeType).mockReturnValue(DeviceType.Mobile)

      render(
        <TextField
          id="my-text-field"
          type="text"
          size="normal"
          customErrorMessage="Invalid value"
          forceValidate
        />,
      )

      expect(screen.getByText('Invalid value')).not.toHaveClass(
        inputErrorStyles.sizeSmall,
      )
    })
  })

  describe('value', () => {
    it('should render the provided value', () => {
      render(<TextField id="my-text-field" type="text" value="Hello" />)

      expect(screen.getByTestId('test-my-text-field-textfield')).toHaveValue(
        'Hello',
      )
    })

    it('should call onChange with a string value', () => {
      const onChange = vi.fn()

      render(<TextField id="my-text-field" type="text" onChange={onChange} />)

      fireEvent.change(screen.getByTestId('test-my-text-field-textfield'), {
        target: { value: 'Hello' },
      })

      expect(onChange).toHaveBeenCalledWith('Hello')
    })

    it('should call onChange with a numeric value for number inputs', () => {
      const onChange = vi.fn()

      render(<TextField id="my-text-field" type="number" onChange={onChange} />)

      fireEvent.change(screen.getByTestId('test-my-text-field-textfield'), {
        target: { value: '42' },
      })

      expect(onChange).toHaveBeenCalledWith(42)
    })

    it('should call onChange with undefined for an empty number input', () => {
      const onChange = vi.fn()

      render(
        <TextField
          id="my-text-field"
          type="number"
          value={42}
          onChange={onChange}
        />,
      )

      fireEvent.change(screen.getByTestId('test-my-text-field-textfield'), {
        target: { value: '' },
      })

      expect(onChange).toHaveBeenCalledWith(undefined)
    })
  })

  describe('state', () => {
    it('should render disabled', () => {
      render(<TextField id="my-text-field" type="text" disabled />)

      const input = screen.getByTestId('test-my-text-field-textfield')

      expect(input).toBeDisabled()
      expect(input.parentElement).toHaveClass(styles.disabled)
    })

    it('should render read-only', () => {
      render(<TextField id="my-text-field" type="text" readOnly />)

      expect(
        screen.getByTestId('test-my-text-field-textfield'),
      ).toHaveAttribute('readonly')
    })

    it('should apply the error state when validation fails', () => {
      render(
        <TextField id="my-text-field" type="text" required forceValidate />,
      )

      expect(
        screen.getByTestId('test-my-text-field-textfield').parentElement,
      ).toHaveClass(styles.error)
    })

    it('should render a custom error message', () => {
      render(
        <TextField
          id="my-text-field"
          type="text"
          customErrorMessage="Custom error"
          forceValidate
        />,
      )

      expect(screen.getByText('Custom error')).toBeInTheDocument()
    })

    it('should hide the error message when showErrorMessage is false', () => {
      render(
        <TextField
          id="my-text-field"
          type="text"
          customErrorMessage="Custom error"
          forceValidate
          showErrorMessage={false}
        />,
      )

      expect(screen.queryByText('Custom error')).not.toBeInTheDocument()
      expect(
        screen.getByTestId('test-my-text-field-textfield').parentElement,
      ).toHaveClass(styles.error)
    })
  })

  describe('checkbox', () => {
    it('should render the checkbox when checked is provided', () => {
      render(<TextField id="my-text-field" type="text" checked={false} />)

      expect(
        document.getElementById('my-text-field-checkbox'),
      ).toBeInTheDocument()
    })

    it('should render the check icon when checked', () => {
      render(<TextField id="my-text-field" type="text" checked />)

      const checkbox = document.getElementById(
        'my-text-field-checkbox',
      ) as HTMLInputElement

      expect(checkbox).toBeChecked()
      expect(
        checkbox.parentElement?.querySelector(`.${styles.checkboxIcon}`),
      ).toBeInTheDocument()
    })

    it('should call onCheck when the checkbox changes', () => {
      const onCheck = vi.fn()

      render(
        <TextField
          id="my-text-field"
          type="text"
          checked={false}
          onCheck={onCheck}
        />,
      )

      fireEvent.click(document.getElementById('my-text-field-checkbox')!)

      expect(onCheck).toHaveBeenCalledWith(true)
    })

    it('should disable the checkbox together with the text field', () => {
      render(<TextField id="my-text-field" type="text" checked disabled />)

      expect(document.getElementById('my-text-field-checkbox')).toBeDisabled()
    })
  })

  describe('validation callbacks', () => {
    it('should call onValid when validity changes', () => {
      const onValid = vi.fn()

      render(
        <TextField
          id="my-text-field"
          type="text"
          required
          value=""
          onValid={onValid}
        />,
      )

      expect(onValid).toHaveBeenCalledWith(false)
    })

    it('should use additional validation', () => {
      const onAdditionalValidation = vi.fn(() => 'Invalid value')

      render(
        <TextField
          id="my-text-field"
          type="text"
          value="value"
          forceValidate
          onAdditionalValidation={onAdditionalValidation}
        />,
      )

      expect(onAdditionalValidation).toHaveBeenCalledWith('value')
      expect(screen.getByText('Invalid value')).toBeInTheDocument()
    })
  })
})
