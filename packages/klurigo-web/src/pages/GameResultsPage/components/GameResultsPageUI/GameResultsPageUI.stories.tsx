import { GameMode, QuestionType } from '@klurigo/common'
import type { Meta, StoryObj } from '@storybook/react'
import { withRouter } from 'storybook-addon-remix-react-router'
import { v4 as uuidv4 } from 'uuid'

import { withMockAuth } from '../../../../../.storybook/mockAuthContext'

import GameResultsPageUI from './GameResultsPageUI'

const meta = {
  title: 'Pages/GameResultsPage',
  component: GameResultsPageUI,
  decorators: [withRouter, withMockAuth],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof GameResultsPageUI>

export default meta
type Story = StoryObj<typeof meta>

const CURRENT_PARTICIPANT_ID = uuidv4()

export const Classic = {
  args: {
    results: {
      id: uuidv4(),
      mode: GameMode.Classic,
      name: 'Classic Quiz Debug',
      quiz: {
        id: '9a7381e5-6c9f-42a8-b6c9-e2e42a095e12',
        canRateQuiz: true,
        canHostLiveGame: true,
      },
      host: { id: uuidv4(), nickname: 'FrostyBear' },
      numberOfPlayers: 10,
      numberOfQuestions: 4,
      playerMetrics: [
        {
          player: {
            id: uuidv4(),
            nickname: 'GuessMachine',
          },
          rank: 1,
          comebackRankGain: 2,
          correct: 4,
          incorrect: 0,
          unanswered: 0,
          averageResponseTime: 2924,
          longestCorrectStreak: 4,
          score: 3846,
        },
        {
          player: {
            id: uuidv4(),
            nickname: 'QuizWhiz',
          },
          rank: 2,
          comebackRankGain: 4,
          correct: 4,
          incorrect: 0,
          unanswered: 0,
          averageResponseTime: 3310,
          longestCorrectStreak: 4,
          score: 3721,
        },
        {
          player: {
            id: uuidv4(),
            nickname: 'BrainiacBert',
          },
          rank: 3,
          comebackRankGain: 1,
          correct: 3,
          incorrect: 1,
          unanswered: 0,
          averageResponseTime: 3582,
          longestCorrectStreak: 3,
          score: 3458,
        },
        {
          player: {
            id: uuidv4(),
            nickname: 'TriviaTitan',
          },
          rank: 4,
          comebackRankGain: 3,
          correct: 3,
          incorrect: 1,
          unanswered: 0,
          averageResponseTime: 4120,
          longestCorrectStreak: 2,
          score: 3264,
        },
        {
          player: {
            id: uuidv4(),
            nickname: 'SmartyPants',
          },
          rank: 5,
          comebackRankGain: 0,
          correct: 3,
          incorrect: 1,
          unanswered: 0,
          averageResponseTime: 4682,
          longestCorrectStreak: 2,
          score: 3097,
        },
        {
          player: {
            id: CURRENT_PARTICIPANT_ID,
            nickname: 'FrostyBear',
          },
          rank: 7,
          comebackRankGain: 0,
          correct: 2,
          incorrect: 1,
          unanswered: 1,
          averageResponseTime: 4853,
          longestCorrectStreak: 1,
          score: 2542,
        },
      ],
      questionMetrics: [
        {
          text: 'What is the capital of Sweden?',
          type: QuestionType.MultiChoice,
          correct: 3,
          incorrect: 0,
          unanswered: 0,
          averageResponseTime: 2085,
        },
        {
          text: 'Guess the temperature of the hottest day ever recorded.',
          type: QuestionType.Range,
          correct: 1,
          incorrect: 1,
          unanswered: 1,
          averageResponseTime: 12252,
        },
        {
          text: 'The earth is flat.',
          type: QuestionType.TrueFalse,
          correct: 2,
          incorrect: 1,
          unanswered: 0,
          averageResponseTime: 2869,
        },
        {
          text: 'What is the capital of Denmark?',
          type: QuestionType.TypeAnswer,
          correct: 2,
          incorrect: 0,
          unanswered: 1,
          averageResponseTime: 14910,
        },
      ],
      duration: 456,
      created: new Date(),
    },
    currentParticipantId: CURRENT_PARTICIPANT_ID,
  },
} satisfies Story

export const ZeroToOneHundred = {
  args: {
    results: {
      id: uuidv4(),
      mode: GameMode.ZeroToOneHundred,
      name: '0-100 Quiz Debug',
      quiz: {
        id: '9a7381e5-6c9f-42a8-b6c9-e2e42a095e12',
        canRateQuiz: false,
        canHostLiveGame: false,
      },
      host: { id: uuidv4(), nickname: 'FrostyBear' },
      numberOfPlayers: 10,
      numberOfQuestions: 4,
      playerMetrics: [
        {
          player: {
            id: uuidv4(),
            nickname: 'GuessLord',
          },
          rank: 1,
          comebackRankGain: 2,
          averagePrecision: 0.89,
          unanswered: 0,
          averageResponseTime: 2915,
          score: 13,
        },
        {
          player: {
            id: uuidv4(),
            nickname: 'QuickThinker',
          },
          rank: 2,
          comebackRankGain: 3,
          averagePrecision: 0.87,
          unanswered: 0,
          averageResponseTime: 3082,
          score: 15,
        },
        {
          player: {
            id: uuidv4(),
            nickname: 'SharpShooter',
          },
          rank: 3,
          comebackRankGain: 1,
          averagePrecision: 0.84,
          unanswered: 0,
          averageResponseTime: 3275,
          score: 17,
        },
        {
          player: {
            id: uuidv4(),
            nickname: 'ThinkFast',
          },
          rank: 4,
          comebackRankGain: 0,
          averagePrecision: 0.82,
          unanswered: 0,
          averageResponseTime: 3492,
          score: 18,
        },
        {
          player: {
            id: uuidv4(),
            nickname: 'PrecisionPete',
          },
          rank: 5,
          comebackRankGain: 0,
          averagePrecision: 0.79,
          unanswered: 1,
          averageResponseTime: 3768,
          score: 19,
        },
      ],
      questionMetrics: [
        {
          text: '2002 levererades den första Koenigseggbilen av modell CC8S. Hur många tillverkades totalt?',
          type: QuestionType.Range,
          averagePrecision: 0.98,
          unanswered: 0,
          averageResponseTime: 9428,
        },
        {
          text: 'Hur många år blev Kubas förre president Fidel Castro?',
          type: QuestionType.Range,
          averagePrecision: 0.92,
          unanswered: 0,
          averageResponseTime: 11464,
        },
        {
          text: 'Vilka är de två första decimalerna i talet pi?',
          type: QuestionType.Range,
          averagePrecision: 0.67,
          unanswered: 1,
          averageResponseTime: 25265,
        },
        {
          text: 'Hur många klädda kort finns det i en kortlek?',
          type: QuestionType.Range,
          averagePrecision: 0.99,
          unanswered: 0,
          averageResponseTime: 9748,
        },
      ],
      duration: 123.772,
      created: new Date(),
    },
    currentParticipantId: CURRENT_PARTICIPANT_ID,
  },
} satisfies Story
