import { TokenScope, TokenType } from '@klurigo/common'
import { useCallback, useRef } from 'react'

import { useAuthContext } from '../context/auth'
import { useUserContext } from '../context/user'
import { notifyError, notifySuccess } from '../utils/notification'

import { createApiClientCore } from './api-client-core'
import {
  createAuthResource,
  createGameResource,
  createMediaResource,
  createQuizResource,
  createUserResource,
} from './resources'

/**
 * React hook that exposes the Klurigo service API surface used by the UI.
 *
 * This hook wires together:
 * - token access from `useAuthContext`
 * - current-user hydration from `useUserContext`
 * - request execution via `createApiClientCore`
 * - domain-specific resources (auth/quiz/game/media/user)
 *
 * The returned functions are stable wrappers around the underlying resources.
 *
 * @returns An object containing the composed API functions.
 */
export const useKlurigoServiceClient = () => {
  const {
    user: userAuth,
    game: gameAuth,
    setTokenPair,
    revokeUser,
    revokeGame,
  } = useAuthContext()

  const { fetchCurrentUser, clearCurrentUser } = useUserContext()

  /**
   * Resolves the current access/refresh token for the requested scope.
   *
   * @param scope - Token scope (User/Game).
   * @param type - Token type (Access/Refresh).
   * @returns The token string if present; otherwise `undefined`.
   */
  const getToken = useCallback(
    (
      scope: TokenScope,
      type: TokenType.Access | TokenType.Refresh,
    ): string | undefined => {
      switch (scope) {
        case TokenScope.User:
          return userAuth?.[type]?.token
        case TokenScope.Game:
          return gameAuth?.[type]?.token
      }
    },
    [userAuth, gameAuth],
  )

  const getTokenRef = useRef(getToken)
  getTokenRef.current = getToken

  const automaticRefreshFailureRef = useRef<
    | {
        scope: TokenScope
        refreshToken: string
      }
    | undefined
  >(undefined)

  const notifyResourceError = useCallback((message: string) => {
    const failure = automaticRefreshFailureRef.current
    if (
      failure &&
      getTokenRef.current(failure.scope, TokenType.Refresh) ===
        failure.refreshToken
    ) {
      return
    }

    automaticRefreshFailureRef.current = undefined
    notifyError(message)
  }, [])

  const api = createApiClientCore({
    getToken,
    setTokenPair,
    fetchCurrentUser,
    notifyRefreshFailure: (scope) => {
      const refreshToken = getTokenRef.current(scope, TokenType.Refresh)
      if (refreshToken) {
        automaticRefreshFailureRef.current = { scope, refreshToken }
      }

      const message =
        'Your session needed a refresh… and it didn’t go as planned. Please try again.'
      const recover = scope === TokenScope.User ? revokeUser() : revokeGame()
      void recover.finally(() => {
        const currentRefreshToken = getTokenRef.current(
          scope,
          TokenType.Refresh,
        )
        if (currentRefreshToken && currentRefreshToken !== refreshToken) return
        notifyError(message)
      })
    },
  })

  const auth = createAuthResource(api, {
    getToken,
    setTokenPair,
    fetchCurrentUser,
    clearCurrentUser,
    notifySuccess,
    notifyError: notifyResourceError,
  })

  const quiz = createQuizResource(api, {
    notifySuccess,
    notifyError: notifyResourceError,
  })

  const game = createGameResource(api, {
    notifySuccess,
    notifyError: notifyResourceError,
  })

  const media = createMediaResource(api, {
    getToken,
    notifySuccess,
    notifyError: notifyResourceError,
  })

  const user = createUserResource(api, {
    notifySuccess,
    notifyError: notifyResourceError,
  })

  return {
    ...auth,
    ...quiz,
    ...game,
    ...media,
    ...user,
  }
}
