import {
  AuthProvider,
  type CrittersAvatarConfigurationV1,
  DEFAULT_CRITTERS_AVATAR_V1,
  isCrittersAvatarConfigurationV1,
} from '@klurigo/common'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockNavigate = vi.fn()
const mockJoinGame = vi.fn()
const mockGetGame = vi.fn()
const mockRevokeGame = vi.fn()
const mockSetCurrentUser = vi.fn()
let authenticated = true
let gameID: string | undefined = 'GAME123'
let defaultNickname = ''
let savedAvatar: CrittersAvatarConfigurationV1 | undefined =
  DEFAULT_CRITTERS_AVATAR_V1

vi.mock('react-router-dom', async () => ({
  ...(await vi.importActual<typeof import('react-router-dom')>(
    'react-router-dom',
  )),
  useNavigate: () => mockNavigate,
}))
vi.mock('../../api', () => ({
  useKlurigoServiceClient: () => ({
    joinGame: mockJoinGame,
    getGame: mockGetGame,
  }),
}))
vi.mock('../../context/auth', () => ({
  useAuthContext: () => ({
    isUserAuthenticated: authenticated,
    user: authenticated ? { ACCESS: { sub: 'account' } } : undefined,
    revokeGame: mockRevokeGame,
  }),
}))
vi.mock('../../context/game', () => ({
  useGameContext: () => ({
    gameID,
    participantId: authenticated ? 'account' : 'guest',
  }),
}))
vi.mock('../../context/user', () => ({
  useUserContext: () => ({
    currentUser: authenticated
      ? {
          id: 'account',
          email: 'account@example.com',
          authProvider: AuthProvider.Local,
          defaultNickname,
          avatar: savedAvatar,
        }
      : undefined,
    setCurrentUser: mockSetCurrentUser,
  }),
}))
vi.mock('../../components/PlayerAvatar', () => ({
  default: ({ alt }: { alt: string }) => (
    <img alt={alt} src="avatar-preview.svg" />
  ),
}))
vi.mock('./text.utils', () => ({
  TITLES: ['Join the game'],
  MESSAGES: ['Pick a nickname and jump in!'],
}))

import GameJoinPage from './GameJoinPage'

const renderJoin = () =>
  render(
    <MemoryRouter>
      <GameJoinPage />
    </MemoryRouter>,
  )
const enterNickname = (value = 'Player') =>
  fireEvent.change(screen.getByPlaceholderText('Nickname'), {
    target: { value },
  })
const submit = () =>
  fireEvent.submit(screen.getByRole('form', { name: 'Join game' }))
const storedAvatar = () =>
  JSON.parse(
    localStorage.getItem(
      `klurigo:join-avatar:${gameID}:${authenticated ? 'account:account' : 'guest:guest'}`,
    )!,
  ) as CrittersAvatarConfigurationV1

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  authenticated = true
  gameID = 'GAME123'
  defaultNickname = ''
  savedAvatar = DEFAULT_CRITTERS_AVATAR_V1
  mockJoinGame.mockResolvedValue(undefined)
  mockGetGame.mockResolvedValue({ id: gameID })
  mockRevokeGame.mockResolvedValue(undefined)
})

describe('GameJoinPage', () => {
  it('retains the original title, message, and form layout with an avatar trigger', () => {
    const { container } = renderJoin()
    expect(screen.getByText('Join the game')).toBeVisible()
    expect(screen.getByText('Pick a nickname and jump in!')).toBeVisible()
    expect(
      screen.getByRole('button', { name: 'Customize avatar' }),
    ).toBeVisible()
    expect(screen.queryByText('Preparing your avatar…')).not.toBeInTheDocument()
    expect(container).toMatchSnapshot()
  })

  it('revokes game authentication through the existing Back action', () => {
    renderJoin()
    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    expect(mockRevokeGame).toHaveBeenCalledWith({ redirectTo: '/' })
  })

  it.each(['', '   '])(
    'does not join with an invalid nickname %p',
    (nickname) => {
      renderJoin()
      enterNickname(nickname)
      expect(screen.getByRole('button', { name: 'OK, Go!' })).toBeDisabled()
      submit()
      expect(mockJoinGame).not.toHaveBeenCalled()
    },
  )

  it('prefills the account nickname and submits the saved avatar with it', async () => {
    defaultNickname = 'PreFilledNick'
    savedAvatar = { ...DEFAULT_CRITTERS_AVATAR_V1, top: null }
    renderJoin()
    expect(screen.getByPlaceholderText('Nickname')).toHaveValue(defaultNickname)
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'OK, Go!' })).toBeEnabled(),
    )
    submit()
    expect(mockJoinGame).toHaveBeenCalledExactlyOnceWith(
      gameID,
      defaultNickname,
      savedAvatar,
    )
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/game'))
  })

  it('uses the stable default for an account with no saved avatar', async () => {
    savedAvatar = undefined
    renderJoin()
    enterNickname()
    submit()
    expect(mockJoinGame).toHaveBeenCalledWith(
      gameID,
      'Player',
      DEFAULT_CRITTERS_AVATAR_V1,
    )
    await waitFor(() =>
      expect(screen.getByPlaceholderText('Nickname')).toBeEnabled(),
    )
  })

  it('does not join without a game ID', () => {
    gameID = undefined
    renderJoin()
    enterNickname()
    submit()
    expect(mockJoinGame).not.toHaveBeenCalled()
  })

  it('disables input and customization during a join, then restores the controls', async () => {
    let finish!: () => void
    mockJoinGame.mockReturnValue(
      new Promise<void>((resolve) => {
        finish = resolve
      }),
    )
    renderJoin()
    enterNickname()
    submit()
    expect(screen.getByPlaceholderText('Nickname')).toBeDisabled()
    expect(
      screen.getByRole('button', { name: 'Customize avatar' }),
    ).toBeDisabled()
    await act(async () => finish())
    expect(screen.getByPlaceholderText('Nickname')).toBeEnabled()
    expect(mockNavigate).toHaveBeenCalledWith('/game')
  })

  it('retains the nickname and exact design after failure and retries only the join', async () => {
    mockJoinGame.mockRejectedValueOnce(new Error('Join failed'))
    renderJoin()
    enterNickname()
    submit()
    await waitFor(() =>
      expect(screen.getByPlaceholderText('Nickname')).toBeEnabled(),
    )
    expect(screen.getByPlaceholderText('Nickname')).toHaveValue('Player')
    expect(mockNavigate).not.toHaveBeenCalled()
    submit()
    expect(mockJoinGame).toHaveBeenNthCalledWith(
      2,
      gameID,
      'Player',
      DEFAULT_CRITTERS_AVATAR_V1,
    )
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/game'))
  })

  it('does not navigate after the joining page was unmounted', async () => {
    let finish!: () => void
    mockJoinGame.mockReturnValue(
      new Promise<void>((resolve) => {
        finish = resolve
      }),
    )
    const view = renderJoin()
    enterNickname()
    submit()
    view.unmount()
    await act(async () => finish())
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it.each(['game', 'account'])(
    'ignores an old join response after an in-place %s switch',
    async (scope) => {
      let finish!: () => void
      mockJoinGame.mockReturnValue(
        new Promise<void>((resolve) => {
          finish = resolve
        }),
      )
      const view = renderJoin()
      enterNickname()
      submit()
      if (scope === 'game') gameID = 'OTHER'
      else authenticated = false
      view.rerender(
        <MemoryRouter>
          <GameJoinPage />
        </MemoryRouter>,
      )

      await act(async () => finish())

      expect(mockNavigate).not.toHaveBeenCalled()
      expect(mockSetCurrentUser).not.toHaveBeenCalled()
      expect(screen.getByPlaceholderText('Nickname')).toBeEnabled()
    },
  )

  it('closes an old identity dialog and restores the new game draft on an in-place switch', () => {
    const view = renderJoin()
    fireEvent.click(screen.getByRole('button', { name: 'Customize avatar' }))
    fireEvent.click(screen.getByRole('radio', { name: 'Body: Block' }))
    gameID = 'OTHER'
    const nextAvatar = { ...DEFAULT_CRITTERS_AVATAR_V1, eyes: 'wink' }
    localStorage.setItem(
      'klurigo:join-avatar:OTHER:account:account',
      JSON.stringify(nextAvatar),
    )
    view.rerender(
      <MemoryRouter>
        <GameJoinPage />
      </MemoryRouter>,
    )

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(storedAvatar()).toEqual(nextAvatar)
    expect(
      JSON.parse(
        localStorage.getItem('klurigo:join-avatar:GAME123:account:account')!,
      ),
    ).toEqual(DEFAULT_CRITTERS_AVATAR_V1)
  })

  it('resumes accepted participants without preparing or changing their design', async () => {
    mockGetGame.mockResolvedValue({
      participant: { id: 'account', avatar: DEFAULT_CRITTERS_AVATAR_V1 },
    })
    renderJoin()
    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith('/game', { replace: true }),
    )
    expect(mockJoinGame).not.toHaveBeenCalled()
  })

  it('keeps joining available if the optional accepted-participant check fails', async () => {
    mockGetGame.mockRejectedValue(new Error('Unavailable'))
    renderJoin()
    enterNickname()
    await act(async () => {})
    submit()
    expect(mockJoinGame).toHaveBeenCalledWith(
      gameID,
      'Player',
      DEFAULT_CRITTERS_AVATAR_V1,
    )
    await waitFor(() =>
      expect(screen.getByPlaceholderText('Nickname')).toBeEnabled(),
    )
  })

  it('discards dialog changes on Escape and restores focus without unmounting the nickname input', async () => {
    renderJoin()
    const input = screen.getByPlaceholderText('Nickname')
    enterNickname('KeepMyName')
    const trigger = screen.getByRole('button', { name: 'Customize avatar' })
    await userEvent.click(trigger)
    await userEvent.click(screen.getByRole('radio', { name: 'Body: Block' }))
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(input).toHaveValue('KeepMyName')
    expect(storedAvatar()).toEqual(DEFAULT_CRITTERS_AVATAR_V1)
    await waitFor(() => expect(trigger).toHaveFocus())
  })

  it.each([true, false])(
    'applies complete dialog choices and restores them after reload (account=%s)',
    async (account) => {
      authenticated = account
      const view = renderJoin()
      const initial = storedAvatar()
      fireEvent.click(screen.getByRole('button', { name: 'Customize avatar' }))
      fireEvent.click(screen.getByRole('radio', { name: 'Body: Block' }))
      fireEvent.click(screen.getByRole('button', { name: 'Use design' }))
      expect(storedAvatar()).toEqual({ ...initial, body: 'block' })
      view.unmount()
      renderJoin()
      enterNickname()
      submit()
      expect(mockJoinGame).toHaveBeenCalledWith(gameID, 'Player', {
        ...initial,
        body: 'block',
      })
      await waitFor(() =>
        expect(screen.getByPlaceholderText('Nickname')).toBeEnabled(),
      )
    },
  )

  it('generates a complete guest design once and preserves it through rerenders and reloads', () => {
    authenticated = false
    const view = renderJoin()
    const initial = storedAvatar()
    expect(isCrittersAvatarConfigurationV1(initial)).toBe(true)
    enterNickname('Guest')
    expect(storedAvatar()).toEqual(initial)
    view.unmount()
    renderJoin()
    expect(storedAvatar()).toEqual(initial)
  })

  it('randomizes only when explicitly requested and keeps the design complete', () => {
    renderJoin()
    fireEvent.click(screen.getByRole('button', { name: 'Customize avatar' }))
    fireEvent.click(screen.getByRole('button', { name: 'Randomize' }))
    fireEvent.click(screen.getByRole('button', { name: 'Use design' }))
    expect(isCrittersAvatarConfigurationV1(storedAvatar())).toBe(true)
    expect(mockJoinGame).not.toHaveBeenCalled()
  })

  it('isolates drafts between games and rejects malformed browser data', () => {
    const view = renderJoin()
    view.unmount()
    gameID = 'OTHER'
    localStorage.setItem(
      'klurigo:join-avatar:OTHER:account:account',
      JSON.stringify({ version: 99 }),
    )
    renderJoin()
    expect(storedAvatar()).toEqual(DEFAULT_CRITTERS_AVATAR_V1)
    expect(
      localStorage.getItem('klurigo:join-avatar:GAME123:account:account'),
    ).not.toBeNull()
  })

  it.each([true, false])(
    'preserves the original guest login prompt (authenticated=%s)',
    (account) => {
      authenticated = account
      renderJoin()
      const prompt = screen.queryByRole('button', {
        name: /make every game count/i,
      })
      if (account) expect(prompt).not.toBeInTheDocument()
      else {
        fireEvent.click(prompt!)
        expect(mockNavigate).toHaveBeenCalledWith('/auth/login')
        expect(mockJoinGame).not.toHaveBeenCalled()
      }
    },
  )
})
