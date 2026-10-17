import { TokenScope, TokenType } from '@klurigo/common'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createApiClientCore } from './api-client-core'
// eslint-disable-next-line import/order
import type { ApiPostBody } from './api.utils'

vi.mock('./api.utils', () => {
  class ApiError extends Error {
    status: number

    constructor(message: string, status: number) {
      super(message)
      this.name = 'ApiError'
      this.status = status
    }
  }

  return {
    ApiError,
    isTokenExpired: vi.fn(),
    parseResponseAndHandleError: vi.fn(),
    resolveUrl: vi.fn((path: string) => `https://example.test${path}`),
  }
})

import {
  isTokenExpired,
  parseResponseAndHandleError,
  resolveUrl,
} from './api.utils'

type TokenStore = Partial<
  Record<TokenScope, Partial<Record<TokenType, string>>>
>

const makeDeps = (overrides?: {
  tokens?: TokenStore
  fetchImpl?: typeof fetch
  fetchCurrentUser?: (accessToken: string) => Promise<void>
  notifyRefreshFailure?: (scope: TokenScope) => void
}) => {
  const tokens: TokenStore = overrides?.tokens ?? {}

  const getToken = vi.fn((scope: TokenScope, type: TokenType) => {
    return tokens[scope]?.[type]
  })

  const setTokenPair = vi.fn(
    (scope: TokenScope, accessToken: string, refreshToken: string) => {
      tokens[scope] = tokens[scope] ?? {}
      tokens[scope]![TokenType.Access] = accessToken
      tokens[scope]![TokenType.Refresh] = refreshToken
    },
  )

  const fetchCurrentUser =
    overrides?.fetchCurrentUser ?? vi.fn().mockResolvedValue(undefined)
  const notifyRefreshFailure = overrides?.notifyRefreshFailure ?? vi.fn()

  const fetchImpl = overrides?.fetchImpl ?? (vi.fn() as unknown as typeof fetch)

  return {
    deps: {
      getToken,
      setTokenPair,
      fetchCurrentUser,
      fetchImpl,
      notifyRefreshFailure,
    },
    tokens,
    getToken,
    setTokenPair,
    fetchCurrentUser,
    notifyRefreshFailure,
    fetchImpl,
  }
}

const makeResponse = (status: number): Response =>
  ({ status }) as unknown as Response

describe('createApiClientCore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls fetch with resolved URL and JSON headers; adds Authorization when access token exists', async () => {
    const { deps, fetchImpl } = makeDeps({
      tokens: {
        [TokenScope.User]: {
          [TokenType.Access]: 'access.token',
          [TokenType.Refresh]: 'refresh.token',
        },
      },
    })

    ;(isTokenExpired as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      false,
    )

    const response = makeResponse(200)
    ;(fetchImpl as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      response,
    )
    ;(
      parseResponseAndHandleError as unknown as ReturnType<typeof vi.fn>
    ).mockResolvedValue({ ok: true })

    const api = createApiClientCore(deps)
    const res = await api.apiGet<{ ok: boolean }>('/profile/user')

    expect(resolveUrl).toHaveBeenCalledWith('/profile/user')
    expect(fetchImpl).toHaveBeenCalledTimes(1)

    const [url, init] = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock
      .calls[0] as [string, RequestInit]

    expect(url).toBe('https://example.test/profile/user')
    expect(init.method).toBe('GET')

    const headers = init.headers as Record<string, string>
    expect(headers.Accept).toBe('application/json')
    expect(headers['Content-Type']).toBe('application/json')
    expect(headers.Authorization).toBe('Bearer access.token')

    expect(parseResponseAndHandleError).toHaveBeenCalledWith(response)
    expect(res).toEqual({ ok: true })
  })

  it('does not include Authorization header when path is /auth/refresh', async () => {
    const { deps, fetchImpl } = makeDeps({
      tokens: {
        [TokenScope.User]: {
          [TokenType.Access]: 'access.token',
          [TokenType.Refresh]: 'refresh.token',
        },
      },
    })

    ;(isTokenExpired as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      false,
    )

    const response = makeResponse(200)
    ;(fetchImpl as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      response,
    )
    ;(
      parseResponseAndHandleError as unknown as ReturnType<typeof vi.fn>
    ).mockResolvedValue({ accessToken: 'a', refreshToken: 'r' })

    const api = createApiClientCore(deps)
    await api.apiPost<{ accessToken: string; refreshToken: string }>(
      '/auth/refresh',
      { refreshToken: 'refresh.token' } as unknown as ApiPostBody,
    )

    const [, init] = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock
      .calls[0] as [string, RequestInit]

    const headers = init.headers as Record<string, string>
    expect(headers.Authorization).toBeUndefined()
  })

  it('preemptively refreshes when access token is expired and refresh is enabled; updates token pair and hydrates user for TokenScope.User', async () => {
    const {
      deps,
      fetchImpl,
      setTokenPair,
      fetchCurrentUser,
      notifyRefreshFailure,
    } = makeDeps({
      tokens: {
        [TokenScope.User]: {
          [TokenType.Access]: 'expired.access',
          [TokenType.Refresh]: 'refresh.token',
        },
      },
    })

    ;(isTokenExpired as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      (token: unknown) => token === 'expired.access',
    )

    const refreshResponse = makeResponse(200)
    const dataResponse = makeResponse(200)

    ;(fetchImpl as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      refreshResponse,
    )
    ;(fetchImpl as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      dataResponse,
    )
    ;(
      parseResponseAndHandleError as unknown as ReturnType<typeof vi.fn>
    ).mockResolvedValueOnce({
      accessToken: 'new.access',
      refreshToken: 'new.refresh',
    })
    ;(
      parseResponseAndHandleError as unknown as ReturnType<typeof vi.fn>
    ).mockResolvedValueOnce({ ok: true })

    const api = createApiClientCore(deps)
    const res = await api.apiGet<{ ok: boolean }>('/profile/user')

    expect(fetchImpl).toHaveBeenCalledTimes(2)

    // refresh call
    expect(resolveUrl).toHaveBeenNthCalledWith(1, '/auth/refresh')
    const [refreshUrl, refreshInit] = (
      fetchImpl as unknown as ReturnType<typeof vi.fn>
    ).mock.calls[0] as [string, RequestInit]
    expect(refreshUrl).toBe('https://example.test/auth/refresh')
    expect(refreshInit.method).toBe('POST')
    expect(refreshInit.body).toBe(
      JSON.stringify({ refreshToken: 'refresh.token' }),
    )

    expect(setTokenPair).toHaveBeenCalledWith(
      TokenScope.User,
      'new.access',
      'new.refresh',
    )
    expect(fetchCurrentUser).toHaveBeenCalledWith('new.access')

    // actual request uses refreshed token
    const [, dataInit] = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock
      .calls[1] as [string, RequestInit]
    const dataHeaders = dataInit.headers as Record<string, string>
    expect(dataHeaders.Authorization).toBe('Bearer new.access')

    expect(res).toEqual({ ok: true })
    expect(notifyRefreshFailure).not.toHaveBeenCalled()
  })

  it('does not preemptively refresh when an override token is provided', async () => {
    const { deps, fetchImpl, setTokenPair } = makeDeps({
      tokens: {
        [TokenScope.User]: {
          [TokenType.Access]: 'expired.access',
          [TokenType.Refresh]: 'refresh.token',
        },
      },
    })

    ;(isTokenExpired as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      true,
    )

    const response = makeResponse(200)
    ;(fetchImpl as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      response,
    )
    ;(
      parseResponseAndHandleError as unknown as ReturnType<typeof vi.fn>
    ).mockResolvedValue({ ok: true })

    const api = createApiClientCore(deps)
    await api.apiGet<{ ok: boolean }>('/profile/user', {
      token: 'override.access',
    })

    expect(fetchImpl).toHaveBeenCalledTimes(1)
    expect(setTokenPair).not.toHaveBeenCalled()

    const [, init] = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock
      .calls[0] as [string, RequestInit]
    const headers = init.headers as Record<string, string>
    expect(headers.Authorization).toBe('Bearer override.access')
  })

  it('does not preemptively refresh when refresh=false is provided', async () => {
    const { deps, fetchImpl, setTokenPair } = makeDeps({
      tokens: {
        [TokenScope.User]: {
          [TokenType.Access]: 'expired.access',
          [TokenType.Refresh]: 'refresh.token',
        },
      },
    })

    ;(isTokenExpired as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      true,
    )

    const response = makeResponse(200)
    ;(fetchImpl as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      response,
    )
    ;(
      parseResponseAndHandleError as unknown as ReturnType<typeof vi.fn>
    ).mockResolvedValue({ ok: true })

    const api = createApiClientCore(deps)
    await api.apiGet<{ ok: boolean }>('/profile/user', { refresh: false })

    expect(fetchImpl).toHaveBeenCalledTimes(1)
    expect(setTokenPair).not.toHaveBeenCalled()
  })

  it('retries once on 401 by refreshing and reissuing the request with refresh disabled', async () => {
    const { deps, fetchImpl, setTokenPair, fetchCurrentUser } = makeDeps({
      tokens: {
        [TokenScope.User]: {
          [TokenType.Access]: 'access.token',
          [TokenType.Refresh]: 'refresh.token',
        },
      },
    })

    ;(isTokenExpired as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      false,
    )

    const firstResponse401 = makeResponse(401)
    const refreshResponse = makeResponse(200)
    const secondResponse200 = makeResponse(200)

    ;(fetchImpl as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      firstResponse401,
    )
    ;(fetchImpl as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      refreshResponse,
    )
    ;(fetchImpl as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      secondResponse200,
    )
    ;(
      parseResponseAndHandleError as unknown as ReturnType<typeof vi.fn>
    ).mockResolvedValueOnce({
      accessToken: 'new.access',
      refreshToken: 'new.refresh',
    })
    ;(
      parseResponseAndHandleError as unknown as ReturnType<typeof vi.fn>
    ).mockResolvedValueOnce({ ok: true })

    const api = createApiClientCore(deps)
    const res = await api.apiGet<{ ok: boolean }>('/profile/user')

    expect(fetchImpl).toHaveBeenCalledTimes(3)

    // first attempt
    const [, init1] = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock
      .calls[0] as [string, RequestInit]
    expect((init1.headers as Record<string, string>).Authorization).toBe(
      'Bearer access.token',
    )

    // refresh
    expect(resolveUrl).toHaveBeenNthCalledWith(2, '/auth/refresh')
    expect(setTokenPair).toHaveBeenCalledWith(
      TokenScope.User,
      'new.access',
      'new.refresh',
    )
    expect(fetchCurrentUser).toHaveBeenCalledWith('new.access')

    // retry uses refreshed token
    const [, init3] = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock
      .calls[2] as [string, RequestInit]
    expect((init3.headers as Record<string, string>).Authorization).toBe(
      'Bearer new.access',
    )

    expect(res).toEqual({ ok: true })
  })

  it('does not retry on 401 when refresh token is missing', async () => {
    const { deps, fetchImpl, setTokenPair } = makeDeps({
      tokens: {
        [TokenScope.User]: {
          [TokenType.Access]: 'access.token',
        },
      },
    })

    ;(isTokenExpired as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      false,
    )

    const response401 = makeResponse(401)
    ;(fetchImpl as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      response401,
    )
    ;(
      parseResponseAndHandleError as unknown as ReturnType<typeof vi.fn>
    ).mockResolvedValue({ ok: false })

    const api = createApiClientCore(deps)
    const res = await api.apiGet<{ ok: boolean }>('/profile/user')

    expect(fetchImpl).toHaveBeenCalledTimes(1)
    expect(setTokenPair).not.toHaveBeenCalled()
    expect(res).toEqual({ ok: false })
  })

  it('does not retry on 401 when calling /auth/refresh', async () => {
    const { deps, fetchImpl, setTokenPair } = makeDeps({
      tokens: {
        [TokenScope.User]: {
          [TokenType.Access]: 'access.token',
          [TokenType.Refresh]: 'refresh.token',
        },
      },
    })

    ;(isTokenExpired as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      false,
    )

    const response401 = makeResponse(401)
    ;(fetchImpl as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      response401,
    )
    ;(
      parseResponseAndHandleError as unknown as ReturnType<typeof vi.fn>
    ).mockResolvedValue({ ok: false })

    const api = createApiClientCore(deps)
    const res = await api.apiPost<{ ok: boolean }>('/auth/refresh', {
      refreshToken: 'refresh.token',
    } as unknown as ApiPostBody)

    expect(fetchImpl).toHaveBeenCalledTimes(1)
    expect(setTokenPair).not.toHaveBeenCalled()
    expect(res).toEqual({ ok: false })
  })

  it('hydrates user only for TokenScope.User; game scope refresh does not call fetchCurrentUser', async () => {
    const { deps, fetchImpl, fetchCurrentUser } = makeDeps({
      tokens: {
        [TokenScope.Game]: {
          [TokenType.Access]: 'expired.game.access',
          [TokenType.Refresh]: 'game.refresh',
        },
      },
    })

    ;(isTokenExpired as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      (token: unknown) => token === 'expired.game.access',
    )

    const refreshResponse = makeResponse(200)
    const dataResponse = makeResponse(200)

    ;(fetchImpl as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      refreshResponse,
    )
    ;(fetchImpl as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      dataResponse,
    )
    ;(
      parseResponseAndHandleError as unknown as ReturnType<typeof vi.fn>
    ).mockResolvedValueOnce({
      accessToken: 'new.game.access',
      refreshToken: 'new.game.refresh',
    })
    ;(
      parseResponseAndHandleError as unknown as ReturnType<typeof vi.fn>
    ).mockResolvedValueOnce({ ok: true })

    const api = createApiClientCore(deps)
    await api.apiGet<{ ok: boolean }>('/games/abc/players', {
      scope: TokenScope.Game,
    })

    expect(fetchCurrentUser).not.toHaveBeenCalled()
  })

  it('apiPost/apiPut/apiPatch/apiDelete pass method and body correctly', async () => {
    const { deps, fetchImpl } = makeDeps({
      tokens: {
        [TokenScope.User]: {
          [TokenType.Access]: 'access.token',
        },
      },
    })

    ;(isTokenExpired as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      false,
    )

    const response = makeResponse(200)
    ;(fetchImpl as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      response,
    )
    ;(
      parseResponseAndHandleError as unknown as ReturnType<typeof vi.fn>
    ).mockResolvedValue({ ok: true })

    const api = createApiClientCore(deps)

    await api.apiPost('/x', { a: 1 } as unknown as ApiPostBody)
    await api.apiPut('/y', { b: 2 } as unknown as ApiPostBody)
    await api.apiPatch('/z', { c: 3 } as unknown as ApiPostBody)
    await api.apiDelete('/w', { d: 4 } as unknown as ApiPostBody)

    const calls = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls
    expect(calls).toHaveLength(4)

    expect((calls[0][1] as RequestInit).method).toBe('POST')
    expect((calls[1][1] as RequestInit).method).toBe('PUT')
    expect((calls[2][1] as RequestInit).method).toBe('PATCH')
    expect((calls[3][1] as RequestInit).method).toBe('DELETE')

    expect((calls[0][1] as RequestInit).body).toBe(JSON.stringify({ a: 1 }))
    expect((calls[1][1] as RequestInit).body).toBe(JSON.stringify({ b: 2 }))
    expect((calls[2][1] as RequestInit).body).toBe(JSON.stringify({ c: 3 }))
    expect((calls[3][1] as RequestInit).body).toBe(JSON.stringify({ d: 4 }))
  })

  it('does not include Authorization header when no access token is available', async () => {
    const { deps, fetchImpl } = makeDeps()

    ;(isTokenExpired as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      false,
    )

    const response = makeResponse(200)
    ;(fetchImpl as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      response,
    )
    ;(
      parseResponseAndHandleError as unknown as ReturnType<typeof vi.fn>
    ).mockResolvedValue({ ok: true })

    const api = createApiClientCore(deps)
    await api.apiGet<{ ok: boolean }>('/public')

    const [, init] = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock
      .calls[0] as [string, RequestInit]
    const headers = init.headers as Record<string, string>
    expect(headers.Authorization).toBeUndefined()
  })

  it('does not set RequestInit.body when body is undefined', async () => {
    const { deps, fetchImpl } = makeDeps({
      tokens: {
        [TokenScope.User]: {
          [TokenType.Access]: 'access.token',
        },
      },
    })

    ;(isTokenExpired as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      false,
    )

    const response = makeResponse(200)
    ;(fetchImpl as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      response,
    )
    ;(
      parseResponseAndHandleError as unknown as ReturnType<typeof vi.fn>
    ).mockResolvedValue({ ok: true })

    const api = createApiClientCore(deps)
    await api.apiGet<{ ok: boolean }>('/no-body')

    const [, init] = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock
      .calls[0] as [string, RequestInit]
    expect(Object.prototype.hasOwnProperty.call(init, 'body')).toBe(false)
  })

  it('does not attempt refresh+retry on 401 when refresh is disabled', async () => {
    const { deps, fetchImpl, setTokenPair } = makeDeps({
      tokens: {
        [TokenScope.User]: {
          [TokenType.Access]: 'access.token',
          [TokenType.Refresh]: 'refresh.token',
        },
      },
    })

    ;(isTokenExpired as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      false,
    )

    const response401 = makeResponse(401)
    ;(fetchImpl as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      response401,
    )
    ;(
      parseResponseAndHandleError as unknown as ReturnType<typeof vi.fn>
    ).mockResolvedValue({ ok: false })

    const api = createApiClientCore(deps)
    const res = await api.apiGet<{ ok: boolean }>('/profile/user', {
      refresh: false,
    })

    expect(fetchImpl).toHaveBeenCalledTimes(1)
    expect(setTokenPair).not.toHaveBeenCalled()
    expect(res).toEqual({ ok: false })
  })

  it('does not refresh twice when retrying after 401 (retry uses refresh:false)', async () => {
    const { deps, fetchImpl, setTokenPair } = makeDeps({
      tokens: {
        [TokenScope.User]: {
          [TokenType.Access]: 'access.token',
          [TokenType.Refresh]: 'refresh.token',
        },
      },
    })

    ;(isTokenExpired as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      false,
    )

    const first401 = makeResponse(401)
    const refresh200 = makeResponse(200)
    const second401 = makeResponse(401)

    ;(fetchImpl as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      first401,
    )
    ;(fetchImpl as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      refresh200,
    )
    ;(fetchImpl as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      second401,
    )
    ;(
      parseResponseAndHandleError as unknown as ReturnType<typeof vi.fn>
    ).mockResolvedValueOnce({
      accessToken: 'new.access',
      refreshToken: 'new.refresh',
    })
    ;(
      parseResponseAndHandleError as unknown as ReturnType<typeof vi.fn>
    ).mockResolvedValueOnce({ ok: false })

    const api = createApiClientCore(deps)
    const res = await api.apiGet<{ ok: boolean }>('/profile/user')

    expect(fetchImpl).toHaveBeenCalledTimes(3)
    expect(setTokenPair).toHaveBeenCalledTimes(1)
    expect(resolveUrl).toHaveBeenCalledWith('/auth/refresh')
    expect(res).toEqual({ ok: false })
  })

  it('does not preemptively refresh when calling /auth/refresh even if token is expired', async () => {
    const { deps, fetchImpl, setTokenPair } = makeDeps({
      tokens: {
        [TokenScope.User]: {
          [TokenType.Access]: 'expired.access',
          [TokenType.Refresh]: 'refresh.token',
        },
      },
    })

    ;(isTokenExpired as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      true,
    )

    const response = makeResponse(200)
    ;(fetchImpl as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      response,
    )
    ;(
      parseResponseAndHandleError as unknown as ReturnType<typeof vi.fn>
    ).mockResolvedValue({
      accessToken: 'a',
      refreshToken: 'r',
    })

    const api = createApiClientCore(deps)
    await api.apiPost('/auth/refresh', {
      refreshToken: 'refresh.token',
    } as unknown as ApiPostBody)

    expect(fetchImpl).toHaveBeenCalledTimes(1)
    expect(setTokenPair).not.toHaveBeenCalled()
  })

  it('propagates refresh parsing failure and does not persist tokens', async () => {
    const { deps, fetchImpl, setTokenPair, fetchCurrentUser } = makeDeps({
      tokens: {
        [TokenScope.User]: {
          [TokenType.Access]: 'expired.access',
          [TokenType.Refresh]: 'refresh.token',
        },
      },
    })

    ;(isTokenExpired as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      true,
    )

    const refreshResponse = makeResponse(200)
    ;(fetchImpl as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      refreshResponse,
    )

    const err = new Error('bad refresh payload')
    ;(
      parseResponseAndHandleError as unknown as ReturnType<typeof vi.fn>
    ).mockRejectedValue(err)

    const api = createApiClientCore(deps)

    await expect(api.apiGet('/profile/user')).rejects.toBe(err)
    expect(setTokenPair).not.toHaveBeenCalled()
    expect(fetchCurrentUser).not.toHaveBeenCalled()
  })

  it('notifies once immediately when automatic refresh fails, including concurrent requests', async () => {
    const refreshToken = 'qa009-failed-refresh-token'
    const notifyRefreshFailure = vi.fn()
    const { deps, fetchImpl, setTokenPair } = makeDeps({
      tokens: {
        [TokenScope.User]: {
          [TokenType.Access]: 'qa009-expired-access-token',
          [TokenType.Refresh]: refreshToken,
        },
      },
      notifyRefreshFailure,
    })

    ;(isTokenExpired as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      true,
    )
    ;(fetchImpl as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeResponse(400),
    )
    const refreshError = new Error('refresh rejected')
    ;(
      parseResponseAndHandleError as unknown as ReturnType<typeof vi.fn>
    ).mockRejectedValue(refreshError)

    const api = createApiClientCore(deps)
    const results = await Promise.allSettled([
      api.apiGet('/profile/user'),
      api.apiGet('/profile/games'),
    ])

    expect(results.every(({ status }) => status === 'rejected')).toBe(true)
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    expect(notifyRefreshFailure).toHaveBeenCalledExactlyOnceWith(
      TokenScope.User,
    )
    expect(setTokenPair).not.toHaveBeenCalled()

    await expect(api.apiGet('/profile/user')).rejects.toBe(refreshError)
    expect(notifyRefreshFailure).toHaveBeenCalledExactlyOnceWith(
      TokenScope.User,
    )
  })

  type FakeProgressEvent = {
    lengthComputable: boolean
    loaded: number
    total: number
  }

  class FakeXMLHttpRequest {
    static lastInstance: FakeXMLHttpRequest | undefined
    static instances: FakeXMLHttpRequest[] = []

    responseType: XMLHttpRequestResponseType = ''
    response: unknown = undefined
    status = 0

    upload = {
      onprogress: undefined as ((event: FakeProgressEvent) => void) | undefined,
    }

    onload: (() => void) | undefined
    onerror: (() => void) | undefined
    onabort: (() => void) | undefined

    open = vi.fn()
    setRequestHeader = vi.fn()
    send = vi.fn()

    constructor() {
      FakeXMLHttpRequest.lastInstance = this
      FakeXMLHttpRequest.instances.push(this)
    }

    triggerProgress(event: FakeProgressEvent) {
      this.upload.onprogress?.(event)
    }

    triggerLoad(status: number, response: unknown) {
      this.status = status
      this.response = response
      this.onload?.()
    }

    triggerError() {
      this.onerror?.()
    }

    triggerAbort() {
      this.onabort?.()
    }
  }

  describe('createApiClientCore apiUpload', () => {
    const flushMicrotasks = async () => {
      await Promise.resolve()
      await Promise.resolve()
    }

    beforeEach(() => {
      vi.clearAllMocks()
      FakeXMLHttpRequest.lastInstance = undefined
      FakeXMLHttpRequest.instances = []

      vi.stubGlobal(
        'XMLHttpRequest',
        FakeXMLHttpRequest as unknown as typeof XMLHttpRequest,
      )

      // Critical in jsdom: XMLHttpRequest is typically read from window
      if (globalThis.window) {
        vi.stubGlobal('window', {
          ...globalThis.window,
          XMLHttpRequest: FakeXMLHttpRequest,
        } as unknown as Window & typeof globalThis)
      }

      class FakeFormData {
        append = vi.fn()
      }
      vi.stubGlobal('FormData', FakeFormData as unknown as typeof FormData)
    })

    afterEach(() => {
      vi.unstubAllGlobals()
    })

    const waitForXhrInstance = async () => {
      for (let i = 0; i < 10; i++) {
        if (FakeXMLHttpRequest.lastInstance)
          return FakeXMLHttpRequest.lastInstance
        await Promise.resolve()
      }
      throw new Error(
        'Expected XMLHttpRequest to be created, but none was created',
      )
    }

    const waitForXhrCount = async (count: number) => {
      for (let i = 0; i < 10; i++) {
        const instance = FakeXMLHttpRequest.instances[count - 1]
        if (instance) return instance
        await Promise.resolve()
      }
      throw new Error(`Expected ${count} XMLHttpRequest instances`)
    }

    it('apiUpload opens POST to resolved URL, sets responseType to json, and resolves with xhr.response', async () => {
      const { deps } = makeDeps({
        tokens: {
          [TokenScope.User]: {
            [TokenType.Access]: 'access.token',
            [TokenType.Refresh]: 'refresh.token',
          },
        },
      })

      ;(isTokenExpired as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
        false,
      )

      const api = createApiClientCore(deps)

      const createFormData = vi.fn(() => new FormData())
      const promise = api.apiUpload<{ id: string }>(
        '/media/uploads/photos',
        createFormData,
      )

      const xhr = FakeXMLHttpRequest.lastInstance
      expect(xhr).toBeDefined()

      expect(resolveUrl).toHaveBeenCalledWith('/media/uploads/photos')
      expect(xhr!.open).toHaveBeenCalledWith(
        'POST',
        'https://example.test/media/uploads/photos',
      )

      expect(xhr!.responseType).toBe('json')
      expect(createFormData).toHaveBeenCalledTimes(1)
      expect(xhr!.send).toHaveBeenCalledTimes(1)

      xhr!.triggerLoad(201, { id: 'p1' })
      await expect(promise).resolves.toEqual({ id: 'p1' })
    })

    it('apiUpload sets Authorization header when access token exists', async () => {
      const { deps } = makeDeps({
        tokens: {
          [TokenScope.User]: {
            [TokenType.Access]: 'access.token',
          },
        },
      })

      ;(isTokenExpired as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
        false,
      )

      const api = createApiClientCore(deps)

      const promise = api.apiUpload<{ ok: boolean }>(
        '/media/uploads/photos',
        () => new FormData(),
      )

      const xhr = await waitForXhrInstance()
      expect(xhr.setRequestHeader).toHaveBeenCalledWith(
        'Authorization',
        'Bearer access.token',
      )

      xhr.triggerLoad(200, { ok: true })
      await expect(promise).resolves.toEqual({ ok: true })
    })

    it('apiUpload does not set Authorization header when no access token is available', async () => {
      const { deps } = makeDeps()

      ;(isTokenExpired as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
        false,
      )

      const api = createApiClientCore(deps)

      const promise = api.apiUpload<{ ok: boolean }>(
        '/media/uploads/photos',
        () => new FormData(),
      )

      const xhr = FakeXMLHttpRequest.lastInstance!
      expect(xhr.setRequestHeader).not.toHaveBeenCalled()

      xhr.triggerLoad(200, { ok: true })
      await expect(promise).resolves.toEqual({ ok: true })
    })

    it('apiUpload forwards progress only when lengthComputable is true and rounds percentage', async () => {
      const { deps } = makeDeps({
        tokens: {
          [TokenScope.User]: {
            [TokenType.Access]: 'access.token',
          },
        },
      })

      ;(isTokenExpired as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
        false,
      )

      const api = createApiClientCore(deps)

      const onProgress = vi.fn()
      const promise = api.apiUpload<{ ok: boolean }>(
        '/media/uploads/photos',
        () => new FormData(),
        { onProgress },
      )

      const xhr = FakeXMLHttpRequest.lastInstance!
      xhr.triggerProgress({ lengthComputable: true, loaded: 1, total: 3 })
      expect(onProgress).toHaveBeenCalledWith(33)

      xhr.triggerProgress({ lengthComputable: false, loaded: 2, total: 3 })
      expect(onProgress).toHaveBeenCalledTimes(1)

      xhr.triggerLoad(200, { ok: true })
      await expect(promise).resolves.toEqual({ ok: true })
    })

    it('apiUpload rejects on non-2xx status with ApiError containing the status', async () => {
      const { deps } = makeDeps({
        tokens: {
          [TokenScope.User]: {
            [TokenType.Access]: 'access.token',
          },
        },
      })

      ;(isTokenExpired as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
        false,
      )

      const api = createApiClientCore(deps)

      const promise = api.apiUpload<{ ok: boolean }>(
        '/media/uploads/photos',
        () => new FormData(),
      )

      const xhr = FakeXMLHttpRequest.lastInstance!
      xhr.triggerLoad(500, { message: 'nope' })

      await expect(promise).rejects.toMatchObject({ status: 500 })
    })

    it('apiUpload rejects on network error with ApiError status -1', async () => {
      const { deps } = makeDeps({
        tokens: {
          [TokenScope.User]: {
            [TokenType.Access]: 'access.token',
          },
        },
      })

      ;(isTokenExpired as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
        false,
      )

      const api = createApiClientCore(deps)

      const promise = api.apiUpload<{ ok: boolean }>(
        '/media/uploads/photos',
        () => new FormData(),
      )

      const xhr = FakeXMLHttpRequest.lastInstance!
      xhr.triggerError()

      await expect(promise).rejects.toMatchObject({ status: -1 })
    })

    it('apiUpload preemptively refreshes when access token is expired and uses refreshed token for upload', async () => {
      const { deps, fetchImpl, setTokenPair } = makeDeps({
        tokens: {
          [TokenScope.User]: {
            [TokenType.Access]: 'expired.access',
            [TokenType.Refresh]: 'refresh.token',
          },
        },
      })

      ;(
        isTokenExpired as unknown as ReturnType<typeof vi.fn>
      ).mockImplementation((token: unknown) => token === 'expired.access')

      const refreshResponse = makeResponse(200)
      ;(fetchImpl as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        refreshResponse,
      )
      ;(
        parseResponseAndHandleError as unknown as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce({
        accessToken: 'new.access',
        refreshToken: 'new.refresh',
      })

      const api = createApiClientCore(deps)

      const promise = api.apiUpload<{ id: string }>(
        '/media/uploads/photos',
        () => new FormData(),
      )

      await flushMicrotasks()

      expect(setTokenPair).toHaveBeenCalledWith(
        TokenScope.User,
        'new.access',
        'new.refresh',
      )

      const xhr = await waitForXhrInstance()
      expect(xhr.setRequestHeader).toHaveBeenCalledWith(
        'Authorization',
        'Bearer new.access',
      )

      xhr.triggerLoad(201, { id: 'p1' })
      await expect(promise).resolves.toEqual({ id: 'p1' })
    })

    it('apiUpload retries once on 401 by refreshing and re-uploading; createFormData is called twice', async () => {
      const { deps, fetchImpl, setTokenPair } = makeDeps({
        tokens: {
          [TokenScope.User]: {
            [TokenType.Access]: 'access.token',
            [TokenType.Refresh]: 'refresh.token',
          },
        },
      })

      ;(isTokenExpired as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
        false,
      )

      const refreshResponse = makeResponse(200)
      ;(fetchImpl as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        refreshResponse,
      )
      ;(
        parseResponseAndHandleError as unknown as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce({
        accessToken: 'new.access',
        refreshToken: 'new.refresh',
      })

      const api = createApiClientCore(deps)

      const createFormData = vi.fn(() => new FormData())
      const promise = api.apiUpload<{ id: string }>(
        '/media/uploads/photos',
        createFormData,
      )

      // wait for first XHR to exist
      const xhr1 = await waitForXhrInstance()
      expect(FakeXMLHttpRequest.instances).toHaveLength(1)

      xhr1.triggerLoad(401, { message: 'unauthorized' })

      await flushMicrotasks()
      await flushMicrotasks() // one extra tick helps because it's: reject -> catch -> await refresh -> recurse -> create new XHR

      expect(setTokenPair).toHaveBeenCalledWith(
        TokenScope.User,
        'new.access',
        'new.refresh',
      )

      const xhr2 = await waitForXhrCount(2)
      expect(FakeXMLHttpRequest.instances).toHaveLength(2)
      expect(createFormData).toHaveBeenCalledTimes(2)

      xhr2.triggerLoad(201, { id: 'p2' })

      await expect(promise).resolves.toEqual({ id: 'p2' })
    })

    it('apiUpload does not retry on 401 when refresh is disabled', async () => {
      const { deps, fetchImpl, setTokenPair } = makeDeps({
        tokens: {
          [TokenScope.User]: {
            [TokenType.Access]: 'access.token',
            [TokenType.Refresh]: 'refresh.token',
          },
        },
      })

      ;(isTokenExpired as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
        false,
      )

      const api = createApiClientCore(deps)

      const promise = api.apiUpload<{ id: string }>(
        '/media/uploads/photos',
        () => new FormData(),
        { refresh: false },
      )

      const xhr = await waitForXhrInstance()
      xhr.triggerLoad(401, { message: 'unauthorized' })

      await expect(promise).rejects.toMatchObject({ status: 401 })
      expect(fetchImpl).not.toHaveBeenCalled()
      expect(setTokenPair).not.toHaveBeenCalled()
      expect(FakeXMLHttpRequest.instances).toHaveLength(1)
    })

    it('apiUpload does not preemptively refresh when an override token is provided', async () => {
      const { deps, fetchImpl, setTokenPair } = makeDeps({
        tokens: {
          [TokenScope.User]: {
            [TokenType.Access]: 'expired.access',
            [TokenType.Refresh]: 'refresh.token',
          },
        },
      })

      ;(isTokenExpired as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
        true,
      )

      const api = createApiClientCore(deps)

      const promise = api.apiUpload<{ id: string }>(
        '/media/uploads/photos',
        () => new FormData(),
        { token: 'override.access' },
      )

      expect(fetchImpl).not.toHaveBeenCalled()
      expect(setTokenPair).not.toHaveBeenCalled()

      const xhr = FakeXMLHttpRequest.lastInstance!
      expect(xhr.setRequestHeader).toHaveBeenCalledWith(
        'Authorization',
        'Bearer override.access',
      )

      xhr.triggerLoad(201, { id: 'p1' })
      await expect(promise).resolves.toEqual({ id: 'p1' })
    })

    it('apiUpload uses TokenScope.Game when provided and does not hydrate user on refresh', async () => {
      const { deps, fetchImpl, fetchCurrentUser, setTokenPair } = makeDeps({
        tokens: {
          [TokenScope.Game]: {
            [TokenType.Access]: 'expired.game.access',
            [TokenType.Refresh]: 'game.refresh',
          },
        },
      })

      ;(
        isTokenExpired as unknown as ReturnType<typeof vi.fn>
      ).mockImplementation((token: unknown) => token === 'expired.game.access')

      const refreshResponse = makeResponse(200)
      ;(fetchImpl as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        refreshResponse,
      )
      ;(
        parseResponseAndHandleError as unknown as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce({
        accessToken: 'new.game.access',
        refreshToken: 'new.game.refresh',
      })

      const api = createApiClientCore(deps)

      const promise = api.apiUpload<{ id: string }>(
        '/media/uploads/photos',
        () => new FormData(),
        { scope: TokenScope.Game },
      )

      await flushMicrotasks()

      expect(setTokenPair).toHaveBeenCalledWith(
        TokenScope.Game,
        'new.game.access',
        'new.game.refresh',
      )
      expect(fetchCurrentUser).not.toHaveBeenCalled()

      const xhr = await waitForXhrInstance()
      expect(xhr.setRequestHeader).toHaveBeenCalledWith(
        'Authorization',
        'Bearer new.game.access',
      )

      xhr.triggerLoad(201, { id: 'p1' })
      await expect(promise).resolves.toEqual({ id: 'p1' })
    })

    it('apiUpload rejects on abort with ApiError status -1', async () => {
      const { deps } = makeDeps({
        tokens: {
          [TokenScope.User]: {
            [TokenType.Access]: 'access.token',
          },
        },
      })

      ;(isTokenExpired as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
        false,
      )

      const api = createApiClientCore(deps)

      const promise = api.apiUpload<{ ok: boolean }>(
        '/media/uploads/photos',
        () => new FormData(),
      )

      const xhr = FakeXMLHttpRequest.lastInstance!
      xhr.triggerAbort()

      await expect(promise).rejects.toMatchObject({ status: -1 })
    })
  })
})
