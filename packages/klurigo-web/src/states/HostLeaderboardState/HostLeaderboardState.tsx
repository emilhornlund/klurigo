import { type GameLeaderboardHostEvent, GameMode } from '@klurigo/common'
import type { FC } from 'react'
import { useState } from 'react'

import { IconButtonArrowRight, Leaderboard, Typography } from '../../components'
import { useGameContext } from '../../context/game'
import { GamePage, HostGameFooter } from '../common'

export interface HostLeaderboardStateProps {
  event: GameLeaderboardHostEvent
}

const HostLeaderboardState: FC<HostLeaderboardStateProps> = ({
  event: {
    game: { mode, pin },
    leaderboard,
    pagination: { current: currentQuestion, total: totalQuestions },
  },
}) => {
  const [isInitiatingNextQuestion, setIsInitiatingNextQuestion] =
    useState<boolean>(false)

  const { completeTask } = useGameContext()

  const handleInitiateNextQuestion = () => {
    setIsInitiatingNextQuestion(true)
    completeTask?.().finally(() => setIsInitiatingNextQuestion(false))
  }

  return (
    <GamePage
      width="medium"
      align="center"
      header={
        <IconButtonArrowRight
          id="next-button"
          type="button"
          kind="call-to-action"
          size="small"
          value="Next"
          loading={isInitiatingNextQuestion}
          onClick={handleInitiateNextQuestion}
        />
      }
      footer={
        <HostGameFooter
          gamePIN={pin}
          currentQuestion={currentQuestion}
          totalQuestions={totalQuestions}
        />
      }>
      <Typography variant="title" align="center" color="inverse">
        Leaderboard
      </Typography>
      <Leaderboard
        values={leaderboard}
        showStreaks={mode === GameMode.Classic}
      />
    </GamePage>
  )
}

export default HostLeaderboardState
