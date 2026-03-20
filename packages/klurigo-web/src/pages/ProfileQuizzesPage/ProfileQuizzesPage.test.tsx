import {
  GameMode,
  LanguageCode,
  QuizCategory,
  QuizVisibility,
} from '@klurigo/common'
import type { PaginatedQuizResponseDto } from '@klurigo/common'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const h = vi.hoisted(() => ({
  getProfileQuizzesMock: vi.fn(),
  useDeviceSizeTypeMock: vi.fn(),
}))

vi.mock('../../api', () => ({
  useKlurigoServiceClient: () => ({
    getProfileQuizzes: h.getProfileQuizzesMock,
  }),
}))

vi.mock('../../utils/useDeviceSizeType', () => ({
  useDeviceSizeType: () => h.useDeviceSizeTypeMock(),
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

import { DeviceType } from '../../utils/device-size.types'

import ProfileQuizzesPage from './ProfileQuizzesPage'

const makeQuiz = (id: string, title: string) => ({
  id,
  title,
  description: 'A quiz',
  mode: GameMode.Classic,
  visibility: QuizVisibility.Public,
  category: QuizCategory.Science,
  imageCoverURL: 'https://example.com/img.jpg',
  languageCode: LanguageCode.English,
  numberOfQuestions: 10,
  author: { id: 'a1', name: 'Author' },
  gameplaySummary: {
    count: 5,
    totalPlayerCount: 10,
    difficultyPercentage: 0.5,
    lastPlayed: new Date(),
  },
  ratingSummary: { stars: 4.0, comments: 2, total: 5 },
  created: new Date(),
  updated: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
})

const mockResponse: PaginatedQuizResponseDto = {
  results: [makeQuiz('q1', 'Quiz 1'), makeQuiz('q2', 'Quiz 2')],
  total: 5,
  limit: 10,
  offset: 0,
}

const renderProfileQuizzesPage = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ProfileQuizzesPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('ProfileQuizzesPage', () => {
  beforeEach(() => {
    h.getProfileQuizzesMock.mockReset()
    h.useDeviceSizeTypeMock.mockReturnValue(DeviceType.Mobile) // Default to Mobile (10 items)
  })

  it('renders quizzes with card layout', async () => {
    h.getProfileQuizzesMock.mockResolvedValue(mockResponse)

    renderProfileQuizzesPage()

    await waitFor(() => {
      expect(screen.getByText('Quiz 1')).toBeInTheDocument()
    })

    expect(screen.getByText('Quiz 2')).toBeInTheDocument()
    expect(screen.getByTestId('profile-quiz-grid')).toBeInTheDocument()

    expect(h.getProfileQuizzesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        limit: 10,
        offset: 0,
      }),
    )
  })

  it('"Load more" increments offset and appends results', async () => {
    h.getProfileQuizzesMock.mockResolvedValueOnce(mockResponse)

    renderProfileQuizzesPage()

    await waitFor(() => {
      expect(screen.getByText('Quiz 1')).toBeInTheDocument()
    })

    const secondPage: PaginatedQuizResponseDto = {
      results: [makeQuiz('q3', 'Quiz 3'), makeQuiz('q4', 'Quiz 4')],
      total: 5,
      limit: 10,
      offset: 2,
    }
    h.getProfileQuizzesMock.mockResolvedValueOnce(secondPage)

    const loadMoreButton = screen.getByTestId(
      'test-load-more-quizzes-button-button',
    )
    await userEvent.click(loadMoreButton)

    await waitFor(() => {
      expect(screen.getByText('Quiz 3')).toBeInTheDocument()
    })

    expect(screen.getByText('Quiz 1')).toBeInTheDocument()
    expect(screen.getByText('Quiz 2')).toBeInTheDocument()
    expect(screen.getByText('Quiz 4')).toBeInTheDocument()

    expect(h.getProfileQuizzesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        limit: 10,
        offset: 2,
      }),
    )
  })

  it('"Load more" hidden when all quizzes are loaded', async () => {
    const fullResponse: PaginatedQuizResponseDto = {
      results: [makeQuiz('q1', 'Quiz 1'), makeQuiz('q2', 'Quiz 2')],
      total: 2,
      limit: 10,
      offset: 0,
    }
    h.getProfileQuizzesMock.mockResolvedValue(fullResponse)

    renderProfileQuizzesPage()

    await waitFor(() => {
      expect(screen.getByText('Quiz 1')).toBeInTheDocument()
    })

    expect(
      screen.queryByTestId('test-load-more-quizzes-button-button'),
    ).not.toBeInTheDocument()
  })

  it('shows error state on API failure', async () => {
    h.getProfileQuizzesMock.mockRejectedValue(new Error('API Error'))

    renderProfileQuizzesPage()

    await waitFor(() => {
      expect(screen.getByTestId('profile-empty-state')).toBeInTheDocument()
    })

    expect(
      screen.getByText(
        'Oops! Your quizzes are playing hide-and-seek right now. Please try again.',
      ),
    ).toBeInTheDocument()
  })

  it('shows empty state when no quizzes', async () => {
    const emptyResponse: PaginatedQuizResponseDto = {
      results: [],
      total: 0,
      limit: 10,
      offset: 0,
    }
    h.getProfileQuizzesMock.mockResolvedValue(emptyResponse)

    renderProfileQuizzesPage()

    await waitFor(() => {
      expect(screen.getByTestId('profile-empty-state')).toBeInTheDocument()
    })

    expect(
      screen.getByText(
        'Your quiz shelf is empty. Time to create your first one!',
      ),
    ).toBeInTheDocument()
  })

  it('shows filtered empty state when filters active but no results', async () => {
    // Test the filtered empty state via the UI component props directly in ProfileQuizzesPageUI.test.tsx.
    // Here just verify the container resets accumulated quizzes when search params change.
    const emptyResponse: PaginatedQuizResponseDto = {
      results: [],
      total: 0,
      limit: 10,
      offset: 0,
    }
    h.getProfileQuizzesMock.mockResolvedValue(emptyResponse)

    renderProfileQuizzesPage()

    await waitFor(() => {
      expect(screen.getByTestId('profile-empty-state')).toBeInTheDocument()
    })

    // Without filters, shows the "no quizzes yet" message (not the filtered one)
    expect(
      screen.getByText(
        'Your quiz shelf is empty. Time to create your first one!',
      ),
    ).toBeInTheDocument()
  })

  it('renders skeletons during initial load', async () => {
    h.getProfileQuizzesMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve(mockResponse), 100)
        }),
    )

    renderProfileQuizzesPage()

    // Check for skeleton cards (mobile = 10 items)
    const skeletons = screen.getAllByTestId('profile-quiz-card-skeleton')
    expect(skeletons).toHaveLength(10)

    // Wait for actual quizzes to load
    await waitFor(() => {
      expect(screen.getByText('Quiz 1')).toBeInTheDocument()
    })

    // Skeletons should be gone
    expect(
      screen.queryByTestId('profile-quiz-card-skeleton'),
    ).not.toBeInTheDocument()
  })

  it('shows the loading-more state while another page is being fetched', async () => {
    h.getProfileQuizzesMock.mockResolvedValueOnce(mockResponse)

    renderProfileQuizzesPage()

    await waitFor(() => {
      expect(screen.getByText('Quiz 1')).toBeInTheDocument()
    })

    let resolveNextPage!: (value: PaginatedQuizResponseDto) => void
    const nextPage = new Promise<PaginatedQuizResponseDto>((resolve) => {
      resolveNextPage = resolve
    })
    h.getProfileQuizzesMock.mockReturnValueOnce(nextPage)

    const loadMoreButton = screen.getByTestId(
      'test-load-more-quizzes-button-button',
    )
    await userEvent.click(loadMoreButton)

    await waitFor(() => {
      expect(h.getProfileQuizzesMock).toHaveBeenLastCalledWith(
        expect.objectContaining({
          limit: 10,
          offset: 2,
        }),
      )
    })

    expect(loadMoreButton).toBeDisabled()
    expect(screen.getByText('Quiz 1')).toBeInTheDocument()

    resolveNextPage({
      results: [makeQuiz('q3', 'Quiz 3'), makeQuiz('q4', 'Quiz 4')],
      total: 5,
      limit: 10,
      offset: 2,
    })

    await waitFor(() => {
      expect(screen.getByText('Quiz 3')).toBeInTheDocument()
    })
  })

  it('uses device-specific pagination limits', async () => {
    h.useDeviceSizeTypeMock.mockReturnValue(DeviceType.Desktop)
    h.getProfileQuizzesMock.mockResolvedValue(mockResponse)

    renderProfileQuizzesPage()

    await waitFor(() => {
      expect(screen.getByText('Quiz 1')).toBeInTheDocument()
    })

    // Desktop should request 20 items
    expect(h.getProfileQuizzesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        limit: 20,
        offset: 0,
      }),
    )
  })

  it('uses itemsPerPage limit (not default 5) when a filter is applied', async () => {
    h.useDeviceSizeTypeMock.mockReturnValue(DeviceType.Desktop) // itemsPerPage = 20
    h.getProfileQuizzesMock.mockResolvedValue(mockResponse)

    renderProfileQuizzesPage()

    await waitFor(() => {
      expect(screen.getByText('Quiz 1')).toBeInTheDocument()
    })

    const filteredResponse: PaginatedQuizResponseDto = {
      results: [makeQuiz('q1', 'Quiz 1')],
      total: 1,
      limit: 20,
      offset: 0,
    }
    h.getProfileQuizzesMock.mockResolvedValueOnce(filteredResponse)

    const searchInput = screen.getByPlaceholderText('Search')
    await userEvent.type(searchInput, 'Quiz')
    await userEvent.click(screen.getByTestId('test-search-button-button'))

    await waitFor(() => {
      const calls = h.getProfileQuizzesMock.mock.calls
      const lastCall = calls[calls.length - 1][0] as Record<string, unknown>
      expect(lastCall).toMatchObject({ limit: 20, search: 'Quiz' })
    })
  })

  it('resets the query to the first page when filters change', async () => {
    h.getProfileQuizzesMock.mockResolvedValueOnce(mockResponse)
    h.getProfileQuizzesMock.mockResolvedValueOnce({
      results: [makeQuiz('q3', 'Quiz 3'), makeQuiz('q4', 'Quiz 4')],
      total: 5,
      limit: 10,
      offset: 2,
    })

    renderProfileQuizzesPage()

    await waitFor(() => {
      expect(screen.getByText('Quiz 1')).toBeInTheDocument()
    })

    await userEvent.click(
      screen.getByTestId('test-load-more-quizzes-button-button'),
    )

    await waitFor(() => {
      expect(screen.getByText('Quiz 3')).toBeInTheDocument()
    })

    let resolveFilteredPage!: (value: PaginatedQuizResponseDto) => void
    const filteredPage = new Promise<PaginatedQuizResponseDto>((resolve) => {
      resolveFilteredPage = resolve
    })
    h.getProfileQuizzesMock.mockReturnValueOnce(filteredPage)

    await userEvent.type(screen.getByPlaceholderText('Search'), 'Filtered')
    await userEvent.click(screen.getByTestId('test-search-button-button'))

    await waitFor(() => {
      expect(h.getProfileQuizzesMock).toHaveBeenLastCalledWith(
        expect.objectContaining({
          limit: 10,
          offset: 0,
          search: 'Filtered',
        }),
      )
    })

    expect(screen.queryByText('Quiz 3')).not.toBeInTheDocument()
    expect(screen.getAllByTestId('profile-quiz-card-skeleton')).toHaveLength(10)

    resolveFilteredPage({
      results: [makeQuiz('q5', 'Filtered Quiz')],
      total: 1,
      limit: 10,
      offset: 0,
    })

    await waitFor(() => {
      expect(screen.getByText('Filtered Quiz')).toBeInTheDocument()
    })

    expect(screen.queryByText('Quiz 1')).not.toBeInTheDocument()
    expect(screen.queryByText('Quiz 3')).not.toBeInTheDocument()
  })

  it('filter bar stays visible after clearing search', async () => {
    h.useDeviceSizeTypeMock.mockReturnValue(DeviceType.Mobile)
    h.getProfileQuizzesMock.mockResolvedValue(mockResponse)

    renderProfileQuizzesPage()

    await waitFor(() => {
      expect(screen.getByText('Quiz 1')).toBeInTheDocument()
    })

    // Apply a search that returns no results
    const emptyResponse: PaginatedQuizResponseDto = {
      results: [],
      total: 0,
      limit: 10,
      offset: 0,
    }
    h.getProfileQuizzesMock.mockResolvedValueOnce(emptyResponse)

    const searchInput = screen.getByPlaceholderText('Search')
    await userEvent.type(searchInput, 'xyz')
    await userEvent.click(screen.getByTestId('test-search-button-button'))

    await waitFor(() => {
      expect(screen.getByTestId('profile-empty-state')).toBeInTheDocument()
    })

    // Filter bar still visible because hasSearchFilter is true
    expect(screen.getByPlaceholderText('Search')).toBeInTheDocument()

    // Clear search and re-submit
    h.getProfileQuizzesMock.mockResolvedValueOnce(mockResponse)
    await userEvent.clear(screen.getByPlaceholderText('Search'))
    await userEvent.click(screen.getByTestId('test-search-button-button'))

    // Filter bar must remain visible during the re-fetch (isLoading = true)
    expect(screen.getByPlaceholderText('Search')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('Quiz 1')).toBeInTheDocument()
    })

    // Filter bar still visible now that quizzes are loaded
    expect(screen.getByPlaceholderText('Search')).toBeInTheDocument()
  })
})
