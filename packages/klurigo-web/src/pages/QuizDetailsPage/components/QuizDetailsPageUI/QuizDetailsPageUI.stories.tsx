import {
  DEFAULT_CRITTERS_AVATAR_V1,
  GameMode,
  LanguageCode,
  QuestionType,
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
const daysAgo = (days: number) => new Date(Date.now() - days * 86_400_000)
const lastPlayed = daysAgo(1.5)

const makeRatings = (count: number): QuizRatingDto[] =>
  Array.from({ length: count }, (_, i) => ({
    id: `rating-${i}`,
    quizId: 'quiz-1',
    stars: (i % 5) + 1,
    comment: `Comment ${i + 1}: This quiz was really fun!`,
    author: {
      id: `user-${i}`,
      nickname: `User ${i + 1}`,
      avatar: DEFAULT_CRITTERS_AVATAR_V1,
    },
    createdAt: new Date(Date.now() - i * 1000 * 60 * 60),
    updatedAt: new Date(Date.now() - i * 1000 * 60 * 60),
  }))

const meta = {
  title: 'Pages/QuizDetailsPage',
  component: QuizDetailsPageUI,
  decorators: [
    withRouter,
    withMockAuth,
    (Story) => (
      <div style={{ width: '100vw' }}>
        <Story />
      </div>
    ),
  ],
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
      author: {
        id: uuidv4(),
        name: 'FrostyBear',
        avatar: { ...DEFAULT_CRITTERS_AVATAR_V1, top: null },
      },
      gameplaySummary: {
        count: 5,
        totalPlayerCount: 42,
        difficultyPercentage: 0.48,
        lastPlayed,
      },
      ratingSummary: { stars: 4.6, comments: 13, total: 15 },
      created: new Date(),
      updated: new Date(),
    },
    sampleQuestions: {
      status: 'ready',
      questions: [
        {
          type: QuestionType.MultiChoice,
          question: 'Which country has the most natural lakes?',
        },
        {
          type: QuestionType.TrueFalse,
          question:
            'The Pacific Ocean is larger than all of Earth’s land area combined.',
        },
        {
          type: QuestionType.Puzzle,
          question:
            'Put these cities in order from north to south, starting with the one closest to the Arctic Circle.',
        },
      ],
    },
    recentGames: [
      {
        completed: lastPlayed.toISOString(),
        playerCount: 12,
        correctnessPercentage: 74,
      },
      {
        completed: daysAgo(3.5).toISOString(),
        playerCount: 6,
        correctnessPercentage: 61,
      },
      {
        completed: daysAgo(7.5).toISOString(),
        playerCount: 18,
        correctnessPercentage: 86,
      },
    ],
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

export const SampleQuestionsLoading = {
  args: { ...Default.args, sampleQuestions: { status: 'loading' } },
} satisfies Story

export const SampleQuestionsError = {
  args: {
    ...Default.args,
    sampleQuestions: { status: 'error', onRetry: () => undefined },
  },
} satisfies Story

export const NoRecentGames = {
  args: {
    ...Default.args,
    quiz: {
      ...Default.args.quiz,
      gameplaySummary: { count: 0, totalPlayerCount: 0 },
    },
    recentGames: [],
  },
} satisfies Story

export const ZeroToOneHundredRecentGames = {
  args: {
    ...Default.args,
    quiz: {
      ...Default.args.quiz,
      mode: GameMode.ZeroToOneHundred,
      numberOfQuestions: 1,
      gameplaySummary: { count: 1, totalPlayerCount: 3, lastPlayed },
    },
    sampleQuestions: {
      status: 'ready',
      questions: [
        {
          type: QuestionType.Range,
          question: 'How many degrees north of the equator is Reykjavík?',
        },
      ],
    },
    recentGames: [
      {
        completed: lastPlayed.toISOString(),
        playerCount: 3,
        averagePrecisionPercentage: 81,
      },
    ],
  },
} satisfies Story

export const NoRatings = {
  args: {
    ...Default.args,
    quiz: {
      ...Default.args.quiz!,
      ratingSummary: { stars: 0, comments: 0, total: 0 },
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

export const ImageCoverFailToLoad = {
  args: {
    ...Default.args,
    quiz: {
      ...Default.args.quiz,
      imageCoverURL: 'http://no-image.png',
    },
  },
} satisfies Story
