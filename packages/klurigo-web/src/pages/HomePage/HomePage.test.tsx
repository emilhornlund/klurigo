import { GameStatus } from '@klurigo/common'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError } from '../../api/api.utils'

import HomePage from './HomePage'

const navigateMock = vi.fn()

const authContextMock = vi.fn()
vi.mock('../../context/auth', () => ({
  useAuthContext: () => authContextMock(),
}))

const quizServiceClientMock = vi.fn()
vi.mock('../../api', () => ({
  useKlurigoServiceClient: () => quizServiceClientMock(),
}))

vi.mock('react-router-dom', async () => {
  const actual =
    await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => navigateMock,
  }
})

vi.mock('../../components', async () => {
  const actual =
    await vi.importActual<typeof import('../../components')>('../../components')

  return {
    ...actual,
    RotatingMessage: ({
      messages,
      renderMessage,
    }: {
      messages: string[]
      renderMessage?: (message: string) => React.ReactNode
    }) => {
      const message = messages[0] ?? ''
      if (!message) return null
      return (
        <div data-testid="rotating-message">
          {renderMessage ? renderMessage(message) : message}
        </div>
      )
    },
  }
})

const renderHome = () => {
  return render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>,
  )
}

describe('HomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    authContextMock.mockReturnValue({
      isUserAuthenticated: false,
      game: undefined,
      revokeGame: vi.fn(),
    })

    quizServiceClientMock.mockReturnValue({
      authenticateGame: vi.fn().mockResolvedValue(undefined),
      getGame: vi.fn().mockResolvedValue({
        id: 'game-123',
        status: GameStatus.Active,
      }),
    })
  })

  it('renders the base layout and the rotating message container', () => {
    const { container } = renderHome()

    expect(screen.getByText('Let’s play')).toBeInTheDocument()

    expect(screen.getByTestId('rotating-message')).toBeInTheDocument()
    expect(
      screen.getByText('Ready to show off your skills? Let’s go!'),
    ).toBeInTheDocument()

    expect(screen.getByPlaceholderText('Game PIN')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /join the game/i }),
    ).toBeInTheDocument()

    expect(container).toMatchSnapshot()
  })

  it('shows the login link when unauthenticated', () => {
    renderHome()

    expect(
      screen.getByRole('link', {
        name: /want to create your own quiz\? log in/i,
      }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('link', {
        name: /create your own quiz and challenge others/i,
      }),
    ).not.toBeInTheDocument()
  })

  it('shows the create quiz link when authenticated', () => {
    authContextMock.mockReturnValue({
      isUserAuthenticated: true,
      game: undefined,
      revokeGame: vi.fn(),
    })

    renderHome()

    expect(
      screen.getByRole('link', {
        name: /create your own quiz and challenge others/i,
      }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('link', {
        name: /want to create your own quiz\? log in/i,
      }),
    ).not.toBeInTheDocument()
  })

  it('does not render the "Resume game" button if there is no active game', () => {
    renderHome()

    expect(
      screen.queryByRole('button', { name: /resume game/i }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByText(/jump back in where you left off/i),
    ).not.toBeInTheDocument()
  })

  it('renders the "Resume game" button if the backend confirms an active game', async () => {
    authContextMock.mockReturnValue({
      isUserAuthenticated: false,
      game: {
        ACCESS: {
          gameId: 'game-123',
        },
      },
      revokeGame: vi.fn(),
    })

    const { container } = renderHome()

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /resume game/i }),
      ).toBeInTheDocument()
    })

    expect(
      screen.getByRole('button', { name: /resume game/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/jump back in where you left off/i),
    ).toBeInTheDocument()

    expect(container).toMatchSnapshot()
  })

  it('does not render Resume game before the backend confirms the game is active', async () => {
    let resolveGame: (game: { id: string; status: GameStatus }) => void = () =>
      undefined
    const getGame = vi.fn(
      () =>
        new Promise<{ id: string; status: GameStatus }>((resolve) => {
          resolveGame = resolve
        }),
    )

    authContextMock.mockReturnValue({
      isUserAuthenticated: false,
      game: { ACCESS: { gameId: 'game-123' } },
      revokeGame: vi.fn(),
    })
    quizServiceClientMock.mockReturnValue({
      authenticateGame: vi.fn(),
      getGame,
    })

    renderHome()

    expect(
      screen.queryByRole('button', { name: /resume game/i }),
    ).not.toBeInTheDocument()

    resolveGame({ id: 'game-123', status: GameStatus.Active })

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /resume game/i }),
      ).toBeInTheDocument()
    })
  })

  it.each([GameStatus.Expired, GameStatus.Completed, GameStatus.Terminated])(
    'does not render Resume game for a %s game and clears stale authentication',
    async (status) => {
      const revokeGame = vi.fn().mockResolvedValue(undefined)
      const getGame = vi.fn().mockResolvedValue({
        id: 'game-123',
        status,
      })

      authContextMock.mockReturnValue({
        isUserAuthenticated: false,
        game: { ACCESS: { gameId: 'game-123' } },
        revokeGame,
      })
      quizServiceClientMock.mockReturnValue({
        authenticateGame: vi.fn(),
        getGame,
      })

      renderHome()

      expect(
        screen.queryByRole('button', { name: /resume game/i }),
      ).not.toBeInTheDocument()

      await waitFor(() => {
        expect(revokeGame).toHaveBeenCalledWith({ redirect: false })
      })
      expect(
        screen.queryByRole('button', { name: /resume game/i }),
      ).not.toBeInTheDocument()
    },
  )

  it('does not render Resume game when game validation fails', async () => {
    const revokeGame = vi.fn()
    const getGame = vi.fn().mockRejectedValue(new Error('Network down'))

    authContextMock.mockReturnValue({
      isUserAuthenticated: false,
      game: { ACCESS: { gameId: 'game-123' } },
      revokeGame,
    })
    quizServiceClientMock.mockReturnValue({
      authenticateGame: vi.fn(),
      getGame,
    })

    renderHome()

    await waitFor(() => {
      expect(getGame).toHaveBeenCalledWith('game-123')
    })
    expect(
      screen.queryByRole('button', { name: /resume game/i }),
    ).not.toBeInTheDocument()
    expect(revokeGame).not.toHaveBeenCalled()
  })

  it('clicking "Resume game" authenticates the game and navigates to /game on success', async () => {
    const user = userEvent.setup()

    const authenticateGame = vi.fn().mockResolvedValue(undefined)

    authContextMock.mockReturnValue({
      isUserAuthenticated: false,
      game: {
        ACCESS: {
          gameId: 'game-123',
        },
      },
      revokeGame: vi.fn(),
    })

    quizServiceClientMock.mockReturnValue({
      authenticateGame,
      getGame: vi.fn().mockResolvedValue({
        id: 'game-123',
        status: GameStatus.Active,
      }),
    })

    renderHome()

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /resume game/i }),
      ).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /resume game/i }))

    await waitFor(() => {
      expect(authenticateGame).toHaveBeenCalledWith({ gameId: 'game-123' })
      expect(navigateMock).toHaveBeenCalledWith('/game')
    })
  })

  it('clicking "Resume game" revokes the game token on 401 ApiError', async () => {
    const user = userEvent.setup()

    const revokeGame = vi.fn()
    const authenticateGame = vi
      .fn()
      .mockRejectedValue(new ApiError('Unauthorized', 401))

    authContextMock.mockReturnValue({
      isUserAuthenticated: false,
      game: {
        ACCESS: {
          gameId: 'game-123',
        },
      },
      revokeGame,
    })

    quizServiceClientMock.mockReturnValue({
      authenticateGame,
      getGame: vi.fn().mockResolvedValue({
        id: 'game-123',
        status: GameStatus.Active,
      }),
    })

    const preventUnhandled = (event: PromiseRejectionEvent) =>
      event.preventDefault()
    window.addEventListener('unhandledrejection', preventUnhandled)

    renderHome()

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /resume game/i }),
      ).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /resume game/i }))

    await waitFor(() => {
      expect(authenticateGame).toHaveBeenCalledWith({ gameId: 'game-123' })
      expect(revokeGame).toHaveBeenCalledTimes(1)
    })

    window.removeEventListener('unhandledrejection', preventUnhandled)
  })

  it('submitting the join form navigates to /auth/game?pin=... when a pin is present', async () => {
    const user = userEvent.setup()

    renderHome()

    const input = screen.getByPlaceholderText('Game PIN') as HTMLInputElement
    await user.type(input, '123456')

    const form = input.closest('form')
    expect(form).not.toBeNull()

    fireEvent.submit(form as HTMLFormElement)

    expect(navigateMock).toHaveBeenCalledWith('/auth/game?pin=123456')
  })

  it('does not navigate on submit if the pin is empty', () => {
    renderHome()

    const input = screen.getByPlaceholderText('Game PIN') as HTMLInputElement
    const form = input.closest('form')
    expect(form).not.toBeNull()

    fireEvent.submit(form as HTMLFormElement)

    expect(navigateMock).not.toHaveBeenCalled()
  })

  it('keeps "Join the game" disabled until the Game PIN is valid', async () => {
    const user = userEvent.setup()

    renderHome()

    const joinButton = screen.getByRole('button', { name: /join the game/i })
    expect(joinButton).toBeDisabled()

    await user.type(screen.getByTestId('test-game-pin-textfield'), '123')
    expect(joinButton).toBeDisabled()

    await user.clear(screen.getByTestId('test-game-pin-textfield'))
    await user.type(screen.getByTestId('test-game-pin-textfield'), '123456')
    expect(joinButton).not.toBeDisabled()
  })

  it('does not navigate when clicking "Join the game" while disabled', async () => {
    const user = userEvent.setup()

    renderHome()

    const joinButton = screen.getByRole('button', { name: /join the game/i })
    expect(joinButton).toBeDisabled()

    await user.click(joinButton)

    expect(navigateMock).not.toHaveBeenCalled()
  })

  it('navigates to /auth/game?pin=... when clicking "Join the game" with a valid pin', async () => {
    const user = userEvent.setup()

    renderHome()

    await user.type(screen.getByTestId('test-game-pin-textfield'), '123456')

    const joinButton = screen.getByRole('button', { name: /join the game/i })
    expect(joinButton).not.toBeDisabled()

    await user.click(joinButton)

    expect(navigateMock).toHaveBeenCalledWith('/auth/game?pin=123456')
  })

  it('does not revoke the game token when "Resume game" fails with a non-401 ApiError', async () => {
    const user = userEvent.setup()

    const revokeGame = vi.fn()
    const authenticateGame = vi
      .fn()
      .mockRejectedValue(new ApiError('Forbidden', 403))

    authContextMock.mockReturnValue({
      isUserAuthenticated: false,
      game: {
        ACCESS: {
          gameId: 'game-123',
        },
      },
      revokeGame,
    })

    quizServiceClientMock.mockReturnValue({
      authenticateGame,
      getGame: vi.fn().mockResolvedValue({
        id: 'game-123',
        status: GameStatus.Active,
      }),
    })

    const preventUnhandled = (event: PromiseRejectionEvent) =>
      event.preventDefault()
    window.addEventListener('unhandledrejection', preventUnhandled)

    renderHome()

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /resume game/i }),
      ).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /resume game/i }))

    await waitFor(() => {
      expect(authenticateGame).toHaveBeenCalledWith({ gameId: 'game-123' })
    })

    expect(revokeGame).not.toHaveBeenCalled()
    expect(navigateMock).not.toHaveBeenCalledWith('/game')

    window.removeEventListener('unhandledrejection', preventUnhandled)
  })

  it('does not revoke the game token when "Resume game" fails with a non-ApiError', async () => {
    const user = userEvent.setup()

    const revokeGame = vi.fn()
    const authenticateGame = vi
      .fn()
      .mockRejectedValue(new Error('Network down'))

    authContextMock.mockReturnValue({
      isUserAuthenticated: false,
      game: {
        ACCESS: {
          gameId: 'game-123',
        },
      },
      revokeGame,
    })

    quizServiceClientMock.mockReturnValue({
      authenticateGame,
      getGame: vi.fn().mockResolvedValue({
        id: 'game-123',
        status: GameStatus.Active,
      }),
    })

    const preventUnhandled = (event: PromiseRejectionEvent) =>
      event.preventDefault()
    window.addEventListener('unhandledrejection', preventUnhandled)

    renderHome()

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /resume game/i }),
      ).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /resume game/i }))

    await waitFor(() => {
      expect(authenticateGame).toHaveBeenCalledWith({ gameId: 'game-123' })
    })

    expect(revokeGame).not.toHaveBeenCalled()
    expect(navigateMock).not.toHaveBeenCalledWith('/game')

    window.removeEventListener('unhandledrejection', preventUnhandled)
  })

  it('renders the unauthenticated link pointing to /auth/login', () => {
    authContextMock.mockReturnValue({
      isUserAuthenticated: false,
      game: undefined,
      revokeGame: vi.fn(),
    })

    renderHome()

    const link = screen.getByRole('link', {
      name: /want to create your own quiz\? log in to get started!/i,
    })

    expect(link).toHaveAttribute('href', '/auth/login')
  })

  it('renders the authenticated link pointing to /quiz/create', () => {
    authContextMock.mockReturnValue({
      isUserAuthenticated: true,
      game: undefined,
      revokeGame: vi.fn(),
    })

    renderHome()

    const link = screen.getByRole('link', {
      name: /create your own quiz and challenge others!/i,
    })

    expect(link).toHaveAttribute('href', '/quiz/create')
  })
})
