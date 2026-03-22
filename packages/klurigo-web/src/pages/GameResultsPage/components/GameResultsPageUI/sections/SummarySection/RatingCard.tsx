import type { FC } from 'react'

import { StarRating, Textarea } from '../../../../../../components'
import { classNames } from '../../../../../../utils/helpers'

import styles from './SummarySection.module.scss'

/**
 * Props for the `RatingCard` component.
 */
export type RatingCardProps = {
  /**
   * Whether the current user is allowed to rate this quiz.
   *
   * When `false`, star buttons are disabled and a message is shown explaining
   * that the quiz cannot be rated.
   */
  canRateQuiz: boolean

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
 * UI component for displaying and editing a quiz rating.
 *
 * Renders a star-based rating selector (1–5) and, once a rating is selected,
 * an optional text area for leaving a comment.
 *
 * Rating interactions are delegated to the parent component via callbacks.
 */
const RatingCard: FC<RatingCardProps> = ({
  canRateQuiz,
  stars,
  comment,
  onRatingChange,
  onCommentChange,
}) => (
  <div className={classNames(styles.card, styles.rating)}>
    <div className={styles.content}>
      <div className={styles.title}>Rate this quiz</div>
      <StarRating
        value={stars}
        size="large"
        disabled={!canRateQuiz}
        onChange={onRatingChange}
      />
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
    {!canRateQuiz && (
      <div className={styles.disabledMessage}>
        You cannot rate your own quiz
      </div>
    )}
  </div>
)

export default RatingCard
