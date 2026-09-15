import { type FC } from 'react'

import { classNames } from '../../utils/helpers'
import Typography from '../Typography'

import styles from './ScoreChip.module.scss'

/**
 * Props for the `ScoreChip` component.
 */
export type ScoreChipProps = {
  /** Numeric score value displayed inside the chip. */
  readonly value: number

  /** Controls the text color using semantic tokens. */
  readonly color?: 'default' | 'inverse'

  /** Controls the visual size of the chip. */
  readonly size?: 'normal' | 'small'

  /** Renders the chip without its surface background. */
  readonly transparent?: boolean
}

/**
 * Displays a score inside a rounded chip-style container.
 */
const ScoreChip: FC<ScoreChipProps> = ({
  value,
  color = 'inverse',
  size = 'normal',
  transparent = false,
}) => (
  <div
    className={classNames(
      styles.score,
      size === 'normal' ? styles.sizeNormal : undefined,
      size === 'small' ? styles.sizeSmall : undefined,
      transparent ? styles.transparent : undefined,
    )}
    data-testid="score-chip">
    <Typography
      variant={size === 'small' ? 'title3' : 'title2'}
      align="center"
      color={color}>
      {value}
    </Typography>
  </div>
)

export default ScoreChip
