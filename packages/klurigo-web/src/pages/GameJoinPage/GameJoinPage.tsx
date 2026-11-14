import {
  type GameAvatarSnapshot,
  randomizeCrittersAvatar,
} from '@klurigo/common'
import type { FC, FormEvent } from 'react'
import { useCallback, useState } from 'react'
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
  const { avatar, setAvatar, isLoading, error, retry } = useGameJoinAvatar()
  const [editBaseline, setEditBaseline] = useState<GameAvatarSnapshot>()

  const closeEditor = () => {
    setEditBaseline(undefined)
    requestAnimationFrame(() =>
      document.getElementById('customize-avatar')?.focus(),
    )
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
      joinGame(gameID, nickname, avatar)
        .then(() => navigate(`/game`))
        .catch(() => undefined)
        .finally(() => setIsJoiningGame(false))
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
          <AvatarEditor value={avatar} onChange={setAvatar} />
          <Typography variant="body2" color="inverse" align="center">
            This design is for this game. No account is needed.
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
              onClick={() => setAvatar(randomizeCrittersAvatar())}>
              Randomize
            </Button>
            <Button
              id="discard-join-avatar"
              type="button"
              variant="plain"
              onClick={() => {
                setAvatar(editBaseline)
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
            {!isUserAuthenticated && avatar && !isLoading && !error && (
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
