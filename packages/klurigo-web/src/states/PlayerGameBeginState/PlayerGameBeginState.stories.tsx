import { DEFAULT_CRITTERS_AVATAR_V1, GameEventType } from '@klurigo/common'
import type { Meta, StoryObj } from '@storybook/react'
import { withRouter } from 'storybook-addon-remix-react-router'

import PlayerGameBeginState from './PlayerGameBeginState'

const meta = {
  component: PlayerGameBeginState,
  decorators: [
    withRouter,
    (Story) => (
      <div style={{ width: '100vw' }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof PlayerGameBeginState>

export default meta
type Story = StoryObj<typeof meta>

export const Default = {
  args: {
    event: {
      type: GameEventType.GameBeginPlayer,
      player: {
        nickname: 'FrostyBear',
        avatar: { ...DEFAULT_CRITTERS_AVATAR_V1, body: 'block', top: null },
      },
    },
  },
} satisfies Story
