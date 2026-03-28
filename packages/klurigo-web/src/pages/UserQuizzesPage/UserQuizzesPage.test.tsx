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
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const h = vi.hoisted(() => ({
  getUserPublicQuizzesMock: vi.fn(),
  useDeviceSizeTypeMock: vi.fn(),
}))

vi.mock('../../api', () => ({
  useKlurigoServiceClient: () => ({
    getUserPublicQuizzes: h.getUserPublicQuizzesMock,
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

import { DeviceType } from '../../utils/device-size.types'

import UserQuizzesPage from './UserQuizzesPage'

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

const renderUserQuizzesPage = (initialEntry = '/users/user-1/quizzes') => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/users/:userId/quizzes" element={<UserQuizzesPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('UserQuizzesPage', () => {
  beforeEach(() => {
    h.getUserPublicQuizzesMock.mockReset()
    h.useDeviceSizeTypeMock.mockReturnValue(DeviceType.Mobile)
  })

  it('renders quizzes with card layout', async () => {
    h.getUserPublicQuizzesMock.mockResolvedValue(mockResponse)

    renderUserQuizzesPage()

    await waitFor(() => {
      expect(screen.getByText('Quiz 1')).toBeInTheDocument()
    })

    expect(screen.getByText('Quiz 2')).toBeInTheDocument()
    expect(screen.getByTestId('profile-quiz-grid')).toBeInTheDocument()

    expect(h.getUserPublicQuizzesMock).toHaveBeenCalledWith('user-1', {
      sort: 'updated',
      order: 'desc',
      limit: 10,
      offset: 0,
    })
  })

  it('"Load more" increments offset and appends results', async () => {
    h.getUserPublicQuizzesMock.mockResolvedValueOnce(mockResponse)

    renderUserQuizzesPage()

    await waitFor(() => {
      expect(screen.getByText('Quiz 1')).toBeInTheDocument()
    })

    const secondPage: PaginatedQuizResponseDto = {
      results: [makeQuiz('q3', 'Quiz 3'), makeQuiz('q4', 'Quiz 4')],
      total: 5,
      limit: 10,
      offset: 2,
    }
    h.getUserPublicQuizzesMock.mockResolvedValueOnce(secondPage)

    const loadMoreButton = screen.getByTestId(
      'test-load-more-quizzes-button-button',
    )
    await userEvent.click(loadMoreButton)

    await waitFor(() => {
      expect(screen.getByText('Quiz 3')).toBeInTheDocument()
    })

    expect(h.getUserPublicQuizzesMock).toHaveBeenLastCalledWith('user-1', {
      sort: 'updated',
      order: 'desc',
      limit: 10,
      offset: 2,
    })
  })

  it('uses supported query parameters from the route', async () => {
    h.getUserPublicQuizzesMock.mockResolvedValue(mockResponse)

    renderUserQuizzesPage(
      '/users/user-1/quizzes?sort=updated&order=desc&limit=10&offset=20',
    )

    await waitFor(() => {
      expect(h.getUserPublicQuizzesMock).toHaveBeenCalledWith('user-1', {
        sort: 'updated',
        order: 'desc',
        limit: 10,
        offset: 20,
      })
    })
  })

  it('shows error state on API failure', async () => {
    h.getUserPublicQuizzesMock.mockRejectedValue(new Error('API Error'))

    renderUserQuizzesPage()

    await waitFor(() => {
      expect(screen.getByTestId('profile-empty-state')).toBeInTheDocument()
    })

    expect(
      screen.getByText(
        "Oops! This user's quizzes are playing hide-and-seek right now. Please try again.",
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
    h.getUserPublicQuizzesMock.mockResolvedValue(emptyResponse)

    renderUserQuizzesPage()

    await waitFor(() => {
      expect(screen.getByTestId('profile-empty-state')).toBeInTheDocument()
    })

    expect(
      screen.getByText("This user hasn't shared any quizzes yet."),
    ).toBeInTheDocument()
  })

  it('renders skeletons during initial load', async () => {
    h.getUserPublicQuizzesMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve(mockResponse), 100)
        }),
    )

    renderUserQuizzesPage()

    const skeletons = screen.getAllByTestId('profile-quiz-card-skeleton')
    expect(skeletons).toHaveLength(10)

    await waitFor(() => {
      expect(screen.getByText('Quiz 1')).toBeInTheDocument()
    })

    expect(
      screen.queryByTestId('profile-quiz-card-skeleton'),
    ).not.toBeInTheDocument()
  })

  it('uses device-specific pagination limits', async () => {
    h.useDeviceSizeTypeMock.mockReturnValue(DeviceType.Desktop)
    h.getUserPublicQuizzesMock.mockResolvedValue(mockResponse)

    renderUserQuizzesPage()

    await waitFor(() => {
      expect(screen.getByText('Quiz 1')).toBeInTheDocument()
    })

    expect(h.getUserPublicQuizzesMock).toHaveBeenCalledWith('user-1', {
      sort: 'updated',
      order: 'desc',
      limit: 20,
      offset: 0,
    })
  })
})
