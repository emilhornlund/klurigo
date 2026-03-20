import type { QuizRatingDto, QuizRatingSummaryDto } from '@klurigo/common'
import type { Meta, StoryObj } from '@storybook/react'

import RatingsSection from './RatingsSection'

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

const defaultSummary: QuizRatingSummaryDto = {
  stars: 4.6,
  comments: 13,
  total: 15,
}

const meta = {
  title: 'Components/RatingsSection',
  component: RatingsSection,
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof RatingsSection>

export default meta
type Story = StoryObj<typeof meta>

export const WithRatings = {
  args: {
    summary: defaultSummary,
    ratings: makeRatings(10),
  },
} satisfies Story

export const FewRatings = {
  args: {
    summary: { stars: 3.2, comments: 3, total: 5 },
    ratings: makeRatings(3),
  },
} satisfies Story

export const NoRatings = {
  args: {
    summary: { stars: 0, comments: 0, total: 0 },
    ratings: [],
  },
} satisfies Story

export const NoWrittenReviews = {
  args: {
    summary: { stars: 3.5, comments: 0, total: 5 },
    ratings: [],
  },
} satisfies Story

export const Loading = {
  args: {
    summary: defaultSummary,
    ratings: [],
    isLoading: true,
  },
} satisfies Story

export const AllComments = {
  args: {
    summary: { stars: 5.0, comments: 5, total: 10 },
    ratings: Array.from({ length: 5 }, (_, i) => ({
      id: `rating-${i}`,
      quizId: 'quiz-1',
      stars: 5,
      comment: `Excellent quiz! Loved question number ${i + 1}.`,
      author: { id: `user-${i}`, nickname: `Reviewer ${i + 1}` },
      createdAt: new Date(Date.now() - i * 1000 * 60 * 30),
      updatedAt: new Date(Date.now() - i * 1000 * 60 * 30),
    })),
  },
} satisfies Story

export const NoComments = {
  args: {
    summary: { stars: 2.8, comments: 0, total: 10 },
    ratings: Array.from({ length: 6 }, (_, i) => ({
      id: `rating-${i}`,
      quizId: 'quiz-1',
      stars: (i % 5) + 1,
      comment: undefined,
      author: { id: `user-${i}`, nickname: `User ${i + 1}` },
      createdAt: new Date(Date.now() - i * 1000 * 60 * 120),
      updatedAt: new Date(Date.now() - i * 1000 * 60 * 120),
    })),
  },
} satisfies Story
