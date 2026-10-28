import { QuestionType } from '@klurigo/common'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import AnswerRange from './AnswerRange'

vi.mock('../../../../../components', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../../../../components')>()
  const TextField = ({
    id,
    value,
    onChange,
    onValid,
    min,
    max,
    disabled,
  }: {
    id: string
    value: number | string
    onChange?: (value: number) => void
    onValid?: (valid: boolean) => void
    min?: number
    max?: number
    disabled?: boolean
  }) => (
    <div>
      <input
        data-testid="tf-input"
        id={id}
        type="number"
        min={min}
        max={max}
        value={String(value ?? '')}
        disabled={disabled}
        onChange={(e) => {
          const newValue = Number((e.target as HTMLInputElement).value)
          onChange?.(newValue)
          onValid?.(
            Number.isFinite(newValue) &&
              (min === undefined || newValue >= min) &&
              (max === undefined || newValue <= max),
          )
        }}
      />
      <button
        type="button"
        data-testid="tf-valid"
        onClick={() => onValid?.(true)}>
        make-valid
      </button>
      <button
        type="button"
        data-testid="tf-invalid"
        onClick={() => onValid?.(false)}>
        make-invalid
      </button>
    </div>
  )
  return { ...actual, TextField }
})

describe('AnswerRange', () => {
  it('renders interactive mode with initial midpoint and disabled submit', () => {
    const { container } = render(
      <AnswerRange
        min={0}
        max={100}
        step={5}
        interactive
        loading={false}
        onSubmit={vi.fn()}
      />,
    )
    const slider = screen.getByRole('slider') as HTMLInputElement
    expect(slider.value).toBe('50')
    const submit = screen.getByRole('button', { name: /submit/i })
    expect(submit).toBeDisabled()
    expect(container).toMatchSnapshot()
  })

  it('enables submit when slider value is valid and submits that value', () => {
    const onSubmit = vi.fn()
    render(
      <AnswerRange
        min={10}
        max={60}
        step={5}
        interactive
        loading={false}
        onSubmit={onSubmit}
      />,
    )

    const slider = screen.getByRole('slider') as HTMLInputElement
    fireEvent.change(slider, { target: { value: '25' } })
    expect(screen.getByTestId('tf-input')).toHaveValue(25)

    const submit = screen.getByRole('button', { name: /submit/i })
    expect(submit).toBeEnabled()

    fireEvent.click(submit)
    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit).toHaveBeenCalledWith(25)
  })

  it('updates via TextField, toggles validity, and submits new value', () => {
    const onSubmit = vi.fn()
    render(
      <AnswerRange
        min={0}
        max={10}
        step={1}
        interactive
        loading={false}
        onSubmit={onSubmit}
      />,
    )

    fireEvent.click(screen.getByTestId('tf-valid'))

    const tf = screen.getByTestId('tf-input')
    fireEvent.change(tf, { target: { value: '7' } })

    const submit = screen.getByRole('button', { name: /submit/i })
    expect(submit).toBeEnabled()

    fireEvent.click(submit)
    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit).toHaveBeenLastCalledWith(7)
  })

  it('keeps the response slider at integer precision independently from scoring step', () => {
    render(
      <AnswerRange
        min={3}
        max={33}
        step={3}
        interactive
        loading={false}
        onSubmit={vi.fn()}
      />,
    )
    const slider = screen.getByRole('slider') as HTMLInputElement
    expect(slider).toHaveAttribute('min', '3')
    expect(slider).toHaveAttribute('max', '33')
    expect(slider).toHaveAttribute('step', '1')
  })

  it('keeps an off-step number input value aligned with the slider and submitted answer', () => {
    const onSubmit = vi.fn()
    render(
      <AnswerRange
        min={10}
        max={90}
        step={2}
        interactive
        loading={false}
        onSubmit={onSubmit}
      />,
    )

    fireEvent.change(screen.getByTestId('tf-input'), {
      target: { value: '67' },
    })

    const slider = screen.getByRole('slider') as HTMLInputElement
    expect(slider).toHaveAttribute('step', '1')
    expect(slider).toHaveValue('67')
    expect(screen.getByTestId('tf-input')).toHaveValue(67)

    fireEvent.click(screen.getByRole('button', { name: /submit/i }))
    expect(onSubmit).toHaveBeenCalledWith(67)
  })

  it.each([
    { label: 'near the minimum', value: '11' },
    { label: 'in the interior', value: '67' },
    { label: 'near the maximum', value: '89' },
  ])('synchronizes off-step values $label from both controls', ({ value }) => {
    render(
      <AnswerRange
        min={10}
        max={90}
        step={2}
        interactive
        loading={false}
        onSubmit={vi.fn()}
      />,
    )

    fireEvent.change(screen.getByTestId('tf-input'), {
      target: { value },
    })
    expect(screen.getByRole('slider')).toHaveValue(value)
    expect(screen.getByTestId('tf-input')).toHaveValue(Number(value))

    fireEvent.change(screen.getByRole('slider'), { target: { value: '67' } })
    expect(screen.getByRole('slider')).toHaveValue('67')
    expect(screen.getByTestId('tf-input')).toHaveValue(67)
  })

  it.each([
    { label: 'minimum', value: '0' },
    { label: 'maximum', value: '100' },
    { label: 'intermediate', value: '55' },
  ])(
    'synchronizes the $label slider value with the number input',
    ({ value }) => {
      render(
        <AnswerRange
          min={0}
          max={100}
          step={5}
          interactive
          loading={false}
          onSubmit={vi.fn()}
        />,
      )

      fireEvent.change(screen.getByRole('slider'), { target: { value } })

      expect(screen.getByRole('slider')).toHaveValue(value)
      expect(screen.getByTestId('tf-input')).toHaveValue(Number(value))
    },
  )

  it('disables the slider, number input, and submit button while loading', () => {
    render(
      <AnswerRange
        min={0}
        max={100}
        step={1}
        interactive
        loading
        onSubmit={vi.fn()}
      />,
    )

    expect(screen.getByRole('slider')).toBeDisabled()
    expect(screen.getByTestId('tf-input')).toBeDisabled()
    expect(screen.getByRole('button', { name: /submit/i })).toBeDisabled()
  })

  it('preserves and disables the submitted answer without a submit button', () => {
    render(
      <AnswerRange
        min={0}
        max={100}
        step={1}
        interactive
        loading={false}
        submittedAnswer={{ type: QuestionType.Range, value: 40 }}
        onSubmit={vi.fn()}
      />,
    )

    expect(screen.getByRole('slider')).toBeDisabled()
    expect(screen.getByTestId('tf-input')).toBeDisabled()
    expect(
      screen.queryByRole('button', { name: /submit/i }),
    ).not.toBeInTheDocument()
    expect(screen.getByRole('slider')).toHaveValue('40')
  })

  it('shows the submitted number when the answer event arrives', () => {
    const { rerender } = render(
      <AnswerRange
        min={0}
        max={100}
        step={5}
        interactive
        loading={false}
        onSubmit={vi.fn()}
      />,
    )

    rerender(
      <AnswerRange
        min={0}
        max={100}
        step={5}
        interactive
        loading={false}
        onSubmit={vi.fn()}
        submittedAnswer={{ type: QuestionType.Range, value: 25 }}
      />,
    )

    expect(screen.getByRole('slider')).toHaveValue('25')
    expect(screen.getByTestId('tf-input')).toHaveValue(25)
  })

  it('renders non-interactive mode with info message and no form', () => {
    const { container } = render(
      <AnswerRange
        min={5}
        max={15}
        step={1}
        interactive={false}
        loading={false}
        onSubmit={vi.fn()}
      />,
    )
    expect(
      screen.getByText(/Pick an answer between 5 and 15 on your screen/i),
    ).toBeInTheDocument()
    expect(screen.queryByRole('slider')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /submit/i }),
    ).not.toBeInTheDocument()
    expect(container).toMatchSnapshot()
  })
})
