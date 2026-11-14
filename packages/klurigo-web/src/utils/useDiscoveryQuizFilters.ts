import { GameMode, LanguageCode, QuizCategory } from '@klurigo/common'
import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

import type { FilterOptions } from '../components/QuizTableFilter'

/** Ignore unsupported values in shared or manually edited browsing URLs. */
const parseValue = <T extends string>(
  values: readonly T[],
  value: string | null,
) => values.find((candidate) => candidate === value)

/** Serializes supported public quiz refinements without empty values. */
export const discoveryFilterParams = (
  filter: FilterOptions,
): URLSearchParams => {
  const params = new URLSearchParams()
  for (const key of [
    'search',
    'category',
    'languageCode',
    'mode',
    'sort',
    'order',
  ] as const) {
    if (filter[key]) params.set(key, filter[key])
  }
  return params
}

/** URL-backed filters shared by discovery search and dedicated category browsing. */
export const useDiscoveryQuizFilters = () => {
  const [params, setParams] = useSearchParams()
  const filter = useMemo<FilterOptions>(
    () => ({
      search: params.get('search') || undefined,
      category: parseValue(Object.values(QuizCategory), params.get('category')),
      languageCode: parseValue(
        Object.values(LanguageCode),
        params.get('languageCode'),
      ),
      mode: parseValue(Object.values(GameMode), params.get('mode')),
      sort: parseValue(
        ['title', 'created', 'updated'] as const,
        params.get('sort'),
      ),
      order: parseValue(['asc', 'desc'] as const, params.get('order')),
    }),
    [params],
  )

  return {
    filter,
    setFilter: (next: FilterOptions) => setParams(discoveryFilterParams(next)),
  }
}
