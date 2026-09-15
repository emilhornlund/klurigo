import { GameEventType } from '@klurigo/common'
import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { v4 as uuidv4 } from 'uuid'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const h = vi.hoisted(() => ({
  gameID: 'game-1' as string | undefined,
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  completeTask: vi.fn<[], Promise<void>>().mockResolvedValue(),
  leaveGame: vi.fn<(id: string) => Promise<void>>().mockResolvedValue(),
  updateGameSettings: vi.fn().mockResolvedValue({}),
}))

vi.mock('../../context/game', () => ({
  useGameContext: () => ({
    gameID: h.gameID,
    completeTask: h.completeTask,
    leaveGame: h.leaveGame,
    updateGameSettings: h.updateGameSettings,
  }),
}))

vi.mock('../../config', () => ({
  default: { baseUrl: 'https://example.com' },
}))

import HostLobbyState from './HostLobbyState'

describe('HostLobbyState', () => {
  it('should render HostLobbyState', async () => {
    const { container } = render(
      <MemoryRouter>
        <HostLobbyState
          event={{
            type: GameEventType.GameLobbyHost,
            game: {
              id: 'de6f4af5-f472-4e30-bbeb-97b881e0a569',
              pin: '123456',
              settings: {
                randomizeQuestionOrder: false,
                randomizeAnswerOrder: false,
              },
            },
            players: [
              { id: uuidv4(), nickname: 'ShadowCyborg' },
              { id: uuidv4(), nickname: 'Radar' },
              { id: uuidv4(), nickname: 'ShadowWhirlwind' },
              { id: uuidv4(), nickname: 'WhiskerFox' },
              { id: uuidv4(), nickname: 'JollyNimbus' },
              { id: uuidv4(), nickname: 'PuddingPop' },
              { id: uuidv4(), nickname: 'MysticPine' },
              { id: uuidv4(), nickname: 'FrostyBear' },
              { id: uuidv4(), nickname: 'Willo' },
              { id: uuidv4(), nickname: 'ScarletFlame' },
            ],
          }}
        />
      </MemoryRouter>,
    )

    expect(container).toMatchSnapshot()
  })

  const sampleEvent = {
    type: GameEventType.GameLobbyHost,
    game: {
      id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
      pin: '654321',
      settings: {
        randomizeQuestionOrder: false,
        randomizeAnswerOrder: false,
      },
    },
    players: [
      { id: 'p1', nickname: 'Alice' },
      { id: 'p2', nickname: 'Bob' },
    ],
  } as const

  beforeEach(() => {
    h.gameID = 'game-1'
    h.completeTask.mockClear()
    h.leaveGame.mockClear()
    h.updateGameSettings.mockClear()
  })

  it('shows join URL and PIN', () => {
    const { container } = render(
      <MemoryRouter>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <HostLobbyState event={sampleEvent as any} />
      </MemoryRouter>,
    )
    expect(screen.getByText(/Join at/i)).toBeInTheDocument()
    expect(screen.getByText('example.com')).toBeInTheDocument()
    expect(screen.getByText(/Game PIN/i)).toBeInTheDocument()
    expect(screen.getByText('654321')).toBeInTheDocument()
    expect(container).toMatchSnapshot()
  })

  it('clicks Start when players exist and calls completeTask', async () => {
    const user = userEvent.setup()

    const { container } = render(
      <MemoryRouter>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <HostLobbyState event={sampleEvent as any} />
      </MemoryRouter>,
    )

    const start = container.querySelector(
      '#start-game-button',
    ) as HTMLButtonElement

    await user.click(start)

    expect(h.completeTask).toHaveBeenCalledTimes(1)
    expect(container).toMatchSnapshot()
  })

  it('opens confirm dialog when starting with no players, then confirms and calls completeTask', async () => {
    const user = userEvent.setup()

    const { container } = render(
      <MemoryRouter>
        <HostLobbyState
          event={
            {
              type: GameEventType.GameLobbyHost,
              game: {
                id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
                pin: '111111',
                settings: {
                  randomizeQuestionOrder: false,
                  randomizeAnswerOrder: false,
                },
              },
              players: [],
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as any
          }
        />
      </MemoryRouter>,
    )

    const start = container.querySelector(
      '#start-game-button',
    ) as HTMLButtonElement
    await user.click(start)

    expect(screen.getByText('Start Game Without Players?')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Start Game' }))

    expect(h.completeTask).toHaveBeenCalledTimes(1)
    expect(container).toMatchSnapshot()
  })

  it('opens remove player dialog and confirms removal, calling leaveGame with player id', async () => {
    vi.useFakeTimers()

    const { container } = render(
      <MemoryRouter>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <HostLobbyState event={sampleEvent as any} />
      </MemoryRouter>,
    )

    const aliceNode = screen.getByText('Alice')
    const aliceChip =
      aliceNode.closest('div')?.querySelector('button') ??
      (aliceNode.parentElement?.querySelector('button') as HTMLButtonElement)

    act(() => {
      fireEvent.click(aliceChip as HTMLButtonElement)
    })

    expect(screen.getByText('Confirm Remove Player')).toBeInTheDocument()

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Remove Player' }))
    })

    act(() => {
      vi.advanceTimersByTime(600)
      vi.runOnlyPendingTimers()
    })

    // If leaveGame is invoked in a promise continuation after the timeout callback
    await act(async () => {
      await Promise.resolve()
    })

    expect(h.leaveGame).toHaveBeenCalledTimes(1)
    expect(h.leaveGame).toHaveBeenCalledWith('p1')
    expect(container).toMatchSnapshot()

    vi.useRealTimers()
  })

  it('does not call leaveGame when gameID is undefined', async () => {
    const user = userEvent.setup()
    h.gameID = undefined

    render(
      <MemoryRouter>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <HostLobbyState event={sampleEvent as any} />
      </MemoryRouter>,
    )

    const bobNode = screen.getByText('Bob')
    const bobChip =
      bobNode.closest('div')?.querySelector('button') ??
      (bobNode.parentElement?.querySelector('button') as HTMLButtonElement)

    await user.click(bobChip as HTMLButtonElement)
    await user.click(screen.getByRole('button', { name: 'Remove Player' }))

    expect(h.leaveGame).not.toHaveBeenCalled()
  })

  it('displays player counter with correct count', () => {
    render(
      <MemoryRouter>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <HostLobbyState event={sampleEvent as any} />
      </MemoryRouter>,
    )
    expect(screen.getByText('2 / 20')).toBeInTheDocument()
  })

  it('displays player counter with zero players', () => {
    const noPlayersEvent = { ...sampleEvent, players: [] }
    render(
      <MemoryRouter>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <HostLobbyState event={noPlayersEvent as any} />
      </MemoryRouter>,
    )
    expect(screen.getByText('0 / 20')).toBeInTheDocument()
  })

  it('displays player counter with maximum players', () => {
    const maxPlayersEvent = {
      ...sampleEvent,
      players: Array.from({ length: 20 }, (_, i) => ({
        id: `p${i}`,
        nickname: `Player${i}`,
      })),
    }
    render(
      <MemoryRouter>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <HostLobbyState event={maxPlayersEvent as any} />
      </MemoryRouter>,
    )
    expect(screen.getByText('20 / 20')).toBeInTheDocument()
  })

  it('shows user group icon in player counter', () => {
    render(
      <MemoryRouter>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <HostLobbyState event={sampleEvent as any} />
      </MemoryRouter>,
    )
    const userGroupIcon = document.querySelector('.playerIcon')
    expect(userGroupIcon).toBeInTheDocument()
  })

  it('renders Settings button', () => {
    render(
      <MemoryRouter>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <HostLobbyState event={sampleEvent as any} />
      </MemoryRouter>,
    )
    const settingsButton = screen.getByRole('button', { name: /settings/i })
    expect(settingsButton).toBeInTheDocument()
  })

  it('opens GameSettingsModal when Settings button is clicked', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <HostLobbyState event={sampleEvent as any} />
      </MemoryRouter>,
    )

    const settingsButton = screen.getByRole('button', { name: /settings/i })
    await user.click(settingsButton)

    expect(screen.getByText('Game Settings')).toBeInTheDocument()
  })

  it('passes correct settings to GameSettingsModal', async () => {
    const user = userEvent.setup()
    const customSettings = {
      ...sampleEvent,
      game: {
        ...sampleEvent.game,
        settings: {
          randomizeQuestionOrder: true,
          randomizeAnswerOrder: true,
        },
      },
    }

    render(
      <MemoryRouter>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <HostLobbyState event={customSettings as any} />
      </MemoryRouter>,
    )

    const settingsButton = screen.getByRole('button', { name: /settings/i })
    await user.click(settingsButton)

    const questionOrderSwitch = screen.getByRole('switch', {
      name: /randomize order of questions/i,
    })
    const answerOrderSwitch = screen.getByRole('switch', {
      name: /randomize order of answers/i,
    })

    expect(questionOrderSwitch).toBeChecked()
    expect(answerOrderSwitch).toBeChecked()
  })

  it('closes GameSettingsModal', async () => {
    const user = userEvent.setup()
    const { container } = render(
      <MemoryRouter>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <HostLobbyState event={sampleEvent as any} />
      </MemoryRouter>,
    )

    const settingsButton = screen.getByRole('button', { name: /settings/i })
    await user.click(settingsButton)

    expect(screen.getByText('Game Settings')).toBeInTheDocument()

    const closeButton = container.querySelector(
      '#close-modal-button',
    ) as HTMLButtonElement
    await user.click(closeButton)

    expect(screen.queryByText('Game Settings')).not.toBeInTheDocument()
  })

  it('copies the direct join URL and shows copied feedback', async () => {
    const user = userEvent.setup()
    const writeText = vi.fn().mockResolvedValue(undefined)

    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    })

    render(
      <MemoryRouter>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <HostLobbyState event={sampleEvent as any} />
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: /copy link/i }))

    expect(writeText).toHaveBeenCalledWith(
      'https://example.com/auth/game?id=aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    )

    expect(screen.getByRole('button', { name: /copied/i })).toBeInTheDocument()
  })
})
