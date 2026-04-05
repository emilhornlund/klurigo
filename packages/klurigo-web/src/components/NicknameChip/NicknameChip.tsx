import { faXmark } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import type { FC } from 'react'

import { classNames } from '../../utils/helpers'

import styles from './NicknameChip.module.scss'

/**
 * Visual style variants for the NicknameChip.
 *
 * - `subtle`: Default, low-emphasis chip styling.
 * - `accent`: Higher-emphasis chip styling (e.g., highlighted / primary).
 */
export type NicknameChipVariant = 'subtle' | 'accent'

/**
 * Animation states for the NicknameChip.
 *
 * The actual motion/animation is provided by CSS classes in `NicknameChip.module.scss`.
 *
 * - `none`: No animation class applied.
 * - `entrance`: Entrance animation class applied.
 * - `exit`: Exit animation class applied.
 * - `shake`: Shake animation class applied (e.g., attention/feedback).
 */
export type NicknameChipAnimationState = 'entrance' | 'exit' | 'shake' | 'none'

/**
 * Props for the {@link NicknameChip} component.
 */
export interface NicknameChipProps {
  /**
   * The nickname text displayed inside the chip.
   */
  value: string

  /**
   * Controls the visual emphasis of the chip.
   *
   * Defaults to `subtle`.
   */
  variant?: NicknameChipVariant

  /**
   * Optional callback that enables deletion/removal.
   *
   * If provided, a delete button is rendered. Clicking it invokes this callback.
   */
  onDelete?: () => void

  /**
   * Optional animation state that applies a corresponding CSS class.
   *
   * Defaults to `none`.
   */
  animationState?: NicknameChipAnimationState

  /**
   * Optional delay (in milliseconds) used to stagger animations.
   *
   * If `staggerDelay` is greater than 0, it is applied as an inline
   * `animationDelay` style (`"${staggerDelay}ms"`). Otherwise, no inline style is set.
   *
   * Defaults to `0`.
   */
  staggerDelay?: number
}

/**
 * Displays a nickname as a styled "chip" with optional animation state and delete affordance.
 *
 * Behavior:
 * - Always renders the `value` text.
 * - Applies CSS module classes based on `variant` and `animationState`.
 * - If `onDelete` is provided, renders a delete button with an "X" icon.
 * - If `staggerDelay > 0`, sets inline `style.animationDelay` to stagger CSS animations.
 */
const NicknameChip: FC<NicknameChipProps> = ({
  value,
  variant = 'subtle',
  onDelete,
  animationState = 'none',
  staggerDelay = 0,
}) => {
  /**
   * Inline styles applied to the root element.
   *
   * Only sets `animationDelay` when `staggerDelay` is positive, to avoid setting
   * unnecessary inline styles (and to keep the DOM clean for the common case).
   */
  const inlineStyles =
    staggerDelay > 0
      ? {
          animationDelay: `${staggerDelay}ms`,
        }
      : {}

  return (
    <div
      className={classNames(
        styles.main,
        animationState === 'entrance' ? styles.entrance : undefined,
        animationState === 'exit' ? styles.exit : undefined,
        animationState === 'shake' ? styles.shake : undefined,
        variant === 'subtle' ? styles.subtle : undefined,
        variant === 'accent' ? styles.accent : undefined,
      )}
      style={inlineStyles}>
      {value}
      {onDelete && (
        <button className={styles.deleteButton} onClick={onDelete}>
          <FontAwesomeIcon icon={faXmark} />
        </button>
      )}
    </div>
  )
}

export default NicknameChip
