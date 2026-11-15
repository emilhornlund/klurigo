import {
  Authority,
  AuthProvider,
  type CrittersAvatarConfigurationV1,
  DEFAULT_CRITTERS_AVATAR_V1,
  type GameDetailsDto,
  GameParticipantType,
  GameStatus,
  isCrittersAvatarConfigurationV1,
  type JoinGameRequestDto,
  type UserProfileResponseDto,
} from '@klurigo/common'
import type { Meta, StoryObj } from '@storybook/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { type FC, type ReactNode, useLayoutEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { withRouter } from 'storybook-addon-remix-react-router'

import { Page, Typography } from '../../components'
import { AuthContext } from '../../context/auth'
import { GameContext } from '../../context/game'
import { UserContext } from '../../context/user'
import type { CurrentUserProfile } from '../../context/user/UserContext'

import GameJoinPage from './GameJoinPage'
import styles from './GameJoinPage.stories.module.scss'

/** Isolated scenarios for reviewing preparation, saves, joins, and recovery. */
type JoinStoryScenario =
  | 'account'
  | 'guest'
  | 'loading'
  | 'preparation-failure'
  | 'save-failure'
  | 'join-failure'
  | 'account-changed'
  | 'accepted'

/** Creates fresh HTTP fixture state without reaching a development backend. */
function createJoinStoryFixtures(gameId: string, scenario: JoinStoryScenario) {
  const account = scenario !== 'guest' && scenario !== 'account-changed'
  const participantId =
    scenario === 'guest' ? 'storybook-guest' : 'storybook-account'
  const joiningAccountId = scenario === 'guest' ? null : participantId
  let profileAvatar: CrittersAvatarConfigurationV1 = DEFAULT_CRITTERS_AVATAR_V1
  let acceptedAvatar: CrittersAvatarConfigurationV1 = profileAvatar
  let acceptedNickname = 'QuizMaster'
  let failPreparation = scenario === 'preparation-failure'
  let failSave = scenario === 'save-failure'
  let failJoin = scenario === 'join-failure'
  let accepted = scenario === 'accepted'

  const profile = (): UserProfileResponseDto => ({
    id: participantId,
    email: 'storybook@example.com',
    defaultNickname: 'QuizMaster',
    authProvider: AuthProvider.Local,
    avatar: profileAvatar,
    created: new Date('2026-01-01T00:00:00Z'),
    updated: new Date('2026-01-01T00:00:00Z'),
  })

  const failure = (message: string) =>
    Response.json({ message }, { status: 503 })

  const fetch: typeof window.fetch = async (input, init) => {
    const url = new URL(
      input instanceof Request ? input.url : String(input),
      location.origin,
    )
    const method =
      init?.method ?? (input instanceof Request ? input.method : 'GET')

    if (url.pathname.endsWith(`/games/${gameId}`)) {
      if (scenario === 'loading') return new Promise<Response>(() => undefined)

      if (failPreparation) {
        failPreparation = false
        return failure('Avatar preparation is temporarily unavailable.')
      }

      return Response.json({
        id: gameId,
        status: GameStatus.Active,
        ...(accepted
          ? {
              participant: {
                id: participantId,
                type: GameParticipantType.PLAYER,
                nickname: acceptedNickname,
                avatar: acceptedAvatar,
              },
            }
          : { joiningAccountId }),
      } satisfies GameDetailsDto)
    }

    if (url.pathname.endsWith('/profile/user')) return Response.json(profile())

    if (url.pathname.endsWith('/profile/user/avatar') && method === 'PUT') {
      if (failSave) {
        failSave = false
        return failure('The profile save failed. Retry to save your draft.')
      }

      const design: unknown = JSON.parse(String(init?.body))

      if (!isCrittersAvatarConfigurationV1(design)) {
        return Response.json(
          { message: 'Invalid avatar metadata.' },
          { status: 400 },
        )
      }

      profileAvatar = design
      return Response.json(profileAvatar)
    }

    if (
      url.pathname.endsWith(`/games/${gameId}/players`) &&
      method === 'POST'
    ) {
      if (failJoin) {
        failJoin = false
        return failure('Joining failed. Retry with the saved design.')
      }

      const request = JSON.parse(String(init?.body)) as JoinGameRequestDto

      if (
        typeof request.nickname !== 'string' ||
        !isCrittersAvatarConfigurationV1(request.avatar)
      ) {
        return Response.json(
          { message: 'Invalid join metadata.' },
          { status: 400 },
        )
      }

      if (!accepted) {
        acceptedAvatar = request.avatar
        acceptedNickname = request.nickname
        accepted = true
      }
      return new Response(null, { status: 204 })
    }

    return Response.json(
      { message: 'No fixture for this request.' },
      { status: 404 },
    )
  }

  return { account, participantId, profile: profile(), fetch }
}

/** Story-specific identity and HTTP setup, installed before the page mounts. */
const JoinStoryProvider: FC<{
  /** Unique key for fixture and draft isolation between stories. */
  storyId: string
  /** Behavior exercised by this story. */
  scenario: JoinStoryScenario
  /** Page rendered after the fixtures are installed. */
  children: ReactNode
}> = ({ storyId, scenario, children }) => {
  const gameId = `storybook-${storyId}`
  const [fixtures] = useState(() => createJoinStoryFixtures(gameId, scenario))
  const [ready, setReady] = useState(false)
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: false } } }),
  )
  const [currentUser, setCurrentUser] = useState<
    CurrentUserProfile | undefined
  >(fixtures.account ? fixtures.profile : undefined)

  useLayoutEffect(() => {
    const original = window.fetch
    const key = `klurigo:join-avatar:${gameId}:${fixtures.participantId}:${fixtures.account ? fixtures.participantId : 'guest'}`
    const previousDraft = localStorage.getItem(key)

    localStorage.removeItem(key)

    if (scenario === 'save-failure' || scenario === 'join-failure') {
      localStorage.setItem(
        key,
        JSON.stringify({
          baseline: fixtures.profile.avatar,
          avatar: { ...fixtures.profile.avatar, top: null },
        }),
      )
    }

    window.fetch = fixtures.fetch
    setReady(true)

    return () => {
      if (window.fetch === fixtures.fetch) window.fetch = original

      if (previousDraft === null) localStorage.removeItem(key)
      else localStorage.setItem(key, previousDraft)
    }
  }, [fixtures, gameId, scenario])

  const token = {
    sub: fixtures.participantId,
    exp: 4102444800,
    authorities: [Authority.User, Authority.Game],
    token: `storybook.${btoa(JSON.stringify({ sub: fixtures.participantId, exp: 4102444800 }))}.signature`,
  }
  const gameToken = {
    ...token,
    authorities: [Authority.Game],
    gameId,
    participantType: GameParticipantType.PLAYER,
  }

  if (!ready) return null

  return (
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider
        value={{
          isUserAuthenticated: fixtures.account,
          isGameAuthenticated: true,
          user: fixtures.account
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
              participantId: fixtures.participantId,
              participantType: GameParticipantType.PLAYER,
              isFullscreenActive: false,
              toggleFullscreen: async () => undefined,
            }}>
            {children}
          </GameContext.Provider>
        </UserContext.Provider>
      </AuthContext.Provider>
    </QueryClientProvider>
  )
}

/** Keeps successful joins observable within the isolated story router. */
const JoinStory = () => {
  const { pathname } = useLocation()

  if (pathname === '/game') {
    return (
      <Page layout="contained" align="center">
        <Typography variant="title" color="inverse">
          You’re in!
        </Typography>
        <Typography variant="body" color="inverse">
          The join succeeded. Reload this story to try another design.
        </Typography>
      </Page>
    )
  }

  return <GameJoinPage />
}

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
      scenario={context.parameters.joinScenario ?? 'account'}>
      <JoinStory />
    </JoinStoryProvider>
  ),
} satisfies Meta<typeof GameJoinPage>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const NotAuthenticated: Story = { parameters: { joinScenario: 'guest' } }
export const PreparingAvatar: Story = {
  parameters: { joinScenario: 'loading' },
}
export const PreparationFailure: Story = {
  parameters: { joinScenario: 'preparation-failure' },
}
export const AccountSaveFailure: Story = {
  parameters: { joinScenario: 'save-failure' },
}
export const SavedButJoinFailed: Story = {
  parameters: { joinScenario: 'join-failure' },
}
export const AlreadyJoined: Story = { parameters: { joinScenario: 'accepted' } }
export const AccountChanged: Story = {
  parameters: { joinScenario: 'account-changed' },
}
