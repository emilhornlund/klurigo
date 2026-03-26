import { type QueryKey, useInfiniteQuery } from '@tanstack/react-query'
import { useCallback, useMemo } from 'react'

import {
  type ResponsivePageSizeOptions,
  useResponsivePageSize,
} from './useResponsivePageSize'

/**
 * Configuration for a responsive infinite offset query.
 */
export type UseResponsiveInfiniteOffsetQueryOptions<TItem, TPage> = {
  /** The React Query cache key for the paginated query. */
  readonly queryKey: QueryKey
  /** The offset to use for the first page request. */
  readonly initialOffset?: number
  /** Fetches a single page using limit and offset pagination. */
  readonly queryFn: (params: {
    /** The maximum number of items to fetch. */
    readonly limit: number
    /** The offset to start fetching from. */
    readonly offset: number
  }) => Promise<TPage>
  /** Responsive page size configuration for desktop, tablet, and mobile devices. */
  readonly pageSize?: ResponsivePageSizeOptions
  /** Returns the list of items from a page response. */
  readonly getResults: (page: TPage) => readonly TItem[]
  /** Returns the total number of available items from a page response. */
  readonly getTotal: (page: TPage) => number
  /** Controls whether the query should execute. */
  readonly enabled?: boolean
}

/**
 * Result returned from a responsive infinite offset query.
 */
export type UseResponsiveInfiniteOffsetQueryResult<TItem, TPage> = {
  /** The current responsive page size. */
  readonly itemsPerPage: number | undefined
  /** All loaded items flattened into a single list. */
  readonly items: readonly TItem[]
  /** All loaded pages. */
  readonly pages: readonly TPage[]
  /** Indicates whether the initial query is loading. */
  readonly isLoading: boolean
  /** Indicates whether the query is in an error state. */
  readonly isError: boolean
  /** Indicates whether another page can be loaded. */
  readonly hasMore: boolean | undefined
  /** Indicates whether an additional page is currently being loaded. */
  readonly isLoadingMore: boolean
  /** Loads the next page. */
  readonly loadMore: () => void
}

/**
 * Fetches offset-based paginated data using a responsive page size and flattens the loaded pages into a single item list.
 */
export const useResponsiveInfiniteOffsetQuery = <TItem, TPage>({
  queryKey,
  initialOffset = 0,
  queryFn,
  pageSize,
  getResults,
  getTotal,
  enabled = true,
}: UseResponsiveInfiniteOffsetQueryOptions<
  TItem,
  TPage
>): UseResponsiveInfiniteOffsetQueryResult<TItem, TPage> => {
  const itemsPerPage = useResponsivePageSize(
    pageSize ?? {
      desktop: 20,
      tablet: 15,
      mobile: 10,
    },
  )

  const {
    data,
    isLoading,
    isError,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: [...queryKey, itemsPerPage, initialOffset],
    initialPageParam: initialOffset,
    enabled: enabled && itemsPerPage !== undefined,
    staleTime: 60_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    queryFn: ({ pageParam }) =>
      queryFn({
        limit: itemsPerPage!,
        offset: pageParam,
      }),
    getNextPageParam: (lastPage, allPages) => {
      const loadedCount =
        initialOffset + allPages.flatMap((page) => getResults(page)).length
      return loadedCount < getTotal(lastPage) ? loadedCount : undefined
    },
  })

  const items = useMemo(
    () => data?.pages.flatMap((page) => getResults(page)) ?? [],
    [data, getResults],
  )

  const loadMore = useCallback(() => {
    if (!isFetchingNextPage && hasNextPage) {
      fetchNextPage().then()
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage])

  return {
    itemsPerPage,
    items,
    pages: data?.pages ?? [],
    isLoading,
    isError,
    hasMore: hasNextPage,
    isLoadingMore: isFetchingNextPage,
    loadMore,
  }
}
