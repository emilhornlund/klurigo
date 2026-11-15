import {
  Authority,
  AuthProvider,
  DEFAULT_CRITTERS_AVATAR_V1,
  GameParticipantType,
  GameStatus,
} from '@klurigo/common'
import type { Meta, StoryObj } from '@storybook/react'
import { type FC, type ReactNode, useLayoutEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { toast, ToastContainer } from 'react-toastify'
import { expect, userEvent, waitFor, within } from 'storybook/test'
import { withRouter } from 'storybook-addon-remix-react-router'

import { Page, Typography } from '../../components'
import { AuthContext } from '../../context/auth'
import { GameContext } from '../../context/game'
import { UserContext } from '../../context/user'
import type { CurrentUserProfile } from '../../context/user/UserContext'

import GameJoinPage from './GameJoinPage'
import styles from './GameJoinPage.stories.module.scss'

/** Isolates the existing game join request and cached account identity for each story. */
const JoinStoryProvider: FC<{
  /** Unique game/draft scope for this story. */
  storyId: string
  /** Whether the player has an authenticated account. */
  account: boolean
  /** Makes the first join fail so the normal retry behavior can be inspected. */
  failJoin: boolean
  /** Page rendered after the HTTP fixture is installed. */
  children: ReactNode
}> = ({ storyId, account, failJoin, children }) => {
  const gameId = `storybook-${storyId}`
  const participantId = account ? 'storybook-account' : 'storybook-guest'
  const [currentUser, setCurrentUser] = useState<
    CurrentUserProfile | undefined
  >(
    account
      ? {
          id: participantId,
          email: 'storybook@example.com',
          defaultNickname: 'QuizMaster',
          authProvider: AuthProvider.Local,
          avatar: { ...DEFAULT_CRITTERS_AVATAR_V1, body: 'block', top: null },
        }
      : undefined,
  )
  const [ready, setReady] = useState(false)

  useLayoutEffect(() => {
    const original = window.fetch
    const key = `klurigo:join-avatar:${gameId}:${participantId}:${account ? participantId : 'guest'}`
    const previous = localStorage.getItem(key)
    localStorage.removeItem(key)
    let rejectNextJoin = failJoin
    const fetch: typeof window.fetch = async (input, init) => {
      const url = new URL(
        input instanceof Request ? input.url : String(input),
        location.origin,
      )
      if (url.pathname.endsWith(`/games/${gameId}`))
        return Response.json({ id: gameId, status: GameStatus.Active })
      if (
        url.pathname.endsWith(`/games/${gameId}/players`) &&
        init?.method === 'POST'
      ) {
        if (rejectNextJoin) {
          rejectNextJoin = false
          return Response.json(
            {
              message: 'Joining is temporarily unavailable. Please try again.',
            },
            { status: 503 },
          )
        }
        return new Response(null, { status: 204 })
      }
      return original(input, init)
    }
    window.fetch = fetch
    setReady(true)
    return () => {
      if (window.fetch === fetch) window.fetch = original
      if (previous === null) localStorage.removeItem(key)
      else localStorage.setItem(key, previous)
    }
  }, [gameId, participantId, account, failJoin])

  const token = {
    sub: participantId,
    exp: 4102444800,
    authorities: [Authority.User, Authority.Game],
    token: `storybook.${btoa(JSON.stringify({ sub: participantId, exp: 4102444800 }))}.signature`,
  }
  const gameToken = {
    ...token,
    authorities: [Authority.Game],
    gameId,
    participantType: GameParticipantType.PLAYER,
  }

  if (!ready) return null

  return (
    <AuthContext.Provider
      value={{
        isUserAuthenticated: account,
        isGameAuthenticated: true,
        user: account
          ? {
              ACCESS: token,
              REFRESH: { ...token, authorities: [Authority.RefreshAuth] },
            }
          : undefined,
        game: {
          ACCESS: gameToken,
          REFRESH: { ...gameToken, authorities: [Authority.RefreshAuth] },
        },
        setTokenPair: () => undefined,
        revokeUser: async () => undefined,
        revokeGame: async () => undefined,
      }}>
      <UserContext.Provider
        value={{
          currentUser,
          setCurrentUser,
          fetchCurrentUser: async () => undefined,
          clearCurrentUser: () => setCurrentUser(undefined),
        }}>
        <GameContext.Provider
          value={{
            gameID: gameId,
            participantId,
            participantType: GameParticipantType.PLAYER,
            isFullscreenActive: false,
            toggleFullscreen: async () => undefined,
          }}>
          {children}
          <ToastContainer autoClose={false} />
        </GameContext.Provider>
      </UserContext.Provider>
    </AuthContext.Provider>
  )
}

/** Keeps successful navigation observable inside the isolated story router. */
const JoinStory = () =>
  useLocation().pathname === '/game' ? (
    <Page layout="contained" align="center">
      <Typography variant="title" color="inverse">
        You’re in!
      </Typography>
    </Page>
  ) : (
    <GameJoinPage />
  )

const meta = {
  component: GameJoinPage,
  decorators: [
    withRouter,
    (Story) => (
      <div className={styles.viewport}>
        <Story />
      </div>
    ),
  ],
  parameters: { layout: 'fullscreen' },
  render: (_, context) => (
    <JoinStoryProvider
      key={context.id}
      storyId={context.id}
      account={context.parameters.account !== false}
      failJoin={context.parameters.failJoin === true}>
      <JoinStory />
    </JoinStoryProvider>
  ),
} satisfies Meta<typeof GameJoinPage>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const NotAuthenticated: Story = { parameters: { account: false } }
export const JoinFailure: Story = {
  parameters: { failJoin: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('button', { name: 'OK, Go!' }))
    const alert = await within(document.body).findByRole('alert')
    toast.update(alert.id, { autoClose: false })
    await waitFor(() =>
      expect(within(document.body).getByRole('alert')).toBeVisible(),
    )
    await expect(canvas.getByPlaceholderText('Nickname')).toBeEnabled()
  },
}
