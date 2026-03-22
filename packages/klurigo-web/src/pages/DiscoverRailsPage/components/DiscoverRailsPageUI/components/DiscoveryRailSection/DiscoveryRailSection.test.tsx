import {
  type DiscoveryQuizCardDto,
  DiscoverySectionKey,
  GameMode,
  LanguageCode,
  QuizCategory,
} from '@klurigo/common'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import DiscoveryRailSection, {
  DISCOVERY_RAIL_SKELETON_COUNT,
} from './DiscoveryRailSection'

vi.mock('react-router-dom', async () => {
  const actual =
    await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => vi.fn() }
})

const makeQuiz = (id: string): DiscoveryQuizCardDto => ({
  id,
  title: `Quiz ${id}`,
  description: 'A quiz',
  imageCoverURL: `https://example.com/${id}.jpg`,
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
})

describe('DiscoveryRailSection', () => {
  it('renders skeleton cards when isLoading is true', () => {
    render(
      <MemoryRouter>
        <DiscoveryRailSection
          sectionKey={DiscoverySectionKey.TRENDING}
          title="Trending"
          quizzes={[]}
          isLoading={true}
        />
      </MemoryRouter>,
    )

    const skeletons = screen.getAllByTestId('skeleton-card')
    expect(skeletons).toHaveLength(DISCOVERY_RAIL_SKELETON_COUNT)
  })

  it('renders quiz cards when data is present', () => {
    const quizzes = [makeQuiz('q1'), makeQuiz('q2'), makeQuiz('q3')]

    render(
      <MemoryRouter>
        <DiscoveryRailSection
          sectionKey={DiscoverySectionKey.TOP_RATED}
          title="Top Rated"
          quizzes={quizzes}
          isLoading={false}
        />
      </MemoryRouter>,
    )

    expect(screen.queryByTestId('skeleton-card')).not.toBeInTheDocument()
    expect(screen.getAllByTestId('quiz-discovery-card')).toHaveLength(3)
  })

  it('renders section title and description', () => {
    render(
      <MemoryRouter>
        <DiscoveryRailSection
          sectionKey={DiscoverySectionKey.FEATURED}
          title="Featured"
          description="Hand-picked quizzes"
          quizzes={[]}
          isLoading={false}
        />
      </MemoryRouter>,
    )

    expect(screen.getByText('Featured')).toBeInTheDocument()
    expect(screen.getByText('Hand-picked quizzes')).toBeInTheDocument()
  })

  it('renders "See all" link with correct href', () => {
    render(
      <MemoryRouter>
        <DiscoveryRailSection
          sectionKey={DiscoverySectionKey.MOST_PLAYED}
          title="Most Played"
          quizzes={[]}
          isLoading={false}
        />
      </MemoryRouter>,
    )

    const link = screen.getByText(/See all/)
    expect(link).toHaveAttribute('href', '/discover/section/MOST_PLAYED')
  })

  it('does not render description when not provided', () => {
    render(
      <MemoryRouter>
        <DiscoveryRailSection
          sectionKey={DiscoverySectionKey.TRENDING}
          title="Trending"
          quizzes={[]}
          isLoading={false}
        />
      </MemoryRouter>,
    )

    expect(screen.getByText('Trending')).toBeInTheDocument()
    const section = screen.getByTestId('discovery-rail-section')
    expect(section.querySelector('p')).not.toBeInTheDocument()
  })

  it('renders prev and next arrow buttons', () => {
    render(
      <MemoryRouter>
        <DiscoveryRailSection
          sectionKey={DiscoverySectionKey.TRENDING}
          title="Trending"
          quizzes={[makeQuiz('q1')]}
          isLoading={false}
        />
      </MemoryRouter>,
    )

    const previousArrow = screen.getByRole('button', { name: 'Scroll left' })
    const nextArrow = screen.getByRole('button', { name: 'Scroll right' })

    expect(previousArrow).toBe(screen.getByTestId('rail-arrow-prev'))
    expect(nextArrow).toBe(screen.getByTestId('rail-arrow-next'))
  })

  it('arrow buttons have correct aria-labels', () => {
    render(
      <MemoryRouter>
        <DiscoveryRailSection
          sectionKey={DiscoverySectionKey.TRENDING}
          title="Trending"
          quizzes={[]}
          isLoading={false}
        />
      </MemoryRouter>,
    )

    expect(screen.getByRole('button', { name: 'Scroll left' })).toBe(
      screen.getByLabelText('Scroll left'),
    )
    expect(screen.getByRole('button', { name: 'Scroll right' })).toBe(
      screen.getByLabelText('Scroll right'),
    )
  })

  it('clicking prev arrow calls scrollBy on the rail', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <DiscoveryRailSection
          sectionKey={DiscoverySectionKey.TRENDING}
          title="Trending"
          quizzes={[makeQuiz('q1')]}
          isLoading={false}
        />
      </MemoryRouter>,
    )

    const rail = screen.getByTestId('horizontal-rail-scroll')
    const scrollBySpy = vi.fn()
    Object.defineProperty(rail, 'scrollBy', { value: scrollBySpy })
    Object.defineProperty(rail, 'clientWidth', {
      value: 800,
      configurable: true,
    })

    await user.click(screen.getByRole('button', { name: 'Scroll left' }))

    expect(scrollBySpy).toHaveBeenCalledWith(
      expect.objectContaining({ behavior: 'smooth' }),
    )
    expect(scrollBySpy.mock.calls[0][0].left).toBeLessThan(0)
  })

  it('clicking next arrow calls scrollBy on the rail', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <DiscoveryRailSection
          sectionKey={DiscoverySectionKey.TRENDING}
          title="Trending"
          quizzes={[makeQuiz('q1')]}
          isLoading={false}
        />
      </MemoryRouter>,
    )

    const rail = screen.getByTestId('horizontal-rail-scroll')
    const scrollBySpy = vi.fn()
    Object.defineProperty(rail, 'scrollBy', { value: scrollBySpy })
    Object.defineProperty(rail, 'clientWidth', {
      value: 800,
      configurable: true,
    })

    await user.click(screen.getByRole('button', { name: 'Scroll right' }))

    expect(scrollBySpy).toHaveBeenCalledWith(
      expect.objectContaining({ behavior: 'smooth' }),
    )
    expect(scrollBySpy.mock.calls[0][0].left).toBeGreaterThan(0)
  })
})
