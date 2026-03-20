import {
  GameMode,
  LanguageCode,
  QuizCategory,
  QuizVisibility,
} from '@klurigo/common'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { v4 as uuidv4 } from 'uuid'
import { describe, expect, it, vi } from 'vitest'

import ProfileQuizzesPageUI from './ProfileQuizzesPageUI'

const authorId = uuidv4()

describe('ProfileQuizzesPageUI', () => {
  const FIXED_DATE = new Date('2025-06-15T12:00:00.000Z')

  it('should render ProfileQuizzesPageUI with card grid', async () => {
    const { container } = render(
      <MemoryRouter>
        <ProfileQuizzesPageUI
          quizzes={[
            {
              id: 'c2c3d5cc-63c0-4f70-8665-6dacbd1796f9',
              title: 'The Ultimate Geography Challenge',
              description:
                'Test your knowledge of world capitals, landmarks, and continents in this fun and educational geography quiz.',
              mode: GameMode.Classic,
              visibility: QuizVisibility.Public,
              category: QuizCategory.GeneralKnowledge,
              imageCoverURL: 'https://wallpaperaccess.com/full/157316.jpg',
              languageCode: LanguageCode.English,
              numberOfQuestions: 14,
              author: { id: authorId, name: 'FrostyBear' },
              gameplaySummary: {
                count: 9,
                totalPlayerCount: 102,
                difficultyPercentage: 0.22,
                lastPlayed: FIXED_DATE,
              },
              ratingSummary: { stars: 0, comments: 0, total: 0 },
              created: FIXED_DATE,
              updated: FIXED_DATE,
            },
            {
              id: 'cb9e0c33-3f19-4b93-a976-acba28db8f82',
              title: 'Pop Culture Trivia',
              description:
                'How well do you know movies, music, and celebrity gossip? Find out with this entertaining pop culture quiz.',
              mode: GameMode.ZeroToOneHundred,
              visibility: QuizVisibility.Private,
              category: QuizCategory.GeneralKnowledge,
              languageCode: LanguageCode.English,
              numberOfQuestions: 20,
              author: { id: authorId, name: 'FrostyBear' },
              gameplaySummary: {
                count: 6,
                totalPlayerCount: 58,
                difficultyPercentage: 0.41,
                lastPlayed: FIXED_DATE,
              },
              ratingSummary: { stars: 0, comments: 0, total: 0 },
              created: FIXED_DATE,
              updated: FIXED_DATE,
            },
            {
              id: '8b6323a1-21ab-467b-b0d2-b835d7831ba7',
              title: 'History Through the Ages',
              description:
                'Explore key moments in history, from ancient civilizations to modern events, and see how much you remember.',
              mode: GameMode.Classic,
              visibility: QuizVisibility.Public,
              category: QuizCategory.GeneralKnowledge,
              languageCode: LanguageCode.English,
              numberOfQuestions: 16,
              author: { id: authorId, name: 'FrostyBear' },
              gameplaySummary: {
                count: 4,
                totalPlayerCount: 31,
                difficultyPercentage: 0.56,
                lastPlayed: FIXED_DATE,
              },
              ratingSummary: { stars: 0, comments: 0, total: 0 },
              created: FIXED_DATE,
              updated: FIXED_DATE,
            },
            {
              id: 'cc11c2f4-7d2d-4630-8780-d3e4e2dae743',
              title: 'Science Facts and Myths',
              description:
                'Separate fact from fiction as you answer questions about physics, biology, chemistry, and other scientific wonders.',
              mode: GameMode.ZeroToOneHundred,
              visibility: QuizVisibility.Private,
              category: QuizCategory.GeneralKnowledge,
              languageCode: LanguageCode.English,
              numberOfQuestions: 28,
              author: { id: authorId, name: 'FrostyBear' },
              gameplaySummary: {
                count: 2,
                totalPlayerCount: 17,
                difficultyPercentage: 0.74,
                lastPlayed: FIXED_DATE,
              },
              ratingSummary: { stars: 0, comments: 0, total: 0 },
              created: FIXED_DATE,
              updated: FIXED_DATE,
            },
            {
              id: 'c3550303-7f77-48bf-b114-e0d0c1152c0f',
              title: 'Literary Legends',
              description:
                'Dive into the world of books, famous authors, and classic stories in this quiz for literature enthusiasts.',
              mode: GameMode.Classic,
              visibility: QuizVisibility.Public,
              category: QuizCategory.GeneralKnowledge,
              languageCode: LanguageCode.English,
              numberOfQuestions: 24,
              author: { id: authorId, name: 'FrostyBear' },
              gameplaySummary: {
                count: 1,
                totalPlayerCount: 9,
                difficultyPercentage: 0.86,
                lastPlayed: FIXED_DATE,
              },
              ratingSummary: { stars: 0, comments: 0, total: 0 },
              created: FIXED_DATE,
              updated: FIXED_DATE,
            },
          ]}
          filter={{}}
          isLoading={false}
          isLoadingMore={false}
          isError={false}
          hasMore={true}
          skeletonCount={10}
          onLoadMore={() => undefined}
          onChangeSearchParams={() => undefined}
          onCreateQuiz={() => undefined}
        />
      </MemoryRouter>,
    )

    expect(container).toMatchSnapshot()
  })

  it('shows "no quizzes yet" empty state when no quizzes and no filter', () => {
    render(
      <MemoryRouter>
        <ProfileQuizzesPageUI
          quizzes={[]}
          filter={{}}
          isLoading={false}
          isLoadingMore={false}
          isError={false}
          hasMore={false}
          skeletonCount={10}
          onLoadMore={vi.fn()}
          onChangeSearchParams={vi.fn()}
          onCreateQuiz={vi.fn()}
        />
      </MemoryRouter>,
    )

    expect(screen.getByTestId('profile-empty-state')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Your quiz shelf is empty. Time to create your first one!',
      ),
    ).toBeInTheDocument()
    expect(screen.queryByTestId('profile-quiz-grid')).not.toBeInTheDocument()
  })

  it('shows "no matching quizzes" empty state when filters active but no results', () => {
    render(
      <MemoryRouter>
        <ProfileQuizzesPageUI
          quizzes={[]}
          filter={{ search: 'xyz' }}
          isLoading={false}
          isLoadingMore={false}
          isError={false}
          hasMore={false}
          skeletonCount={10}
          onLoadMore={vi.fn()}
          onChangeSearchParams={vi.fn()}
          onCreateQuiz={vi.fn()}
        />
      </MemoryRouter>,
    )

    expect(screen.getByTestId('profile-empty-state')).toBeInTheDocument()
    expect(
      screen.getByText(
        'No quiz cards matched that combo. Try mixing up your filters.',
      ),
    ).toBeInTheDocument()
    expect(screen.queryByTestId('profile-quiz-grid')).not.toBeInTheDocument()
  })
})
