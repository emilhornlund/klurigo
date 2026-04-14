import {
  GameEventType,
  MediaType,
  QuestionImageRevealEffectType,
  QuestionType,
} from '@klurigo/common'
import type { Meta, StoryObj } from '@storybook/react'
import { withRouter } from 'storybook-addon-remix-react-router'

import { withMockGameHost } from '../../../.storybook/mockGameContext'

import HostQuestionState from './HostQuestionState'

const meta = {
  component: HostQuestionState,
  decorators: [withRouter, withMockGameHost],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof HostQuestionState>

export default meta
type Story = StoryObj<typeof meta>

export const QuestionMultiTwoAnswers = {
  args: {
    event: {
      type: GameEventType.GameQuestionHost,
      game: {
        pin: '123456',
      },
      question: {
        type: QuestionType.MultiChoice,
        question: 'Who painted The Starry Night?',
        media: {
          type: MediaType.Image,
          url: 'https://i.pinimg.com/originals/a6/60/72/a66072b0e88258f2898a76c3f3c01041.jpg',
        },
        answers: [{ value: 'Vincent van Gogh' }, { value: 'Pablo Picasso' }],
        duration: 30,
      },
      countdown: {
        initiatedTime: new Date().toISOString(),
        expiryTime: new Date(Date.now() + 60 * 1000).toISOString(),
        serverTime: new Date().toISOString(),
      },
      submissions: { current: 3, total: 10 },
      pagination: { current: 1, total: 20 },
    },
  },
} satisfies Story

export const QuestionMultiFourAnswers = {
  args: {
    event: {
      type: GameEventType.GameQuestionHost,
      game: {
        pin: '123456',
      },
      question: {
        type: QuestionType.MultiChoice,
        question: 'Who painted The Starry Night?',
        media: {
          type: MediaType.Image,
          url: 'https://wallpapercave.com/wp/wp2824407.jpg',
        },
        answers: [
          { value: 'Vincent van Gogh' },
          { value: 'Pablo Picasso' },
          { value: 'Leonardo da Vinci' },
          { value: 'Claude Monet' },
        ],
        duration: 30,
      },
      countdown: {
        initiatedTime: new Date().toISOString(),
        expiryTime: new Date(Date.now() + 60 * 1000).toISOString(),
        serverTime: new Date().toISOString(),
      },
      submissions: { current: 3, total: 10 },
      pagination: { current: 1, total: 20 },
    },
  },
} satisfies Story

export const QuestionMultiSixAnswers = {
  args: {
    event: {
      type: GameEventType.GameQuestionHost,
      game: {
        pin: '123456',
      },
      question: {
        type: QuestionType.MultiChoice,
        question: 'Who painted The Starry Night?',
        media: {
          type: MediaType.Image,
          url: 'https://wallpaperaccess.com/full/157316.jpg',
        },
        answers: [
          { value: 'Vincent van Gogh' },
          { value: 'Pablo Picasso' },
          { value: 'Leonardo da Vinci' },
          { value: 'Claude Monet' },
          { value: 'Michelangelo' },
          { value: 'Rembrandt' },
        ],
        duration: 30,
      },
      countdown: {
        initiatedTime: new Date().toISOString(),
        expiryTime: new Date(Date.now() + 60 * 1000).toISOString(),
        serverTime: new Date().toISOString(),
      },
      submissions: { current: 3, total: 10 },
      pagination: { current: 1, total: 20 },
    },
  },
} satisfies Story

export const QuestionSlider = {
  args: {
    event: {
      type: GameEventType.GameQuestionHost,
      game: {
        pin: '123456',
      },
      question: {
        type: QuestionType.Range,
        question: "What percentage of the earth's surface is covered by water?",
        media: {
          type: MediaType.Video,
          url: 'https://www.youtube.com/watch?v=LXb3EKWsInQ',
        },
        min: 0,
        max: 100,
        step: 1,
        duration: 30,
      },
      countdown: {
        initiatedTime: new Date().toISOString(),
        expiryTime: new Date(Date.now() + 60 * 1000).toISOString(),
        serverTime: new Date().toISOString(),
      },
      submissions: { current: 3, total: 10 },
      pagination: { current: 1, total: 20 },
    },
  },
} satisfies Story

export const QuestionTrueFalse = {
  args: {
    event: {
      type: GameEventType.GameQuestionHost,
      game: {
        pin: '123456',
      },
      question: {
        type: QuestionType.TrueFalse,
        question: "Rabbits can't vomit?",
        media: {
          type: MediaType.Audio,
          url: 'https://onlinetestcase.com/wp-content/uploads/2023/06/500-KB-MP3.mp3',
        },
        duration: 30,
      },
      countdown: {
        initiatedTime: new Date().toISOString(),
        expiryTime: new Date(Date.now() + 60 * 1000).toISOString(),
        serverTime: new Date().toISOString(),
      },
      submissions: { current: 3, total: 10 },
      pagination: { current: 1, total: 20 },
    },
  },
} satisfies Story

export const QuestionTypeAnswer = {
  args: {
    event: {
      type: GameEventType.GameQuestionHost,
      game: {
        pin: '123456',
      },
      question: {
        type: QuestionType.TypeAnswer,
        question: 'Who painted the Mono Lisa?',
        duration: 30,
      },
      countdown: {
        initiatedTime: new Date().toISOString(),
        expiryTime: new Date(Date.now() + 60 * 1000).toISOString(),
        serverTime: new Date().toISOString(),
      },
      submissions: { current: 3, total: 10 },
      pagination: { current: 1, total: 20 },
    },
  },
} satisfies Story

export const QuestionPin = {
  args: {
    event: {
      type: GameEventType.GameQuestionHost,
      game: {
        pin: '123456',
      },
      question: {
        type: QuestionType.Pin,
        question:
          'Where is the capital Stockholm located? Pin the answer on a map of Europe',
        imageURL:
          'https://upload.wikimedia.org/wikipedia/commons/7/7c/Europe_EU_laea_location_map_%28configurable%29.svg',
        duration: 30,
      },
      countdown: {
        initiatedTime: new Date().toISOString(),
        expiryTime: new Date(Date.now() + 60 * 1000).toISOString(),
        serverTime: new Date().toISOString(),
      },
      submissions: { current: 3, total: 10 },
      pagination: { current: 1, total: 20 },
    },
  },
} satisfies Story

export const QuestionPuzzle = {
  args: {
    event: {
      type: GameEventType.GameQuestionHost,
      game: {
        pin: '123456',
      },
      question: {
        type: QuestionType.Puzzle,
        question: 'Sort these planets from closest to farthest from the Sun',
        media: {
          type: MediaType.Image,
          url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Solar_sys8.jpg/960px-Solar_sys8.jpg',
        },
        values: ['Mercury', 'Venus', 'Earth', 'Mars'],
        duration: 30,
      },
      countdown: {
        initiatedTime: new Date().toISOString(),
        expiryTime: new Date(Date.now() + 60 * 1000).toISOString(),
        serverTime: new Date().toISOString(),
      },
      submissions: { current: 3, total: 10 },
      pagination: { current: 1, total: 20 },
    },
  },
} satisfies Story

export const QuestionWithImageSquareEffect = {
  args: {
    event: {
      type: GameEventType.GameQuestionHost,
      game: {
        pin: '123456',
      },
      question: {
        type: QuestionType.MultiChoice,
        question: 'Who painted The Starry Night?',
        media: {
          type: MediaType.Image,
          url: 'https://i.pinimg.com/originals/a6/60/72/a66072b0e88258f2898a76c3f3c01041.jpg',
          effect: QuestionImageRevealEffectType.Square3x3,
        },
        answers: [{ value: 'Vincent van Gogh' }, { value: 'Pablo Picasso' }],
        duration: 30,
      },
      countdown: {
        initiatedTime: new Date().toISOString(),
        expiryTime: new Date(Date.now() + 30 * 1000).toISOString(),
        serverTime: new Date().toISOString(),
      },
      submissions: { current: 3, total: 10 },
      pagination: { current: 1, total: 20 },
    },
  },
} satisfies Story

export const QuestionWithImageBlurEffect = {
  args: {
    event: {
      type: GameEventType.GameQuestionHost,
      game: {
        pin: '123456',
      },
      question: {
        type: QuestionType.MultiChoice,
        question: 'Who painted The Starry Night?',
        media: {
          type: MediaType.Image,
          url: 'https://i.pinimg.com/originals/a6/60/72/a66072b0e88258f2898a76c3f3c01041.jpg',
          effect: QuestionImageRevealEffectType.Blur,
        },
        answers: [{ value: 'Vincent van Gogh' }, { value: 'Pablo Picasso' }],
        duration: 30,
      },
      countdown: {
        initiatedTime: new Date().toISOString(),
        expiryTime: new Date(Date.now() + 30 * 1000).toISOString(),
        serverTime: new Date().toISOString(),
      },
      submissions: { current: 3, total: 10 },
      pagination: { current: 1, total: 20 },
    },
  },
} satisfies Story

export const QuestionWithoutPlayers = {
  args: {
    event: {
      type: GameEventType.GameQuestionHost,
      game: {
        pin: '123456',
      },
      question: {
        type: QuestionType.MultiChoice,
        question: 'Who painted The Starry Night?',
        media: {
          type: MediaType.Image,
          url: 'https://i.pinimg.com/originals/a6/60/72/a66072b0e88258f2898a76c3f3c01041.jpg',
        },
        answers: [{ value: 'Vincent van Gogh' }, { value: 'Pablo Picasso' }],
        duration: 30,
      },
      countdown: {
        initiatedTime: new Date().toISOString(),
        expiryTime: new Date(Date.now() + 60 * 1000).toISOString(),
        serverTime: new Date().toISOString(),
      },
      submissions: { current: 0, total: 0 },
      pagination: { current: 1, total: 20 },
    },
  },
} satisfies Story
