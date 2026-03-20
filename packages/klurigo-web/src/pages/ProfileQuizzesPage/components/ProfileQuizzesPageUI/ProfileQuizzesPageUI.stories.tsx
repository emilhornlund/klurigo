import {
  GameMode,
  LanguageCode,
  QuizCategory,
  QuizVisibility,
} from '@klurigo/common'
import type { Meta, StoryObj } from '@storybook/react'
import { withRouter } from 'storybook-addon-remix-react-router'
import { v4 as uuidv4 } from 'uuid'

import { withMockAuth } from '../../../../../.storybook/mockAuthContext'

import ProfileQuizzesPageUI from './ProfileQuizzesPageUI'

const meta = {
  title: 'Pages/ProfileQuizzesPage',
  component: ProfileQuizzesPageUI,
  decorators: [withRouter, withMockAuth],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof ProfileQuizzesPageUI>

export default meta
type Story = StoryObj<typeof meta>

const authorId = uuidv4()

export const Default = {
  args: {
    quizzes: [
      {
        id: uuidv4(),
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
          lastPlayed: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
        },
        ratingSummary: { stars: 0, comments: 0, total: 0 },
        created: new Date(),
        updated: new Date(),
      },
      {
        id: uuidv4(),
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
          lastPlayed: new Date(Date.now() - 1000 * 60 * 60 * 24 * 6),
        },
        ratingSummary: { stars: 0, comments: 0, total: 0 },
        created: new Date(),
        updated: new Date(),
      },
      {
        id: uuidv4(),
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
          lastPlayed: new Date(Date.now() - 1000 * 60 * 60 * 24 * 12),
        },
        ratingSummary: { stars: 0, comments: 0, total: 0 },
        created: new Date(),
        updated: new Date(),
      },
      {
        id: uuidv4(),
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
          lastPlayed: new Date(Date.now() - 1000 * 60 * 60 * 24 * 25),
        },
        ratingSummary: { stars: 0, comments: 0, total: 0 },
        created: new Date(),
        updated: new Date(),
      },
      {
        id: uuidv4(),
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
          lastPlayed: new Date(Date.now() - 1000 * 60 * 60 * 24 * 40),
        },
        ratingSummary: { stars: 0, comments: 0, total: 0 },
        created: new Date(),
        updated: new Date(),
      },
    ],
    filter: {},
    isLoading: false,
    isLoadingMore: false,
    isError: false,
    hasMore: true,
    skeletonCount: 10,
    onLoadMore: () => undefined,
    onChangeSearchParams: () => undefined,
    onCreateQuiz: () => undefined,
  },
} satisfies Story

export const AllLoaded = {
  args: {
    ...Default.args,
    hasMore: false,
  },
} satisfies Story

export const Empty = {
  args: {
    quizzes: [],
    filter: {},
    isLoading: false,
    isLoadingMore: false,
    isError: false,
    hasMore: false,
    skeletonCount: 10,
    onLoadMore: () => undefined,
    onChangeSearchParams: () => undefined,
    onCreateQuiz: () => undefined,
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
