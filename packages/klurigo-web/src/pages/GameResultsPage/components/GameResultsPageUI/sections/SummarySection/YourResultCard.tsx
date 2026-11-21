import { faArrowTrendUp, faFire } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  GameMode,
  type GameResultClassicModePlayerMetricDto,
  type GameResultDto,
  type GameResultZeroToOneHundredModePlayerMetricDto,
} from '@klurigo/common'
import { type FC, useId } from 'react'

import { PlayerAvatar, Surface, Typography } from '../../../../../../components'
import { classNames } from '../../../../../../utils/helpers'
import { getAveragePrecision } from '../../utils'

import styles from './SummarySection.module.scss'

const ResultStat: FC<{ label: string; value: string | number }> = ({
  label,
  value,
}) => (
  <div>
    <Typography asChild variant="control2" color="inverse" align="center">
      <dt>{label}</dt>
    </Typography>
    <Typography
      asChild
      variant="title3"
      color="inverse"
      align="center"
      noOpacity>
      <dd>{value}</dd>
    </Typography>
  </div>
)

const YourResultCard: FC<{
  mode: GameMode
  metric: GameResultDto['playerMetrics'][number]
}> = ({ mode, metric }) => {
  const headingId = useId()
  const { player, rank, score, comebackRankGain } = metric

  let performanceLabel: string
  let performance: string
  let longestCorrectStreak = 0
  if (mode === GameMode.Classic) {
    const classic = metric as GameResultClassicModePlayerMetricDto
    const { correct, incorrect, unanswered } = classic
    performanceLabel = 'Correct answers'
    performance = `${correct} of ${correct + incorrect + unanswered}`
    longestCorrectStreak = classic.longestCorrectStreak
  } else {
    const precision = getAveragePrecision(
      metric as GameResultZeroToOneHundredModePlayerMetricDto,
    )
    performanceLabel = 'Average precision'
    performance = `${precision}%`
  }

  const hasStreak = longestCorrectStreak >= 2
  const hasComeback = comebackRankGain > 0

  return (
    <Surface
      as="section"
      aria-labelledby={headingId}
      className={classNames(styles.card, styles.full, styles.yourResult)}>
      <div className={styles.resultOverview}>
        <div className={styles.resultIdentity}>
          <PlayerAvatar avatar={player.avatar} alt="" size={44} />
          <div className={styles.resultName}>
            <Typography
              asChild
              variant="title3"
              color="inverse"
              id={headingId}
              noOpacity>
              <h2>Your result</h2>
            </Typography>
            <Typography
              variant="control"
              color="inverse"
              truncate
              title={player.nickname}>
              {player.nickname}
            </Typography>
          </div>
        </div>
        <dl className={styles.resultStats}>
          <ResultStat label="Finished" value={`#${rank}`} />
          <ResultStat label="Final score" value={score} />
          <ResultStat label={performanceLabel} value={performance} />
        </dl>
      </div>
      {(hasStreak || hasComeback) && (
        <ul
          className={styles.resultAchievements}
          role="list"
          aria-label="Achievements">
          {hasStreak && (
            <Typography asChild variant="control" color="inverse">
              <li>
                <FontAwesomeIcon icon={faFire} aria-hidden />
                <span>
                  Longest correct streak: {longestCorrectStreak} answers
                </span>
              </li>
            </Typography>
          )}
          {hasComeback && (
            <Typography asChild variant="control" color="inverse">
              <li>
                <FontAwesomeIcon icon={faArrowTrendUp} aria-hidden />
                <span>{`Recovered ${comebackRankGain} ${comebackRankGain === 1 ? 'place' : 'places'} from your lowest position`}</span>
              </li>
            </Typography>
          )}
        </ul>
      )}
    </Surface>
  )
}

export default YourResultCard
