import { faStar as faStarRegular } from '@fortawesome/free-regular-svg-icons'
import { faStar } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { QUIZ_RATING_STARS_MAX, QUIZ_RATING_STARS_MIN } from '@klurigo/common'
import type { FC } from 'react'

import { classNames } from '../../utils/helpers'

import styles from './StarRating.module.scss'

export type StarRatingSize = 'small' | 'large'

/**
 * Props for the `StarRating` component.
 */
export type StarRatingProps = {
  /**
   * The current star rating value.
   *
   * In read-only mode this may be a decimal (e.g. `4.6`); it is rounded to the
   * nearest integer when determining how many stars to fill.
   * In interactive mode it should be a whole number within `[min, max]`.
   */
  value?: number

  /**
   * The minimum selectable star value.
   *
   * @default QUIZ_RATING_STARS_MIN
   */
  min?: number

  /**
   * The maximum selectable star value and total number of stars shown.
   *
   * @default QUIZ_RATING_STARS_MAX
   */
  max?: number

  /**
   * Controls the rendered size of the stars.
   *
   * - `'small'` – suitable for compact inline display (e.g. a list of rating cards).
   * - `'large'` – suitable for prominent interactive inputs.
   *
   * @default 'large'
   */
  size?: StarRatingSize

  /**
   * When `true`, all interactive star buttons are rendered disabled.
   * Has no effect in read-only mode.
   *
   * @default false
   */
  disabled?: boolean

  /**
   * Callback invoked when the user selects a star.
   *
   * When provided, the component renders each star as an interactive `<button>`.
   * Clicking the currently selected star is a no-op.
   * When omitted, the component renders a static read-only display.
   *
   * @param value - The selected star value.
   */
  onChange?: (value: number) => void
}

/**
 * Displays a row of star icons representing a numeric rating.
 *
 * Providing an `onChange` handler enables interactive mode where the user can
 * click stars to set a rating. Without `onChange` the stars are read-only.
 */
const StarRating: FC<StarRatingProps> = ({
  value,
  min = QUIZ_RATING_STARS_MIN,
  max = QUIZ_RATING_STARS_MAX,
  size = 'large',
  disabled = false,
  onChange,
}) => {
  const stars = Array.from({ length: max - min + 1 }, (_, i) => i + min)

  if (onChange !== undefined) {
    return (
      <span
        className={classNames(styles.starRow, styles[size])}
        data-testid="star-row">
        {stars.map((star) => (
          <button
            key={star}
            type="button"
            disabled={disabled}
            className={classNames(
              styles.starButton,
              value !== undefined && star <= value ? styles.active : undefined,
            )}
            onClick={() => {
              if (star !== value) {
                onChange(star)
              }
            }}
            aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}>
            <FontAwesomeIcon
              icon={
                value !== undefined && star <= value ? faStar : faStarRegular
              }
            />
          </button>
        ))}
      </span>
    )
  }

  const filledCount = value !== undefined ? Math.round(value) : 0

  return (
    <span
      className={classNames(styles.starRow, styles[size])}
      aria-label={`${value ?? 0} out of ${max} stars`}
      data-testid="star-row">
      {stars.map((_, i) => (
        <FontAwesomeIcon
          key={i}
          className={i < filledCount ? styles.filled : styles.empty}
          icon={i < filledCount ? faStar : faStarRegular}
        />
      ))}
    </span>
  )
}

export default StarRating
