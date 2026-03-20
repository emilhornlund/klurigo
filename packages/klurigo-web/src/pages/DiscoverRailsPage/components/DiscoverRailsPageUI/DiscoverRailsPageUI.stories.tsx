import {
  type DiscoverySectionDto,
  DiscoverySectionKey,
  GameMode,
  LanguageCode,
  QuizCategory,
} from '@klurigo/common'
import type { Meta, StoryObj } from '@storybook/react'
import { withRouter } from 'storybook-addon-remix-react-router'

import { withMockAuth } from '../../../../../.storybook/mockAuthContext'

import DiscoverRailsPageUI from './DiscoverRailsPageUI'

const makeSections = (): DiscoverySectionDto[] => [
  {
    key: DiscoverySectionKey.FEATURED,
    quizzes: Array.from({ length: 10 }, (_, i) => ({
      id: `featured-${i}`,
      title: `Featured Quiz ${i + 1}`,
      description: 'A featured quiz',
      imageCoverURL: `https://picsum.photos/seed/f${i}/400/250`,
      category: QuizCategory.Science,
      languageCode: LanguageCode.English,
      mode: GameMode.Classic,
      numberOfQuestions: 15 + i,
      author: { id: `a-${i}`, name: `Author ${i + 1}` },
      gameplaySummary: {
        count: 500 + i * 100,
        totalPlayerCount: 200 + i * 50,
      },
      ratingSummary: {
        stars: 4.2 + (i % 5) * 0.15,
        comments: i * 2,
        total: 15,
      },
      created: new Date(),
    })),
  },
  {
    key: DiscoverySectionKey.TRENDING,
    quizzes: Array.from({ length: 8 }, (_, i) => ({
      id: `trending-${i}`,
      title: `Trending Quiz ${i + 1}`,
      description: 'A trending quiz',
      imageCoverURL: `https://picsum.photos/seed/t${i}/400/250`,
      category: QuizCategory.History,
      languageCode: LanguageCode.English,
      mode: GameMode.Classic,
      numberOfQuestions: 12 + i,
      author: { id: `b-${i}`, name: `Creator ${i + 1}` },
      gameplaySummary: {
        count: 300 + i * 50,
        totalPlayerCount: 100 + i * 20,
      },
      ratingSummary: { stars: 3.8 + (i % 3) * 0.3, comments: i, total: 10 },
      created: new Date(),
    })),
  },
  {
    key: DiscoverySectionKey.TOP_RATED,
    quizzes: Array.from({ length: 6 }, (_, i) => ({
      id: `toprated-${i}`,
      title: `Top Rated Quiz ${i + 1}`,
      description: 'A top rated quiz',
      imageCoverURL: `https://picsum.photos/seed/tr${i}/400/250`,
      category: QuizCategory.Geography,
      languageCode: LanguageCode.English,
      mode: GameMode.Classic,
      numberOfQuestions: 20,
      author: { id: `c-${i}`, name: `Expert ${i + 1}` },
      gameplaySummary: {
        count: 1000 + i * 200,
        totalPlayerCount: 400 + i * 80,
      },
      ratingSummary: {
        stars: 4.6 + (i % 4) * 0.1,
        comments: 20 + i * 5,
        total: 50,
      },
      created: new Date(),
    })),
  },
]

const meta = {
  title: 'Pages/DiscoverRailsPage',
  component: DiscoverRailsPageUI,
  decorators: [withRouter, withMockAuth],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof DiscoverRailsPageUI>

export default meta
type Story = StoryObj<typeof meta>

const defaultFilterProps = {
  filter: {},
  onFilterChange: () => {},
  onClearFilter: () => {},
  searchResults: [],
  isSearchLoading: false,
  hasMore: false,
  onLoadMore: () => {},
}

export const Default = {
  args: {
    ...defaultFilterProps,
    sections: makeSections(),
    isLoading: false,
  },
} satisfies Story

export const Loading = {
  args: {
    ...defaultFilterProps,
    sections: [],
    isLoading: true,
  },
} satisfies Story

export const Empty = {
  args: {
    ...defaultFilterProps,
    sections: [],
    isLoading: false,
  },
} satisfies Story
