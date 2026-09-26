import {
  GameMode,
  MediaType,
  QuestionRangeAnswerMargin,
  QuestionType,
} from '@klurigo/common'
import { fireEvent, render, screen, within } from '@testing-library/react'
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

  it('uses the full-bleed page layout', () => {
    const { container } = renderQuizCreatorPageUI({
      gameMode: GameMode.Classic,
    })

    expect(container.querySelector('.content')).toHaveClass('fullBleed')
    expect(container.querySelector('.header')).toHaveClass('fullBleed')
  })

  it('places the existing question controls in the three workspace regions', () => {
    const onAddQuestion = vi.fn()
    const onQuestionValueChange = vi.fn()
    const { container } = renderQuizCreatorPageUI({
      gameMode: GameMode.Classic,
      questions: [
        { type: QuestionType.MultiChoice, question: 'First question' },
        { type: QuestionType.MultiChoice, question: 'Second question' },
      ],
      questionValidations: [makeValidation(), makeValidation()],
      selectedQuestion: {
        type: QuestionType.MultiChoice,
        question: 'First question',
      },
      onAddQuestion,
      onQuestionValueChange,
    })

    const workspace = screen.getByTestId('editor-workspace')
    const navigator = within(workspace).getByRole('navigation', {
      name: 'Questions',
    })
    const editor = within(workspace).getByRole('main', {
      name: 'Question editor',
    })
    const settings = within(workspace).getByRole('complementary', {
      name: 'Question settings',
    })

    expect(Array.from(workspace.children)).toEqual([
      navigator,
      editor,
      settings,
    ])
    fireEvent.click(
      within(navigator).getByRole('button', { name: 'Add question' }),
    )
    expect(onAddQuestion).toHaveBeenCalledOnce()
    fireEvent.change(editor.querySelector('#question-text-textfield')!, {
      target: { value: 'Edited question' },
    })
    expect(onQuestionValueChange).toHaveBeenCalledWith(
      'question',
      'Edited question',
    )
    expect(container.querySelector('#save-button')).toBeInTheDocument()
  })

  it('selects classic question types from settings using the existing replacement action and validation', () => {
    const onReplaceQuestion = vi.fn()
    const question = {
      type: QuestionType.MultiChoice,
      question: 'First question',
    }
    renderQuizCreatorPageUI({
      gameMode: GameMode.Classic,
      questions: [question, { ...question, question: 'Second question' }],
      questionValidations: [
        makeValidation([{ path: 'type', message: 'Invalid question type' }]),
        makeValidation(),
      ],
      selectedQuestion: question,
      selectedQuestionIndex: 0,
      onReplaceQuestion,
    })

    const settings = screen.getByRole('complementary', {
      name: 'Question settings',
    })
    const editor = screen.getByRole('main', { name: 'Question editor' })
    const select = within(settings).getByTestId(
      'test-question-type-select-select',
    )
    expect(select).toHaveValue(QuestionType.MultiChoice)
    expect(
      within(editor).queryByTestId('test-question-type-select-select'),
    ).not.toBeInTheDocument()
    fireEvent.focus(select)
    expect(
      within(settings).getByText('Invalid question type'),
    ).toBeInTheDocument()
    fireEvent.change(select, { target: { value: QuestionType.TrueFalse } })
    expect(onReplaceQuestion).toHaveBeenCalledExactlyOnceWith(
      QuestionType.TrueFalse,
    )
  })

  it('does not offer question type selection in zero-to-one-hundred mode', () => {
    const question = { type: QuestionType.Range, question: 'First question' }
    renderQuizCreatorPageUI({
      gameMode: GameMode.ZeroToOneHundred,
      questions: [question, { ...question, question: 'Second question' }],
      questionValidations: [makeValidation(), makeValidation()],
      selectedQuestion: question,
      selectedQuestionIndex: 0,
    })

    expect(
      screen.queryByTestId('test-question-type-select-select'),
    ).not.toBeInTheDocument()
  })

  it('keeps the duration control only in the settings panel', () => {
    const question = {
      type: QuestionType.MultiChoice,
      question: 'First question',
      duration: 45,
    }
    const onQuestionValueChange = vi.fn()
    renderQuizCreatorPageUI({
      gameMode: GameMode.Classic,
      questions: [question, { ...question, question: 'Second question' }],
      questionValidations: [makeValidation(), makeValidation()],
      selectedQuestion: question,
      selectedQuestionIndex: 0,
      onQuestionValueChange,
    })

    const settings = screen.getByRole('complementary', {
      name: 'Question settings',
    })
    const editor = screen.getByRole('main', { name: 'Question editor' })
    const duration = within(settings).getByTestId('test-duration-select-select')
    expect(duration).toHaveValue('45')
    expect(
      within(editor).queryByTestId('test-duration-select-select'),
    ).not.toBeInTheDocument()
    fireEvent.change(duration, { target: { value: '90' } })
    expect(onQuestionValueChange).toHaveBeenCalledExactlyOnceWith(
      'duration',
      90,
    )
  })

  it('keeps Classic points only in the settings panel', () => {
    const question = {
      type: QuestionType.MultiChoice,
      question: 'First question',
      points: 2000,
    }
    const onQuestionValueChange = vi.fn()
    renderQuizCreatorPageUI({
      gameMode: GameMode.Classic,
      questions: [question, { ...question, question: 'Second question' }],
      questionValidations: [makeValidation(), makeValidation()],
      selectedQuestion: question,
      selectedQuestionIndex: 0,
      onQuestionValueChange,
    })

    const settings = screen.getByRole('complementary', {
      name: 'Question settings',
    })
    const editor = screen.getByRole('main', { name: 'Question editor' })
    const points = within(settings).getByTestId('test-points-select-select')
    expect(points).toHaveValue('2000')
    expect(
      within(editor).queryByTestId('test-points-select-select'),
    ).not.toBeInTheDocument()
    fireEvent.change(points, { target: { value: '0' } })
    expect(onQuestionValueChange).toHaveBeenCalledExactlyOnceWith('points', 0)
  })

  it('shows question navigation in the page footer and traverses questions', () => {
    const onSelectedQuestionIndex = vi.fn()
    const questions = [
      { type: QuestionType.MultiChoice, question: 'First question' },
      { type: QuestionType.MultiChoice, question: 'Second question' },
      { type: QuestionType.MultiChoice, question: 'Third question' },
    ]
    const { container } = renderQuizCreatorPageUI({
      gameMode: GameMode.Classic,
      questions,
      questionValidations: questions.map(() => makeValidation()),
      selectedQuestion: questions[1],
      selectedQuestionIndex: 1,
      onSelectedQuestionIndex,
    })

    const navigation = screen.getByRole('navigation', {
      name: 'Question navigation',
    })
    expect(navigation).toHaveTextContent('Question 2 of 3')
    expect(container.querySelector('.footer')).toContainElement(navigation)
    expect(screen.getByTestId('editor-workspace')).not.toContainElement(
      navigation,
    )

    fireEvent.click(
      within(navigation).getByRole('button', { name: 'Previous question' }),
    )
    fireEvent.click(
      within(navigation).getByRole('button', { name: 'Next question' }),
    )
    expect(onSelectedQuestionIndex).toHaveBeenNthCalledWith(1, 0)
    expect(onSelectedQuestionIndex).toHaveBeenNthCalledWith(2, 2)
  })

  it('hides question navigation while the advanced editor is active', () => {
    Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
      configurable: true,
      value: vi.fn(),
    })
    const question = {
      type: QuestionType.MultiChoice,
      question: 'First question',
    }
    renderQuizCreatorPageUI({
      gameMode: GameMode.Classic,
      questions: [question],
      questionValidations: [makeValidation()],
      selectedQuestion: question,
      selectedQuestionIndex: 0,
    })

    expect(
      screen.getByRole('navigation', { name: 'Question navigation' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('complementary', { name: 'Question settings' }),
    ).toHaveTextContent('Question settings')
    fireEvent.click(
      screen.getByRole('button', { name: 'Show Advanced Editor' }),
    )
    expect(
      screen.queryByRole('navigation', { name: 'Question navigation' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('complementary', { name: 'Question settings' }),
    ).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Show Simple Editor' }))
    expect(
      screen.getByRole('navigation', { name: 'Question navigation' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('complementary', { name: 'Question settings' }),
    ).toBeInTheDocument()
  })

  it('disables the save button when canSaveQuiz is false', () => {
    const { container } = renderQuizCreatorPageUI({ canSaveQuiz: false })

    expect(container.querySelector('#save-button')).toBeDisabled()
  })

  it('enables the save button when canSaveQuiz is true', () => {
    const { container } = renderQuizCreatorPageUI({ canSaveQuiz: true })

    expect(container.querySelector('#save-button')).toBeEnabled()
  })

  it('opens and closes quiz-level settings from the header', () => {
    renderQuizCreatorPageUI({ gameMode: GameMode.Classic })

    fireEvent.click(screen.getByRole('button', { name: 'Settings' }))
    const settings = screen.getByRole('dialog', { name: 'Settings' })
    expect(settings).toBeInTheDocument()

    fireEvent.click(within(settings).getByRole('button', { name: 'Close' }))
    expect(
      screen.queryByRole('dialog', { name: 'Settings' }),
    ).not.toBeInTheDocument()
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
