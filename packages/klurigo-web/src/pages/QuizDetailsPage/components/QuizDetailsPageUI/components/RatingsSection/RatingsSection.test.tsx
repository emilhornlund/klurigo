import type { QuizRatingDto, QuizRatingSummaryDto } from '@klurigo/common'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { RATINGS_SKELETON_COUNT } from './RatingsSection'
import RatingsSection from './RatingsSection'
import styles from './RatingsSection.module.scss'

vi.mock('../../../../../../utils/date.utils', async () => {
  const actual = await vi.importActual<
    typeof import('../../../../../../utils/date.utils')
  >('../../../../../../utils/date.utils')
  return {
    ...actual,
    formatTimeAgo: (date: Date) => `${date.getFullYear()} ago`,
  }
})

const makeRating = (overrides: Partial<QuizRatingDto> = {}): QuizRatingDto => ({
  id: 'rating-1',
  quizId: 'quiz-1',
  stars: 4,
  comment: 'Great quiz!',
  author: { id: 'user-1', nickname: 'Alice' },
  createdAt: new Date('2025-01-01T00:00:00.000Z'),
  updatedAt: new Date('2025-01-01T00:00:00.000Z'),
  ...overrides,
})

const defaultSummary: QuizRatingSummaryDto = {
  stars: 4.6,
  comments: 13,
  total: 15,
}

describe('RatingsSection', () => {
  describe('Section header', () => {
    it('renders the "Ratings & Reviews" heading', () => {
      render(
        <RatingsSection summary={defaultSummary} ratings={[makeRating()]} />,
      )
      expect(
        screen.getByRole('heading', { name: 'Ratings & Reviews' }),
      ).toBeInTheDocument()
    })
  })

  describe('Summary panel', () => {
    it('renders the average star score formatted to one decimal place', () => {
      render(
        <RatingsSection
          summary={{ stars: 4.6, comments: 13, total: 15 }}
          ratings={[]}
        />,
      )
      expect(screen.getByTestId('ratings-summary')).toBeInTheDocument()
      expect(screen.getByLabelText('Average rating: 4.6')).toBeInTheDocument()
    })

    it('renders zero average as "0.0"', () => {
      render(
        <RatingsSection
          summary={{ stars: 0, comments: 0, total: 0 }}
          ratings={[]}
        />,
      )
      expect(screen.getByLabelText('Average rating: 0.0')).toBeInTheDocument()
    })

    it('renders the total rating count', () => {
      render(
        <RatingsSection
          summary={{ stars: 4.6, comments: 13, total: 15 }}
          ratings={[]}
        />,
      )
      expect(screen.getByTestId('ratings-count')).toHaveTextContent(
        '15 Ratings',
      )
    })

    it('renders "out of 5" label next to the average', () => {
      render(<RatingsSection summary={defaultSummary} ratings={[]} />)
      expect(screen.getByText('out of 5')).toBeInTheDocument()
    })

    it('renders summary star row with correct aria-label', () => {
      render(
        <RatingsSection
          summary={{ stars: 3, comments: 5, total: 7 }}
          ratings={[]}
        />,
      )
      const starRows = screen.getAllByTestId('star-row')
      expect(starRows[0]).toHaveAttribute('aria-label', '3 out of 5 stars')
    })
  })

  describe('Rail rendering', () => {
    it('renders the rail when ratings are provided', () => {
      render(
        <RatingsSection
          summary={defaultSummary}
          ratings={[makeRating(), makeRating({ id: 'rating-2' })]}
        />,
      )
      expect(screen.getByTestId('ratings-rail-wrapper')).toBeInTheDocument()
      expect(screen.getAllByTestId('rating-card')).toHaveLength(2)
    })

    it('does not render the rail when ratings list is empty', () => {
      render(<RatingsSection summary={defaultSummary} ratings={[]} />)
      expect(
        screen.queryByTestId('ratings-rail-wrapper'),
      ).not.toBeInTheDocument()
    })

    it('shows empty state message when ratings list is empty', () => {
      render(<RatingsSection summary={defaultSummary} ratings={[]} />)
      expect(screen.getByTestId('ratings-empty-state')).toBeInTheDocument()
      expect(screen.getByTestId('ratings-empty-state')).toHaveTextContent(
        'No written reviews yet',
      )
    })

    it('shows skeleton cards when isLoading is true', () => {
      render(<RatingsSection summary={defaultSummary} ratings={[]} isLoading />)
      expect(screen.getByTestId('ratings-rail-wrapper')).toBeInTheDocument()
      expect(screen.getAllByTestId('ratings-skeleton-card')).toHaveLength(
        RATINGS_SKELETON_COUNT,
      )
      expect(
        screen.queryByTestId('ratings-empty-state'),
      ).not.toBeInTheDocument()
    })

    it('does not show skeleton cards when not loading', () => {
      render(
        <RatingsSection summary={defaultSummary} ratings={[makeRating()]} />,
      )
      expect(
        screen.queryByTestId('ratings-skeleton-card'),
      ).not.toBeInTheDocument()
    })

    it('renders each card with the correct author nickname', () => {
      render(
        <RatingsSection
          summary={defaultSummary}
          ratings={[
            makeRating({ id: 'r1', author: { id: 'u1', nickname: 'Alice' } }),
            makeRating({ id: 'r2', author: { id: 'u2', nickname: 'Bob' } }),
          ]}
        />,
      )
      expect(screen.getByText('Alice')).toBeInTheDocument()
      expect(screen.getByText('Bob')).toBeInTheDocument()
    })

    it('renders comment text when present', () => {
      render(
        <RatingsSection
          summary={defaultSummary}
          ratings={[makeRating({ comment: 'Amazing quiz!' })]}
        />,
      )
      expect(screen.getByText('Amazing quiz!')).toBeInTheDocument()
    })

    it('does not render comment element when comment is absent', () => {
      render(
        <RatingsSection
          summary={defaultSummary}
          ratings={[makeRating({ comment: undefined })]}
        />,
      )
      expect(screen.queryByRole('paragraph')).not.toBeInTheDocument()
    })

    it('renders per-card star row with aria-label matching the star count', () => {
      render(
        <RatingsSection
          summary={defaultSummary}
          ratings={[makeRating({ stars: 3 })]}
        />,
      )
      const starRows = screen.getAllByTestId('star-row')
      // starRows[0] is the summary row; starRows[1] is the card row
      expect(starRows[1]).toHaveAttribute('aria-label', '3 out of 5 stars')
    })

    it('renders formatted time-ago for each card', () => {
      render(
        <RatingsSection
          summary={defaultSummary}
          ratings={[
            makeRating({ updatedAt: new Date('2025-06-01T00:00:00.000Z') }),
          ]}
        />,
      )
      expect(screen.getByText('2025 ago')).toBeInTheDocument()
    })
  })

  describe('Scroll arrows', () => {
    it('renders prev and next arrow buttons when ratings exist', () => {
      render(
        <RatingsSection summary={defaultSummary} ratings={[makeRating()]} />,
      )
      expect(
        screen.getByRole('button', { name: 'Scroll left' }),
      ).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: 'Scroll right' }),
      ).toBeInTheDocument()
    })

    it('clicking prev calls scrollBy with negative left', async () => {
      const user = userEvent.setup()
      render(
        <RatingsSection summary={defaultSummary} ratings={[makeRating()]} />,
      )

      const rail = screen.getByTestId('ratings-rail-scroll')
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

    it('clicking next calls scrollBy with positive left', async () => {
      const user = userEvent.setup()
      render(
        <RatingsSection summary={defaultSummary} ratings={[makeRating()]} />,
      )

      const rail = screen.getByTestId('ratings-rail-scroll')
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

    it('applies correct CSS classes to arrow buttons', () => {
      render(
        <RatingsSection summary={defaultSummary} ratings={[makeRating()]} />,
      )

      expect(screen.getByTestId('ratings-arrow-prev')).toHaveClass(
        styles.arrowButton,
        styles.arrowPrev,
      )
      expect(screen.getByTestId('ratings-arrow-next')).toHaveClass(
        styles.arrowButton,
        styles.arrowNext,
      )
    })
  })
})
