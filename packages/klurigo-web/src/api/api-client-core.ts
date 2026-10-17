import { TokenScope, TokenType } from '@klurigo/common'

import { ApiError, type ApiPostBody, ApiRefreshError } from './api.utils'
import {
  isTokenExpired,
  parseResponseAndHandleError,
  resolveUrl,
} from './api.utils'

/**
 * Per-request overrides for authentication and refresh behavior.
 *
 * Use this when a call needs a non-default token scope, when an endpoint provides a
 * one-time token (e.g. email verification), or when refresh must be disabled to avoid
 * recursion (e.g. `/auth/refresh`).
 */
export type FetchOptions = {
  /**
   * The token scope used to resolve tokens for the request.
   *
   * Defaults to `TokenScope.User`.
   */
  scope?: TokenScope

  /**
   * Explicit access token for this request.
   *
   * When provided, this bypasses token resolution from context and also disables
   * preemptive refresh based on local expiry checks.
   */
  token?: string

  /**
   * Controls whether the client should attempt refresh when:
   * - the current access token is locally detected as expired, or
   * - the server responds with HTTP 401 for a request that included an access token.
   *
   * Defaults to `true`.
   */
  refresh?: boolean
}

/**
 * Options specific to `apiUpload`, which uses `XMLHttpRequest` for upload progress support.
 */
export type UploadOptions = FetchOptions & {
  /**
   * Called with integer percentage progress values in the range 0–100.
   */
  onProgress?: (progress: number) => void

  /**
   * Optional hook for customizing the XHR instance before sending.
   *
   * Use this sparingly (e.g., setting `withCredentials`, responseType overrides).
   */
  configureXhr?: (xhr: XMLHttpRequest) => void
}

/**
 * Dependencies required by `createApiClientCore`.
 *
 * The API core is designed to be independent of React hooks and UI concerns:
 * - token storage is provided via `getToken` and `setTokenPair`
 * - user hydration is provided via `fetchCurrentUser`
 * - automatic refresh failures can be reported through an optional composition-root callback
 * - request execution can be overridden via `fetchImpl` for tests
 */
export type ApiClientCoreDeps = {
  /**
   * Returns the current token for the given scope and type.
   *
   * @param scope - Token scope (User/Game) used to pick the correct token set.
   * @param type - Token type (Access/Refresh) to retrieve.
   * @returns The token string if present; otherwise `undefined`.
   */
  getToken: (
    scope: TokenScope,
    type: TokenType.Access | TokenType.Refresh,
  ) => string | undefined

  /**
   * Persists a new access/refresh token pair for the provided scope.
   *
   * @param scope - Token scope (User/Game) the tokens belong to.
   * @param accessToken - New access token.
   * @param refreshToken - New refresh token.
   */
  setTokenPair: (
    scope: TokenScope,
    accessToken: string,
    refreshToken: string,
  ) => void

  /**
   * Refreshes the current user profile after user-scope authentication changes.
   *
   * This is only invoked for `TokenScope.User` and is not called for game-scope tokens.
   *
   * @param accessToken - A valid user access token.
   */
  fetchCurrentUser: (accessToken: string) => Promise<void>

  /** Notifies the composition root when an automatic refresh attempt fails. */
  notifyRefreshFailure?: (scope: TokenScope) => void

  /**
   * Optional `fetch` implementation override, primarily intended for tests.
   */
  fetchImpl?: typeof fetch
}

type TokenPair = { accessToken: string; refreshToken: string }

const refreshFlights = new Map<string, Promise<TokenPair>>()
const notifiedRefreshFailures = new Set<string>()

/**
 * Creates a request executor that centralizes auth token usage and retry behavior.
 *
 * Responsibilities:
 * - Resolves scope-specific access/refresh tokens via `deps.getToken`.
 * - Performs a refresh using the refresh token when appropriate and persists the new token pair.
 * - Replays a failed request once after an HTTP 401 by refreshing and retrying with the new access token.
 *
 * Non-responsibilities:
 * - No hard-coded UI or navigation behavior.
 * - No React hook usage.
 * - No dependency on resource modules (avoids circular imports).
 *
 * @param deps - Runtime dependencies for token access, token persistence, and user hydration.
 * @returns A small client surface (`apiGet`, `apiPost`, `apiPut`, `apiPatch`, `apiDelete`, `apiUpload`) backed by `apiFetch`.
 */
export const createApiClientCore = (deps: ApiClientCoreDeps) => {
  const fetchImpl = deps.fetchImpl ?? fetch

  const refreshViaFetch = async (
    scope: TokenScope,
    refreshToken: string,
  ): Promise<TokenPair> => {
    const key = `${scope}:${refreshToken}`
    const existingFlight = refreshFlights.get(key)
    if (existingFlight) return existingFlight

    const flight = (async (): Promise<TokenPair> => {
      try {
        // Important: do NOT call apiPost here, to avoid circular dependencies.
        const response = await fetchImpl(resolveUrl('/auth/refresh'), {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refreshToken }),
        })

        const res = await parseResponseAndHandleError<TokenPair>(response)

        deps.setTokenPair(scope, res.accessToken, res.refreshToken)
        if (scope === TokenScope.User) {
          await deps.fetchCurrentUser(res.accessToken)
        }

        notifiedRefreshFailures.delete(key)
        return res
      } catch (error) {
        if (!notifiedRefreshFailures.has(key)) {
          notifiedRefreshFailures.add(key)
          deps.notifyRefreshFailure?.(scope)
        }
        throw error
      } finally {
        refreshFlights.delete(key)
      }
    })()

    refreshFlights.set(key, flight)
    return flight
  }

  const apiFetch = async <T extends object | void>(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    path: string,
    body: ApiPostBody | undefined,
    options: FetchOptions = {},
  ): Promise<T> => {
    const overrideToken = options.token
    const scope = options.scope ?? TokenScope.User
    const shouldRefresh = options.refresh ?? true

    let accessToken = overrideToken || deps.getToken(scope, TokenType.Access)
    let refreshToken = deps.getToken(scope, TokenType.Refresh)

    // 1) Preemptively refresh expired accessToken (skip if overridden token or refresh is disabled)
    if (
      !overrideToken &&
      isTokenExpired(accessToken) &&
      refreshToken &&
      path !== '/auth/refresh' &&
      shouldRefresh
    ) {
      let refreshed: TokenPair
      try {
        refreshed = await refreshViaFetch(scope, refreshToken)
      } catch (error) {
        if (path === '/auth/game') throw new ApiRefreshError(error)
        throw error
      }
      accessToken = refreshed.accessToken
      refreshToken = refreshed.refreshToken
    }

    const headers: Record<string, string> = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    }

    if (accessToken && path !== '/auth/refresh') {
      headers.Authorization = `Bearer ${accessToken}`
    }

    const response = await fetchImpl(resolveUrl(path), {
      method,
      headers,
      ...(body ? { body: JSON.stringify(body) } : {}),
    })

    // 2) If 401 and we have a refreshToken (and not on the refresh path), try one refresh+retry
    if (
      response.status === 401 &&
      refreshToken &&
      path !== '/auth/refresh' &&
      shouldRefresh
    ) {
      let refreshed: TokenPair
      try {
        refreshed = await refreshViaFetch(scope, refreshToken)
      } catch (error) {
        if (path === '/auth/game') throw new ApiRefreshError(error)
        throw error
      }
      return apiFetch<T>(method, path, body, {
        scope,
        token: refreshed.accessToken,
        refresh: false,
      })
    }

    return parseResponseAndHandleError<T>(response)
  }

  /**
   * Executes a multipart upload using `XMLHttpRequest` so the caller can track progress.
   *
   * Token behavior matches `apiFetch`:
   * - Preemptively refreshes when the locally resolved token is expired (unless `options.token` is provided).
   * - Retries once on HTTP 401 by refreshing and repeating the upload with the new access token.
   *
   * @param path - API path (e.g. `/media/uploads/photos`).
   * @param createFormData - Factory that creates a fresh `FormData` instance for each attempt.
   * @param options - Authentication, refresh control, and progress callbacks.
   */
  const apiUpload = async <T extends object>(
    path: string,
    createFormData: () => FormData,
    options: UploadOptions = {},
  ): Promise<T> => {
    const overrideToken = options.token
    const scope = options.scope ?? TokenScope.User
    const shouldRefresh = options.refresh ?? true

    let accessToken = overrideToken || deps.getToken(scope, TokenType.Access)
    let refreshToken = deps.getToken(scope, TokenType.Refresh)

    // 1) Preemptively refresh expired accessToken (skip if overridden token or refresh is disabled)
    if (
      !overrideToken &&
      isTokenExpired(accessToken) &&
      refreshToken &&
      path !== '/auth/refresh' &&
      shouldRefresh
    ) {
      const refreshed = await refreshViaFetch(scope, refreshToken)
      accessToken = refreshed.accessToken
      refreshToken = refreshed.refreshToken
    }

    const attempt = async (tokenForAttempt?: string): Promise<T> => {
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest()

        xhr.responseType = 'json'
        options.configureXhr?.(xhr)

        if (options.onProgress) {
          xhr.upload.onprogress = (event) => {
            if (!event.lengthComputable) return
            const progress = Math.round((event.loaded / event.total) * 100)
            options.onProgress?.(progress)
          }
        }

        const fail = (status: number, message: string) => {
          reject(new ApiError(message, status))
        }

        xhr.onload = () => {
          const status = xhr.status

          if (status >= 200 && status < 300) {
            resolve(xhr.response as T)
            return
          }

          // Preserve status; message remains generic to avoid leaking server payload into UI layers.
          // If you want to capture server-provided details, do it inside ApiError (if it supports it).
          fail(status, 'Upload failed')
        }

        xhr.onerror = () => {
          // Network error / CORS / DNS / etc.
          fail(-1, 'Upload failed')
        }

        xhr.onabort = () => {
          fail(-1, 'Upload aborted')
        }

        xhr.open('POST', resolveUrl(path))

        if (tokenForAttempt && path !== '/auth/refresh') {
          xhr.setRequestHeader('Authorization', `Bearer ${tokenForAttempt}`)
        }

        xhr.send(createFormData())
      })
    }

    try {
      return await attempt(accessToken)
    } catch (err) {
      const status = err instanceof ApiError ? err.status : -1

      // 2) If 401 and we have a refreshToken (and not on the refresh path), try one refresh+retry
      if (
        status === 401 &&
        refreshToken &&
        path !== '/auth/refresh' &&
        shouldRefresh
      ) {
        const refreshed = await refreshViaFetch(scope, refreshToken)
        return apiUpload<T>(path, createFormData, {
          ...options,
          scope,
          token: refreshed.accessToken,
          refresh: false,
        })
      }

      throw err
    }
  }

  return {
    apiFetch,

    apiGet: <T extends object | void>(
      path: string,
      options: FetchOptions = {},
    ) => apiFetch<T>('GET', path, undefined, options),

    apiPost: <T extends object | void>(
      path: string,
      requestBody: ApiPostBody,
      options: FetchOptions = {},
    ) => apiFetch<T>('POST', path, requestBody, options),

    apiPut: <T extends object | void>(
      path: string,
      requestBody: ApiPostBody,
      options: FetchOptions = {},
    ) => apiFetch<T>('PUT', path, requestBody, options),

    apiPatch: <T extends object | void>(
      path: string,
      requestBody: ApiPostBody,
      options: FetchOptions = {},
    ) => apiFetch<T>('PATCH', path, requestBody, options),

    apiDelete: <T extends object | void>(
      path: string,
      requestBody?: ApiPostBody,
      options: FetchOptions = {},
    ) => apiFetch<T>('DELETE', path, requestBody, options),

    apiUpload,
  }
}

/**
 * Public type for the client core returned from `createApiClientCore`.
 *
 * Use this for resource constructors to ensure all resources depend on the same minimal surface.
 */
export type ApiClientCore = ReturnType<typeof createApiClientCore>
