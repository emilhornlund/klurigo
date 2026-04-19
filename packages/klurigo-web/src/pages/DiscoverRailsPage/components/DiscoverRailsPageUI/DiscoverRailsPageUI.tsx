import { faArrowRotateLeft, faXmark } from '@fortawesome/free-solid-svg-icons'
import type { DiscoverySectionDto, QuizResponseDto } from '@klurigo/common'
import type { FC } from 'react'

import {
  Button,
  Page,
  QuizDiscoveryCard,
  Typography,
} from '../../../../components'
import type { FilterOptions } from '../../../../components/QuizTableFilter'
import QuizTableFilter from '../../../../components/QuizTableFilter'
import {
  DISCOVERY_SECTION_DESCRIPTIONS,
  DISCOVERY_SECTION_TITLES,
} from '../../../../utils/discovery.utils'

import { DiscoveryRailSection } from './components'
import styles from './DiscoverRailsPageUI.module.scss'

/**
 * Props for the DiscoverRailsPageUI component.
 */
export type DiscoverRailsPageUIProps = {
  /** Ordered list of discovery sections to render (rails mode). */
  readonly sections: DiscoverySectionDto[]
  /** When true, shows skeleton loading state for each rail section. */
  readonly isLoading: boolean
  /** Current search/filter state. */
  readonly filter: FilterOptions
  /** Called when the user changes the filter. */
  readonly onFilterChange: (filter: FilterOptions) => void
  /** Called when the user clears the filter, returning to rails view. */
  readonly onClearFilter: () => void
  /** Accumulated search results (filter mode). */
  readonly searchResults: QuizResponseDto[]
  /** When true, shows loading state in filter/search mode. */
  readonly isSearchLoading: boolean
  /** Whether more search results can be loaded. */
  readonly hasMore: boolean
  /** Callback invoked when the user clicks "Load more". */
  readonly onLoadMore: () => void
}

/** Placeholder section keys used during loading to render skeleton rails. */
const LOADING_SKELETON_SECTIONS = [
  'skeleton-1',
  'skeleton-2',
  'skeleton-3',
] as const

/** Returns true when the filter has at least one active criterion. */
const isFilterActive = (filter: FilterOptions): boolean =>
  !!(filter.search || filter.category || filter.languageCode || filter.mode)

/**
 * Presentational component for the discovery rails page.
 *
 * Renders a filter bar at the top. When no filter is active, shows the
 * curated rails. When a filter is active, replaces the rails with a
 * grid of search results and a "Load more" button.
 */
const DiscoverRailsPageUI: FC<DiscoverRailsPageUIProps> = ({
  sections,
  isLoading,
  filter,
  onFilterChange,
  onClearFilter,
  searchResults,
  isSearchLoading,
  hasMore,
  onLoadMore,
}) => {
  const filterActive = isFilterActive(filter)

  return (
    <Page align="start" discover profile>
      <div className={styles.container}>
        <div className={styles.heading}>
          <Typography variant="title" width="full">
            Discover
          </Typography>
          <Typography variant="body" width="full">
            Explore curated quizzes across different categories
          </Typography>
        </div>
        <div className={styles.filterBar}>
          <QuizTableFilter filter={filter} onChange={onFilterChange} />
        </div>
        {filterActive ? (
          <>
            {isSearchLoading ? null : searchResults.length === 0 ? (
              <Typography variant="body2" data-testid="search-empty-state">
                No quizzes found. Try a different search or{' '}
                <button
                  className={styles.clearLink}
                  onClick={onClearFilter}
                  data-testid="clear-filter-link">
                  clear the filter
                </button>{' '}
                to browse all quizzes.
              </Typography>
            ) : (
              <>
                <div className={styles.grid} data-testid="search-quiz-grid">
                  {searchResults.map((quiz) => (
                    <QuizDiscoveryCard key={quiz.id} quiz={quiz as never} />
                  ))}
                </div>
                {hasMore && (
                  <div className={styles.loadMoreContainer}>
                    <Button
                      id="load-more-button"
                      type="button"
                      icon={faArrowRotateLeft}
                      onClick={onLoadMore}>
                      Load more
                    </Button>
                  </div>
                )}
              </>
            )}
            <div className={styles.loadMoreContainer}>
              <Button
                id="clear-filter-button"
                type="button"
                kind="secondary"
                icon={faXmark}
                onClick={onClearFilter}>
                Back to discovery
              </Button>
            </div>
          </>
        ) : (
          <div className={styles.rails}>
            {isLoading ? (
              LOADING_SKELETON_SECTIONS.map((key) => (
                <DiscoveryRailSection
                  key={key}
                  sectionKey={'FEATURED' as never}
                  title=""
                  quizzes={[]}
                  isLoading={true}
                />
              ))
            ) : sections.length > 0 ? (
              sections.map((section) => (
                <DiscoveryRailSection
                  key={section.key}
                  sectionKey={section.key}
                  title={DISCOVERY_SECTION_TITLES[section.key]}
                  description={DISCOVERY_SECTION_DESCRIPTIONS[section.key]}
                  quizzes={section.quizzes}
                  isLoading={false}
                />
              ))
            ) : (
              <Typography variant="body2" data-testid="empty-state">
                More quizzes coming soon — check back later!
              </Typography>
            )}
          </div>
        )}
      </div>
    </Page>
  )
}

export default DiscoverRailsPageUI
