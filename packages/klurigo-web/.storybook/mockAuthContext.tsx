import {
  Authority,
  AuthProvider,
  DEFAULT_CRITTERS_AVATAR_V1,
  GameParticipantType,
} from '@klurigo/common'
import type { Decorator } from '@storybook/react'
import { type FC, type ReactNode, useContext } from 'react'

import type { AuthContextType } from '../src/context/auth'
import { AuthContext } from '../src/context/auth'
import { UserContext } from '../src/context/user'

const mockToken = `storybook.${btoa(JSON.stringify({ sub: 'MOCK', exp: 4102444800 }))}.signature`

/**
 * Storybook decorator supplying a mock AuthContext with dummy tokens
 * and authentication flags for rendering components in isolation.
 */
const mockAuth: AuthContextType = {
  user: {
    ACCESS: {
      sub: 'MOCK',
      exp: 4102444800,
      authorities: [
        Authority.Game,
        Authority.User,
        Authority.Quiz,
        Authority.Media,
      ],
      token: mockToken,
    },
    REFRESH: {
      sub: 'MOCK',
      exp: 4102444800,
      authorities: [Authority.RefreshAuth],
      token: mockToken,
    },
  },
  game: {
    ACCESS: {
      sub: 'MOCK',
      exp: 4102444800,
      authorities: [Authority.Game],
      token: mockToken,
      gameId: 'MOCK',
      participantType: GameParticipantType.HOST,
    },
    REFRESH: {
      sub: 'MOCK',
      exp: 4102444800,
      authorities: [Authority.RefreshAuth],
      token: mockToken,
      gameId: 'MOCK',
      participantType: GameParticipantType.HOST,
    },
  },
  isUserAuthenticated: true,
  isGameAuthenticated: true,
  setTokenPair: () => undefined,
  revokeUser: () => Promise.reject(),
  revokeGame: () => Promise.reject(),
}

/**
 * Supplies isolated authentication and confirmed profile state without hydration requests.
 */
const MockAuthProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const userContext = useContext(UserContext)
  const value = userContext.currentUser
    ? userContext
    : {
        ...userContext,
        currentUser: {
          id: 'MOCK',
          email: 'storybook@example.com',
          defaultNickname: 'Storybook player',
          authProvider: AuthProvider.Local,
          avatar: DEFAULT_CRITTERS_AVATAR_V1,
        },
      }

  return (
    <AuthContext.Provider value={mockAuth}>
      <UserContext.Provider value={value}>{children}</UserContext.Provider>
    </AuthContext.Provider>
  )
}

/** Wraps a story with mock credentials while preserving a story-specific user context. */
export const withMockAuth: Decorator = (Story, context) => (
  <MockAuthProvider>
    <Story {...context.args} />
  </MockAuthProvider>
)
