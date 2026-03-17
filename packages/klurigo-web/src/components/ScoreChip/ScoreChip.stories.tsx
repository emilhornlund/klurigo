import type { Meta, StoryObj } from '@storybook/react'

import ScoreChip from './ScoreChip'

const meta = {
  title: 'Gameplay Components/ScoreChip',
  component: ScoreChip,
  tags: ['autodocs'],
} satisfies Meta<typeof ScoreChip>

export default meta
type Story = StoryObj<typeof meta>

export const Default = {
  args: {
    value: 1337,
  },
} satisfies Story
