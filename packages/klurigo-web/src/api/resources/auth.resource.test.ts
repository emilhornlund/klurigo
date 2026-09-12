import { TokenScope, TokenType } from '@klurigo/common'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { ApiClientCore } from '../api-client-core'

import { createAuthResource } from './auth.resource'
import type { AuthResourceDeps } from './auth.resource'

const makeApi = (): {
  api: ApiClientCore
  apiPost: ReturnType<typeof vi.fn>
  apiGet: ReturnType<typeof vi.fn>
  apiPut: ReturnType<typeof vi.fn>
  apiPatch: ReturnType<typeof vi.fn>
} => {
  const apiPost = vi.fn()
  const apiGet = vi.fn()
  const apiPut = vi.fn()
  const apiPatch = vi.fn()

  const api = {
    apiFetch: vi.fn(),
    apiGet,
    apiPost,
    apiPut,
    apiPatch,
    apiDelete: vi.fn(),
  } as unknown as ApiClientCore

  return { api, apiPost, apiGet, apiPut, apiPatch }
}

const makeDeps = (): {
  deps: AuthResourceDeps
  setTokenPair: ReturnType<typeof vi.fn>
  fetchCurrentUser: ReturnType<typeof vi.fn>
  clearCurrentUser: ReturnType<typeof vi.fn>
  notifySuccess: ReturnType<typeof vi.fn>
  notifyError: ReturnType<typeof vi.fn>
} => {
  const setTokenPair = vi.fn()
  const fetchCurrentUser = vi.fn().mockResolvedValue(undefined)
  const clearCurrentUser = vi.fn()
  const notifySuccess = vi.fn()
  const notifyError = vi.fn()

  return {
    deps: {
      setTokenPair,
      fetchCurrentUser,
      clearCurrentUser,
      notifySuccess,
      notifyError,
    },
    setTokenPair,
    fetchCurrentUser,
    clearCurrentUser,
    notifySuccess,
    notifyError,
  }
}

describe('createAuthResource', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('login posts credentials; stores user tokens; hydrates current user; returns response', async () => {
    const { api, apiPost } = makeApi()
    const { deps, setTokenPair, fetchCurrentUser, notifyError } = makeDeps()

    apiPost.mockResolvedValue({
      accessToken: 'user.access',
      refreshToken: 'user.refresh',
    })

    const auth = createAuthResource(api, deps)

    const res = await auth.login({
      email: 'a@example.test',
      password: 'pw',
    } as never)

    expect(apiPost).toHaveBeenCalledWith('/auth/login', {
      email: 'a@example.test',
      password: 'pw',
    })

    expect(setTokenPair).toHaveBeenCalledWith(
      TokenScope.User,
      'user.access',
      'user.refresh',
    )
    expect(fetchCurrentUser).toHaveBeenCalledWith('user.access')
    expect(notifyError).not.toHaveBeenCalled()
    expect(res).toEqual({
      accessToken: 'user.access',
      refreshToken: 'user.refresh',
    })
  })

  it('login notifies error and rethrows when api call fails', async () => {
    const { api } = makeApi()
    const { deps, notifyError, setTokenPair, fetchCurrentUser } = makeDeps()

    const err = new Error('bad creds')
    api.apiPost = vi
      .fn()
      .mockRejectedValue(err) as unknown as ApiClientCore['apiPost']

    const auth = createAuthResource(api, deps)

    await expect(
      auth.login({ email: 'a@example.test', password: 'pw' } as never),
    ).rejects.toBe(err)

    expect(notifyError).toHaveBeenCalledWith(
      'Nope — those credentials didn’t work. Give it another shot.',
    )
    expect(setTokenPair).not.toHaveBeenCalled()
    expect(fetchCurrentUser).not.toHaveBeenCalled()
  })

  it('googleExchangeCode posts request; stores user tokens; hydrates current user', async () => {
    const { api, apiPost } = makeApi()
    const { deps, setTokenPair, fetchCurrentUser, notifyError } = makeDeps()

    apiPost.mockResolvedValue({
      accessToken: 'user.access',
      refreshToken: 'user.refresh',
    })

    const auth = createAuthResource(api, deps)

    const request = { code: 'code', codeVerifier: 'verifier' } as never
    const res = await auth.googleExchangeCode(request)

    expect(apiPost).toHaveBeenCalledWith('/auth/google/exchange', request)
    expect(setTokenPair).toHaveBeenCalledWith(
      TokenScope.User,
      'user.access',
      'user.refresh',
    )
    expect(fetchCurrentUser).toHaveBeenCalledWith('user.access')
    expect(notifyError).not.toHaveBeenCalled()
    expect(res).toEqual({
      accessToken: 'user.access',
      refreshToken: 'user.refresh',
    })
  })

  it('googleExchangeCode notifies error and rethrows when api call fails', async () => {
    const { api, apiPost } = makeApi()
    const { deps, notifyError, setTokenPair, fetchCurrentUser } = makeDeps()

    const err = new Error('exchange failed')
    apiPost.mockRejectedValue(err)

    const auth = createAuthResource(api, deps)

    await expect(
      auth.googleExchangeCode({ code: 'c', codeVerifier: 'v' } as never),
    ).rejects.toBe(err)

    expect(notifyError).toHaveBeenCalledWith(
      'Nope — those credentials didn’t work. Give it another shot.',
    )
    expect(setTokenPair).not.toHaveBeenCalled()
    expect(fetchCurrentUser).not.toHaveBeenCalled()
  })

  it('authenticateGame posts with refresh:false; stores game tokens; notifies on failure', async () => {
    const { api, apiPost } = makeApi()
    const { deps, setTokenPair, notifyError } = makeDeps()

    apiPost.mockResolvedValue({
      accessToken: 'game.access',
      refreshToken: 'game.refresh',
    })

    const auth = createAuthResource(api, deps)

    const req = { gameId: 'G123', gamePIN: '123456' } as never
    const res = await auth.authenticateGame(req)

    expect(apiPost).toHaveBeenCalledWith('/auth/game', req, { refresh: false })
    expect(setTokenPair).toHaveBeenCalledWith(
      TokenScope.Game,
      'game.access',
      'game.refresh',
    )
    expect(res).toEqual({
      accessToken: 'game.access',
      refreshToken: 'game.refresh',
    })
    expect(notifyError).not.toHaveBeenCalled()

    const err = new Error('no game')
    apiPost.mockRejectedValueOnce(err)

    await expect(auth.authenticateGame(req)).rejects.toBe(err)
    expect(notifyError).toHaveBeenCalledWith(
      'That game code didn’t match anything. Double-check it and try again.',
    )
  })

  it('reuses an existing anonymous game token when re-authenticating', async () => {
    const { api, apiPost } = makeApi()
    const { deps } = makeDeps()
    deps.getToken = (scope, type) =>
      scope === TokenScope.Game && type === TokenType.Access
        ? 'existing.game.access'
        : undefined
    apiPost.mockResolvedValue({
      accessToken: 'new.game.access',
      refreshToken: 'new.game.refresh',
    })

    const auth = createAuthResource(api, deps)

    await auth.authenticateGame({ gameId: 'G123' })

    expect(apiPost).toHaveBeenCalledWith(
      '/auth/game',
      { gameId: 'G123' },
      {
        scope: TokenScope.Game,
      },
    )
  })

  it('refresh stores token pair; hydrates only for TokenScope.User', async () => {
    const { api, apiPost } = makeApi()
    const { deps, setTokenPair, fetchCurrentUser, notifyError } = makeDeps()

    apiPost.mockResolvedValue({
      accessToken: 'new.access',
      refreshToken: 'new.refresh',
    })

    const auth = createAuthResource(api, deps)

    const resUser = await auth.refresh(TokenScope.User, {
      refreshToken: 'rt',
    } as never)

    expect(apiPost).toHaveBeenCalledWith('/auth/refresh', {
      refreshToken: 'rt',
    })
    expect(setTokenPair).toHaveBeenCalledWith(
      TokenScope.User,
      'new.access',
      'new.refresh',
    )
    expect(fetchCurrentUser).toHaveBeenCalledWith('new.access')
    expect(resUser).toEqual({
      accessToken: 'new.access',
      refreshToken: 'new.refresh',
    })

    vi.clearAllMocks()
    apiPost.mockResolvedValue({
      accessToken: 'g.access',
      refreshToken: 'g.refresh',
    })

    const resGame = await auth.refresh(TokenScope.Game, {
      refreshToken: 'rt2',
    } as never)

    expect(setTokenPair).toHaveBeenCalledWith(
      TokenScope.Game,
      'g.access',
      'g.refresh',
    )
    expect(fetchCurrentUser).not.toHaveBeenCalled()
    expect(notifyError).not.toHaveBeenCalled()
    expect(resGame).toEqual({
      accessToken: 'g.access',
      refreshToken: 'g.refresh',
    })
  })

  it('refresh notifies error and rethrows on failure', async () => {
    const { api, apiPost } = makeApi()
    const { deps, notifyError, setTokenPair } = makeDeps()

    const err = new Error('refresh failed')
    apiPost.mockRejectedValue(err)

    const auth = createAuthResource(api, deps)

    await expect(
      auth.refresh(TokenScope.User, { refreshToken: 'rt' } as never),
    ).rejects.toBe(err)

    expect(notifyError).toHaveBeenCalledWith(
      'Your session needed a refresh… and it didn’t go as planned. Please try again.',
    )
    expect(setTokenPair).not.toHaveBeenCalled()
  })

  it('revoke posts token; swallows errors; clears current user only for TokenScope.User', async () => {
    const { api, apiPost } = makeApi()
    const { deps, clearCurrentUser } = makeDeps()

    const auth = createAuthResource(api, deps)

    apiPost.mockResolvedValue(undefined)
    await auth.revoke({ token: 't' } as never, TokenScope.User)
    expect(apiPost).toHaveBeenCalledWith('/auth/revoke', { token: 't' })
    expect(clearCurrentUser).toHaveBeenCalledTimes(1)

    vi.clearAllMocks()
    apiPost.mockResolvedValue(undefined)
    await auth.revoke({ token: 't2' } as never, TokenScope.Game)
    expect(clearCurrentUser).not.toHaveBeenCalled()

    vi.clearAllMocks()
    apiPost.mockRejectedValueOnce(new Error('network down'))
    await expect(
      auth.revoke({ token: 't3' } as never, TokenScope.User),
    ).resolves.toBeUndefined()
    expect(clearCurrentUser).toHaveBeenCalledTimes(1)
  })

  it('verifyEmail posts with user scope and token override; notifies on failure', async () => {
    const { api, apiPost } = makeApi()
    const { deps, notifyError } = makeDeps()

    const auth = createAuthResource(api, deps)

    apiPost.mockResolvedValue(undefined)
    await auth.verifyEmail('verify.token')

    expect(apiPost).toHaveBeenCalledWith(
      '/auth/email/verify',
      {},
      { scope: TokenScope.User, token: 'verify.token' },
    )
    expect(notifyError).not.toHaveBeenCalled()

    const err = new Error('bad token')
    apiPost.mockRejectedValueOnce(err)

    await expect(auth.verifyEmail('verify.token')).rejects.toBe(err)
    expect(notifyError).toHaveBeenCalledWith(
      'That verification link looks a bit grumpy. Try requesting a new one.',
    )
  })

  it('resendVerificationEmail notifies success on ok; notifies error and rethrows on failure', async () => {
    const { api, apiPost } = makeApi()
    const { deps, notifySuccess, notifyError } = makeDeps()

    const auth = createAuthResource(api, deps)

    apiPost.mockResolvedValue(undefined)
    await auth.resendVerificationEmail()

    expect(apiPost).toHaveBeenCalledWith('/auth/email/resend_verification', {})
    expect(notifySuccess).toHaveBeenCalledWith(
      'Hooray! A fresh verification email is on its way—check your inbox!',
    )
    expect(notifyError).not.toHaveBeenCalled()

    const err = new Error('fail')
    apiPost.mockRejectedValueOnce(err)

    await expect(auth.resendVerificationEmail()).rejects.toBe(err)
    expect(notifyError).toHaveBeenCalledWith(
      'Whoops! We couldn’t resend your verification email. Please try again.',
    )
  })

  it('sendPasswordResetEmail notifies success on ok; notifies error and rethrows on failure', async () => {
    const { api, apiPost } = makeApi()
    const { deps, notifySuccess, notifyError } = makeDeps()

    const auth = createAuthResource(api, deps)

    const req = { email: 'a@example.test' } as never

    apiPost.mockResolvedValue(undefined)
    await auth.sendPasswordResetEmail(req)

    expect(apiPost).toHaveBeenCalledWith('/auth/password/forgot', req)
    expect(notifySuccess).toHaveBeenCalledWith(
      'We’ve flung a reset link to your inbox. Didn’t see it? Sneak a peek in your spam folder.',
    )

    const err = new Error('fail')
    apiPost.mockRejectedValueOnce(err)

    await expect(auth.sendPasswordResetEmail(req)).rejects.toBe(err)
    expect(notifyError).toHaveBeenCalledWith(
      'We couldn’t send the reset email right now. Please try again in a moment.',
    )
  })

  it('resetPassword patches with user scope and token override; notifies success on ok; notifies error and rethrows on failure', async () => {
    const { api, apiPatch } = makeApi()
    const { deps, notifySuccess, notifyError } = makeDeps()

    const auth = createAuthResource(api, deps)

    const req = { password: 'newpw' } as never

    apiPatch.mockResolvedValue(undefined)
    await auth.resetPassword(req, 'reset.token')

    expect(apiPatch).toHaveBeenCalledWith('/auth/password/reset', req, {
      scope: TokenScope.User,
      token: 'reset.token',
    })
    expect(notifySuccess).toHaveBeenCalledWith(
      'All Set! Your new password is locked and loaded. Welcome back!',
    )

    const err = new Error('fail')
    apiPatch.mockRejectedValueOnce(err)

    await expect(auth.resetPassword(req, 'reset.token')).rejects.toBe(err)
    expect(notifyError).toHaveBeenCalledWith(
      'Password reset didn’t stick the landing. Please try again.',
    )
  })

  it('register posts mapped fields; notifies success on ok; notifies error and rethrows on failure', async () => {
    const { api, apiPost } = makeApi()
    const { deps, notifySuccess, notifyError } = makeDeps()

    const auth = createAuthResource(api, deps)

    const req = {
      email: 'a@example.test',
      password: 'pw',
      givenName: 'A',
      familyName: 'B',
      defaultNickname: 'AB',
    } as never

    apiPost.mockResolvedValue({ id: 'u1' })
    const res = await auth.register(req)

    expect(apiPost).toHaveBeenCalledWith('/users', {
      email: 'a@example.test',
      password: 'pw',
      givenName: 'A',
      familyName: 'B',
      defaultNickname: 'AB',
    })
    expect(notifySuccess).toHaveBeenCalledWith(
      'Welcome aboard! Your account is ready to roll',
    )
    expect(res).toEqual({ id: 'u1' })

    const err = new Error('fail')
    apiPost.mockRejectedValueOnce(err)

    await expect(auth.register(req)).rejects.toBe(err)
    expect(notifyError).toHaveBeenCalledWith(
      'We couldn’t create your account right now. Please try again.',
    )
  })

  it('getUserProfile calls apiGet with user scope and token override; notifies and rethrows on failure', async () => {
    const { api, apiGet } = makeApi()
    const { deps, notifyError } = makeDeps()

    const auth = createAuthResource(api, deps)

    apiGet.mockResolvedValue({ email: 'a@example.test' })
    const res = await auth.getUserProfile('override.token')

    expect(apiGet).toHaveBeenCalledWith('/profile/user', {
      scope: TokenScope.User,
      token: 'override.token',
    })
    expect(res).toEqual({ email: 'a@example.test' })

    const err = new Error('fail')
    apiGet.mockRejectedValueOnce(err)

    await expect(auth.getUserProfile()).rejects.toBe(err)
    expect(notifyError).toHaveBeenCalledWith(
      'We couldn’t load your profile. Please try again.',
    )
  })

  it('updateUserProfile puts profile; notifies success on ok; notifies error and rethrows on failure', async () => {
    const { api, apiPut } = makeApi()
    const { deps, notifySuccess, notifyError } = makeDeps()

    const auth = createAuthResource(api, deps)

    const req = { givenName: 'A' } as never

    apiPut.mockResolvedValue({ givenName: 'A' })
    const res = await auth.updateUserProfile(req)

    expect(apiPut).toHaveBeenCalledWith('/profile/user', req)
    expect(notifySuccess).toHaveBeenCalledWith(
      'Nice! Your new profile is locked in. Get ready to quiz in style!',
    )
    expect(res).toEqual({ givenName: 'A' })

    const err = new Error('fail')
    apiPut.mockRejectedValueOnce(err)

    await expect(auth.updateUserProfile(req)).rejects.toBe(err)
    expect(notifyError).toHaveBeenCalledWith(
      'Profile update failed. Give it another go — we’ll behave this time.',
    )
  })

  it('updateUserPassword patches password; notifies success on ok; notifies error and rethrows on failure', async () => {
    const { api, apiPatch } = makeApi()
    const { deps, notifySuccess, notifyError } = makeDeps()

    const auth = createAuthResource(api, deps)

    const req = { oldPassword: 'old', newPassword: 'new' } as never

    apiPatch.mockResolvedValue(undefined)
    await auth.updateUserPassword(req)

    expect(apiPatch).toHaveBeenCalledWith('/auth/password', req)
    expect(notifySuccess).toHaveBeenCalledWith(
      'Done and dusted! Your password’s been refreshed.',
    )

    const err = new Error('fail')
    apiPatch.mockRejectedValueOnce(err)

    await expect(auth.updateUserPassword(req)).rejects.toBe(err)
    expect(notifyError).toHaveBeenCalledWith(
      'That password update didn’t take. Check your input and try again.',
    )
  })
})
