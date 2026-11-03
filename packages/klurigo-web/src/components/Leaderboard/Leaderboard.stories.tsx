import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { expect, within } from 'storybook/test'

import Button from '../Button'
import Stack from '../Stack'

import Leaderboard from './Leaderboard'

const meta = {
  title: 'Gameplay Components/Leaderboard',
  component: Leaderboard,
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof Leaderboard>

export default meta
type Story = StoryObj<typeof meta>

export const Default = {
  args: {
    values: [
      {
        position: 1,
        nickname: 'ShadowCyborg',
        score: 18456,
        streaks: 5,
        previousPosition: 2,
      },
      { position: 2, nickname: 'Radar', score: 18398, previousPosition: 1 },
      {
        position: 3,
        nickname: 'ShadowWhirlwind',
        score: 15492,
        streaks: 2,
        previousPosition: 4,
      },
      {
        position: 4,
        nickname: 'WhiskerFox',
        score: 14118,
        streaks: 2,
        previousPosition: 6,
      },
      {
        position: 5,
        nickname: 'JollyNimbus',
        score: 13463,
        previousPosition: 3,
      },
      { position: 6, nickname: 'PuddingPop', score: 12459 },
      { position: 7, nickname: 'MysticPine', score: 11086, streaks: 1 },
      {
        position: 8,
        nickname: 'FrostyBear',
        score: 10361,
        streaks: 1,
        previousPosition: 9,
      },
      { position: 9, nickname: 'Willo', score: 9360 },
      {
        position: 10,
        nickname: 'ScarletFlame',
        score: 6723,
        previousPosition: 12,
      },
    ],
  },
} satisfies Story

export const WithoutPodium = {
  args: {
    values: [
      { position: 1, nickname: 'ShadowCyborg', score: 18456 },
      { position: 2, nickname: 'Radar', score: 18398 },
      { position: 3, nickname: 'ShadowWhirlwind', score: 15492 },
      { position: 4, nickname: 'WhiskerFox', score: 14118 },
      { position: 5, nickname: 'JollyNimbus', score: 13463 },
      { position: 6, nickname: 'PuddingPop', score: 12459 },
      { position: 7, nickname: 'MysticPine', score: 11086 },
      { position: 8, nickname: 'FrostyBear', score: 10361 },
      { position: 9, nickname: 'Willo', score: 9360 },
      { position: 10, nickname: 'ScarletFlame', score: 6723 },
    ],
    includePodium: false,
  },
} satisfies Story

export const WithRankChanges = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const rows = canvas.getAllByTestId('leaderboard-row')
    const unchanged = canvas.getByRole('img', { name: 'Rank unchanged' })

    await expect(unchanged.getAnimations()).toHaveLength(0)

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      // Includes row, rank, medal, and score animations.
      await expect(canvasElement.getAnimations({ subtree: true })).toHaveLength(
        0,
      )
      for (const row of rows) {
        await expect(getComputedStyle(row).opacity).toBe('1')
        await expect(getComputedStyle(row).transform).toBe('none')
      }
      return
    }

    for (const [index, row] of rows.entries()) {
      const animation = row.getAnimations()[0]
      const effect = animation.effect as KeyframeEffect
      const frames = effect.getKeyframes()
      // Delayed rows stay readable and the entire reveal takes under a second.
      await expect(Number(frames[0].opacity)).toBeGreaterThanOrEqual(0.65)
      await expect(effect.getTiming().delay).toBe(index * 120)
      await expect(Number(effect.getComputedTiming().endTime)).toBeLessThan(
        1000,
      )
    }

    for (const [name, direction] of [
      ['Up 4 places, from rank 5', 1],
      ['Down 2 places, from rank 1', -1],
    ] as const) {
      const indicator = canvas.getByRole('img', { name })
      const effect = indicator.getAnimations()[0].effect as KeyframeEffect
      const firstFrame = effect.getKeyframes()[0]
      const offset = new DOMMatrix(String(firstFrame.transform)).m42
      await expect(offset * direction).toBeGreaterThan(0)
    }
  },
  args: {
    values: [
      {
        position: 1,
        nickname: 'StarJumper',
        score: 15000,
        streaks: 8,
        previousPosition: 5,
      }, // Big rank up
      {
        position: 2,
        nickname: 'SteadyEddie',
        score: 14500,
        streaks: 4,
        previousPosition: 2,
      }, // No change
      {
        position: 3,
        nickname: 'FallenPhoenix',
        score: 14000,
        streaks: 6,
        previousPosition: 1,
      }, // Rank down
      { position: 4, nickname: 'Newcomer', score: 12000, streaks: 2 }, // No previous position
      {
        position: 5,
        nickname: 'ClimbingTurtle',
        score: 11000,
        streaks: 1,
        previousPosition: 8,
      }, // Rank up
    ],
  },
} satisfies Story

export const MixedRankChanges = {
  args: {
    values: [
      {
        position: 1,
        nickname: 'Rocket',
        score: 20000,
        streaks: 10,
        previousPosition: 3,
      }, // Rank up
      { position: 2, nickname: 'Comet', score: 18000, streaks: 5 }, // No previous position
      {
        position: 3,
        nickname: 'Meteor',
        score: 16000,
        streaks: 3,
        previousPosition: 3,
      }, // No change
      {
        position: 4,
        nickname: 'Asteroid',
        score: 14000,
        streaks: 2,
        previousPosition: 1,
      }, // Rank down
      {
        position: 5,
        nickname: 'Nebula',
        score: 12000,
        streaks: 1,
        previousPosition: 7,
      }, // Rank up
    ],
  },
} satisfies Story

export const UnchangedRanks = {
  args: {
    values: WithRankChanges.args.values.map((value) => ({
      ...value,
      previousPosition: value.position,
    })),
  },
} satisfies Story

export const FirstRound = {
  args: {
    values: WithRankChanges.args.values.map((value) => ({
      ...value,
      previousPosition: undefined,
    })),
  },
} satisfies Story

export const ConstrainedLayout = {
  args: {
    values: WithRankChanges.args.values.map((value) => ({
      ...value,
      nickname: `${value.nickname}WithAVeryLongNickname`,
      score: value.score * 100,
    })),
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 390, margin: 'auto' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Story

export const RoundUpdates = {
  args: WithRankChanges.args,
  render: function RoundUpdates(args) {
    const [nextRound, setNextRound] = useState(false)
    const values = nextRound
      ? [...args.values].reverse().map((value, index) => ({
          ...value,
          position: index + 1,
          previousPosition: value.position,
          score: 20000 - index * 1000,
        }))
      : args.values

    return (
      <Stack width="full">
        <Button
          id="update-round"
          type="button"
          onClick={() => setNextRound((previous) => !previous)}>
          Toggle round results
        </Button>
        <Leaderboard {...args} values={values} />
      </Stack>
    )
  },
} satisfies Story
