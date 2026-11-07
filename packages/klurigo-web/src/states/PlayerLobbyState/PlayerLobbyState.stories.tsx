import { GameEventType } from '@klurigo/common'
import type { Meta, StoryObj } from '@storybook/react'
import { withRouter } from 'storybook-addon-remix-react-router'

import PlayerLobbyState from './PlayerLobbyState'

const meta = {
  component: PlayerLobbyState,
  decorators: [withRouter],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof PlayerLobbyState>

export default meta
type Story = StoryObj<typeof meta>

export const Default = {
  args: {
    event: {
      type: GameEventType.GameLobbyPlayer,
      game: { name: 'The Big Brain Quiz' },
      players: [{ nickname: 'FrostyBear' }],
      player: { nickname: 'FrostyBear' },
    },
  },
} satisfies Story

export const Multiplayer = {
  args: {
    event: {
      type: GameEventType.GameLobbyPlayer,
      game: { name: 'The Big Brain Quiz' },
      players: Array.from({ length: 8 }, (_, index) => ({
        nickname: `Player${index + 1}`,
      })),
      player: { nickname: 'FrostyBear' },
    },
  },
} satisfies Story
