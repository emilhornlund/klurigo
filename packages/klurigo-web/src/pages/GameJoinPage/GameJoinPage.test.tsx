import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type React from 'react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual =
    await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

const mockJoinGame = vi.fn()
vi.mock('../../api', () => ({
  useKlurigoServiceClient: () => ({ joinGame: mockJoinGame }),
}))

let providedIsUserAuthenticated = true

vi.mock('../../context/auth', () => ({
  useAuthContext: () => ({
    isUserAuthenticated: providedIsUserAuthenticated,
  }),
}))

let providedGameID: string | undefined = 'GAME123'
let providedDefaultNickname: string | undefined = undefined

vi.mock('../../context/game', () => ({
  useGameContext: () => ({ gameID: providedGameID }),
}))

vi.mock('../../context/user', () => ({
  useUserContext: () => ({
    currentUser: providedDefaultNickname
      ? { defaultNickname: providedDefaultNickname }
      : undefined,
  }),
}))

vi.mock('./text.utils', () => ({
  TITLES: ['Join the game', 'Another title'],
  MESSAGES: ['Pick a nickname and jump in!', 'Another message'],
}))

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

    NicknameTextField: ({
      value,
      placeholder,
      disabled,
      onChange,
      onValid,
    }: {
      value: string
      placeholder?: string
      disabled?: boolean
      onChange: (value: string) => void
      onValid: (valid: boolean) => void
    }) => {
      const validate = (v: string) => v.trim().length > 0

      return (
        <input
          data-testid="nickname-input"
          placeholder={placeholder ?? 'Nickname'}
          disabled={disabled}
          value={value}
          onChange={(e) => {
            const next = e.target.value
            onChange(next)
            onValid(validate(next))
          }}
        />
      )
    },
  }
})

import GameJoinPage from './GameJoinPage'

const renderWithRouter = (ui: React.ReactElement, route = '/join') =>
  render(<MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>)

beforeEach(() => {
  vi.clearAllMocks()
  providedGameID = 'GAME123'
  providedDefaultNickname = undefined
  providedIsUserAuthenticated = true
  mockJoinGame.mockResolvedValue(undefined)
})

describe('GameJoinPage', () => {
  it('renders title and message (via RotatingMessage)', () => {
    const { container } = renderWithRouter(<GameJoinPage />)

    expect(screen.getByText('Join the game')).toBeInTheDocument()
    expect(screen.getByText('Pick a nickname and jump in!')).toBeInTheDocument()

    expect(container).toMatchSnapshot()
  })

  it('navigates back when clicking the back button', () => {
    const { container } = renderWithRouter(<GameJoinPage />)

    fireEvent.click(screen.getByRole('button', { name: /back/i }))
    expect(mockNavigate).toHaveBeenCalledWith(-1)

    expect(container).toMatchSnapshot()
  })

  it('join button stays disabled until nickname is valid', () => {
    const { container } = renderWithRouter(<GameJoinPage />)

    const joinBtn = screen.getByRole('button', { name: /ok, go!/i })
    expect(joinBtn).toBeDisabled()

    fireEvent.change(screen.getByTestId('nickname-input'), {
      target: { value: 'Emil' },
    })

    expect(joinBtn).not.toBeDisabled()
    expect(container).toMatchSnapshot()
  })

  it('submits with gameID and nickname and navigates to /game', async () => {
    let resolveJoin!: () => void
    mockJoinGame.mockReturnValueOnce(
      new Promise<void>((r) => {
        resolveJoin = r
      }),
    )

    const { container } = renderWithRouter(<GameJoinPage />)

    fireEvent.change(screen.getByTestId('nickname-input'), {
      target: { value: 'Emil' },
    })

    fireEvent.click(screen.getByRole('button', { name: /ok, go!/i }))

    expect(mockJoinGame).toHaveBeenCalledWith('GAME123', 'Emil')

    resolveJoin()
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/game'))

    expect(container).toMatchSnapshot()
  })

  it('does nothing when gameID is missing', () => {
    providedGameID = undefined
    const { container } = renderWithRouter(<GameJoinPage />)

    fireEvent.change(screen.getByTestId('nickname-input'), {
      target: { value: 'Someone' },
    })

    fireEvent.click(screen.getByRole('button', { name: /ok, go!/i }))

    expect(mockJoinGame).not.toHaveBeenCalled()
    expect(mockNavigate).not.toHaveBeenCalledWith('/game')

    expect(container).toMatchSnapshot()
  })

  it('starts with empty nickname when user has no default, keeping Join disabled', () => {
    providedDefaultNickname = undefined
    const { container } = renderWithRouter(<GameJoinPage />)

    const input = screen.getByTestId('nickname-input') as HTMLInputElement
    const joinBtn = screen.getByRole('button', { name: /ok, go!/i })

    expect(input.value).toBe('')
    expect(joinBtn).toBeDisabled()

    expect(container).toMatchSnapshot()
  })

  it('prefills nickname from user default and enables Join after validation is triggered', async () => {
    providedDefaultNickname = 'PreFilledNick'
    const { container } = renderWithRouter(<GameJoinPage />)

    const input = screen.getByPlaceholderText(/nickname/i) as HTMLInputElement
    const joinBtn = screen.getByRole('button', { name: /ok, go!/i })

    expect(input.value).toBe('PreFilledNick')
    expect(joinBtn).toBeDisabled()

    fireEvent.change(input, { target: { value: 'PreFilledNick2' } })

    await waitFor(() => {
      expect(joinBtn).not.toBeDisabled()
    })

    expect(container).toMatchSnapshot()
  })

  it('does not submit when nickname is blank or whitespace', () => {
    const { container } = renderWithRouter(<GameJoinPage />)

    const input = screen.getByTestId('nickname-input')
    const joinBtn = screen.getByRole('button', { name: /ok, go!/i })

    fireEvent.change(input, { target: { value: '   ' } })
    expect(joinBtn).toBeDisabled()

    fireEvent.submit(screen.getByTestId('join-form'))

    expect(mockJoinGame).not.toHaveBeenCalled()
    expect(container).toMatchSnapshot()
  })

  it('disables the input while joining and re-enables after promise resolves', async () => {
    let resolveJoin!: () => void
    mockJoinGame.mockReturnValueOnce(
      new Promise<void>((r) => {
        resolveJoin = r
      }),
    )

    const { container } = renderWithRouter(<GameJoinPage />)

    const input = screen.getByTestId('nickname-input') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'Runner' } })

    fireEvent.click(screen.getByRole('button', { name: /ok, go!/i }))

    expect(mockJoinGame).toHaveBeenCalledWith('GAME123', 'Runner')
    expect(input.disabled).toBe(true)

    resolveJoin()
    await waitFor(() => expect(input.disabled).toBe(false))

    expect(container).toMatchSnapshot()
  })

  it('handles a rejected join without navigating and re-enables the controls', async () => {
    mockJoinGame.mockRejectedValueOnce(new Error('Active game not found'))

    renderWithRouter(<GameJoinPage />)

    const input = screen.getByTestId('nickname-input') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'Runner' } })
    fireEvent.click(screen.getByRole('button', { name: /ok, go!/i }))

    await waitFor(() => expect(input.disabled).toBe(false))

    expect(mockNavigate).not.toHaveBeenCalledWith('/game')
    expect(screen.getByRole('button', { name: /ok, go!/i })).not.toBeDisabled()
  })

  it('submits when the form is submitted (Enter key equivalent)', async () => {
    let resolveJoin!: () => void
    mockJoinGame.mockReturnValueOnce(
      new Promise<void>((r) => {
        resolveJoin = r
      }),
    )

    const { container } = renderWithRouter(<GameJoinPage />)

    fireEvent.change(screen.getByTestId('nickname-input'), {
      target: { value: 'KeyUser' },
    })

    fireEvent.submit(screen.getByTestId('join-form'))

    expect(mockJoinGame).toHaveBeenCalledWith('GAME123', 'KeyUser')

    resolveJoin()
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/game'))

    expect(container).toMatchSnapshot()
  })

  it('disables the input immediately after submit while join is in-flight', async () => {
    let resolveJoin!: () => void
    mockJoinGame.mockReturnValueOnce(
      new Promise<void>((r) => {
        resolveJoin = r
      }),
    )

    renderWithRouter(<GameJoinPage />)

    const input = screen.getByPlaceholderText(/nickname/i) as HTMLInputElement

    fireEvent.change(input, { target: { value: 'Speedy' } })

    await act(async () => {
      fireEvent.submit(screen.getByTestId('join-form'))
    })

    expect(mockJoinGame).toHaveBeenCalledWith('GAME123', 'Speedy')
    expect(input.disabled).toBe(true)

    resolveJoin()
    await waitFor(() => expect(input.disabled).toBe(false))
  })

  it('does not render the create-account call-to-action when the user is authenticated', () => {
    providedIsUserAuthenticated = true
    renderWithRouter(<GameJoinPage />)

    expect(
      screen.queryByRole('button', { name: /make every game count/i }),
    ).not.toBeInTheDocument()

    expect(
      screen.queryByText(/create an account to save your results/i),
    ).not.toBeInTheDocument()
  })

  it('renders the create-account call-to-action when the user is not authenticated', () => {
    providedIsUserAuthenticated = false
    renderWithRouter(<GameJoinPage />)

    expect(
      screen.getByText(/anonymous play doesn’t keep history/i),
    ).toBeInTheDocument()

    expect(
      screen.getByText(
        /login to track stats, build quizzes, and host your own live games/i,
      ),
    ).toBeInTheDocument()
  })

  it('navigates to /auth/login when clicking the create-account call-to-action', () => {
    providedIsUserAuthenticated = false
    renderWithRouter(<GameJoinPage />)

    fireEvent.click(
      screen.getByRole('button', { name: /make every game count/i }),
    )

    expect(mockNavigate).toHaveBeenCalledWith('/auth/login')
  })

  it('does not attempt to join the game when clicking the create-account call-to-action', () => {
    providedIsUserAuthenticated = false
    renderWithRouter(<GameJoinPage />)

    fireEvent.click(
      screen.getByRole('button', { name: /make every game count/i }),
    )

    expect(mockJoinGame).not.toHaveBeenCalled()
  })

  it('still joins successfully when not authenticated (CTA present)', async () => {
    providedIsUserAuthenticated = false

    let resolveJoin!: () => void
    mockJoinGame.mockReturnValueOnce(
      new Promise<void>((r) => {
        resolveJoin = r
      }),
    )

    renderWithRouter(<GameJoinPage />)

    fireEvent.change(screen.getByTestId('nickname-input'), {
      target: { value: 'GuestUser' },
    })

    fireEvent.click(screen.getByRole('button', { name: /ok, go!/i }))

    expect(mockJoinGame).toHaveBeenCalledWith('GAME123', 'GuestUser')

    resolveJoin()
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/game'))
  })
})
