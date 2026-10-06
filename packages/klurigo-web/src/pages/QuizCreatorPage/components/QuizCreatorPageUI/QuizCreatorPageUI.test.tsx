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
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { ValidationResult } from '../../../../validation'
import type { QuizQuestionModel } from '../../utils/QuestionDataSource'

import { addRevealedQuestionId } from './questionValidation'
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
        questionIds={[]}
        questionValidations={[]}
        selectedQuestion={undefined}
        selectedQuestionIndex={0}
        canSaveQuiz={false}
        onSetQuestions={() => undefined}
        onSelectedQuestionIndex={() => undefined}
        onAddQuestion={() => undefined}
        onQuestionValueChange={() => undefined}
        onMoveQuestion={() => undefined}
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
  beforeEach(() => {
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: vi.fn(),
    })
  })

  it('reveals a question by stable ID without revealing another question or mutating the prior set', () => {
    const initial = new Set<string>()
    const revealed = addRevealedQuestionId(initial, 'question-a')

    expect(initial.has('question-a')).toBe(false)
    expect(revealed.has('question-a')).toBe(true)
    expect(revealed.has('question-b')).toBe(false)
    expect(addRevealedQuestionId(revealed, 'question-a')).toBe(revealed)

    const reorderedIds = ['question-b', 'question-a']
    expect(revealed.has(reorderedIds[1])).toBe(true)
    expect(revealed.has(reorderedIds[0])).toBe(false)
  })

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
          questionIds={[]}
          questionValidations={[]}
          selectedQuestion={undefined}
          selectedQuestionIndex={0}
          canSaveQuiz={false}
          onSetQuestions={() => undefined}
          onSelectedQuestionIndex={() => undefined}
          onAddQuestion={() => undefined}
          onQuestionValueChange={() => undefined}
          onMoveQuestion={() => undefined}
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
          questionIds={[]}
          questionValidations={[]}
          selectedQuestion={undefined}
          selectedQuestionIndex={0}
          canSaveQuiz={false}
          onSetQuestions={() => undefined}
          onSelectedQuestionIndex={() => undefined}
          onAddQuestion={() => undefined}
          onQuestionValueChange={() => undefined}
          onMoveQuestion={() => undefined}
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
          questionIds={['q1', 'q2', 'q3', 'q4']}
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
          onMoveQuestion={() => undefined}
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
          questionIds={[]}
          questionValidations={[]}
          selectedQuestion={undefined}
          selectedQuestionIndex={0}
          canSaveQuiz={false}
          onSetQuestions={() => undefined}
          onSelectedQuestionIndex={() => undefined}
          onAddQuestion={() => undefined}
          onQuestionValueChange={() => undefined}
          onMoveQuestion={() => undefined}
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
          questionIds={['q1']}
          questionValidations={[]}
          selectedQuestion={undefined}
          selectedQuestionIndex={0}
          canSaveQuiz={false}
          onSetQuestions={() => undefined}
          onSelectedQuestionIndex={() => undefined}
          onAddQuestion={() => undefined}
          onQuestionValueChange={() => undefined}
          onMoveQuestion={() => undefined}
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
      questionIds: ['question-1', 'question-2'],
      questionValidations: [makeValidation(), makeValidation()],
      selectedQuestion: {
        type: QuestionType.MultiChoice,
        question: 'First question',
      },
      onAddQuestion,
      onQuestionValueChange,
    })

    const workspace = screen.getByTestId('editor-workspace')
    const navigator = within(workspace).getByRole('navigation')
    const editor = within(workspace).getByRole('main')
    const settings = within(workspace).getByRole('complementary', {
      name: 'Question settings',
    })

    expect(Array.from(workspace.children)).toEqual([
      navigator,
      editor,
      settings,
    ])
    expect(navigator).toHaveTextContent('Questions')
    expect(
      within(editor).getByTestId('test-question-text-textarea-textarea'),
    ).toHaveValue('First question')
    fireEvent.click(
      within(navigator).getByRole('button', { name: 'Add question' }),
    )
    expect(onAddQuestion).toHaveBeenCalledOnce()
    fireEvent.change(editor.querySelector('#question-text-textarea')!, {
      target: { value: 'Edited question' },
    })
    expect(onQuestionValueChange).toHaveBeenCalledWith(
      'question',
      'Edited question',
    )
    expect(container.querySelector('#save-button')).toBeInTheDocument()
  })

  it('keeps the navigator, editor and settings available at constrained widths', () => {
    const width = vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(600)
    try {
      renderQuizCreatorPageUI({
        gameMode: GameMode.Classic,
        questions: [{ type: QuestionType.MultiChoice, question: 'Question' }],
        questionValidations: [makeValidation()],
        selectedQuestion: {
          type: QuestionType.MultiChoice,
          question: 'Question',
        },
      })

      const workspace = screen.getByTestId('editor-workspace')
      expect(within(workspace).getByRole('navigation')).toBeInTheDocument()
      expect(within(workspace).getByRole('main')).toBeInTheDocument()
      expect(
        screen.getByRole('complementary', { name: 'Question settings' }),
      ).toBeInTheDocument()
    } finally {
      width.mockRestore()
    }
  })

  it('keeps header and footer navigation actions reachable on mobile', () => {
    const width = vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(375)
    try {
      renderQuizCreatorPageUI({
        gameMode: GameMode.Classic,
        questions: [{ type: QuestionType.MultiChoice, question: 'Question' }],
        questionValidations: [makeValidation()],
        selectedQuestion: {
          type: QuestionType.MultiChoice,
          question: 'Question',
        },
      })

      expect(document.getElementById('settings-button')).toBeInTheDocument()
      expect(document.getElementById('save-button')).toBeInTheDocument()
      expect(document.getElementById('exit-button')).toBeInTheDocument()
      expect(
        screen.getByRole('navigation', { name: 'Question navigation' }),
      ).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: 'Previous question' }),
      ).toBeDisabled()
      expect(screen.getByText('Question 1 of 1')).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: 'Next question' }),
      ).toBeDisabled()
    } finally {
      width.mockRestore()
    }
  })

  it('keeps editor functions reachable at a constrained viewport', () => {
    const width = vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(600)
    const questions = [
      { type: QuestionType.MultiChoice, question: 'First question' },
      {
        type: QuestionType.MultiChoice,
        question: 'Second question',
        duration: 45,
      },
      { type: QuestionType.MultiChoice, question: 'Third question' },
    ]
    const onSelectedQuestionIndex = vi.fn()
    const onAddQuestion = vi.fn()
    const onQuestionValueChange = vi.fn()
    const onSaveQuiz = vi.fn()
    const onExit = vi.fn()

    try {
      renderQuizCreatorPageUI({
        gameMode: GameMode.Classic,
        questions,
        questionValidations: questions.map(() => makeValidation()),
        selectedQuestion: questions[1],
        selectedQuestionIndex: 1,
        canSaveQuiz: true,
        onSelectedQuestionIndex,
        onAddQuestion,
        onQuestionValueChange,
        onSaveQuiz,
        onExit,
      })

      fireEvent.click(screen.getByRole('button', { name: /second question/i }))
      expect(onSelectedQuestionIndex).toHaveBeenCalledWith(1)
      fireEvent.click(screen.getByRole('button', { name: 'Add question' }))
      expect(onAddQuestion).toHaveBeenCalledOnce()

      fireEvent.change(
        screen.getByTestId('test-question-text-textarea-textarea'),
        { target: { value: 'Edited on mobile' } },
      )
      expect(onQuestionValueChange).toHaveBeenCalledWith(
        'question',
        'Edited on mobile',
      )

      expect(screen.getByTestId('test-duration-select-select')).toHaveValue(
        '45',
      )

      fireEvent.click(screen.getByRole('button', { name: 'Previous question' }))
      fireEvent.click(screen.getByRole('button', { name: 'Next question' }))
      expect(onSelectedQuestionIndex).toHaveBeenNthCalledWith(2, 0)
      expect(onSelectedQuestionIndex).toHaveBeenNthCalledWith(3, 2)

      fireEvent.click(document.getElementById('settings-button')!)
      expect(
        screen.getByRole('dialog', { name: 'Settings' }),
      ).toBeInTheDocument()
      fireEvent.click(document.getElementById('save-button')!)
      fireEvent.click(document.getElementById('exit-button')!)
      expect(onSaveQuiz).toHaveBeenCalledOnce()
      expect(onExit).toHaveBeenCalledOnce()
    } finally {
      width.mockRestore()
    }
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
    const editor = screen.getByRole('main')
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
    const editor = screen.getByRole('main')
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
    const editor = screen.getByRole('main')
    const points = within(settings).getByTestId('test-points-select-select')
    expect(points).toHaveValue('2000')
    expect(
      within(editor).queryByTestId('test-points-select-select'),
    ).not.toBeInTheDocument()
    fireEvent.change(points, { target: { value: '0' } })
    expect(onQuestionValueChange).toHaveBeenCalledExactlyOnceWith('points', 0)
  })

  it('keeps question info only in the settings panel', () => {
    const question = {
      type: QuestionType.MultiChoice,
      question: 'First question',
      info: 'Existing context',
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
    const editor = screen.getByRole('main')
    expect(
      within(settings).getByRole('heading', { name: 'Answer explanation' }),
    ).toBeInTheDocument()
    const info = within(settings).getByTestId(
      'test-question-info-textarea-textarea',
    )
    expect(info).toHaveValue('Existing context')
    expect(
      within(editor).queryByTestId('test-question-info-textarea-textarea'),
    ).not.toBeInTheDocument()
    fireEvent.change(info, { target: { value: 'Updated context' } })
    expect(onQuestionValueChange).toHaveBeenCalledExactlyOnceWith(
      'info',
      'Updated context',
    )
  })

  it('deletes only the selected question from settings after confirmation', () => {
    const questions = [
      { type: QuestionType.MultiChoice, question: 'First question' },
      { type: QuestionType.TrueFalse, question: 'Second question' },
    ]
    const onDeleteQuestionIndex = vi.fn()
    renderQuizCreatorPageUI({
      gameMode: GameMode.Classic,
      questions,
      questionValidations: [makeValidation(), makeValidation()],
      selectedQuestion: questions[1],
      selectedQuestionIndex: 1,
      onDeleteQuestionIndex,
    })

    const navigator = within(screen.getByTestId('editor-workspace')).getByRole(
      'navigation',
    )
    fireEvent.click(
      within(navigator).getByRole('button', { name: 'Delete question' }),
    )
    fireEvent.click(
      within(
        screen.getByRole('dialog', { name: 'Delete quiz question' }),
      ).getByRole('button', { name: 'Delete' }),
    )
    expect(onDeleteQuestionIndex).toHaveBeenCalledExactlyOnceWith(1)
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

  it('reveals invalid questions when leaving and preserves reveal state by question ID', () => {
    const questions = [
      { type: QuestionType.MultiChoice, question: '' },
      { type: QuestionType.MultiChoice, question: 'Valid question' },
      { type: QuestionType.MultiChoice, question: 'Third question' },
    ]
    const questionIds = ['first-id', 'second-id', 'third-id']
    const validations = [
      makeValidation([{ path: 'question', message: 'Enter a question.' }]),
      makeValidation(),
      makeValidation(),
    ]
    const onSelectedQuestionIndex = vi.fn()

    const { rerender } = renderQuizCreatorPageUI({
      gameMode: GameMode.Classic,
      questions,
      questionIds,
      questionValidations: validations,
      selectedQuestion: questions[0],
      selectedQuestionIndex: 0,
      onSelectedQuestionIndex,
    })

    expect(screen.queryByText('Enter a question.')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Next question' }))

    expect(onSelectedQuestionIndex).toHaveBeenCalledWith(1)
    expect(screen.getByText('Enter a question.')).toBeInTheDocument()

    rerender(
      <MemoryRouter>
        <QuizCreatorPageUI
          gameMode={GameMode.Classic}
          quizSettings={{}}
          quizSettingsValidation={makeValidation()}
          onQuizSettingsValueChange={() => undefined}
          questions={[questions[1], questions[0], questions[2]]}
          questionIds={['second-id', 'first-id', 'third-id']}
          questionValidations={[validations[1], validations[0], validations[2]]}
          selectedQuestion={questions[0]}
          selectedQuestionIndex={1}
          canSaveQuiz={false}
          onSetQuestions={() => undefined}
          onSelectedQuestionIndex={onSelectedQuestionIndex}
          onAddQuestion={() => undefined}
          onQuestionValueChange={() => undefined}
          onMoveQuestion={() => undefined}
          onDuplicateQuestionIndex={() => undefined}
          onDeleteQuestionIndex={() => undefined}
          onReplaceQuestion={() => undefined}
          onSaveQuiz={() => undefined}
          onExit={() => undefined}
        />
      </MemoryRouter>,
    )

    expect(screen.getByText('Enter a question.')).toBeInTheDocument()
  })

  it('preserves revealed validation through moves while duplicated and added question IDs start pristine', () => {
    const invalidQuestion = {
      type: QuestionType.MultiChoice,
      question: '',
    }
    const otherQuestion = {
      type: QuestionType.MultiChoice,
      question: 'Other question',
    }
    const invalidValidation = makeValidation([
      { path: 'question', message: 'Enter a question.' },
    ])

    const { rerender } = renderQuizCreatorPageUI({
      gameMode: GameMode.Classic,
      questions: [invalidQuestion, otherQuestion],
      questionIds: ['original-id', 'other-id'],
      questionValidations: [invalidValidation, makeValidation()],
      selectedQuestion: invalidQuestion,
      selectedQuestionIndex: 0,
      onSelectedQuestionIndex: vi.fn(),
    })

    expect(screen.queryByText('Enter a question.')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Next question' }))

    expect(screen.getByText('Enter a question.')).toBeInTheDocument()

    const renderWithSelection = (selectedIndex: number) =>
      rerender(
        <MemoryRouter>
          <QuizCreatorPageUI
            gameMode={GameMode.Classic}
            quizSettings={{}}
            quizSettingsValidation={makeValidation()}
            onQuizSettingsValueChange={() => undefined}
            questions={[
              otherQuestion,
              invalidQuestion,
              invalidQuestion,
              invalidQuestion,
            ]}
            questionIds={['other-id', 'original-id', 'duplicate-id', 'new-id']}
            questionValidations={[
              makeValidation(),
              invalidValidation,
              invalidValidation,
              invalidValidation,
            ]}
            selectedQuestion={
              selectedIndex === 0 ? otherQuestion : invalidQuestion
            }
            selectedQuestionIndex={selectedIndex}
            canSaveQuiz={false}
            onSetQuestions={() => undefined}
            onSelectedQuestionIndex={() => undefined}
            onAddQuestion={() => undefined}
            onQuestionValueChange={() => undefined}
            onMoveQuestion={() => undefined}
            onDuplicateQuestionIndex={() => undefined}
            onDeleteQuestionIndex={() => undefined}
            onReplaceQuestion={() => undefined}
            onSaveQuiz={() => undefined}
            onExit={() => undefined}
          />
        </MemoryRouter>,
      )

    renderWithSelection(1)
    expect(screen.getByText('Enter a question.')).toBeInTheDocument()

    renderWithSelection(2)
    expect(screen.queryByText('Enter a question.')).not.toBeInTheDocument()

    renderWithSelection(3)
    expect(screen.queryByText('Enter a question.')).not.toBeInTheDocument()
  })

  it('resets revealed validation when replacing the question type and cleans deleted reveal state', () => {
    const questions = [
      { type: QuestionType.MultiChoice, question: '' },
      { type: QuestionType.MultiChoice, question: 'Other question' },
    ]
    const validation = makeValidation([
      { path: 'question', message: 'Enter a question.' },
    ])
    const onDeleteQuestionIndex = vi.fn()
    const onReplaceQuestion = vi.fn()

    const { rerender } = renderQuizCreatorPageUI({
      gameMode: GameMode.Classic,
      questions,
      questionIds: ['original-id', 'other-id'],
      questionValidations: [validation, makeValidation()],
      selectedQuestion: questions[0],
      selectedQuestionIndex: 0,
      onSelectedQuestionIndex: vi.fn(),
      onDeleteQuestionIndex,
      onReplaceQuestion,
    })

    expect(screen.queryByText('Enter a question.')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Next question' }))

    expect(screen.getByText('Enter a question.')).toBeInTheDocument()

    fireEvent.change(screen.getByTestId('test-question-type-select-select'), {
      target: { value: QuestionType.TrueFalse },
    })

    expect(onReplaceQuestion).toHaveBeenCalledWith(QuestionType.TrueFalse)
    expect(screen.queryByText('Enter a question.')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Next question' }))
    fireEvent.click(screen.getByRole('button', { name: 'Delete question' }))
    fireEvent.click(
      within(
        screen.getByRole('dialog', { name: 'Delete quiz question' }),
      ).getByRole('button', { name: 'Delete' }),
    )

    expect(onDeleteQuestionIndex).toHaveBeenCalledWith(0)

    rerender(
      <MemoryRouter>
        <QuizCreatorPageUI
          gameMode={GameMode.Classic}
          quizSettings={{}}
          quizSettingsValidation={makeValidation()}
          onQuizSettingsValueChange={() => undefined}
          questions={[questions[0]]}
          questionIds={['original-id']}
          questionValidations={[validation]}
          selectedQuestion={questions[0]}
          selectedQuestionIndex={0}
          canSaveQuiz={false}
          onSetQuestions={() => undefined}
          onSelectedQuestionIndex={() => undefined}
          onAddQuestion={() => undefined}
          onQuestionValueChange={() => undefined}
          onMoveQuestion={() => undefined}
          onDuplicateQuestionIndex={() => undefined}
          onDeleteQuestionIndex={onDeleteQuestionIndex}
          onReplaceQuestion={onReplaceQuestion}
          onSaveQuiz={() => undefined}
          onExit={() => undefined}
        />
      </MemoryRouter>,
    )

    expect(screen.queryByText('Enter a question.')).not.toBeInTheDocument()
  })

  it('hides question navigation while the advanced editor is active', () => {
    const question = {
      type: QuestionType.TrueFalse as const,
      question: 'Is this the advanced editor?',
      correct: true,
    }
    const onSetQuestions = vi.fn()
    renderQuizCreatorPageUI({
      gameMode: GameMode.Classic,
      questions: [question],
      questionValidations: [makeValidation()],
      selectedQuestion: question,
      selectedQuestionIndex: 0,
      onSetQuestions,
    })

    expect(screen.getByTestId('editor-workspace')).toBeInTheDocument()
    expect(
      screen.getByRole('navigation', { name: 'Question navigation' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('complementary', { name: 'Question settings' }),
    ).toHaveTextContent('Question settings')
    fireEvent.click(screen.getByRole('button', { name: 'Code' }))
    expect(screen.queryByTestId('editor-workspace')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('navigation', { name: 'Question navigation' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('complementary', { name: 'Question settings' }),
    ).not.toBeInTheDocument()
    const jsonEditor = document.getElementById('json-textarea')
    expect(jsonEditor).toBeInTheDocument()
    fireEvent.change(jsonEditor!, {
      target: {
        value: JSON.stringify(
          [{ ...question, question: 'Updated in JSON' }],
          null,
          2,
        ),
      },
    })
    expect(onSetQuestions).toHaveBeenCalledExactlyOnceWith([
      { ...question, question: 'Updated in JSON' },
    ])

    fireEvent.click(screen.getByRole('button', { name: 'Visual' }))
    expect(document.getElementById('json-textarea')).not.toBeInTheDocument()
    expect(screen.getByTestId('editor-workspace')).toBeInTheDocument()
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

  it('reveals every invalid question and selects the first before invoking Save', () => {
    const questions = [
      { type: QuestionType.MultiChoice, question: '' },
      { type: QuestionType.MultiChoice, question: 'Valid middle' },
      { type: QuestionType.MultiChoice, question: '' },
    ]
    const validations = [
      makeValidation([{ path: 'question', message: 'Enter a question.' }]),
      makeValidation(),
      makeValidation([{ path: 'question', message: 'Enter a question.' }]),
    ]
    const onSelectedQuestionIndex = vi.fn()
    const onSaveQuiz = vi.fn()

    const { rerender } = renderQuizCreatorPageUI({
      gameMode: GameMode.Classic,
      questions,
      questionIds: ['first', 'middle', 'last'],
      questionValidations: validations,
      selectedQuestion: questions[1],
      selectedQuestionIndex: 1,
      canSaveQuiz: true,
      onSelectedQuestionIndex,
      onSaveQuiz,
    })

    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(onSelectedQuestionIndex).toHaveBeenCalledExactlyOnceWith(0)
    expect(onSaveQuiz).toHaveBeenCalledOnce()

    const renderSelection = (index: number) =>
      rerender(
        <MemoryRouter>
          <QuizCreatorPageUI
            gameMode={GameMode.Classic}
            quizSettings={{}}
            quizSettingsValidation={makeValidation()}
            onQuizSettingsValueChange={() => undefined}
            questions={questions}
            questionIds={['first', 'middle', 'last']}
            questionValidations={validations}
            selectedQuestion={questions[index]}
            selectedQuestionIndex={index}
            canSaveQuiz
            onSetQuestions={() => undefined}
            onSelectedQuestionIndex={onSelectedQuestionIndex}
            onAddQuestion={() => undefined}
            onQuestionValueChange={() => undefined}
            onMoveQuestion={() => undefined}
            onDuplicateQuestionIndex={() => undefined}
            onDeleteQuestionIndex={() => undefined}
            onReplaceQuestion={() => undefined}
            onSaveQuiz={onSaveQuiz}
            onExit={() => undefined}
          />
        </MemoryRouter>,
      )

    renderSelection(0)
    expect(screen.getByText('Enter a question.')).toBeInTheDocument()

    renderSelection(2)
    expect(screen.getByText('Enter a question.')).toBeInTheDocument()

    renderSelection(1)
    expect(screen.queryByText('Enter a question.')).not.toBeInTheDocument()
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

  it('renders the selected question state when switching between questions', () => {
    const questions: QuizQuestionModel[] = [
      {
        type: QuestionType.MultiChoice,
        question: 'First question',
        options: [
          { value: 'First A', correct: true },
          { value: 'First B', correct: false },
          { value: 'First C', correct: false },
          { value: 'First D', correct: false },
        ],
        duration: 30,
        points: 1000,
        info: 'First explanation',
      },
      {
        type: QuestionType.MultiChoice,
        question: 'Second question',
        options: [
          { value: 'Second A', correct: false },
          { value: 'Second B', correct: true },
          { value: 'Second C', correct: false },
          { value: 'Second D', correct: false },
        ],
        duration: 45,
        points: 2000,
        info: 'Second explanation',
      },
    ]

    const { rerender } = renderQuizCreatorPageUI({
      gameMode: GameMode.Classic,
      questionIds: ['question-1', 'question-2'],
      questions,
      questionValidations: [makeValidation(), makeValidation()],
      selectedQuestion: questions[0],
      selectedQuestionIndex: 0,
    })

    expect(
      screen.getByTestId('test-question-text-textarea-textarea'),
    ).toHaveValue('First question')

    expect(
      screen.getByTestId('test-question-info-textarea-textarea'),
    ).toHaveValue('First explanation')

    expect(screen.getByTestId('test-duration-select-select')).toHaveValue('30')
    expect(screen.getByTestId('test-points-select-select')).toHaveValue('1000')

    rerender(
      <MemoryRouter>
        <QuizCreatorPageUI
          gameMode={GameMode.Classic}
          onSelectGameMode={() => undefined}
          quizSettings={{}}
          quizSettingsValidation={makeValidation()}
          onQuizSettingsValueChange={() => undefined}
          questions={questions}
          questionIds={['question-1', 'question-2']}
          questionValidations={[makeValidation(), makeValidation()]}
          selectedQuestion={questions[1]}
          selectedQuestionIndex={1}
          canSaveQuiz={false}
          onSetQuestions={() => undefined}
          onSelectedQuestionIndex={() => undefined}
          onAddQuestion={() => undefined}
          onQuestionValueChange={() => undefined}
          onMoveQuestion={() => undefined}
          onDuplicateQuestionIndex={() => undefined}
          onDeleteQuestionIndex={() => undefined}
          onReplaceQuestion={() => undefined}
          onSaveQuiz={() => undefined}
          onExit={() => undefined}
        />
      </MemoryRouter>,
    )

    expect(
      screen.getByTestId('test-question-text-textarea-textarea'),
    ).toHaveValue('Second question')

    expect(
      screen.getByTestId('test-question-info-textarea-textarea'),
    ).toHaveValue('Second explanation')

    expect(screen.getByTestId('test-duration-select-select')).toHaveValue('45')
    expect(screen.getByTestId('test-points-select-select')).toHaveValue('2000')

    expect(screen.queryByDisplayValue('First question')).not.toBeInTheDocument()

    expect(
      screen.queryByDisplayValue('First explanation'),
    ).not.toBeInTheDocument()
  })
})
