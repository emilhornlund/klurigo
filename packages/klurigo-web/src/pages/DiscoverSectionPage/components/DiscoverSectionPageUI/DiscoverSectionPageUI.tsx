import { faArrowRotateLeft } from '@fortawesome/free-solid-svg-icons'
import type { DiscoveryQuizCardDto, DiscoverySectionKey } from '@klurigo/common'
import type { FC } from 'react'

import { Button, Page, Typography } from '../../../../components'
import { QuizDiscoveryCard } from '../../../../components'
import {
  DISCOVERY_SECTION_DESCRIPTIONS,
  DISCOVERY_SECTION_TITLES,
} from '../../../../utils/discovery.utils'

import styles from './DiscoverSectionPageUI.module.scss'

/**
 * Props for the DiscoverSectionPageUI component.
 */
export type DiscoverSectionPageUIProps = {
  /** The validated discovery section key, or null for unknown keys. */
  readonly sectionKey: DiscoverySectionKey | null
  /** Accumulated list of quiz cards across all loaded pages. */
  readonly quizzes: readonly DiscoveryQuizCardDto[]
  /** Whether the initial data fetch is in progress. */
  readonly isLoading: boolean
  /** Indicates whether an additional page is currently loading. */
  readonly isLoadingMore: boolean
  /** Whether more results can be loaded. */
  readonly hasMore: boolean
  /** Callback invoked when the user clicks "Load more". */
  readonly onLoadMore: () => void
  /** Whether an error occurred during data fetching. */
  readonly isError: boolean
}

/**
 * Presentational component for the discovery section "See All" page.
 *
 * Renders a back link, section heading with description, a vertical
 * grid of quiz cards, and a "Load more" button for offset pagination.
 * Title and description are resolved from the client-side section label
 * mappings using the section key.
 */
const DiscoverSectionPageUI: FC<DiscoverSectionPageUIProps> = ({
  sectionKey,
  quizzes,
  isLoading,
  isLoadingMore,
  hasMore,
  onLoadMore,
  isError,
}) => {
  const title = sectionKey ? DISCOVERY_SECTION_TITLES[sectionKey] : undefined
  const description = sectionKey
    ? DISCOVERY_SECTION_DESCRIPTIONS[sectionKey]
    : undefined

  return (
    <Page align="start" discover profile>
      <div className={styles.container}>
        {isError || !sectionKey || (!isLoading && quizzes.length === 0) ? (
          <p className={styles.emptyState} data-testid="section-empty-state">
            This section is not available right now.
          </p>
        ) : (
          <>
            <div className={styles.heading}>
              <Typography variant="title" width="full">
                {title}
              </Typography>
              <Typography variant="body" width="full">
                {description}
              </Typography>
            </div>
            <div className={styles.grid} data-testid="section-quiz-grid">
              {quizzes.map((quiz) => (
                <QuizDiscoveryCard key={quiz.id} quiz={quiz} />
              ))}
            </div>
            {hasMore && (
              <div className={styles.loadMoreContainer}>
                <Button
                  id="load-more-quizzes-button"
                  type="button"
                  icon={faArrowRotateLeft}
                  loading={isLoadingMore}
                  onClick={onLoadMore}
                  data-testid="load-more-quizzes-button">
                  Load more quizzes
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </Page>
  )
}

export default DiscoverSectionPageUI
