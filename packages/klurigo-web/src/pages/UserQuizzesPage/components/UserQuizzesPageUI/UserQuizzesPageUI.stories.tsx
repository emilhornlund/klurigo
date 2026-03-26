import type { DiscoveryQuizCardDto } from '@klurigo/common'
import { GameMode, LanguageCode, QuizCategory } from '@klurigo/common'
import type { Meta, StoryObj } from '@storybook/react'
import { withRouter } from 'storybook-addon-remix-react-router'

import { withMockAuth } from '../../../../../.storybook/mockAuthContext'

import UserQuizzesPageUI from './UserQuizzesPageUI'

const authorId = 'author-1'

const makeQuiz = (
  id: string,
  title: string,
  overrides?: Partial<DiscoveryQuizCardDto>,
): DiscoveryQuizCardDto => ({
  id,
  title,
  description:
    'Test your knowledge of world capitals, landmarks, and continents.',
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
  created: new Date(),
  ...overrides,
})

const makeQuizzes = (length: number) =>
  Array.from({ length }, (_, index) =>
    makeQuiz(`quiz-${index + 1}`, `Public quiz ${index + 1}`, {
      mode: index % 3 === 0 ? GameMode.ZeroToOneHundred : GameMode.Classic,
      category:
        index % 3 === 0
          ? QuizCategory.GeneralKnowledge
          : index % 3 === 1
            ? QuizCategory.History
            : QuizCategory.Science,
      numberOfQuestions: 10 + index,
      gameplaySummary: {
        count: 9 + index,
        totalPlayerCount: 102 + index * 8,
      },
      created: new Date(
        `2025-02-${String(index + 1).padStart(2, '0')}T12:00:00Z`,
      ),
    }),
  )

const meta = {
  title: 'Pages/UserQuizzesPage',
  component: UserQuizzesPageUI,
  decorators: [withRouter, withMockAuth],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof UserQuizzesPageUI>

export default meta
type Story = StoryObj<typeof meta>

export const Default = {
  args: {
    quizzes: makeQuizzes(10),
    isLoading: false,
    isLoadingMore: false,
    isError: false,
    hasMore: true,
    skeletonCount: 10,
    onLoadMore: () => undefined,
  },
} satisfies Story

export const AllLoaded = {
  args: {
    ...Default.args,
    quizzes: makeQuizzes(12),
    hasMore: false,
  },
} satisfies Story

export const Empty = {
  args: {
    quizzes: [],
    isLoading: false,
    isLoadingMore: false,
    isError: false,
    hasMore: false,
    skeletonCount: 10,
    onLoadMore: () => undefined,
  },
} satisfies Story

export const Loading = {
  args: {
    ...Empty.args,
    isLoading: true,
  },
} satisfies Story

export const Error = {
  args: {
    ...Empty.args,
    isError: true,
  },
} satisfies Story
