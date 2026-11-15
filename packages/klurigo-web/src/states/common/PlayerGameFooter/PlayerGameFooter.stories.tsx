import { DEFAULT_CRITTERS_AVATAR_V1 } from '@klurigo/common'
import type { Meta, StoryObj } from '@storybook/react'

import PlayerGameFooter from './PlayerGameFooter'

const meta = {
  title: 'Gameplay Components/PlayerGameFooter',
  component: PlayerGameFooter,
} satisfies Meta<typeof PlayerGameFooter>

export default meta
type Story = StoryObj<typeof meta>

export const Default = {
  args: {
    currentQuestion: 1,
    totalQuestions: 20,
    nickname: 'FrostyBear',
    avatar: DEFAULT_CRITTERS_AVATAR_V1,
    totalScore: 10361,
  },
} satisfies Story
