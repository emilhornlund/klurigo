import {
  faArrowLeft,
  faArrowRotateLeft,
} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import type { QuizCategory, QuizResponseDto } from '@klurigo/common'
import type { FC } from 'react'
import { Link } from 'react-router-dom'

import {
  Button,
  Page,
  QuizDiscoveryCard,
  Stack,
  Typography,
} from '../../../../components'
import QuizTableFilter, {
  type FilterOptions,
} from '../../../../components/QuizTableFilter'
import { QuizCategoryLabels } from '../../../../models/labels'

import styles from './DiscoverCategoryPageUI.module.scss'

export type DiscoverCategoryPageUIProps = {
  /** Validated route category; null indicates an unsupported category URL. */
  readonly category: QuizCategory | null
  /** Category and refinements reflected in the URL. */
  readonly filter: FilterOptions
  /** Applies refinements or navigates to another selected category. */
  readonly onFilterChange: (filter: FilterOptions) => void
  /** Clears refinements while retaining the category. */
  readonly onClearFilter: () => void
  /** Accumulated quiz cards from successfully loaded pages. */
  readonly quizzes: readonly QuizResponseDto[]
  /** Indicates the initial request is loading. */
  readonly isLoading: boolean
  /** Indicates the initial request failed. */
  readonly isError: boolean
  /** Indicates the next page is loading. */
  readonly isLoadingMore: boolean
  /** Indicates a subsequent page failed without discarding the quiz grid. */
  readonly isLoadingMoreError: boolean
  /** Whether another page is available. */
  readonly hasMore: boolean
  /** Fetches or retries the next page. */
  readonly onLoadMore: () => void
  /** Retries the failed initial request. */
  readonly onRetry: () => void
}

/** Category heading, URL-backed refinements, and the standard discovery quiz grid. */
const DiscoverCategoryPageUI: FC<DiscoverCategoryPageUIProps> = ({
  category,
  filter,
  onFilterChange,
  onClearFilter,
  quizzes,
  isLoading,
  isError,
  isLoadingMore,
  isLoadingMoreError,
  hasMore,
  onLoadMore,
  onRetry,
}) => {
  const label = category ? QuizCategoryLabels[category] : undefined
  const hasRefinements = !!(
    filter.search ||
    filter.languageCode ||
    filter.mode ||
    filter.sort ||
    filter.order
  )

  return (
    <Page layout="contained" align="start" discover profile>
      <Stack width="full" spacing="page">
        <Typography variant="link2" color="inverse" asChild>
          <Link to="/discover">
            <FontAwesomeIcon icon={faArrowLeft} /> Back to discovery
          </Link>
        </Typography>
        <div className={styles.heading}>
          <Typography variant="title" align="center" color="inverse">
            {label ? `${label} quizzes` : 'Category not found'}
          </Typography>
          <Typography variant="body" align="center" color="inverse">
            {label
              ? `Explore public quizzes in ${label}`
              : 'Choose a category from Discover to find your next quiz.'}
          </Typography>
        </div>
        {category && (
          <>
            <div className={styles.filterBar}>
              <QuizTableFilter filter={filter} onChange={onFilterChange} />
            </div>
            {hasRefinements && (
              <div className={styles.actions}>
                <Button
                  id="clear-category-filters"
                  type="button"
                  variant="outline"
                  surface="brand"
                  onClick={onClearFilter}>
                  Clear filters
                </Button>
              </div>
            )}
            {isLoading && (
              <Typography
                variant="body2"
                align="center"
                color="inverse"
                role="status">
                Loading quizzes…
              </Typography>
            )}
            {isError && (
              <>
                <Typography
                  variant="body2"
                  align="center"
                  color="inverse"
                  role="alert">
                  We couldn’t load quizzes. Please try again.
                </Typography>
                <div className={styles.actions}>
                  <Button
                    id="retry-category-quizzes"
                    type="button"
                    onClick={onRetry}>
                    Try again
                  </Button>
                </div>
              </>
            )}
            {!isLoading && !isError && quizzes.length === 0 && (
              <Typography
                variant="body2"
                align="center"
                color="inverse"
                data-testid="category-empty-state">
                {hasRefinements
                  ? `No quizzes match your filters in ${label}. Try a different search or clear your filters.`
                  : `No public quizzes in ${label} yet. Browse another category on Discover.`}
              </Typography>
            )}
            {quizzes.length > 0 && (
              <div className={styles.grid} data-testid="category-quiz-grid">
                {quizzes.map((quiz) => (
                  <QuizDiscoveryCard key={quiz.id} quiz={quiz} />
                ))}
              </div>
            )}
            {isLoadingMoreError && (
              <Typography
                variant="body2"
                align="center"
                color="inverse"
                role="alert">
                We couldn’t load more quizzes. Your loaded quizzes are still
                available.
              </Typography>
            )}
            {hasMore && (
              <div className={styles.actions}>
                <Button
                  id="load-more-category-quizzes"
                  type="button"
                  icon={faArrowRotateLeft}
                  loading={isLoadingMore}
                  onClick={onLoadMore}>
                  {isLoadingMoreError
                    ? 'Try loading more again'
                    : 'Load more quizzes'}
                </Button>
              </div>
            )}
          </>
        )}
      </Stack>
    </Page>
  )
}

export default DiscoverCategoryPageUI
