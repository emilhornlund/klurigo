import { faClockRotateLeft } from '@fortawesome/free-solid-svg-icons'
import type { QuizRecentGameDto } from '@klurigo/common'
import type { FC } from 'react'

import { Accordion, Typography } from '../../../../../../components'
import {
  DATE_FORMATS,
  formatLocalDate,
  formatTimeAgo,
} from '../../../../../../utils/date.utils'

import styles from './RecentGames.module.scss'

/** Displays read-only aggregate activity for the quiz's latest completed games. */
const RecentGames: FC<{ games?: readonly QuizRecentGameDto[] }> = ({
  games,
}) => {
  if (!games?.length) {
    return null
  }

  return (
    <Accordion
      title="Recent games"
      icon={faClockRotateLeft}
      description={`Last played ${formatTimeAgo(games[0].completed).toLowerCase()}`}>
      <ol className={styles.list} role="list">
        {games.map(
          (
            {
              completed,
              playerCount,
              correctnessPercentage,
              averagePrecisionPercentage,
            },
            index,
          ) => {
            const percentage =
              correctnessPercentage ?? averagePrecisionPercentage
            const isCorrectness = correctnessPercentage !== undefined

            return (
              <li key={`${completed}-${index}`} className={styles.item}>
                <Typography asChild variant="control" bold noOpacity>
                  <time
                    dateTime={completed}
                    title={`Completed ${formatLocalDate(completed, DATE_FORMATS.DATE_TIME_SECONDS)}`}>
                    {formatTimeAgo(completed)}
                  </time>
                </Typography>
                <div className={styles.players}>
                  <Typography variant="control2" color="subtle" noOpacity>
                    {playerCount} {playerCount === 1 ? 'player' : 'players'}
                  </Typography>
                </div>
                {percentage !== undefined && (
                  <div className={styles.metric}>
                    <progress
                      className={styles.bar}
                      value={percentage}
                      max={100}
                      aria-label={
                        isCorrectness ? 'Correct answers' : 'Average precision'
                      }
                    />
                    <Typography
                      asChild
                      variant="control2"
                      align="right"
                      bold
                      noOpacity>
                      <span aria-hidden="true">
                        {percentage}% {isCorrectness ? 'correct' : 'precision'}
                      </span>
                    </Typography>
                  </div>
                )}
              </li>
            )
          },
        )}
      </ol>
    </Accordion>
  )
}

export default RecentGames
