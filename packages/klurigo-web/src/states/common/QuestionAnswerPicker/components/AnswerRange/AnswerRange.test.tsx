import { QuestionType } from '@klurigo/common'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import AnswerRange from './AnswerRange'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
vi.mock('../../../../../components', async (orig: any) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const actual: any = await orig()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const TextField = ({ id, value, onChange, onValid, min, max }: any) => (
    <div>
      <input
        data-testid="tf-input"
        id={id}
        type="number"
        min={min}
        max={max}
        value={String(value ?? '')}
        onChange={(e) =>
          onChange?.(Number((e.target as HTMLInputElement).value))
        }
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

  it('reflects slider attributes from props', () => {
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
    expect(slider).toHaveAttribute('step', '3')
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
