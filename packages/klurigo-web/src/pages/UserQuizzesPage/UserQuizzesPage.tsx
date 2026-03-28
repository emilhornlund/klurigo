import type { FC } from 'react'
import { useMemo } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'

import { useKlurigoServiceClient } from '../../api'
import { parseNumber } from '../../utils/helpers'
import { useResponsiveInfiniteOffsetQuery } from '../../utils/hooks'
import { toDiscoveryQuizCards } from '../../utils/quiz.utils'

import { UserQuizzesPageUI } from './components'

type UserQuizzesSort = 'title' | 'created' | 'updated'
type UserQuizzesOrder = 'asc' | 'desc'

type UserQuizzesOptions = {
  readonly sort: UserQuizzesSort
  readonly order: UserQuizzesOrder
  readonly limit?: number
  readonly offset: number
}

/**
 * Responsive fallback page sizes used when the route does not provide an
 * explicit `limit` query parameter.
 */
const DEFAULT_PAGE_SIZE = {
  desktop: 20,
  tablet: 15,
  mobile: 10,
} as const

const isUserQuizzesSort = (value: string | null): value is UserQuizzesSort =>
  value === 'title' || value === 'created' || value === 'updated'

const isUserQuizzesOrder = (value: string | null): value is UserQuizzesOrder =>
  value === 'asc' || value === 'desc'

/**
 * Container page for `/users/:userId/quizzes`.
 *
 * Reads the `userId` route param plus the supported v1 query parameters
 * (`sort`, `order`, `limit`, `offset`), loads the user's public quizzes through
 * the existing paginated backend contract, maps them to discovery-card data,
 * and renders the public quizzes grid with responsive load-more pagination.
 */
const UserQuizzesPage: FC = () => {
  const { userId = '' } = useParams<{ userId: string }>()
  const [searchParams] = useSearchParams()

  const { getUserPublicQuizzes } = useKlurigoServiceClient()

  const userQuizzesOptions = useMemo<UserQuizzesOptions>(() => {
    const sortParam = searchParams.get('sort')
    const orderParam = searchParams.get('order')
    const limitValue = parseNumber(searchParams.get('limit'), NaN)
    const parsedLimit =
      Number.isInteger(limitValue) && limitValue > 0 ? limitValue : undefined

    return {
      sort: isUserQuizzesSort(sortParam) ? sortParam : 'updated',
      order: isUserQuizzesOrder(orderParam) ? orderParam : 'desc',
      limit: parsedLimit,
      offset: Math.max(0, parseNumber(searchParams.get('offset'), 0)),
    }
  }, [searchParams])

  const pageSize = useMemo(
    () =>
      userQuizzesOptions.limit === undefined
        ? DEFAULT_PAGE_SIZE
        : {
            desktop: userQuizzesOptions.limit,
            tablet: userQuizzesOptions.limit,
            mobile: userQuizzesOptions.limit,
          },
    [userQuizzesOptions.limit],
  )

  const {
    items: quizzes,
    itemsPerPage,
    isLoading,
    isError,
    hasMore,
    isLoadingMore,
    loadMore,
  } = useResponsiveInfiniteOffsetQuery({
    queryKey: [
      'userPublicQuizzes',
      userId,
      userQuizzesOptions.sort,
      userQuizzesOptions.order,
      userQuizzesOptions.limit,
      userQuizzesOptions.offset,
    ],
    initialOffset: userQuizzesOptions.offset ?? 0,
    queryFn: ({ limit, offset }) =>
      getUserPublicQuizzes(userId, {
        sort: userQuizzesOptions.sort,
        order: userQuizzesOptions.order,
        limit,
        offset,
      }),
    getResults: (page) => page.results,
    getTotal: (page) => page.total,
    pageSize,
    enabled: userId.length > 0,
  })

  const discoveryQuizzes = useMemo(
    () => toDiscoveryQuizCards(quizzes),
    [quizzes],
  )

  return (
    <UserQuizzesPageUI
      quizzes={discoveryQuizzes}
      isLoading={isLoading}
      isLoadingMore={isLoadingMore}
      isError={isError}
      hasMore={!!hasMore}
      skeletonCount={itemsPerPage ?? 20}
      onLoadMore={loadMore}
    />
  )
}

export default UserQuizzesPage
