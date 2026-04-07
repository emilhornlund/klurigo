import type { GameLobbyPlayerEvent } from '@klurigo/common'
import type { FC } from 'react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import HourglassIcon from '../../assets/images/hourglass-icon.svg'
import {
  ConfirmDialog,
  IconButtonArrowLeft,
  NicknameChip,
  PageProminentIcon,
  RotatingMessage,
  Typography,
} from '../../components'
import { useAuthContext } from '../../context/auth'
import { useGameContext } from '../../context/game'
import { GamePage } from '../common'

import { MESSAGES } from './message.utils'

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
  },
}) => {
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
        header={
          <IconButtonArrowLeft
            id="leave-game-button"
            type="button"
            kind="call-to-action"
            size="small"
            value="Leave"
            loading={isLeavingGame}
            onClick={() => setShowConfirmLeaveGameDialog(true)}
          />
        }>
        <PageProminentIcon src={HourglassIcon} alt="Hourglass" />

        <NicknameChip value={nickname} />

        <Typography variant="title" width="medium">
          You’re in the waiting room
        </Typography>

        <RotatingMessage
          messages={MESSAGES}
          renderMessage={(message) => (
            <Typography variant="text" width="small">
              {message}
            </Typography>
          )}
        />
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
