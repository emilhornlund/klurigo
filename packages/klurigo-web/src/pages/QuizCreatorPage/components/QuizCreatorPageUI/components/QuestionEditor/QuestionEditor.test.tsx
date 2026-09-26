import {
  GameMode,
  MediaType,
  QuestionRangeAnswerMargin,
  QuestionType,
} from '@klurigo/common'
import { render } from '@testing-library/react'
import '@testing-library/jest-dom'
import { describe, expect, it } from 'vitest'

import type { ValidationResult } from '../../../../../../validation'

import QuestionEditor from './QuestionEditor'

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

describe('QuestionEditor', () => {
  it('renders a classic multi choice option question editor', () => {
    const { container } = render(
      <QuestionEditor
        mode={GameMode.Classic}
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
        onQuestionValueChange={() => undefined}
      />,
    )

    expect(container).toMatchSnapshot()
  })

  it('renders a classic range question editor', () => {
    const { container } = render(
      <QuestionEditor
        mode={GameMode.Classic}
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
        onQuestionValueChange={() => undefined}
      />,
    )

    expect(container).toMatchSnapshot()
  })

  it('renders a classic true or false question editor', () => {
    const { container } = render(
      <QuestionEditor
        mode={GameMode.Classic}
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
        onQuestionValueChange={() => undefined}
      />,
    )

    expect(container).toMatchSnapshot()
  })

  it('renders a classic type answer question editor', () => {
    const { container } = render(
      <QuestionEditor
        mode={GameMode.Classic}
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
        onQuestionValueChange={() => undefined}
      />,
    )

    expect(container).toMatchSnapshot()
  })

  it('renders a zero to one hundred range question editor', () => {
    const { container } = render(
      <QuestionEditor
        mode={GameMode.ZeroToOneHundred}
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
        onQuestionValueChange={() => undefined}
      />,
    )

    expect(container).toMatchSnapshot()
  })
})
