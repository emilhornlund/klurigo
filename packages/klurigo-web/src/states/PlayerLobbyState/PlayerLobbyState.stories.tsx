import { DEFAULT_CRITTERS_AVATAR_V1, GameEventType } from '@klurigo/common'
import type { Meta, StoryObj } from '@storybook/react'
import { withRouter } from 'storybook-addon-remix-react-router'

import PlayerLobbyState from './PlayerLobbyState'

const meta = {
  component: PlayerLobbyState,
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
} satisfies Meta<typeof PlayerLobbyState>

export default meta
type Story = StoryObj<typeof meta>

export const Default = {
  args: {
    event: {
      type: GameEventType.GameLobbyPlayer,
      host: {
        avatar: { ...DEFAULT_CRITTERS_AVATAR_V1, body: 'tower', top: null },
      },
      game: { name: 'The Big Brain Quiz' },
      players: [{ nickname: 'FrostyBear' }],
      player: {
        nickname: 'FrostyBear',
        avatar: { ...DEFAULT_CRITTERS_AVATAR_V1, body: 'block', cheeks: null },
      },
    },
  },
} satisfies Story

/** Long identities and titles remain usable on constrained participant screens. */
export const LongIdentity = {
  args: {
    event: {
      ...Default.args.event,
      game: {
        name: 'A very long quiz title for the whole family to enjoy together',
      },
      player: { ...Default.args.event.player, nickname: 'W'.repeat(20) },
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
