import type { FC, FormEvent } from 'react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useKlurigoServiceClient } from '../../api'
import UsersIcon from '../../assets/images/users-icon.svg'
import {
  CallToActionCard,
  IconButtonArrowLeft,
  IconButtonArrowRight,
  NicknameTextField,
  Page,
  PageProminentIcon,
  RotatingMessage,
  Typography,
} from '../../components'
import { useAuthContext } from '../../context/auth'
import { useGameContext } from '../../context/game'
import { useUserContext } from '../../context/user'

import styles from './GameJoinPage.module.scss'
import { MESSAGES, TITLES } from './text.utils'

const GameJoinPage: FC = () => {
  const navigate = useNavigate()

  const { isUserAuthenticated } = useAuthContext()

  const { currentUser } = useUserContext()

  const { gameID } = useGameContext()

  const { joinGame } = useKlurigoServiceClient()

  const [nickname, setNickname] = useState<string>(
    currentUser?.defaultNickname || '',
  )
  const [nicknameValid, setNicknameValid] = useState<boolean>(false)

  const [isJoiningGame, setIsJoiningGame] = useState(false)

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()

    if (gameID && nickname && nicknameValid) {
      setIsJoiningGame(true)
      joinGame(gameID, nickname)
        .then(() => navigate(`/game`))
        .finally(() => setIsJoiningGame(false))
    }
  }

  return (
    <Page
      align="center"
      header={
        <IconButtonArrowLeft
          id="back-button"
          type="button"
          kind="call-to-action"
          size="small"
          value="Back"
          onClick={() => navigate(-1)}
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

      <form
        data-testid="join-form"
        name="join-game-form"
        className={styles.joinForm}
        onSubmit={handleSubmit}>
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
          kind="call-to-action"
          value="OK, Go!"
          loading={isJoiningGame}
          disabled={!nicknameValid}
        />
      </form>
    </Page>
  )
}

export default GameJoinPage
