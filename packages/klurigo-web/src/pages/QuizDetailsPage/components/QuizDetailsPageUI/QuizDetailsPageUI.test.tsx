import {
  GameMode,
  LanguageCode,
  QuizCategory,
  type QuizRatingDto,
  type QuizResponseDto,
  QuizVisibility,
} from '@klurigo/common'
import { fireEvent, render, screen, within } from '@testing-library/react'
import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import QuizDetailsPageUI from './QuizDetailsPageUI'

const makeQuiz = (
  overrides: Partial<QuizResponseDto> = {},
): QuizResponseDto => ({
  id: 'quiz-1',
  title: 'Geography quiz',
  description: 'A quiz about geography',
  mode: GameMode.Classic,
  visibility: QuizVisibility.Public,
  category: QuizCategory.GeneralKnowledge,
  imageCoverURL: 'https://example.com/cover.jpg',
  languageCode: LanguageCode.English,
  numberOfQuestions: 14,
  author: { id: 'author-1', name: 'Quiz author' },
  gameplaySummary: {
    count: 3,
    totalPlayerCount: 24,
    difficultyPercentage: 0.5,
    lastPlayed: new Date('2025-02-09T15:31:14.000Z'),
  },
  ratingSummary: { stars: 0, comments: 0, total: 0 },
  created: new Date('2025-02-14T15:31:14.000Z'),
  updated: new Date('2025-03-08T15:31:14.000Z'),
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
  it('renders loading state if the quiz is missing or loading', () => {
    const { container, rerender } = renderUI({ quiz: undefined })
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
    expect(container).toMatchSnapshot()

    rerender(
      <MemoryRouter>
        <QuizDetailsPageUI
          quiz={makeQuiz()}
          isLoadingQuiz
          onHostGame={() => undefined}
          onEditQuiz={() => undefined}
          onDeleteQuiz={() => undefined}
        />
      </MemoryRouter>,
    )
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
  })

  it('renders title, optional description and image', () => {
    const { container, rerender } = renderUI()
    expect(
      screen.getByRole('heading', { name: 'Geography quiz' }),
    ).toBeInTheDocument()
    expect(screen.getByText('A quiz about geography')).toBeInTheDocument()
    expect(container.querySelector('.thumbnailContainer')).toBeInTheDocument()
    expect(container).toMatchSnapshot()

    rerender(
      <MemoryRouter>
        <QuizDetailsPageUI
          quiz={makeQuiz({ description: '', imageCoverURL: '' })}
          onHostGame={() => undefined}
          onEditQuiz={() => undefined}
          onDeleteQuiz={() => undefined}
        />
      </MemoryRouter>,
    )
    expect(screen.queryByText('A quiz about geography')).not.toBeInTheDocument()
  })

  it('only renders header edit and delete actions for the owner', () => {
    const onEditQuiz = vi.fn()
    const { rerender } = renderUI({ isOwner: true, onEditQuiz })
    fireEvent.click(screen.getByRole('button', { name: 'Edit quiz' }))
    expect(onEditQuiz).toHaveBeenCalledOnce()
    expect(
      screen.getByRole('button', { name: 'Delete quiz' }),
    ).toBeInTheDocument()

    rerender(
      <MemoryRouter>
        <QuizDetailsPageUI
          quiz={makeQuiz()}
          isOwner={false}
          onHostGame={() => undefined}
          onEditQuiz={() => undefined}
          onDeleteQuiz={() => undefined}
        />
      </MemoryRouter>,
    )
    expect(
      screen.queryByRole('button', { name: 'Edit quiz' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Delete quiz' }),
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Host Game' }),
    ).toBeInTheDocument()
  })

  it('uses icon-only owner action labels on mobile and visible labels on desktop', () => {
    const originalWidth = window.innerWidth
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 375,
    })
    renderUI({ isOwner: true })
    for (const id of ['delete-quiz-button', 'edit-quiz-button']) {
      const button = screen.getByTestId(`test-${id}-button`)
      expect(button).toHaveAccessibleName(
        id === 'delete-quiz-button' ? 'Delete quiz' : 'Edit quiz',
      )
      expect(button).not.toHaveTextContent(
        id === 'delete-quiz-button' ? 'Delete' : 'Edit',
      )
      expect(button.querySelector('svg')).toBeInTheDocument()
    }
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: Math.max(originalWidth, 1024),
    })
    fireEvent.resize(window)
    expect(
      screen.getByTestId('test-delete-quiz-button-button'),
    ).toHaveTextContent('Delete')
    expect(
      screen.getByTestId('test-edit-quiz-button-button'),
    ).toHaveTextContent('Edit')
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: originalWidth,
    })
    fireEvent.resize(window)
  })

  it('opens and confirms hosting dialog; close dismisses it', () => {
    const onHostGame = vi.fn()
    renderUI({ onHostGame })
    fireEvent.click(screen.getByRole('button', { name: 'Host Game' }))
    const dialog = screen.getByRole('dialog', { name: 'Host Game' })
    expect(dialog).toHaveTextContent(
      'Players will be able to join as soon as the game starts.',
    )
    fireEvent.click(within(dialog).getByRole('button', { name: /confirm/i }))
    expect(onHostGame).toHaveBeenCalledOnce()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }))
    expect(
      screen.queryByRole('dialog', { name: 'Host Game' }),
    ).not.toBeInTheDocument()
  })

  it('opens destructive delete confirmation only for owners and invokes deletion', () => {
    const onDeleteQuiz = vi.fn()
    renderUI({ isOwner: true, onDeleteQuiz })
    fireEvent.click(screen.getByRole('button', { name: 'Delete quiz' }))
    const dialog = screen.getByRole('dialog', { name: 'Delete Quiz' })
    expect(dialog).toHaveTextContent(
      'Are you sure you want to delete this quiz?',
    )
    fireEvent.click(within(dialog).getByRole('button', { name: /confirm/i }))
    expect(onDeleteQuiz).toHaveBeenCalledOnce()
  })

  it('closes the delete confirmation without invoking deletion', () => {
    const onDeleteQuiz = vi.fn()
    renderUI({ isOwner: true, onDeleteQuiz })
    fireEvent.click(screen.getByRole('button', { name: 'Delete quiz' }))
    const dialog = screen.getByRole('dialog', { name: 'Delete Quiz' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }))

    expect(
      screen.queryByRole('dialog', { name: 'Delete Quiz' }),
    ).not.toBeInTheDocument()
    expect(onDeleteQuiz).not.toHaveBeenCalled()
  })

  it('disables confirmation buttons while their respective actions are loading', () => {
    renderUI({
      isOwner: true,
      isHostGameLoading: true,
      isDeleteQuizLoading: true,
    })
    fireEvent.click(screen.getByRole('button', { name: 'Host Game' }))
    expect(
      within(screen.getByRole('dialog', { name: 'Host Game' })).getByRole(
        'button',
        { name: /confirm/i },
      ),
    ).toBeDisabled()
    fireEvent.click(
      within(screen.getByRole('dialog', { name: 'Host Game' })).getByRole(
        'button',
        { name: 'Close' },
      ),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Delete quiz' }))
    expect(
      within(screen.getByRole('dialog', { name: 'Delete Quiz' })).getByRole(
        'button',
        { name: /confirm/i },
      ),
    ).toBeDisabled()
  })

  it('shows ratings only for quizzes with a non-zero rating and forwards ratings/loading state', () => {
    const ratedQuiz = makeQuiz({
      ratingSummary: { stars: 4.5, comments: 10, total: 15 },
    })
    const { rerender } = renderUI({ quiz: ratedQuiz, ratings: [makeRating()] })
    expect(screen.getByTestId('ratings-section')).toBeInTheDocument()
    expect(screen.getByRole('separator')).toBeInTheDocument()
    expect(screen.getByTestId('rating-card')).toBeInTheDocument()

    rerender(
      <MemoryRouter>
        <QuizDetailsPageUI
          quiz={ratedQuiz}
          isLoadingRatings
          onHostGame={() => undefined}
          onEditQuiz={() => undefined}
          onDeleteQuiz={() => undefined}
        />
      </MemoryRouter>,
    )
    expect(screen.getAllByTestId('ratings-skeleton-card')).toHaveLength(3)

    rerender(
      <MemoryRouter>
        <QuizDetailsPageUI
          quiz={makeQuiz()}
          onHostGame={() => undefined}
          onEditQuiz={() => undefined}
          onDeleteQuiz={() => undefined}
        />
      </MemoryRouter>,
    )
    expect(screen.queryByTestId('ratings-section')).not.toBeInTheDocument()
    expect(screen.queryByRole('separator')).not.toBeInTheDocument()
  })
})
