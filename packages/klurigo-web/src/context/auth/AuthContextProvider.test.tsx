import { TokenScope, TokenType } from '@klurigo/common'
import { act, cleanup, render, waitFor } from '@testing-library/react'
import { type FC, type ReactNode, useContext, useEffect } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError } from '../../api/api.utils'

import { AuthContext } from './auth-context'
import AuthContextProvider from './AuthContextProvider'

// --- Mocks ---
const mockRevoke = vi.fn().mockResolvedValue({})
const mockRefresh = vi.fn().mockResolvedValue({
  accessToken: 'refreshed.access',
  refreshToken: 'refreshed.refresh',
})

vi.mock('../../api', () => ({
  useKlurigoServiceClient: () => ({ revoke: mockRevoke, refresh: mockRefresh }),
}))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async (importActual) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const actual = await importActual<any>()
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

const mockJwtDecode = vi.fn()

vi.mock('jwt-decode', () => ({
  jwtDecode: (token: string) =>
    mockJwtDecode(token) ??
    ({
      sub: `sub:${token}`,
      // Default to a "valid" token in the future to avoid auto-clearing on mount.
      exp: Math.floor(Date.now() / 1000) + 60 * 60,
      authorities: ['ROLE_USER'],
      // optional fields for game scope:
      gameId: token.includes('game') ? 'game-123' : undefined,
      participantType: token.includes('game') ? 'Player' : undefined,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any),
}))

// --- Test helpers ---
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderWithProvider(capture: (ctx: any) => void, ui?: ReactNode) {
  const Probe: FC = () => {
    const ctx = useContext(AuthContext)
    useEffect(() => {
      capture(ctx)
    }, [ctx])
    return ui ?? null
  }

  return render(
    <BrowserRouter>
      <AuthContextProvider>
        <Probe />
      </AuthContextProvider>
    </BrowserRouter>,
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function setLocalStorageAuth(state: any) {
  localStorage.setItem('auth', JSON.stringify(state))
}

const expInFuture = (secondsFromNow = 3600) =>
  Math.floor(Date.now() / 1000) + secondsFromNow
const expInPast = (secondsAgo = 3600) =>
  Math.floor(Date.now() / 1000) - secondsAgo

const flushPromises = async () => {
  await Promise.resolve()
  await Promise.resolve()
}

const flushEffects = async () => {
  await act(async () => {
    await flushPromises()
  })
}

const advance = async (ms: number) => {
  await act(async () => {
    vi.advanceTimersByTime(ms)
  })
  await flushEffects()
}

// --- Lifecycle ---
beforeEach(() => {
  vi.useRealTimers()
  localStorage.clear()

  mockRevoke.mockReset().mockResolvedValue({})
  mockRefresh.mockReset().mockResolvedValue({
    accessToken: 'refreshed.access',
    refreshToken: 'refreshed.refresh',
  })

  mockNavigate.mockReset()
  mockJwtDecode.mockReset()
})

afterEach(() => {
  try {
    vi.getTimerCount()
    vi.runOnlyPendingTimers()
    vi.clearAllTimers()
  } catch {
    // Real timers active -> nothing to drain/clear
  } finally {
    vi.useRealTimers()
  }
  cleanup()
})

describe('AuthContextProvider', () => {
  it('initializes from localStorage on first render (no flicker)', async () => {
    setLocalStorageAuth({
      USER: {
        [TokenType.Access]: { token: 'user.access', exp: expInFuture() },
        [TokenType.Refresh]: { token: 'user.refresh', exp: expInFuture() },
      },
      GAME: undefined,
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let ctx: any
    const { container } = renderWithProvider((c) => (ctx = c))

    await waitFor(() => {
      expect(ctx).toBeTruthy()
      expect(ctx.isUserAuthenticated).toBe(true)
      expect(ctx.isGameAuthenticated).toBe(false)
      expect(ctx.user?.ACCESS.token).toBe('user.access')
    })

    expect(container).toMatchSnapshot()
  })

  it('starts unauthenticated when localStorage is empty', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let ctx: any
    const { container } = renderWithProvider((c) => (ctx = c))

    await waitFor(() => {
      expect(ctx.isUserAuthenticated).toBe(false)
      expect(ctx.isUserRecoveryPending).toBe(false)
      expect(ctx.isGameAuthenticated).toBe(false)
      expect(ctx.user).toBeUndefined()
      expect(ctx.game).toBeUndefined()
    })

    expect(container).toMatchSnapshot()
  })

  it('setTokenPair(User) decodes tokens and persists to localStorage', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let ctx: any
    const { container } = renderWithProvider((c) => (ctx = c))

    await act(async () => {
      ctx.setTokenPair(TokenScope.User, 'user.access.jwt', 'user.refresh.jwt')
    })

    await waitFor(() => {
      expect(ctx.isUserAuthenticated).toBe(true)
      expect(ctx.user?.ACCESS.token).toBe('user.access.jwt')
      expect(ctx.user?.REFRESH.token).toBe('user.refresh.jwt')

      const parsed = JSON.parse(localStorage.getItem('auth')!)
      expect(parsed.USER.ACCESS.token).toBe('user.access.jwt')
      expect(parsed.USER.REFRESH.token).toBe('user.refresh.jwt')
    })

    expect(container).toMatchSnapshot()
  })

  it('setTokenPair(Game) decodes game fields and persists to localStorage', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let ctx: any
    const { container } = renderWithProvider((c) => (ctx = c))

    await act(async () => {
      ctx.setTokenPair(TokenScope.Game, 'game.access.jwt', 'game.refresh.jwt')
    })

    await waitFor(() => {
      expect(ctx.isGameAuthenticated).toBe(true)
      expect(ctx.game?.ACCESS.token).toBe('game.access.jwt')
      expect(ctx.game?.REFRESH.token).toBe('game.refresh.jwt')
      expect(ctx.game?.ACCESS.gameId).toBe('game-123')
      expect(ctx.game?.ACCESS.participantType).toBe('Player')

      const parsed = JSON.parse(localStorage.getItem('auth')!)
      expect(parsed.GAME.ACCESS.token).toBe('game.access.jwt')
    })

    expect(container).toMatchSnapshot()
  })

  it('clears per-scope auth with revokeUser/revokeGame (calls API, navigates, updates storage)', async () => {
    setLocalStorageAuth({
      USER: {
        [TokenType.Access]: { token: 'u.acc', exp: expInFuture() },
        [TokenType.Refresh]: { token: 'u.ref', exp: expInFuture() },
      },
      GAME: {
        [TokenType.Access]: { token: 'g.acc', exp: expInFuture() },
        [TokenType.Refresh]: { token: 'g.ref', exp: expInFuture() },
      },
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let ctx: any
    const { container } = renderWithProvider((c) => (ctx = c))

    await act(async () => {
      await ctx.revokeUser()
    })

    await waitFor(() => {
      expect(mockRevoke).toHaveBeenCalledWith({ token: 'u.acc' }, 'USER')
      expect(mockNavigate).toHaveBeenCalledWith('/', {
        replace: true,
        flushSync: true,
      })
      expect(ctx.user).toBeUndefined()
      expect(ctx.game).toBeTruthy()
    })

    await act(async () => {
      await ctx.revokeGame()
    })

    await waitFor(() => {
      expect(mockRevoke).toHaveBeenCalledWith({ token: 'g.acc' }, 'GAME')
      expect(ctx.game).toBeUndefined()
      expect(localStorage.getItem('auth')).toBe('{}')
    })

    expect(container).toMatchSnapshot()
  })

  it('revokeUser swallows errors and still clears & navigates', async () => {
    setLocalStorageAuth({
      USER: {
        [TokenType.Access]: { token: 'u.acc', exp: expInFuture() },
        [TokenType.Refresh]: { token: 'u.ref', exp: expInFuture() },
      },
      GAME: undefined,
    })

    mockRevoke.mockRejectedValueOnce(new Error('boom'))

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let ctx: any
    const { container } = renderWithProvider((c) => (ctx = c))

    await act(async () => {
      await ctx.revokeUser()
    })

    await waitFor(() => {
      expect(mockRevoke).toHaveBeenCalledWith({ token: 'u.acc' }, 'USER')
      expect(mockNavigate).toHaveBeenCalledWith('/', {
        replace: true,
        flushSync: true,
      })
      expect(ctx.user).toBeUndefined()
      const persisted = JSON.parse(localStorage.getItem('auth') ?? '{}')
      expect(persisted.USER).toBeUndefined()
    })

    expect(container).toMatchSnapshot()
  })

  it('auto-clears scope when access is expired and refresh is expired', async () => {
    setLocalStorageAuth({
      USER: {
        [TokenType.Access]: { token: 'u.acc', exp: expInPast() },
        [TokenType.Refresh]: { token: 'u.ref', exp: expInPast() },
      },
      GAME: undefined,
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let ctx: any
    renderWithProvider((c) => (ctx = c))

    await waitFor(() => {
      expect(ctx.user).toBeUndefined()
      expect(ctx.isUserAuthenticated).toBe(false)
    })

    expect(mockRefresh).not.toHaveBeenCalled()
    expect(mockRevoke).not.toHaveBeenCalled()
  })

  it('refreshes when access is expired but refresh is valid (User scope)', async () => {
    setLocalStorageAuth({
      USER: {
        [TokenType.Access]: { token: 'u.acc', exp: expInPast() },
        [TokenType.Refresh]: { token: 'u.ref', exp: expInFuture() },
      },
      GAME: undefined,
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let ctx: any
    renderWithProvider((c) => (ctx = c))

    expect(ctx.isUserRecoveryPending).toBe(true)

    await waitFor(() => {
      expect(mockRefresh).toHaveBeenCalledWith('USER', {
        refreshToken: 'u.ref',
      })
    })

    await waitFor(() => {
      expect(ctx.user?.ACCESS.token).toBe('refreshed.access')
      expect(ctx.user?.REFRESH.token).toBe('refreshed.refresh')
      expect(ctx.isUserAuthenticated).toBe(true)
      expect(ctx.isUserRecoveryPending).toBe(false)
    })
  })

  it('clears scope when refresh endpoint returns 401 (User scope)', async () => {
    setLocalStorageAuth({
      USER: {
        [TokenType.Access]: { token: 'u.acc', exp: expInPast() },
        [TokenType.Refresh]: { token: 'u.ref', exp: expInFuture() },
      },
      GAME: undefined,
    })

    mockRefresh.mockRejectedValueOnce(new ApiError('Unauthorized', 401))

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let ctx: any
    renderWithProvider((c) => (ctx = c))

    await waitFor(() => {
      expect(mockRefresh).toHaveBeenCalledWith('USER', {
        refreshToken: 'u.ref',
      })
    })

    await waitFor(() => {
      expect(ctx.user).toBeUndefined()
      expect(ctx.isUserAuthenticated).toBe(false)
      expect(ctx.isUserRecoveryPending).toBe(false)
    })
  })

  it('does not refresh when access token is valid (User + Game)', async () => {
    setLocalStorageAuth({
      USER: {
        [TokenType.Access]: { token: 'u.acc', exp: expInFuture() },
        [TokenType.Refresh]: { token: 'u.ref', exp: expInFuture() },
      },
      GAME: {
        [TokenType.Access]: { token: 'g.acc', exp: expInFuture() },
        [TokenType.Refresh]: { token: 'g.ref', exp: expInFuture() },
      },
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let ctx: any
    renderWithProvider((c) => (ctx = c))

    await waitFor(() => {
      expect(ctx.isUserAuthenticated).toBe(true)
      expect(ctx.isGameAuthenticated).toBe(true)
    })

    expect(mockRefresh).not.toHaveBeenCalled()
  })

  it('refreshes when access is expired but refresh is valid (Game scope)', async () => {
    mockRefresh.mockResolvedValueOnce({
      accessToken: 'game.refreshed.access',
      refreshToken: 'game.refreshed.refresh',
    })

    setLocalStorageAuth({
      USER: undefined,
      GAME: {
        [TokenType.Access]: { token: 'g.acc', exp: expInPast() },
        [TokenType.Refresh]: { token: 'g.ref', exp: expInFuture() },
      },
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let ctx: any
    renderWithProvider((c) => (ctx = c))

    await waitFor(() => {
      expect(mockRefresh).toHaveBeenCalledWith('GAME', {
        refreshToken: 'g.ref',
      })
    })

    await waitFor(() => {
      expect(ctx.game?.ACCESS.token).toBe('game.refreshed.access')
      expect(ctx.game?.REFRESH.token).toBe('game.refreshed.refresh')
      expect(ctx.isGameAuthenticated).toBe(true)
    })
  })

  it('clears scope when refresh endpoint returns 401 (Game scope)', async () => {
    setLocalStorageAuth({
      USER: undefined,
      GAME: {
        [TokenType.Access]: { token: 'g.acc', exp: expInPast() },
        [TokenType.Refresh]: { token: 'g.ref', exp: expInFuture() },
      },
    })

    mockRefresh.mockRejectedValueOnce(new ApiError('Unauthorized', 401))

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let ctx: any
    renderWithProvider((c) => (ctx = c))

    await waitFor(() => {
      expect(mockRefresh).toHaveBeenCalledWith('GAME', {
        refreshToken: 'g.ref',
      })
    })

    await waitFor(() => {
      expect(ctx.game).toBeUndefined()
      expect(ctx.isGameAuthenticated).toBe(false)
    })
  })

  it('retries refresh after transient failure once cooldown elapses (User scope)', async () => {
    vi.useFakeTimers()

    mockRefresh
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce({
        accessToken: 'refreshed.access.2',
        refreshToken: 'refreshed.refresh.2',
      })

    setLocalStorageAuth({
      USER: {
        [TokenType.Access]: { token: 'u.acc', exp: expInPast() },
        [TokenType.Refresh]: { token: 'u.ref', exp: expInFuture() },
      },
      GAME: undefined,
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let ctx: any
    renderWithProvider((c) => (ctx = c))

    await flushEffects()

    expect(mockRefresh).toHaveBeenCalledTimes(1)
    expect(mockRefresh).toHaveBeenCalledWith('USER', { refreshToken: 'u.ref' })
    expect(ctx.isUserRecoveryPending).toBe(false)

    await advance(9_999)
    expect(mockRefresh).toHaveBeenCalledTimes(1)

    await advance(1)

    expect(mockRefresh).toHaveBeenCalledTimes(2)
    expect(ctx.user?.ACCESS.token).toBe('refreshed.access.2')
    expect(ctx.user?.REFRESH.token).toBe('refreshed.refresh.2')
    expect(ctx.isUserAuthenticated).toBe(true)
  })

  it('does not retry after 401; clears scope immediately (User scope)', async () => {
    vi.useFakeTimers()

    mockRefresh.mockRejectedValueOnce(new ApiError('Unauthorized', 401))

    setLocalStorageAuth({
      USER: {
        [TokenType.Access]: { token: 'u.acc', exp: expInPast() },
        [TokenType.Refresh]: { token: 'u.ref', exp: expInFuture() },
      },
      GAME: undefined,
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let ctx: any
    renderWithProvider((c) => (ctx = c))

    await flushEffects()

    expect(mockRefresh).toHaveBeenCalledTimes(1)
    expect(ctx.user).toBeUndefined()
    expect(ctx.isUserAuthenticated).toBe(false)

    await advance(20_000)

    expect(mockRefresh).toHaveBeenCalledTimes(1)
  })

  it('throttles repeated refresh attempts during cooldown (User scope)', async () => {
    vi.useFakeTimers()

    mockRefresh.mockRejectedValue(new Error('temporary'))

    setLocalStorageAuth({
      USER: {
        [TokenType.Access]: { token: 'u.acc', exp: expInPast() },
        [TokenType.Refresh]: { token: 'u.ref', exp: expInFuture() },
      },
      GAME: undefined,
    })

    const { rerender } = renderWithProvider(() => {})

    await flushEffects()
    expect(mockRefresh).toHaveBeenCalledTimes(1)

    rerender(
      <BrowserRouter>
        <AuthContextProvider>
          <div />
        </AuthContextProvider>
      </BrowserRouter>,
    )

    await flushEffects()

    // Still 1 because we are inside cooldown window and/or retry is already scheduled
    expect(mockRefresh).toHaveBeenCalledTimes(1)

    await advance(9_999)
    expect(mockRefresh).toHaveBeenCalledTimes(1)
  })

  it('cancels scheduled retry when scope is cleared (revokeUser)', async () => {
    vi.useFakeTimers()

    mockRefresh.mockRejectedValueOnce(new Error('temporary'))

    setLocalStorageAuth({
      USER: {
        [TokenType.Access]: { token: 'u.acc', exp: expInPast() },
        [TokenType.Refresh]: { token: 'u.ref', exp: expInFuture() },
      },
      GAME: undefined,
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let ctx: any
    renderWithProvider((c) => (ctx = c))

    await flushEffects()
    expect(mockRefresh).toHaveBeenCalledTimes(1)

    await act(async () => {
      await ctx.revokeUser()
    })
    await flushEffects()

    expect(ctx.user).toBeUndefined()

    await advance(20_000)

    // No retry should happen after revokeUser clears state + cancels timeout
    expect(mockRefresh).toHaveBeenCalledTimes(1)
  })

  it('cancels scheduled retry on unmount', async () => {
    vi.useFakeTimers()

    mockRefresh.mockRejectedValueOnce(new Error('temporary'))

    setLocalStorageAuth({
      USER: {
        [TokenType.Access]: { token: 'u.acc', exp: expInPast() },
        [TokenType.Refresh]: { token: 'u.ref', exp: expInFuture() },
      },
      GAME: undefined,
    })

    const { unmount } = renderWithProvider(() => {})

    await flushEffects()
    expect(mockRefresh).toHaveBeenCalledTimes(1)

    unmount()

    await advance(20_000)

    expect(mockRefresh).toHaveBeenCalledTimes(1)
  })

  it('auto-clears only the expired scope and preserves the other scope', async () => {
    setLocalStorageAuth({
      USER: {
        [TokenType.Access]: { token: 'u.acc', exp: expInPast() },
        [TokenType.Refresh]: { token: 'u.ref', exp: expInPast() },
      },
      GAME: {
        [TokenType.Access]: { token: 'g.acc', exp: expInFuture() },
        [TokenType.Refresh]: { token: 'g.ref', exp: expInFuture() },
      },
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let ctx: any
    renderWithProvider((c) => (ctx = c))

    await waitFor(() => {
      expect(ctx.user).toBeUndefined()
      expect(ctx.isUserAuthenticated).toBe(false)

      expect(ctx.game).toBeTruthy()
      expect(ctx.isGameAuthenticated).toBe(true)
    })

    expect(mockRefresh).not.toHaveBeenCalled()
  })

  it('treats expired access token as unauthenticated until refresh succeeds (User scope)', async () => {
    vi.useFakeTimers()

    mockRefresh.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          setTimeout(
            () =>
              resolve({
                accessToken: 'refreshed.access.delayed',
                refreshToken: 'refreshed.refresh.delayed',
              }),
            100,
          )
        }),
    )

    setLocalStorageAuth({
      USER: {
        [TokenType.Access]: { token: 'u.acc', exp: expInPast() },
        [TokenType.Refresh]: { token: 'u.ref', exp: expInFuture() },
      },
      GAME: undefined,
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let ctx: any
    renderWithProvider((c) => (ctx = c))

    await flushEffects()
    expect(ctx.isUserAuthenticated).toBe(false)

    await advance(100)

    expect(ctx.isUserAuthenticated).toBe(true)
    expect(ctx.isUserRecoveryPending).toBe(false)
    expect(ctx.user?.ACCESS.token).toBe('refreshed.access.delayed')
  })

  describe('revokeGame', () => {
    it('revokeGame defaults to redirecting to `/`', async () => {
      setLocalStorageAuth({
        USER: undefined,
        GAME: {
          [TokenType.Access]: { token: 'g.acc', exp: expInFuture() },
          [TokenType.Refresh]: { token: 'g.ref', exp: expInFuture() },
        },
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let ctx: any
      renderWithProvider((c) => (ctx = c))

      await act(async () => {
        await ctx.revokeGame()
      })

      await waitFor(() => {
        expect(mockRevoke).toHaveBeenCalledWith({ token: 'g.acc' }, 'GAME')
        expect(mockNavigate).toHaveBeenCalledWith('/', {
          replace: true,
          flushSync: true,
        })
        expect(ctx.game).toBeUndefined()
      })
    })

    it('revokeGame({ redirect: false }) clears state without navigating', async () => {
      setLocalStorageAuth({
        USER: undefined,
        GAME: {
          [TokenType.Access]: { token: 'g.acc', exp: expInFuture() },
          [TokenType.Refresh]: { token: 'g.ref', exp: expInFuture() },
        },
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let ctx: any
      renderWithProvider((c) => (ctx = c))

      await act(async () => {
        await ctx.revokeGame({ redirect: false })
      })

      await waitFor(() => {
        expect(mockRevoke).toHaveBeenCalledWith({ token: 'g.acc' }, 'GAME')
        expect(ctx.game).toBeUndefined()
      })

      expect(mockNavigate).toHaveBeenCalledTimes(0)
    })

    it('revokeGame({ redirectTo }) navigates to the provided route', async () => {
      setLocalStorageAuth({
        USER: undefined,
        GAME: {
          [TokenType.Access]: { token: 'g.acc', exp: expInFuture() },
          [TokenType.Refresh]: { token: 'g.ref', exp: expInFuture() },
        },
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let ctx: any
      renderWithProvider((c) => (ctx = c))

      await act(async () => {
        await ctx.revokeGame({ redirectTo: '/game/results/game-123' })
      })

      await waitFor(() => {
        expect(mockRevoke).toHaveBeenCalledWith({ token: 'g.acc' }, 'GAME')
        expect(mockNavigate).toHaveBeenCalledWith('/game/results/game-123', {
          replace: true,
          flushSync: true,
        })
        expect(ctx.game).toBeUndefined()
      })
    })

    it('revokeGame({ redirectTo: whitespace }) does not navigate', async () => {
      setLocalStorageAuth({
        USER: undefined,
        GAME: {
          [TokenType.Access]: { token: 'g.acc', exp: expInFuture() },
          [TokenType.Refresh]: { token: 'g.ref', exp: expInFuture() },
        },
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let ctx: any
      renderWithProvider((c) => (ctx = c))

      await act(async () => {
        await ctx.revokeGame({ redirectTo: '   ' })
      })

      await waitFor(() => {
        expect(mockRevoke).toHaveBeenCalledWith({ token: 'g.acc' }, 'GAME')
        expect(ctx.game).toBeUndefined()
      })

      expect(mockNavigate).toHaveBeenCalledTimes(0)
    })
  })
})
