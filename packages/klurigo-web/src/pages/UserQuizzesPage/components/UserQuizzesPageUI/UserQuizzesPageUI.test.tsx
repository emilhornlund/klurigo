import type { DiscoveryQuizCardDto } from '@klurigo/common'
import { GameMode, LanguageCode, QuizCategory } from '@klurigo/common'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { v4 as uuidv4 } from 'uuid'
import { describe, expect, it, vi } from 'vitest'

import UserQuizzesPageUI from './UserQuizzesPageUI'

const authorId = uuidv4()

const makeQuiz = (id: string, title: string): DiscoveryQuizCardDto => ({
  id,
  title,
  description: 'A public quiz',
  imageCoverURL: 'https://wallpaperaccess.com/full/157316.jpg',
  category: QuizCategory.GeneralKnowledge,
  languageCode: LanguageCode.English,
  mode: GameMode.Classic,
  numberOfQuestions: 14,
  author: { id: authorId, name: 'FrostyBear' },
  gameplaySummary: {
    count: 9,
    totalPlayerCount: 102,
  },
  ratingSummary: { stars: 0, comments: 0, total: 0 },
  created: new Date('2025-06-15T12:00:00.000Z'),
})

describe('UserQuizzesPageUI', () => {
  it('should render UserQuizzesPageUI with card grid', async () => {
    render(
      <MemoryRouter>
        <UserQuizzesPageUI
          quizzes={[
            makeQuiz('quiz-1', 'The Ultimate Geography Challenge'),
            makeQuiz('quiz-2', 'Pop Culture Trivia'),
          ]}
          isLoading={false}
          isLoadingMore={false}
          isError={false}
          hasMore={true}
          skeletonCount={10}
          onLoadMore={() => undefined}
        />
      </MemoryRouter>,
    )

    expect(screen.getByText('Public Quiz Shelf')).toBeInTheDocument()
    expect(screen.getByTestId('profile-quiz-grid')).toBeInTheDocument()
    expect(
      screen.getByText('The Ultimate Geography Challenge'),
    ).toBeInTheDocument()
  })

  it('shows "no quizzes yet" empty state when no quizzes', () => {
    render(
      <MemoryRouter>
        <UserQuizzesPageUI
          quizzes={[]}
          isLoading={false}
          isLoadingMore={false}
          isError={false}
          hasMore={false}
          skeletonCount={10}
          onLoadMore={vi.fn()}
        />
      </MemoryRouter>,
    )

    expect(screen.getByTestId('profile-empty-state')).toBeInTheDocument()
    expect(
      screen.getByText("This user hasn't shared any quizzes yet."),
    ).toBeInTheDocument()
    expect(screen.queryByTestId('profile-quiz-grid')).not.toBeInTheDocument()
  })

  it('renders the page heading and discovery cards without filter controls', () => {
    render(
      <MemoryRouter>
        <UserQuizzesPageUI
          quizzes={[makeQuiz('quiz-1', 'The Ultimate Geography Challenge')]}
          isLoading={false}
          isLoadingMore={false}
          isError={false}
          hasMore={false}
          skeletonCount={10}
          onLoadMore={vi.fn()}
        />
      </MemoryRouter>,
    )

    expect(screen.getByText('Public Quiz Shelf')).toBeInTheDocument()
    expect(
      screen.queryByTestId('test-user-quizzes-sort-select'),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByTestId('test-user-quizzes-order-select'),
    ).not.toBeInTheDocument()
  })
})
