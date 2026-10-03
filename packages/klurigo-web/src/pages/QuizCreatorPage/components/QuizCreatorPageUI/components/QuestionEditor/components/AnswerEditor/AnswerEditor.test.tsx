import { GameMode, QuestionPinTolerance, QuestionType } from '@klurigo/common'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { QuizQuestionValidationResult } from '../../../../../../utils/QuestionDataSource'

import AnswerEditor from './AnswerEditor'

const validation = {
  valid: true,
  errors: [],
} as unknown as QuizQuestionValidationResult

describe('AnswerEditor', () => {
  it('edits multi-choice answers through the public editor', () => {
    const onChange = vi.fn()
    render(
      <AnswerEditor
        type={QuestionType.MultiChoice}
        values={[
          { value: 'Stockholm', correct: true },
          { value: 'Paris', correct: false },
          { value: 'Copenhagen', correct: false },
          { value: 'London', correct: false },
          { value: 'Oslo', correct: false },
          { value: 'Berlin', correct: false },
        ]}
        validation={validation}
        onChange={onChange}
      />,
    )

    const inputs = screen.getAllByRole('textbox')
    expect(inputs).toHaveLength(6)
    fireEvent.change(inputs[0], { target: { value: 'Updated answer' } })
    expect(onChange).toHaveBeenCalledWith(
      expect.arrayContaining([{ value: 'Updated answer', correct: true }]),
    )
  })

  it('shows the selected true/false answer', () => {
    render(
      <AnswerEditor
        type={QuestionType.TrueFalse}
        value={true}
        validation={validation}
        onChange={vi.fn()}
      />,
    )
    expect(
      screen.getByRole('radio', { name: 'Mark True as correct' }),
    ).toBeChecked()
  })

  it('shows the accepted typed answers', () => {
    render(
      <AnswerEditor
        type={QuestionType.TypeAnswer}
        values={['first', 'second', 'third', 'fourth']}
        validation={validation}
        onChange={vi.fn()}
      />,
    )
    expect(screen.getAllByRole('textbox')).toHaveLength(4)
  })

  it('edits puzzle values through the public editor', () => {
    const onChange = vi.fn()
    render(
      <AnswerEditor
        type={QuestionType.Puzzle}
        value={['First', 'Second']}
        validation={validation}
        onChange={onChange}
      />,
    )

    fireEvent.change(screen.getByPlaceholderText('Item 1'), {
      target: { value: 'Updated first' },
    })

    expect(onChange).toHaveBeenCalledWith(['Updated first', 'Second', ''])
  })

  it('edits PIN tolerance alongside the image', () => {
    const onToleranceChange = vi.fn()
    render(
      <AnswerEditor
        type={QuestionType.Pin}
        tolerance={QuestionPinTolerance.Medium}
        validation={validation}
        onImageUrlChange={vi.fn()}
        onPositionChange={vi.fn()}
        onToleranceChange={onToleranceChange}
      />,
    )
    fireEvent.change(screen.getByTestId('test-pin-tolerance-select-select'), {
      target: { value: QuestionPinTolerance.High },
    })
    expect(onToleranceChange).toHaveBeenCalledWith(QuestionPinTolerance.High)
  })

  it('edits the zero-to-one-hundred range answer', () => {
    const onChange = vi.fn()
    render(
      <AnswerEditor
        type={QuestionType.Range}
        mode={GameMode.ZeroToOneHundred}
        value={75}
        min={0}
        max={100}
        layout="full"
        validation={validation}
        onChange={onChange}
      />,
    )
    fireEvent.change(
      screen.getByTestId('test-range-correct-textfield-textfield'),
      {
        target: { value: '45' },
      },
    )
    expect(onChange).toHaveBeenCalledWith(45)
  })

  it('dispatches classic Range to the range preview and controls', () => {
    render(
      <AnswerEditor
        type={QuestionType.Range}
        mode={GameMode.Classic}
        question={{ min: 0, max: 100, correct: 50 }}
        validation={validation}
        onMinChange={vi.fn()}
        onMaxChange={vi.fn()}
        onCorrectChange={vi.fn()}
        onMarginChange={vi.fn()}
      />,
    )

    expect(screen.getByLabelText('Accepted range preview')).toBeInTheDocument()
    expect(
      screen.getByText('Answers from 40 to 60 will be accepted.'),
    ).toBeInTheDocument()
  })
})
