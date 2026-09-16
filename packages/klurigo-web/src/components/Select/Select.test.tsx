import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import Select from './Select'

describe('Select', () => {
  it('should render a Select with default props', async () => {
    const { container } = render(<Select id="my-select" />)

    expect(container).toMatchSnapshot()
  })

  it('should fire Select when Select option', async () => {
    const onChange = vi.fn()

    const { container } = render(
      <Select
        id="my-select"
        values={[
          { key: 'option-1', value: 'option-1', valueLabel: 'Option 1' },
          { key: 'option-2', value: 'option-2', valueLabel: 'Option 2' },
          { key: 'option-3', value: 'option-3', valueLabel: 'Option 3' },
        ]}
        onChange={onChange}
      />,
    )

    const selectElement = screen.getByTestId(
      'test-my-select-select',
    ) as HTMLSelectElement
    fireEvent.focus(selectElement)
    fireEvent.change(selectElement, { target: { value: 'option-1' } })

    expect(selectElement.value).toBe('option-1')

    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith('option-1')

    expect(container).toMatchSnapshot()
  })

  it('should render a Select with disabled props', async () => {
    const { container } = render(<Select id="my-select" disabled />)

    expect(container).toMatchSnapshot()
  })

  it('reports required and custom validation errors after focus leaves the field', () => {
    const onValid = vi.fn()
    const { rerender } = render(
      <Select
        id="required-select"
        required
        forceValidate
        onValid={onValid}
        values={[{ key: 'one', value: 'one', valueLabel: 'One' }]}
      />,
    )

    expect(screen.getByText('This field is required')).toBeInTheDocument()
    expect(onValid).toHaveBeenCalledWith(false)

    rerender(
      <Select
        id="required-select"
        required="Pick one"
        value="one"
        onValid={onValid}
        values={[{ key: 'one', value: 'one', valueLabel: 'One' }]}
      />,
    )
    const select = screen.getByTestId('test-required-select-select')
    fireEvent.focus(select)
    fireEvent.blur(select)
    expect(screen.queryByText('Pick one')).not.toBeInTheDocument()

    rerender(
      <Select
        id="required-select"
        value="one"
        customErrorMessage="Invalid selection"
        forceValidate
        values={[{ key: 'one', value: 'one', valueLabel: 'One' }]}
      />,
    )
    expect(screen.getByText('Invalid selection')).toBeInTheDocument()
  })

  it('runs additional validation and suppresses required validation when disabled', () => {
    const onValid = vi.fn()
    const additionalValidation = vi.fn((value: string) =>
      value === 'bad' ? 'Bad selection' : true,
    )
    const { rerender } = render(
      <Select
        id="validated-select"
        value="bad"
        onAdditionalValidation={additionalValidation}
        forceValidate
        onValid={onValid}
        values={[{ key: 'bad', value: 'bad', valueLabel: 'Bad' }]}
      />,
    )

    expect(screen.getByText('Bad selection')).toBeInTheDocument()
    expect(additionalValidation).toHaveBeenCalledWith('bad')
    expect(onValid).toHaveBeenCalledWith(false)

    rerender(
      <Select
        id="validated-select"
        required
        disabled
        forceValidate
        values={[{ key: 'bad', value: 'bad', valueLabel: 'Bad' }]}
      />,
    )
    expect(screen.queryByText('This field is required')).not.toBeInTheDocument()
  })
})
