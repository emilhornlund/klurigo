import { faPen } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  DEFAULT_CRITTERS_AVATAR_V1,
  randomizeCrittersAvatar,
  resolveGameAvatarSnapshot,
} from '@klurigo/common'
import type { FC, FormEvent } from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useIsMounted, useLocalStorage } from 'usehooks-ts'

import { useKlurigoServiceClient } from '../../api'
import UsersIcon from '../../assets/images/users-icon.svg'
import {
  CallToActionCard,
  IconButtonArrowLeft,
  IconButtonArrowRight,
  NicknameTextField,
  Page,
  PageProminentIcon,
  PlayerAvatar,
  RotatingMessage,
  Stack,
  Typography,
} from '../../components'
import { useAuthContext } from '../../context/auth'
import { useGameContext } from '../../context/game'
import { useUserContext } from '../../context/user'

import { JoinAvatarDialog } from './components'
import styles from './GameJoinPage.module.scss'
import { MESSAGES, TITLES } from './text.utils'

/** Submits the nickname and previewed design for one mounted game/account scope. */
const GameJoinPageContent: FC<{ readonly storageKey: string }> = ({
  storageKey,
}) => {
  const navigate = useNavigate()
  const { user, isUserAuthenticated, revokeGame } = useAuthContext()
  const { currentUser, setCurrentUser } = useUserContext()
  const { gameID, participantId } = useGameContext()
  const { getGame, joinGame } = useKlurigoServiceClient()
  const isMounted = useIsMounted()
  const savedAvatar =
    currentUser?.id === user?.ACCESS.sub ? currentUser?.avatar : undefined
  const initialAvatar = useMemo(
    () =>
      !storageKey
        ? DEFAULT_CRITTERS_AVATAR_V1
        : isUserAuthenticated
          ? resolveGameAvatarSnapshot(savedAvatar)
          : randomizeCrittersAvatar(),
    [storageKey, isUserAuthenticated, savedAvatar],
  )
  const [avatar, setAvatar] = useLocalStorage(storageKey, initialAvatar, {
    deserializer: (stored) => resolveGameAvatarSnapshot(JSON.parse(stored)),
  })
  const [editing, setEditing] = useState(false)
  const [nickname, setNickname] = useState(currentUser?.defaultNickname || '')
  const [nicknameValid, setNicknameValid] = useState(false)
  const [isJoiningGame, setIsJoiningGame] = useState(false)

  // An accepted participant resumes the game; this does not prepare or block the draft.
  useEffect(() => {
    if (!gameID) return
    let cancelled = false
    void getGame(gameID)
      .then(({ participant }) => {
        if (!cancelled && participant) navigate('/game', { replace: true })
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [gameID, participantId, getGame, navigate])

  // Persist the initial guest proposal as well as applied edits, including reloads.
  useEffect(() => {
    if (!storageKey) return
    try {
      localStorage.setItem(storageKey, JSON.stringify(avatar))
    } catch {
      // Blocked storage does not prevent joining with the in-memory design.
    }
  }, [storageKey, avatar])

  const handleBack = useCallback(() => {
    void revokeGame({ redirectTo: '/' })
  }, [revokeGame])

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()

    if (gameID && nickname && nicknameValid && !isJoiningGame) {
      setIsJoiningGame(true)
      joinGame(gameID, nickname, avatar)
        .then(() => {
          if (!isMounted()) return
          setCurrentUser((previous) =>
            previous && previous.id === participantId
              ? { ...previous, defaultNickname: nickname, avatar }
              : previous,
          )
          navigate('/game')
        })
        .catch(() => undefined)
        .finally(() => {
          if (isMounted()) setIsJoiningGame(false)
        })
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
      <PageProminentIcon src={UsersIcon} alt="Users" />
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
      {!isUserAuthenticated && (
        <CallToActionCard
          title="Make every game count"
          text="Anonymous play doesn’t keep history. Login to track stats, build quizzes, and host your own live games."
          onClick={() => navigate('/auth/login')}
        />
      )}
      <Stack
        as="form"
        width="content"
        data-testid="join-form"
        aria-label="Join game"
        name="join-game-form"
        onSubmit={handleSubmit}>
        <Stack align="center" spacing="compact">
          <button
            id="customize-avatar"
            type="button"
            aria-label="Customize avatar"
            className={styles.avatarButton}
            disabled={isJoiningGame}
            onClick={() => setEditing(true)}>
            <PlayerAvatar
              avatar={avatar}
              size={192}
              alt="Your game avatar preview"
              className={styles.avatar}
            />
            <span className={styles.editIcon} aria-hidden="true">
              <FontAwesomeIcon icon={faPen} />
            </span>
          </button>
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
          disabled={!nicknameValid}
        />
      </Stack>
      {editing && (
        <JoinAvatarDialog
          avatar={avatar}
          onClose={() => setEditing(false)}
          onApply={(design) => {
            setAvatar(design)
            setEditing(false)
          }}
        />
      )}
    </Page>
  )
}

/** Scope changes discard transient UI state and invalidate old async responses. */
const GameJoinPage: FC = () => {
  const { user } = useAuthContext()
  const { gameID, participantId } = useGameContext()
  const storageKey =
    gameID && participantId
      ? `klurigo:join-avatar:${gameID}:${participantId}:${user?.ACCESS.sub ?? 'guest'}`
      : ''

  return <GameJoinPageContent key={storageKey} storageKey={storageKey} />
}

export default GameJoinPage
