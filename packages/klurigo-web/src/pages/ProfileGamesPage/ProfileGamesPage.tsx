import { GameStatus } from '@klurigo/common'
import { useQuery } from '@tanstack/react-query'
import type { FC } from 'react'
import { useCallback, useId, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useKlurigoServiceClient } from '../../api'
import { useResponsiveInfiniteOffsetQuery } from '../../utils/hooks'

import { ProfileGamesPageUI } from './components'
import { useGameHistorySearchOptions } from './useGameHistorySearchOptions'

const ProfileGamesPage: FC = () => {
  const navigate = useNavigate()
  const { getProfileGames, authenticateGame } = useKlurigoServiceClient()
  const { options, setOptions } = useGameHistorySearchOptions()

  // Scope revisions to this mount because the query cache outlives the route.
  const historyVisitId = useId()
  const filterKey = JSON.stringify(options)
  const [pagination, setPagination] = useState({ filterKey, revision: 0 })
  if (pagination.filterKey !== filterKey) {
    setPagination({ filterKey, revision: pagination.revision + 1 })
  }

  const {
    items: games,
    itemsPerPage,
    isLoading: isLoadingGames,
    isError,
    hasMore,
    isLoadingMore,
    loadMore,
  } = useResponsiveInfiniteOffsetQuery({
    queryKey: ['myProfileGames', options, historyVisitId, pagination.revision],
    queryFn: ({ limit, offset }) =>
      getProfileGames({ ...options, limit, offset }),
    getResults: (page) => page.results,
    getTotal: (page) => page.total,
    pageSize: {
      desktop: 20,
      tablet: 15,
      mobile: 10,
    },
  })

  const isLoading = itemsPerPage === undefined || isLoadingGames
  const isFiltered = Boolean(
    options.search || options.participantType || options.mode || options.status,
  )
  const isFilteredEmpty =
    isFiltered && !isLoading && !isError && games.length === 0
  // A filtered total of zero cannot tell us whether the user has any history.
  const unfilteredHistory = useQuery({
    queryKey: ['myProfileGames', 'unfilteredTotal'],
    queryFn: () => getProfileGames({ limit: 5, offset: 0 }),
    enabled: isFilteredEmpty,
    staleTime: 60_000,
    retry: false,
  })

  const handleClickGame = useCallback(
    async (id: string, status: GameStatus) => {
      if (status === GameStatus.Active) {
        try {
          await authenticateGame({ gameId: id })
          navigate('/game')
        } catch {
          // Authentication failed — do not navigate
        }
        return
      }

      if (status === GameStatus.Completed) {
        navigate(`/game/results/${id}`)
      }
    },
    [authenticateGame, navigate],
  )

  return (
    <ProfileGamesPageUI
      games={games}
      filter={options}
      onChangeFilter={setOptions}
      hasNoMatchingGames={
        isFilteredEmpty && unfilteredHistory.data?.total !== 0
      }
      isLoading={isLoading || (isFilteredEmpty && unfilteredHistory.isLoading)}
      isLoadingMore={isLoadingMore}
      isError={isError}
      hasMore={!!hasMore}
      skeletonCount={itemsPerPage ?? 20}
      onLoadMore={loadMore}
      onClick={handleClickGame}
    />
  )
}

export default ProfileGamesPage
