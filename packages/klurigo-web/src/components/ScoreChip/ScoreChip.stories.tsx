import type { Meta, StoryObj } from '@storybook/react'

import ScoreChip from './ScoreChip'

const meta = {
  title: 'Gameplay Components/ScoreChip',
  component: ScoreChip,
  tags: ['autodocs'],
  args: {
    value: 1337,
    size: 'normal',
    color: 'inverse',
  },
} satisfies Meta<typeof ScoreChip>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Small: Story = {
  args: {
    size: 'small',
  },
}
