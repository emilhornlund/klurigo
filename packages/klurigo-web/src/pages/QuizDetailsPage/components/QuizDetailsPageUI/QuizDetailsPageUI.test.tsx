import {
  GameMode,
  LanguageCode,
  QuizCategory,
  type QuizRatingDto,
  type QuizRatingSummaryDto,
  QuizVisibility,
} from '@klurigo/common'
import { fireEvent, render, screen } from '@testing-library/react'
import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import QuizDetailsPageUI from './QuizDetailsPageUI'

vi.mock('./components/RatingsSection', () => ({
  default: ({
    summary,
    ratings,
    isLoading,
  }: {
    summary: QuizRatingSummaryDto
    ratings: QuizRatingDto[]
    isLoading?: boolean
  }) => (
    <div data-testid="ratings-section">
      <span data-testid="ratings-summary-stars">{summary.stars}</span>
      <span data-testid="ratings-count">{ratings.length}</span>
      {isLoading && <span data-testid="ratings-loading" />}
    </div>
  ),
}))

vi.mock('../../../../components', async () => {
  const Button = ({
    id,
    value,
    onClick,
  }: {
    id?: string
    value?: string
    onClick?: () => void
  }) => (
    <button type="button" id={id} onClick={onClick}>
      {value}
    </button>
  )

  const Page = ({
    header,
    children,
  }: {
    header?: React.ReactNode
    children?: React.ReactNode
  }) => (
    <div data-testid="page">
      <div data-testid="page-header">{header}</div>
      <div data-testid="page-body">{children}</div>
    </div>
  )

  const Typography = ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="typography">{children}</div>
  )

  const LoadingSpinner = () => <div data-testid="loading-spinner" />

  const PageDivider = () => <hr data-testid="page-divider" />

  const ResponsiveImage = ({ imageURL }: { imageURL: string }) => (
    <img data-testid="responsive-image" alt="cover" src={imageURL} />
  )

  const ConfirmDialog = ({
    title,
    message,
    open,
    loading,
    destructive,
    onConfirm,
    onClose,
  }: {
    title: string
    message: string
    open: boolean
    loading?: boolean
    destructive?: boolean
    onConfirm: () => void
    onClose: () => void
  }) => {
    if (!open) return null

    return (
      <div
        data-testid={`confirm-dialog-${title}`}
        data-loading={loading ? 'true' : 'false'}
        data-destructive={destructive ? 'true' : 'false'}>
        <div>{title}</div>
        <div>{message}</div>
        <button type="button" onClick={onConfirm}>
          confirm
        </button>
        <button type="button" onClick={onClose}>
          close
        </button>
      </div>
    )
  }

  return {
    Button,
    ConfirmDialog,
    LoadingSpinner,
    Page,
    PageDivider,
    ResponsiveImage,
    Typography,
  }
})

const created = new Date('2025-02-14T15:31:14.000Z')
const updated = new Date('2025-03-08T15:31:14.000Z')

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const makeQuiz = (overrides: Partial<any> = {}) => ({
  id: 'd12cf443-3fa9-4a0e-8778-d9c182903146',
  title: 'The Ultimate Geography Challenge',
  description:
    'Test your knowledge of world capitals, landmarks, and continents in this fun and educational geography quiz.',
  mode: GameMode.Classic,
  visibility: QuizVisibility.Public,
  category: QuizCategory.GeneralKnowledge,
  imageCoverURL:
    'https://0utwqfl7.cdn.imgeng.in/explore-academics/programs/images/undergraduate/henson/geographymajorMH.jpg',
  languageCode: LanguageCode.English,
  numberOfQuestions: 14,
  author: {
    id: 'db8d4c90-bfc2-4c2e-93cc-8f1c7eda34ec',
    name: 'FrostyBear',
  },
  gameplaySummary: {
    count: 5,
    totalPlayerCount: 42,
    difficultyPercentage: 0.48,
    lastPlayed: new Date(created.getTime() - 1000 * 60 * 60 * 24 * 5),
  },
  ratingSummary: { stars: 0, comments: 0, total: 0 },
  created,
  updated,
  ...overrides,
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

const renderUI = (
  props: Partial<React.ComponentProps<typeof QuizDetailsPageUI>> = {},
) =>
  render(
    <MemoryRouter>
      <QuizDetailsPageUI
        quiz={makeQuiz()}
        isLoadingQuiz={false}
        isHostGameLoading={false}
        isDeleteQuizLoading={false}
        onHostGame={() => undefined}
        onEditQuiz={() => undefined}
        onDeleteQuiz={() => undefined}
        {...props}
      />
    </MemoryRouter>,
  )

describe('QuizDetailsPageUI', () => {
  it('renders loading state when quiz is missing', () => {
    const { container } = renderUI({ quiz: undefined, isLoadingQuiz: false })

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
    expect(container).toMatchSnapshot()
  })

  it('renders loading state when isLoadingQuiz is true', () => {
    const { container } = renderUI({ quiz: makeQuiz(), isLoadingQuiz: true })

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
    expect(container).toMatchSnapshot()
  })

  it('renders quiz details (snapshot)', () => {
    const { container } = renderUI()

    expect(
      screen.getByText('The Ultimate Geography Challenge'),
    ).toBeInTheDocument()
    expect(screen.getByText(/14 Questions/i)).toBeInTheDocument()
    expect(container).toMatchSnapshot()
  })

  it('does not render owner actions when isOwner is false', () => {
    renderUI({ isOwner: false })

    expect(
      screen.queryByRole('button', { name: 'Delete' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Edit' }),
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Host Game' }),
    ).toBeInTheDocument()
  })

  it('renders owner actions when isOwner is true', () => {
    renderUI({ isOwner: true })

    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument()
  })

  it('renders description only when present', () => {
    renderUI({ quiz: makeQuiz({ description: undefined }) })

    expect(
      screen.queryByText(/Test your knowledge of world capitals/i),
    ).not.toBeInTheDocument()
  })

  it('renders image only when imageCoverURL is present', () => {
    renderUI({ quiz: makeQuiz({ imageCoverURL: undefined }) })

    expect(screen.queryByTestId('responsive-image')).not.toBeInTheDocument()
  })

  it('renders singular Question when numberOfQuestions is 1', () => {
    renderUI({ quiz: makeQuiz({ numberOfQuestions: 1 }) })

    expect(screen.getByText('1 Question')).toBeInTheDocument()
  })

  it('renders author name or N/A when missing', () => {
    renderUI({ quiz: makeQuiz({ author: { id: 'a', name: '' } }) })

    // Find all DetailItems and look for the one containing user icon
    const allDetailItems = screen
      .getAllByRole('generic')
      .filter((el) => el.classList.contains('item'))

    // Find the author DetailItem by looking for user icon within it
    const authorDetailItem = allDetailItems.find((item) =>
      item.querySelector('[data-icon="user"]'),
    )

    expect(authorDetailItem).toBeInTheDocument()
    expect(authorDetailItem).toHaveTextContent('N/A')
  })

  it('opens and closes Host Game confirm dialog; confirm triggers onHostGame', () => {
    const onHostGame = vi.fn()
    renderUI({ onHostGame })

    fireEvent.click(screen.getByRole('button', { name: 'Host Game' }))
    expect(screen.getByTestId('confirm-dialog-Host Game')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'confirm' }))
    expect(onHostGame).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: 'close' }))
    expect(
      screen.queryByTestId('confirm-dialog-Host Game'),
    ).not.toBeInTheDocument()
  })

  it('opens Delete Quiz confirm dialog only for owners; confirm triggers onDeleteQuiz', () => {
    const onDeleteQuiz = vi.fn()
    renderUI({ isOwner: true, onDeleteQuiz })

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(screen.getByTestId('confirm-dialog-Delete Quiz')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'confirm' }))
    expect(onDeleteQuiz).toHaveBeenCalledTimes(1)
  })

  it('edit button triggers onEditQuiz', () => {
    const onEditQuiz = vi.fn()
    renderUI({ isOwner: true, onEditQuiz })

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
    expect(onEditQuiz).toHaveBeenCalledTimes(1)
  })

  it('passes loading flags through to confirm dialogs', () => {
    renderUI({
      isOwner: true,
      isHostGameLoading: true,
      isDeleteQuizLoading: true,
    })

    fireEvent.click(screen.getByRole('button', { name: 'Host Game' }))
    expect(screen.getByTestId('confirm-dialog-Host Game')).toHaveAttribute(
      'data-loading',
      'true',
    )

    fireEvent.click(screen.getByRole('button', { name: 'close' }))

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(screen.getByTestId('confirm-dialog-Delete Quiz')).toHaveAttribute(
      'data-loading',
      'true',
    )
    expect(screen.getByTestId('confirm-dialog-Delete Quiz')).toHaveAttribute(
      'data-destructive',
      'true',
    )
  })

  describe('Gameplay Summary Details', () => {
    it('renders rating display with stars value or N/A', () => {
      renderUI({
        quiz: makeQuiz({ ratingSummary: { stars: 4.5, comments: 10 } }),
      })

      const ratingItem = screen.getByTitle('Average rating')
      expect(ratingItem).toBeInTheDocument()
      expect(ratingItem).toHaveTextContent('4.5')
    })

    it('renders N/A for rating when stars is 0', () => {
      renderUI({ quiz: makeQuiz({ ratingSummary: { stars: 0, comments: 0 } }) })

      const ratingItem = screen.getByTitle('Average rating')
      expect(ratingItem).toBeInTheDocument()
      expect(ratingItem).toHaveTextContent('N/A')
    })

    it('renders total plays with "times" suffix when count > 0', () => {
      renderUI({
        quiz: makeQuiz({
          gameplaySummary: {
            count: 15,
            totalPlayerCount: 42,
            difficultyPercentage: 0.48,
          },
        }),
      })

      const playsItem = screen.getByTitle('Total plays')
      expect(playsItem).toBeInTheDocument()
      expect(playsItem).toHaveTextContent('15 times')
    })

    it('renders N/A for total plays when count is 0', () => {
      renderUI({
        quiz: makeQuiz({
          gameplaySummary: {
            count: 0,
            totalPlayerCount: 42,
            difficultyPercentage: 0.48,
          },
        }),
      })

      const playsItem = screen.getByTitle('Total plays')
      expect(playsItem).toBeInTheDocument()
      expect(playsItem).toHaveTextContent('N/A')
    })

    it('renders total players with correct value', () => {
      renderUI({
        quiz: makeQuiz({
          gameplaySummary: {
            count: 5,
            totalPlayerCount: 128,
            difficultyPercentage: 0.48,
          },
        }),
      })

      const playersItem = screen.getByTitle('Total players')
      expect(playersItem).toBeInTheDocument()
      expect(playersItem).toHaveTextContent('128')
    })

    it('renders N/A for total players when totalPlayerCount is 0', () => {
      renderUI({
        quiz: makeQuiz({
          gameplaySummary: {
            count: 5,
            totalPlayerCount: 0,
            difficultyPercentage: 0.48,
          },
        }),
      })

      const playersItem = screen.getByTitle('Total players')
      expect(playersItem).toBeInTheDocument()
      expect(playersItem).toHaveTextContent('N/A')
    })

    it('renders estimated difficulty using toDifficultyLabel utility', () => {
      renderUI({
        quiz: makeQuiz({
          gameplaySummary: {
            count: 5,
            totalPlayerCount: 42,
            difficultyPercentage: 0.75,
          },
        }),
      })

      const difficultyItem = screen.getByTitle('Estimated difficulty')
      expect(difficultyItem).toBeInTheDocument()
      expect(difficultyItem).toHaveTextContent('Extreme')
    })

    it('renders N/A for difficulty when difficultyPercentage is invalid', () => {
      renderUI({
        quiz: makeQuiz({
          gameplaySummary: {
            count: 5,
            totalPlayerCount: 42,
            difficultyPercentage: NaN,
          },
        }),
      })

      const difficultyItem = screen.getByTitle('Estimated difficulty')
      expect(difficultyItem).toBeInTheDocument()
      expect(difficultyItem).toHaveTextContent('N/A')
    })

    it('renders last played date when available', () => {
      const lastPlayed = new Date('2025-01-15T10:30:00.000Z')
      renderUI({
        quiz: makeQuiz({
          gameplaySummary: {
            count: 5,
            totalPlayerCount: 42,
            difficultyPercentage: 0.48,
            lastPlayed,
          },
        }),
      })

      const lastPlayedItem = screen.getByTitle(/Last played/)
      expect(lastPlayedItem).toBeInTheDocument()
      expect(lastPlayedItem).toHaveAttribute(
        'title',
        'Last played 2025-01-15 10:30:00',
      )
      // value is displayed as relative time via formatTimeAgo
      expect(lastPlayedItem).not.toHaveTextContent('N/A')
    })

    it('renders N/A for last played when date is missing', () => {
      renderUI({
        quiz: makeQuiz({
          gameplaySummary: {
            count: 5,
            totalPlayerCount: 42,
            difficultyPercentage: 0.48,
          },
        }),
      })

      const lastPlayedItem = screen.getByTitle('Never played')
      expect(lastPlayedItem).toBeInTheDocument()
      expect(lastPlayedItem).toHaveTextContent('N/A')
    })
  })

  describe('Edge Cases and Boundary Values', () => {
    it('handles partially missing gameplaySummary fields', () => {
      renderUI({
        quiz: makeQuiz({
          gameplaySummary: {
            count: 0,
            totalPlayerCount: 0,
            difficultyPercentage: undefined,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any,
        }),
      })

      expect(screen.getByTitle('Total plays')).toHaveTextContent('N/A')
      expect(screen.getByTitle('Total players')).toHaveTextContent('N/A')
      expect(screen.getByTitle('Estimated difficulty')).toHaveTextContent('N/A')
    })

    describe('Difficulty Boundary Values', () => {
      it('displays Easy for boundary values 0 to 0.2499', () => {
        const testCases = [0, 0.1, 0.24, 0.2499]

        testCases.forEach((difficulty) => {
          const renderResult = renderUI({
            quiz: makeQuiz({
              gameplaySummary: {
                count: 1,
                totalPlayerCount: 1,
                difficultyPercentage: difficulty,
              },
            }),
          })

          expect(screen.getByTitle('Estimated difficulty')).toHaveTextContent(
            'Easy',
          )
          renderResult.unmount()
        })
      })

      it('displays Medium for boundary values 0.25 to 0.4999', () => {
        const testCases = [0.25, 0.3, 0.4, 0.4999]

        testCases.forEach((difficulty) => {
          const { unmount } = renderUI({
            quiz: makeQuiz({
              gameplaySummary: {
                count: 1,
                totalPlayerCount: 1,
                difficultyPercentage: difficulty,
              },
            }),
          })

          expect(screen.getByTitle('Estimated difficulty')).toHaveTextContent(
            'Medium',
          )
          unmount()
        })
      })

      it('displays Hard for boundary values 0.5 to 0.7499', () => {
        const testCases = [0.5, 0.6, 0.7, 0.7499]

        testCases.forEach((difficulty) => {
          const { unmount } = renderUI({
            quiz: makeQuiz({
              gameplaySummary: {
                count: 1,
                totalPlayerCount: 1,
                difficultyPercentage: difficulty,
              },
            }),
          })

          expect(screen.getByTitle('Estimated difficulty')).toHaveTextContent(
            'Hard',
          )
          unmount()
        })
      })

      it('displays Extreme for boundary values 0.75 to 1', () => {
        const testCases = [0.75, 0.8, 0.9, 1]

        testCases.forEach((difficulty) => {
          const { unmount } = renderUI({
            quiz: makeQuiz({
              gameplaySummary: {
                count: 1,
                totalPlayerCount: 1,
                difficultyPercentage: difficulty,
              },
            }),
          })

          expect(screen.getByTitle('Estimated difficulty')).toHaveTextContent(
            'Extreme',
          )
          unmount()
        })
      })

      it('clamps extreme difficulty values', () => {
        const testCases = [-1, Number.NEGATIVE_INFINITY]

        testCases.forEach((difficulty) => {
          const { unmount } = renderUI({
            quiz: makeQuiz({
              gameplaySummary: {
                count: 1,
                totalPlayerCount: 1,
                difficultyPercentage: difficulty,
              },
            }),
          })

          expect(screen.getByTitle('Estimated difficulty')).toHaveTextContent(
            'Easy',
          )
          unmount()
        })

        const extremeHighCases = [2, Number.POSITIVE_INFINITY]

        extremeHighCases.forEach((difficulty) => {
          const renderResult = renderUI({
            quiz: makeQuiz({
              gameplaySummary: {
                count: 1,
                totalPlayerCount: 1,
                difficultyPercentage: difficulty,
              },
            }),
          })

          expect(screen.getByTitle('Estimated difficulty')).toHaveTextContent(
            'Extreme',
          )
          renderResult.unmount()
        })
      })
    })
  })

  describe('Component Structure and Layout', () => {
    it('does not render legacy misc rating layout', () => {
      renderUI()

      // Old layout should not exist
      expect(screen.queryByTestId('misc')).not.toBeInTheDocument()
      expect(screen.queryByTestId('column')).not.toBeInTheDocument()

      // Should not find old star/comment rating displays
      const allIcons = screen.getAllByRole('img', { hidden: true })
      const starIcons = allIcons.filter(
        (icon) => icon.getAttribute('data-icon') === 'star',
      )
      const commentIcons = allIcons.filter(
        (icon) => icon.getAttribute('data-icon') === 'comment-dots',
      )

      // Should only have the new rating star, not the old layout stars
      const ratingStar = starIcons.find(
        (icon) =>
          icon.closest('.item')?.getAttribute('title') === 'Average rating',
      )
      expect(ratingStar).toBeInTheDocument()
      expect(commentIcons).toHaveLength(0)
    })

    it('renders correct number of DetailItems', () => {
      renderUI()

      const allDetailItems = screen
        .getAllByRole('generic')
        .filter((el: HTMLElement) => el.classList.contains('item'))

      // Should have: visibility, category, language, mode, questions, author, created, rating, plays, players, difficulty, lastPlayed
      expect(allDetailItems).toHaveLength(12)
    })

    it('renders all DetailItems within details container', () => {
      renderUI()

      const allElements = screen.getAllByRole('generic')
      const detailsContainer = Array.from(allElements).find((el: HTMLElement) =>
        el.classList.contains('details'),
      )
      expect(detailsContainer).toBeInTheDocument()

      const detailItems = detailsContainer?.querySelectorAll('.item')
      expect(detailItems).toHaveLength(12)
    })

    it('renders all expected icons in DetailItems', () => {
      renderUI()

      const expectedIcons = [
        'eye', // visibility
        'icons', // category
        'language', // language
        'gamepad', // mode
        'circle-question', // questions
        'user', // author
        'calendar-plus', // created
        'star', // rating
        'circle-play', // plays
        'users', // players
        'gauge-high', // difficulty
        'clock', // last played
      ]

      const allIcons = screen.getAllByRole('img', { hidden: true })
      expectedIcons.forEach((iconName) => {
        const icon = Array.from(allIcons).find(
          (img) => img.getAttribute('data-icon') === iconName,
        )
        expect(icon).toBeInTheDocument()
      })
    })
  })

  describe('Accessibility', () => {
    it('provides appropriate title attributes for all DetailItems', () => {
      renderUI()

      const expectedTitles = [
        'Public', // visibility
        'General Knowledge', // category
        'English', // language
        'Classic', // mode
        '14 Questions', // questions
        'FrostyBear', // author
        expect.stringContaining('Created'), // created date
        'Average rating', // rating
        'Total plays', // plays
        'Total players', // players
        'Estimated difficulty', // difficulty
        expect.stringContaining('Last played'), // last played
      ]

      expectedTitles.forEach((title) => {
        if (typeof title === 'string') {
          expect(screen.getByTitle(title)).toBeInTheDocument()
        } else {
          // For matchers like expect.stringContaining()
          const detailItems = screen
            .getAllByRole('generic')
            .filter(
              (el: HTMLElement) =>
                el.classList.contains('item') && el.getAttribute('title'),
            )
          const matchingItem = detailItems.find((item: HTMLElement) => {
            const titleAttr = item.getAttribute('title') || ''
            // Extract the expected substring from the matcher
            return (
              titleAttr.includes('Created') || titleAttr.includes('Last played')
            )
          })
          expect(matchingItem).toBeDefined()
        }
      })
    })

    it('provides informative tooltips for date fields', () => {
      const created = new Date('2025-02-14T15:31:14.000Z')
      const lastPlayed = new Date('2025-01-10T09:15:30.000Z')

      renderUI({
        quiz: makeQuiz({
          created,
          gameplaySummary: {
            count: 5,
            totalPlayerCount: 42,
            difficultyPercentage: 0.48,
            lastPlayed,
          },
        }),
      })

      const createdItem = screen.getByTitle(/Created/)
      expect(createdItem.getAttribute('title')).toBe(
        'Created 2025-02-14 15:31:14',
      )

      const lastPlayedItem = screen.getByTitle(/Last played/)
      expect(lastPlayedItem.getAttribute('title')).toBe(
        'Last played 2025-01-10 09:15:30',
      )
    })

    it('provides descriptive titles for accessibility', () => {
      renderUI()

      // Check that interactive elements have descriptive titles
      const playsItem = screen.getByTitle('Total plays')
      const playersItem = screen.getByTitle('Total players')
      const difficultyItem = screen.getByTitle('Estimated difficulty')
      const ratingItem = screen.getByTitle('Average rating')

      expect(playsItem.getAttribute('title')).toBe('Total plays')
      expect(playersItem.getAttribute('title')).toBe('Total players')
      expect(difficultyItem.getAttribute('title')).toBe('Estimated difficulty')
      expect(ratingItem.getAttribute('title')).toBe('Average rating')
    })
  })

  describe('Ratings Section', () => {
    it('renders RatingsSection and PageDivider when ratingSummary.stars > 0', () => {
      renderUI({
        quiz: makeQuiz({
          ratingSummary: { stars: 4.5, comments: 10, total: 15 },
        }),
      })

      expect(screen.getByTestId('ratings-section')).toBeInTheDocument()
      expect(screen.getByTestId('page-divider')).toBeInTheDocument()
      expect(screen.getByTestId('ratings-summary-stars')).toHaveTextContent(
        '4.5',
      )
    })

    it('hides RatingsSection and PageDivider when ratingSummary.stars is 0', () => {
      renderUI({
        quiz: makeQuiz({ ratingSummary: { stars: 0, comments: 0, total: 0 } }),
      })

      expect(screen.queryByTestId('ratings-section')).not.toBeInTheDocument()
      expect(screen.queryByTestId('page-divider')).not.toBeInTheDocument()
    })

    it('passes empty array to RatingsSection when ratings prop is undefined', () => {
      renderUI({
        quiz: makeQuiz({
          ratingSummary: { stars: 4.5, comments: 10, total: 15 },
        }),
        ratings: undefined,
      })

      expect(screen.getByTestId('ratings-count')).toHaveTextContent('0')
    })

    it('passes ratings array to RatingsSection when provided', () => {
      renderUI({
        quiz: makeQuiz({
          ratingSummary: { stars: 4.5, comments: 10, total: 15 },
        }),
        ratings: [
          makeRating(),
          makeRating({ id: 'r2' }),
          makeRating({ id: 'r3' }),
        ],
      })

      expect(screen.getByTestId('ratings-count')).toHaveTextContent('3')
    })

    it('passes isLoadingRatings to RatingsSection', () => {
      renderUI({
        quiz: makeQuiz({
          ratingSummary: { stars: 4.5, comments: 10, total: 15 },
        }),
        isLoadingRatings: true,
      })

      expect(screen.getByTestId('ratings-loading')).toBeInTheDocument()
    })
  })
})
