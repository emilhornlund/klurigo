import {
  type DiscoveryQuizCardDto,
  GameMode,
  LanguageCode,
  QuizCategory,
} from '@klurigo/common'
import type { Meta, StoryObj } from '@storybook/react'
import { withRouter } from 'storybook-addon-remix-react-router'

import QuizDiscoveryCard from './QuizDiscoveryCard'

const sampleQuiz: DiscoveryQuizCardDto = {
  id: 'quiz-1',
  title: 'World Geography Challenge',
  description: 'Test your knowledge of world geography',
  imageCoverURL: 'https://picsum.photos/seed/geography/400/250',
  category: QuizCategory.Geography,
  languageCode: LanguageCode.English,
  mode: GameMode.Classic,
  numberOfQuestions: 20,
  author: { id: 'author-1', name: 'Jane Doe' },
  gameplaySummary: {
    count: 1234,
    totalPlayerCount: 500,
  },
  ratingSummary: { stars: 4.7, comments: 42, total: 70 },
  created: new Date(),
}

const meta = {
  title: 'Components/QuizDiscoveryCard',
  component: QuizDiscoveryCard,
  decorators: [withRouter],
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof QuizDiscoveryCard>

export default meta
type Story = StoryObj<typeof meta>

export const Default = {
  args: {
    quiz: sampleQuiz,
  },
} satisfies Story

export const NoCoverImage = {
  args: {
    quiz: {
      ...sampleQuiz,
      imageCoverURL: undefined,
    },
  },
} satisfies Story

export const NoRating = {
  args: {
    quiz: {
      ...sampleQuiz,
      ratingSummary: { stars: 0, comments: 0, total: 0 },
    },
  },
} satisfies Story

export const LongTitle = {
  args: {
    quiz: {
      ...sampleQuiz,
      title:
        'An Extremely Long Quiz Title That Should Be Truncated With Ellipsis',
    },
  },
} satisfies Story
