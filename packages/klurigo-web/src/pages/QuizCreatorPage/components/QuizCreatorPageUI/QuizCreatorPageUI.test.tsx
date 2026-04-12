import {
  GameMode,
  MediaType,
  QuestionRangeAnswerMargin,
  QuestionType,
} from '@klurigo/common'
import { fireEvent, render } from '@testing-library/react'
import '@testing-library/jest-dom'
import type { ComponentProps } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import type { ValidationResult } from '../../../../validation'

import QuizCreatorPageUI from './QuizCreatorPageUI'

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

const renderQuizCreatorPageUI = (
  props: Partial<ComponentProps<typeof QuizCreatorPageUI>> = {},
) =>
  render(
    <MemoryRouter>
      <QuizCreatorPageUI
        gameMode={undefined}
        onSelectGameMode={() => undefined}
        quizSettings={{}}
        quizSettingsValidation={makeValidation()}
        onQuizSettingsValueChange={() => undefined}
        questions={[]}
        questionValidations={[]}
        selectedQuestion={undefined}
        selectedQuestionIndex={0}
        canSaveQuiz={false}
        onSetQuestions={() => undefined}
        onSelectedQuestionIndex={() => undefined}
        onAddQuestion={() => undefined}
        onQuestionValueChange={() => undefined}
        onDropQuestionIndex={() => undefined}
        onDuplicateQuestionIndex={() => undefined}
        onDeleteQuestionIndex={() => undefined}
        onReplaceQuestion={() => undefined}
        onSaveQuiz={() => undefined}
        onExit={() => undefined}
        {...props}
      />
    </MemoryRouter>,
  )

describe('QuizCreatorPageUI', () => {
  it('renders QuizCreatorPageUI without mode', () => {
    const { container } = render(
      <MemoryRouter>
        <QuizCreatorPageUI
          gameMode={undefined}
          onSelectGameMode={() => undefined}
          quizSettings={{}}
          quizSettingsValidation={makeValidation()}
          onQuizSettingsValueChange={() => undefined}
          questions={[]}
          questionValidations={[]}
          selectedQuestion={undefined}
          selectedQuestionIndex={0}
          canSaveQuiz={false}
          onSetQuestions={() => undefined}
          onSelectedQuestionIndex={() => undefined}
          onAddQuestion={() => undefined}
          onQuestionValueChange={() => undefined}
          onDropQuestionIndex={() => undefined}
          onDuplicateQuestionIndex={() => undefined}
          onDeleteQuestionIndex={() => undefined}
          onReplaceQuestion={() => undefined}
          onSaveQuiz={() => undefined}
          onExit={() => undefined}
        />
      </MemoryRouter>,
    )

    expect(container).toMatchSnapshot()
  })

  it('renders QuizCreatorPageUI for classic mode without questions', () => {
    const { container } = render(
      <MemoryRouter>
        <QuizCreatorPageUI
          gameMode={GameMode.Classic}
          onSelectGameMode={() => undefined}
          quizSettings={{}}
          quizSettingsValidation={makeValidation()}
          onQuizSettingsValueChange={() => undefined}
          questions={[]}
          questionValidations={[]}
          selectedQuestion={undefined}
          selectedQuestionIndex={0}
          canSaveQuiz={false}
          onSetQuestions={() => undefined}
          onSelectedQuestionIndex={() => undefined}
          onAddQuestion={() => undefined}
          onQuestionValueChange={() => undefined}
          onDropQuestionIndex={() => undefined}
          onDuplicateQuestionIndex={() => undefined}
          onDeleteQuestionIndex={() => undefined}
          onReplaceQuestion={() => undefined}
          onSaveQuiz={() => undefined}
          onExit={() => undefined}
        />
      </MemoryRouter>,
    )

    expect(container).toMatchSnapshot()
  })

  it('renders QuizCreatorPageUI for classic mode', () => {
    const { container } = render(
      <MemoryRouter>
        <QuizCreatorPageUI
          gameMode={GameMode.Classic}
          onSelectGameMode={() => undefined}
          quizSettings={{}}
          quizSettingsValidation={makeValidation()}
          onQuizSettingsValueChange={() => undefined}
          questions={[
            {
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
            },
            {
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
            },
            {
              type: QuestionType.TrueFalse,
              question: "Rabbits can't vomit?",
              media: {
                type: MediaType.Image,
                url: 'https://assets.petco.com/petco/image/upload/f_auto,q_auto/rabbit-care-sheet',
              },
              correct: true,
              points: 1000,
              duration: 30,
            },
            {
              type: QuestionType.TypeAnswer,
              question: 'Who painted the Mono Lisa?',
              media: {
                type: MediaType.Image,
                url: 'https://i.pinimg.com/originals/a1/4a/04/a14a0433d085057106b61a5ef63c7249.jpg',
              },
              options: ['leonardo da vinci', 'leonardo', 'da vinci'],
              points: 1000,
            },
          ]}
          questionValidations={[
            makeValidation(),
            makeValidation(),
            makeValidation(),
            makeValidation(),
          ]}
          selectedQuestion={{
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
          selectedQuestionIndex={0}
          canSaveQuiz={false}
          onSetQuestions={() => undefined}
          onSelectedQuestionIndex={() => undefined}
          onAddQuestion={() => undefined}
          onQuestionValueChange={() => undefined}
          onDropQuestionIndex={() => undefined}
          onDuplicateQuestionIndex={() => undefined}
          onDeleteQuestionIndex={() => undefined}
          onReplaceQuestion={() => undefined}
          onSaveQuiz={() => undefined}
          onExit={() => undefined}
        />
      </MemoryRouter>,
    )

    expect(container).toMatchSnapshot()
  })

  it('renders QuizCreatorPageUI for zero to one hundred mode without questions', () => {
    const { container } = render(
      <MemoryRouter>
        <QuizCreatorPageUI
          gameMode={GameMode.ZeroToOneHundred}
          onSelectGameMode={() => undefined}
          quizSettings={{}}
          quizSettingsValidation={makeValidation()}
          onQuizSettingsValueChange={() => undefined}
          questions={[]}
          questionValidations={[]}
          selectedQuestion={undefined}
          selectedQuestionIndex={0}
          canSaveQuiz={false}
          onSetQuestions={() => undefined}
          onSelectedQuestionIndex={() => undefined}
          onAddQuestion={() => undefined}
          onQuestionValueChange={() => undefined}
          onDropQuestionIndex={() => undefined}
          onDuplicateQuestionIndex={() => undefined}
          onDeleteQuestionIndex={() => undefined}
          onReplaceQuestion={() => undefined}
          onSaveQuiz={() => undefined}
          onExit={() => undefined}
        />
      </MemoryRouter>,
    )

    expect(container).toMatchSnapshot()
  })

  it('renders QuizCreatorPageUI for zero to one hundred mode', () => {
    const { container } = render(
      <MemoryRouter>
        <QuizCreatorPageUI
          gameMode={GameMode.ZeroToOneHundred}
          onSelectGameMode={() => undefined}
          quizSettings={{}}
          quizSettingsValidation={makeValidation()}
          onQuizSettingsValueChange={() => undefined}
          questions={[
            {
              type: QuestionType.Range,
              question:
                "What percentage of the earth's surface is covered by water?",
              media: {
                type: MediaType.Image,
                url: 'https://editalconcursosbrasil.com.br/wp-content/uploads/2022/12/planeta-terra-scaled.jpg',
              },
              correct: 71,
              duration: 30,
            },
          ]}
          questionValidations={[]}
          selectedQuestion={undefined}
          selectedQuestionIndex={0}
          canSaveQuiz={false}
          onSetQuestions={() => undefined}
          onSelectedQuestionIndex={() => undefined}
          onAddQuestion={() => undefined}
          onQuestionValueChange={() => undefined}
          onDropQuestionIndex={() => undefined}
          onDuplicateQuestionIndex={() => undefined}
          onDeleteQuestionIndex={() => undefined}
          onReplaceQuestion={() => undefined}
          onSaveQuiz={() => undefined}
          onExit={() => undefined}
        />
      </MemoryRouter>,
    )

    expect(container).toMatchSnapshot()
  })

  it('disables the save button when canSaveQuiz is false', () => {
    const { container } = renderQuizCreatorPageUI({ canSaveQuiz: false })

    expect(container.querySelector('#save-button')).toBeDisabled()
  })

  it('enables the save button when canSaveQuiz is true', () => {
    const { container } = renderQuizCreatorPageUI({ canSaveQuiz: true })

    expect(container.querySelector('#save-button')).toBeEnabled()
  })

  it('calls onExit when the exit button is clicked', () => {
    const onExit = vi.fn()

    const { container } = renderQuizCreatorPageUI({ onExit })

    fireEvent.click(
      container.querySelector('#exit-button') as HTMLButtonElement,
    )

    expect(onExit).toHaveBeenCalledTimes(1)
  })
})
