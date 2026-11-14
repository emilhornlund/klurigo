import { QuizCategory } from '@klurigo/common'
import { type FC, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { useKlurigoServiceClient } from '../../api'
import type { FilterOptions } from '../../components/QuizTableFilter'
import { useResponsiveInfiniteOffsetQuery } from '../../utils/hooks'
import {
  discoveryFilterParams,
  useDiscoveryQuizFilters,
} from '../../utils/useDiscoveryQuizFilters'

import { DiscoverCategoryPageUI } from './components'

/** Dedicated, deep-linkable browsing of all public quizzes in a category. */
const DiscoverCategoryPage: FC = () => {
  const { category: rawCategory } = useParams<{ category: string }>()
  const category =
    Object.values(QuizCategory).find((value) => value === rawCategory) ?? null
  const { filter: refinements, setFilter } = useDiscoveryQuizFilters()
  const filter = useMemo(
    () => ({ ...refinements, category: category ?? undefined }),
    [refinements, category],
  )
  const { getPublicQuizzes } = useKlurigoServiceClient()
  const navigate = useNavigate()
  const queryKey = ['categoryQuizzes', category, filter]
  const {
    items,
    isLoading,
    isError,
    isLoadingMore,
    isLoadingMoreError,
    hasMore,
    loadMore,
    retry,
  } = useResponsiveInfiniteOffsetQuery({
    queryKey,
    queryFn: ({ limit, offset }) =>
      getPublicQuizzes({ ...filter, limit, offset }),
    getResults: (page) => page.results,
    getTotal: (page) => page.total,
    enabled: category !== null,
  })

  const handleFilterChange = (next: FilterOptions) => {
    const params = discoveryFilterParams({ ...next, category: undefined })
    if (next.category !== category) {
      const path = next.category
        ? `/discover/category/${next.category}`
        : '/discover'
      navigate(`${path}${params.size ? `?${params}` : ''}`)
    } else {
      setFilter({ ...next, category: undefined })
    }
  }

  return (
    <DiscoverCategoryPageUI
      category={category}
      filter={filter}
      onFilterChange={handleFilterChange}
      onClearFilter={() => setFilter({})}
      quizzes={items}
      isLoading={isLoading}
      isError={isError && items.length === 0}
      isLoadingMore={isLoadingMore}
      isLoadingMoreError={isLoadingMoreError}
      hasMore={!!hasMore}
      onLoadMore={loadMore}
      onRetry={retry}
    />
  )
}

export default DiscoverCategoryPage
