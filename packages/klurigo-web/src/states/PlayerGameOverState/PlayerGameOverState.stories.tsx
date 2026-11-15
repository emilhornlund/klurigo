import {
  DEFAULT_CRITTERS_AVATAR_V1,
  GAME_MAX_PLAYERS,
  GameEventType,
  GameMode,
} from '@klurigo/common'
import type { Meta, StoryObj } from '@storybook/react'
import { withRouter } from 'storybook-addon-remix-react-router'

import { withMockAuth } from '../../../.storybook/mockAuthContext'
import { withMockGamePlayer } from '../../../.storybook/mockGameContext'

import PlayerGameOverState from './PlayerGameOverState'

const meta = {
  component: PlayerGameOverState,
  decorators: [withRouter, withMockAuth, withMockGamePlayer],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof PlayerGameOverState>

export default meta
type Story = StoryObj<typeof meta>

export const Winner = {
  args: {
    event: {
      type: GameEventType.GameOverPlayer,
      game: { id: 'game-1', mode: GameMode.Classic },
      quiz: { id: 'quiz-1', title: 'Science Trivia' },
      player: {
        nickname: 'FrostyBear',
        avatar: DEFAULT_CRITTERS_AVATAR_V1,
        rank: 1,
        totalPlayers: GAME_MAX_PLAYERS,
        score: 12500,
        currentStreak: 8,
        comebackRankGain: 0,
        behind: null,
      },
      rating: {
        canRateQuiz: true,
        stars: undefined,
        comment: undefined,
      },
    },
  },
} satisfies Story

export const TopThree = {
  args: {
    event: {
      type: GameEventType.GameOverPlayer,
      game: { id: 'game-1', mode: GameMode.Classic },
      quiz: { id: 'quiz-1', title: 'World Geography' },
      player: {
        nickname: 'WhiskerFox',
        avatar: DEFAULT_CRITTERS_AVATAR_V1,
        rank: 3,
        totalPlayers: GAME_MAX_PLAYERS,
        score: 9800,
        currentStreak: 3,
        comebackRankGain: 0,
        behind: {
          points: 1200,
          nickname: 'FrostyBear',
          avatar: DEFAULT_CRITTERS_AVATAR_V1,
        },
      },
      rating: {
        canRateQuiz: true,
        stars: undefined,
        comment: undefined,
      },
    },
  },
} satisfies Story

export const TopTen = {
  args: {
    event: {
      type: GameEventType.GameOverPlayer,
      game: { id: 'game-1', mode: GameMode.Classic },
      quiz: { id: 'quiz-1', title: 'Movie Classics' },
      player: {
        nickname: 'BreezyOwl',
        avatar: DEFAULT_CRITTERS_AVATAR_V1,
        rank: 7,
        totalPlayers: GAME_MAX_PLAYERS,
        score: 6400,
        currentStreak: 0,
        comebackRankGain: 0,
        behind: {
          points: 3100,
          nickname: 'WhiskerFox',
          avatar: DEFAULT_CRITTERS_AVATAR_V1,
        },
      },
      rating: {
        canRateQuiz: true,
        stars: undefined,
        comment: undefined,
      },
    },
  },
} satisfies Story

export const Unranked = {
  args: {
    event: {
      type: GameEventType.GameOverPlayer,
      game: { id: 'game-1', mode: GameMode.Classic },
      quiz: { id: 'quiz-1', title: 'History Challenge' },
      player: {
        nickname: 'GloomyToad',
        avatar: DEFAULT_CRITTERS_AVATAR_V1,
        rank: 18,
        totalPlayers: GAME_MAX_PLAYERS,
        score: 1200,
        currentStreak: 0,
        comebackRankGain: 0,
        behind: {
          points: 8200,
          nickname: 'BreezyOwl',
          avatar: DEFAULT_CRITTERS_AVATAR_V1,
        },
      },
      rating: {
        canRateQuiz: true,
        stars: undefined,
        comment: undefined,
      },
    },
  },
} satisfies Story

export const WithRating = {
  args: {
    event: {
      type: GameEventType.GameOverPlayer,
      game: { id: 'game-1', mode: GameMode.Classic },
      quiz: { id: 'quiz-1', title: 'Science Trivia' },
      player: {
        nickname: 'FrostyBear',
        avatar: DEFAULT_CRITTERS_AVATAR_V1,
        rank: 1,
        totalPlayers: GAME_MAX_PLAYERS,
        score: 12500,
        currentStreak: 8,
        comebackRankGain: 0,
        behind: null,
      },
      rating: {
        canRateQuiz: true,
        stars: 4,
        comment: 'Really enjoyed this one!',
      },
    },
  },
} satisfies Story

export const CannotRate = {
  args: {
    event: {
      type: GameEventType.GameOverPlayer,
      game: { id: 'game-1', mode: GameMode.Classic },
      quiz: { id: 'quiz-1', title: 'My Own Quiz' },
      player: {
        nickname: 'QuizCreator',
        avatar: DEFAULT_CRITTERS_AVATAR_V1,
        rank: 2,
        totalPlayers: GAME_MAX_PLAYERS,
        score: 9000,
        currentStreak: 4,
        comebackRankGain: 0,
        behind: {
          points: 500,
          nickname: 'TopPlayer',
          avatar: DEFAULT_CRITTERS_AVATAR_V1,
        },
      },
      rating: {
        canRateQuiz: false,
        stars: undefined,
        comment: undefined,
      },
    },
  },
} satisfies Story

export const Comeback = {
  args: {
    event: {
      type: GameEventType.GameOverPlayer,
      game: { id: 'game-1', mode: GameMode.Classic },
      quiz: { id: 'quiz-1', title: 'Sports Trivia' },
      player: {
        nickname: 'RocketCat',
        avatar: DEFAULT_CRITTERS_AVATAR_V1,
        rank: 4,
        totalPlayers: GAME_MAX_PLAYERS,
        score: 8200,
        currentStreak: 6,
        comebackRankGain: 8,
        behind: {
          points: 700,
          nickname: 'WhiskerFox',
          avatar: DEFAULT_CRITTERS_AVATAR_V1,
        },
      },
      rating: {
        canRateQuiz: true,
        stars: undefined,
        comment: undefined,
      },
    },
  },
} satisfies Story
