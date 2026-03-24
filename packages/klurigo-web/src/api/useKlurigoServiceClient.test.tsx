import { TokenScope, TokenType } from '@klurigo/common'
import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useKlurigoServiceClient } from '.'

vi.mock('../context/auth', () => ({
  useAuthContext: vi.fn(),
}))

vi.mock('../context/user', () => ({
  useUserContext: vi.fn(),
}))

vi.mock('../utils/notification', () => ({
  notifySuccess: vi.fn(),
  notifyError: vi.fn(),
}))

vi.mock('./api-client-core', () => ({
  createApiClientCore: vi.fn(),
}))

vi.mock('./resources', () => ({
  createAuthResource: vi.fn(),
  createQuizResource: vi.fn(),
  createGameResource: vi.fn(),
  createMediaResource: vi.fn(),
  createUserResource: vi.fn(),
}))

const { useAuthContext } = await import('../context/auth')
const { useUserContext } = await import('../context/user')
const { notifyError, notifySuccess } = await import('../utils/notification')
const { createApiClientCore } = await import('./api-client-core')
const {
  createAuthResource,
  createGameResource,
  createMediaResource,
  createQuizResource,
  createUserResource,
} = await import('./resources')

type TokenShape = { token: string }
type AuthState = Partial<Record<TokenType, TokenShape>>

describe('useKlurigoServiceClient', () => {
  const setTokenPair = vi.fn()
  const fetchCurrentUser = vi.fn()
  const clearCurrentUser = vi.fn()

  const apiCore = {
    apiFetch: vi.fn(),
    apiGet: vi.fn(),
    apiPost: vi.fn(),
    apiPut: vi.fn(),
    apiPatch: vi.fn(),
    apiDelete: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    ;(useAuthContext as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      user: {
        [TokenType.Access]: { token: 'user.access' },
        [TokenType.Refresh]: { token: 'user.refresh' },
      } satisfies AuthState,
      game: {
        [TokenType.Access]: { token: 'game.access' },
        [TokenType.Refresh]: { token: 'game.refresh' },
      } satisfies AuthState,
      setTokenPair,
    })
    ;(useUserContext as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      fetchCurrentUser,
      clearCurrentUser,
    })
    ;(
      createApiClientCore as unknown as ReturnType<typeof vi.fn>
    ).mockReturnValue(apiCore)
    ;(
      createAuthResource as unknown as ReturnType<typeof vi.fn>
    ).mockReturnValue({
      login: vi.fn(),
      revoke: vi.fn(),
    })
    ;(
      createQuizResource as unknown as ReturnType<typeof vi.fn>
    ).mockReturnValue({
      getQuiz: vi.fn(),
    })
    ;(
      createGameResource as unknown as ReturnType<typeof vi.fn>
    ).mockReturnValue({
      joinGame: vi.fn(),
    })
    ;(
      createMediaResource as unknown as ReturnType<typeof vi.fn>
    ).mockReturnValue({
      uploadImage: vi.fn(),
    })
    ;(
      createUserResource as unknown as ReturnType<typeof vi.fn>
    ).mockReturnValue({
      getUserPublicProfile: vi.fn(),
      getUserPublicQuizzes: vi.fn(),
    })
  })

  it('wires core + resources and returns a merged surface', () => {
    const { result } = renderHook(() => useKlurigoServiceClient())

    expect(createApiClientCore).toHaveBeenCalledTimes(1)
    expect(createAuthResource).toHaveBeenCalledTimes(1)
    expect(createQuizResource).toHaveBeenCalledTimes(1)
    expect(createGameResource).toHaveBeenCalledTimes(1)
    expect(createMediaResource).toHaveBeenCalledTimes(1)
    expect(createUserResource).toHaveBeenCalledTimes(1)

    expect(result.current).toEqual(
      expect.objectContaining({
        login: expect.any(Function),
        revoke: expect.any(Function),
        getQuiz: expect.any(Function),
        joinGame: expect.any(Function),
        uploadImage: expect.any(Function),
        getUserPublicProfile: expect.any(Function),
        getUserPublicQuizzes: expect.any(Function),
      }),
    )
  })

  it('passes getToken into createApiClientCore that resolves user/game access+refresh tokens', () => {
    renderHook(() => useKlurigoServiceClient())

    const call = (createApiClientCore as unknown as ReturnType<typeof vi.fn>)
      .mock.calls[0]?.[0] as {
      getToken: (scope: TokenScope, type: TokenType) => string | undefined
    }

    expect(call).toBeTruthy()
    const { getToken } = call

    expect(getToken(TokenScope.User, TokenType.Access)).toBe('user.access')
    expect(getToken(TokenScope.User, TokenType.Refresh)).toBe('user.refresh')
    expect(getToken(TokenScope.Game, TokenType.Access)).toBe('game.access')
    expect(getToken(TokenScope.Game, TokenType.Refresh)).toBe('game.refresh')
  })

  it('creates auth resource with token/user side effects and notification callbacks', () => {
    renderHook(() => useKlurigoServiceClient())

    expect(createAuthResource).toHaveBeenCalledWith(apiCore, {
      setTokenPair,
      fetchCurrentUser,
      clearCurrentUser,
      notifySuccess,
      notifyError,
    })
  })

  it('creates quiz/game/user resources with notification callbacks', () => {
    renderHook(() => useKlurigoServiceClient())

    expect(createQuizResource).toHaveBeenCalledWith(apiCore, {
      notifySuccess,
      notifyError,
    })

    expect(createGameResource).toHaveBeenCalledWith(apiCore, {
      notifySuccess,
      notifyError,
    })

    expect(createUserResource).toHaveBeenCalledWith(apiCore, {
      notifySuccess,
      notifyError,
    })
  })

  it('creates media resource with getToken and notification callbacks', () => {
    renderHook(() => useKlurigoServiceClient())

    const [, deps] = (
      createMediaResource as unknown as ReturnType<typeof vi.fn>
    ).mock.calls[0] as [
      unknown,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
      { getToken: Function; notifySuccess: Function; notifyError: Function },
    ]

    expect(deps.notifySuccess).toBe(notifySuccess)
    expect(deps.notifyError).toBe(notifyError)

    expect(deps.getToken(TokenScope.User, TokenType.Access)).toBe('user.access')
    expect(deps.getToken(TokenScope.Game, TokenType.Access)).toBe('game.access')
  })

  it('getToken returns undefined when the scoped auth state is missing', () => {
    ;(useAuthContext as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      user: undefined,
      game: undefined,
      setTokenPair,
    })

    renderHook(() => useKlurigoServiceClient())

    const call = (createApiClientCore as unknown as ReturnType<typeof vi.fn>)
      .mock.calls[0]?.[0] as {
      getToken: (scope: TokenScope, type: TokenType) => string | undefined
    }

    expect(call.getToken(TokenScope.User, TokenType.Access)).toBeUndefined()
    expect(call.getToken(TokenScope.Game, TokenType.Refresh)).toBeUndefined()
  })

  it('recomputes getToken when auth context changes (uses latest tokens)', () => {
    const { rerender } = renderHook(() => useKlurigoServiceClient())

    const firstGetToken = (
      createApiClientCore as unknown as ReturnType<typeof vi.fn>
    ).mock.calls[0][0].getToken as (
      scope: TokenScope,
      type: TokenType,
    ) => string | undefined

    expect(firstGetToken(TokenScope.User, TokenType.Access)).toBe('user.access')
    ;(useAuthContext as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      user: {
        [TokenType.Access]: { token: 'user.access.v2' },
        [TokenType.Refresh]: { token: 'user.refresh.v2' },
      } satisfies AuthState,
      game: {
        [TokenType.Access]: { token: 'game.access.v2' },
        [TokenType.Refresh]: { token: 'game.refresh.v2' },
      } satisfies AuthState,
      setTokenPair,
    })

    rerender()

    const secondGetToken = (
      createApiClientCore as unknown as ReturnType<typeof vi.fn>
    ).mock.calls[1][0].getToken as (
      scope: TokenScope,
      type: TokenType,
    ) => string | undefined

    expect(secondGetToken(TokenScope.User, TokenType.Access)).toBe(
      'user.access.v2',
    )
    expect(secondGetToken(TokenScope.Game, TokenType.Refresh)).toBe(
      'game.refresh.v2',
    )
  })

  it('passes token/user dependencies into createApiClientCore', () => {
    renderHook(() => useKlurigoServiceClient())

    const deps = (createApiClientCore as unknown as ReturnType<typeof vi.fn>)
      .mock.calls[0]?.[0] as {
      setTokenPair: typeof setTokenPair
      fetchCurrentUser: typeof fetchCurrentUser
    }

    expect(deps.setTokenPair).toBe(setTokenPair)
    expect(deps.fetchCurrentUser).toBe(fetchCurrentUser)
  })

  it('delegates calls to the underlying resources', async () => {
    const login = vi
      .fn()
      .mockResolvedValue({ accessToken: 'a', refreshToken: 'r' })
    const revoke = vi.fn().mockResolvedValue(undefined)
    const getQuiz = vi.fn().mockResolvedValue({ id: 'q1' })
    const joinGame = vi.fn().mockResolvedValue(undefined)
    const uploadImage = vi.fn().mockResolvedValue({ id: 'photo1' })
    const getUserPublicProfile = vi.fn().mockResolvedValue({ id: 'user-1' })
    const getUserPublicQuizzes = vi.fn().mockResolvedValue({ results: [] })

    ;(
      createAuthResource as unknown as ReturnType<typeof vi.fn>
    ).mockReturnValue({ login, revoke })
    ;(
      createQuizResource as unknown as ReturnType<typeof vi.fn>
    ).mockReturnValue({ getQuiz })
    ;(
      createGameResource as unknown as ReturnType<typeof vi.fn>
    ).mockReturnValue({ joinGame })
    ;(
      createMediaResource as unknown as ReturnType<typeof vi.fn>
    ).mockReturnValue({ uploadImage })
    ;(
      createUserResource as unknown as ReturnType<typeof vi.fn>
    ).mockReturnValue({
      getUserPublicProfile,
      getUserPublicQuizzes,
    })

    const { result } = renderHook(() => useKlurigoServiceClient())

    await expect(
      result.current.login({
        email: 'a@example.test',
        password: 'pw',
      } as never),
    ).resolves.toEqual({
      accessToken: 'a',
      refreshToken: 'r',
    })
    expect(login).toHaveBeenCalledWith({
      email: 'a@example.test',
      password: 'pw',
    })

    await expect(
      result.current.revoke({ token: 't' } as never, TokenScope.User),
    ).resolves.toBeUndefined()
    expect(revoke).toHaveBeenCalledWith({ token: 't' }, TokenScope.User)

    await expect(result.current.getQuiz('q1' as never)).resolves.toEqual({
      id: 'q1',
    })
    expect(getQuiz).toHaveBeenCalledWith('q1')

    await expect(
      result.current.joinGame('g1' as never, 'Emil' as never),
    ).resolves.toBeUndefined()
    expect(joinGame).toHaveBeenCalledWith('g1', 'Emil')

    const file = new File(['x'], 'x.png', { type: 'image/png' })
    const onProgress = vi.fn()
    await expect(
      result.current.uploadImage(file as never, onProgress as never),
    ).resolves.toEqual({ id: 'photo1' })
    expect(uploadImage).toHaveBeenCalledWith(file, onProgress)

    await expect(
      result.current.getUserPublicProfile('user-1'),
    ).resolves.toEqual({
      id: 'user-1',
    })
    expect(getUserPublicProfile).toHaveBeenCalledWith('user-1')

    await expect(
      result.current.getUserPublicQuizzes('user-1', {
        limit: 10,
        offset: 20,
      }),
    ).resolves.toEqual({ results: [] })
    expect(getUserPublicQuizzes).toHaveBeenCalledWith('user-1', {
      limit: 10,
      offset: 20,
    })
  })

  it('passes the same api core instance to all resource factories', () => {
    renderHook(() => useKlurigoServiceClient())

    expect(createAuthResource).toHaveBeenCalledWith(apiCore, expect.any(Object))
    expect(createQuizResource).toHaveBeenCalledWith(apiCore, expect.any(Object))
    expect(createGameResource).toHaveBeenCalledWith(apiCore, expect.any(Object))
    expect(createMediaResource).toHaveBeenCalledWith(
      apiCore,
      expect.any(Object),
    )
    expect(createUserResource).toHaveBeenCalledWith(apiCore, expect.any(Object))
  })

  it('getToken returns undefined when requested token type is missing in the auth state', () => {
    ;(useAuthContext as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      user: {
        [TokenType.Access]: { token: 'user.access' },
      } satisfies AuthState,
      game: {
        [TokenType.Refresh]: { token: 'game.refresh' },
      } satisfies AuthState,
      setTokenPair,
    })

    renderHook(() => useKlurigoServiceClient())

    const deps = (createApiClientCore as unknown as ReturnType<typeof vi.fn>)
      .mock.calls[0]?.[0] as {
      getToken: (scope: TokenScope, type: TokenType) => string | undefined
    }

    expect(deps.getToken(TokenScope.User, TokenType.Refresh)).toBeUndefined()
    expect(deps.getToken(TokenScope.Game, TokenType.Access)).toBeUndefined()
  })

  it('getToken returns undefined for an unknown scope value (defensive behavior)', () => {
    renderHook(() => useKlurigoServiceClient())

    const deps = (createApiClientCore as unknown as ReturnType<typeof vi.fn>)
      .mock.calls[0]?.[0] as {
      getToken: (scope: TokenScope, type: TokenType) => string | undefined
    }

    // Force an invalid scope at runtime; TS can’t prevent this in production.
    expect(
      deps.getToken('NOPE' as unknown as TokenScope, TokenType.Access),
    ).toBeUndefined()
  })

  it('exposes last-spread-wins behavior when resources return the same key', () => {
    const sharedFnA = vi.fn()
    const sharedFnB = vi.fn()
    const sharedFnC = vi.fn()
    const sharedFnD = vi.fn()
    const sharedFnE = vi.fn()

    ;(
      createAuthResource as unknown as ReturnType<typeof vi.fn>
    ).mockReturnValue({
      shared: sharedFnA,
    })
    ;(
      createQuizResource as unknown as ReturnType<typeof vi.fn>
    ).mockReturnValue({
      shared: sharedFnB,
    })
    ;(
      createGameResource as unknown as ReturnType<typeof vi.fn>
    ).mockReturnValue({
      shared: sharedFnC,
    })
    ;(
      createMediaResource as unknown as ReturnType<typeof vi.fn>
    ).mockReturnValue({
      shared: sharedFnD,
    })
    ;(
      createUserResource as unknown as ReturnType<typeof vi.fn>
    ).mockReturnValue({
      shared: sharedFnE,
    })

    const { result } = renderHook(() => useKlurigoServiceClient())

    // user is spread last: ...auth, ...quiz, ...game, ...media, ...user
    expect((result.current as Record<string, unknown>)['shared']).toBe(
      sharedFnE,
    )
  })

  it('passes notification callbacks by reference to all resources (no re-creation)', () => {
    renderHook(() => useKlurigoServiceClient())

    expect(createAuthResource).toHaveBeenCalledWith(
      apiCore,
      expect.objectContaining({
        notifySuccess,
        notifyError,
      }),
    )

    expect(createQuizResource).toHaveBeenCalledWith(
      apiCore,
      expect.objectContaining({
        notifySuccess,
        notifyError,
      }),
    )

    expect(createGameResource).toHaveBeenCalledWith(
      apiCore,
      expect.objectContaining({
        notifySuccess,
        notifyError,
      }),
    )

    const [, mediaDeps] = (
      createMediaResource as unknown as ReturnType<typeof vi.fn>
    ).mock.calls[0] as [
      unknown,
      { notifySuccess: unknown; notifyError: unknown },
    ]

    expect(mediaDeps.notifySuccess).toBe(notifySuccess)
    expect(mediaDeps.notifyError).toBe(notifyError)

    expect(createUserResource).toHaveBeenCalledWith(
      apiCore,
      expect.objectContaining({
        notifySuccess,
        notifyError,
      }),
    )
  })

  it('getToken function identity is stable across rerenders when auth context object references are stable', () => {
    const authCtx = {
      user: {
        [TokenType.Access]: { token: 'user.access' },
        [TokenType.Refresh]: { token: 'user.refresh' },
      } satisfies AuthState,
      game: {
        [TokenType.Access]: { token: 'game.access' },
        [TokenType.Refresh]: { token: 'game.refresh' },
      } satisfies AuthState,
      setTokenPair,
    }

    ;(useAuthContext as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      authCtx,
    )

    const { rerender } = renderHook(() => useKlurigoServiceClient())

    const firstGetToken = (
      createApiClientCore as unknown as ReturnType<typeof vi.fn>
    ).mock.calls[0][0].getToken as unknown

    rerender()

    const secondGetToken = (
      createApiClientCore as unknown as ReturnType<typeof vi.fn>
    ).mock.calls[1][0].getToken as unknown

    expect(secondGetToken).toBe(firstGetToken)
  })

  it('getToken function identity changes when auth context token references change', () => {
    const { rerender } = renderHook(() => useKlurigoServiceClient())

    const firstGetToken = (
      createApiClientCore as unknown as ReturnType<typeof vi.fn>
    ).mock.calls[0][0].getToken as unknown

    ;(useAuthContext as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      user: {
        [TokenType.Access]: { token: 'user.access.v2' },
        [TokenType.Refresh]: { token: 'user.refresh.v2' },
      } satisfies AuthState,
      game: {
        [TokenType.Access]: { token: 'game.access.v2' },
        [TokenType.Refresh]: { token: 'game.refresh.v2' },
      } satisfies AuthState,
      setTokenPair,
    })

    rerender()

    const secondGetToken = (
      createApiClientCore as unknown as ReturnType<typeof vi.fn>
    ).mock.calls[1][0].getToken as unknown

    expect(secondGetToken).not.toBe(firstGetToken)
  })
})
