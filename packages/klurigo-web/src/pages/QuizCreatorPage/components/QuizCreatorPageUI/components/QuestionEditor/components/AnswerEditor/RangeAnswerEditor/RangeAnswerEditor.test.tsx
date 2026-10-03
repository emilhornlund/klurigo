import { QuestionRangeAnswerMargin, QuestionType } from '@klurigo/common'
import { fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { describe, expect, it, vi } from 'vitest'

import type { QuizQuestionValidationResult } from '../../../../../../../utils/QuestionDataSource'

import RangeAnswerEditor from './RangeAnswerEditor'

const validation = {
  valid: true,
  errors: [],
} as unknown as QuizQuestionValidationResult

const makeValidation = (errors: Array<{ path: string; message: string }>) =>
  ({
    valid: errors.length === 0,
    errors,
  }) as unknown as QuizQuestionValidationResult

describe('RangeAnswerEditor', () => {
  it('renders and updates the range values', () => {
    const onMinChange = vi.fn()
    const onMaxChange = vi.fn()
    const onCorrectChange = vi.fn()
    const onMarginChange = vi.fn()

    render(
      <RangeAnswerEditor
        question={{
          type: QuestionType.Range,
          min: 0,
          max: 100,
          correct: 50,
          margin: QuestionRangeAnswerMargin.Medium,
        }}
        validation={validation}
        onMinChange={onMinChange}
        onMaxChange={onMaxChange}
        onCorrectChange={onCorrectChange}
        onMarginChange={onMarginChange}
      />,
    )

    fireEvent.change(screen.getByTestId('test-range-min-textfield-textfield'), {
      target: { value: '10' },
    })

    fireEvent.change(screen.getByTestId('test-range-max-textfield-textfield'), {
      target: { value: '90' },
    })

    fireEvent.change(
      screen.getByTestId('test-range-correct-textfield-textfield'),
      {
        target: { value: '45' },
      },
    )

    fireEvent.change(screen.getByTestId('test-range-margin-select-select'), {
      target: { value: QuestionRangeAnswerMargin.Low },
    })

    expect(onMinChange).toHaveBeenCalledWith(10)
    expect(onMaxChange).toHaveBeenCalledWith(90)
    expect(onCorrectChange).toHaveBeenCalledWith(45)
    expect(onMarginChange).toHaveBeenCalledWith(QuestionRangeAnswerMargin.Low)
  })

  it('keeps defaults quiet, reveals only interacted range errors, and reveals remaining errors on request', () => {
    const invalidValidation = makeValidation([
      { path: 'min', message: 'Minimum error' },
      { path: 'max', message: 'Maximum error' },
      { path: 'correct', message: 'Correct error' },
      { path: 'margin', message: 'Margin error' },
    ])
    const { rerender } = render(
      <RangeAnswerEditor
        question={{
          type: QuestionType.Range,
          min: -5,
          max: 100,
          correct: 150,
          margin: QuestionRangeAnswerMargin.Medium,
        }}
        validation={invalidValidation}
        validationRevealed={false}
        onMinChange={vi.fn()}
        onMaxChange={vi.fn()}
        onCorrectChange={vi.fn()}
        onMarginChange={vi.fn()}
      />,
    )

    expect(screen.queryByText('Minimum error')).not.toBeInTheDocument()
    expect(screen.queryByText('Maximum error')).not.toBeInTheDocument()
    expect(screen.queryByText('Correct error')).not.toBeInTheDocument()
    expect(screen.queryByText('Margin error')).not.toBeInTheDocument()
    fireEvent.focus(screen.getByTestId('test-range-min-textfield-textfield'))
    fireEvent.blur(screen.getByTestId('test-range-min-textfield-textfield'))
    expect(screen.getByText('Minimum error')).toBeInTheDocument()
    expect(screen.queryByText('Maximum error')).not.toBeInTheDocument()
    expect(screen.queryByText('Correct error')).not.toBeInTheDocument()

    rerender(
      <RangeAnswerEditor
        question={{
          type: QuestionType.Range,
          min: -5,
          max: 100,
          correct: 150,
          margin: QuestionRangeAnswerMargin.Medium,
        }}
        validation={invalidValidation}
        validationRevealed
        onMinChange={vi.fn()}
        onMaxChange={vi.fn()}
        onCorrectChange={vi.fn()}
        onMarginChange={vi.fn()}
      />,
    )

    expect(screen.getByText('Minimum error')).toBeInTheDocument()
    expect(screen.getByText('Maximum error')).toBeInTheDocument()
    expect(screen.getByText('Correct error')).toBeInTheDocument()
    expect(screen.getByText('Margin error')).toBeInTheDocument()
  })

  it('shows maximum, correct-answer, and margin errors through ordinary interaction', () => {
    const invalidValidation = makeValidation([
      { path: 'max', message: 'Maximum error' },
      { path: 'correct', message: 'Correct error' },
      { path: 'margin', message: 'Margin error' },
    ])
    render(
      <RangeAnswerEditor
        question={{
          type: QuestionType.Range,
          min: 0,
          max: -1,
          correct: 150,
          margin: QuestionRangeAnswerMargin.Medium,
        }}
        validation={invalidValidation}
        validationRevealed={false}
        onMinChange={vi.fn()}
        onMaxChange={vi.fn()}
        onCorrectChange={vi.fn()}
        onMarginChange={vi.fn()}
      />,
    )

    const maximum = screen.getByTestId('test-range-max-textfield-textfield')
    const correct = screen.getByTestId('test-range-correct-textfield-textfield')
    const margin = screen.getByTestId('test-range-margin-select-select')
    fireEvent.focus(maximum)
    fireEvent.blur(maximum)
    fireEvent.focus(correct)
    fireEvent.blur(correct)
    fireEvent.focus(margin)
    fireEvent.blur(margin)

    expect(screen.getByText('Maximum error')).toBeInTheDocument()
    expect(screen.getByText('Correct error')).toBeInTheDocument()
    expect(screen.getByText('Margin error')).toBeInTheDocument()
  })

  it('shows the calculated accepted range', () => {
    render(
      <RangeAnswerEditor
        question={{
          type: QuestionType.Range,
          min: 0,
          max: 100,
          correct: 50,
          margin: QuestionRangeAnswerMargin.Medium,
        }}
        validation={validation}
        onMinChange={vi.fn()}
        onMaxChange={vi.fn()}
        onCorrectChange={vi.fn()}
        onMarginChange={vi.fn()}
      />,
    )

    expect(
      screen.getByText('Answers from 40 to 60 will be accepted.'),
    ).toBeInTheDocument()
    expect(screen.getByText('Accepted range')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Set the available range, target answer and accepted margin.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByText('Minimum value')).toBeInTheDocument()
    expect(screen.getByText('Maximum value')).toBeInTheDocument()
    expect(screen.getByText('Correct answer *')).toBeInTheDocument()
    expect(screen.getByText('Accepted margin')).toBeInTheDocument()
  })

  it('does not show accepted range guidance for incomplete values', () => {
    render(
      <RangeAnswerEditor
        question={{
          type: QuestionType.Range,
          min: 0,
          max: 100,
          correct: undefined,
          margin: QuestionRangeAnswerMargin.Medium,
        }}
        validation={validation}
        onMinChange={vi.fn()}
        onMaxChange={vi.fn()}
        onCorrectChange={vi.fn()}
        onMarginChange={vi.fn()}
      />,
    )

    expect(
      screen.queryByLabelText('Accepted range preview'),
    ).not.toBeInTheDocument()
  })

  it('shows exact-answer guidance when no margin is allowed', () => {
    render(
      <RangeAnswerEditor
        question={{
          type: QuestionType.Range,
          min: 0,
          max: 100,
          correct: 42,
          margin: QuestionRangeAnswerMargin.None,
        }}
        validation={validation}
        onMinChange={vi.fn()}
        onMaxChange={vi.fn()}
        onCorrectChange={vi.fn()}
        onMarginChange={vi.fn()}
      />,
    )

    expect(screen.getByText('Only 42 will be accepted.')).toBeInTheDocument()
  })

  it('shows full-range guidance for the maximum margin', () => {
    render(
      <RangeAnswerEditor
        question={{
          type: QuestionType.Range,
          min: 0,
          max: 100,
          correct: 42,
          margin: QuestionRangeAnswerMargin.Maximum,
        }}
        validation={validation}
        onMinChange={vi.fn()}
        onMaxChange={vi.fn()}
        onCorrectChange={vi.fn()}
        onMarginChange={vi.fn()}
      />,
    )

    expect(
      screen.getByText('Any answer from 0 to 100 will be accepted.'),
    ).toBeInTheDocument()
  })

  it('shows the correct value on the range preview', () => {
    render(
      <RangeAnswerEditor
        question={{
          type: QuestionType.Range,
          min: 0,
          max: 100,
          correct: 50,
          margin: QuestionRangeAnswerMargin.Medium,
        }}
        validation={validation}
        onMinChange={vi.fn()}
        onMaxChange={vi.fn()}
        onCorrectChange={vi.fn()}
        onMarginChange={vi.fn()}
      />,
    )

    const preview = screen.getByLabelText('Accepted range preview')

    expect(preview).toHaveTextContent('0')
    expect(preview).toHaveTextContent('50')
    expect(preview).toHaveTextContent('100')

    expect(screen.getByTestId('accepted-range')).toHaveStyle({
      left: '40%',
      width: '20%',
    })
    expect(screen.getByTestId('correct-marker')).toHaveStyle({
      left: '50%',
    })
  })

  it('does not show the range preview when maximum is not greater than minimum', () => {
    render(
      <RangeAnswerEditor
        question={{
          type: QuestionType.Range,
          min: 100,
          max: 100,
          correct: 100,
          margin: QuestionRangeAnswerMargin.Medium,
        }}
        validation={validation}
        onMinChange={vi.fn()}
        onMaxChange={vi.fn()}
        onCorrectChange={vi.fn()}
        onMarginChange={vi.fn()}
      />,
    )

    expect(
      screen.queryByLabelText('Accepted range preview'),
    ).not.toBeInTheDocument()
  })
})
