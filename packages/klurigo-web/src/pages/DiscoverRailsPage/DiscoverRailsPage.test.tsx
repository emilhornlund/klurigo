import {
  DiscoverySectionKey,
  GameMode,
  LanguageCode,
  QuizCategory,
  QuizVisibility,
} from '@klurigo/common'
import type {
  DiscoveryResponseDto,
  PaginatedQuizResponseDto,
  QuizResponseDto,
} from '@klurigo/common'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const h = vi.hoisted(() => ({
  getDiscoveryMock: vi.fn(),
  getPublicQuizzesMock: vi.fn(),
}))

vi.mock('../../api', () => ({
  useKlurigoServiceClient: () => ({
    getDiscovery: h.getDiscoveryMock,
    getPublicQuizzes: h.getPublicQuizzesMock,
  }),
}))

vi.mock('../../context/auth', () => ({
  useAuthContext: () => ({
    isUserAuthenticated: true,
    revokeUser: vi.fn(),
  }),
}))

vi.mock('react-router-dom', async () => {
  const actual =
    await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => vi.fn() }
})

import DiscoverRailsPage from './DiscoverRailsPage'

const mockResponse: DiscoveryResponseDto = {
  sections: [
    {
      key: DiscoverySectionKey.FEATURED,
      quizzes: [
        {
          id: 'q1',
          title: 'Test Quiz',
          description: 'A quiz',
          imageCoverURL: 'https://example.com/img.jpg',
          category: QuizCategory.Science,
          languageCode: LanguageCode.English,
          mode: GameMode.Classic,
          numberOfQuestions: 10,
          author: { id: 'a1', name: 'Author' },
          gameplaySummary: {
            count: 5,
            totalPlayerCount: 10,
          },
          ratingSummary: { stars: 4.0, comments: 2, total: 10 },
          created: new Date(),
        },
      ],
    },
  ],
  generatedAt: new Date(),
}

describe('DiscoverRailsPage', () => {
  beforeEach(() => {
    h.getDiscoveryMock.mockReset()
  })

  it('renders sections after loading', async () => {
    h.getDiscoveryMock.mockResolvedValue(mockResponse)

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <DiscoverRailsPage />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    await waitFor(() => {
      expect(screen.getByText('Featured')).toBeInTheDocument()
    })

    expect(h.getDiscoveryMock).toHaveBeenCalledTimes(1)
  })

  it('renders empty state when API returns no sections', async () => {
    h.getDiscoveryMock.mockResolvedValue({
      sections: [],
      generatedAt: null,
    })

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <DiscoverRailsPage />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('empty-state')).toBeInTheDocument()
    })
  })

  it('switches to search mode when a filter is applied', async () => {
    h.getDiscoveryMock.mockResolvedValue({ sections: [], generatedAt: null })

    const quizResult: QuizResponseDto = {
      id: 'r1',
      title: 'History Quiz',
      description: 'Test',
      imageCoverURL: 'https://example.com/r1.jpg',
      category: QuizCategory.History,
      languageCode: LanguageCode.English,
      mode: GameMode.Classic,
      visibility: QuizVisibility.Public,
      numberOfQuestions: 10,
      author: { id: 'a1', name: 'Author' },
      gameplaySummary: { count: 2, totalPlayerCount: 4 },
      ratingSummary: { stars: 4.0, comments: 1, total: 10 },
      created: new Date(),
      updated: new Date(),
    }

    const searchResponse: PaginatedQuizResponseDto = {
      results: [quizResult],
      total: 1,
      limit: 20,
      offset: 0,
    }

    h.getPublicQuizzesMock.mockResolvedValue(searchResponse)

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <DiscoverRailsPage />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    const searchInput = screen.getByTestId('test-search-textfield-textfield')
    await userEvent.type(searchInput, 'history')
    await userEvent.click(screen.getByTestId('test-search-button-button'))

    await waitFor(() => {
      expect(h.getPublicQuizzesMock).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'history' }),
      )
    })

    await waitFor(() => {
      expect(screen.getByTestId('search-quiz-grid')).toBeInTheDocument()
    })
  })

  it('shows search empty state when filter active but no results', async () => {
    h.getDiscoveryMock.mockResolvedValue({ sections: [], generatedAt: null })

    h.getPublicQuizzesMock.mockResolvedValue({
      results: [],
      total: 0,
      limit: 20,
      offset: 0,
    })

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <DiscoverRailsPage />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    const searchInput = screen.getByTestId('test-search-textfield-textfield')
    await userEvent.type(searchInput, 'zzznomatch')
    await userEvent.click(screen.getByTestId('test-search-button-button'))

    await waitFor(() => {
      expect(screen.getByTestId('search-empty-state')).toBeInTheDocument()
    })
  })

  it('shows Load More button and loads additional results when hasMore is true', async () => {
    h.getDiscoveryMock.mockResolvedValue({ sections: [], generatedAt: null })

    const makeResults = (count: number, offset: number): QuizResponseDto[] =>
      Array.from({ length: count }, (_, i) => ({
        id: `r-${offset + i}`,
        title: `Quiz ${offset + i}`,
        category: QuizCategory.Science,
        languageCode: LanguageCode.English,
        mode: GameMode.Classic,
        visibility: QuizVisibility.Public,
        numberOfQuestions: 10,
        author: { id: 'a1', name: 'Author' },
        gameplaySummary: { count: 1, totalPlayerCount: 2 },
        ratingSummary: { stars: 4, comments: 0, total: 10 },
        created: new Date(),
        updated: new Date(),
      }))

    h.getPublicQuizzesMock.mockResolvedValueOnce({
      results: makeResults(20, 0),
      total: 25,
      limit: 20,
      offset: 0,
    })

    h.getPublicQuizzesMock.mockResolvedValueOnce({
      results: makeResults(5, 20),
      total: 25,
      limit: 20,
      offset: 20,
    })

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <DiscoverRailsPage />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    const searchInput = screen.getByTestId('test-search-textfield-textfield')
    await userEvent.type(searchInput, 'science')
    await userEvent.click(screen.getByTestId('test-search-button-button'))

    await waitFor(() => {
      expect(
        screen.getByTestId('test-load-more-button-button'),
      ).toBeInTheDocument()
    })

    await userEvent.click(screen.getByTestId('test-load-more-button-button'))

    await waitFor(() => {
      expect(h.getPublicQuizzesMock).toHaveBeenCalledWith(
        expect.objectContaining({ offset: 20 }),
      )
    })
  })

  it('returns to rails mode after clearing the filter', async () => {
    h.getDiscoveryMock.mockResolvedValue(mockResponse)

    h.getPublicQuizzesMock.mockResolvedValue({
      results: [],
      total: 0,
      limit: 20,
      offset: 0,
    })

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <DiscoverRailsPage />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    const searchInput = screen.getByTestId('test-search-textfield-textfield')
    await userEvent.type(searchInput, 'test')
    await userEvent.click(screen.getByTestId('test-search-button-button'))

    await waitFor(() => {
      expect(screen.getByTestId('search-empty-state')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByTestId('clear-filter-link'))

    await waitFor(() => {
      expect(screen.getByText('Featured')).toBeInTheDocument()
    })
  })
})
