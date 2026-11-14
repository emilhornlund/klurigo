import type {
  DiscoveryQuizCardDto,
  PublicUserProfileResponseDto,
} from '@klurigo/common'
import {
  AuthProvider,
  DEFAULT_CRITTERS_AVATAR_V1,
  GameMode,
  LanguageCode,
  QuizCategory,
} from '@klurigo/common'
import type { Meta, StoryObj } from '@storybook/react'
import { withRouter } from 'storybook-addon-remix-react-router'

import { withMockAuth } from '../../../../../.storybook/mockAuthContext'
import { UserContext } from '../../../../context/user/UserContext'

import UserProfilePageUI from './UserProfilePageUI'
import styles from './UserProfilePageUI.stories.module.scss'

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
  decorators: [
    withRouter,
    withMockAuth,
    (Story) => (
      <div className={styles.viewport}>
        <Story />
      </div>
    ),
  ],
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

export const WithAvatar = {
  args: {
    ...EmptyRail.args,
    profile: { ...profile, avatar: DEFAULT_CRITTERS_AVATAR_V1 },
  },
  decorators: [
    (Story) => (
      <UserContext.Provider
        value={{
          currentUser: {
            id: 'MOCK',
            email: 'mock@example.com',
            defaultNickname: 'Current player',
            authProvider: AuthProvider.Local,
            avatar: {
              ...DEFAULT_CRITTERS_AVATAR_V1,
              body: 'block',
              top: 'sprout',
              bodyColor: '#6ee7b9',
              backgroundColor: '#0f766e',
            },
          },
          setCurrentUser: () => undefined,
          fetchCurrentUser: async () => undefined,
          clearCurrentUser: () => undefined,
        }}>
        <Story />
      </UserContext.Provider>
    ),
  ],
} satisfies Story

export const UnsupportedAvatar = {
  args: {
    ...EmptyRail.args,
    profile: {
      ...profile,
      avatar: {
        ...DEFAULT_CRITTERS_AVATAR_V1,
        version: 2,
      } as unknown as PublicUserProfileResponseDto['avatar'],
    },
  },
} satisfies Story

export const LongNickname = {
  args: {
    ...WithAvatar.args,
    profile: { ...WithAvatar.args.profile, nickname: 'ExtraordinaryPlayer' },
  },
} satisfies Story
