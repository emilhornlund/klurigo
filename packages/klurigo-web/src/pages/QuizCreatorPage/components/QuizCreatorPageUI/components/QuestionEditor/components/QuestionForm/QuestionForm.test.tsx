import {
  MediaType,
  QuestionRangeAnswerMargin,
  QuestionType,
} from '@klurigo/common'
import { fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { describe, expect, it, vi } from 'vitest'

import type { ValidationResult } from '../../../../../../../../validation'
import fieldStyles from '../QuestionField/QuestionField.module.scss'

import {
  ClassicMultiChoiceQuestionForm,
  ClassicRangeQuestionForm,
  ClassicTrueFalseQuestionForm,
  ClassicTypeAnswerQuestionForm,
  ZeroToOneHundredRangeQuestionForm,
} from './index'

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

describe('QuestionForm', () => {
  it('renders a classic multi choice option question form', () => {
    const { container } = render(
      <ClassicMultiChoiceQuestionForm
        question={{
          type: QuestionType.MultiChoice,
          question: 'Who painted The Starry Night?',
          media: {
            type: MediaType.Image,
            url: 'https://i.pinimg.com/originals/a6/60/72/a66072b0e88258f2898a76c3f3c01041.jpg',
          },
          options: [
            { value: 'Vincent van Gogh', correct: true },
            { value: 'Pablo Picasso', correct: false },
            { value: 'Leonardo da Vinci', correct: false },
            { value: 'Claude Monet', correct: false },
            { value: 'Michelangelo', correct: false },
            { value: 'Rembrandt', correct: false },
          ],
          points: 1000,
          duration: 30,
        }}
        questionValidation={makeValidation()}
        onChange={() => undefined}
      />,
    )

    expect(container).toMatchSnapshot()
  })

  it('renders a classic range question form', () => {
    const onChange = vi.fn()
    render(
      <ClassicRangeQuestionForm
        question={{
          type: QuestionType.Range,
          question:
            "What percentage of the earth's surface is covered by water?",
          media: {
            type: MediaType.Image,
            url: 'https://editalconcursosbrasil.com.br/wp-content/uploads/2022/12/planeta-terra-scaled.jpg',
          },
          min: 0,
          max: 100,
          margin: QuestionRangeAnswerMargin.Medium,
          correct: 71,
          points: 1000,
          duration: 30,
        }}
        questionValidation={makeValidation()}
        onChange={onChange}
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
      { target: { value: '45' } },
    )
    fireEvent.change(screen.getByTestId('test-range-margin-select-select'), {
      target: { value: QuestionRangeAnswerMargin.Low },
    })

    expect(onChange).toHaveBeenNthCalledWith(1, 'min', 10)
    expect(onChange).toHaveBeenNthCalledWith(2, 'max', 90)
    expect(onChange).toHaveBeenNthCalledWith(3, 'correct', 45)
    expect(onChange).toHaveBeenNthCalledWith(
      4,
      'margin',
      QuestionRangeAnswerMargin.Low,
    )
  })

  it('renders a classic true or false question form', () => {
    const { container } = render(
      <ClassicTrueFalseQuestionForm
        question={{
          type: QuestionType.TrueFalse,
          question: "Rabbits can't vomit?",
          media: {
            type: MediaType.Image,
            url: 'https://assets.petco.com/petco/image/upload/f_auto,q_auto/rabbit-care-sheet',
          },
          correct: true,
          points: 1000,
          duration: 30,
        }}
        questionValidation={makeValidation()}
        onChange={() => undefined}
      />,
    )

    expect(container).toMatchSnapshot()
  })

  it('renders a classic type answer question form', () => {
    const { container } = render(
      <ClassicTypeAnswerQuestionForm
        question={{
          type: QuestionType.TypeAnswer,
          question: 'Who painted the Mono Lisa?',
          media: {
            type: MediaType.Image,
            url: 'https://i.pinimg.com/originals/a1/4a/04/a14a0433d085057106b61a5ef63c7249.jpg',
          },
          options: ['leonardo da vinci', 'leonardo', 'da vinci'],
          points: 1000,
          duration: 30,
        }}
        questionValidation={makeValidation()}
        onChange={() => undefined}
      />,
    )

    expect(container).toMatchSnapshot()
  })

  it('renders a zero to one hundred range question form', () => {
    const onChange = vi.fn()
    render(
      <ZeroToOneHundredRangeQuestionForm
        question={{
          type: QuestionType.Range,
          question:
            "What percentage of the earth's surface is covered by water?",
          media: {
            type: MediaType.Image,
            url: 'https://editalconcursosbrasil.com.br/wp-content/uploads/2022/12/planeta-terra-scaled.jpg',
          },
          correct: 71,
          duration: 30,
        }}
        questionValidation={makeValidation()}
        onChange={onChange}
      />,
    )

    const correctInput = screen.getByTestId(
      'test-range-correct-textfield-textfield',
    )
    expect(correctInput.closest(`.${fieldStyles.layoutFull}`)).toBeTruthy()
    expect(correctInput).toHaveAttribute('min', '0')
    expect(correctInput).toHaveAttribute('max', '100')
    fireEvent.change(correctInput, { target: { value: '55' } })
    expect(onChange).toHaveBeenCalledWith('correct', 55)
  })
})
