import { type FC } from 'react'

import styles from './ScoreChip.module.scss'

/**
 * Props for the `ScoreChip` component.
 */
export type ScoreChipProps = {
  /** Numeric score value displayed inside the chip. */
  readonly value: number
}

/**
 * Displays a score inside a rounded chip-style container.
 */
const ScoreChip: FC<ScoreChipProps> = ({ value }) => (
  <div className={styles.score} data-testid="score-chip">
    {value}
  </div>
)

export default ScoreChip
