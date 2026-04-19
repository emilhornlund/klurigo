import type { GamePodiumHostEvent } from '@klurigo/common'
import { type FC, useCallback } from 'react'

import {
  IconButtonArrowLeft,
  IconButtonArrowRight,
  Leaderboard,
  Podium,
  Typography,
} from '../../components'
import { useAuthContext } from '../../context/auth'
import { useGameContext } from '../../context/game'
import { GamePage } from '../common'

export interface HostPodiumStateProps {
  event: GamePodiumHostEvent
}

const HostPodiumState: FC<HostPodiumStateProps> = ({
  event: { game, leaderboard },
}) => {
  const { gameID } = useGameContext()

  const { revokeGame } = useAuthContext()

  const handleBackToHome = useCallback(() => {
    void revokeGame({ redirectTo: '/' })
  }, [revokeGame])

  const handleViewFullResults = useCallback(() => {
    void revokeGame({ redirectTo: `/game/results/${gameID}` })
  }, [revokeGame, gameID])

  return (
    <GamePage
      width="medium"
      align="center"
      header={
        <IconButtonArrowLeft
          id="home-button"
          type="button"
          kind="call-to-action"
          size="small"
          onClick={handleBackToHome}>
          Back to Home
        </IconButtonArrowLeft>
      }>
      <Typography variant="title" align="center" color="inverse">
        {game.name}
      </Typography>

      <Podium values={leaderboard} />

      <Leaderboard values={leaderboard} includePodium={false} />

      <IconButtonArrowRight
        id="game-results-button"
        type="button"
        onClick={handleViewFullResults}>
        View Full Results
      </IconButtonArrowRight>
    </GamePage>
  )
}

export default HostPodiumState
