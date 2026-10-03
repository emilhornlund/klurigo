import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import type { ValidationResult } from '../../../../../../../../../validation'
import { answerOptionStyles as styles } from '../shared'

import TrueFalseAnswerEditor from './TrueFalseAnswerEditor'

type AnyValidation = ValidationResult<Record<string, unknown>>

function makeValidation(
  errors: Array<{ path: string; message: string }> = [],
): AnyValidation {
  return {
    valid: errors.length === 0,
    errors: errors.map((e) => ({
      path: e.path,
      message: e.message,
    })),
  } as unknown as AnyValidation
}

function lastCallArg<T>(
  mock: { calls: unknown[][] },
  argIndex = 0,
): T | undefined {
  const calls = mock.calls
  if (!calls.length) return undefined
  return calls[calls.length - 1][argIndex] as T
}

function getTrueRadio(): HTMLInputElement {
  return screen.getByRole('radio', {
    name: 'Mark True as correct',
  })
}

function getFalseRadio(): HTMLInputElement {
  return screen.getByRole('radio', {
    name: 'Mark False as correct',
  })
}

describe('TrueFalseAnswerEditor', () => {
  it('renders two options with labels True and False', () => {
    const onChange = vi.fn()

    render(
      <TrueFalseAnswerEditor
        onChange={onChange}
        validation={makeValidation()}
        value={undefined}
      />,
    )

    expect(screen.getByDisplayValue('True')).toBeInTheDocument()
    expect(screen.getByDisplayValue('False')).toBeInTheDocument()
    expect(
      screen.getByDisplayValue('True').closest(`.${styles.optionsContainer}`),
    ).toBeInTheDocument()
  })

  it('initially has no selection when value is undefined', () => {
    render(
      <TrueFalseAnswerEditor
        onChange={vi.fn()}
        validation={makeValidation()}
        value={undefined}
      />,
    )

    expect(getTrueRadio()).not.toBeChecked()
    expect(getFalseRadio()).not.toBeChecked()
  })

  it('selecting True emits onChange(true)', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(
      <TrueFalseAnswerEditor
        onChange={onChange}
        validation={makeValidation()}
        value={undefined}
      />,
    )

    await user.click(getTrueRadio())

    const last = lastCallArg<boolean | undefined>(onChange.mock)
    expect(last).toBe(true)
  })

  it('selecting False after True emits onChange(false) and unselects True', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(
      <TrueFalseAnswerEditor
        onChange={onChange}
        validation={makeValidation()}
        value={undefined}
      />,
    )

    await user.click(getTrueRadio())
    await user.click(getFalseRadio())

    const last = lastCallArg<boolean | undefined>(onChange.mock)

    expect(last).toBe(false)
    expect(getTrueRadio()).not.toBeChecked()
    expect(getFalseRadio()).toBeChecked()
  })

  it('uses mutually exclusive radio controls for the correct answer', () => {
    render(
      <TrueFalseAnswerEditor
        onChange={vi.fn()}
        validation={makeValidation()}
        value={true}
      />,
    )

    expect(getTrueRadio()).toHaveAttribute('type', 'radio')
    expect(getFalseRadio()).toHaveAttribute('type', 'radio')
    expect(getTrueRadio().name).toBe(getFalseRadio().name)
    expect(getTrueRadio()).toBeChecked()
    expect(getFalseRadio()).not.toBeChecked()
  })

  it('reflects external value changes (rerender): value=true selects True, value=false selects False', () => {
    const onChange = vi.fn()

    const { rerender } = render(
      <TrueFalseAnswerEditor
        onChange={onChange}
        validation={makeValidation()}
        value={undefined}
      />,
    )

    expect(getTrueRadio()).not.toBeChecked()
    expect(getFalseRadio()).not.toBeChecked()

    rerender(
      <TrueFalseAnswerEditor
        onChange={onChange}
        validation={makeValidation()}
        value={true}
      />,
    )

    expect(getTrueRadio()).toBeChecked()
    expect(getFalseRadio()).not.toBeChecked()

    rerender(
      <TrueFalseAnswerEditor
        onChange={onChange}
        validation={makeValidation()}
        value={false}
      />,
    )

    expect(getTrueRadio()).not.toBeChecked()
    expect(getFalseRadio()).toBeChecked()
  })

  it('shows a clear correct-answer error when validation fails', () => {
    const { rerender } = render(
      <TrueFalseAnswerEditor
        onChange={vi.fn()}
        validation={makeValidation([{ path: 'correct', message: 'Required.' }])}
        value={undefined}
      />,
    )

    expect(
      screen.queryByText('Select either True or False as the correct answer.'),
    ).not.toBeInTheDocument()

    rerender(
      <TrueFalseAnswerEditor
        onChange={vi.fn()}
        validation={makeValidation([{ path: 'correct', message: 'Required.' }])}
        value={undefined}
        validationRevealed
      />,
    )
    expect(
      screen.getByText('Select either True or False as the correct answer.'),
    ).toBeInTheDocument()

    expect(screen.queryByText('Required.')).not.toBeInTheDocument()
  })

  it('shows the correct-answer error when validation is revealed without a selection', () => {
    render(
      <TrueFalseAnswerEditor
        onChange={vi.fn()}
        validation={makeValidation()}
        value={undefined}
        validationRevealed
      />,
    )

    expect(
      screen.getByText('Select either True or False as the correct answer.'),
    ).toBeInTheDocument()
  })

  it('always explains the correct-answer requirement without showing an initial error', () => {
    render(
      <TrueFalseAnswerEditor
        onChange={vi.fn()}
        validation={makeValidation([{ path: 'correct', message: 'Required.' }])}
        value={undefined}
      />,
    )

    expect(
      screen.getByText('Select whether the statement is true or false.'),
    ).toBeInTheDocument()
    expect(
      screen.queryByText('Select either True or False as the correct answer.'),
    ).not.toBeInTheDocument()
  })

  it('hides the correct-answer error when an answer is selected', async () => {
    const user = userEvent.setup()

    const { rerender } = render(
      <TrueFalseAnswerEditor
        onChange={vi.fn()}
        validation={makeValidation([{ path: 'correct', message: 'Required.' }])}
        value={undefined}
        validationRevealed
      />,
    )

    expect(
      screen.getByText('Select either True or False as the correct answer.'),
    ).toBeInTheDocument()

    await user.click(getTrueRadio())

    rerender(
      <TrueFalseAnswerEditor
        onChange={vi.fn()}
        validation={makeValidation()}
        value={true}
      />,
    )

    expect(
      screen.queryByText('Select either True or False as the correct answer.'),
    ).not.toBeInTheDocument()
  })
})
