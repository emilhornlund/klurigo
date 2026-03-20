import { faStar as faStarRegular } from '@fortawesome/free-regular-svg-icons'
import {
  faChevronLeft,
  faChevronRight,
  faStar,
} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import type { QuizRatingDto, QuizRatingSummaryDto } from '@klurigo/common'
import { type FC, useCallback, useRef } from 'react'

import colors from '../../../../../../styles/colors.module.scss'
import { formatTimeAgo } from '../../../../../../utils/date.utils'
import { classNames } from '../../../../../../utils/helpers'

import styles from './RatingsSection.module.scss'

/** Number of skeleton placeholder cards shown while ratings are loading. */
export const RATINGS_SKELETON_COUNT = 3

type StarRowProps = {
  readonly stars: number
  readonly max?: number
}

const StarRow: FC<StarRowProps> = ({ stars, max = 5 }) => (
  <span
    className={styles.starRow}
    aria-label={`${stars} out of ${max} stars`}
    data-testid="star-row">
    {Array.from({ length: max }, (_, i) => (
      <FontAwesomeIcon
        key={i}
        icon={i < Math.round(stars) ? faStar : faStarRegular}
        color={i < Math.round(stars) ? colors.yellow2 : undefined}
      />
    ))}
  </span>
)

export type RatingsSectionProps = {
  /** Summary stats (average stars + comment count) for the quiz. */
  readonly summary: QuizRatingSummaryDto
  /** Individual ratings to display in the horizontal rail. */
  readonly ratings: QuizRatingDto[]
  /** When true, renders skeleton placeholder cards instead of real data. */
  readonly isLoading?: boolean
}

/**
 * Displays a "Ratings & Reviews" section for a quiz details page.
 *
 * Renders a summary panel showing the average star score and comment count,
 * followed by a horizontally scrollable rail of individual rating cards.
 * When `isLoading` is true, skeleton placeholder cards are shown in the rail.
 * When there are no written reviews, an empty state message is displayed.
 * Left/right arrow buttons appear on hover (desktop) to page through the rail.
 */
const RatingsSection: FC<RatingsSectionProps> = ({
  summary,
  ratings,
  isLoading = false,
}) => {
  const railRef = useRef<HTMLDivElement>(null)

  const scroll = useCallback((direction: 'left' | 'right') => {
    const el = railRef.current
    if (!el) return
    el.scrollBy({
      left: direction === 'left' ? -el.clientWidth : el.clientWidth,
      behavior: 'smooth',
    })
  }, [])

  const renderRail = () => {
    if (isLoading) {
      return (
        <div className={styles.railWrapper} data-testid="ratings-rail-wrapper">
          <div className={styles.rail} data-testid="ratings-rail-scroll">
            {Array.from({ length: RATINGS_SKELETON_COUNT }, (_, i) => (
              <div
                key={i}
                className={styles.skeleton}
                data-testid="ratings-skeleton-card">
                <div className={styles.skeletonLine} />
                <div className={styles.skeletonLine} />
                <div className={styles.skeletonLine} />
              </div>
            ))}
          </div>
        </div>
      )
    }

    if (ratings.length === 0) {
      return (
        <p className={styles.emptyState} data-testid="ratings-empty-state">
          No written reviews yet
        </p>
      )
    }

    return (
      <div className={styles.railWrapper} data-testid="ratings-rail-wrapper">
        <button
          className={classNames(styles.arrowButton, styles.arrowPrev)}
          onClick={() => scroll('left')}
          aria-label="Scroll left"
          tabIndex={-1}
          data-testid="ratings-arrow-prev">
          <FontAwesomeIcon icon={faChevronLeft} />
        </button>

        <div
          className={styles.rail}
          ref={railRef}
          data-testid="ratings-rail-scroll">
          {ratings.map((rating) => (
            <div
              key={rating.id}
              className={styles.card}
              data-testid="rating-card">
              <div className={styles.cardHeader}>
                <StarRow stars={rating.stars} />
                <span className={styles.timeAgo}>
                  {formatTimeAgo(rating.updatedAt)}
                </span>
              </div>
              <span className={styles.author}>{rating.author.nickname}</span>
              {rating.comment && (
                <p className={styles.comment}>{rating.comment}</p>
              )}
            </div>
          ))}
        </div>

        <button
          className={classNames(styles.arrowButton, styles.arrowNext)}
          onClick={() => scroll('right')}
          aria-label="Scroll right"
          tabIndex={-1}
          data-testid="ratings-arrow-next">
          <FontAwesomeIcon icon={faChevronRight} />
        </button>
      </div>
    )
  }

  return (
    <section className={styles.section} data-testid="ratings-section">
      <h2 className={styles.title}>Ratings &amp; Reviews</h2>

      <div className={styles.summary} data-testid="ratings-summary">
        <div className={styles.score}>
          <span
            className={styles.average}
            aria-label={`Average rating: ${summary.stars.toFixed(1)}`}>
            {summary.stars.toFixed(1)}
          </span>
          <span className={styles.outOf}>out of 5</span>
        </div>
        <div className={styles.summaryRight}>
          <StarRow stars={summary.stars} />
          <span className={styles.count} data-testid="ratings-count">
            {summary.total} {summary.total > 1 ? 'Ratings' : 'Rating'}
          </span>
        </div>
      </div>

      {renderRail()}
    </section>
  )
}

export default RatingsSection
