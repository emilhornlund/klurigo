import { TokenScope } from '@klurigo/common'
import { createContext } from 'react'

import type { AuthState } from '../../models'

/**
 * Options for revoking the game authentication state.
 *
 * Use `redirectTo` when you want to revoke and immediately navigate to a specific route.
 * Use `redirect: false` when you want to revoke without navigation.
 * If no options are provided, the default behavior is to navigate to `/`.
 */
export type RevokeGameOptions =
  | {
      /**
       * Whether to navigate to `/` after revoking and clearing local auth state.
       *
       * Defaults to `true`.
       */
      redirect?: boolean
    }
  | {
      /**
       * A route to navigate to after revoking and clearing local auth state.
       *
       * When provided, this takes precedence over `redirect`.
       */
      redirectTo: string
    }

/**
 * AuthContextType defines the shape of authentication-related data
 * and actions available throughout the app.
 *
 * @property user                Decoded token payloads for the User scope.
 * @property game                Decoded token payloads for the Game scope.
 * @property isUserAuthenticated Indicates if the User scope has valid tokens.
 * @property isGameAuthenticated Indicates if the Game scope has valid tokens.
 * @property setTokenPair        Function to store new tokens for a given scope.
 * @property revokeUser          Function to revoke User-scope tokens.
 * @property revokeGame          Function to revoke Game-scope tokens.
 */
export type AuthContextType = {
  user?: AuthState[TokenScope.User]
  game?: AuthState[TokenScope.Game]
  isUserAuthenticated: boolean
  isUserRecoveryPending?: boolean
  isGameAuthenticated: boolean
  setTokenPair: (
    scope: TokenScope,
    accessToken: string,
    refreshToken: string,
  ) => void
  revokeUser: () => Promise<void>
  revokeGame: (options?: RevokeGameOptions) => Promise<void>
}

/**
 * React context providing authentication state (tokens + flags)
 * and actions (setTokenPair, revokeUser/Game).
 */
export const AuthContext = createContext<AuthContextType>({
  user: undefined,
  game: undefined,
  isUserAuthenticated: false,
  isUserRecoveryPending: false,
  isGameAuthenticated: false,
  setTokenPair: () => undefined,
  revokeUser: () => Promise.reject(),
  revokeGame: () => Promise.reject(),
})
