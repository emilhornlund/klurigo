import { MediaType, QuestionType } from '@klurigo/common'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

vi.mock('../../../../components/ProgressBar/ProgressBar', () => ({
  default: () => <div data-testid="progressbar" />,
}))

import PlayerQuestionView from './PlayerQuestionView'

const countdown = {
  initiatedTime: '2025-10-12T11:59:59.000Z',
  expiryTime: '2025-10-12T12:00:01.000Z',
  serverTime: '2025-10-12T12:00:00.000Z',
}

describe('PlayerQuestionView', () => {
  it('renders media, submitted state, pagination, and answer interactions', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <PlayerQuestionView
          question={{
            type: QuestionType.MultiChoice,
            question: 'Which answer is correct?',
            media: {
              type: MediaType.Image,
              url: 'https://img.test/question.jpg',
            },
            answers: [{ value: 'Correct' }, { value: 'Incorrect' }],
            duration: 30,
          }}
          submittedAnswer={{ type: QuestionType.MultiChoice, value: 0 }}
          countdown={countdown}
          currentQuestion={2}
          totalQuestions={20}
          nickname="FrostyBear"
          totalScore={10458}
          onChange={onChange}
        />
      </MemoryRouter>,
    )

    expect(screen.getByText('Which answer is correct?')).toBeInTheDocument()
    expect(screen.getByTestId('question-media')).toBeInTheDocument()
    expect(screen.getByText('2 / 20')).toBeInTheDocument()
    expect(screen.getByTestId('progressbar')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Correct' })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'Correct' }))
    expect(onChange).not.toHaveBeenCalled()
  })

  it.each([
    QuestionType.MultiChoice,
    QuestionType.TrueFalse,
    QuestionType.Range,
    QuestionType.TypeAnswer,
    QuestionType.Pin,
    QuestionType.Puzzle,
  ])('renders answer controls for %s questions', (questionType) => {
    const question = {
      type: questionType,
      question: 'Question text',
      ...(questionType === QuestionType.MultiChoice
        ? { answers: [{ value: 'A' }, { value: 'B' }] }
        : {}),
      ...(questionType === QuestionType.Range
        ? { min: 0, max: 100, step: 1 }
        : {}),
      ...(questionType === QuestionType.Pin ? { imageURL: '/map.png' } : {}),
      ...(questionType === QuestionType.Puzzle ? { values: ['A', 'B'] } : {}),
      duration: 30,
    } as Parameters<typeof PlayerQuestionView>[0]['question']

    render(
      <MemoryRouter>
        <PlayerQuestionView
          question={question}
          countdown={countdown}
          currentQuestion={1}
          totalQuestions={6}
          nickname="FrostyBear"
          totalScore={0}
        />
      </MemoryRouter>,
    )

    expect(screen.getByText('Question text')).toBeInTheDocument()
    expect(screen.getByTestId('progressbar')).toBeInTheDocument()
    expect(screen.getByText('1 / 6')).toBeInTheDocument()
  })
})
