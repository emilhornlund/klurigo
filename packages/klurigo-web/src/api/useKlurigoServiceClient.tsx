import { TokenScope, TokenType } from '@klurigo/common'
import { useCallback } from 'react'

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
  const { user: userAuth, game: gameAuth, setTokenPair } = useAuthContext()

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

  const api = createApiClientCore({
    getToken,
    setTokenPair,
    fetchCurrentUser,
  })

  const auth = createAuthResource(api, {
    setTokenPair,
    fetchCurrentUser,
    clearCurrentUser,
    notifySuccess,
    notifyError,
  })

  const quiz = createQuizResource(api, {
    notifySuccess,
    notifyError,
  })

  const game = createGameResource(api, {
    notifySuccess,
    notifyError,
  })

  const media = createMediaResource(api, {
    getToken,
    notifySuccess,
    notifyError,
  })

  const user = createUserResource(api, {
    notifySuccess,
    notifyError,
  })

  return {
    ...auth,
    ...quiz,
    ...game,
    ...media,
    ...user,
  }
}
