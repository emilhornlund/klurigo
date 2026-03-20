import {
  GameMode,
  LanguageCode,
  QuizCategory,
  type QuizResponseDto,
  QuizVisibility,
} from '@klurigo/common'
import type { Meta, StoryObj } from '@storybook/react'
import { withRouter } from 'storybook-addon-remix-react-router'

import { withMockAuth } from '../../../../../../../.storybook/mockAuthContext'

import ProfileQuizCard from './ProfileQuizCard'

const makeQuiz = (overrides?: Partial<QuizResponseDto>): QuizResponseDto => ({
  id: 'quiz-1',
  title: 'The Ultimate Geography Challenge',
  description:
    'Test your knowledge of world capitals, landmarks, and continents.',
  mode: GameMode.Classic,
  visibility: QuizVisibility.Public,
  category: QuizCategory.Geography,
  imageCoverURL: 'https://picsum.photos/seed/geo/400/250',
  languageCode: LanguageCode.English,
  numberOfQuestions: 20,
  author: { id: 'author-1', name: 'GeoMaster' },
  gameplaySummary: {
    count: 150,
    totalPlayerCount: 800,
    difficultyPercentage: 0.45,
    lastPlayed: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5),
  },
  ratingSummary: { stars: 4.3, comments: 25, total: 35 },
  created: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30),
  updated: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
  ...overrides,
})

const meta = {
  title: 'Pages/ProfileQuizzesPage/ProfileQuizCard',
  component: ProfileQuizCard,
  decorators: [withRouter, withMockAuth],
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof ProfileQuizCard>

export default meta
type Story = StoryObj<typeof meta>

export const Default = {
  args: {
    quiz: makeQuiz(),
  },
} satisfies Story

export const NoCoverImage = {
  args: {
    quiz: makeQuiz({
      imageCoverURL: undefined,
      title: 'Science Quiz',
    }),
  },
} satisfies Story

export const PrivateVisibility = {
  args: {
    quiz: makeQuiz({
      visibility: QuizVisibility.Private,
      title: 'My Private Quiz',
    }),
  },
} satisfies Story

export const LongTitle = {
  args: {
    quiz: makeQuiz({
      title:
        'This is an extremely long quiz title that will definitely overflow and show ellipsis',
    }),
  },
} satisfies Story

export const JustUpdated = {
  args: {
    quiz: makeQuiz({
      title: 'Recently Updated Quiz',
      updated: new Date(Date.now() - 30000),
    }),
  },
} satisfies Story

export const ManyQuestions = {
  args: {
    quiz: makeQuiz({
      title: 'Comprehensive History Quiz',
      numberOfQuestions: 150,
      category: QuizCategory.History,
      imageCoverURL: 'https://picsum.photos/seed/hist/400/250',
    }),
  },
} satisfies Story
