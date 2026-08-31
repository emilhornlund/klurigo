import type { FC } from 'react'

import { classNames } from '../../utils/helpers'
import StreakBadge from '../StreakBadge'

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

const getStreakBadgeStyle = (
  position: number,
): 'default' | 'gold' | 'silver' | 'bronze' => {
  if (position === 1) {
    return 'gold'
  }
  if (position === 2) {
    return 'silver'
  }
  if (position === 3) {
    return 'bronze'
  }
  return 'default'
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
    <div className={styles.leaderboard}>
      {displayedValues.map(
        ({ position, nickname, score, streaks, previousPosition }, index) => {
          const rowStyle = { '--row-index': index } as React.CSSProperties
          const isTopPosition = includePodium && position <= 3
          const isRankImprovement =
            !!previousPosition && previousPosition > position

          return (
            <div
              key={`${position}_${nickname}_${score}`}
              className={classNames(
                styles.row,
                includePodium ? getPodiumClassName(position) : undefined,
                isTopPosition ? styles.topPosition : undefined,
              )}
              style={rowStyle}>
              <div className={classNames(styles.column, styles.position)}>
                <span className={styles.badge}>{position}</span>
              </div>

              <div className={classNames(styles.column, styles.nickname)}>
                <span>{nickname}</span>
              </div>

              {previousPosition && previousPosition !== position && (
                <div
                  className={classNames(
                    styles.column,
                    styles.rankChange,
                    isRankImprovement ? styles.rankUp : styles.rankDown,
                  )}>
                  <span className={styles.rankChangeArrow}>
                    {isRankImprovement ? '↑' : '↓'}
                  </span>
                  <span className={styles.rankChangeAmount}>
                    {Math.abs(previousPosition - position)}
                  </span>
                </div>
              )}

              {showStreaks && !!streaks && (
                <span className={classNames(styles.column, styles.streaks)}>
                  <StreakBadge
                    streak={streaks}
                    style={getStreakBadgeStyle(position)}
                  />
                </span>
              )}

              <div className={classNames(styles.column, styles.score)}>
                {score}
              </div>
            </div>
          )
        },
      )}
    </div>
  )
}

export default Leaderboard
