import {
  type DiscoveryQuizCardDto,
  DiscoverySectionKey,
  GameMode,
  LanguageCode,
  QuizCategory,
} from '@klurigo/common'
import type { Meta, StoryObj } from '@storybook/react'
import { withRouter } from 'storybook-addon-remix-react-router'

import DiscoveryRailSection from './DiscoveryRailSection'

const makeSampleQuizzes = (count: number): DiscoveryQuizCardDto[] =>
  Array.from({ length: count }, (_, i) => ({
    id: `quiz-${i + 1}`,
    title: `Sample Quiz ${i + 1}`,
    description: 'A sample quiz for demonstration',
    imageCoverURL: `https://picsum.photos/seed/quiz${i + 1}/400/250`,
    category: QuizCategory.Science,
    languageCode: LanguageCode.English,
    mode: GameMode.Classic,
    numberOfQuestions: 10 + i,
    author: { id: `author-${i}`, name: `Author ${i + 1}` },
    gameplaySummary: {
      count: 100 * (i + 1),
      totalPlayerCount: 50 * (i + 1),
    },
    ratingSummary: { stars: 3.5 + (i % 3) * 0.5, comments: i * 3, total: 10 },
    created: new Date(),
  }))

const meta = {
  title: 'Components/DiscoveryRailSection',
  component: DiscoveryRailSection,
  decorators: [withRouter],
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof DiscoveryRailSection>

export default meta
type Story = StoryObj<typeof meta>

export const WithData = {
  args: {
    sectionKey: DiscoverySectionKey.TRENDING,
    title: 'Trending',
    description: 'Quizzes with the most recent activity',
    quizzes: makeSampleQuizzes(10),
    isLoading: false,
  },
} satisfies Story

export const Loading = {
  args: {
    sectionKey: DiscoverySectionKey.FEATURED,
    title: 'Featured',
    description: 'Hand-picked quizzes',
    quizzes: [],
    isLoading: true,
  },
} satisfies Story

export const FewCards = {
  args: {
    sectionKey: DiscoverySectionKey.TOP_RATED,
    title: 'Top Rated',
    quizzes: makeSampleQuizzes(3),
    isLoading: false,
  },
} satisfies Story

export const NoDescription = {
  args: {
    sectionKey: DiscoverySectionKey.MOST_PLAYED,
    title: 'Most Played',
    quizzes: makeSampleQuizzes(8),
    isLoading: false,
  },
} satisfies Story
