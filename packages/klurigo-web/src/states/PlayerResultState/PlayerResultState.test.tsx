import {
  GameEventType,
  GameMode,
  type GameResultPlayerEvent,
} from '@klurigo/common'
import { render, screen } from '@testing-library/react'
import { act } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import PlayerResultState from './PlayerResultState'

const h = vi.hoisted(() => ({
  getPositionMessage: vi.fn(
    (pos: number, correctness: string) => `Message for ${pos} - ${correctness}`,
  ),
}))

vi.mock('./message.utils', () => ({
  getPositionMessage: h.getPositionMessage,
}))

describe('PlayerResultState', () => {
  beforeEach(() => {
    h.getPositionMessage.mockClear()
    vi.spyOn(Math, 'random').mockReturnValue(0.1)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('renders correct result with behind indicator', () => {
    const { container } = render(
      <MemoryRouter>
        <PlayerResultState
          event={{
            type: GameEventType.GameResultPlayer,
            game: { mode: GameMode.Classic },
            player: {
              nickname: 'FrostyBear',
              score: {
                correct: true,
                last: 634,
                total: 10458,
                position: 1,
                streak: 3,
              },
              behind: { points: 123, nickname: 'WhiskerFox' },
            },
            pagination: { current: 1, total: 20 },
          }}
        />
      </MemoryRouter>,
    )
    expect(screen.getByText('Correct')).toBeInTheDocument()
    expect(screen.getByText('Streak')).toBeInTheDocument()
    expect(screen.getByText('634')).toBeInTheDocument()
    expect(screen.getByText('Message for 1 - correct')).toBeInTheDocument()
    expect(screen.getByText(/points behind/i)).toBeInTheDocument()
    expect(h.getPositionMessage).toHaveBeenCalledWith(1, 'correct')
    expect(container).toMatchSnapshot()
  })

  it('renders incorrect result without behind indicator', () => {
    const { container } = render(
      <MemoryRouter>
        <PlayerResultState
          event={{
            type: GameEventType.GameResultPlayer,
            game: { mode: GameMode.Classic },
            player: {
              nickname: 'Radar',
              score: {
                correct: false,
                last: 0,
                total: 9000,
                position: 7,
                streak: 0,
              },
            },
            pagination: { current: 2, total: 20 },
          }}
        />
      </MemoryRouter>,
    )
    expect(screen.getByText('Incorrect')).toBeInTheDocument()
    expect(screen.getByText('0')).toBeInTheDocument()
    expect(screen.getByText('Message for 7 - incorrect')).toBeInTheDocument()
    expect(screen.queryByText(/points behind/i)).toBeNull()
    expect(h.getPositionMessage).toHaveBeenCalledWith(7, 'incorrect')
    expect(container).toMatchSnapshot()
  })

  it('renders partially correct result and awarded points', () => {
    render(
      <MemoryRouter>
        <PlayerResultState
          event={{
            type: GameEventType.GameResultPlayer,
            game: { mode: GameMode.Classic },
            player: {
              nickname: 'AlmostThere',
              score: {
                correct: false,
                last: 250,
                total: 1250,
                position: 2,
                streak: 0,
              },
            },
            pagination: { current: 1, total: 20 },
          }}
        />
      </MemoryRouter>,
    )

    expect(screen.getByText('Partially correct')).toBeInTheDocument()
    expect(screen.getByText('250')).toBeInTheDocument()
    expect(screen.queryByText('Correct')).not.toBeInTheDocument()
    expect(screen.queryByText('Incorrect')).not.toBeInTheDocument()
    expect(h.getPositionMessage).toHaveBeenCalledWith(2, 'partially-correct')
  })

  describe('Celebration Logic', () => {
    it('renders epic celebration for position 1', () => {
      const { container } = render(
        <MemoryRouter>
          <PlayerResultState
            event={{
              type: GameEventType.GameResultPlayer,
              game: { mode: GameMode.Classic },
              player: {
                nickname: 'Winner',
                score: {
                  correct: true,
                  last: 1000,
                  total: 10000,
                  position: 1,
                  streak: 2,
                },
              },
              pagination: { current: 5, total: 20 },
            }}
          />
        </MemoryRouter>,
      )

      // Should have epic celebration
      expect(screen.getByText('Correct')).toBeInTheDocument()
      expect(
        container.querySelector('.badge.celebrationEpic'),
      ).toBeInTheDocument()
      expect(container.querySelector('.confettiContainer')).toBeInTheDocument()
      expect(container.querySelectorAll('.confettiParticle')).toHaveLength(70) // epic particles
      expect(container).toMatchSnapshot()
    })

    it('renders epic celebration for streak 10', () => {
      const { container } = render(
        <MemoryRouter>
          <PlayerResultState
            event={{
              type: GameEventType.GameResultPlayer,
              game: { mode: GameMode.Classic },
              player: {
                nickname: 'StreakMaster',
                score: {
                  correct: true,
                  last: 500,
                  total: 8000,
                  position: 15,
                  streak: 10,
                },
              },
              pagination: { current: 8, total: 20 },
            }}
          />
        </MemoryRouter>,
      )

      // Should have epic celebration
      expect(screen.getByText('Correct')).toBeInTheDocument()
      expect(
        container.querySelector('.badge.celebrationEpic'),
      ).toBeInTheDocument()
      expect(container.querySelector('.confettiContainer')).toBeInTheDocument()
      expect(container.querySelectorAll('.confettiParticle')).toHaveLength(70)
      expect(container).toMatchSnapshot()
    })

    it('renders major celebration for position 3', () => {
      const { container } = render(
        <MemoryRouter>
          <PlayerResultState
            event={{
              type: GameEventType.GameResultPlayer,
              game: { mode: GameMode.Classic },
              player: {
                nickname: 'ThirdPlace',
                score: {
                  correct: true,
                  last: 800,
                  total: 5000,
                  position: 3,
                  streak: 1,
                },
              },
              pagination: { current: 6, total: 20 },
            }}
          />
        </MemoryRouter>,
      )

      // Should have major celebration
      expect(screen.getByText('Correct')).toBeInTheDocument()
      expect(
        container.querySelector('.badge.celebrationMajor'),
      ).toBeInTheDocument()
      expect(container.querySelector('.confettiContainer')).toBeInTheDocument()
      expect(container.querySelectorAll('.confettiParticle')).toHaveLength(45) // major particles
      expect(container).toMatchSnapshot()
    })

    it('renders major celebration for streak 5', () => {
      const { container } = render(
        <MemoryRouter>
          <PlayerResultState
            event={{
              type: GameEventType.GameResultPlayer,
              game: { mode: GameMode.Classic },
              player: {
                nickname: 'StreakBuilder',
                score: {
                  correct: true,
                  last: 400,
                  total: 3000,
                  position: 12,
                  streak: 5,
                },
              },
              pagination: { current: 7, total: 20 },
            }}
          />
        </MemoryRouter>,
      )

      // Should have major celebration
      expect(screen.getByText('Correct')).toBeInTheDocument()
      expect(
        container.querySelector('.badge.celebrationMajor'),
      ).toBeInTheDocument()
      expect(container.querySelector('.confettiContainer')).toBeInTheDocument()
      expect(container.querySelectorAll('.confettiParticle')).toHaveLength(45)
      expect(container).toMatchSnapshot()
    })

    it('renders normal celebration for streak 3', () => {
      const { container } = render(
        <MemoryRouter>
          <PlayerResultState
            event={{
              type: GameEventType.GameResultPlayer,
              game: { mode: GameMode.Classic },
              player: {
                nickname: 'StreakStarter',
                score: {
                  correct: true,
                  last: 300,
                  total: 2000,
                  position: 8,
                  streak: 3,
                },
              },
              pagination: { current: 4, total: 20 },
            }}
          />
        </MemoryRouter>,
      )

      // Should have normal celebration
      expect(screen.getByText('Correct')).toBeInTheDocument()
      expect(
        container.querySelector('.badge.celebrationNormal'),
      ).toBeInTheDocument()
      expect(container.querySelector('.confettiContainer')).toBeInTheDocument()
      expect(container.querySelectorAll('.confettiParticle')).toHaveLength(25) // normal particles
      expect(container).toMatchSnapshot()
    })

    it('renders normal celebration for position 10', () => {
      const { container } = render(
        <MemoryRouter>
          <PlayerResultState
            event={{
              type: GameEventType.GameResultPlayer,
              game: { mode: GameMode.Classic },
              player: {
                nickname: 'TopTen',
                score: {
                  correct: true,
                  last: 200,
                  total: 1500,
                  position: 10,
                  streak: 1,
                },
              },
              pagination: { current: 3, total: 20 },
            }}
          />
        </MemoryRouter>,
      )

      // Should have normal celebration
      expect(screen.getByText('Correct')).toBeInTheDocument()
      expect(
        container.querySelector('.badge.celebrationNormal'),
      ).toBeInTheDocument()
      expect(container.querySelector('.confettiContainer')).toBeInTheDocument()
      expect(container.querySelectorAll('.confettiParticle')).toHaveLength(25)
      expect(container).toMatchSnapshot()
    })

    it('renders no celebration for simple correct answer', () => {
      const { container } = render(
        <MemoryRouter>
          <PlayerResultState
            event={{
              type: GameEventType.GameResultPlayer,
              game: { mode: GameMode.Classic },
              player: {
                nickname: 'SimpleCorrect',
                score: {
                  correct: true,
                  last: 100,
                  total: 800,
                  position: 15,
                  streak: 1,
                },
              },
              pagination: { current: 2, total: 20 },
            }}
          />
        </MemoryRouter>,
      )

      // Should have no celebration
      expect(screen.getByText('Correct')).toBeInTheDocument()
      expect(
        container.querySelector('.badge.celebrationNormal'),
      ).not.toBeInTheDocument()
      expect(
        container.querySelector('.badge.celebrationMajor'),
      ).not.toBeInTheDocument()
      expect(
        container.querySelector('.badge.celebrationEpic'),
      ).not.toBeInTheDocument()
      expect(
        container.querySelector('.confettiContainer'),
      ).not.toBeInTheDocument()
      expect(container).toMatchSnapshot()
    })

    it('renders no celebration for incorrect answer', () => {
      const { container } = render(
        <MemoryRouter>
          <PlayerResultState
            event={{
              type: GameEventType.GameResultPlayer,
              game: { mode: GameMode.Classic },
              player: {
                nickname: 'WrongAnswer',
                score: {
                  correct: false,
                  last: 0,
                  total: 700,
                  position: 20,
                  streak: 0,
                },
              },
              pagination: { current: 2, total: 20 },
            }}
          />
        </MemoryRouter>,
      )

      // Should have no celebration
      expect(screen.getByText('Incorrect')).toBeInTheDocument()
      expect(
        container.querySelector('.badge.celebrationNormal'),
      ).not.toBeInTheDocument()
      expect(
        container.querySelector('.badge.celebrationMajor'),
      ).not.toBeInTheDocument()
      expect(
        container.querySelector('.badge.celebrationEpic'),
      ).not.toBeInTheDocument()
      expect(
        container.querySelector('.confettiContainer'),
      ).not.toBeInTheDocument()
      expect(container).toMatchSnapshot()
    })

    it('renders epic celebration for position 2', () => {
      const { container } = render(
        <MemoryRouter>
          <PlayerResultState
            event={{
              type: GameEventType.GameResultPlayer,
              game: { mode: GameMode.Classic },
              player: {
                nickname: 'SecondPlace',
                score: {
                  correct: true,
                  last: 900,
                  total: 6000,
                  position: 2,
                  streak: 1,
                },
              },
              pagination: { current: 9, total: 20 },
            }}
          />
        </MemoryRouter>,
      )

      expect(screen.getByText('Correct')).toBeInTheDocument()
      expect(
        container.querySelector('.badge.celebrationMajor'),
      ).toBeInTheDocument()
      expect(container.querySelector('.confettiContainer')).toBeInTheDocument()
      expect(container.querySelectorAll('.confettiParticle')).toHaveLength(45)
      expect(container).toMatchSnapshot()
    })

    it('renders epic celebration for streak 7', () => {
      const { container } = render(
        <MemoryRouter>
          <PlayerResultState
            event={{
              type: GameEventType.GameResultPlayer,
              game: { mode: GameMode.Classic },
              player: {
                nickname: 'HighStreak',
                score: {
                  correct: true,
                  last: 600,
                  total: 4000,
                  position: 8,
                  streak: 7,
                },
              },
              pagination: { current: 10, total: 20 },
            }}
          />
        </MemoryRouter>,
      )

      // Should have epic celebration
      expect(screen.getByText('Correct')).toBeInTheDocument()
      expect(
        container.querySelector('.badge.celebrationEpic'),
      ).toBeInTheDocument()
      expect(container.querySelector('.confettiContainer')).toBeInTheDocument()
      expect(container.querySelectorAll('.confettiParticle')).toHaveLength(70)
      expect(container).toMatchSnapshot()
    })
  })

  describe('Animation Behavior', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('reveals correctness, then points, then ranking details', () => {
      const { container } = render(
        <MemoryRouter>
          <PlayerResultState
            event={{
              type: GameEventType.GameResultPlayer,
              game: { mode: GameMode.Classic },
              player: {
                nickname: 'TestPlayer',
                score: {
                  correct: true,
                  last: 100,
                  total: 1000,
                  position: 5,
                  streak: 2,
                },
              },
              pagination: { current: 1, total: 20 },
            }}
          />
        </MemoryRouter>,
      )

      // Initially should show correctness badge
      expect(screen.getByText('Correct')).toBeInTheDocument()
      expect(container.querySelector('.correctnessBatch')).toBeInTheDocument()
      expect(container.querySelector('.positionBatch')).toBeInTheDocument()

      // Position batch should be hidden initially
      expect(container.querySelector('.positionBatch')).toHaveClass('hidden')
      expect(container.querySelector('.correctnessBatch')).not.toHaveClass(
        'slideOutLeft',
      )

      expect(container.querySelector('.pointsReveal')).toHaveAttribute(
        'aria-hidden',
        'true',
      )
      expect(container.querySelector('.rankingDetails')).toHaveAttribute(
        'aria-hidden',
        'true',
      )
      act(() => {
        vi.advanceTimersByTime(600)
      })
      expect(container.querySelector('.pointsReveal')).toHaveClass('revealed')
      expect(container.querySelector('.pointsReveal')).toHaveClass(
        'pointsReward',
      )
      expect(container.querySelector('.positionBatch')).toHaveClass('hidden')
      act(() => {
        vi.advanceTimersByTime(1199)
      })
      expect(container.querySelector('.positionBatch')).toHaveClass('hidden')
      act(() => {
        vi.advanceTimersByTime(1)
      })

      // Now should show position badge and hide correctness badge
      expect(container.querySelector('.positionBatch')).toHaveClass(
        'slideInRight',
      )
      expect(container.querySelector('.positionBatch')).not.toHaveClass(
        'hidden',
      )
      expect(container.querySelector('.correctnessBatch')).toHaveClass(
        'slideOutLeft',
      )
      expect(container.querySelector('.rankingDetails')).toHaveAttribute(
        'aria-hidden',
        'false',
      )
    })

    const resultEvent: GameResultPlayerEvent = {
      type: GameEventType.GameResultPlayer,
      game: { mode: GameMode.Classic },
      player: {
        nickname: 'TestPlayer',
        score: {
          correct: true,
          last: 500,
          total: 1000,
          position: 1,
          streak: 3,
        },
      },
      pagination: { current: 1, total: 20 },
    }

    const result = (event = resultEvent) => (
      <MemoryRouter>
        <PlayerResultState event={event} />
      </MemoryRouter>
    )

    it('resets the reveal and celebrations between questions and clears pending timers', () => {
      const { container, rerender, unmount } = render(result())
      act(() => vi.advanceTimersByTime(600))
      act(() => vi.advanceTimersByTime(1200))
      expect(container.querySelector('.positionBatch')).toHaveClass(
        'slideInRight',
      )

      rerender(
        result({ ...resultEvent, pagination: { current: 2, total: 20 } }),
      )
      expect(container.querySelector('.positionBatch')).toHaveClass('hidden')
      expect(container.querySelector('.pointsReveal')).not.toHaveClass(
        'revealed',
      )
      expect(screen.getAllByTestId('confetti')).toHaveLength(1)
      act(() => vi.advanceTimersByTime(300))
      rerender(
        result({ ...resultEvent, pagination: { current: 3, total: 20 } }),
      )
      act(() => vi.advanceTimersByTime(300))
      expect(container.querySelector('.pointsReveal')).not.toHaveClass(
        'revealed',
      )
      unmount()
      expect(vi.getTimerCount()).toBe(0)
    })

    it('does not restart the sequence for an equivalent event update', () => {
      const { container, rerender } = render(result())
      act(() => vi.advanceTimersByTime(600))
      rerender(result({ ...resultEvent }))
      act(() => vi.advanceTimersByTime(1200))
      expect(container.querySelector('.positionBatch')).toHaveClass(
        'slideInRight',
      )
    })

    it.each([
      { correct: false, last: 0, reward: false },
      { correct: false, last: 250, reward: true },
      { correct: true, last: 0, reward: false },
    ])(
      'handles correct=$correct with $last points proportionally',
      ({ correct, last, reward }) => {
        const { container } = render(
          result({
            ...resultEvent,
            player: {
              ...resultEvent.player,
              score: { correct, last, total: 1000, position: 1, streak: 0 },
            },
          }),
        )
        act(() => vi.advanceTimersByTime(600))
        expect(
          container
            .querySelector('.pointsReveal')
            ?.classList.contains('pointsReward'),
        ).toBe(reward)
        if (!correct)
          expect(screen.queryByTestId('confetti')).not.toBeInTheDocument()
      },
    )

    it('reveals all information immediately for reduced motion and responds to preference changes', () => {
      let reduced = true
      const motionQuery = Object.assign(new EventTarget(), {
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
      })
      const removeListener = vi.spyOn(motionQuery, 'removeEventListener')
      vi.stubGlobal(
        'matchMedia',
        vi.fn((query: string) =>
          Object.assign(motionQuery, {
            matches: query === '(prefers-reduced-motion: reduce)' && reduced,
            media: query,
          }),
        ),
      )
      const { container, unmount } = render(result())
      expect(container.querySelector('.pointsReveal')).toHaveClass('revealed')
      expect(container.querySelector('.rankingDetails')).toHaveClass('revealed')
      expect(
        screen.getByText('Correct').closest('[aria-hidden]'),
      ).toHaveAttribute('aria-hidden', 'false')
      expect(screen.queryByTestId('confetti')).not.toBeInTheDocument()
      expect(vi.getTimerCount()).toBe(0)

      act(() => {
        reduced = false
        motionQuery.dispatchEvent(new Event('change'))
      })
      act(() => vi.advanceTimersByTime(600))
      act(() => {
        reduced = true
        motionQuery.dispatchEvent(new Event('change'))
      })
      expect(container.querySelector('.rankingDetails')).toHaveClass('revealed')
      expect(vi.getTimerCount()).toBe(0)
      unmount()
      expect(removeListener).toHaveBeenCalledWith(
        'change',
        expect.any(Function),
      )
    })

    it('ZeroToOneHundred shows position immediately and does not render correctness batch', () => {
      const { container } = render(
        <MemoryRouter>
          <PlayerResultState
            event={
              {
                type: GameEventType.GameResultPlayer,
                game: { mode: GameMode.ZeroToOneHundred },
                player: {
                  nickname: 'ZTOHPlayer',
                  score: {
                    correct: true,
                    last: -10,
                    total: 24,
                    position: 1,
                    streak: 10,
                  },
                },
                pagination: { current: 1, total: 20 },
              } as unknown as GameResultPlayerEvent
            }
          />
        </MemoryRouter>,
      )

      expect(container.querySelector('.correctnessBatch')).toBeNull()
      expect(screen.queryByText('Correct')).toBeNull()
      expect(screen.queryByText('Incorrect')).toBeNull()

      const positionBatch = container.querySelector('.positionBatch')
      expect(positionBatch).toBeInTheDocument()
      expect(positionBatch).toHaveClass('slideInRight')
      expect(positionBatch).not.toHaveClass('hidden')

      expect(h.getPositionMessage).toHaveBeenCalledWith(1, 'correct')
      expect(screen.queryByText('Streak')).toBeNull()
    })

    it('ZeroToOneHundred shows negative points without a reward animation or celebration', () => {
      const { container } = render(
        <MemoryRouter>
          <PlayerResultState
            event={{
              type: GameEventType.GameResultPlayer,
              game: { mode: GameMode.ZeroToOneHundred },
              player: {
                nickname: 'ZTOHPlayer',
                score: {
                  correct: false,
                  last: -5,
                  total: 10,
                  position: 7,
                  streak: 0,
                },
              },
              pagination: { current: 1, total: 20 },
            }}
          />
        </MemoryRouter>,
      )

      const positionBatch = container.querySelector('.positionBatch')
      expect(positionBatch).toBeInTheDocument()
      expect(positionBatch).toHaveClass('slideInRight')
      expect(positionBatch).not.toHaveClass('hidden')
      expect(container.querySelector('.pointsReveal')).toHaveClass('revealed')
      expect(container.querySelector('.pointsReveal')).not.toHaveClass(
        'pointsReward',
      )
      expect(screen.queryByTestId('confetti')).not.toBeInTheDocument()

      act(() => {
        vi.advanceTimersByTime(8000)
      })

      expect(container.querySelector('.correctnessBatch')).toBeNull()
      expect(positionBatch).toHaveClass('slideInRight')
      expect(positionBatch).not.toHaveClass('hidden')
    })
  })
})
