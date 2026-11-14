import {
  GameMode,
  LanguageCode,
  QuizCategory,
  QuizVisibility,
} from '@klurigo/common'
import type { Meta, StoryObj } from '@storybook/react'
import { withRouter } from 'storybook-addon-remix-react-router'

import { withMockAuth } from '../../../../../.storybook/mockAuthContext'

import DiscoverCategoryPageUI from './DiscoverCategoryPageUI'

const meta = {
  title: 'Pages/DiscoverCategoryPage',
  component: DiscoverCategoryPageUI,
  decorators: [withRouter, withMockAuth],
  parameters: { layout: 'fullscreen' },
  args: {
    category: QuizCategory.Science,
    filter: { category: QuizCategory.Science },
    onFilterChange: () => {},
    onClearFilter: () => {},
    onLoadMore: () => {},
    onRetry: () => {},
    quizzes: [],
    isLoading: false,
    isError: false,
    isLoadingMore: false,
    isLoadingMoreError: false,
    hasMore: false,
  },
} satisfies Meta<typeof DiscoverCategoryPageUI>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    quizzes: Array.from({ length: 8 }, (_, i) => ({
      id: `science-${i}`,
      title: [
        'Science essentials',
        'The world of space',
        'Nature and discovery',
        'Everyday science',
      ][i % 4],
      category: QuizCategory.Science,
      mode: GameMode.Classic,
      languageCode: LanguageCode.English,
      visibility: QuizVisibility.Public,
      numberOfQuestions: 10 + i,
      author: { id: 'author', name: 'Quiz creator' },
      gameplaySummary: { count: 100 + i, totalPlayerCount: 200 + i },
      ratingSummary: { stars: 4.5, comments: 5, total: 10 },
      created: new Date(),
      updated: new Date(),
    })),
    hasMore: true,
  },
}
export const Empty: Story = {}
export const FilteredEmpty: Story = {
  args: { filter: { category: QuizCategory.Science, search: 'space' } },
}
export const Loading: Story = { args: { isLoading: true } }
export const Error: Story = { args: { isError: true } }
export const LoadMoreError: Story = {
  args: { ...Default.args, isLoadingMoreError: true },
}
export const InvalidCategory: Story = { args: { category: null } }
