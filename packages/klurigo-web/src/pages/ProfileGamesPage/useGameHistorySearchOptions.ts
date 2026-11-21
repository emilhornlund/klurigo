import { GameMode, GameParticipantType, GameStatus } from '@klurigo/common'
import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

import type { GameHistorySearchOptions } from '../../api/resources/game.resource'

const readOption = <T extends string>(
  params: URLSearchParams,
  key: string,
  allowed: readonly T[],
) => {
  const value = params.get(key)
  return allowed.find((option) => option === value)
}

export const defaultGameHistorySort = {
  sort: 'updated',
  order: 'desc',
} as const

/** Reads and writes applied Game History options without storing pagination in the URL. */
export function useGameHistorySearchOptions() {
  const [params, setParams] = useSearchParams()
  const options: GameHistorySearchOptions = useMemo(
    () => ({
      search: params.get('search') || undefined,
      participantType: readOption(
        params,
        'participantType',
        Object.values(GameParticipantType),
      ),
      mode: readOption(params, 'mode', Object.values(GameMode)),
      status: readOption(params, 'status', [
        GameStatus.Active,
        GameStatus.Completed,
      ]),
      sort:
        readOption(params, 'sort', ['name', 'created', 'updated'] as const) ??
        defaultGameHistorySort.sort,
      order:
        readOption(params, 'order', ['asc', 'desc'] as const) ??
        defaultGameHistorySort.order,
    }),
    [params],
  )

  const setOptions = (next: GameHistorySearchOptions) => {
    const nextParams = new URLSearchParams(params)
    for (const [key, value] of Object.entries({ ...options, ...next })) {
      if (value) nextParams.set(key, value)
      else nextParams.delete(key)
    }
    if (nextParams.toString() !== params.toString()) setParams(nextParams)
  }

  return { options, setOptions }
}
