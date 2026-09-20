import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import Textarea from './Textarea'
import styles from './Textarea.module.scss'

describe('Textarea', () => {
  describe('rendering', () => {
    it('should render with default props', () => {
      render(<Textarea id="my-textarea" placeholder="Placeholder" />)

      const textarea = screen.getByTestId('test-my-textarea-textarea')
      const container = textarea.parentElement

      expect(textarea).toHaveAttribute('id', 'my-textarea')
      expect(textarea).toHaveAttribute('name', 'my-textarea')
      expect(textarea).toHaveAttribute('placeholder', 'Placeholder')

      expect(container).toHaveClass(
        styles.textareaInputContainer,
        styles.surfaceBrand,
      )

      expect(container).not.toHaveClass(styles.surfaceLight)
      expect(container).not.toHaveClass(styles.code)
      expect(container).not.toHaveClass(styles.disabled)
      expect(container).not.toHaveClass(styles.error)
    })

    it('should use the provided name', () => {
      render(<Textarea id="my-textarea" name="custom-name" />)

      expect(screen.getByTestId('test-my-textarea-textarea')).toHaveAttribute(
        'name',
        'custom-name',
      )
    })

    it('should render the provided value', () => {
      render(<Textarea id="my-textarea" value="Some value" />)

      expect(screen.getByTestId('test-my-textarea-textarea')).toHaveValue(
        'Some value',
      )
    })
  })

  describe('surfaces', () => {
    it('should use the brand surface by default', () => {
      render(<Textarea id="my-textarea" />)

      expect(
        screen.getByTestId('test-my-textarea-textarea').parentElement,
      ).toHaveClass(styles.surfaceBrand)
    })

    it('should support the light surface', () => {
      render(<Textarea id="my-textarea" surface="light" />)

      expect(
        screen.getByTestId('test-my-textarea-textarea').parentElement,
      ).toHaveClass(styles.surfaceLight)
    })
  })

  describe('types', () => {
    it('should use normal text styling by default', () => {
      render(<Textarea id="my-textarea" />)

      expect(
        screen.getByTestId('test-my-textarea-textarea').parentElement,
      ).not.toHaveClass(styles.code)
    })

    it('should apply code styling', () => {
      render(<Textarea id="my-textarea" type="code" />)

      expect(
        screen.getByTestId('test-my-textarea-textarea').parentElement,
      ).toHaveClass(styles.code)
    })
  })

  describe('value', () => {
    it('should update the value when text changes', () => {
      render(<Textarea id="my-textarea" />)

      const textarea = screen.getByTestId('test-my-textarea-textarea')

      fireEvent.change(textarea, {
        target: { value: 'Some value' },
      })

      expect(textarea).toHaveValue('Some value')
    })

    it('should call onChange when text changes', () => {
      const onChange = vi.fn()

      render(<Textarea id="my-textarea" onChange={onChange} />)

      fireEvent.change(screen.getByTestId('test-my-textarea-textarea'), {
        target: { value: 'Some value' },
      })

      expect(onChange).toHaveBeenCalledTimes(1)
      expect(onChange).toHaveBeenCalledWith('Some value')
    })

    it('should update when the value prop changes', () => {
      const { rerender } = render(
        <Textarea id="my-textarea" value="First value" />,
      )

      expect(screen.getByTestId('test-my-textarea-textarea')).toHaveValue(
        'First value',
      )

      rerender(<Textarea id="my-textarea" value="Second value" />)

      expect(screen.getByTestId('test-my-textarea-textarea')).toHaveValue(
        'Second value',
      )
    })
  })

  describe('state', () => {
    it('should render disabled', () => {
      render(<Textarea id="my-textarea" disabled />)

      const textarea = screen.getByTestId('test-my-textarea-textarea')

      expect(textarea).toBeDisabled()
      expect(textarea.parentElement).toHaveClass(styles.disabled)
    })

    it('should apply the error state when validation fails', () => {
      render(<Textarea id="my-textarea" required forceValidate />)

      expect(
        screen.getByTestId('test-my-textarea-textarea').parentElement,
      ).toHaveClass(styles.error)
    })

    it('should render a custom error message', () => {
      render(
        <Textarea
          id="my-textarea"
          customErrorMessage="Custom error"
          forceValidate
        />,
      )

      expect(screen.getByText('Custom error')).toBeInTheDocument()
    })
  })

  describe('validation', () => {
    it('should call onValid when validity changes', () => {
      const onValid = vi.fn()

      render(<Textarea id="my-textarea" required value="" onValid={onValid} />)

      expect(onValid).toHaveBeenCalledWith(false)
    })

    it('should use additional validation', () => {
      const onAdditionalValidation = vi.fn(() => 'Invalid value')

      render(
        <Textarea
          id="my-textarea"
          value="Some value"
          forceValidate
          onAdditionalValidation={onAdditionalValidation}
        />,
      )

      expect(onAdditionalValidation).toHaveBeenCalledWith('Some value')
      expect(screen.getByText('Invalid value')).toBeInTheDocument()
    })
  })
})
