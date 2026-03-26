import type {
  DiscoveryQuizCardDto,
  PublicUserProfileResponseDto,
} from '@klurigo/common'
import { GameMode, LanguageCode, QuizCategory } from '@klurigo/common'
import type { Meta, StoryObj } from '@storybook/react'
import { withRouter } from 'storybook-addon-remix-react-router'

import { withMockAuth } from '../../../../../.storybook/mockAuthContext'

import UserProfilePageUI from './UserProfilePageUI'

const profile: PublicUserProfileResponseDto = {
  id: 'user-1',
  nickname: 'FrostyBear',
  quizzesCount: 10,
  hostedGamesCount: 18,
  playedGamesCount: 42,
  createdAt: new Date('2024-02-14T10:00:00.000Z'),
}

const quizzes: DiscoveryQuizCardDto[] = Array.from(
  { length: 10 },
  (_, index) => ({
    id: `quiz-${index + 1}`,
    title: `FrostyBear quiz ${index + 1}`,
    description: `A cozy challenge #${index + 1}.`,
    imageCoverURL:
      index % 2 === 0
        ? `https://example.com/quizzes/frostybear-${index + 1}.jpg`
        : undefined,
    category:
      index % 3 === 0
        ? QuizCategory.Geography
        : index % 3 === 1
          ? QuizCategory.History
          : QuizCategory.Science,
    languageCode: LanguageCode.English,
    mode: GameMode.Classic,
    numberOfQuestions: 10 + index,
    author: { id: 'user-1', name: 'FrostyBear' },
    gameplaySummary: {
      count: 12 + index,
      totalPlayerCount: 40 + index * 5,
    },
    ratingSummary: {
      stars: 4.1 + (index % 4) * 0.2,
      comments: 3 + index,
      total: 8 + index,
    },
    created: new Date(
      `2025-01-${String(index + 1).padStart(2, '0')}T00:00:00.000Z`,
    ),
  }),
)

const meta = {
  title: 'Pages/UserProfilePage',
  component: UserProfilePageUI,
  decorators: [withRouter, withMockAuth],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof UserProfilePageUI>

export default meta
type Story = StoryObj<typeof meta>

export const Default = {
  args: {
    userId: 'user-1',
    profile,
    quizzes,
    isLoading: false,
    isError: false,
  },
} satisfies Story

export const EmptyRail = {
  args: {
    userId: 'user-1',
    profile,
    quizzes: [],
    isLoading: false,
    isError: false,
  },
} satisfies Story

export const ErrorState = {
  args: {
    userId: 'user-1',
    profile: undefined,
    quizzes: [],
    isLoading: false,
    isError: true,
  },
} satisfies Story
