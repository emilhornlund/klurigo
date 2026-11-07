import { faCheck, faXmark } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { GameMode, type GameResultPlayerEvent } from '@klurigo/common'
import type { FC } from 'react'
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'

import {
  Badge,
  Confetti,
  getBadgePositionBackgroundColor,
  getCelebrationLevel,
  ScoreChip,
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

const reducedMotionQuery = '(prefers-reduced-motion: reduce)'
const subscribeToMotion = (onChange: () => void) => {
  const query = window.matchMedia?.(reducedMotionQuery)
  query?.addEventListener('change', onChange)
  return () => query?.removeEventListener('change', onChange)
}
const getReducedMotion = () =>
  window.matchMedia?.(reducedMotionQuery).matches ?? false

type RevealPhase = 'correctness' | 'points' | 'ranking'

// A new question (or mode) starts a fresh presentation, including child effects.
const PlayerResultState: FC<PlayerResultStateProps> = ({ event }) => (
  <PlayerResultPresentation
    key={`${event.game.mode}-${event.pagination.current}`}
    event={event}
  />
)

const PlayerResultPresentation: FC<PlayerResultStateProps> = ({ event }) => {
  const { mode } = event.game
  const { nickname, score, behind } = event.player
  const { correct, last: lastScore, total: totalScore, position } = score
  const partiallyCorrect =
    mode === GameMode.Classic && !correct && lastScore > 0
  const streak =
    mode === GameMode.Classic && 'streak' in score ? score.streak : undefined
  const { current: currentQuestion, total: totalQuestions } = event.pagination
  const reducedMotion = useSyncExternalStore(
    subscribeToMotion,
    getReducedMotion,
    () => false,
  )
  const [phase, setPhase] = useState<RevealPhase>('correctness')
  const immediate = reducedMotion || mode === GameMode.ZeroToOneHundred
  const showPoints = immediate || phase !== 'correctness'
  const showPosition = immediate || phase === 'ranking'

  useEffect(() => {
    if (immediate || phase === 'ranking') return

    const timer = setTimeout(
      () => setPhase(phase === 'correctness' ? 'points' : 'ranking'),
      phase === 'correctness' ? 600 : 1200,
    )
    return () => clearTimeout(timer)
  }, [immediate, phase])

  const message = useMemo(
    () =>
      getPositionMessage(
        position,
        correct
          ? 'correct'
          : partiallyCorrect
            ? 'partially-correct'
            : 'incorrect',
      ),
    [position, correct, partiallyCorrect],
  )

  const celebrationLevel = useMemo(
    () => getCelebrationLevel(position, streak, correct),
    [correct, streak, position],
  )

  return (
    <GamePage
      layout="contained"
      disableContentFadeAnimation
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
              showPosition && !reducedMotion ? styles.slideOutLeft : undefined,
            )}
            aria-hidden={showPosition && !reducedMotion}>
            <Typography variant="title" align="center" color="inverse">
              {correct
                ? 'Correct'
                : partiallyCorrect
                  ? 'Partially correct'
                  : 'Incorrect'}
            </Typography>

            <Badge
              size="large"
              backgroundColor={
                correct ? 'green' : partiallyCorrect ? 'orange' : 'red'
              }
              celebration={
                correct && !reducedMotion ? celebrationLevel : 'none'
              }>
              <FontAwesomeIcon
                icon={correct || partiallyCorrect ? faCheck : faXmark}
              />
            </Badge>
          </div>
        )}

        <div
          className={classNames(
            styles.positionBatch,
            showPosition ? styles.slideInRight : styles.hidden,
          )}
          role="img"
          aria-hidden={!showPosition}
          aria-label={`Current ranking: ${position}`}>
          <Badge
            size="large"
            backgroundColor={getBadgePositionBackgroundColor(position)}
            textColor={getBadgePositionTextColor(position)}>
            {position}
          </Badge>
        </div>
      </div>

      <div
        className={classNames(
          styles.pointsReveal,
          showPoints ? styles.revealed : undefined,
          showPoints && lastScore > 0 && mode === GameMode.Classic
            ? styles.pointsReward
            : undefined,
        )}
        aria-hidden={!showPoints}>
        {mode === GameMode.Classic && (
          <StreakBadge streak={streak}>Streak</StreakBadge>
        )}
        <ScoreChip value={lastScore} />
      </div>

      <div
        className={classNames(
          styles.rankingDetails,
          showPosition ? styles.revealed : undefined,
        )}
        aria-hidden={!showPosition}>
        <Typography variant="body" width="small" align="center" color="inverse">
          {message}
        </Typography>
        {behind && <PointsBehindIndicator {...behind} />}
      </div>

      {celebrationLevel !== 'none' && !reducedMotion && (
        <Confetti trigger={true} intensity={celebrationLevel} />
      )}
    </GamePage>
  )
}

export default PlayerResultState
