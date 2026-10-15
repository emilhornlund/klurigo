import {
  type CountdownEvent,
  type GameEventQuestion,
  GameMode,
  getQuestionPreviewDurationMs,
  QuestionType,
  type SubmitQuestionAnswerRequestDto,
} from '@klurigo/common'
import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import type { QuizQuestionModel } from '../../../../utils/QuestionDataSource'

vi.mock('../../../../../../states/common', () => ({
  GamePage: ({
    layout,
    header,
    footer,
    children,
  }: {
    layout: string
    header: React.ReactNode
    footer?: React.ReactNode
    children: React.ReactNode
  }) => (
    <main data-testid="game-page" data-layout={layout}>
      <header data-testid="game-page-header">{header}</header>
      {children}
      {footer && <footer data-testid="game-page-footer">{footer}</footer>}
    </main>
  ),
  QuestionView: ({
    question,
    onChange,
  }: {
    question: GameEventQuestion
    onChange: (request: SubmitQuestionAnswerRequestDto) => void
  }) => {
    const submitAnswer = (value?: boolean) => {
      switch (question.type) {
        case 'MULTI_CHOICE':
          onChange({ type: question.type, optionIndex: 0 })
          return
        case 'RANGE':
          onChange({ type: question.type, value: question.min })
          return
        case 'TRUE_FALSE':
          onChange({ type: question.type, value: value ?? true })
          return
        case 'TYPE_ANSWER':
          onChange({ type: question.type, value: 'Answer' })
          return
        case 'PIN':
          onChange({ type: question.type, positionX: 0, positionY: 0 })
          return
        case 'PUZZLE':
          onChange({ type: question.type, values: [...question.values] })
      }
    }

    return (
      <div data-testid="question-view">
        {question.type === 'MULTI_CHOICE' ? (
          question.answers.map(({ value }, index) => (
            <button
              key={value}
              type="button"
              onClick={() =>
                onChange({ type: question.type, optionIndex: index })
              }>
              {value}
            </button>
          ))
        ) : question.type === 'TRUE_FALSE' ? (
          <>
            <button type="button" onClick={() => submitAnswer(true)}>
              True
            </button>
            <button type="button" onClick={() => submitAnswer(false)}>
              False
            </button>
          </>
        ) : (
          <button type="button" onClick={() => submitAnswer()}>
            Submit answer
          </button>
        )}
      </div>
    )
  },
}))

vi.mock('../../../../../../components/ProgressBar/ProgressBar', () => ({
  default: ({
    countdown,
    disableStyling,
  }: {
    countdown: CountdownEvent
    disableStyling?: boolean
  }) => (
    <div
      data-testid="progressbar"
      data-disable-styling={String(Boolean(disableStyling))}
      data-duration-ms={
        new Date(countdown.expiryTime).getTime() -
        new Date(countdown.initiatedTime).getTime()
      }
    />
  ),
}))

import QuizPreview from './QuizPreview'

const questions: QuizQuestionModel[] = [
  {
    type: QuestionType.MultiChoice,
    question: 'First unsaved question',
    options: [
      { value: 'First answer', correct: true },
      { value: 'Other answer', correct: false },
    ],
    points: 1000,
    duration: 30,
  },
  {
    type: QuestionType.TrueFalse,
    question: 'Second question',
    correct: true,
    points: 1000,
    duration: 30,
  },
]

const answerTypeCases: {
  question: QuizQuestionModel
  readingText: string
  answerButton: string
}[] = [
  {
    question: questions[0],
    readingText: 'First unsaved question',
    answerButton: 'First answer',
  },
  {
    question: questions[1],
    readingText: 'Second question',
    answerButton: 'True',
  },
  {
    question: {
      type: QuestionType.Range,
      question: 'Range question',
      min: 0,
      max: 100,
      correct: 0,
      duration: 30,
    },
    readingText: 'Range question',
    answerButton: 'Submit answer',
  },
  {
    question: {
      type: QuestionType.TypeAnswer,
      question: 'Type answer question',
      options: ['Answer'],
      duration: 30,
    },
    readingText: 'Type answer question',
    answerButton: 'Submit answer',
  },
  {
    question: {
      type: QuestionType.Pin,
      question: 'Pin question',
      imageURL: 'https://example.test/image.png',
      positionX: 0,
      positionY: 0,
      duration: 30,
    },
    readingText: 'Pin question',
    answerButton: 'Submit answer',
  },
  {
    question: {
      type: QuestionType.Puzzle,
      question: 'Puzzle question',
      values: ['First', 'Second'],
      duration: 30,
    },
    readingText: 'Puzzle question',
    answerButton: 'Submit answer',
  },
]

const renderPreview = (onExit = vi.fn()) =>
  render(
    <QuizPreview
      mode={GameMode.Classic}
      questions={questions}
      onExit={onExit}
    />,
  )

describe('QuizPreview', () => {
  it('uses the fill game page and renders the primary Exit action in its header', async () => {
    const user = userEvent.setup()
    const onExit = vi.fn()
    renderPreview(onExit)

    expect(screen.getByTestId('game-page')).toHaveAttribute(
      'data-layout',
      'fill',
    )
    expect(screen.getByTestId('game-page-header')).toContainElement(
      screen.getByRole('button', { name: 'Exit' }),
    )
    expect(
      screen.getByRole('button', { name: 'Exit' }).parentElement,
    ).toHaveClass('variantPrimary', 'intentAccent')
    expect(
      screen.getByRole('button', { name: 'Exit' }).querySelector('svg'),
    ).toHaveAttribute('data-icon', 'arrow-right-from-bracket')
    expect(screen.queryByTestId('game-page-footer')).not.toBeInTheDocument()
    expect(screen.queryByTestId('player-game-footer')).not.toBeInTheDocument()
    expect(screen.getByText('First unsaved question')).toBeInTheDocument()
    expect(screen.queryByText('Preview')).not.toBeInTheDocument()
    expect(screen.getByTestId('game-page-header')).not.toHaveTextContent(
      /\b1\s*\/\s*2\b/,
    )
    expect(
      screen.queryByRole('button', { name: 'Back' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /Continue|Next|Finish preview/ }),
    ).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Exit' }))
    expect(onExit).toHaveBeenCalledOnce()
  })

  it('keeps the question preview view and its shared reading-duration progress bar', () => {
    renderPreview()

    expect(screen.getByText('First unsaved question')).toBeInTheDocument()
    expect(screen.getByTestId('progressbar')).toHaveAttribute(
      'data-disable-styling',
      'true',
    )
    expect(screen.getByTestId('progressbar')).toHaveAttribute(
      'data-duration-ms',
      String(getQuestionPreviewDurationMs('First unsaved question')),
    )
    expect(screen.queryByTestId('game-page-footer')).not.toBeInTheDocument()
  })

  it('shows the empty-question state when no complete questions are available', () => {
    render(
      <QuizPreview mode={GameMode.Classic} questions={[]} onExit={vi.fn()} />,
    )

    expect(
      screen.getByText('Add a complete question to preview this quiz.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Exit' })).toBeInTheDocument()
    expect(screen.queryByTestId('game-page-footer')).not.toBeInTheDocument()
  })

  it('automatically advances through questions and exits when the final countdown expires', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-09T12:00:00.000Z'))
    try {
      const onExit = vi.fn()
      renderPreview(onExit)

      const previewDuration = getQuestionPreviewDurationMs(
        'First unsaved question',
      )
      act(() => vi.advanceTimersByTime(previewDuration))
      expect(
        screen.getByRole('button', { name: 'First answer' }),
      ).toBeInTheDocument()
      expect(screen.queryByTestId('game-page-footer')).not.toBeInTheDocument()
      expect(screen.getByTestId('progressbar')).toHaveAttribute(
        'data-disable-styling',
        'false',
      )
      expect(screen.getByTestId('progressbar')).toHaveAttribute(
        'data-duration-ms',
        '30000',
      )

      act(() => vi.advanceTimersByTime(30000))
      expect(screen.getByText('Second question')).toBeInTheDocument()
      expect(screen.getByTestId('progressbar')).toHaveAttribute(
        'data-disable-styling',
        'true',
      )
      expect(screen.getByTestId('progressbar')).toHaveAttribute(
        'data-duration-ms',
        String(getQuestionPreviewDurationMs('Second question')),
      )

      act(() =>
        vi.advanceTimersByTime(getQuestionPreviewDurationMs('Second question')),
      )
      expect(screen.getByRole('button', { name: 'True' })).toBeInTheDocument()
      act(() => vi.advanceTimersByTime(30000))
      expect(onExit).toHaveBeenCalledOnce()
      expect(screen.queryByText('Preview complete')).not.toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  it('advances to the next question after a local answer without exiting', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-09T12:00:00.000Z'))
    try {
      const onExit = vi.fn()
      renderPreview(onExit)
      act(() =>
        vi.advanceTimersByTime(
          getQuestionPreviewDurationMs('First unsaved question'),
        ),
      )

      fireEvent.click(screen.getByRole('button', { name: 'First answer' }))

      expect(screen.getByText('Second question')).toBeInTheDocument()
      expect(screen.queryByTestId('game-page-footer')).not.toBeInTheDocument()
      expect(onExit).not.toHaveBeenCalled()
    } finally {
      vi.useRealTimers()
    }
  })

  it.each(answerTypeCases)(
    'exits after submitting a final $question.type answer',
    ({ question, readingText, answerButton }) => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-10-09T12:00:00.000Z'))
      try {
        const onExit = vi.fn()
        render(
          <QuizPreview
            mode={GameMode.Classic}
            questions={[question]}
            onExit={onExit}
          />,
        )
        act(() =>
          vi.advanceTimersByTime(getQuestionPreviewDurationMs(readingText)),
        )
        fireEvent.click(screen.getByRole('button', { name: answerButton }))

        expect(onExit).toHaveBeenCalledOnce()
        expect(screen.queryByText('Preview complete')).not.toBeInTheDocument()
      } finally {
        vi.useRealTimers()
      }
    },
  )
})
