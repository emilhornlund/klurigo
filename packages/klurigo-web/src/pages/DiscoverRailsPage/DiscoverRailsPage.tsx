import { useQuery } from '@tanstack/react-query'
import { type FC } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'

import { useKlurigoServiceClient } from '../../api'
import type { FilterOptions } from '../../components/QuizTableFilter'
import { useResponsiveInfiniteOffsetQuery } from '../../utils/hooks'
import {
  discoveryFilterParams,
  useDiscoveryQuizFilters,
} from '../../utils/useDiscoveryQuizFilters'

import { DiscoverRailsPageUI } from './components'

/** Discovery rails and URL-backed public quiz browsing. */
const DiscoverRailsPage: FC = () => {
  const { getDiscovery, getPublicQuizzes } = useKlurigoServiceClient()
  const { filter, setFilter } = useDiscoveryQuizFilters()
  const navigate = useNavigate()
  const filterActive = !!(
    filter.search ||
    filter.category ||
    filter.languageCode ||
    filter.mode ||
    filter.sort ||
    filter.order
  )

  const {
    data: railsData,
    isLoading: isRailsLoading,
    isError: isRailsError,
    refetch,
  } = useQuery({
    queryKey: ['discover'],
    queryFn: () => getDiscovery(),
    enabled: !filterActive && !filter.category,
  })

  const {
    items,
    isLoading,
    isError,
    hasMore,
    isLoadingMore,
    isLoadingMoreError,
    loadMore,
    retry,
  } = useResponsiveInfiniteOffsetQuery({
    queryKey: ['publicQuizzes', filter],
    queryFn: ({ limit, offset }) =>
      getPublicQuizzes({ ...filter, limit, offset }),
    getResults: (page) => page.results,
    getTotal: (page) => page.total,
    enabled: filterActive && !filter.category,
  })

  const handleFilterChange = (next: FilterOptions) => {
    if (next.category) {
      const params = discoveryFilterParams({ ...next, category: undefined })
      navigate(
        `/discover/category/${next.category}${params.size ? `?${params}` : ''}`,
      )
    } else {
      setFilter(next)
    }
  }

  // Keep shared links from the earlier query-based category view canonical.
  if (filter.category) {
    const params = discoveryFilterParams({ ...filter, category: undefined })
    return (
      <Navigate
        replace
        to={`/discover/category/${filter.category}${params.size ? `?${params}` : ''}`}
      />
    )
  }

  return (
    <DiscoverRailsPageUI
      sections={railsData?.sections ?? []}
      isLoading={isRailsLoading}
      isRailsError={isRailsError}
      onRetryRails={() => void refetch()}
      filter={filter}
      onFilterChange={handleFilterChange}
      onClearFilter={() => setFilter({})}
      searchResults={items}
      isSearchLoading={isLoading}
      isSearchError={isError && items.length === 0}
      onRetrySearch={retry}
      isLoadingMore={isLoadingMore}
      isLoadingMoreError={isLoadingMoreError}
      hasMore={!!hasMore}
      onLoadMore={loadMore}
    />
  )
}

export default DiscoverRailsPage
