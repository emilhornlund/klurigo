import {
  QuestionPinTolerance,
  QuestionRangeAnswerMargin,
  QuestionType,
} from '@klurigo/common'
import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import type { QuizQuestionValidationResult } from '../../../../../../utils/QuestionDataSource'

import {
  ClassicPinQuestionForm,
  ClassicPuzzleQuestionForm,
  ClassicRangeQuestionForm,
} from './QuestionForm'

type MockQuestionFieldProps = {
  type: string
  footer?: string
  children?: ReactNode
}

vi.mock('../QuestionField', () => ({
  QuestionFieldType: {
    CommonDuration: 'DURATION',
    CommonInfo: 'INFO',
    CommonMedia: 'MEDIA',
    CommonPoints: 'POINTS',
    CommonQuestion: 'QUESTION',
    MultiChoiceOptions: 'MULTI_CHOICE_OPTIONS',
    Pin: 'PIN',
    PinTolerance: 'PIN_TOLERANCE',
    PuzzleValues: 'PUZZLE_VALUES',
    RangeCorrect: 'CORRECT',
    RangeMargin: 'MARGIN',
    RangeMax: 'MAX',
    RangeMin: 'MIN',
    TrueFalseOptions: 'TRUE_FALSE_OPTIONS',
    TypeAnswerOptions: 'TYPE_ANSWER_OPTIONS',
  },
  default: ({ type, footer }: MockQuestionFieldProps) => (
    <div data-testid={`field-${type}`}>{footer}</div>
  ),
}))

const validation = {
  valid: true,
  errors: [],
} as unknown as QuizQuestionValidationResult

describe('QuestionForm behavior', () => {
  it('does not show range guidance while required range values are incomplete', () => {
    const { rerender } = render(
      <ClassicRangeQuestionForm
        question={{
          type: QuestionType.Range,
          correct: undefined,
          min: 0,
          max: 100,
        }}
        questionValidation={validation}
        onChange={vi.fn()}
      />,
    )

    expect(screen.getByTestId('field-MARGIN')).toBeEmptyDOMElement()

    rerender(
      <ClassicRangeQuestionForm
        question={{
          type: QuestionType.Range,
          correct: 50,
          min: undefined,
          max: 100,
        }}
        questionValidation={validation}
        onChange={vi.fn()}
      />,
    )

    expect(screen.getByTestId('field-MARGIN')).toBeEmptyDOMElement()
  })

  it('shows the exact and full-range guidance for the corresponding margins', () => {
    const { rerender } = render(
      <ClassicRangeQuestionForm
        question={{
          type: QuestionType.Range,
          correct: 42,
          min: 0,
          max: 100,
          margin: QuestionRangeAnswerMargin.None,
        }}
        questionValidation={validation}
        onChange={vi.fn()}
      />,
    )

    expect(screen.getByTestId('field-MARGIN')).toHaveTextContent(
      'The correct answer must be exactly 42.',
    )

    rerender(
      <ClassicRangeQuestionForm
        question={{
          type: QuestionType.Range,
          correct: 42,
          min: 0,
          max: 100,
          margin: QuestionRangeAnswerMargin.Maximum,
        }}
        questionValidation={validation}
        onChange={vi.fn()}
      />,
    )

    expect(screen.getByTestId('field-MARGIN')).toHaveTextContent(
      'All answers within the range 0–100 will be accepted as correct.',
    )
  })

  it('renders the Pin and Puzzle-specific fields', () => {
    const { rerender } = render(
      <ClassicPinQuestionForm
        question={{
          type: QuestionType.Pin,
          imageURL: 'https://example.com/map.jpg',
          positionX: 0.5,
          positionY: 0.5,
          tolerance: QuestionPinTolerance.Medium,
        }}
        questionValidation={validation}
        onChange={vi.fn()}
      />,
    )

    expect(screen.getByTestId('field-PIN')).toBeInTheDocument()
    expect(screen.getByTestId('field-PIN_TOLERANCE')).toBeInTheDocument()

    rerender(
      <ClassicPuzzleQuestionForm
        question={{
          type: QuestionType.Puzzle,
          values: ['one', 'two'],
        }}
        questionValidation={validation}
        onChange={vi.fn()}
      />,
    )

    expect(screen.getByTestId('field-PUZZLE_VALUES')).toBeInTheDocument()
  })
})
