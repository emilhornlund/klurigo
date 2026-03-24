import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { act } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const h = vi.hoisted(() => ({
  useDeviceSizeTypeMock: vi.fn(),
}))

vi.mock('../useDeviceSizeType', () => ({
  useDeviceSizeType: () => h.useDeviceSizeTypeMock(),
}))

import { DeviceType } from '../device-size.types'

import { useResponsiveInfiniteOffsetQuery } from './useResponsiveInfiniteOffsetQuery'

type TestPage = {
  readonly results: readonly string[]
  readonly total: number
}

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  })

  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )

  return wrapper
}

const renderResponsiveInfiniteOffsetQuery = (
  queryFn: (params: {
    readonly limit: number
    readonly offset: number
  }) => Promise<TestPage>,
  enabled = true,
  initialOffset = 0,
) =>
  renderHook(
    () =>
      useResponsiveInfiniteOffsetQuery({
        queryKey: ['test-query'],
        initialOffset,
        queryFn,
        getResults: (page) => page.results,
        getTotal: (page) => page.total,
        enabled,
      }),
    {
      wrapper: createWrapper(),
    },
  )

describe('useResponsiveInfiniteOffsetQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    h.useDeviceSizeTypeMock.mockReturnValue(DeviceType.Desktop)
  })

  it('query does not run until itemsPerPage is defined', () => {
    h.useDeviceSizeTypeMock.mockReturnValue(undefined)
    const queryFn = vi.fn<
      (params: {
        readonly limit: number
        readonly offset: number
      }) => Promise<TestPage>
    >(() => Promise.resolve({ results: [], total: 0 }))

    const { result } = renderResponsiveInfiniteOffsetQuery(queryFn)

    expect(result.current.itemsPerPage).toBeUndefined()
    expect(result.current.isLoading).toBe(false)
    expect(queryFn).not.toHaveBeenCalled()
  })

  it('pages are flattened into items', async () => {
    const queryFn = vi.fn<
      (params: {
        readonly limit: number
        readonly offset: number
      }) => Promise<TestPage>
    >(({ offset }) =>
      Promise.resolve(
        offset === 0
          ? { results: ['a', 'b'], total: 3 }
          : { results: ['c'], total: 3 },
      ),
    )

    const { result } = renderResponsiveInfiniteOffsetQuery(queryFn)

    await waitFor(() => {
      expect(result.current.items).toEqual(['a', 'b'])
    })

    act(() => {
      result.current.loadMore()
    })

    await waitFor(() => {
      expect(result.current.items).toEqual(['a', 'b', 'c'])
    })
  })

  it('hasMore calculation works correctly', async () => {
    const queryFn = vi.fn<
      (params: {
        readonly limit: number
        readonly offset: number
      }) => Promise<TestPage>
    >(({ offset }) =>
      Promise.resolve(
        offset === 0
          ? { results: ['a', 'b'], total: 3 }
          : { results: ['c'], total: 3 },
      ),
    )

    const { result } = renderResponsiveInfiniteOffsetQuery(queryFn)

    await waitFor(() => {
      expect(result.current.hasMore).toBe(true)
    })

    act(() => {
      result.current.loadMore()
    })

    await waitFor(() => {
      expect(result.current.hasMore).toBe(false)
    })
  })

  it('loadMore triggers next page', async () => {
    const queryFn = vi.fn<
      (params: {
        readonly limit: number
        readonly offset: number
      }) => Promise<TestPage>
    >(({ offset }) =>
      Promise.resolve(
        offset === 0
          ? { results: ['a', 'b'], total: 3 }
          : { results: ['c'], total: 3 },
      ),
    )

    const { result } = renderResponsiveInfiniteOffsetQuery(queryFn)

    await waitFor(() => {
      expect(result.current.hasMore).toBe(true)
    })

    act(() => {
      result.current.loadMore()
    })

    await waitFor(() => {
      expect(queryFn).toHaveBeenCalledWith({ limit: 20, offset: 2 })
    })
  })

  it('loadMore does nothing while fetching', async () => {
    let resolveNextPage!: (value: TestPage) => void
    const queryFn = vi.fn<
      (params: {
        readonly limit: number
        readonly offset: number
      }) => Promise<TestPage>
    >(({ offset }) => {
      if (offset === 0) {
        return Promise.resolve({ results: ['a', 'b'], total: 3 })
      }

      return new Promise<TestPage>((resolve) => {
        resolveNextPage = resolve
      })
    })

    const { result } = renderResponsiveInfiniteOffsetQuery(queryFn)

    await waitFor(() => {
      expect(result.current.items).toEqual(['a', 'b'])
    })

    act(() => {
      result.current.loadMore()
    })

    await waitFor(() => {
      expect(result.current.isLoadingMore).toBe(true)
    })

    act(() => {
      result.current.loadMore()
    })

    expect(queryFn).toHaveBeenCalledTimes(2)

    resolveNextPage({ results: ['c'], total: 3 })

    await waitFor(() => {
      expect(result.current.items).toEqual(['a', 'b', 'c'])
    })
  })

  it('loadMore does nothing when there is no next page', async () => {
    const queryFn = vi.fn<
      (params: {
        readonly limit: number
        readonly offset: number
      }) => Promise<TestPage>
    >(() => Promise.resolve({ results: ['a', 'b'], total: 2 }))

    const { result } = renderResponsiveInfiniteOffsetQuery(queryFn)

    await waitFor(() => {
      expect(result.current.hasMore).toBe(false)
    })

    act(() => {
      result.current.loadMore()
    })

    expect(queryFn).toHaveBeenCalledTimes(1)
  })

  it('respects enabled=false', () => {
    const queryFn = vi.fn<
      (params: {
        readonly limit: number
        readonly offset: number
      }) => Promise<TestPage>
    >(() => Promise.resolve({ results: ['a', 'b'], total: 2 }))

    const { result } = renderResponsiveInfiniteOffsetQuery(queryFn, false)

    expect(result.current.isLoading).toBe(false)
    expect(queryFn).not.toHaveBeenCalled()
  })

  it('uses the provided initial offset for the first page', async () => {
    const queryFn = vi.fn<
      (params: {
        readonly limit: number
        readonly offset: number
      }) => Promise<TestPage>
    >(() => Promise.resolve({ results: ['c', 'd'], total: 6 }))

    renderResponsiveInfiniteOffsetQuery(queryFn, true, 2)

    await waitFor(() => {
      expect(queryFn).toHaveBeenCalledWith({ limit: 20, offset: 2 })
    })
  })
})
