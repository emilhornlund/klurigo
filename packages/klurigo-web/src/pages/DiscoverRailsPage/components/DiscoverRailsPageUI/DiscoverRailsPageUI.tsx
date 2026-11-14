import { faArrowRotateLeft, faXmark } from '@fortawesome/free-solid-svg-icons'
import {
  type DiscoverySectionDto,
  DiscoverySectionKey,
  type QuizResponseDto,
} from '@klurigo/common'
import type { FC } from 'react'

import {
  Button,
  Page,
  QuizDiscoveryCard,
  RailHeader,
  Stack,
  Typography,
} from '../../../../components'
import type { FilterOptions } from '../../../../components/QuizTableFilter'
import QuizTableFilter from '../../../../components/QuizTableFilter'
import { QuizCategoryLabels } from '../../../../models/labels'
import {
  DISCOVERY_SECTION_DESCRIPTIONS,
  DISCOVERY_SECTION_TITLES,
} from '../../../../utils/discovery.utils'

import { CategoryBrowser, DiscoveryRailSection } from './components'
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
  readonly searchResults: readonly QuizResponseDto[]
  /** When true, shows loading state in filter/search mode. */
  readonly isSearchLoading: boolean
  /** Whether more search results can be loaded. */
  readonly hasMore: boolean
  /** Callback invoked when the user clicks "Load more". */
  readonly onLoadMore: () => void
  /** Prevents duplicate pagination requests while another page is loading. */
  readonly isLoadingMore?: boolean
  /** Indicates that a subsequent page failed while loaded results remain available. */
  readonly isLoadingMoreError?: boolean
  /** Distinguishes failed requests from genuine empty search results. */
  readonly isSearchError?: boolean
  /** Indicates that curated rails could not be fetched. */
  readonly isRailsError?: boolean
  /** Retries the discovery snapshot request. */
  readonly onRetryRails?: () => void
  /** Retries failed public quiz requests. */
  readonly onRetrySearch?: () => void
}

/** Placeholder section keys used during loading to render skeleton rails. */
const LOADING_SKELETON_SECTIONS = [
  'skeleton-1',
  'skeleton-2',
  'skeleton-3',
] as const

/** Returns true when the filter has at least one active criterion. */
const isFilterActive = (filter: FilterOptions): boolean =>
  !!(
    filter.search ||
    filter.category ||
    filter.languageCode ||
    filter.mode ||
    filter.sort ||
    filter.order
  )

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
  isLoadingMore = false,
  isLoadingMoreError = false,
  isSearchError = false,
  isRailsError = false,
  onRetryRails,
  onRetrySearch,
}) => {
  const filterActive = isFilterActive(filter)

  return (
    <Page layout="contained" align="start" discover profile>
      <Stack width="full" spacing="page">
        <div className={styles.heading}>
          <Typography
            variant="title"
            width="full"
            align="center"
            color="inverse">
            Discover
          </Typography>
          <Typography
            variant="body"
            width="full"
            align="center"
            color="inverse">
            Explore curated quizzes across different categories
          </Typography>
        </div>
        <div className={styles.filterBar}>
          <QuizTableFilter filter={filter} onChange={onFilterChange} />
        </div>
        <CategoryBrowser filter={filter} />
        {filterActive ? (
          <>
            <RailHeader
              title={
                filter.category
                  ? `${QuizCategoryLabels[filter.category]} quizzes`
                  : 'Search results'
              }
            />
            {isSearchLoading ? (
              <Typography
                variant="body2"
                color="inverse"
                align="center"
                role="status">
                Loading quizzes…
              </Typography>
            ) : isSearchError ? (
              <Typography
                variant="body2"
                color="inverse"
                align="center"
                role="alert">
                We couldn’t load quizzes. Please try again.
              </Typography>
            ) : null}
            {!isSearchLoading &&
            !isSearchError &&
            searchResults.length === 0 ? (
              <Typography
                variant="body2"
                align="center"
                color="inverse"
                data-testid="search-empty-state">
                <span>
                  {filter.category
                    ? `No quizzes found in ${QuizCategoryLabels[filter.category]}. Choose another category, adjust your filters, or `
                    : 'No quizzes found. Try a different search or '}
                  <button
                    className={styles.clearLink}
                    onClick={onClearFilter}
                    data-testid="clear-filter-link">
                    clear the filter
                  </button>{' '}
                  to browse all quizzes.
                </span>
              </Typography>
            ) : searchResults.length > 0 ? (
              <>
                <div className={styles.grid} data-testid="search-quiz-grid">
                  {searchResults.map((quiz) => (
                    <QuizDiscoveryCard key={quiz.id} quiz={quiz} />
                  ))}
                </div>
                {isLoadingMoreError && (
                  <Typography
                    variant="body2"
                    align="center"
                    color="inverse"
                    role="alert">
                    We couldn’t load more quizzes. Please try again.
                  </Typography>
                )}
                {hasMore && (
                  <div className={styles.loadMoreContainer}>
                    <Button
                      id="load-more-button"
                      type="button"
                      icon={faArrowRotateLeft}
                      loading={isLoadingMore}
                      onClick={onLoadMore}>
                      {isLoadingMoreError
                        ? 'Try loading more again'
                        : 'Load more'}
                    </Button>
                  </div>
                )}
              </>
            ) : null}
            {isSearchError && (
              <div className={styles.loadMoreContainer}>
                <Button
                  id="retry-search-button"
                  type="button"
                  onClick={onRetrySearch}>
                  Try again
                </Button>
              </div>
            )}
            <div className={styles.loadMoreContainer}>
              <Button
                id="clear-filter-button"
                type="button"
                variant="outline"
                surface="brand"
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
                  sectionKey={DiscoverySectionKey.FEATURED}
                  title=""
                  quizzes={[]}
                  isLoading={true}
                />
              ))
            ) : isRailsError ? (
              <div className={styles.loadMoreContainer}>
                <Button
                  id="retry-discovery-button"
                  type="button"
                  onClick={onRetryRails}>
                  Retry discovery
                </Button>
              </div>
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
              <Typography
                variant="body2"
                align="center"
                color="inverse"
                data-testid="empty-state">
                More quizzes coming soon — check back later!
              </Typography>
            )}
          </div>
        )}
      </Stack>
    </Page>
  )
}

export default DiscoverRailsPageUI
