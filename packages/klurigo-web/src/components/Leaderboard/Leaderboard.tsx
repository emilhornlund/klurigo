import type { FC } from 'react'

import { classNames } from '../../utils/helpers'
import Stack from '../Stack'
import StreakBadge from '../StreakBadge'
import Surface from '../Surface'

import styles from './Leaderboard.module.scss'

const getPodiumClassName = (position: number): string | null => {
  if (position === 1) {
    return styles.gold
  }
  if (position === 2) {
    return styles.silver
  }
  if (position === 3) {
    return styles.bronze
  }
  return null
}

export type LeaderboardValue = {
  position: number
  nickname: string
  score: number
  streaks?: number
  previousPosition?: number
}

export type LeaderboardProps = {
  values: LeaderboardValue[]
  includePodium?: boolean
  showStreaks?: boolean
}

const Leaderboard: FC<LeaderboardProps> = ({
  values,
  includePodium = true,
  showStreaks = true,
}) => {
  const displayedValues = includePodium
    ? values.slice(0, 5)
    : values.length >= 3
      ? values.slice(3, 5)
      : []

  return (
    <Stack width="full">
      {displayedValues.map(
        ({ position, nickname, score, streaks, previousPosition }, index) => {
          const rowStyle = { '--row-index': index } as React.CSSProperties
          const isTopPosition = includePodium && position <= 3
          const isRankImprovement =
            !!previousPosition && previousPosition > position
          const hasPreviousPosition =
            previousPosition !== undefined && previousPosition > 0
          const rankChange = hasPreviousPosition
            ? Math.abs(previousPosition - position)
            : 0
          const rankChangeLabel = rankChange
            ? `${isRankImprovement ? 'Up' : 'Down'} ${rankChange} ${rankChange === 1 ? 'place' : 'places'}, from rank ${previousPosition}`
            : 'Rank unchanged'

          return (
            <Surface
              // Nicknames are unique within a game; scores and ranks can change.
              key={nickname}
              className={classNames(
                styles.row,
                includePodium ? getPodiumClassName(position) : undefined,
                isTopPosition ? styles.topPosition : undefined,
              )}
              data-testid="leaderboard-row"
              style={rowStyle}>
              <Surface className={classNames(styles.column, styles.position)}>
                {position}
              </Surface>

              <div className={classNames(styles.column, styles.nickname)}>
                <span>{nickname}</span>
              </div>

              {hasPreviousPosition && (
                <div
                  role="img"
                  aria-label={rankChangeLabel}
                  className={classNames(
                    styles.column,
                    styles.rankChange,
                    rankChange === 0
                      ? styles.rankUnchanged
                      : isRankImprovement
                        ? styles.rankUp
                        : styles.rankDown,
                  )}>
                  <span className={styles.rankChangeArrow} aria-hidden="true">
                    {rankChange === 0 ? '–' : isRankImprovement ? '↑' : '↓'}
                  </span>
                  {rankChange > 0 && (
                    <span
                      className={styles.rankChangeAmount}
                      aria-hidden="true">
                      {rankChange}
                    </span>
                  )}
                </div>
              )}

              {showStreaks && !!streaks && (
                <span className={classNames(styles.column, styles.streaks)}>
                  <StreakBadge streak={streaks} />
                </span>
              )}

              <div className={styles.column}>
                <Surface className={styles.score}>{score}</Surface>
              </div>
            </Surface>
          )
        },
      )}
    </Stack>
  )
}

export default Leaderboard
