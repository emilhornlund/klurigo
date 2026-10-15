import { MediaType, QuestionType } from '@klurigo/common'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import QuestionView from './QuestionView'

const countdown = {
  initiatedTime: '2025-10-12T11:59:59.000Z',
  expiryTime: '2025-10-12T12:00:01.000Z',
  serverTime: '2025-10-12T12:00:00.000Z',
}

describe('QuestionView', () => {
  it.each([
    QuestionType.MultiChoice,
    QuestionType.TrueFalse,
    QuestionType.Range,
    QuestionType.TypeAnswer,
    QuestionType.Pin,
    QuestionType.Puzzle,
  ])('renders the question presentation for %s', (type) => {
    const question = {
      type,
      question: 'Question text',
      ...(type === QuestionType.MultiChoice
        ? { answers: [{ value: 'A' }, { value: 'B' }] }
        : {}),
      ...(type === QuestionType.Range ? { min: 0, max: 10, step: 1 } : {}),
      ...(type === QuestionType.Pin ? { imageURL: '/map.png' } : {}),
      ...(type === QuestionType.Puzzle ? { values: ['A', 'B'] } : {}),
      duration: 30,
    } as Parameters<typeof QuestionView>[0]['question']

    const { container } = render(
      <MemoryRouter>
        <QuestionView question={question} countdown={countdown} />
      </MemoryRouter>,
    )

    expect(screen.getByText('Question text')).toBeInTheDocument()
    if (type === QuestionType.Pin) {
      expect(screen.getByTestId('pin-answer')).toBeInTheDocument()
      expect(container.firstElementChild).toHaveClass('pinQuestion')
    }
    if (type === QuestionType.Puzzle) {
      expect(container.firstElementChild).toHaveClass('puzzleQuestion')
    }
  })

  it('renders media, submitted answer, and optional content in non-interactive mode', () => {
    render(
      <MemoryRouter>
        <QuestionView
          question={{
            type: QuestionType.MultiChoice,
            question: 'Question with media',
            media: { type: MediaType.Image, url: '/question.png' },
            answers: [{ value: 'Correct' }, { value: 'Other' }],
            duration: 30,
          }}
          countdown={countdown}
          interactive={false}
          submittedAnswer={{ type: QuestionType.MultiChoice, value: 0 }}>
          <aside>Additional information</aside>
        </QuestionView>
      </MemoryRouter>,
    )

    const heading = screen.getByRole('heading', { name: 'Question with media' })
    const additionalContent = screen.getByText('Additional information')
    const media = screen.getByTestId('question-media')
    const answer = screen.getByRole('button', { name: 'Correct' })

    expect(heading.compareDocumentPosition(additionalContent)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    )
    expect(additionalContent.compareDocumentPosition(media)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    )
    expect(media.compareDocumentPosition(answer)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    )
    expect(screen.getByRole('button', { name: 'Correct' })).toBeDisabled()
  })

  it('keeps heading and answers visible when media is absent', () => {
    render(
      <MemoryRouter>
        <QuestionView
          question={{
            type: QuestionType.TrueFalse,
            question: 'No media needed',
            duration: 30,
          }}
        />
      </MemoryRouter>,
    )

    expect(
      screen.getByRole('heading', { name: 'No media needed' }),
    ).toBeInTheDocument()
    expect(screen.queryByTestId('question-media')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'True' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'False' })).toBeInTheDocument()
  })

  it.each([MediaType.Audio, MediaType.Video])(
    'places %s media between the heading and answer controls',
    (mediaType) => {
      render(
        <MemoryRouter>
          <QuestionView
            question={{
              type: QuestionType.MultiChoice,
              question: 'Listen or watch',
              media: { type: mediaType, url: `/media.${mediaType}` },
              answers: [{ value: 'Answer' }],
              duration: 30,
            }}
          />
        </MemoryRouter>,
      )

      const heading = screen.getByRole('heading', { name: 'Listen or watch' })
      const media = screen.getByTestId('question-media')
      const answer = screen.getByRole('button', { name: 'Answer' })

      expect(heading.compareDocumentPosition(media)).toBe(
        Node.DOCUMENT_POSITION_FOLLOWING,
      )
      expect(
        media.querySelector('[class*="playerWrapper"]'),
      ).toBeInTheDocument()
      expect(media.compareDocumentPosition(answer)).toBe(
        Node.DOCUMENT_POSITION_FOLLOWING,
      )
    },
  )

  it('uses player media presentation when explicitly requested without changing answer behavior', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <QuestionView
          question={{
            type: QuestionType.TrueFalse,
            question: 'Listen closely',
            media: { type: MediaType.Audio, url: '/audio.mp3' },
            duration: 30,
          }}
          mediaPresentation="player"
          onChange={onChange}
        />
      </MemoryRouter>,
    )

    expect(
      screen.getByRole('group', { name: 'Audio question' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Listen up!')).toBeInTheDocument()
    expect(screen.queryByText(/playerWrapper/)).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'True' }))
    expect(onChange).toHaveBeenCalledWith({
      type: QuestionType.TrueFalse,
      value: true,
    })
  })

  it('passes interactive answer changes to the picker callback', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <QuestionView
          question={{
            type: QuestionType.MultiChoice,
            question: 'Choose one',
            answers: [{ value: 'A' }, { value: 'B' }],
            duration: 30,
          }}
          onChange={onChange}
        />
      </MemoryRouter>,
    )

    const answer = screen.getByRole('button', { name: 'A' })
    await user.click(answer)
    expect(onChange).toHaveBeenCalledWith({
      type: QuestionType.MultiChoice,
      optionIndex: 0,
    })
  })

  it('disables interactive answers while loading', () => {
    render(
      <MemoryRouter>
        <QuestionView
          question={{
            type: QuestionType.MultiChoice,
            question: 'Choose one',
            answers: [{ value: 'A' }, { value: 'B' }],
            duration: 30,
          }}
          loading
        />
      </MemoryRouter>,
    )

    expect(screen.getByRole('button', { name: 'A' })).toBeDisabled()
  })
})
