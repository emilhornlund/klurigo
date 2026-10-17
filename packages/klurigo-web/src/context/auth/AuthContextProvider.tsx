import {
  type GameTokenDto,
  type TokenDto,
  TokenScope,
  TokenType,
} from '@klurigo/common'
import { jwtDecode } from 'jwt-decode'
import type { FC, ReactNode } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useIsMounted, useLocalStorage } from 'usehooks-ts'

import { useKlurigoServiceClient } from '../../api'
import { ApiError } from '../../api/api.utils'
import type { AuthState, ScopePayload } from '../../models'

import type { AuthContextType, RevokeGameOptions } from './auth-context'
import { AuthContext } from './auth-context'

/**
 * Allowed clock skew in seconds when evaluating token expiration.
 *
 * This skew is applied when deciding:
 * - whether an access token is still valid (used for `isUserAuthenticated` / `isGameAuthenticated`), and
 * - whether a refresh token is still valid (used for token maintenance).
 *
 * It reduces premature refresh attempts caused by small client–server clock differences.
 */
const SKEW_SEC = 5 // tolerate small clock skew

/**
 * Converts an epoch expiration value to seconds.
 *
 * JWT `exp` is defined as epoch seconds, but some sources may provide milliseconds.
 * This helper normalizes the value so comparisons can be done consistently.
 *
 * @param exp - Epoch timestamp in seconds or milliseconds.
 * @returns The expiration time in seconds, or `undefined` if input is falsy.
 */
const toSec = (exp?: number) =>
  !exp ? undefined : exp > 1_000_000_000_000 ? Math.floor(exp / 1000) : exp // ms→s if needed

/**
 * Determines whether a token should be treated as valid.
 *
 * A token is valid when:
 * - a token string exists, and
 * - the token expiration time is strictly after the current time,
 *   with a small skew tolerance applied.
 *
 * @param token - The raw token string.
 * @param exp - The token expiration time as epoch seconds or milliseconds.
 * @returns `true` when the token is present and not expired.
 */
const isValidToken = (token?: string, exp?: number) => {
  const nowSec = Math.floor(Date.now() / 1000)
  const expSec = toSec(exp)
  return !!token && (expSec ?? 0) > nowSec + SKEW_SEC
}

/**
 * Props for the `AuthContextProvider` component.
 *
 * @property children - The child components to be wrapped by the provider.
 */
export interface AuthContextProviderProps {
  children: ReactNode | ReactNode[]
}

/**
 * A context provider for managing authentication-related state.
 *
 * Persists decoded token payloads in local storage and exposes helper functions to:
 * - set token pairs per scope (User/Game),
 * - revoke tokens, and
 * - automatically maintain tokens (refresh/clear) on mount.
 *
 * Authentication semantics:
 * - `isUserAuthenticated` / `isGameAuthenticated` reflect whether the **access token** is currently valid.
 *   A stored token pair does not count as authenticated if the access token has expired.
 *
 * Automatic token maintenance (runs on mount and may re-run when dependencies change):
 * - Evaluates both User and Game scopes independently.
 * - If access token is valid: no action (and any scheduled retry is cancelled).
 * - If access token is missing/expired:
 *   - If refresh token is valid: calls the refresh endpoint to rotate tokens.
 *   - If refresh token is missing/expired: clears auth state for that scope.
 * - If refresh is rejected with HTTP 401: clears auth state for that scope.
 * - For transient refresh failures (network/5xx/etc): schedules a retry after a cooldown window.
 *
 * @param children - The child components to be wrapped by the provider.
 * @returns A React component wrapping its children with the `AuthContext` provider.
 */
const AuthContextProvider: FC<AuthContextProviderProps> = ({ children }) => {
  /**
   * API functions from useKlurigoServiceClient for:
   * - revoking an access or refresh token on the server, and
   * - exchanging a refresh token for a new access/refresh pair.
   */
  const { revoke, refresh } = useKlurigoServiceClient()

  /**
   * Navigation function from react-router for programmatic route changes.
   */
  const navigate = useNavigate()

  /**
   * Persisted store of decoded token payloads per TokenScope and TokenType.
   *
   * Backed by local storage under the `auth` key.
   */
  const [authState, setAuthState] = useLocalStorage<AuthState>('auth', {
    USER: undefined,
    GAME: undefined,
  })

  // Initialize synchronously so protected routes do not redirect before the
  // mount effect gets a chance to refresh a persisted User session.
  const [isUserRecoveryPending, setIsUserRecoveryPending] = useState(
    () =>
      !isValidToken(
        authState.USER?.ACCESS?.token,
        authState.USER?.ACCESS?.exp,
      ) &&
      isValidToken(
        authState.USER?.REFRESH?.token,
        authState.USER?.REFRESH?.exp,
      ),
  )

  /**
   * `true` if there is a valid access token in the User scope.
   */
  const isUserAuthenticated = useMemo(
    () =>
      isValidToken(authState.USER?.ACCESS?.token, authState.USER?.ACCESS?.exp),
    [authState.USER?.ACCESS?.token, authState.USER?.ACCESS?.exp],
  )

  /**
   * `true` if there is a valid access token in the Game scope.
   */
  const isGameAuthenticated = useMemo(
    () =>
      isValidToken(authState.GAME?.ACCESS?.token, authState.GAME?.ACCESS?.exp),
    [authState.GAME?.ACCESS?.token, authState.GAME?.ACCESS?.exp],
  )

  /**
   * Decodes a User-scope JWT into its typed payload.
   *
   * @param token - The raw JWT string to decode.
   * @returns The `ScopePayload<TokenScope.User>` containing sub, exp, authorities, and token.
   */
  const decodeUserScopeTokenPayload = useCallback(
    (token: string): ScopePayload<TokenScope.User> => {
      const { sub, exp, authorities } = jwtDecode<TokenDto>(token)
      return {
        sub,
        exp,
        authorities,
        token,
      }
    },
    [],
  )

  /**
   * Decodes a Game-scope JWT into its typed payload (including gameId and participantType).
   *
   * @param token - The raw JWT string to decode.
   * @returns The `ScopePayload<TokenScope.Game>` containing sub, exp, authorities, gameId, participantType, and token.
   */
  const decodeGameScopeTokenPayload = useCallback(
    (token: string): ScopePayload<TokenScope.Game> => {
      const { sub, exp, authorities, gameId, participantType } =
        jwtDecode<GameTokenDto>(token)
      return {
        sub,
        exp,
        authorities,
        token,
        gameId,
        participantType,
      }
    },
    [],
  )

  /**
   * Stores a new access/refresh token pair for the given scope.
   *
   * Decodes each token and updates authState.
   *
   * @param scope - The TokenScope to update (User or Game).
   * @param accessToken - The new access token string.
   * @param refreshToken - The new refresh token string.
   */
  const handleSetTokenPair = useCallback(
    (scope: TokenScope, accessToken: string, refreshToken: string) => {
      setAuthState((prevState) => {
        const modifiedAuthState = { ...prevState }
        if (scope === TokenScope.User) {
          modifiedAuthState.USER = {
            [TokenType.Access]: decodeUserScopeTokenPayload(accessToken),
            [TokenType.Refresh]: decodeUserScopeTokenPayload(refreshToken),
          }
        }
        if (scope === TokenScope.Game) {
          modifiedAuthState.GAME = {
            [TokenType.Access]: decodeGameScopeTokenPayload(accessToken),
            [TokenType.Refresh]: decodeGameScopeTokenPayload(refreshToken),
          }
        }
        return modifiedAuthState
      })
    },
    [setAuthState, decodeUserScopeTokenPayload, decodeGameScopeTokenPayload],
  )

  /**
   * Per-scope in-flight guard, cooldown tracking, and scheduled retry handle.
   *
   * This prevents:
   * - concurrent refresh calls per scope,
   * - rapid repeated attempts within the cooldown window, and
   * - multiple scheduled retries for the same scope at the same time.
   *
   * `retryTimeoutId` is cleared:
   * - when the scope becomes valid again,
   * - when the scope is cleared, and
   * - when the provider unmounts.
   */
  const refreshGuardsRef = useRef<
    Record<
      TokenScope,
      {
        isRefreshing: boolean
        lastAttemptAtMs: number
        retryTimeoutId: ReturnType<typeof setTimeout> | null
      }
    >
  >({
    [TokenScope.User]: {
      isRefreshing: false,
      lastAttemptAtMs: 0,
      retryTimeoutId: null,
    },
    [TokenScope.Game]: {
      isRefreshing: false,
      lastAttemptAtMs: 0,
      retryTimeoutId: null,
    },
  })

  /**
   * Clears all tokens for the specified TokenScope from authState.
   *
   * Also cancels any scheduled refresh retry for that scope.
   *
   * @param scope - The TokenScope to clear (User or Game).
   */
  const clearAuthState = useCallback(
    (scope: TokenScope) => {
      if (scope === TokenScope.User) setIsUserRecoveryPending(false)
      const guard = refreshGuardsRef.current[scope]
      if (guard.retryTimeoutId) {
        clearTimeout(guard.retryTimeoutId)
        guard.retryTimeoutId = null
      }

      setAuthState((prevState) => {
        const modifiedAuthState = { ...prevState }
        if (scope === TokenScope.User) {
          modifiedAuthState.USER = undefined
        }
        if (scope === TokenScope.Game) {
          modifiedAuthState.GAME = undefined
        }
        return modifiedAuthState
      })
    },
    [setAuthState],
  )

  /**
   * Revokes the authentication token for the given scope.
   *
   * If a token exists, it is revoked best-effort. When `redirectTo` is provided,
   * navigation is performed *before* clearing local auth state to ensure the
   * redirect is committed before any auth-guarded routes re-evaluate.
   *
   * If no token exists for the scope, local auth state is still cleared and
   * navigation (if requested) is still performed.
   *
   * @param scope - The TokenScope whose tokens should be revoked.
   * @param redirectTo - A route to navigate to before clearing local auth state.
   *   If omitted, no navigation is performed by this helper.
   */
  const revokeAuthToken = useCallback(
    async (scope: TokenScope, redirectTo?: string) => {
      const token =
        authState[scope]?.ACCESS.token || authState[scope]?.REFRESH.token

      if (token) {
        try {
          await revoke({ token }, scope)
        } catch {
          // swallow exception
        }
      }

      if (redirectTo && redirectTo.trim().length > 0) {
        const result = navigate(redirectTo, { replace: true, flushSync: true })
        if (result instanceof Promise) {
          await result
        }
      }

      clearAuthState(scope)
    },
    [authState, clearAuthState, revoke, navigate],
  )

  /**
   * Minimum delay between refresh attempts, in milliseconds.
   *
   * Used both to:
   * - throttle immediate consecutive refresh attempts, and
   * - schedule retry after transient failures.
   */
  const COOLDOWN_MS = 10_000 // avoid hammering on transient errors

  /**
   * Tracks whether the component is still mounted.
   * Used to avoid updating state after unmount in async flows.
   */
  const isMounted = useIsMounted()

  /**
   * Selects the stored token pair for a given TokenScope.
   *
   * @param scope - The scope whose auth state should be returned.
   * @returns The scoped token pair if present, otherwise `undefined`.
   */
  const getScopeState = useCallback(
    (scope: TokenScope) =>
      scope === TokenScope.User ? authState.USER : authState.GAME,
    [authState.USER, authState.GAME],
  )

  /**
   * Ensures persisted auth state remains valid by performing per-scope token maintenance.
   *
   * See the provider-level docs for the full algorithm.
   */
  useEffect(() => {
    if (!isMounted()) return

    const scheduleRetry = (scope: TokenScope) => {
      const guard = refreshGuardsRef.current[scope]

      if (guard.retryTimeoutId) return

      guard.retryTimeoutId = setTimeout(() => {
        guard.retryTimeoutId = null
        evaluateScope(scope)
      }, COOLDOWN_MS)
    }

    const cancelRetry = (scope: TokenScope) => {
      const guard = refreshGuardsRef.current[scope]
      if (!guard.retryTimeoutId) return
      clearTimeout(guard.retryTimeoutId)
      guard.retryTimeoutId = null
    }

    const evaluateScope = (scope: TokenScope) => {
      const scopeState = getScopeState(scope)
      if (!scopeState) {
        cancelRetry(scope)
        if (scope === TokenScope.User) setIsUserRecoveryPending(false)
        return
      }

      const accessToken = scopeState.ACCESS?.token
      const refreshToken = scopeState.REFRESH?.token

      const accessValid = isValidToken(accessToken, scopeState.ACCESS?.exp)
      if (accessValid) {
        cancelRetry(scope)
        if (scope === TokenScope.User) setIsUserRecoveryPending(false)
        return
      }

      const refreshValid = isValidToken(refreshToken, scopeState.REFRESH?.exp)
      if (!refreshValid) {
        cancelRetry(scope)
        if (scope === TokenScope.User) setIsUserRecoveryPending(false)
        clearAuthState(scope)
        return
      }
      if (!refreshToken) return

      const guard = refreshGuardsRef.current[scope]
      const nowMs = Date.now()
      const coolingDown = nowMs - guard.lastAttemptAtMs < COOLDOWN_MS

      if (guard.isRefreshing || coolingDown) return

      guard.isRefreshing = true
      guard.lastAttemptAtMs = nowMs
      if (scope === TokenScope.User) setIsUserRecoveryPending(true)

      refresh(scope, { refreshToken })
        .then((response) => {
          if (!isMounted()) return
          handleSetTokenPair(scope, response.accessToken, response.refreshToken)
          cancelRetry(scope)
        })
        .catch((error) => {
          if (error instanceof ApiError && error.status === 401) {
            cancelRetry(scope)
            clearAuthState(scope)
            return
          }

          scheduleRetry(scope)
          if (scope === TokenScope.User) setIsUserRecoveryPending(false)
        })
        .finally(() => {
          guard.isRefreshing = false
        })
    }

    evaluateScope(TokenScope.User)
    evaluateScope(TokenScope.Game)

    return () => {
      cancelRetry(TokenScope.User)
      cancelRetry(TokenScope.Game)
    }
  }, [isMounted, getScopeState, refresh, handleSetTokenPair, clearAuthState])

  /**
   * Revokes the Game-scope authentication state and optionally redirects the user.
   *
   * By default, revocation navigates to `/` before clearing local Game auth state.
   * Use `redirect: false` to revoke without navigation, or `redirectTo` to navigate
   * to a specific route.
   *
   * @param options - Controls post-revoke navigation behavior.
   * @returns A promise that resolves once any token revocation has completed,
   *   navigation (if requested) has been committed, and local auth state has been cleared.
   */
  const handleRevokeGame = useCallback(
    async (options?: RevokeGameOptions): Promise<void> => {
      if (!options) {
        return revokeAuthToken(TokenScope.Game, '/')
      }

      if ('redirectTo' in options) {
        return revokeAuthToken(TokenScope.Game, options.redirectTo)
      }

      return revokeAuthToken(
        TokenScope.Game,
        options.redirect === false ? undefined : '/',
      )
    },
    [revokeAuthToken],
  )

  /**
   * Memoized value for the `AuthContext`, containing the current authentication state
   * and update functions.
   */
  const value = useMemo<AuthContextType>(
    () => ({
      user: authState.USER,
      game: authState.GAME,
      isUserAuthenticated,
      isUserRecoveryPending,
      isGameAuthenticated,
      setTokenPair: handleSetTokenPair,
      revokeUser: () => revokeAuthToken(TokenScope.User, '/'),
      revokeGame: handleRevokeGame,
    }),
    [
      authState.USER,
      authState.GAME,
      isUserAuthenticated,
      isUserRecoveryPending,
      isGameAuthenticated,
      handleSetTokenPair,
      revokeAuthToken,
      handleRevokeGame,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export default AuthContextProvider
