import { GameEventType } from '@klurigo/common'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const h = vi.hoisted(() => ({
  gameID: 'game-123',
  revokeGame: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../../context/game', () => ({
  useGameContext: () => ({
    gameID: h.gameID,
  }),
}))

vi.mock('../../context/auth', () => ({
  useAuthContext: () => ({
    revokeGame: h.revokeGame,
  }),
}))

import HostPodiumState from './HostPodiumState'

describe('HostPodiumState', () => {
  beforeEach(() => {
    h.gameID = 'game-123'
    h.revokeGame.mockReset()
    h.revokeGame.mockResolvedValue(undefined)

    vi.spyOn(Math, 'random').mockReturnValue(0.5)
  })

  it('should render HostPodiumState', () => {
    const { container } = render(
      <MemoryRouter>
        <HostPodiumState
          event={{
            type: GameEventType.GamePodiumHost,
            game: {
              name: 'Trivia Battle',
            },
            leaderboard: [
              { position: 1, nickname: 'ShadowCyborg', score: 18456 },
              { position: 2, nickname: 'Radar', score: 18398 },
              { position: 3, nickname: 'ShadowWhirlwind', score: 15492 },
              { position: 4, nickname: 'WhiskerFox', score: 14118 },
              { position: 5, nickname: 'JollyNimbus', score: 13463 },
              { position: 6, nickname: 'PuddingPop', score: 12459 },
              { position: 7, nickname: 'MysticPine', score: 11086 },
              { position: 8, nickname: 'FrostyBear', score: 10361 },
              { position: 9, nickname: 'Willo', score: 9360 },
              { position: 10, nickname: 'ScarletFlame', score: 6723 },
            ],
          }}
        />
      </MemoryRouter>,
    )

    expect(
      screen.getByRole('button', { name: 'Back to Home' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'View Full Results' }),
    ).toBeInTheDocument()
    expect(container).toMatchSnapshot()
  })

  it('should render HostPodiumState without a full leaderboard', () => {
    const { container } = render(
      <MemoryRouter>
        <HostPodiumState
          event={{
            type: GameEventType.GamePodiumHost,
            game: {
              name: 'Trivia Battle',
            },
            leaderboard: [
              { position: 1, nickname: 'ShadowCyborg', score: 18456 },
              { position: 2, nickname: 'Radar', score: 18398 },
              { position: 3, nickname: 'ShadowWhirlwind', score: 15492 },
            ],
          }}
        />
      </MemoryRouter>,
    )

    expect(container).toMatchSnapshot()
  })

  it('renders title and leaderboard entries', () => {
    const { container } = render(
      <MemoryRouter>
        <HostPodiumState
          event={{
            type: GameEventType.GamePodiumHost,
            game: {
              name: 'Trivia Battle',
            },
            leaderboard: [
              { position: 1, nickname: 'Alpha', score: 100 },
              { position: 2, nickname: 'Beta', score: 90 },
              { position: 3, nickname: 'Gamma', score: 80 },
            ],
          }}
        />
      </MemoryRouter>,
    )

    expect(screen.getByText('Trivia Battle')).toBeInTheDocument()
    expect(screen.getByText('Alpha')).toBeInTheDocument()
    expect(screen.getByText('Beta')).toBeInTheDocument()
    expect(screen.getByText('Gamma')).toBeInTheDocument()
    expect(container).toMatchSnapshot()
  })

  it('clicks Back to Home and calls revokeGame with home redirect', async () => {
    const { container } = render(
      <MemoryRouter>
        <HostPodiumState
          event={{
            type: GameEventType.GamePodiumHost,
            game: {
              name: 'Trivia Battle',
            },
            leaderboard: [
              { position: 1, nickname: 'Alpha', score: 100 },
              { position: 2, nickname: 'Beta', score: 90 },
              { position: 3, nickname: 'Gamma', score: 80 },
            ],
          }}
        />
      </MemoryRouter>,
    )

    const homeButton = container.querySelector(
      '#home-button',
    ) as HTMLButtonElement

    await act(async () => {
      fireEvent.click(homeButton)
    })

    expect(h.revokeGame).toHaveBeenCalledTimes(1)
    expect(h.revokeGame).toHaveBeenCalledWith({ redirectTo: '/' })
    expect(container).toMatchSnapshot()
  })

  it('clicks View Full Results and calls revokeGame with results redirect', async () => {
    const { container } = render(
      <MemoryRouter>
        <HostPodiumState
          event={{
            type: GameEventType.GamePodiumHost,
            game: {
              name: 'Trivia Battle',
            },
            leaderboard: [
              { position: 1, nickname: 'Alpha', score: 100 },
              { position: 2, nickname: 'Beta', score: 90 },
              { position: 3, nickname: 'Gamma', score: 80 },
            ],
          }}
        />
      </MemoryRouter>,
    )

    const gameResultsBtn = container.querySelector(
      '#game-results-button',
    ) as HTMLButtonElement

    await act(async () => {
      fireEvent.click(gameResultsBtn)
    })

    expect(h.revokeGame).toHaveBeenCalledTimes(1)
    expect(h.revokeGame).toHaveBeenCalledWith({
      redirectTo: '/game/results/game-123',
    })
    expect(container).toMatchSnapshot()
  })

  it('should use the current gameID when building the full results redirect', async () => {
    h.gameID = 'game-999'

    render(
      <MemoryRouter>
        <HostPodiumState
          event={{
            type: GameEventType.GamePodiumHost,
            game: {
              name: 'Trivia Battle',
            },
            leaderboard: [
              { position: 1, nickname: 'Alpha', score: 100 },
              { position: 2, nickname: 'Beta', score: 90 },
              { position: 3, nickname: 'Gamma', score: 80 },
            ],
          }}
        />
      </MemoryRouter>,
    )

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'View Full Results' }))
    })

    expect(h.revokeGame).toHaveBeenCalledWith({
      redirectTo: '/game/results/game-999',
    })
  })

  it('should render HostPodiumState with only one player', () => {
    const { container } = render(
      <MemoryRouter>
        <HostPodiumState
          event={{
            type: GameEventType.GamePodiumHost,
            game: {
              name: 'Trivia Battle',
            },
            leaderboard: [
              { position: 1, nickname: 'ShadowCyborg', score: 18456 },
            ],
          }}
        />
      </MemoryRouter>,
    )

    expect(container).toMatchSnapshot()
  })
})
