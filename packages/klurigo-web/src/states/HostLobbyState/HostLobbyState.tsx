import { faGear, faUserGroup } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import type { GameLobbyHostEvent } from '@klurigo/common'
import { GAME_MAX_PLAYERS } from '@klurigo/common'
import type { FC } from 'react'
import { useEffect, useRef, useState } from 'react'
import QRCode from 'react-qr-code'

import {
  Button,
  ConfirmDialog,
  IconButtonArrowRight,
  NicknameChip,
  Typography,
} from '../../components'
import config from '../../config'
import { useGameContext } from '../../context/game'
import { classNames, extractUrl } from '../../utils/helpers'
import GamePage from '../common/GamePage'

import GameSettingsModal from './components/GameSettingsModal'
import styles from './HostLobbyState.module.scss'

export interface HostLobbyStateProps {
  event: GameLobbyHostEvent
}

interface PlayerAnimationState {
  [playerId: string]: {
    animationState: 'entrance' | 'exit' | 'shake' | 'none'
    staggerDelay: number
  }
}

const HostLobbyState: FC<HostLobbyStateProps> = ({
  event: {
    game: { id, pin, settings },
    players,
  },
}) => {
  const [showConfirmStartGameDialog, setShowConfirmStartGameDialog] =
    useState(false)
  const [isStartingGame, setIsStartingGame] = useState<boolean>(false)

  const [playerToRemove, setPlayerToRemove] = useState<{
    id: string
    nickname: string
  }>()
  const [isRemovingPlayer, setIsRemovingPlayer] = useState<boolean>(false)

  const [showGameSettingsModal, setShowGameSettingsModal] =
    useState<boolean>(false)

  // Animation state management
  const [playerAnimations, setPlayerAnimations] =
    useState<PlayerAnimationState>({})
  const prevPlayersRef = useRef<string[]>([])

  const { gameID, completeTask, leaveGame } = useGameContext()

  // Handle player join/leave animations
  useEffect(() => {
    const currentPlayerIds = players.map((p) => p.id)
    const previousPlayerIds = prevPlayersRef.current

    // Find new players (joined)
    const newPlayers = currentPlayerIds.filter(
      (id) => !previousPlayerIds.includes(id),
    )

    // Find removed players (left)
    const removedPlayers = previousPlayerIds.filter(
      (id) => !currentPlayerIds.includes(id),
    )

    // Update animation states
    const newAnimations: PlayerAnimationState = {}

    // Add entrance animations for new players with stagger
    newPlayers.forEach((playerId, index) => {
      newAnimations[playerId] = {
        animationState: 'entrance',
        staggerDelay: index * 100, // 100ms stagger
      }
    })

    // Add exit animations for removed players
    removedPlayers.forEach((playerId) => {
      newAnimations[playerId] = {
        animationState: 'exit',
        staggerDelay: 0,
      }
    })

    // Keep existing players with no animation
    currentPlayerIds.forEach((playerId) => {
      if (!newAnimations[playerId]) {
        newAnimations[playerId] = {
          animationState: 'none',
          staggerDelay: 0,
        }
      }
    })

    setPlayerAnimations(newAnimations)
    prevPlayersRef.current = currentPlayerIds
  }, [players])

  const handleStartGame = () => {
    setIsStartingGame(true)
    completeTask?.().finally(() => setIsStartingGame(false))
  }

  const handleRemovePlayer = () => {
    if (!playerToRemove) return

    // Add shake animation before removal
    setPlayerAnimations((prev) => ({
      ...prev,
      [playerToRemove.id]: {
        animationState: 'shake',
        staggerDelay: 0,
      },
    }))

    // Wait for shake animation to complete before actual removal
    setTimeout(() => {
      setPlayerToRemove(undefined)
      setIsRemovingPlayer(true)
      if (gameID) {
        leaveGame?.(playerToRemove.id).finally(() => setIsRemovingPlayer(false))
      }
    }, 500) // Match shake animation duration
  }

  const handleRemovePlayerClick = (playerId: string, nickname: string) => {
    setPlayerToRemove({ id: playerId, nickname })
  }

  return (
    <>
      <GamePage
        width="medium"
        height="full"
        header={
          <IconButtonArrowRight
            id="start-game-button"
            type="button"
            kind="call-to-action"
            size="small"
            value="Start"
            loading={isStartingGame}
            onClick={() =>
              !players.length
                ? setShowConfirmStartGameDialog(true)
                : handleStartGame()
            }
          />
        }>
        <div className={styles.header}>
          <div className={classNames(styles.box, styles.info)}>
            <Typography variant="body2" align="left" color="default" noOpacity>
              Join at
            </Typography>{' '}
            <Typography
              variant="body2"
              align="left"
              color="default"
              noOpacity
              bold>
              {extractUrl(config.baseUrl, { omitProtocol: true })}
            </Typography>
          </div>
          <div className={classNames(styles.box, styles.pin)}>
            <Typography variant="body2" align="left" color="default" noOpacity>
              Game PIN
            </Typography>
            <Typography variant="title" align="left" color="default" noOpacity>
              {pin}
            </Typography>
          </div>
          <div
            className={classNames(styles.box, styles.qr, styles.qrContainer)}>
            <QRCode value={`${config.baseUrl}/auth/game?id=${id}`} />
            <div className={styles.qrScanLine} />
          </div>
        </div>

        <div className={styles.misc}>
          <div className={styles.item} />

          <div className={styles.item}>
            <div className={styles.playerCounter}>
              <FontAwesomeIcon
                icon={faUserGroup}
                className={styles.playerIcon}
              />
              <span className={styles.playerCount}>
                {players.length} / {GAME_MAX_PLAYERS}
              </span>
            </div>
          </div>

          <div className={styles.item}>
            <Button
              id="game-settings-button"
              type="button"
              size="small"
              hideValue="mobile"
              icon={faGear}
              onClick={() => setShowGameSettingsModal(true)}>
              Settings
            </Button>
          </div>
        </div>

        <div className={styles.content}>
          <div className={styles.players}>
            {players.map(({ id, nickname }) => (
              <NicknameChip
                key={id}
                value={nickname}
                onDelete={() => handleRemovePlayerClick(id, nickname)}
                animationState={playerAnimations[id]?.animationState || 'none'}
                staggerDelay={playerAnimations[id]?.staggerDelay || 0}
              />
            ))}
          </div>
        </div>
      </GamePage>
      <ConfirmDialog
        title="Confirm Remove Player"
        message={`Are you sure you want to remove ${playerToRemove?.nickname} from the game? Once removed, they will need to rejoin to participate again.`}
        open={!!playerToRemove}
        confirmTitle="Remove Player"
        loading={isRemovingPlayer}
        onConfirm={handleRemovePlayer}
        onClose={() => setPlayerToRemove(undefined)}
        destructive
      />
      <ConfirmDialog
        title="Start Game Without Players?"
        message="There are no players in the game. Are you sure you want to start the game anyway?"
        open={showConfirmStartGameDialog}
        confirmTitle="Start Game"
        onConfirm={handleStartGame}
        onClose={() => setShowConfirmStartGameDialog(false)}
      />
      <GameSettingsModal
        randomizeQuestionOrder={settings.randomizeQuestionOrder}
        randomizeAnswerOrder={settings.randomizeAnswerOrder}
        open={showGameSettingsModal}
        onClose={() => setShowGameSettingsModal(false)}
      />
    </>
  )
}

export default HostLobbyState
