import {
  DEFAULT_CRITTERS_AVATAR_V1,
  GameMode,
  QuestionType,
} from '@klurigo/common'
import type { Meta, StoryObj } from '@storybook/react'
import { withRouter } from 'storybook-addon-remix-react-router'
import { v4 as uuidv4 } from 'uuid'

import { withMockAuth } from '../../../../../.storybook/mockAuthContext'

import GameResultsPageUI from './GameResultsPageUI'

const meta = {
  title: 'Pages/GameResultsPage',
  component: GameResultsPageUI,
  decorators: [
    withRouter,
    withMockAuth,
    (Story) => (
      <div style={{ width: '100vw' }}>
        <Story />
      </div>
    ),
  ],
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
      host: {
        id: uuidv4(),
        nickname: 'FrostyBear',
        avatar: { ...DEFAULT_CRITTERS_AVATAR_V1, body: 'tower', top: null },
      },
      numberOfPlayers: 10,
      numberOfQuestions: 4,
      playerMetrics: [
        {
          player: {
            id: uuidv4(),
            nickname: 'GuessMachine',
            avatar: { ...DEFAULT_CRITTERS_AVATAR_V1, body: 'block', top: null },
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
            avatar: {
              ...DEFAULT_CRITTERS_AVATAR_V1,
              body: 'blob',
              cheeks: null,
            },
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
            avatar: DEFAULT_CRITTERS_AVATAR_V1,
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
            id: CURRENT_PARTICIPANT_ID,
            nickname: 'TriviaTitanWithAnExtraLongNickname',
            avatar: DEFAULT_CRITTERS_AVATAR_V1,
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
            avatar: DEFAULT_CRITTERS_AVATAR_V1,
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
            id: uuidv4(),
            nickname: 'FrostyBear',
            avatar: DEFAULT_CRITTERS_AVATAR_V1,
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

export const TiedToughestQuestionWithLongText = {
  args: {
    ...Classic.args,
    results: {
      ...Classic.args.results,
      questionMetrics: Classic.args.results.questionMetrics.map(
        (question, index) => {
          if (index === 1) {
            return {
              ...question,
              text: 'What was the highest air temperature ever recorded in Death Valley, California, measured in degrees Celsius in 1913?',
            }
          }
          if (index === 2) {
            return { ...question, correct: 1, incorrect: 2 }
          }
          return question
        },
      ),
    },
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
      host: {
        id: uuidv4(),
        nickname: 'FrostyBear',
        avatar: DEFAULT_CRITTERS_AVATAR_V1,
      },
      numberOfPlayers: 10,
      numberOfQuestions: 4,
      playerMetrics: [
        {
          player: {
            id: uuidv4(),
            nickname: 'GuessLord',
            avatar: DEFAULT_CRITTERS_AVATAR_V1,
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
            avatar: DEFAULT_CRITTERS_AVATAR_V1,
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
            id: CURRENT_PARTICIPANT_ID,
            nickname: 'SharpShooter',
            avatar: DEFAULT_CRITTERS_AVATAR_V1,
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
            avatar: DEFAULT_CRITTERS_AVATAR_V1,
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
            avatar: DEFAULT_CRITTERS_AVATAR_V1,
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

export const SinglePlayerWithZeroScore = {
  args: {
    ...Classic.args,
    results: {
      ...Classic.args.results,
      name: 'Single Player Classic Quiz',
      numberOfPlayers: 1,
      playerMetrics: [
        {
          ...Classic.args.results.playerMetrics[3],
          rank: 1,
          score: 0,
          correct: 0,
          incorrect: 1,
          unanswered: 3,
          longestCorrectStreak: 0,
          comebackRankGain: 0,
        },
      ],
      questionMetrics: Classic.args.results.questionMetrics.map(
        (question, index) => ({
          ...question,
          correct: 0,
          incorrect: index === 0 ? 1 : 0,
          unanswered: index === 0 ? 0 : 1,
        }),
      ),
    },
  },
} satisfies Story

export const AllUnanswered = {
  args: {
    ...SinglePlayerWithZeroScore.args,
    results: {
      ...SinglePlayerWithZeroScore.args.results,
      name: 'All Unanswered Classic Quiz',
      playerMetrics: SinglePlayerWithZeroScore.args.results.playerMetrics.map(
        (metric) => ({
          ...metric,
          incorrect: 0,
          unanswered: Classic.args.results.numberOfQuestions,
        }),
      ),
      questionMetrics:
        SinglePlayerWithZeroScore.args.results.questionMetrics.map(
          (question) => ({ ...question, incorrect: 0, unanswered: 1 }),
        ),
    },
  },
} satisfies Story

export const ZeroPrecision = {
  args: {
    ...ZeroToOneHundred.args,
    results: {
      ...ZeroToOneHundred.args.results,
      numberOfPlayers: 1,
      playerMetrics: [
        {
          ...ZeroToOneHundred.args.results.playerMetrics[2],
          rank: 1,
          score: 0,
          averagePrecision: 0,
          comebackRankGain: 0,
        },
      ],
      questionMetrics: ZeroToOneHundred.args.results.questionMetrics.map(
        (question) => ({ ...question, averagePrecision: 0, unanswered: 0 }),
      ),
    },
  },
} satisfies Story

export const MissingParticipant = {
  args: {
    ...Classic.args,
    currentParticipantId: uuidv4(),
  },
} satisfies Story
