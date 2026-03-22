import type { Meta, StoryObj } from '@storybook/react'

import RailHeader from './RailHeader'

const meta = {
  title: 'Components/RailHeader',
  component: RailHeader,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof RailHeader>

export default meta
type Story = StoryObj<typeof meta>

export const Default = {
  args: {
    title: 'Trending',
  },
} satisfies Story

export const WithDescription = {
  args: {
    title: 'Trending',
    description: 'Quizzes with the most recent activity',
  },
} satisfies Story

export const WithAction = {
  args: {
    title: 'Top Rated',
    description: 'Our highest-rated quizzes',
    action: <a href="/discover/section/TOP_RATED">See all →</a>,
  },
} satisfies Story
