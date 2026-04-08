import { faCheck, faXmark } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { GameMode, type GameResultPlayerEvent } from '@klurigo/common'
import type { FC } from 'react'
import { useEffect, useMemo, useState } from 'react'

import ScoreChip, {
  Badge,
  Confetti,
  getBadgePositionBackgroundColor,
  getCelebrationLevel,
  StreakBadge,
  Typography,
} from '../../components'
import { getBadgePositionTextColor } from '../../components/Badge/badge-utils'
import { classNames } from '../../utils/helpers'
import { GamePage, PlayerGameFooter, PointsBehindIndicator } from '../common'

import { getPositionMessage } from './message.utils'
import styles from './PlayerResultState.module.scss'

export interface PlayerResultStateProps {
  event: GameResultPlayerEvent
}

const PlayerResultState: FC<PlayerResultStateProps> = ({
  event: {
    game: { mode },
    player: {
      nickname,
      score: { correct, last: lastScore, total: totalScore, position, streak },
      behind,
    },
    pagination: { current: currentQuestion, total: totalQuestions },
  },
}) => {
  const [showPosition, setShowPosition] = useState(false)

  useEffect(() => {
    if (mode === GameMode.ZeroToOneHundred) {
      setShowPosition(true)
    } else {
      const timer = setTimeout(() => {
        setShowPosition(true)
      }, 8000)
      return () => clearTimeout(timer)
    }
  }, [mode])

  const message = useMemo(
    () => getPositionMessage(position, correct),
    [position, correct],
  )

  const celebrationLevel = useMemo(
    () => getCelebrationLevel(position, streak, correct),
    [correct, streak, position],
  )

  return (
    <GamePage
      footer={
        <PlayerGameFooter
          currentQuestion={currentQuestion}
          totalQuestions={totalQuestions}
          nickname={nickname}
          totalScore={totalScore}
        />
      }>
      <div
        className={classNames(
          styles.contentContainer,
          showPosition ? styles.shrink : undefined,
        )}>
        {mode === GameMode.Classic && (
          <div
            className={classNames(
              styles.correctnessBatch,
              showPosition ? styles.slideOutLeft : undefined,
            )}>
            <Typography variant="title">
              {correct ? 'Correct' : 'Incorrect'}
            </Typography>

            <Badge
              size="large"
              backgroundColor={correct ? 'green' : 'red'}
              celebration={correct ? celebrationLevel : 'none'}>
              <FontAwesomeIcon icon={correct ? faCheck : faXmark} />
            </Badge>
          </div>
        )}

        <div
          className={classNames(
            styles.positionBatch,
            showPosition ? styles.slideInRight : styles.hidden,
          )}>
          <Badge
            size="large"
            backgroundColor={getBadgePositionBackgroundColor(position)}
            textColor={getBadgePositionTextColor(position)}>
            {position}
          </Badge>
        </div>
      </div>

      <StreakBadge streak={streak}>Streak</StreakBadge>

      <ScoreChip value={lastScore} />

      <Typography variant="body" width="small">
        {message}
      </Typography>

      {behind && <PointsBehindIndicator {...behind} />}

      {celebrationLevel !== 'none' && (
        <Confetti trigger={true} intensity={celebrationLevel} />
      )}
    </GamePage>
  )
}

export default PlayerResultState
