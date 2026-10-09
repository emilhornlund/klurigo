import { MediaType, QuestionType } from '@klurigo/common'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import PlayerQuestionView from './PlayerQuestionView'

const countdown = {
  initiatedTime: '2025-10-12T11:59:59.000Z',
  expiryTime: '2025-10-12T12:00:01.000Z',
  serverTime: '2025-10-12T12:00:00.000Z',
}

describe('PlayerQuestionView', () => {
  it('renders question presentation and answer interactions', async () => {
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
          onChange={onChange}
        />
      </MemoryRouter>,
    )

    expect(screen.getByText('Which answer is correct?')).toBeInTheDocument()
    expect(screen.getByTestId('question-media')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Correct' })).toBeDisabled()
    expect(screen.queryByText('2 / 20')).not.toBeInTheDocument()
    expect(screen.queryByText('FrostyBear')).not.toBeInTheDocument()

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
        <PlayerQuestionView question={question} countdown={countdown} />
      </MemoryRouter>,
    )

    expect(screen.getByText('Question text')).toBeInTheDocument()
  })
})
