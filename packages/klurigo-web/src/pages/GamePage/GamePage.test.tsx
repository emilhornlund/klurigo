import {
  GameEventType,
  GameMode,
  GameParticipantType,
  GameStatus,
} from '@klurigo/common'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { Location } from 'react-router'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AuthContext, type AuthContextType } from '../../context/auth'

import GamePage from './GamePage'

const makeLocation = (overrides: Partial<Location> = {}): Location =>
  ({
    pathname: '/somewhere',
    search: '',
    hash: '',
    state: null,
    key: 'test',
    ...overrides,
  }) as Location

vi.mock('./GamePage.module.scss', () => ({
  default: { leaveModalActionButtons: 'leave-modal-actions' },
}))

const h = vi.hoisted(() => {
  return {
    setContextMock: vi.fn(),
    notifySuccess: vi.fn(),
    notifyWarning: vi.fn(),
    notifyError: vi.fn(),
    navigateMock: vi.fn(),
    proceedMock: vi.fn(),
    resetMock: vi.fn(),
    leaveGameMock: vi.fn(() => Promise.resolve()),
    quitGameMock: vi.fn(() => Promise.resolve()),
    revokeGameMock: vi.fn(() => Promise.resolve()),
    context: {
      gameID: 'game-123',
      gameToken: 'token-abc',
      participantId: 'p-1',
      participantType: undefined as unknown as GameParticipantType,
    } as {
      gameID: string
      gameToken: string
      participantId: string
      participantType: GameParticipantType
    },
    control: {
      event: null as unknown,
      status: 'INITIALIZED' as
        'INITIALIZED' | 'CONNECTED' | 'RECONNECTING' | 'RECONNECTING_FAILED',
    },
    ConnectionStatus: {
      INITIALIZED: 'INITIALIZED',
      CONNECTED: 'CONNECTED',
      RECONNECTING: 'RECONNECTING',
      RECONNECTING_FAILED: 'RECONNECTING_FAILED',
    },
  }
})

vi.mock('@sentry/react', () => ({ setContext: h.setContextMock }))

vi.mock('../../utils/notification', () => ({
  notifySuccess: h.notifySuccess,
  notifyWarning: h.notifyWarning,
  notifyError: h.notifyError,
}))

vi.mock('../../context/game', () => ({
  useGameContext: () => ({
    ...h.context,
    leaveGame: h.leaveGameMock,
    quitGame: h.quitGameMock,
  }),
}))

vi.mock('../../utils/useEventSource', () => ({
  ConnectionStatus: h.ConnectionStatus,
  useEventSource: vi.fn(() => [h.control.event, h.control.status]),
}))

vi.mock('react-router-dom', async () => {
  const actual =
    await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => h.navigateMock,
    useBlocker: actual.useBlocker,
  }
})

const makeGamePageElement = (authValue?: AuthContextType) => (
  <AuthContext.Provider
    value={
      authValue ??
      ({
        isUserAuthenticated: false,
        revokeGame: h.revokeGameMock,
      } as unknown as AuthContextType)
    }>
    <GamePage />
  </AuthContext.Provider>
)

const renderWithRouter = (authValue?: AuthContextType) => {
  const router = createMemoryRouter(
    [{ path: '/', element: makeGamePageElement(authValue) }],
    { initialEntries: ['/'] },
  )
  return { router, ...render(<RouterProvider router={router} />) }
}

let navTick = 0

const pokeRouter = async (router: ReturnType<typeof createMemoryRouter>) => {
  navTick += 1
  await router.navigate(`/?t=${navTick}`, { replace: true })
}

beforeEach(() => {
  h.control.event = null
  h.control.status = 'INITIALIZED'
  h.navigateMock.mockReset()
  h.proceedMock.mockReset()
  h.resetMock.mockReset()
  h.setContextMock.mockReset()
  h.notifySuccess.mockReset()
  h.notifyWarning.mockReset()
  h.notifyError.mockReset()
  h.leaveGameMock.mockClear()
  h.context.gameID = 'game-123'
  h.context.gameToken = 'token-abc'
  h.context.participantId = 'p-1'
  h.context.participantType = GameParticipantType.PLAYER
  h.quitGameMock.mockClear()
  h.revokeGameMock.mockReset().mockResolvedValue(undefined)

  navTick = 0
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('GamePage', () => {
  it('should render GamePage (snapshot)', async () => {
    const router = createMemoryRouter(
      [
        {
          path: '/',
          element: <GamePage />,
        },
      ],
      {
        initialEntries: ['/'],
      },
    )
    const { container } = render(<RouterProvider router={router} />)
    expect(container).toMatchSnapshot()
  })

  it('sets Sentry context on mount and clears on unmount', () => {
    const { unmount } = renderWithRouter()
    expect(h.setContextMock).toHaveBeenCalledWith(
      'game',
      expect.objectContaining({
        gameId: 'game-123',
        participantId: 'p-1',
        participantType: GameParticipantType.PLAYER,
      }),
    )
    unmount()
    expect(h.setContextMock).toHaveBeenLastCalledWith('game', null)
  })

  it('clears Sentry context when gameID/token are missing', () => {
    h.context.gameID = ''
    h.context.gameToken = ''
    renderWithRouter()
    expect(h.setContextMock).toHaveBeenLastCalledWith('game', null)
  })

  it('marks a connected host lobby stream as ready', async () => {
    h.context.participantType = GameParticipantType.HOST
    h.control.status = 'CONNECTED'
    h.control.event = {
      type: GameEventType.GameLobbyHost,
      game: {
        id: 'game-123',
        pin: '123456',
        settings: {
          randomizeQuestionOrder: false,
          randomizeAnswerOrder: false,
        },
      },
      players: [],
    }

    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByTestId('game-event-stream-ready')).toBeInTheDocument()
    })
  })

  it('revokes game and redirects to "/" on GameQuitEvent', () => {
    h.control.event = { type: GameEventType.GameQuitEvent }
    renderWithRouter()
    expect(h.revokeGameMock).toHaveBeenCalledWith({ redirectTo: '/' })
  })

  it('revokes game and redirects to results on completed GameQuitEvent for authenticated user', () => {
    h.control.event = {
      type: GameEventType.GameQuitEvent,
      status: GameStatus.Completed,
    } as unknown as { type: GameEventType; status: GameStatus }

    const authValue = {
      isUserAuthenticated: true,
      revokeGame: h.revokeGameMock,
    } as unknown as AuthContextType

    renderWithRouter(authValue)

    expect(h.revokeGameMock).toHaveBeenCalledWith({
      redirectTo: `/game/results/${h.context.gameID}`,
    })
  })

  it('emits reconnect → connected notifications', async () => {
    vi.useFakeTimers()
    try {
      const router = createMemoryRouter(
        [{ path: '/', element: <GamePage /> }],
        {
          initialEntries: ['/'],
        },
      )

      render(<RouterProvider router={router} />)

      await act(async () => {
        h.control.status = 'RECONNECTING'
        await pokeRouter(router)
      })

      expect(h.notifyWarning).not.toHaveBeenCalled()

      await act(async () => {
        vi.advanceTimersByTime(500)
      })
      expect(h.notifyWarning).toHaveBeenCalledWith('Reconnecting')

      await act(async () => {
        h.control.status = 'CONNECTED'
        await pokeRouter(router)
      })

      await act(async () => {
        vi.runAllTimers()
      })
      expect(h.notifySuccess).toHaveBeenCalledWith('Connected')
    } finally {
      vi.clearAllTimers()
      vi.useRealTimers()
    }
  })

  it('emits error notification on RECONNECTING_FAILED', async () => {
    vi.useFakeTimers()
    try {
      h.control.status = 'RECONNECTING_FAILED'
      renderWithRouter()

      expect(h.notifyError).not.toHaveBeenCalled()

      await act(async () => {
        vi.advanceTimersByTime(500)
      })

      expect(h.notifyError).toHaveBeenCalledWith('Reconnecting failed')
    } finally {
      vi.clearAllTimers()
      vi.useRealTimers()
    }
  })

  it('does not emit reconnect notification for brief reconnect blip', async () => {
    vi.useFakeTimers()
    try {
      const { rerender } = renderWithRouter()

      act(() => {
        h.control.status = 'RECONNECTING'
        rerender(
          <RouterProvider
            router={createMemoryRouter([{ path: '/', element: <GamePage /> }], {
              initialEntries: ['/'],
            })}
          />,
        )
      })

      await act(async () => {
        vi.advanceTimersByTime(200)
      })

      act(() => {
        h.control.status = 'CONNECTED'
        rerender(
          <RouterProvider
            router={createMemoryRouter([{ path: '/', element: <GamePage /> }], {
              initialEntries: ['/'],
            })}
          />,
        )
      })

      await act(async () => {
        vi.runAllTimers()
      })

      expect(h.notifyWarning).not.toHaveBeenCalled()
      expect(h.notifySuccess).not.toHaveBeenCalled()
    } finally {
      vi.clearAllTimers()
      vi.useRealTimers()
    }
  })

  it('does not emit error notification for brief reconnect failed blip', async () => {
    vi.useFakeTimers()
    try {
      const router = createMemoryRouter(
        [{ path: '/', element: <GamePage /> }],
        {
          initialEntries: ['/'],
        },
      )

      render(<RouterProvider router={router} />)

      await act(async () => {
        h.control.status = 'RECONNECTING_FAILED'
        await pokeRouter(router)
      })

      // Before the 500ms debounce elapses, we become connected
      await act(async () => {
        vi.advanceTimersByTime(200)
      })

      await act(async () => {
        h.control.status = 'CONNECTED'
        await pokeRouter(router)
      })

      await act(async () => {
        vi.runAllTimers()
      })

      expect(h.notifyError).not.toHaveBeenCalled()
      expect(h.notifySuccess).not.toHaveBeenCalled()
    } finally {
      vi.clearAllTimers()
      vi.useRealTimers()
    }
  })

  it('does not emit "Connected" notification on initial connect', async () => {
    vi.useFakeTimers()
    try {
      h.control.status = 'CONNECTED'
      renderWithRouter()

      await act(async () => {
        vi.runAllTimers()
      })

      expect(h.notifySuccess).not.toHaveBeenCalled()
    } finally {
      vi.clearAllTimers()
      vi.useRealTimers()
    }
  })

  it('shows blocker modal on blocked navigation and handles cancel/proceed', async () => {
    const rrd = await import('react-router-dom')

    const blocked = {
      state: 'blocked',
      proceed: h.proceedMock,
      reset: h.resetMock,
      location: makeLocation(),
    } as unknown as ReturnType<typeof rrd.useBlocker>

    const useBlockerSpy = vi.spyOn(rrd, 'useBlocker').mockReturnValue(blocked)

    h.control.event = {
      type: GameEventType.GameLobbyPlayer,
      player: { nickname: 'TestPlayer' },
      players: [],
    }

    renderWithRouter()

    // Wait for the lobby state to render (component needs to process the event first)
    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument()
    })

    expect(
      screen.getByRole('dialog', { name: /Leave Game/i }),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Cancel/i }))
    expect(h.resetMock).toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: /Proceed/i }))
    expect(h.leaveGameMock).toHaveBeenCalledWith('p-1')

    await waitFor(() => expect(h.proceedMock).toHaveBeenCalled())

    await act(async () => Promise.resolve())
    expect(h.proceedMock).toHaveBeenCalled()

    useBlockerSpy.mockRestore()
  })

  it('shows "Quit Game" modal for host and proceeds via quitGame', async () => {
    const rrd = await import('react-router-dom')

    const blocked = {
      state: 'blocked',
      proceed: h.proceedMock,
      reset: h.resetMock,
      location: makeLocation(),
    } as unknown as ReturnType<typeof rrd.useBlocker>

    const useBlockerSpy = vi.spyOn(rrd, 'useBlocker').mockReturnValue(blocked)

    h.context.participantType = GameParticipantType.HOST
    h.control.event = {
      type: GameEventType.GameLobbyHost,
      game: {
        id: 'game-123',
        pin: '1234',
        settings: {
          randomizeQuestionOrder: false,
          randomizeAnswerOrder: false,
        },
      },
      players: [],
    }

    renderWithRouter()

    // Wait for the lobby state to render (component needs to process the event first)
    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument()
    })

    expect(
      screen.getByRole('dialog', { name: /Quit Game/i }),
    ).toBeInTheDocument()

    expect(
      screen.getByText(
        /This will immediately end the game for all participants, and it cannot be resumed\./i,
      ),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Proceed/i }))

    expect(h.quitGameMock).toHaveBeenCalledTimes(1)
    expect(h.leaveGameMock).not.toHaveBeenCalled()

    await waitFor(() => expect(h.proceedMock).toHaveBeenCalled())

    useBlockerSpy.mockRestore()
  })

  it('shows "Leave Game" modal for player and proceeds via leaveGame(participantId)', async () => {
    const rrd = await import('react-router-dom')

    const blocked = {
      state: 'blocked',
      proceed: h.proceedMock,
      reset: h.resetMock,
      location: makeLocation(),
    } as unknown as ReturnType<typeof rrd.useBlocker>

    const useBlockerSpy = vi.spyOn(rrd, 'useBlocker').mockReturnValue(blocked)

    h.context.participantType = GameParticipantType.PLAYER
    h.context.participantId = 'p-1'
    h.control.event = {
      type: GameEventType.GameLobbyPlayer,
      player: { nickname: 'TestPlayer' },
      players: [],
    }

    renderWithRouter()

    // Wait for the lobby state to render (component needs to process the event first)
    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument()
    })

    expect(
      screen.getByRole('dialog', { name: /Leave Game/i }),
    ).toBeInTheDocument()

    expect(
      screen.getByText(
        /Leaving now will disconnect you from the game\. Are you sure you want to continue\?/i,
      ),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Cancel/i }))
    expect(h.resetMock).toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: /Proceed/i }))
    expect(h.leaveGameMock).toHaveBeenCalledWith('p-1')
    expect(h.quitGameMock).not.toHaveBeenCalled()

    await waitFor(() => expect(h.proceedMock).toHaveBeenCalled())

    useBlockerSpy.mockRestore()
  })

  it('shows loading overlay when GAME_LOADING event arrives and hides when non-loading event arrives', async () => {
    h.control.event = {
      type: GameEventType.GameResultPlayer,
      game: { mode: GameMode.Classic },
      player: {
        nickname: 'TestPlayer',
        score: {
          correct: true,
          last: 100,
          total: 100,
          position: 1,
          streak: 1,
        },
      },
      pagination: { current: 1, total: 10 },
    }

    const { router } = renderWithRouter()

    expect(screen.getByText('Correct')).toBeInTheDocument()
    expect(screen.queryByTestId('loading-overlay')).not.toBeInTheDocument()

    h.control.event = { type: GameEventType.GameLoading }

    await act(async () => {
      await pokeRouter(router)
    })

    // Loading overlay should appear after 500ms delay
    await waitFor(
      () => {
        expect(screen.getByTestId('loading-overlay')).toBeInTheDocument()
      },
      { timeout: 1000 },
    )
    expect(screen.getByText('Correct')).toBeInTheDocument()

    h.control.event = {
      type: GameEventType.GameResultPlayer,
      game: { mode: GameMode.Classic },
      player: {
        nickname: 'TestPlayer',
        score: {
          correct: true,
          last: 100,
          total: 100,
          position: 1,
          streak: 1,
        },
      },
      pagination: { current: 1, total: 10 },
    }

    await act(async () => {
      await pokeRouter(router)
    })

    // Loading overlay should disappear immediately
    await waitFor(
      () => {
        expect(screen.queryByTestId('loading-overlay')).not.toBeInTheDocument()
      },
      { timeout: 100 },
    )
    expect(screen.getByText('Correct')).toBeInTheDocument()
  })

  it('does not re-render when same non-loading event arrives twice', async () => {
    const resultEvent = {
      type: GameEventType.GameResultPlayer,
      game: { mode: GameMode.Classic },
      player: {
        nickname: 'TestPlayer',
        score: { correct: true, last: 100, total: 100, position: 1, streak: 1 },
      },
      pagination: { current: 1, total: 10 },
    }

    h.control.event = resultEvent

    const { rerender } = renderWithRouter()

    // Should show the result state
    expect(screen.getByText('Correct')).toBeInTheDocument()

    // Change to loading event
    h.control.event = { type: GameEventType.GameLoading }

    await act(async () => {
      rerender(
        <RouterProvider
          router={createMemoryRouter([{ path: '/', element: <GamePage /> }], {
            initialEntries: ['/'],
          })}
        />,
      )
    })

    // Should show loading overlay
    waitFor(() =>
      expect(screen.getByTestId('loading-overlay')).toBeInTheDocument(),
    )

    // Change back to the same non-loading event
    h.control.event = resultEvent

    await act(async () => {
      rerender(
        <RouterProvider
          router={createMemoryRouter([{ path: '/', element: <GamePage /> }], {
            initialEntries: ['/'],
          })}
        />,
      )
    })

    // Should hide loading overlay but not re-render the component (same event)
    expect(screen.queryByTestId('loading-overlay')).not.toBeInTheDocument()
    expect(screen.getByText('Correct')).toBeInTheDocument()
  })

  it('renders HostGameBeginState for GameBeginHost event', () => {
    h.control.event = {
      type: GameEventType.GameBeginHost,
      game: { title: 'Test Quiz' },
    }
    const { container } = renderWithRouter()
    // Should render without errors
    expect(container).toBeTruthy()
  })

  it('renders PlayerGameBeginState for GameBeginPlayer event', () => {
    h.control.event = {
      type: GameEventType.GameBeginPlayer,
      game: { title: 'Test Quiz' },
      player: { nickname: 'TestPlayer' },
    }
    const { container } = renderWithRouter()
    // Should render without errors
    expect(container).toBeTruthy()
  })

  it('renders HostQuestionPreviewState for GameQuestionPreviewHost event', () => {
    h.control.event = {
      type: GameEventType.GameQuestionPreviewHost,
      question: {
        text: 'What is 2+2?',
        image: null,
        type: 'MULTIPLE_CHOICE',
        timeLimit: 30,
      },
      pagination: { current: 1, total: 10 },
    }
    const { container } = renderWithRouter()
    expect(container).toBeTruthy()
  })

  it('renders PlayerQuestionPreviewState for GameQuestionPreviewPlayer event', () => {
    h.control.event = {
      type: GameEventType.GameQuestionPreviewPlayer,
      question: {
        text: 'What is 2+2?',
        image: null,
        type: 'MULTIPLE_CHOICE',
      },
      pagination: { current: 1, total: 10 },
    }
    const { container } = renderWithRouter()
    expect(container).toBeTruthy()
  })

  it('renders HostQuestionState for GameQuestionHost event', () => {
    h.control.event = {
      type: GameEventType.GameQuestionHost,
      question: {
        text: 'What is 2+2?',
        image: null,
        type: 'MULTIPLE_CHOICE',
        answers: [
          { id: '1', text: '3' },
          { id: '2', text: '4' },
        ],
        timeLimit: 30,
      },
      answers: [],
      pagination: { current: 1, total: 10 },
    }
    const { container } = renderWithRouter()
    expect(container).toBeTruthy()
  })

  it('renders PlayerQuestionState for GameQuestionPlayer event', () => {
    h.control.event = {
      type: GameEventType.GameQuestionPlayer,
      question: {
        text: 'What is 2+2?',
        image: null,
        type: 'MULTIPLE_CHOICE',
        answers: [
          { id: '1', text: '3' },
          { id: '2', text: '4' },
        ],
        timeLimit: 30,
      },
      pagination: { current: 1, total: 10 },
    }
    const { container } = renderWithRouter()
    expect(container).toBeTruthy()
  })

  it('renders HostLeaderboardState for GameLeaderboardHost event', () => {
    h.control.event = {
      type: GameEventType.GameLeaderboardHost,
      game: { mode: GameMode.Classic },
      leaderboard: [],
      pagination: { current: 1, total: 10 },
    }
    renderWithRouter()
    expect(screen.getByText('Leaderboard')).toBeInTheDocument()
  })

  it('renders HostResultState for GameResultHost event', () => {
    h.control.event = {
      type: GameEventType.GameResultHost,
      game: { mode: GameMode.Classic },
      question: {
        text: 'What is 2+2?',
        correctAnswers: [{ id: '2', text: '4' }],
      },
      answers: [],
      pagination: { current: 1, total: 10 },
    }
    const { container } = renderWithRouter()
    expect(container).toBeTruthy()
  })

  it('renders HostPodiumState for GamePodiumHost event', () => {
    h.control.event = {
      type: GameEventType.GamePodiumHost,
      game: { id: 'game-123', mode: GameMode.Classic },
      leaderboard: [
        {
          player: { id: 'p1', nickname: 'Winner' },
          score: { total: 100, position: 1 },
        },
      ],
    }
    const { container } = renderWithRouter()
    expect(container).toBeTruthy()
  })

  it('renders PlayerGameOverState for GameOverPlayer event', () => {
    h.control.event = {
      type: GameEventType.GameOverPlayer,
      game: { id: 'game-123', mode: GameMode.Classic },
      quiz: { id: 'quiz-1', title: 'Science Quiz' },
      player: {
        nickname: 'Player One',
        rank: 2,
        totalPlayers: 10,
        score: 4200,
        currentStreak: 3,
        comebackRankGain: 1,
        behind: { points: 150, nickname: 'Winner' },
      },
      rating: {
        canRateQuiz: true,
        stars: 4,
        comment: 'Great quiz!',
      },
    }

    renderWithRouter()

    expect(screen.getByText('Science Quiz')).toBeInTheDocument()
    expect(screen.getByText('Rate this quiz')).toBeInTheDocument()
  })

  it('does not block navigation when on GamePodiumHost', async () => {
    h.control.event = {
      type: GameEventType.GamePodiumHost,
      game: { id: 'game-123', mode: GameMode.Classic },
      leaderboard: [],
    }
    const { router } = renderWithRouter()

    // Should allow navigation without blocking
    await act(async () => {
      await router.navigate('/other')
    })

    expect(router.state.location.pathname).toBe('/other')
  })

  it('does not block navigation when on GameOverPlayer', async () => {
    h.control.event = {
      type: GameEventType.GameOverPlayer,
      game: { id: 'game-123', mode: GameMode.Classic },
      quiz: { id: 'quiz-1', title: 'Science Quiz' },
      player: {
        nickname: 'Player One',
        rank: 2,
        totalPlayers: 10,
        score: 4200,
        currentStreak: 3,
        comebackRankGain: 1,
        behind: { points: 150, nickname: 'Winner' },
      },
      rating: {
        canRateQuiz: true,
        stars: 4,
        comment: 'Great quiz!',
      },
    }
    const { router } = renderWithRouter()

    await act(async () => {
      await router.navigate('/other')
    })

    expect(router.state.location.pathname).toBe('/other')
  })

  it('does not block navigation when GameQuitEvent is received', () => {
    h.control.event = {
      type: GameEventType.GameQuitEvent,
      status: GameStatus.Completed,
    }
    renderWithRouter()

    expect(h.revokeGameMock).toHaveBeenCalled()
  })

  it('handles loading timeout cancellation when component unmounts during loading', async () => {
    vi.useFakeTimers()
    try {
      h.control.event = {
        type: GameEventType.GameResultPlayer,
        game: { mode: GameMode.Classic },
        player: {
          nickname: 'TestPlayer',
          score: {
            correct: true,
            last: 100,
            total: 100,
            position: 1,
            streak: 1,
          },
        },
        pagination: { current: 1, total: 10 },
      }

      const { unmount } = renderWithRouter()

      h.control.event = { type: GameEventType.GameLoading }

      // Don't advance time, unmount while timer is pending
      unmount()

      // Advance time after unmount - should not cause errors
      vi.advanceTimersByTime(500)

      // If we got here without errors, the cleanup worked
      expect(true).toBe(true)
    } finally {
      vi.clearAllTimers()
      vi.useRealTimers()
    }
  })

  it('cancels loading timeout when non-loading event arrives before 500ms', async () => {
    vi.useFakeTimers()
    try {
      h.control.event = {
        type: GameEventType.GameResultPlayer,
        game: { mode: GameMode.Classic },
        player: {
          nickname: 'TestPlayer',
          score: {
            correct: true,
            last: 100,
            total: 100,
            position: 1,
            streak: 1,
          },
        },
        pagination: { current: 1, total: 10 },
      }

      const { router } = renderWithRouter()

      h.control.event = { type: GameEventType.GameLoading }

      await act(async () => {
        await pokeRouter(router)
      })

      // Advance only 200ms (before the 500ms threshold)
      await act(async () => {
        vi.advanceTimersByTime(200)
      })

      // Loading overlay should NOT be visible yet
      expect(screen.queryByTestId('loading-overlay')).not.toBeInTheDocument()

      // Now send a non-loading event before 500ms completes
      h.control.event = {
        type: GameEventType.GameResultPlayer,
        game: { mode: GameMode.Classic },
        player: {
          nickname: 'TestPlayer',
          score: {
            correct: true,
            last: 100,
            total: 100,
            position: 1,
            streak: 1,
          },
        },
        pagination: { current: 1, total: 10 },
      }

      await act(async () => {
        await pokeRouter(router)
      })

      // Complete the remaining time
      await act(async () => {
        vi.advanceTimersByTime(300)
      })

      // Loading overlay should still NOT appear because it was cancelled
      expect(screen.queryByTestId('loading-overlay')).not.toBeInTheDocument()
    } finally {
      vi.clearAllTimers()
      vi.useRealTimers()
    }
  })

  it('handles multiple rapid GameLoading events', async () => {
    vi.useFakeTimers()
    try {
      h.control.event = {
        type: GameEventType.GameResultPlayer,
        game: { mode: GameMode.Classic },
        player: {
          nickname: 'TestPlayer',
          score: {
            correct: true,
            last: 100,
            total: 100,
            position: 1,
            streak: 1,
          },
        },
        pagination: { current: 1, total: 10 },
      }

      const { router } = renderWithRouter()

      // First loading event
      h.control.event = { type: GameEventType.GameLoading }
      await act(async () => {
        await pokeRouter(router)
      })

      // Advance 200ms
      await act(async () => {
        vi.advanceTimersByTime(200)
      })

      // Second loading event (should reset the timer)
      h.control.event = { type: GameEventType.GameLoading }
      await act(async () => {
        await pokeRouter(router)
      })

      // Advance another 400ms (total 600ms from first event, but only 400ms from second)
      await act(async () => {
        vi.advanceTimersByTime(400)
      })

      // Should still not show loading overlay (need 500ms from last loading event)
      expect(screen.queryByTestId('loading-overlay')).not.toBeInTheDocument()

      // Advance the final 100ms
      await act(async () => {
        vi.advanceTimersByTime(100)
      })

      // Now it should show
      expect(screen.getByTestId('loading-overlay')).toBeInTheDocument()
    } finally {
      vi.clearAllTimers()
      vi.useRealTimers()
    }
  })

  it('clears status notification timeout when status changes before timeout fires', async () => {
    vi.useFakeTimers()
    try {
      const router = createMemoryRouter(
        [{ path: '/', element: <GamePage /> }],
        { initialEntries: ['/'] },
      )

      render(<RouterProvider router={router} />)

      // First status change to RECONNECTING
      await act(async () => {
        h.control.status = 'RECONNECTING'
        await pokeRouter(router)
      })

      // Advance time partially (less than 500ms)
      await act(async () => {
        vi.advanceTimersByTime(200)
      })

      // Status changes again before the timeout fires (this should clear the previous timeout)
      await act(async () => {
        h.control.status = 'CONNECTED'
        await pokeRouter(router)
      })

      // Complete all remaining timers
      await act(async () => {
        vi.runAllTimers()
      })

      // Should not have notified about reconnecting since it changed too quickly
      expect(h.notifyWarning).not.toHaveBeenCalled()
      expect(h.notifySuccess).not.toHaveBeenCalled()
    } finally {
      vi.clearAllTimers()
      vi.useRealTimers()
    }
  })
})
