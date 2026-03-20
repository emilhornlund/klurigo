import {
  type DiscoverySectionDto,
  DiscoverySectionKey,
  GameMode,
  LanguageCode,
  QuizCategory,
  type QuizResponseDto,
  QuizVisibility,
} from '@klurigo/common'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import DiscoverRailsPageUI from './DiscoverRailsPageUI'

vi.mock('react-router-dom', async () => {
  const actual =
    await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => vi.fn() }
})

vi.mock('../../../../context/auth', () => ({
  useAuthContext: () => ({
    isUserAuthenticated: true,
    revokeUser: vi.fn(),
  }),
}))

const DEFAULT_PROPS = {
  sections: [] as DiscoverySectionDto[],
  isLoading: false,
  filter: {},
  onFilterChange: vi.fn(),
  onClearFilter: vi.fn(),
  searchResults: [] as QuizResponseDto[],
  isSearchLoading: false,
  hasMore: false,
  onLoadMore: vi.fn(),
}

const makeSections = (count: number): DiscoverySectionDto[] =>
  Array.from({ length: count }, (_, i) => ({
    key: Object.values(DiscoverySectionKey)[i % 6],
    title: `Section ${i + 1}`,
    description: `Description ${i + 1}`,
    quizzes: [
      {
        id: `q-${i}`,
        title: `Quiz ${i}`,
        description: 'A quiz',
        imageCoverURL: `https://example.com/${i}.jpg`,
        category: QuizCategory.Science,
        languageCode: LanguageCode.English,
        mode: GameMode.Classic,
        numberOfQuestions: 10,
        author: { id: 'a1', name: 'Author' },
        gameplaySummary: {
          count: 5,
          totalPlayerCount: 10,
        },
        ratingSummary: { stars: 4.0, comments: 2, total: 5 },
        created: new Date(),
      },
    ],
  }))

const makeQuizResults = (count: number): QuizResponseDto[] =>
  Array.from({ length: count }, (_, i) => ({
    id: `r-${i}`,
    title: `Result Quiz ${i}`,
    description: 'A result quiz',
    imageCoverURL: `https://example.com/r${i}.jpg`,
    category: QuizCategory.Science,
    languageCode: LanguageCode.English,
    mode: GameMode.Classic,
    visibility: QuizVisibility.Public,
    numberOfQuestions: 5,
    author: { id: 'a1', name: 'Author' },
    gameplaySummary: { count: 2, totalPlayerCount: 4 },
    ratingSummary: { stars: 3.5, comments: 1, total: 5 },
    created: new Date(),
    updated: new Date(),
  }))

describe('DiscoverRailsPageUI', () => {
  it('renders the correct number of sections', () => {
    const sections = makeSections(3)

    render(
      <MemoryRouter>
        <DiscoverRailsPageUI {...DEFAULT_PROPS} sections={sections} />
      </MemoryRouter>,
    )

    const railSections = screen.getAllByTestId('discovery-rail-section')
    expect(railSections).toHaveLength(3)
  })

  it('renders page title', () => {
    render(
      <MemoryRouter>
        <DiscoverRailsPageUI {...DEFAULT_PROPS} />
      </MemoryRouter>,
    )

    expect(
      screen.getByRole('heading', { name: 'Discover' }),
    ).toBeInTheDocument()
  })

  it('renders empty state when sections is empty', () => {
    render(
      <MemoryRouter>
        <DiscoverRailsPageUI {...DEFAULT_PROPS} />
      </MemoryRouter>,
    )

    expect(screen.getByTestId('empty-state')).toHaveTextContent(
      'More quizzes coming soon — check back later!',
    )
  })

  it('renders skeleton sections when loading', () => {
    render(
      <MemoryRouter>
        <DiscoverRailsPageUI {...DEFAULT_PROPS} isLoading={true} />
      </MemoryRouter>,
    )

    const skeletonCards = screen.getAllByTestId('skeleton-card')
    expect(skeletonCards.length).toBeGreaterThan(0)
    expect(screen.queryByTestId('empty-state')).not.toBeInTheDocument()
  })

  it('does not render empty state when sections have data', () => {
    const sections = makeSections(2)

    render(
      <MemoryRouter>
        <DiscoverRailsPageUI {...DEFAULT_PROPS} sections={sections} />
      </MemoryRouter>,
    )

    expect(screen.queryByTestId('empty-state')).not.toBeInTheDocument()
  })

  it('renders search results grid when filter is active', () => {
    const results = makeQuizResults(4)

    render(
      <MemoryRouter>
        <DiscoverRailsPageUI
          {...DEFAULT_PROPS}
          filter={{ search: 'science' }}
          searchResults={results}
        />
      </MemoryRouter>,
    )

    expect(screen.getByTestId('search-quiz-grid')).toBeInTheDocument()
    expect(screen.queryByTestId('empty-state')).not.toBeInTheDocument()
    expect(
      screen.queryByTestId('discovery-rail-section'),
    ).not.toBeInTheDocument()
  })

  it('renders search empty state when filter active and no results', () => {
    render(
      <MemoryRouter>
        <DiscoverRailsPageUI
          {...DEFAULT_PROPS}
          filter={{ search: 'zzznomatch' }}
          searchResults={[]}
        />
      </MemoryRouter>,
    )

    expect(screen.getByTestId('search-empty-state')).toBeInTheDocument()
    expect(screen.queryByTestId('search-quiz-grid')).not.toBeInTheDocument()
  })

  it('calls onClearFilter when "Back to discovery" button is clicked', async () => {
    const onClearFilter = vi.fn()
    const results = makeQuizResults(2)

    render(
      <MemoryRouter>
        <DiscoverRailsPageUI
          {...DEFAULT_PROPS}
          filter={{ search: 'test' }}
          searchResults={results}
          onClearFilter={onClearFilter}
        />
      </MemoryRouter>,
    )

    await userEvent.click(screen.getByTestId('test-clear-filter-button-button'))
    expect(onClearFilter).toHaveBeenCalledOnce()
  })

  it('shows "Load more" button when hasMore is true in filter mode', () => {
    const results = makeQuizResults(3)

    render(
      <MemoryRouter>
        <DiscoverRailsPageUI
          {...DEFAULT_PROPS}
          filter={{ search: 'quiz' }}
          searchResults={results}
          hasMore={true}
        />
      </MemoryRouter>,
    )

    expect(
      screen.getByTestId('test-load-more-button-button'),
    ).toBeInTheDocument()
  })
})
