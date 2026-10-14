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
    expect(screen.getByTestId('question-media').parentElement).toHaveClass(
      'hasMedia',
    )
    expect(screen.getByTestId('question-media')).toHaveClass('mediaArea')
    expect(
      screen
        .getByTestId('question-media')
        .parentElement?.querySelector('[class*=answerArea]'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Correct' })).toBeDisabled()
    expect(screen.queryByText('2 / 20')).not.toBeInTheDocument()
    expect(screen.queryByText('FrostyBear')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Correct' }))
    expect(onChange).not.toHaveBeenCalled()
  })

  it.each([MediaType.Audio, MediaType.Video])(
    'renders %s media between the question heading and answer controls',
    (mediaType) => {
      const { container } = render(
        <MemoryRouter>
          <PlayerQuestionView
            question={{
              type: QuestionType.MultiChoice,
              question: 'Question with media',
              media: {
                type: mediaType,
                url: `https://media.test/${mediaType}`,
              },
              answers: [{ value: 'Answer' }],
              duration: 30,
            }}
            countdown={countdown}
          />
        </MemoryRouter>,
      )

      const heading = screen.getByText('Question with media')
      const media = screen.getByTestId('question-media')
      const answer = screen.getByRole('button', { name: 'Answer' })

      expect(heading.compareDocumentPosition(media)).toBe(
        Node.DOCUMENT_POSITION_FOLLOWING,
      )
      expect(media.compareDocumentPosition(answer)).toBe(
        Node.DOCUMENT_POSITION_FOLLOWING,
      )
      expect(media.querySelector('[class*="playerWrapper"]')).toBeTruthy()
      expect(container.querySelector('img')).toBeNull()
    },
  )

  it('keeps the heading and answer controls when a question has no media', () => {
    render(
      <MemoryRouter>
        <PlayerQuestionView
          question={{
            type: QuestionType.MultiChoice,
            question: 'Question without media',
            answers: [{ value: 'Answer' }],
            duration: 30,
          }}
          countdown={countdown}
        />
      </MemoryRouter>,
    )

    expect(screen.getByText('Question without media')).toBeInTheDocument()
    expect(screen.queryByTestId('question-media')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Answer' })).toBeInTheDocument()
    expect(
      screen
        .getByRole('button', { name: 'Answer' })
        .closest('[class*=answerArea]'),
    ).toBeInTheDocument()
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

    const { container } = render(
      <MemoryRouter>
        <PlayerQuestionView question={question} countdown={countdown} />
      </MemoryRouter>,
    )

    expect(screen.getByText('Question text')).toBeInTheDocument()
    if (questionType === QuestionType.Pin) {
      expect(screen.getByTestId('pin-answer')).toBeInTheDocument()
      expect(container.firstElementChild).toHaveClass('pinQuestion')
    }
    if (questionType === QuestionType.Puzzle) {
      expect(container.firstElementChild).toHaveClass('puzzleQuestion')
    }
  })
})
