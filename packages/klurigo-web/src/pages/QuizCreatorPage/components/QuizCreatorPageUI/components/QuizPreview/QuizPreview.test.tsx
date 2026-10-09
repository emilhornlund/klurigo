import {
  type CountdownEvent,
  GameMode,
  getQuestionPreviewDurationMs,
  QuestionType,
} from '@klurigo/common'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import type { QuizQuestionModel } from '../../../../utils/QuestionDataSource'

vi.mock('../../../../../../components/ProgressBar/ProgressBar', () => ({
  default: ({ countdown }: { countdown: CountdownEvent }) => (
    <div
      data-testid="progressbar"
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

const renderPreview = (onExit = vi.fn()) =>
  render(
    <MemoryRouter>
      <QuizPreview
        mode={GameMode.Classic}
        questions={questions}
        onExit={onExit}
      />
    </MemoryRouter>,
  )

describe('QuizPreview', () => {
  it('starts at the first question preview and progresses locally to completion', async () => {
    const user = userEvent.setup()
    renderPreview()

    expect(screen.getByTestId('quiz-preview-page')).toBeInTheDocument()
    expect(
      screen.getByTestId('quiz-preview-question-preview'),
    ).toBeInTheDocument()
    expect(screen.queryByText('Preview player')).not.toBeInTheDocument()
    expect(screen.getByText('First unsaved question')).toBeInTheDocument()
    expect(screen.getAllByText('1 / 2').length).toBeGreaterThan(0)
    expect(screen.getByTestId('progressbar')).toHaveAttribute(
      'data-duration-ms',
      String(getQuestionPreviewDurationMs('First unsaved question')),
    )

    await user.click(
      screen.getByRole('button', { name: 'Continue to question' }),
    )
    expect(
      screen.getByTestId('quiz-preview-active-question'),
    ).toBeInTheDocument()
    expect(
      screen.queryByTestId('quiz-preview-question-preview'),
    ).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'First answer' })).toBeEnabled()
    expect(screen.getByTestId('progressbar')).toHaveAttribute(
      'data-duration-ms',
      '30000',
    )

    await user.click(screen.getByRole('button', { name: 'First answer' }))
    await user.click(screen.getByRole('button', { name: 'Next question' }))
    expect(screen.getByText('Second question')).toBeInTheDocument()
    expect(screen.getAllByText('2 / 2').length).toBeGreaterThan(0)
    expect(screen.getByTestId('progressbar')).toHaveAttribute(
      'data-duration-ms',
      String(getQuestionPreviewDurationMs('Second question')),
    )

    await user.click(
      screen.getByRole('button', { name: 'Continue to question' }),
    )
    await user.click(screen.getByRole('button', { name: 'True' }))
    await user.click(screen.getByRole('button', { name: 'Finish preview' }))

    expect(screen.getByText('Preview complete')).toBeInTheDocument()
  })

  it('supports local answers, going back, restarting, and exiting', async () => {
    const user = userEvent.setup()
    const onExit = vi.fn()
    const originalQuestions = structuredClone(questions)
    renderPreview(onExit)

    await user.click(
      screen.getByRole('button', { name: 'Continue to question' }),
    )
    await user.click(screen.getByRole('button', { name: 'First answer' }))
    expect(screen.getByRole('button', { name: 'Next question' })).toBeEnabled()
    expect(questions).toEqual(originalQuestions)

    await user.click(screen.getByRole('button', { name: 'Next question' }))
    await user.click(screen.getByRole('button', { name: 'Back' }))
    expect(screen.getByText('First unsaved question')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Next question' })).toBeDisabled()
    expect(screen.getByTestId('progressbar')).toHaveAttribute(
      'data-duration-ms',
      '30000',
    )

    await user.click(screen.getByRole('button', { name: 'Exit preview' }))
    expect(onExit).toHaveBeenCalledOnce()
  })

  it('restarts from the first question after completing the preview', async () => {
    const user = userEvent.setup()
    renderPreview()

    await user.click(
      screen.getByRole('button', { name: 'Continue to question' }),
    )
    await user.click(screen.getByRole('button', { name: 'First answer' }))
    await user.click(screen.getByRole('button', { name: 'Next question' }))
    await user.click(
      screen.getByRole('button', { name: 'Continue to question' }),
    )
    await user.click(screen.getByRole('button', { name: 'True' }))
    await user.click(screen.getByRole('button', { name: 'Finish preview' }))
    await user.click(screen.getByRole('button', { name: 'Restart preview' }))

    expect(screen.getByText('First unsaved question')).toBeInTheDocument()
    expect(screen.getAllByText('1 / 2').length).toBeGreaterThan(0)
  })

  it('keeps preview controls reachable on a mobile viewport', () => {
    const width = vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(375)
    try {
      renderPreview()

      expect(screen.getByText('Preview')).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: 'Continue to question' }),
      ).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: 'Exit preview' }),
      ).toBeInTheDocument()
    } finally {
      width.mockRestore()
    }
  })
})
