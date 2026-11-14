import {
  type GameAvatarSnapshot,
  randomizeCrittersAvatar,
} from '@klurigo/common'
import type { FC, FormEvent } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useKlurigoServiceClient } from '../../api'
import {
  AvatarEditor,
  Button,
  CallToActionCard,
  IconButtonArrowLeft,
  IconButtonArrowRight,
  NicknameTextField,
  Page,
  PlayerAvatar,
  RotatingMessage,
  Stack,
  Typography,
} from '../../components'
import { useAuthContext } from '../../context/auth'
import { useGameContext } from '../../context/game'
import { useUserContext } from '../../context/user'

import { MESSAGES, TITLES } from './text.utils'
import { useGameJoinAvatar } from './use-game-join-avatar'

const GameJoinSession: FC = () => {
  const navigate = useNavigate()

  const { user, isUserAuthenticated, revokeGame } = useAuthContext()

  const { currentUser } = useUserContext()

  const { gameID } = useGameContext()

  const { joinGame } = useKlurigoServiceClient()
  const {
    avatar,
    setAvatar,
    canEdit,
    needsSave,
    hasSavedAccountDesign,
    commitAvatar,
    isLoading,
    error,
    retry,
  } = useGameJoinAvatar()
  const [editBaseline, setEditBaseline] = useState<GameAvatarSnapshot>()
  const [joinMessage, setJoinMessage] = useState<string>()
  const active = useRef(true)
  useEffect(() => {
    active.current = true
    return () => {
      active.current = false
    }
  }, [])

  const closeEditor = () => {
    setEditBaseline(undefined)
    requestAnimationFrame(() =>
      document.getElementById('customize-avatar')?.focus(),
    )
  }

  const handleAvatarChange = (next: GameAvatarSnapshot) => {
    setJoinMessage(undefined)
    setAvatar(next)
  }

  const [nickname, setNickname] = useState<string>(
    currentUser?.id === user?.ACCESS.sub
      ? currentUser?.defaultNickname || ''
      : '',
  )
  const [nicknameValid, setNicknameValid] = useState<boolean>(false)

  const [isJoiningGame, setIsJoiningGame] = useState(false)

  const handleBack = useCallback(() => {
    void revokeGame({ redirectTo: '/' })
  }, [revokeGame])

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()

    if (
      gameID &&
      nickname &&
      nicknameValid &&
      avatar &&
      !isLoading &&
      !error &&
      !isJoiningGame
    ) {
      setIsJoiningGame(true)
      setJoinMessage(undefined)
      const submit = async () => {
        let savedAccountDesign = hasSavedAccountDesign
        let joining = false
        try {
          const chosen = needsSave ? await commitAvatar() : avatar
          if (!active.current) return
          savedAccountDesign ||= needsSave
          joining = true
          await joinGame(gameID, nickname, chosen)
          if (active.current) navigate('/game')
        } catch {
          if (active.current)
            setJoinMessage(
              !joining
                ? 'We couldn’t save your account avatar. Your design is still here. Retry joining to save it first.'
                : savedAccountDesign
                  ? 'Your account avatar was saved, but joining failed. Your design is ready to retry; it won’t be saved again.'
                  : 'Joining failed. Your design is still here. Please retry.',
            )
        } finally {
          if (active.current) setIsJoiningGame(false)
        }
      }
      void submit()
    }
  }

  return (
    <Page
      layout="contained"
      align="center"
      header={
        <IconButtonArrowLeft
          id="back-button"
          type="button"
          variant="primary"
          intent="accent"
          size="small"
          value="Back"
          onClick={handleBack}
        />
      }
      hideLogin>
      <RotatingMessage
        messages={TITLES}
        renderMessage={(title) => (
          <Typography
            variant="title"
            width="medium"
            align="center"
            color="inverse">
            {title}
          </Typography>
        )}
      />

      <RotatingMessage
        messages={MESSAGES}
        renderMessage={(message) => (
          <Typography
            variant="body"
            width="small"
            align="center"
            color="inverse">
            {message}
          </Typography>
        )}
      />

      {editBaseline && avatar ? (
        <Stack width="full" align="center">
          <AvatarEditor value={avatar} onChange={handleAvatarChange} />
          <Typography variant="body2" color="inverse" align="center">
            {isUserAuthenticated
              ? 'Your changes are saved to your account when you join.'
              : 'This design is for this game. No account is needed.'}
          </Typography>
          <Stack width="content" spacing="compact">
            <Button
              id="use-join-avatar"
              type="button"
              intent="accent"
              onClick={closeEditor}>
              Use design
            </Button>
            <Button
              id="randomize-join-avatar"
              type="button"
              variant="outline"
              onClick={() => handleAvatarChange(randomizeCrittersAvatar())}>
              Randomize
            </Button>
            <Button
              id="discard-join-avatar"
              type="button"
              variant="plain"
              onClick={() => {
                handleAvatarChange(editBaseline)
                closeEditor()
              }}>
              Discard changes
            </Button>
          </Stack>
        </Stack>
      ) : (
        <Stack
          as="form"
          width="content"
          data-testid="join-form"
          aria-label="Join game"
          name="join-game-form"
          onSubmit={handleSubmit}>
          <Stack align="center" spacing="compact">
            <Typography variant="title3" color="inverse" align="center">
              Your game avatar
            </Typography>
            {avatar && (
              <PlayerAvatar avatar={avatar} alt="Your game avatar preview" />
            )}
            {canEdit !== false && avatar && !isLoading && !error && (
              <Button
                id="customize-avatar"
                type="button"
                variant="outline"
                disabled={isJoiningGame}
                onClick={() => setEditBaseline(avatar)}>
                Customize avatar
              </Button>
            )}
            {isLoading && (
              <Typography variant="body" color="inverse">
                Preparing your avatar…
              </Typography>
            )}
            {needsSave && (
              <Typography variant="body2" color="inverse" align="center">
                Your updated design will be saved to your account when you join.
              </Typography>
            )}
            {joinMessage && (
              <Typography variant="body2" color="inverse" role="alert">
                {joinMessage}
              </Typography>
            )}
            {error && (
              <Typography variant="body" color="inverse" role="alert">
                {error}
              </Typography>
            )}
            {error && (
              <Button
                id="retry-avatar"
                type="button"
                value="Retry"
                onClick={retry}
              />
            )}
          </Stack>
          <NicknameTextField
            value={nickname}
            placeholder="Nickname"
            disabled={isJoiningGame}
            onChange={setNickname}
            onValid={setNicknameValid}
          />
          <IconButtonArrowRight
            id="join"
            type="submit"
            variant="primary"
            intent="accent"
            value="OK, Go!"
            loading={isJoiningGame}
            disabled={!nicknameValid || isLoading || !!error || !avatar}
          />
        </Stack>
      )}
      {!isUserAuthenticated && (
        <CallToActionCard
          title="Make every game count"
          text="Anonymous play doesn’t keep history. Login to track stats, build quizzes, and host your own live games."
          onClick={() => navigate('/auth/login')}
        />
      )}
    </Page>
  )
}

const GameJoinPage: FC = () => {
  const { gameID, participantId } = useGameContext()
  const { user, isUserAuthenticated } = useAuthContext()
  return (
    <GameJoinSession
      key={`${gameID}:${participantId}:${isUserAuthenticated ? user?.ACCESS.sub : 'guest'}`}
    />
  )
}

export default GameJoinPage
