import type { FC, ReactNode } from 'react'

import Badge from '../Badge'

import styles from './StreakBadge.module.scss'

export type StreakBadgeStyle = 'default' | 'gold' | 'silver' | 'bronze'

export interface StreakBadgeProps {
  streak?: number
  style?: StreakBadgeStyle
  children?: ReactNode | ReactNode[]
}

const StreakBadge: FC<StreakBadgeProps> = ({ streak, children }) => {
  if (!streak || streak < 2) return null
  return (
    <div className={styles.streakBadge}>
      {children}
      <Badge
        size="small"
        backgroundColor="bronze"
        borderColor="bronze"
        textColor="white">
        {streak}
      </Badge>
    </div>
  )
}

export default StreakBadge
