import type { Meta, StoryObj } from '@storybook/react'

import NicknameChip from './NicknameChip'

const meta = {
  component: NicknameChip,
} satisfies Meta<typeof NicknameChip>

export default meta
type Story = StoryObj<typeof meta>

export const Default = {
  args: {
    value: 'FrostyBear',
  },
} satisfies Story

export const Deletable = {
  args: {
    value: 'Alice',
    onDelete: () => undefined,
  },
} satisfies Story
