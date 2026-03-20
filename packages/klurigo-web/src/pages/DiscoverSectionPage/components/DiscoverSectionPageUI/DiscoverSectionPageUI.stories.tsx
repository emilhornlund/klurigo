import {
  DiscoverySectionKey,
  GameMode,
  LanguageCode,
  QuizCategory,
} from '@klurigo/common'
import type { DiscoveryQuizCardDto } from '@klurigo/common'
import type { Meta, StoryObj } from '@storybook/react'
import { withRouter } from 'storybook-addon-remix-react-router'

import { withMockAuth } from '../../../../../.storybook/mockAuthContext'

import DiscoverSectionPageUI from './DiscoverSectionPageUI'

const makeQuizzes = (count: number): DiscoveryQuizCardDto[] =>
  Array.from({ length: count }, (_, i) => ({
    id: `quiz-${i}`,
    title: `Quiz ${i + 1}`,
    description: 'A sample quiz for the section page',
    imageCoverURL: `https://picsum.photos/seed/sec${i}/400/250`,
    category: QuizCategory.Science,
    languageCode: LanguageCode.English,
    mode: GameMode.Classic,
    numberOfQuestions: 12 + i,
    author: { id: `a-${i}`, name: `Author ${i + 1}` },
    gameplaySummary: {
      count: 200 + i * 50,
      totalPlayerCount: 80 + i * 20,
    },
    ratingSummary: { stars: 3.5 + (i % 5) * 0.2, comments: i * 3, total: 10 },
    created: new Date(),
  }))

const meta = {
  title: 'Pages/DiscoverSectionPage',
  component: DiscoverSectionPageUI,
  decorators: [withRouter, withMockAuth],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof DiscoverSectionPageUI>

export default meta
type Story = StoryObj<typeof meta>

export const Default = {
  args: {
    sectionKey: DiscoverySectionKey.TOP_RATED,
    quizzes: makeQuizzes(8),
    isLoading: false,
    isLoadingMore: false,
    hasMore: true,
    onLoadMore: () => {},
    isError: false,
  },
} satisfies Story

export const AllLoaded = {
  args: {
    sectionKey: DiscoverySectionKey.TRENDING,
    quizzes: makeQuizzes(4),
    isLoading: false,
    isLoadingMore: false,
    hasMore: false,
    onLoadMore: () => {},
    isError: false,
  },
} satisfies Story

export const Empty = {
  args: {
    sectionKey: DiscoverySectionKey.FEATURED,
    quizzes: [],
    isLoading: false,
    isLoadingMore: false,
    hasMore: false,
    onLoadMore: () => {},
    isError: false,
  },
} satisfies Story

export const Error = {
  args: {
    sectionKey: DiscoverySectionKey.FEATURED,
    quizzes: [],
    isLoading: false,
    isLoadingMore: false,
    hasMore: false,
    onLoadMore: () => {},
    isError: true,
  },
} satisfies Story
