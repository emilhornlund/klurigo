import type {
  CrittersAvatarConfigurationV1,
  UserProfileResponseDto,
} from '@klurigo/common'
import { createContext, type Dispatch, type SetStateAction } from 'react'

/** Account-scoped snapshot used by navigation; never contains the full profile. */
export type CurrentUserProfile = Pick<
  UserProfileResponseDto,
  'id' | 'email' | 'unverifiedEmail' | 'defaultNickname' | 'authProvider'
> & {
  /** Undefined identifies a legacy snapshot; null records a confirmed missing avatar. */
  readonly avatar?: CrittersAvatarConfigurationV1 | null
}

/**
 * The shape of the user context.
 *
 * @property currentUser - A minimal snapshot of the authenticated user's profile,
 *                         or `undefined` when no user is loaded.
 * @property setCurrentUser - Sets/replaces the current user snapshot.
 * @property fetchCurrentUser - Fetches and stores the current user snapshot using an access token.
 * @property clearCurrentUser - Clears the stored user snapshot.
 */
export type UserContextType = {
  currentUser?: CurrentUserProfile
  setCurrentUser: Dispatch<SetStateAction<CurrentUserProfile | undefined>>
  fetchCurrentUser: (accessToken: string) => Promise<void>
  clearCurrentUser: () => void
}

/**
 * React context for managing the current user profile.
 *
 * The default value provides no-ops and `undefined` for `currentUser`. Use
 * `<UserContextProvider>` to supply a real implementation.
 */
export const UserContext = createContext<UserContextType>({
  currentUser: undefined,
  setCurrentUser: () => undefined,
  fetchCurrentUser: () => Promise.reject(),
  clearCurrentUser: () => undefined,
})
