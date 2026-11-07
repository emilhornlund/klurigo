import { faCircleCheck } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import type { GameLobbyPlayerEvent } from '@klurigo/common'
import type { FC } from 'react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import HourglassIcon from '../../assets/images/hourglass-icon.svg'
import {
  ConfirmDialog,
  IconButtonArrowLeft,
  NicknameChip,
  RotatingMessage,
  Stack,
  Surface,
  Typography,
} from '../../components'
import { useAuthContext } from '../../context/auth'
import { useGameContext } from '../../context/game'
import { GamePage } from '../common'

import { MESSAGES } from './message.utils'
import styles from './PlayerLobbyState.module.scss'

/**
 * Props for the `PlayerLobbyState` component.
 *
 * `event` contains the data required to render the player lobby view, including
 * the player's nickname.
 */
export interface PlayerLobbyStateProps {
  /**
   * The lobby event payload for the current player.
   */
  event: GameLobbyPlayerEvent
}

/**
 * Player lobby view shown while waiting for the game to start.
 *
 * Responsibilities:
 * - Displays the player's nickname and a waiting-room title.
 * - Shows a rotating set of lobby messages to keep the screen lively.
 * - Allows the player to leave the game via a confirmation dialog.
 * - Calls `leaveGame` using the authenticated participant id and navigates to `/` on completion.
 */
const PlayerLobbyState: FC<PlayerLobbyStateProps> = ({
  event: {
    player: { nickname },
    game: { name: quizTitle },
    players,
  },
}) => {
  const playerCount = players.length
  const navigate = useNavigate()

  const [showConfirmLeaveGameDialog, setShowConfirmLeaveGameDialog] =
    useState<boolean>(false)
  const [isLeavingGame, setIsLeavingGame] = useState<boolean>(false)

  const { game } = useAuthContext()
  const { gameID, leaveGame } = useGameContext()

  const handleLeaveGame = () => {
    setShowConfirmLeaveGameDialog(false)
    const participantId = game?.ACCESS.sub
    if (gameID && participantId) {
      setIsLeavingGame(true)
      leaveGame?.(participantId).finally(() => {
        setIsLeavingGame(false)
        navigate('/')
      })
    }
  }

  return (
    <>
      <GamePage
        layout="contained"
        header={
          <IconButtonArrowLeft
            id="leave-game-button"
            type="button"
            variant="primary"
            intent="accent"
            size="small"
            value="Leave"
            loading={isLeavingGame}
            onClick={() => setShowConfirmLeaveGameDialog(true)}
          />
        }>
        <Stack
          as="section"
          width="full"
          align="center"
          spacing="page"
          className={styles.lobby}
          aria-label="Player waiting room">
          <Stack align="center" spacing="stack">
            <FontAwesomeIcon
              icon={faCircleCheck}
              className={styles.successIcon}
              aria-hidden="true"
            />
            <Typography
              variant="title"
              width="medium"
              align="center"
              color="inverse">
              You’re in!
            </Typography>
          </Stack>
          <Stack align="center" spacing="stack">
            <Typography variant="body" align="center" color="inverse">
              Welcome,
            </Typography>
            <NicknameChip value={nickname} />
          </Stack>
          <Surface className={styles.quizCard}>
            <Stack align="center" spacing="compact">
              <Typography variant="body2" align="center" color="inverseSubtle">
                YOU’RE PLAYING
              </Typography>
              <Typography
                variant="title2"
                width="medium"
                align="center"
                color="inverse">
                {quizTitle}
              </Typography>
            </Stack>
          </Surface>
          <Stack
            direction="horizontal"
            align="center"
            justify="center"
            width="full"
            spacing="compact"
            className={styles.playerCount}
            aria-live="polite"
            aria-atomic="true">
            <Typography
              variant="title3"
              align="center"
              color="inverse"
              className={styles.count}
              key={playerCount}>
              {playerCount}
            </Typography>
            <Typography
              variant="body"
              align="center"
              color="inverse"
              className={styles.playerLabel}>
              {playerCount === 1
                ? 'player is in the game'
                : 'players are in the game'}
            </Typography>
          </Stack>
          <Stack align="center" spacing="stack">
            <img className={styles.hourglass} src={HourglassIcon} alt="" />
            <Typography
              variant="title3"
              width="medium"
              align="center"
              color="inverse">
              Waiting for the host to start…
            </Typography>
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
          </Stack>
        </Stack>
      </GamePage>
      <ConfirmDialog
        title="Confirm Leave Game"
        message="Are you sure you want to leave the game? Once you leave, you will need to rejoin to participate again."
        open={showConfirmLeaveGameDialog}
        confirmTitle="Leave Game"
        onConfirm={handleLeaveGame}
        onClose={() => setShowConfirmLeaveGameDialog(false)}
        destructive
      />
    </>
  )
}

export default PlayerLobbyState
