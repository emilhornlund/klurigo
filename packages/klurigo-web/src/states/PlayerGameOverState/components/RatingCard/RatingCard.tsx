import { faStar as faStarRegular } from '@fortawesome/free-regular-svg-icons'
import { faStar } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import type { FC } from 'react'

import { Textarea } from '../../../../components'
import { classNames } from '../../../../utils/helpers'

import styles from './RatingCard.module.scss'

/**
 * Props for the `RatingCard` component.
 */
export type RatingCardProps = {
  /**
   * The currently selected star rating value (1–5), if any.
   */
  stars?: number

  /**
   * The current comment value associated with the rating, if any.
   */
  comment?: string

  /**
   * Callback invoked when the user selects a star rating.
   *
   * @param rating - The selected star rating value (1–5).
   */
  onRatingChange: (rating: number) => void

  /**
   * Callback invoked when the user updates the comment text.
   *
   * @param comment - The updated comment value.
   */
  onCommentChange: (comment: string) => void
}

/**
 * UI component for displaying and editing a quiz rating on the game-over screen.
 *
 * Renders a star-based rating selector (1–5) and, once a rating is selected,
 * an optional text area for leaving a comment.
 *
 * Rating interactions are delegated to the parent component via callbacks.
 */
const RatingCard: FC<RatingCardProps> = ({
  stars,
  comment,
  onRatingChange,
  onCommentChange,
}) => (
  <div className={styles.ratingCard}>
    <div className={styles.ratingTitle}>Rate this quiz</div>
    <div className={styles.stars}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          className={classNames(
            styles.starButton,
            stars && star <= stars ? styles.active : undefined,
          )}
          onClick={() => {
            if (star !== stars) {
              onRatingChange(star)
            }
          }}
          aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}>
          <FontAwesomeIcon
            icon={stars && star <= stars ? faStar : faStarRegular}
          />
        </button>
      ))}
    </div>
    {stars && (
      <div className={styles.comment}>
        <Textarea
          id="rating-comment"
          placeholder="Optional comment..."
          value={comment}
          onChange={onCommentChange}
          kind="primary"
        />
      </div>
    )}
  </div>
)

export default RatingCard
