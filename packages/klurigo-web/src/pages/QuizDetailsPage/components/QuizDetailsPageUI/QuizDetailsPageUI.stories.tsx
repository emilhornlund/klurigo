import {
  GameMode,
  LanguageCode,
  QuizCategory,
  type QuizRatingDto,
  QuizVisibility,
} from '@klurigo/common'
import type { Meta, StoryObj } from '@storybook/react'
import { withRouter } from 'storybook-addon-remix-react-router'
import { v4 as uuidv4 } from 'uuid'

import { withMockAuth } from '../../../../../.storybook/mockAuthContext'

import QuizDetailsPageUI from './QuizDetailsPageUI'

const quizId = uuidv4()

const makeRatings = (count: number): QuizRatingDto[] =>
  Array.from({ length: count }, (_, i) => ({
    id: `rating-${i}`,
    quizId: 'quiz-1',
    stars: (i % 5) + 1,
    comment: `Comment ${i + 1}: This quiz was really fun!`,
    author: {
      id: `user-${i}`,
      nickname: `User ${i + 1}`,
    },
    createdAt: new Date(Date.now() - i * 1000 * 60 * 60),
    updatedAt: new Date(Date.now() - i * 1000 * 60 * 60),
  }))

const meta = {
  title: 'Pages/QuizDetailsPage',
  component: QuizDetailsPageUI,
  decorators: [withRouter, withMockAuth],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof QuizDetailsPageUI>

export default meta
type Story = StoryObj<typeof meta>

export const Default = {
  args: {
    quiz: {
      id: quizId,
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
      author: { id: uuidv4(), name: 'FrostyBear' },
      gameplaySummary: {
        count: 5,
        totalPlayerCount: 42,
        difficultyPercentage: 0.48,
        lastPlayed: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5),
      },
      ratingSummary: { stars: 4.6, comments: 13 },
      created: new Date(),
      updated: new Date(),
    },
    ratings: makeRatings(10),
    isOwner: true,
    isLoadingQuiz: false,
    isHostGameLoading: false,
    isDeleteQuizLoading: false,
    onHostGame: () => undefined,
    onEditQuiz: () => undefined,
    onDeleteQuiz: () => undefined,
  },
} satisfies Story

export const NoRatings = {
  args: {
    ...Default.args,
    quiz: {
      ...Default.args.quiz!,
      ratingSummary: { stars: 0, comments: 0 },
    },
    ratings: [],
  },
} satisfies Story

export const LoadingRatings = {
  args: {
    ...Default.args,
    ratings: undefined,
    isLoadingRatings: true,
  },
} satisfies Story

export const RatingsError = {
  args: {
    ...Default.args,
    ratings: [],
  },
} satisfies Story

export const NoWrittenReviews = {
  args: {
    ...Default.args,
    ratings: [],
  },
} satisfies Story
