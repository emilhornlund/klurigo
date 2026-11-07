import { GameEventType } from '@klurigo/common'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { act } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const h = vi.hoisted(() => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  game: { ACCESS: { sub: 'player-1' } } as any,
  gameID: 'game-1' as string | undefined,
  leaveGame: vi.fn<(id: string) => Promise<void>>().mockResolvedValue(),
  navigate: vi.fn(),
}))

vi.mock('../../context/auth', () => ({
  useAuthContext: () => ({ game: h.game }),
}))
vi.mock('../../context/game', () => ({
  useGameContext: () => ({ gameID: h.gameID, leaveGame: h.leaveGame }),
}))
vi.mock('react-router-dom', async (orig) => {
  const actual = await orig()
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  return { ...actual, useNavigate: () => h.navigate }
})

vi.mock('./message.utils', () => ({
  MESSAGES: ['Be nice and wait', 'Get ready for questions!'],
}))

import PlayerLobbyState from './PlayerLobbyState'

describe('PlayerLobbyState', () => {
  beforeEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    h.game = { ACCESS: { sub: 'player-1' } } as any
    h.gameID = 'game-1'
    h.leaveGame.mockClear()
    h.navigate.mockClear()
  })

  it('renders lobby with nickname, title and message', () => {
    const { container } = render(
      <MemoryRouter>
        <PlayerLobbyState
          event={{
            type: GameEventType.GameLobbyPlayer,
            game: { name: 'The Big Brain Quiz' },
            players: ['FrostyBear', 'Player2', 'Player3'].map((nickname) => ({
              nickname,
            })),
            player: { nickname: 'FrostyBear' },
          }}
        />
      </MemoryRouter>,
    )

    expect(screen.getByText('FrostyBear')).toBeInTheDocument()
    expect(screen.getByText('You’re in!')).toBeInTheDocument()
    expect(screen.getByText('The Big Brain Quiz')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('Welcome,')).toBeInTheDocument()
    expect(
      screen.getByText('Waiting for the host to start…'),
    ).toBeInTheDocument()
    expect(screen.getByText('Be nice and wait')).toBeInTheDocument()
    expect(container).toMatchSnapshot()
  })

  it('updates the displayed player count from the latest lobby event', () => {
    const { rerender } = render(
      <MemoryRouter>
        <PlayerLobbyState
          event={{
            type: GameEventType.GameLobbyPlayer,
            game: { name: 'The Big Brain Quiz' },
            players: [{ nickname: 'FrostyBear' }],
            player: { nickname: 'FrostyBear' },
          }}
        />
      </MemoryRouter>,
    )

    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('player is in the game')).toBeInTheDocument()

    rerender(
      <MemoryRouter>
        <PlayerLobbyState
          event={{
            type: GameEventType.GameLobbyPlayer,
            game: { name: 'The Big Brain Quiz' },
            players: [{ nickname: 'FrostyBear' }, { nickname: 'Player2' }],
            player: { nickname: 'FrostyBear' },
          }}
        />
      </MemoryRouter>,
    )

    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('players are in the game')).toBeInTheDocument()
  })

  it('opens confirm dialog when clicking Leave', () => {
    const { container } = render(
      <MemoryRouter>
        <PlayerLobbyState
          event={{
            type: GameEventType.GameLobbyPlayer,
            game: { name: 'The Big Brain Quiz' },
            players: ['FrostyBear', 'Player2', 'Player3'].map((nickname) => ({
              nickname,
            })),
            player: { nickname: 'FrostyBear' },
          }}
        />
      </MemoryRouter>,
    )

    const leaveBtn = document.querySelector(
      '#leave-game-button',
    ) as HTMLButtonElement

    fireEvent.click(leaveBtn)

    expect(screen.getByText('Confirm Leave Game')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Leave Game' }),
    ).toBeInTheDocument()
    expect(container).toMatchSnapshot()
  })

  it('confirms leave, calls leaveGame with participant id and navigates home', async () => {
    const { container } = render(
      <MemoryRouter>
        <PlayerLobbyState
          event={{
            type: GameEventType.GameLobbyPlayer,
            game: { name: 'The Big Brain Quiz' },
            players: ['FrostyBear', 'Player2', 'Player3'].map((nickname) => ({
              nickname,
            })),
            player: { nickname: 'FrostyBear' },
          }}
        />
      </MemoryRouter>,
    )

    fireEvent.click(
      document.querySelector('#leave-game-button') as HTMLButtonElement,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Leave Game' }))

    expect(h.leaveGame).toHaveBeenCalledWith('player-1')
    await waitFor(() => expect(h.navigate).toHaveBeenCalledWith('/'))
    expect(container).toMatchSnapshot()
  })

  it('does nothing when gameID is undefined', () => {
    h.gameID = undefined

    const { container } = render(
      <MemoryRouter>
        <PlayerLobbyState
          event={{
            type: GameEventType.GameLobbyPlayer,
            game: { name: 'The Big Brain Quiz' },
            players: ['FrostyBear', 'Player2', 'Player3'].map((nickname) => ({
              nickname,
            })),
            player: { nickname: 'FrostyBear' },
          }}
        />
      </MemoryRouter>,
    )

    fireEvent.click(
      document.querySelector('#leave-game-button') as HTMLButtonElement,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Leave Game' }))

    expect(h.leaveGame).not.toHaveBeenCalled()
    expect(h.navigate).not.toHaveBeenCalled()
    expect(container).toMatchSnapshot()
  })

  it('does nothing when participant id is missing', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    h.game = undefined as any

    const { container } = render(
      <MemoryRouter>
        <PlayerLobbyState
          event={{
            type: GameEventType.GameLobbyPlayer,
            game: { name: 'The Big Brain Quiz' },
            players: ['FrostyBear', 'Player2', 'Player3'].map((nickname) => ({
              nickname,
            })),
            player: { nickname: 'FrostyBear' },
          }}
        />
      </MemoryRouter>,
    )

    fireEvent.click(
      document.querySelector('#leave-game-button') as HTMLButtonElement,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Leave Game' }))

    expect(h.leaveGame).not.toHaveBeenCalled()
    expect(h.navigate).not.toHaveBeenCalled()
    expect(container).toMatchSnapshot()
  })

  it('displays initial message with visible animation state', () => {
    render(
      <MemoryRouter>
        <PlayerLobbyState
          event={{
            type: GameEventType.GameLobbyPlayer,
            game: { name: 'The Big Brain Quiz' },
            players: ['FrostyBear', 'Player2', 'Player3'].map((nickname) => ({
              nickname,
            })),
            player: { nickname: 'FrostyBear' },
          }}
        />
      </MemoryRouter>,
    )

    expect(screen.getByText('Be nice and wait')).toBeInTheDocument()
  })

  it('rotates messages after timeout', () => {
    vi.useFakeTimers()

    render(
      <MemoryRouter>
        <PlayerLobbyState
          event={{
            type: GameEventType.GameLobbyPlayer,
            game: { name: 'The Big Brain Quiz' },
            players: ['FrostyBear', 'Player2', 'Player3'].map((nickname) => ({
              nickname,
            })),
            player: { nickname: 'FrostyBear' },
          }}
        />
      </MemoryRouter>,
    )

    expect(screen.getByText('Be nice and wait')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(8000) // interval tick
    })

    act(() => {
      vi.advanceTimersByTime(200) // exit duration
    })

    act(() => {
      vi.advanceTimersByTime(300) // enter duration
    })

    expect(screen.getByText('Get ready for questions!')).toBeInTheDocument()

    vi.useRealTimers()
  })

  it('cleans up timers on unmount', () => {
    vi.useFakeTimers()

    const { unmount } = render(
      <MemoryRouter>
        <PlayerLobbyState
          event={{
            type: GameEventType.GameLobbyPlayer,
            game: { name: 'The Big Brain Quiz' },
            player: { nickname: 'FrostyBear' },
            players: ['FrostyBear', 'Player2', 'Player3'].map((nickname) => ({
              nickname,
            })),
          }}
        />
      </MemoryRouter>,
    )

    unmount()

    act(() => {
      vi.advanceTimersByTime(8000)
      vi.advanceTimersByTime(200)
      vi.advanceTimersByTime(300)
    })

    vi.useRealTimers()
  })
})
