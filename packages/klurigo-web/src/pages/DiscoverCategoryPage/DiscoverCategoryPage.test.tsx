import {
  GameMode,
  LanguageCode,
  QuizCategory,
  type QuizResponseDto,
  QuizVisibility,
} from '@klurigo/common'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import DiscoverCategoryPage from './DiscoverCategoryPage'

const { getPublicQuizzes } = vi.hoisted(() => ({ getPublicQuizzes: vi.fn() }))
vi.mock('../../api', () => ({
  useKlurigoServiceClient: () => ({ getPublicQuizzes }),
}))
vi.mock('../../context/auth', () => ({
  useAuthContext: () => ({ isUserAuthenticated: true, revokeUser: vi.fn() }),
}))

const quiz = (id: string): QuizResponseDto => ({
  id,
  title: `Science quiz ${id}`,
  category: QuizCategory.Science,
  languageCode: LanguageCode.English,
  mode: GameMode.Classic,
  visibility: QuizVisibility.Public,
  numberOfQuestions: 10,
  author: { id: 'author', name: 'Author' },
  gameplaySummary: { count: 0, totalPlayerCount: 0 },
  ratingSummary: { stars: 0, comments: 0, total: 0 },
  created: new Date(),
  updated: new Date(),
})

const Location = () => {
  const location = useLocation()
  return (
    <div data-testid="location">
      {location.pathname}
      {location.search}
    </div>
  )
}
const renderPage = (url = '/discover/category/SCIENCE') =>
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }>
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route
            path="/discover/category/:category"
            element={<DiscoverCategoryPage />}
          />
          <Route path="/discover" element={<h1>Discover</h1>} />
        </Routes>
        <Location />
      </MemoryRouter>
    </QueryClientProvider>,
  )

describe('DiscoverCategoryPage', () => {
  beforeEach(() => {
    getPublicQuizzes.mockReset()
  })

  it('loads route category and URL refinements without rendering the category rail', async () => {
    getPublicQuizzes.mockResolvedValue({ results: [quiz('1')], total: 1 })
    renderPage(
      '/discover/category/SCIENCE?search=space&languageCode=en&mode=CLASSIC&category=HISTORY',
    )
    await screen.findByTestId('category-quiz-grid')
    expect(getPublicQuizzes).toHaveBeenCalledWith(
      expect.objectContaining({
        category: QuizCategory.Science,
        search: 'space',
        languageCode: LanguageCode.English,
        mode: GameMode.Classic,
        offset: 0,
      }),
    )
    expect(
      screen.getByRole('heading', { name: 'Science quizzes' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('region', { name: 'Browse by category' }),
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Back to discovery' }),
    ).toHaveAttribute('href', '/discover')
  })

  it('loads all three pages and resets pagination when refinements change', async () => {
    getPublicQuizzes.mockImplementation(({ offset, limit }) =>
      Promise.resolve({
        results: Array.from({ length: Math.min(limit, 45 - offset) }, (_, i) =>
          quiz(`${offset + i}`),
        ),
        total: 45,
      }),
    )
    renderPage()
    await screen.findByText('Science quiz 19')
    await userEvent.click(
      screen.getByRole('button', { name: 'Load more quizzes' }),
    )
    await screen.findByText('Science quiz 39')
    await userEvent.click(
      screen.getByRole('button', { name: 'Load more quizzes' }),
    )
    await screen.findByText('Science quiz 44')
    expect(
      screen.queryByRole('button', { name: 'Load more quizzes' }),
    ).not.toBeInTheDocument()
    await userEvent.type(screen.getByPlaceholderText('Search'), 'space')
    await userEvent.click(
      screen.getByRole('button', { name: 'Search quizzes' }),
    )
    await waitFor(() =>
      expect(getPublicQuizzes).toHaveBeenLastCalledWith(
        expect.objectContaining({
          category: QuizCategory.Science,
          search: 'space',
          offset: 0,
        }),
      ),
    )
    expect(screen.queryByText('Science quiz 44')).not.toBeInTheDocument()
    expect(screen.getByTestId('location')).toHaveTextContent(
      '/discover/category/SCIENCE?search=space',
    )
  })

  it('clears refinements while retaining the category and returns to Discover via a link', async () => {
    getPublicQuizzes.mockResolvedValue({ results: [], total: 0 })
    renderPage('/discover/category/SCIENCE?search=none')
    await screen.findByTestId('category-empty-state')
    await userEvent.click(screen.getByRole('button', { name: 'Clear filters' }))
    expect(screen.getByTestId('location')).toHaveTextContent(
      '/discover/category/SCIENCE',
    )
    await waitFor(() =>
      expect(getPublicQuizzes).toHaveBeenLastCalledWith(
        expect.objectContaining({
          category: QuizCategory.Science,
          search: undefined,
        }),
      ),
    )
    expect(
      screen.queryByRole('button', { name: 'Clear filters' }),
    ).not.toBeInTheDocument()
    await userEvent.click(
      screen.getByRole('link', { name: 'Back to discovery' }),
    )
    expect(
      screen.getByRole('heading', { name: 'Discover' }),
    ).toBeInTheDocument()
  })

  it('retains loaded Other quizzes and retries the failed next page instead of restarting pagination', async () => {
    let rejectNextPage!: (reason: Error) => void
    getPublicQuizzes.mockImplementation(({ offset }) =>
      offset === 0
        ? Promise.resolve({
            results: Array.from({ length: 20 }, (_, i) => quiz(`${i}`)),
            total: 25,
          })
        : new Promise((_, reject) => {
            rejectNextPage = reject
          }),
    )
    renderPage('/discover/category/OTHER')
    await screen.findByText('Science quiz 19')
    await userEvent.click(
      screen.getByRole('button', { name: 'Load more quizzes' }),
    )
    expect(
      screen.getByTestId('test-load-more-category-quizzes-button'),
    ).toBeDisabled()
    rejectNextPage(new Error('temporary failure'))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'We couldn’t load more quizzes',
    )
    expect(screen.getAllByTestId('quiz-discovery-card')).toHaveLength(20)
    expect(
      screen.queryByTestId('test-retry-category-quizzes-button'),
    ).not.toBeInTheDocument()
    getPublicQuizzes.mockResolvedValue({
      results: Array.from({ length: 5 }, (_, i) => quiz(`${20 + i}`)),
      total: 25,
    })
    await userEvent.click(
      screen.getByRole('button', { name: 'Try loading more again' }),
    )
    await screen.findByText('Science quiz 24')
    expect(screen.getAllByTestId('quiz-discovery-card')).toHaveLength(25)
    expect(getPublicQuizzes).toHaveBeenLastCalledWith(
      expect.objectContaining({ category: QuizCategory.Other, offset: 20 }),
    )
    expect(
      getPublicQuizzes.mock.calls.filter(([options]) => options.offset === 0),
    ).toHaveLength(1)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(
      screen.queryByTestId('test-load-more-category-quizzes-button'),
    ).not.toBeInTheDocument()
  })

  it('changes the category route from filters and preserves refinements', async () => {
    getPublicQuizzes.mockResolvedValue({ results: [], total: 0 })
    renderPage('/discover/category/SCIENCE?search=space')
    await screen.findByTestId('category-empty-state')
    await userEvent.click(screen.getByRole('button', { name: 'Open filters' }))
    await userEvent.selectOptions(
      screen.getByTestId('test-category-select-select'),
      QuizCategory.History,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Apply' }))
    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent(
        '/discover/category/HISTORY?search=space',
      ),
    )
    expect(
      screen.getByRole('heading', { name: 'History quizzes' }),
    ).toBeInTheDocument()
    await waitFor(() =>
      expect(getPublicQuizzes).toHaveBeenLastCalledWith(
        expect.objectContaining({
          category: QuizCategory.History,
          search: 'space',
          offset: 0,
        }),
      ),
    )
  })

  it('shows a useful unavailable state for an unknown category without making a request', () => {
    renderPage('/discover/category/INVALID')
    expect(
      screen.getByRole('heading', { name: 'Category not found' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Back to discovery' }),
    ).toBeInTheDocument()
    expect(getPublicQuizzes).not.toHaveBeenCalled()
  })

  it('distinguishes loading, empty and failed requests and supports retry', async () => {
    let rejectRequest!: (reason: Error) => void
    getPublicQuizzes.mockReturnValue(
      new Promise((_, reject) => {
        rejectRequest = reject
      }),
    )
    renderPage()
    expect(screen.getByRole('status')).toHaveTextContent('Loading quizzes')
    rejectRequest(new Error('offline'))
    await screen.findByRole('alert')
    expect(screen.queryByTestId('category-empty-state')).not.toBeInTheDocument()
    getPublicQuizzes.mockResolvedValue({ results: [], total: 0 })
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByTestId('category-empty-state')).toHaveTextContent(
      'No public quizzes in Science yet',
    )
  })
})
