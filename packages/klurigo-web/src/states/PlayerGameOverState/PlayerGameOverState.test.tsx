import { GameEventType, GameMode } from '@klurigo/common'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const h = vi.hoisted(() => ({
  isUserAuthenticated: false,
  revokeGame: vi.fn(() => Promise.resolve()),
  createOrUpdateGameRating: vi.fn(() => Promise.resolve()),
  Math_random: 0.1,
}))

vi.mock('../../context/auth', () => ({
  useAuthContext: () => ({
    isUserAuthenticated: h.isUserAuthenticated,
    revokeGame: h.revokeGame,
  }),
}))

vi.mock('../../context/game', () => ({
  useGameContext: () => ({
    createOrUpdateGameRating: h.createOrUpdateGameRating,
  }),
}))

import PlayerGameOverState from './PlayerGameOverState'

const makeEvent = (
  overrides: Partial<Parameters<typeof PlayerGameOverState>[0]['event']> = {},
) => ({
  type: GameEventType.GameOverPlayer as const,
  game: { id: 'game-42', mode: GameMode.Classic },
  quiz: { id: 'quiz-1', title: 'Science Quiz' },
  player: {
    nickname: 'FrostyBear',
    rank: 1,
    totalPlayers: 10,
    score: 8500,
    currentStreak: 5,
    comebackRankGain: 0,
    behind: null,
  },
  rating: {
    canRateQuiz: true,
    stars: undefined,
    comment: undefined,
  },
  ...overrides,
})

describe('PlayerGameOverState', () => {
  beforeEach(() => {
    h.isUserAuthenticated = false
    h.revokeGame.mockClear()
    h.createOrUpdateGameRating.mockClear()
    vi.spyOn(Math, 'random').mockReturnValue(h.Math_random)
  })

  it('renders rank badge, score, quiz title, and rating card', () => {
    render(
      <MemoryRouter>
        <PlayerGameOverState event={makeEvent()} />
      </MemoryRouter>,
    )

    expect(screen.getByText('Science Quiz')).toBeInTheDocument()
    expect(screen.getByText('8500')).toBeInTheDocument()
    expect(screen.getByText('out of 10 players')).toBeInTheDocument()
    expect(screen.getByText('Rate this quiz')).toBeInTheDocument()
  })

  it('renders confetti for rank 1', () => {
    const { container } = render(
      <MemoryRouter>
        <PlayerGameOverState event={makeEvent()} />
      </MemoryRouter>,
    )

    expect(container.querySelector('.confettiContainer')).toBeInTheDocument()
    expect(container.querySelectorAll('.confettiParticle')).toHaveLength(70) // epic
  })

  it('renders confetti for rank 2', () => {
    const { container } = render(
      <MemoryRouter>
        <PlayerGameOverState
          event={makeEvent({
            player: {
              nickname: 'P',
              rank: 2,
              totalPlayers: 10,
              score: 100,
              currentStreak: 0,
              comebackRankGain: 0,
              behind: null,
            },
          })}
        />
      </MemoryRouter>,
    )

    expect(container.querySelector('.confettiContainer')).toBeInTheDocument()
    expect(container.querySelectorAll('.confettiParticle')).toHaveLength(45) // major
  })

  it('renders confetti for rank 5', () => {
    const { container } = render(
      <MemoryRouter>
        <PlayerGameOverState
          event={makeEvent({
            player: {
              nickname: 'P',
              rank: 5,
              totalPlayers: 15,
              score: 100,
              currentStreak: 0,
              comebackRankGain: 0,
              behind: null,
            },
          })}
        />
      </MemoryRouter>,
    )

    expect(container.querySelector('.confettiContainer')).toBeInTheDocument()
    expect(container.querySelectorAll('.confettiParticle')).toHaveLength(25) // normal
  })

  it('renders no confetti for rank > 10', () => {
    const { container } = render(
      <MemoryRouter>
        <PlayerGameOverState
          event={makeEvent({
            player: {
              nickname: 'P',
              rank: 11,
              totalPlayers: 20,
              score: 100,
              currentStreak: 0,
              comebackRankGain: 0,
              behind: null,
            },
          })}
        />
      </MemoryRouter>,
    )

    expect(
      container.querySelector('.confettiContainer'),
    ).not.toBeInTheDocument()
  })

  it('renders streak badge when currentStreak >= 2', () => {
    render(
      <MemoryRouter>
        <PlayerGameOverState
          event={makeEvent({
            player: {
              nickname: 'P',
              rank: 1,
              totalPlayers: 10,
              score: 8500,
              currentStreak: 5,
              comebackRankGain: 0,
              behind: null,
            },
          })}
        />
      </MemoryRouter>,
    )

    expect(screen.getByText('Streak')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
  })

  it('does not render streak badge when currentStreak is 0', () => {
    render(
      <MemoryRouter>
        <PlayerGameOverState
          event={makeEvent({
            player: {
              nickname: 'P',
              rank: 1,
              totalPlayers: 10,
              score: 8500,
              currentStreak: 0,
              comebackRankGain: 0,
              behind: null,
            },
          })}
        />
      </MemoryRouter>,
    )

    expect(screen.queryByText('Streak')).toBeNull()
  })

  it('renders comeback indicator when comebackRankGain > 0', () => {
    render(
      <MemoryRouter>
        <PlayerGameOverState
          event={makeEvent({
            player: {
              nickname: 'P',
              rank: 3,
              totalPlayers: 20,
              score: 7000,
              currentStreak: 0,
              comebackRankGain: 7,
              behind: null,
            },
          })}
        />
      </MemoryRouter>,
    )

    expect(screen.getByText('↗ Comeback! +7 ranks')).toBeInTheDocument()
  })

  it('does not render comeback indicator when comebackRankGain is 0', () => {
    render(
      <MemoryRouter>
        <PlayerGameOverState event={makeEvent()} />
      </MemoryRouter>,
    )

    expect(screen.queryByText(/Comeback/)).toBeNull()
  })

  it('renders PointsBehindIndicator when behind is provided', () => {
    render(
      <MemoryRouter>
        <PlayerGameOverState
          event={makeEvent({
            player: {
              nickname: 'P',
              rank: 2,
              totalPlayers: 10,
              score: 100,
              currentStreak: 0,
              comebackRankGain: 0,
              behind: { points: 250, nickname: 'TopPlayer' },
            },
          })}
        />
      </MemoryRouter>,
    )

    expect(screen.getByText(/points behind/i)).toBeInTheDocument()
    expect(screen.getByText('TopPlayer')).toBeInTheDocument()
  })

  it('does not render PointsBehindIndicator when behind is null', () => {
    render(
      <MemoryRouter>
        <PlayerGameOverState event={makeEvent()} />
      </MemoryRouter>,
    )

    expect(screen.queryByText(/points behind/i)).toBeNull()
  })

  it('pre-populates rating stars and comment from event payload', () => {
    render(
      <MemoryRouter>
        <PlayerGameOverState
          event={makeEvent({
            rating: { canRateQuiz: true, stars: 4, comment: 'Great game!' },
          })}
        />
      </MemoryRouter>,
    )

    expect(
      screen.getByPlaceholderText('Optional comment...'),
    ).toBeInTheDocument()
  })

  it('does not render rating card when canRateQuiz is false', () => {
    render(
      <MemoryRouter>
        <PlayerGameOverState
          event={makeEvent({
            rating: { canRateQuiz: false },
          })}
        />
      </MemoryRouter>,
    )

    expect(screen.queryByText('Rate this quiz')).toBeNull()
    expect(screen.queryByRole('button', { name: /Rate \d star/ })).toBeNull()
  })

  it('does not show View Full Results button when user is not authenticated', () => {
    h.isUserAuthenticated = false

    render(
      <MemoryRouter>
        <PlayerGameOverState event={makeEvent()} />
      </MemoryRouter>,
    )

    expect(
      screen.queryByRole('button', { name: 'View Full Results' }),
    ).toBeNull()
  })

  it('shows View Full Results button when user is authenticated', () => {
    h.isUserAuthenticated = true

    render(
      <MemoryRouter>
        <PlayerGameOverState event={makeEvent()} />
      </MemoryRouter>,
    )

    expect(
      screen.getByRole('button', { name: 'View Full Results' }),
    ).toBeInTheDocument()
  })

  it('clicking Back to Home calls revokeGame with redirectTo /', () => {
    render(
      <MemoryRouter>
        <PlayerGameOverState event={makeEvent()} />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Back to Home' }))

    expect(h.revokeGame).toHaveBeenCalledWith({ redirectTo: '/' })
  })

  it('clicking View Full Results calls revokeGame with redirectTo /game/results/:id', () => {
    h.isUserAuthenticated = true

    render(
      <MemoryRouter>
        <PlayerGameOverState
          event={makeEvent({ game: { id: 'game-99', mode: GameMode.Classic } })}
        />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'View Full Results' }))

    expect(h.revokeGame).toHaveBeenCalledWith({
      redirectTo: '/game/results/game-99',
    })
  })

  it('clicking a star triggers the persist callback via the rating hook', () => {
    vi.useFakeTimers()
    try {
      render(
        <MemoryRouter>
          <PlayerGameOverState
            event={makeEvent({ rating: { canRateQuiz: true } })}
          />
        </MemoryRouter>,
      )

      const starButtons = screen.getAllByRole('button', {
        name: /rate \d+ star/i,
      })
      act(() => {
        fireEvent.click(starButtons[4]) // 5 stars
      })

      act(() => {
        vi.advanceTimersByTime(0)
      })

      expect(h.createOrUpdateGameRating).toHaveBeenCalledWith({ stars: 5 })
    } finally {
      vi.clearAllTimers()
      vi.useRealTimers()
    }
  })
})
