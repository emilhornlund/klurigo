import type {
  PaginatedQuizResponseDto,
  PublicUserProfileResponseDto,
  QuizResponseDto,
} from '@klurigo/common'
import {
  GameMode,
  LanguageCode,
  QuizCategory,
  QuizVisibility,
} from '@klurigo/common'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { formatTimeAgo } from '../../utils/date.utils'
import * as quizUtils from '../../utils/quiz.utils'

const h = vi.hoisted(() => ({
  getUserPublicProfileMock: vi.fn(),
  getUserPublicQuizzesMock: vi.fn(),
}))

vi.mock('../../api', () => ({
  useKlurigoServiceClient: () => ({
    getUserPublicProfile: h.getUserPublicProfileMock,
    getUserPublicQuizzes: h.getUserPublicQuizzesMock,
  }),
}))

vi.mock('../../context/auth', () => ({
  useAuthContext: () => ({
    isUserAuthenticated: true,
    revokeUser: vi.fn(),
  }),
}))

import UserProfilePage from './UserProfilePage'

const profile: PublicUserProfileResponseDto = {
  id: 'user-1',
  nickname: 'QuizMasterJane',
  quizzesCount: 7,
  hostedGamesCount: 11,
  playedGamesCount: 23,
  createdAt: new Date('2024-02-14T10:00:00.000Z'),
}

const makeQuiz = (overrides?: Partial<QuizResponseDto>): QuizResponseDto => ({
  id: 'quiz-1',
  title: 'World capitals',
  description: 'Name the capital cities.',
  mode: GameMode.Classic,
  visibility: QuizVisibility.Public,
  category: QuizCategory.Geography,
  imageCoverURL: 'https://example.com/world-capitals.jpg',
  languageCode: LanguageCode.English,
  numberOfQuestions: 15,
  author: {
    id: 'user-1',
    name: 'QuizMasterJane',
  },
  gameplaySummary: {
    count: 24,
    totalPlayerCount: 120,
  },
  ratingSummary: {
    stars: 4.8,
    comments: 10,
    total: 16,
  },
  created: new Date('2025-01-01T00:00:00.000Z'),
  updated: new Date('2025-01-02T00:00:00.000Z'),
  ...overrides,
})

const renderUserProfilePage = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/users/user-1/profile']}>
        <Routes>
          <Route path="/users/:userId/profile" element={<UserProfilePage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('UserProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders a loading state while the profile query is in flight', () => {
    h.getUserPublicProfileMock.mockReturnValue(new Promise(() => undefined))
    h.getUserPublicQuizzesMock.mockReturnValue(new Promise(() => undefined))

    renderUserProfilePage()

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
  })

  it('renders the public profile details and quiz rail', async () => {
    const quizzesResponse: PaginatedQuizResponseDto = {
      results: [makeQuiz()],
      total: 1,
      limit: 10,
      offset: 0,
    }

    h.getUserPublicProfileMock.mockResolvedValue(profile)
    h.getUserPublicQuizzesMock.mockResolvedValue(quizzesResponse)

    renderUserProfilePage()

    await waitFor(() => {
      expect(screen.getByTestId('user-profile-nickname')).toHaveTextContent(
        'QuizMasterJane',
      )
    })

    expect(screen.queryByTestId('user-profile-joined')).not.toBeInTheDocument()
    expect(screen.getAllByText('Quizzes')).toHaveLength(2)
    expect(screen.getByText('Hosted games')).toBeInTheDocument()
    expect(screen.getByText('Played games')).toBeInTheDocument()
    expect(screen.getByText('Joined')).toBeInTheDocument()
    expect(screen.getByText('7')).toBeInTheDocument()
    expect(screen.getByText('11')).toBeInTheDocument()
    expect(screen.getByText('23')).toBeInTheDocument()
    expect(
      screen.getByText(formatTimeAgo(profile.createdAt)),
    ).toBeInTheDocument()
    expect(screen.getByText('World capitals')).toBeInTheDocument()
    expect(screen.getAllByText('QuizMasterJane')).toHaveLength(2)
    expect(screen.getByTestId('horizontal-rail')).toBeInTheDocument()
    expect(screen.getByTestId('user-profile-see-all-link')).toHaveAttribute(
      'href',
      '/users/user-1/quizzes',
    )

    expect(h.getUserPublicProfileMock).toHaveBeenCalledWith('user-1')
    expect(h.getUserPublicQuizzesMock).toHaveBeenCalledWith('user-1', {
      sort: 'updated',
      order: 'desc',
      limit: 10,
      offset: 0,
    })
  })

  it('renders an empty rail state when the user has no public quizzes', async () => {
    h.getUserPublicProfileMock.mockResolvedValue(profile)
    h.getUserPublicQuizzesMock.mockResolvedValue({
      results: [],
      total: 0,
      limit: 10,
      offset: 0,
    } satisfies PaginatedQuizResponseDto)

    renderUserProfilePage()

    await waitFor(() => {
      expect(screen.getByTestId('user-profile-empty-rail')).toBeInTheDocument()
    })

    expect(
      screen.getByText("This user hasn't shared any quizzes yet."),
    ).toBeInTheDocument()
    expect(
      screen.queryByTestId('user-profile-see-all-link'),
    ).not.toBeInTheDocument()
    expect(screen.queryByTestId('horizontal-rail')).not.toBeInTheDocument()
  })

  it('renders the shared not-found or error state when profile loading fails', async () => {
    h.getUserPublicProfileMock.mockRejectedValue(new Error('Not found'))
    h.getUserPublicQuizzesMock.mockResolvedValue({
      results: [],
      total: 0,
      limit: 10,
      offset: 0,
    } satisfies PaginatedQuizResponseDto)

    renderUserProfilePage()

    await waitFor(() => {
      expect(screen.getByTestId('user-profile-error-state')).toBeInTheDocument()
    })

    expect(
      screen.getByText('This user profile is not available right now.'),
    ).toBeInTheDocument()
  })

  it('maps backend quiz data through the discovery quiz-card mapper before rendering', async () => {
    const toDiscoveryQuizCardsSpy = vi.spyOn(quizUtils, 'toDiscoveryQuizCards')
    const quiz = makeQuiz({
      title: 'Historic inventions',
      author: {
        id: 'user-1',
        name: 'QuizMasterJane',
      },
    })

    h.getUserPublicProfileMock.mockResolvedValue(profile)
    h.getUserPublicQuizzesMock.mockResolvedValue({
      results: [quiz],
      total: 1,
      limit: 10,
      offset: 0,
    } satisfies PaginatedQuizResponseDto)

    renderUserProfilePage()

    await waitFor(() => {
      expect(screen.getByText('Historic inventions')).toBeInTheDocument()
    })

    expect(toDiscoveryQuizCardsSpy).toHaveBeenCalledWith([quiz])
  })
})
