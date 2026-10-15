import {
  GameEventType,
  MediaType,
  QuestionType,
  type SubmitQuestionAnswerRequestDto,
} from '@klurigo/common'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

const h = vi.hoisted(() => ({
  submitQuestionAnswer: vi
    .fn<(request: SubmitQuestionAnswerRequestDto) => Promise<void>>()
    .mockResolvedValue(),
}))

vi.mock('../../context/game', () => ({
  useGameContext: () => ({
    submitQuestionAnswer: h.submitQuestionAnswer,
  }),
}))

// ✅ CRITICAL: Prevent ProgressBar interval/timer-driven state updates from firing in these tests.
// This is what triggers your global "failOnReactActWarnings" behavior.
vi.mock('../../components/ProgressBar/ProgressBar', () => ({
  default: function ProgressBarMock() {
    return <div data-testid="progressbar" />
  },
}))

import PlayerQuestionState from './PlayerQuestionState'

const now = Date.now()

function renderState(
  eventOverrides: Partial<
    Parameters<typeof PlayerQuestionState>[0]['event']
  > = {},
) {
  return render(
    <MemoryRouter>
      <PlayerQuestionState
        event={{
          type: GameEventType.GameQuestionPlayer,
          player: { nickname: 'FrostyBear', score: { total: 10458 } },
          question: {
            type: QuestionType.MultiChoice,
            question: 'Who painted The Starry Night?',
            answers: [
              { value: 'Vincent van Gogh' },
              { value: 'Pablo Picasso' },
            ],
            duration: 30,
          },
          countdown: {
            initiatedTime: new Date(now).toISOString(),
            expiryTime: new Date(now + 60 * 1000).toISOString(),
            serverTime: new Date(now).toISOString(),
          },
          pagination: { current: 1, total: 20 },
          ...eventOverrides,
        }}
      />
    </MemoryRouter>,
  )
}

describe('PlayerQuestionState', () => {
  it('shows player media indicators instead of audio and video players', () => {
    renderState({
      question: {
        type: QuestionType.TrueFalse,
        question: 'Listen closely',
        media: { type: MediaType.Audio, url: '/audio.mp3' },
        duration: 30,
      },
    })

    expect(
      screen.getByRole('group', { name: 'Audio question' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Listen up!')).toBeInTheDocument()
    expect(document.querySelector('audio, video')).not.toBeInTheDocument()
  })

  it('should render PlayerQuestionState with question type multi-choice and two answers', () => {
    const { container } = renderState({
      question: {
        type: QuestionType.MultiChoice,
        question: 'Who painted The Starry Night?',
        media: {
          type: MediaType.Image,
          url: 'https://i.pinimg.com/originals/a6/60/72/a66072b0e88258f2898a76c3f3c01041.jpg',
        },
        answers: [{ value: 'Vincent van Gogh' }, { value: 'Pablo Picasso' }],
        duration: 30,
      },
    })

    expect(screen.queryByText('FrostyBear')).not.toBeInTheDocument()
    expect(container).toMatchSnapshot()
  })

  it('should render PlayerQuestionState with question type multi-choice and four answers', () => {
    const { container } = renderState({
      question: {
        type: QuestionType.MultiChoice,
        question: 'Who painted The Starry Night?',
        media: {
          type: MediaType.Image,
          url: 'https://wallpapercave.com/wp/wp2824407.jpg',
        },
        answers: [
          { value: 'Vincent van Gogh' },
          { value: 'Pablo Picasso' },
          { value: 'Leonardo da Vinci' },
          { value: 'Claude Monet' },
        ],
        duration: 30,
      },
    })

    expect(container).toMatchSnapshot()
  })

  it('should render PlayerQuestionState with question type multi-choice and six answers', () => {
    const { container } = renderState({
      question: {
        type: QuestionType.MultiChoice,
        question: 'Who painted The Starry Night?',
        media: {
          type: MediaType.Image,
          url: 'https://wallpaperaccess.com/full/157316.jpg',
        },
        answers: [
          { value: 'Vincent van Gogh' },
          { value: 'Pablo Picasso' },
          { value: 'Leonardo da Vinci' },
          { value: 'Claude Monet' },
          { value: 'Michelangelo' },
          { value: 'Rembrandt' },
        ],
        duration: 30,
      },
    })

    expect(container).toMatchSnapshot()
  })

  it('should render PlayerQuestionState with question type range', () => {
    const { container } = renderState({
      question: {
        type: QuestionType.Range,
        question: "What percentage of the earth's surface is covered by water?",
        min: 0,
        max: 100,
        step: 1,
        duration: 30,
      },
    })

    expect(container).toMatchSnapshot()
  })

  it('should render PlayerQuestionState with question type true false', () => {
    const { container } = renderState({
      question: {
        type: QuestionType.TrueFalse,
        question: "Rabbits can't vomit?",
        duration: 30,
      },
    })

    expect(container).toMatchSnapshot()
  })

  it('should render PlayerQuestionState with question type type answer', () => {
    const { container } = renderState({
      question: {
        type: QuestionType.TypeAnswer,
        question: 'Who painted the Mono Lisa?',
        duration: 30,
      },
    })

    expect(container).toMatchSnapshot()
  })

  it('submits answer when clicking an option (multi-choice)', async () => {
    const user = userEvent.setup()
    h.submitQuestionAnswer.mockClear()

    renderState({
      question: {
        type: QuestionType.MultiChoice,
        question: 'Who painted The Starry Night?',
        answers: [{ value: 'Vincent van Gogh' }, { value: 'Pablo Picasso' }],
        duration: 30,
      },
    })

    await user.click(screen.getByRole('button', { name: 'Vincent van Gogh' }))

    await waitFor(() => {
      expect(h.submitQuestionAnswer).toHaveBeenCalledTimes(1)
    })
  })

  it('prevents a second answer submission while the first is pending', async () => {
    const user = userEvent.setup()
    let resolveSubmission!: () => void
    h.submitQuestionAnswer.mockImplementation(
      () => new Promise<void>((resolve) => (resolveSubmission = resolve)),
    )

    renderState({
      question: {
        type: QuestionType.MultiChoice,
        question: 'Pick once',
        answers: [{ value: 'A' }, { value: 'B' }],
        duration: 30,
      },
    })

    const answer = screen.getByRole('button', { name: 'A' })
    await user.click(answer)
    expect(answer).toBeDisabled()

    await user.click(answer)
    expect(h.submitQuestionAnswer).toHaveBeenCalledTimes(1)

    await act(async () => {
      resolveSubmission()
      await Promise.resolve()
    })
    expect(answer).not.toBeDisabled()
  })

  it('does not throw when submitQuestionAnswer is undefined', async () => {
    const user = userEvent.setup()
    const original = h.submitQuestionAnswer

    // @ts-expect-error intentional for test
    h.submitQuestionAnswer = undefined

    renderState({
      question: {
        type: QuestionType.MultiChoice,
        question: 'Pick one',
        answers: [{ value: 'A' }, { value: 'B' }],
        duration: 30,
      },
    })

    // userEvent wraps in act properly
    await user.click(screen.getByRole('button', { name: 'A' }))

    // restore immediately so other tests aren't poisoned
    h.submitQuestionAnswer = original
  })
})
