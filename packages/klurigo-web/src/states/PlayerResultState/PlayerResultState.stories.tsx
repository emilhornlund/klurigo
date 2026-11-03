import { GameEventType, GameMode } from '@klurigo/common'
import type { Meta, StoryObj } from '@storybook/react'
import { withRouter } from 'storybook-addon-remix-react-router'

import PlayerResultState from './PlayerResultState'

const meta = {
  component: PlayerResultState,
  decorators: [withRouter],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof PlayerResultState>

export default meta
type Story = StoryObj<typeof meta>

export const Correct = {
  args: {
    event: {
      type: GameEventType.GameResultPlayer,
      game: { mode: GameMode.Classic },
      player: {
        nickname: 'FrostyBear',
        score: {
          correct: true,
          last: 634,
          total: 10458,
          position: 1,
          streak: 3,
        },
        behind: {
          points: 123,
          nickname: 'WhiskerFox',
        },
      },
      pagination: {
        current: 1,
        total: 20,
      },
    },
  },
} satisfies Story

export const PartiallyCorrect = {
  args: {
    event: {
      type: GameEventType.GameResultPlayer,
      game: { mode: GameMode.Classic },
      player: {
        nickname: 'FrostyBear',
        score: {
          correct: false,
          last: 250,
          total: 10458,
          position: 2,
          streak: 0,
        },
      },
      pagination: {
        current: 1,
        total: 20,
      },
    },
  },
} satisfies Story

export const Incorrect = {
  args: {
    event: {
      type: GameEventType.GameResultPlayer,
      game: { mode: GameMode.Classic },
      player: {
        nickname: 'FrostyBear',
        score: {
          correct: false,
          last: 0,
          total: 10458,
          position: 1,
          streak: 0,
        },
        behind: {
          points: 123,
          nickname: 'WhiskerFox',
        },
      },
      pagination: {
        current: 1,
        total: 20,
      },
    },
  },
} satisfies Story

export const ZeroToOneHundred = {
  name: 'Zero to one hundred',
  args: {
    event: {
      type: GameEventType.GameResultPlayer,
      game: { mode: GameMode.ZeroToOneHundred },
      player: {
        nickname: 'FrostyBear',
        score: {
          correct: true,
          last: -10,
          total: 24,
          position: 1,
        },
        behind: {
          points: 12,
          nickname: 'WhiskerFox',
        },
      },
      pagination: {
        current: 1,
        total: 20,
      },
    },
  },
} satisfies Story

export const OrdinaryCorrect = {
  args: {
    event: {
      ...Correct.args.event,
      player: {
        nickname: 'SteadyPlayer',
        score: {
          correct: true,
          last: 420,
          total: 1420,
          position: 15,
          streak: 1,
        },
        behind: { points: 80, nickname: 'NextPlayer' },
      },
    },
  },
} satisfies Story

export const HighStreak = {
  args: {
    event: {
      ...Correct.args.event,
      player: {
        nickname: 'StreakMaster',
        score: {
          correct: true,
          last: 950,
          total: 8950,
          position: 8,
          streak: 7,
        },
      },
    },
  },
} satisfies Story

export const ZeroPoints = {
  args: {
    event: {
      ...OrdinaryCorrect.args.event,
      player: {
        ...OrdinaryCorrect.args.event.player,
        score: { ...OrdinaryCorrect.args.event.player.score, last: 0 },
      },
    },
  },
} satisfies Story

export const ZeroToOneHundredIncorrect = {
  args: {
    event: {
      ...ZeroToOneHundred.args.event,
      player: {
        nickname: 'FrostyBear',
        score: { correct: false, last: 20, total: 44, position: 7 },
      },
    },
  },
} satisfies Story
