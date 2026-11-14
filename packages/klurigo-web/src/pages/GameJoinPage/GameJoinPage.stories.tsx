import {
  Authority,
  AuthProvider,
  DEFAULT_CRITTERS_AVATAR_V1,
  GameParticipantType,
  GameStatus,
} from '@klurigo/common'
import type { Decorator, Meta, StoryObj } from '@storybook/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useLayoutEffect, useMemo, useState } from 'react'
import { withRouter } from 'storybook-addon-remix-react-router'

import { AuthContext } from '../../context/auth'
import { GameContext } from '../../context/game'
import { UserContext } from '../../context/user'

import GameJoinPage from './GameJoinPage'

/** Story-local identities and HTTP fixtures keep the join flow independent of a backend. */
const WithJoinContext: Decorator = (Story, context) => {
  const account = context.name !== 'NotAuthenticated'
  const gameID = `storybook-${context.id}`
  const participantId = account ? 'storybook-account' : 'storybook-guest'
  const [fixtureScope, setFixtureScope] = useState<string>()
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: false } } }),
  )
  const profile = useMemo(
    () => ({
      id: participantId,
      email: 'storybook@example.com',
      defaultNickname: 'QuizMaster',
      authProvider: AuthProvider.Local,
      avatar: DEFAULT_CRITTERS_AVATAR_V1,
    }),
    [participantId],
  )
  useLayoutEffect(() => {
    const original = window.fetch
    const fixtureFetch: typeof fetch = async (input, init) => {
      const url = input instanceof Request ? input.url : String(input)
      const method =
        init?.method ?? (input instanceof Request ? input.method : 'GET')
      if (url.endsWith(`/games/${gameID}`))
        return Response.json({ id: gameID, status: GameStatus.Active })
      if (url.endsWith('/profile/user')) return Response.json(profile)
      if (url.endsWith('/profile/user/avatar') && method === 'PUT')
        return new Response(String(init?.body), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      if (url.endsWith(`/games/${gameID}/players`) && method === 'POST')
        return new Response(null, { status: 204 })
      return original(input, init)
    }
    window.fetch = fixtureFetch
    setFixtureScope(gameID)
    return () => {
      if (window.fetch === fixtureFetch) window.fetch = original
    }
  }, [gameID, profile])
  const token = {
    sub: participantId,
    exp: 4102444800,
    authorities: [Authority.User, Authority.Game],
    token: 'storybook-token',
  }
  return fixtureScope === gameID ? (
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider
        value={{
          isUserAuthenticated: account,
          isGameAuthenticated: true,
          user: account ? { ACCESS: token, REFRESH: token } : undefined,
          setTokenPair: () => undefined,
          revokeUser: async () => undefined,
          revokeGame: async () => undefined,
        }}>
        <UserContext.Provider
          value={{
            currentUser: account ? profile : undefined,
            setCurrentUser: () => undefined,
            fetchCurrentUser: async () => undefined,
            clearCurrentUser: () => undefined,
          }}>
          <GameContext.Provider
            value={{
              gameID,
              participantId,
              participantType: GameParticipantType.PLAYER,
              isFullscreenActive: false,
              toggleFullscreen: async () => undefined,
            }}>
            <Story />
          </GameContext.Provider>
        </UserContext.Provider>
      </AuthContext.Provider>
    </QueryClientProvider>
  ) : (
    <></>
  )
}

const meta = {
  component: GameJoinPage,
  decorators: [withRouter, WithJoinContext],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof GameJoinPage>

export default meta
type Story = StoryObj<typeof meta>

export const Default = {
  args: {},
} satisfies Story

export const NotAuthenticated = {
  args: {},
} satisfies Story
