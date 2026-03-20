import {
  DiscoverySectionKey,
  GameMode,
  LanguageCode,
  QuizCategory,
} from '@klurigo/common'
import type { DiscoverySectionPageResponseDto } from '@klurigo/common'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const h = vi.hoisted(() => ({
  getSectionQuizzesMock: vi.fn(),
  useDeviceSizeTypeMock: vi.fn(),
}))

vi.mock('../../api', () => ({
  useKlurigoServiceClient: () => ({
    getSectionQuizzes: h.getSectionQuizzesMock,
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

import DiscoverSectionPage from './DiscoverSectionPage'

const makeQuiz = (id: string, title: string) => ({
  id,
  title,
  description: 'A quiz',
  imageCoverURL: 'https://example.com/img.jpg',
  category: QuizCategory.Science,
  languageCode: LanguageCode.English,
  mode: GameMode.Classic,
  numberOfQuestions: 10,
  author: { id: 'a1', name: 'Author' },
  gameplaySummary: { count: 5, totalPlayerCount: 10 },
  ratingSummary: { stars: 4.0, comments: 2, total: 5 },
  created: new Date(),
})

const mockResponse: DiscoverySectionPageResponseDto = {
  key: DiscoverySectionKey.TOP_RATED,
  results: [makeQuiz('q1', 'Quiz 1'), makeQuiz('q2', 'Quiz 2')],
  snapshotTotal: 5,
  limit: 20,
  offset: 0,
}

const renderWithRoute = (key: string) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/discover/section/${key}`]}>
        <Routes>
          <Route
            path="/discover/section/:key"
            element={<DiscoverSectionPage />}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('DiscoverSectionPage', () => {
  beforeEach(() => {
    h.getSectionQuizzesMock.mockReset()
    h.useDeviceSizeTypeMock.mockReturnValue(DeviceType.Desktop)
  })

  it('renders section title from route key', async () => {
    h.getSectionQuizzesMock.mockResolvedValue(mockResponse)

    renderWithRoute('TOP_RATED')

    await waitFor(() => {
      expect(screen.getByText('Top Rated')).toBeInTheDocument()
    })

    expect(
      screen.getByText('Highest rated quizzes by players'),
    ).toBeInTheDocument()

    expect(h.getSectionQuizzesMock).toHaveBeenCalledWith('TOP_RATED', {
      limit: 20,
      offset: 0,
    })
  })

  it('shows the initial loading state without rendering the empty state', async () => {
    let resolveLoad!: (value: DiscoverySectionPageResponseDto) => void
    const deferred = new Promise<DiscoverySectionPageResponseDto>((resolve) => {
      resolveLoad = resolve
    })
    h.getSectionQuizzesMock.mockReturnValue(deferred)

    renderWithRoute('TOP_RATED')

    expect(screen.getByText('Top Rated')).toBeInTheDocument()
    expect(screen.getByTestId('section-quiz-grid')).toBeInTheDocument()
    expect(screen.queryByTestId('section-empty-state')).not.toBeInTheDocument()

    resolveLoad(mockResponse)

    await waitFor(() => {
      expect(screen.getByText('Quiz 1')).toBeInTheDocument()
    })
  })

  it('"Load more" loads the next page, appends results, and shows the loading-more state', async () => {
    h.getSectionQuizzesMock.mockResolvedValueOnce(mockResponse)

    renderWithRoute('TOP_RATED')

    await waitFor(() => {
      expect(screen.getByText('Quiz 1')).toBeInTheDocument()
    })

    let resolveNextPage!: (value: DiscoverySectionPageResponseDto) => void
    const nextPage = new Promise<DiscoverySectionPageResponseDto>((resolve) => {
      resolveNextPage = resolve
    })
    const secondPage: DiscoverySectionPageResponseDto = {
      key: DiscoverySectionKey.TOP_RATED,
      results: [makeQuiz('q3', 'Quiz 3'), makeQuiz('q4', 'Quiz 4')],
      snapshotTotal: 5,
      limit: 20,
      offset: 2,
    }
    h.getSectionQuizzesMock.mockReturnValueOnce(nextPage)

    const loadMoreButton = screen.getByTestId(
      'test-load-more-quizzes-button-button',
    )
    await userEvent.click(loadMoreButton)

    await waitFor(() => {
      expect(h.getSectionQuizzesMock).toHaveBeenCalledWith('TOP_RATED', {
        limit: 20,
        offset: 2,
      })
    })

    expect(loadMoreButton).toBeDisabled()
    expect(screen.getByText('Quiz 1')).toBeInTheDocument()
    expect(screen.getByText('Quiz 2')).toBeInTheDocument()

    resolveNextPage(secondPage)

    await waitFor(() => {
      expect(screen.getByText('Quiz 3')).toBeInTheDocument()
    })

    expect(screen.getByText('Quiz 1')).toBeInTheDocument()
    expect(screen.getByText('Quiz 2')).toBeInTheDocument()
    expect(screen.getByText('Quiz 4')).toBeInTheDocument()

    expect(h.getSectionQuizzesMock).toHaveBeenCalledWith('TOP_RATED', {
      limit: 20,
      offset: 2,
    })
  })

  it('"Load more" hidden when offset + results.length >= snapshotTotal', async () => {
    const fullResponse: DiscoverySectionPageResponseDto = {
      key: DiscoverySectionKey.TOP_RATED,
      results: [makeQuiz('q1', 'Quiz 1'), makeQuiz('q2', 'Quiz 2')],
      snapshotTotal: 2,
      limit: 2,
      offset: 0,
    }
    h.getSectionQuizzesMock.mockResolvedValue(fullResponse)

    renderWithRoute('TOP_RATED')

    await waitFor(() => {
      expect(screen.getByText('Quiz 1')).toBeInTheDocument()
    })

    expect(
      screen.queryByTestId('test-load-more-quizzes-button-button'),
    ).not.toBeInTheDocument()
  })

  it('shows a graceful error state when fetching a valid section fails', async () => {
    h.getSectionQuizzesMock.mockRejectedValue(new Error('Not Found'))

    renderWithRoute('TOP_RATED')

    await waitFor(() => {
      expect(screen.getByTestId('section-empty-state')).toBeInTheDocument()
    })

    expect(
      screen.getByText('This section is not available right now.'),
    ).toBeInTheDocument()
  })

  it('does not fetch when the section key is invalid', () => {
    renderWithRoute('NONEXISTENT')

    expect(h.getSectionQuizzesMock).not.toHaveBeenCalled()
    expect(screen.getByTestId('section-empty-state')).toBeInTheDocument()
    expect(
      screen.getByText('This section is not available right now.'),
    ).toBeInTheDocument()
  })

  it('requests the correct page size for tablet devices', async () => {
    h.useDeviceSizeTypeMock.mockReturnValue(DeviceType.Tablet)
    h.getSectionQuizzesMock.mockResolvedValue(mockResponse)

    renderWithRoute('TOP_RATED')

    await waitFor(() => {
      expect(screen.getByText('Quiz 1')).toBeInTheDocument()
    })

    expect(h.getSectionQuizzesMock).toHaveBeenCalledWith('TOP_RATED', {
      limit: 15,
      offset: 0,
    })
  })
})
