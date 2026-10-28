import {
  GameEventType,
  type GameQuestionPlayerAnswerEvent,
  MediaType,
  QuestionType,
  type SubmitQuestionAnswerRequestDto,
} from '@klurigo/common'
import type { Meta, StoryObj } from '@storybook/react'
import type { FC } from 'react'
import { useEffect, useState } from 'react'
import { withRouter } from 'storybook-addon-remix-react-router'

import type { GameContextType } from '../../context/game'
import { GameContext } from '../../context/game'

import type { PlayerQuestionStateProps } from './PlayerQuestionState'
import PlayerQuestionState from './PlayerQuestionState'

const getSubmittedAnswer = (
  request: SubmitQuestionAnswerRequestDto,
): GameQuestionPlayerAnswerEvent => {
  switch (request.type) {
    case QuestionType.MultiChoice:
      return { type: request.type, value: request.optionIndex }
    case QuestionType.Range:
      return { type: request.type, value: request.value }
    case QuestionType.TrueFalse:
      return { type: request.type, value: request.value }
    case QuestionType.TypeAnswer:
      return { type: request.type, value: request.value }
    case QuestionType.Pin:
      return {
        type: request.type,
        value: `${request.positionX},${request.positionY}`,
      }
    case QuestionType.Puzzle:
      return { type: request.type, value: request.values }
  }
}

const InteractiveAnswerStory: FC<PlayerQuestionStateProps> = ({ event }) => {
  const [answer, setAnswer] = useState(event.answer)

  useEffect(() => {
    setAnswer(event.answer)
  }, [event.answer])

  const gameContext = {
    submitQuestionAnswer: async (
      request: SubmitQuestionAnswerRequestDto,
    ): Promise<void> => {
      setAnswer(getSubmittedAnswer(request))
    },
  } as unknown as GameContextType

  return (
    <GameContext.Provider value={gameContext}>
      <PlayerQuestionState event={{ ...event, answer }} />
    </GameContext.Provider>
  )
}

const meta = {
  component: PlayerQuestionState,
  decorators: [withRouter],
  render: (args) => <InteractiveAnswerStory {...args} />,
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof PlayerQuestionState>

export default meta
type Story = StoryObj<typeof meta>

const layoutStory = (
  question: string,
  mediaURL?: string,
  answers = ['Carthage', 'Alexandria', 'Athens', 'Rome'],
): Story => ({
  args: {
    event: {
      type: GameEventType.GameQuestionPlayer,
      player: {
        nickname: 'FrostyBear',
        score: { total: 10458 },
      },
      question: {
        type: QuestionType.MultiChoice,
        question,
        ...(mediaURL
          ? { media: { type: MediaType.Image, url: mediaURL } }
          : {}),
        answers: answers.map((value) => ({ value })),
        duration: 30,
      },
      countdown: {
        initiatedTime: new Date().toISOString(),
        expiryTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        serverTime: new Date().toISOString(),
      },
      pagination: { current: 1, total: 20 },
    },
  },
})

const landscapeImageURL =
  'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Solar_sys8.jpg/960px-Solar_sys8.jpg'

export const QuestionMultiChoiceTwoAnswers = {
  args: {
    event: {
      type: GameEventType.GameQuestionPlayer,
      player: {
        nickname: 'FrostyBear',
        score: { total: 10458 },
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
        expiryTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        serverTime: new Date().toISOString(),
      },
      pagination: { current: 1, total: 20 },
    },
  },
} satisfies Story

export const QuestionMultiChoiceFourAnswers = {
  args: {
    event: {
      type: GameEventType.GameQuestionPlayer,
      player: {
        nickname: 'FrostyBear',
        score: { total: 10458 },
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
        expiryTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        serverTime: new Date().toISOString(),
      },
      pagination: { current: 1, total: 20 },
    },
  },
} satisfies Story

export const QuestionMultiChoiceSixAnswers = {
  args: {
    event: {
      type: GameEventType.GameQuestionPlayer,
      player: {
        nickname: 'FrostyBear',
        score: { total: 10458 },
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
        expiryTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        serverTime: new Date().toISOString(),
      },
      pagination: { current: 1, total: 20 },
    },
  },
} satisfies Story

export const QuestionSlider = {
  args: {
    event: {
      type: GameEventType.GameQuestionPlayer,
      player: {
        nickname: 'FrostyBear',
        score: { total: 10458 },
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
        expiryTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        serverTime: new Date().toISOString(),
      },
      pagination: { current: 1, total: 20 },
    },
  },
} satisfies Story

export const QuestionTrueFalse = {
  args: {
    event: {
      type: GameEventType.GameQuestionPlayer,
      player: {
        nickname: 'FrostyBear',
        score: { total: 10458 },
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
        expiryTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        serverTime: new Date().toISOString(),
      },
      pagination: { current: 1, total: 20 },
    },
  },
} satisfies Story

export const QuestionTypeAnswer = {
  args: {
    event: {
      type: GameEventType.GameQuestionPlayer,
      player: {
        nickname: 'FrostyBear',
        score: { total: 10458 },
      },
      question: {
        type: QuestionType.TypeAnswer,
        question: 'Who painted the Mono Lisa?',
        duration: 30,
      },
      countdown: {
        initiatedTime: new Date().toISOString(),
        expiryTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        serverTime: new Date().toISOString(),
      },
      pagination: { current: 1, total: 20 },
    },
  },
} satisfies Story

export const QuestionPin = {
  args: {
    event: {
      type: GameEventType.GameQuestionPlayer,
      player: {
        nickname: 'FrostyBear',
        score: { total: 10458 },
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
        expiryTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        serverTime: new Date().toISOString(),
      },
      pagination: { current: 1, total: 20 },
    },
  },
} satisfies Story

export const QuestionPuzzle = {
  args: {
    event: {
      type: GameEventType.GameQuestionPlayer,
      player: {
        nickname: 'FrostyBear',
        score: { total: 10458 },
      },
      question: {
        type: QuestionType.Puzzle,
        question: 'Sort these planets from closest to farthest from the Sun',
        media: {
          type: MediaType.Image,
          url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Solar_sys8.jpg/960px-Solar_sys8.jpg',
        },
        values: ['Athens', 'Argos', 'Plovdiv', 'Lisbon'],
        duration: 30,
      },
      countdown: {
        initiatedTime: new Date().toISOString(),
        expiryTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        serverTime: new Date().toISOString(),
      },
      pagination: { current: 1, total: 20 },
    },
  },
} satisfies Story

export const ResponsiveShortNoImage = layoutStory('Where is Carthage?')

export const ResponsiveMediumNoImage = layoutStory(
  'The Church of St. George, carved from solid rock in the 12th century, is found in which Ethiopian town?',
)

export const ResponsiveLongNoImage = layoutStory(
  'Which ancient North African city on the coast of modern Tunisia became Rome’s rival during the Punic Wars?',
)

export const ResponsiveMediumLandscapeImage = layoutStory(
  'The Church of St. George, carved from solid rock in the 12th century, is found in which Ethiopian town?',
  landscapeImageURL,
)

export const ResponsiveLongLandscapeImage = layoutStory(
  'Which ancient North African city on the coast of modern Tunisia became Rome’s rival during the Punic Wars?',
  landscapeImageURL,
)

export const ResponsiveLongAnswerOptions = layoutStory(
  'Which description best explains why Carthage became Rome’s rival?',
  undefined,
  [
    'It controlled valuable Mediterranean trade routes and built a powerful navy across the western sea.',
    'It united the Greek city-states under a single ruler and conquered the Italian peninsula.',
    'It discovered a land route through the Alps and founded permanent settlements in northern Europe.',
    'It controlled the Nile delta and supplied grain to every major port in the eastern Mediterranean.',
  ],
)
