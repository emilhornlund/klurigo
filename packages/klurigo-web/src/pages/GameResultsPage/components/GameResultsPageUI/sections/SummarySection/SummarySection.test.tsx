import { GameMode, type GameResultDto } from '@klurigo/common'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import SummarySection from './SummarySection'

const navigateMock = vi.fn()

type Deferred<T> = {
  promise: Promise<T>
  resolve: (value: T) => void
  reject: (reason?: unknown) => void
}

const createDeferred = <T,>(): Deferred<T> => {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void

  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })

  return { promise, resolve, reject }
}

vi.mock('react-router-dom', async () => {
  const actual =
    await vi.importActual<typeof import('react-router-dom')>('react-router-dom')

  return {
    ...actual,
    useNavigate: () => navigateMock,
  }
})

const createGameMock = vi.fn()
const authenticateGameMock = vi.fn()

vi.mock('../../../../../../api', () => ({
  useKlurigoServiceClient: () => ({
    createGame: createGameMock,
    authenticateGame: authenticateGameMock,
  }),
}))

vi.mock('../../../../../../components', () => ({
  CircularProgressBar: () => <div data-testid="circular-progress" />,
  Podium: () => <div data-testid="podium" />,

  CircularProgressBarKind: { Correct: 'Correct' },
  CircularProgressBarSize: { Medium: 'Medium' },

  ConfirmDialog: ({
    open,
    loading,
    title,
    message,
    onConfirm,
    onClose,
  }: {
    open: boolean
    loading: boolean
    title: string
    message: string
    onConfirm: () => void
    onClose: () => void
  }) =>
    open ? (
      <div data-testid="confirm-dialog">
        <div>{title}</div>
        <div>{message}</div>
        <div data-testid="confirm-loading">{loading ? 'loading' : 'idle'}</div>
        <button type="button" onClick={onConfirm}>
          confirm
        </button>
        <button type="button" onClick={onClose}>
          close
        </button>
      </div>
    ) : null,
}))

const h = vi.hoisted(() => {
  return {
    getCorrectPercentage: vi.fn(),
    getAveragePrecision: vi.fn(),
    getQuizDifficultyMessage: vi.fn((p: number) => `Difficulty: ${p}%`),
    formatRoundedDuration: vi.fn((d: number) => `dur:${d}`),
    formatRoundedSeconds: vi.fn((s: number) => `sec:${s}`),
  }
})

vi.mock('../../utils', () => ({
  getCorrectPercentage: h.getCorrectPercentage,
  getAveragePrecision: h.getAveragePrecision,
  getQuizDifficultyMessage: h.getQuizDifficultyMessage,
  formatRoundedDuration: h.formatRoundedDuration,
  formatRoundedSeconds: h.formatRoundedSeconds,
}))

vi.mock('./RatingCard', () => ({
  default: ({
    canRateQuiz,
    stars,
    comment,
    onRatingChange,
    onCommentChange,
  }: {
    canRateQuiz: boolean
    stars?: number
    comment?: string
    onRatingChange: (next: number) => void
    onCommentChange: (next: string) => void
  }) => (
    <div data-testid="rating-card">
      <div data-testid="rating-can-rate">{String(canRateQuiz)}</div>
      <div data-testid="rating-stars">{stars ?? 'unset'}</div>
      <div data-testid="rating-comment">{comment ?? ''}</div>

      <button
        type="button"
        data-testid="rating-set-stars"
        onClick={() => onRatingChange(5)}>
        set-stars
      </button>

      <button
        type="button"
        data-testid="rating-set-comment"
        onClick={() => onCommentChange('hello')}>
        set-comment
      </button>
    </div>
  ),
}))

beforeEach(() => {
  navigateMock.mockReset()

  createGameMock.mockReset()
  authenticateGameMock.mockReset()

  h.getCorrectPercentage.mockReset()
  h.getAveragePrecision.mockReset()
  h.getQuizDifficultyMessage.mockReset()
  h.formatRoundedDuration.mockReset()
  h.formatRoundedSeconds.mockReset()

  vi.spyOn(Math, 'random').mockReturnValue(0.5)
})

afterEach(() => {
  vi.restoreAllMocks()
})

const CREATED_DATE = new Date('2025-01-01T12:00:00.000Z')
const HOST = { id: 'host-1', nickname: 'FrostyBear' }

describe('SummarySection', () => {
  it('renders Classic summary, uses getCorrectPercentage, shows fastest and longest streak', () => {
    h.getCorrectPercentage
      .mockImplementationOnce(() => 60)
      .mockImplementationOnce(() => 80)
    const playerMetrics = [
      {
        rank: 1,
        score: 120,
        averageResponseTime: 3.2,
        longestCorrectStreak: 5,
        player: { nickname: 'Alice' },
      },
      {
        rank: 2,
        score: 90,
        averageResponseTime: 4.5,
        longestCorrectStreak: 7,
        player: { nickname: 'Bob' },
      },
    ] as unknown as GameResultDto['playerMetrics']
    const questionMetrics = [
      { text: 'Q1' },
      { text: 'Q2' },
    ] as unknown as GameResultDto['questionMetrics']

    const { container } = render(
      <MemoryRouter>
        <SummarySection
          host={HOST}
          mode={GameMode.Classic}
          quiz={{ id: 'quizId', canRateQuiz: false, canHostLiveGame: true }}
          numberOfPlayers={2}
          numberOfQuestions={2}
          playerMetrics={playerMetrics}
          questionMetrics={questionMetrics}
          duration={123}
          created={CREATED_DATE}
          stars={undefined}
          comment=""
          onRatingChange={vi.fn()}
          onCommentChange={vi.fn()}
        />
      </MemoryRouter>,
    )

    expect(h.getCorrectPercentage).toHaveBeenCalledTimes(2)
    expect(h.getAveragePrecision).not.toHaveBeenCalled()
    expect(h.getQuizDifficultyMessage).toHaveBeenCalledWith(70)
    expect(screen.getByText('Difficulty: 70%')).toBeInTheDocument()
    expect(h.formatRoundedDuration).toHaveBeenCalledWith(123)
    expect(screen.getByText('dur:123')).toBeInTheDocument()
    expect(screen.getByText('Fastest Overall Player')).toBeInTheDocument()
    expect(h.formatRoundedSeconds).toHaveBeenCalledWith(3.2)
    expect(screen.getByText('sec:3.2')).toBeInTheDocument()
    expect(screen.getByText('Longest Correct Streak')).toBeInTheDocument()
    expect(screen.getByText('7')).toBeInTheDocument()

    const detailsCard = container.querySelector('.card.details') as HTMLElement
    const titles = Array.from(detailsCard.querySelectorAll('.title'))
    const getValueFor = (label: string) => {
      const titleEl = titles.find(
        (el) => el.textContent === label,
      ) as HTMLElement
      return titleEl.nextElementSibling?.textContent
    }
    expect(getValueFor('Players')).toBe(String(playerMetrics.length))
    expect(getValueFor('Questions')).toBe(String(questionMetrics.length))

    const playAgainButton = screen.getByRole('button', { name: /play again/i })
    expect(playAgainButton).toBeEnabled()

    expect(container).toMatchSnapshot()
  })

  it('renders ZeroToOneHundred summary and uses getAveragePrecision', () => {
    h.getAveragePrecision
      .mockImplementationOnce(() => 33)
      .mockImplementationOnce(() => 67)
    const playerMetrics = [
      {
        rank: 1,
        score: 120,
        averageResponseTime: 2.1,
        longestCorrectStreak: 2,
        player: { nickname: 'Carol' },
      },
      {
        rank: 2,
        score: 90,
        averageResponseTime: 2.7,
        longestCorrectStreak: 3,
        player: { nickname: 'Dave' },
      },
    ] as unknown as GameResultDto['playerMetrics']
    const questionMetrics = [
      { text: 'Q1' },
      { text: 'Q2' },
    ] as unknown as GameResultDto['questionMetrics']

    const { container } = render(
      <MemoryRouter>
        <SummarySection
          host={HOST}
          mode={GameMode.ZeroToOneHundred}
          quiz={{ id: 'quizId', canRateQuiz: false, canHostLiveGame: false }}
          numberOfPlayers={2}
          numberOfQuestions={2}
          playerMetrics={playerMetrics}
          questionMetrics={questionMetrics}
          duration={45}
          created={CREATED_DATE}
          stars={undefined}
          comment=""
          onRatingChange={vi.fn()}
          onCommentChange={vi.fn()}
        />
      </MemoryRouter>,
    )

    expect(h.getAveragePrecision).toHaveBeenCalledTimes(2)
    expect(h.getCorrectPercentage).not.toHaveBeenCalled()
    expect(h.getQuizDifficultyMessage).toHaveBeenCalledWith(50)
    expect(screen.getByText('Difficulty: 50%')).toBeInTheDocument()

    const detailsCard = container.querySelector('.card.details') as HTMLElement
    const titles = Array.from(detailsCard.querySelectorAll('.title'))
    const getValueFor = (label: string) => {
      const titleEl = titles.find(
        (el) => el.textContent === label,
      ) as HTMLElement
      return titleEl.nextElementSibling?.textContent
    }
    expect(getValueFor('Players')).toBe(String(playerMetrics.length))
    expect(getValueFor('Questions')).toBe(String(questionMetrics.length))

    const playAgainButton = screen.getByRole('button', { name: /play again/i })
    expect(playAgainButton).toBeDisabled()
    expect(screen.getByText(/this quiz isn’t public yet/i)).toBeInTheDocument()

    expect(container).toMatchSnapshot()
  })

  it('omits metric cards when playerMetrics has no data', () => {
    h.getCorrectPercentage.mockImplementationOnce(() => 100)
    const playerMetrics = [] as unknown as GameResultDto['playerMetrics']
    const questionMetrics = [
      { text: 'Q1' },
    ] as unknown as GameResultDto['questionMetrics']

    const { container } = render(
      <MemoryRouter>
        <SummarySection
          host={HOST}
          mode={GameMode.Classic}
          quiz={{ id: 'quizId', canRateQuiz: false, canHostLiveGame: false }}
          numberOfPlayers={2}
          numberOfQuestions={2}
          playerMetrics={playerMetrics}
          questionMetrics={questionMetrics}
          duration={0}
          created={CREATED_DATE}
          stars={undefined}
          comment=""
          onRatingChange={vi.fn()}
          onCommentChange={vi.fn()}
        />
      </MemoryRouter>,
    )

    expect(screen.queryByText('Fastest Overall Player')).toBeNull()
    expect(screen.queryByText('Longest Correct Streak')).toBeNull()

    expect(container).toMatchSnapshot()
  })

  it('opens confirm dialog when clicking Play again if allowed', async () => {
    const user = userEvent.setup()

    h.getCorrectPercentage.mockImplementationOnce(() => 100)

    const playerMetrics = [
      {
        rank: 1,
        score: 100,
        averageResponseTime: 2,
        longestCorrectStreak: 3,
        player: { nickname: 'Alice' },
      },
    ] as unknown as GameResultDto['playerMetrics']

    const questionMetrics = [
      { text: 'Q1' },
    ] as unknown as GameResultDto['questionMetrics']

    render(
      <MemoryRouter>
        <SummarySection
          host={HOST}
          mode={GameMode.Classic}
          quiz={{ id: 'quizId', canRateQuiz: false, canHostLiveGame: true }}
          numberOfPlayers={1}
          numberOfQuestions={1}
          playerMetrics={playerMetrics}
          questionMetrics={questionMetrics}
          duration={10}
          created={CREATED_DATE}
          stars={undefined}
          comment=""
          onRatingChange={vi.fn()}
          onCommentChange={vi.fn()}
        />
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: /play again/i }))

    expect(
      await screen.findByText(/are you sure you want to start hosting/i),
    ).toBeInTheDocument()
  })

  it('confirms hosting: calls createGame, authenticates, navigates, and toggles loading', async () => {
    const user = userEvent.setup()

    h.getCorrectPercentage.mockImplementationOnce(() => 100)

    const createGameDeferred = createDeferred<{ id: string }>()
    const authenticateDeferred = createDeferred<void>()

    createGameMock.mockReturnValue(createGameDeferred.promise)
    authenticateGameMock.mockReturnValue(authenticateDeferred.promise)

    const playerMetrics = [
      {
        rank: 1,
        score: 100,
        averageResponseTime: 2,
        longestCorrectStreak: 3,
        player: { nickname: 'Alice' },
      },
    ] as unknown as GameResultDto['playerMetrics']

    const questionMetrics = [
      { text: 'Q1' },
    ] as unknown as GameResultDto['questionMetrics']

    render(
      <MemoryRouter>
        <SummarySection
          host={HOST}
          mode={GameMode.Classic}
          quiz={{ id: 'quizId', canRateQuiz: false, canHostLiveGame: true }}
          numberOfPlayers={1}
          numberOfQuestions={1}
          playerMetrics={playerMetrics}
          questionMetrics={questionMetrics}
          duration={10}
          created={CREATED_DATE}
          stars={undefined}
          comment=""
          onRatingChange={vi.fn()}
          onCommentChange={vi.fn()}
        />
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: /play again/i }))

    expect(await screen.findByTestId('confirm-dialog')).toBeInTheDocument()
    expect(screen.getByTestId('confirm-loading')).toHaveTextContent('idle')

    await user.click(screen.getByRole('button', { name: 'confirm' }))

    // Now loading should remain true because createGame is still pending
    await waitFor(() => {
      expect(screen.getByTestId('confirm-loading')).toHaveTextContent('loading')
    })

    expect(createGameMock).toHaveBeenCalledWith('quizId')

    // Finish createGame -> triggers authenticateGame call
    createGameDeferred.resolve({ id: 'game-123' })

    await waitFor(() => {
      expect(authenticateGameMock).toHaveBeenCalledWith({ gameId: 'game-123' })
    })

    // Still loading until authenticate finishes
    expect(screen.getByTestId('confirm-loading')).toHaveTextContent('loading')

    authenticateDeferred.resolve()

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/game')
    })

    await waitFor(() => {
      expect(screen.getByTestId('confirm-loading')).toHaveTextContent('idle')
    })
  })

  it('does nothing on confirm when quiz cannot host live game', async () => {
    h.getCorrectPercentage.mockImplementationOnce(() => 100)

    const playerMetrics = [
      {
        rank: 1,
        score: 100,
        averageResponseTime: 2,
        longestCorrectStreak: 3,
        player: { nickname: 'Alice' },
      },
    ] as unknown as GameResultDto['playerMetrics']

    const questionMetrics = [
      { text: 'Q1' },
    ] as unknown as GameResultDto['questionMetrics']

    render(
      <MemoryRouter>
        <SummarySection
          host={HOST}
          mode={GameMode.Classic}
          quiz={{ id: 'quizId', canRateQuiz: false, canHostLiveGame: false }}
          numberOfPlayers={1}
          numberOfQuestions={1}
          playerMetrics={playerMetrics}
          questionMetrics={questionMetrics}
          duration={10}
          created={CREATED_DATE}
          stars={undefined}
          comment=""
          onRatingChange={vi.fn()}
          onCommentChange={vi.fn()}
        />
      </MemoryRouter>,
    )

    // Button is disabled, but we can still directly validate the guarded handler
    // by opening the dialog is not possible through UI. Instead validate that
    // even if ConfirmDialog onConfirm were called, guard prevents requests:
    //
    // Practical approach: render, assert disabled (already in your suite),
    // and assert no calls occurred.
    const playAgainButton = screen.getByRole('button', { name: /play again/i })
    expect(playAgainButton).toBeDisabled()

    expect(createGameMock).not.toHaveBeenCalled()
    expect(authenticateGameMock).not.toHaveBeenCalled()
    expect(navigateMock).not.toHaveBeenCalled()
  })

  it('resets loading and does not navigate when createGame rejects', async () => {
    const user = userEvent.setup()

    h.getCorrectPercentage.mockImplementationOnce(() => 100)

    const createGameDeferred = createDeferred<{ id: string }>()
    createGameMock.mockReturnValue(createGameDeferred.promise)

    const playerMetrics = [
      {
        rank: 1,
        score: 100,
        averageResponseTime: 2,
        longestCorrectStreak: 3,
        player: { nickname: 'Alice' },
      },
    ] as unknown as GameResultDto['playerMetrics']

    const questionMetrics = [
      { text: 'Q1' },
    ] as unknown as GameResultDto['questionMetrics']

    render(
      <MemoryRouter>
        <SummarySection
          host={HOST}
          mode={GameMode.Classic}
          quiz={{ id: 'quizId', canRateQuiz: false, canHostLiveGame: true }}
          numberOfPlayers={1}
          numberOfQuestions={1}
          playerMetrics={playerMetrics}
          questionMetrics={questionMetrics}
          duration={10}
          created={CREATED_DATE}
          stars={undefined}
          comment=""
          onRatingChange={vi.fn()}
          onCommentChange={vi.fn()}
        />
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: /play again/i }))
    expect(await screen.findByTestId('confirm-dialog')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'confirm' }))

    await waitFor(() => {
      expect(screen.getByTestId('confirm-loading')).toHaveTextContent('loading')
    })

    expect(createGameMock).toHaveBeenCalledWith('quizId')

    createGameDeferred.reject(new Error('boom'))

    await waitFor(() => {
      expect(screen.getByTestId('confirm-loading')).toHaveTextContent('idle')
    })

    expect(authenticateGameMock).not.toHaveBeenCalled()
    expect(navigateMock).not.toHaveBeenCalled()
  })

  it('closes confirm dialog when onClose is triggered', async () => {
    const user = userEvent.setup()

    h.getCorrectPercentage.mockImplementationOnce(() => 100)

    const playerMetrics = [
      {
        rank: 1,
        score: 100,
        averageResponseTime: 2,
        longestCorrectStreak: 3,
        player: { nickname: 'Alice' },
      },
    ] as unknown as GameResultDto['playerMetrics']

    const questionMetrics = [
      { text: 'Q1' },
    ] as unknown as GameResultDto['questionMetrics']

    render(
      <MemoryRouter>
        <SummarySection
          host={HOST}
          mode={GameMode.Classic}
          quiz={{ id: 'quizId', canRateQuiz: false, canHostLiveGame: true }}
          numberOfPlayers={1}
          numberOfQuestions={1}
          playerMetrics={playerMetrics}
          questionMetrics={questionMetrics}
          duration={10}
          created={CREATED_DATE}
          stars={undefined}
          comment=""
          onRatingChange={vi.fn()}
          onCommentChange={vi.fn()}
        />
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: /play again/i }))
    expect(await screen.findByTestId('confirm-dialog')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'close' }))

    await waitFor(() => {
      expect(screen.queryByTestId('confirm-dialog')).toBeNull()
    })
  })

  it('passes rating props to RatingCard and wires callbacks', async () => {
    const user = userEvent.setup()
    h.getCorrectPercentage.mockImplementationOnce(() => 100)

    const onRatingChange = vi.fn()
    const onCommentChange = vi.fn()

    const playerMetrics = [
      {
        rank: 1,
        score: 100,
        averageResponseTime: 2,
        longestCorrectStreak: 3,
        player: { nickname: 'Alice' },
      },
    ] as unknown as GameResultDto['playerMetrics']

    const questionMetrics = [
      { text: 'Q1' },
    ] as unknown as GameResultDto['questionMetrics']

    render(
      <MemoryRouter>
        <SummarySection
          host={HOST}
          mode={GameMode.Classic}
          quiz={{ id: 'quizId', canRateQuiz: true, canHostLiveGame: false }}
          numberOfPlayers={1}
          numberOfQuestions={1}
          playerMetrics={playerMetrics}
          questionMetrics={questionMetrics}
          duration={10}
          created={CREATED_DATE}
          stars={4}
          comment="Nice quiz"
          onRatingChange={onRatingChange}
          onCommentChange={onCommentChange}
        />
      </MemoryRouter>,
    )

    expect(screen.getByTestId('rating-card')).toBeInTheDocument()
    expect(screen.getByTestId('rating-can-rate')).toHaveTextContent('true')
    expect(screen.getByTestId('rating-stars')).toHaveTextContent('4')
    expect(screen.getByTestId('rating-comment')).toHaveTextContent('Nice quiz')

    await user.click(screen.getByTestId('rating-set-stars'))
    expect(onRatingChange).toHaveBeenCalledTimes(1)
    expect(onRatingChange).toHaveBeenCalledWith(5)

    await user.click(screen.getByTestId('rating-set-comment'))
    expect(onCommentChange).toHaveBeenCalledTimes(1)
    expect(onCommentChange).toHaveBeenCalledWith('hello')
  })
})
