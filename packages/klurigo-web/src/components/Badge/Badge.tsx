import type { FC, ReactNode } from 'react'
import { useEffect, useState } from 'react'

import colors from '../../styles/colors.module.scss'
import { classNames } from '../../utils/helpers'

import styles from './Badge.module.scss'

export type BadgeSize = 'small' | 'large'

const BadgeSizeClassName: { [key in BadgeSize]: string } = {
  small: styles.small,
  large: styles.large,
}

export type BadgeColor =
  | 'green'
  | 'red'
  | 'blue'
  | 'orange'
  | 'gold'
  | 'silver'
  | 'bronze'
  | 'white'
  | 'black'

const BadgeColorClassName: { [key in BadgeColor]: string } = {
  green: colors.green2,
  red: colors.red2,
  blue: colors.blue2,
  orange: colors.orange2,
  gold: colors.yellow2,
  silver: colors.gray1,
  bronze: colors.orange2,
  white: colors.white1,
  black: colors.gray4,
}

export type BadgeCelebration = 'none' | 'normal' | 'major' | 'epic'

const BadgeCelebrationClassName: { [key in BadgeCelebration]: string } = {
  none: '',
  normal: styles.celebrationNormal,
  major: styles.celebrationMajor,
  epic: styles.celebrationEpic,
}

export interface BadgeProps {
  size?: BadgeSize
  backgroundColor?: BadgeColor
  borderColor?: BadgeColor
  textColor?: BadgeColor
  celebration?: BadgeCelebration
  onAnimationEnd?: () => void
  children?: ReactNode
}

const Badge: FC<BadgeProps> = ({
  size = 'small',
  backgroundColor = 'white',
  borderColor = 'white',
  textColor = 'white',
  celebration = 'none',
  onAnimationEnd,
  children,
}) => {
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    if (celebration && celebration !== 'none') {
      setIsAnimating(true)
      const timer = setTimeout(() => {
        setIsAnimating(false)
        onAnimationEnd?.()
      }, 800)
      return () => clearTimeout(timer)
    }
  }, [celebration, onAnimationEnd])

  // Determine number-specific class for optical adjustments
  const getNumberClass = () => {
    if (typeof children === 'number') {
      const num = children.toString()
      if (num.length > 1) return styles.multiDigit
      return styles[`number-${num}`] || ''
    }
    if (typeof children === 'string') {
      const trimmed = children.trim()
      if (/^\d+$/.test(trimmed)) {
        if (trimmed.length > 1) return styles.multiDigit
        return styles[`number-${trimmed}`] || ''
      }
    }
    return ''
  }

  return (
    <div
      className={classNames(
        styles.badge,
        BadgeSizeClassName[size],
        getNumberClass(),
        isAnimating ? BadgeCelebrationClassName[celebration] : '',
        borderColor ? styles.border : undefined,
      )}
      style={{
        backgroundColor: BadgeColorClassName[backgroundColor],
        outlineColor: BadgeColorClassName[borderColor],
        color: BadgeColorClassName[textColor],
      }}>
      {children}
    </div>
  )
}

export default Badge
