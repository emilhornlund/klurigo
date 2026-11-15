import { DEFAULT_CRITTERS_AVATAR_V1 } from '@klurigo/common'
import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'

import Button from '../Button'

import Podium from './Podium'

const meta = {
  title: 'Gameplay Components/Podium',
  component: Podium,
  decorators: [
    (Story) => (
      <div style={{ width: '100vw', maxWidth: 600, padding: '4rem 1rem 1rem' }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof Podium>

export default meta
type Story = StoryObj<typeof meta>

export const Default = {
  args: {
    values: [
      {
        position: 1,
        nickname: 'ShadowCyborg',
        score: 18456,
        avatar: { ...DEFAULT_CRITTERS_AVATAR_V1, body: 'block', top: null },
      },
      {
        position: 2,
        nickname: 'Radar',
        score: 18398,
        avatar: { ...DEFAULT_CRITTERS_AVATAR_V1, body: 'blob', cheeks: null },
      },
      {
        position: 3,
        nickname: 'ShadowWhirlwind',
        score: 15492,
        avatar: DEFAULT_CRITTERS_AVATAR_V1,
      },
      {
        position: 4,
        nickname: 'WhiskerFox',
        score: 14118,
        avatar: DEFAULT_CRITTERS_AVATAR_V1,
      },
      {
        position: 5,
        nickname: 'JollyNimbus',
        score: 13463,
        avatar: DEFAULT_CRITTERS_AVATAR_V1,
      },
      {
        position: 6,
        nickname: 'PuddingPop',
        score: 12459,
        avatar: DEFAULT_CRITTERS_AVATAR_V1,
      },
      {
        position: 7,
        nickname: 'MysticPine',
        score: 11086,
        avatar: DEFAULT_CRITTERS_AVATAR_V1,
      },
      {
        position: 8,
        nickname: 'FrostyBear',
        score: 10361,
        avatar: DEFAULT_CRITTERS_AVATAR_V1,
      },
      {
        position: 9,
        nickname: 'Willo',
        score: 9360,
        avatar: DEFAULT_CRITTERS_AVATAR_V1,
      },
      {
        position: 10,
        nickname: 'ScarletFlame',
        score: 6723,
        avatar: DEFAULT_CRITTERS_AVATAR_V1,
      },
    ],
  },
} satisfies Story

export const ThreePlayers = {
  args: {
    values: [
      {
        position: 1,
        nickname: 'ShadowCyborg',
        score: 18456,
        avatar: DEFAULT_CRITTERS_AVATAR_V1,
      },
      {
        position: 2,
        nickname: 'Radar',
        score: 18398,
        avatar: DEFAULT_CRITTERS_AVATAR_V1,
      },
      {
        position: 3,
        nickname: 'ShadowWhirlwind',
        score: 15492,
        avatar: DEFAULT_CRITTERS_AVATAR_V1,
      },
    ],
  },
} satisfies Story

export const FinalReveal = {
  args: ThreePlayers.args,
  parameters: {
    docs: {
      description: {
        story:
          'Bronze, silver, then gold: the winner’s nickname reveal cues the crown, a finite sparkle/glow flourish, and epic confetti. Replay to watch again. With prefers-reduced-motion enabled, the complete podium appears immediately without celebration motion.',
      },
    },
  },
  render: function ReplayablePodium(args) {
    const [replay, setReplay] = useState(0)
    return (
      <>
        <Podium key={replay} {...args} />
        <Button
          id="replay-podium"
          type="button"
          onClick={() => setReplay((value) => value + 1)}>
          Replay podium reveal
        </Button>
      </>
    )
  },
} satisfies Story

export const TwoPlayers = {
  args: {
    values: [
      {
        position: 1,
        nickname: 'ShadowCyborg',
        score: 18456,
        avatar: DEFAULT_CRITTERS_AVATAR_V1,
      },
      {
        position: 2,
        nickname: 'Radar',
        score: 18398,
        avatar: DEFAULT_CRITTERS_AVATAR_V1,
      },
    ],
  },
} satisfies Story

export const OnePlayer = {
  args: {
    values: [
      {
        position: 1,
        nickname: 'ShadowCyborg',
        score: 18456,
        avatar: DEFAULT_CRITTERS_AVATAR_V1,
      },
    ],
  },
} satisfies Story
