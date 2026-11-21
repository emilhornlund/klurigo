import {
  DEFAULT_CRITTERS_AVATAR_V1,
  GameMode,
  type GameResultClassicModeDto,
  LanguageCode,
  QuestionType,
  QuizCategory,
  type QuizResponseDto,
  QuizVisibility,
} from '@klurigo/common'
import type { Meta, StoryObj } from '@storybook/react'
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from '@tanstack/react-query'
import { useLayoutEffect, useState } from 'react'
import { ToastContainer } from 'react-toastify'
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
        canPublishQuiz: false,
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
        canPublishQuiz: false,
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

const privateQuizResults: GameResultClassicModeDto = {
  ...Classic.args.results,
  id: uuidv4(),
  name: 'True or False: Space',
  host: {
    ...Classic.args.results.host,
    id: 'MOCK',
    nickname: 'Storybook player',
  },
  quiz: {
    id: uuidv4(),
    canRateQuiz: false,
    canHostLiveGame: true,
    canPublishQuiz: true,
  },
  numberOfPlayers: 1,
  numberOfQuestions: 1,
  playerMetrics: [
    {
      ...Classic.args.results.playerMetrics[0],
      comebackRankGain: 0,
      correct: 1,
      longestCorrectStreak: 1,
      score: 950,
    },
  ],
  questionMetrics: [
    {
      text: 'Does the Earth orbit the Sun?',
      type: QuestionType.TrueFalse,
      correct: 1,
      incorrect: 0,
      unanswered: 0,
      averageResponseTime: 2924,
    },
  ],
  duration: 60,
}
const PrivateQuizOwnerResults = () => {
  const { data } = useQuery({
    queryKey: ['game_results', privateQuizResults.id],
    queryFn: () => Promise.resolve(privateQuizResults),
    initialData: privateQuizResults,
    enabled: false,
  })
  return <GameResultsPageUI results={data} currentParticipantId="MOCK" />
}

/** Exercises the in-place visibility change using a disposable quiz fixture. */
const PrivateQuizOwnerScenario = ({
  failFirst = false,
}: {
  failFirst?: boolean
}) => {
  const [ready, setReady] = useState(false)
  const [queryClient] = useState(() => new QueryClient())

  useLayoutEffect(() => {
    const originalFetch = window.fetch
    let shouldFail = failFirst
    const publishedQuiz: QuizResponseDto = {
      id: privateQuizResults.quiz.id,
      title: privateQuizResults.name,
      mode: GameMode.Classic,
      visibility: QuizVisibility.Public,
      languageCode: LanguageCode.English,
      category: QuizCategory.Space,
      author: {
        id: privateQuizResults.host.id,
        name: privateQuizResults.host.nickname,
        avatar: privateQuizResults.host.avatar,
      },
      numberOfQuestions: 1,
      gameplaySummary: {
        count: 1,
        totalPlayerCount: 1,
        difficultyPercentage: 1,
      },
      ratingSummary: { stars: 0, comments: 0, total: 0 },
      created: privateQuizResults.created,
      updated: privateQuizResults.created,
    }
    const fetch: typeof window.fetch = async (input, init) => {
      const { pathname } = new URL(
        input instanceof Request ? input.url : String(input),
        window.location.origin,
      )
      if (
        init?.method === 'PATCH' &&
        pathname.endsWith(`/quizzes/${publishedQuiz.id}`)
      ) {
        if (shouldFail) {
          shouldFail = false
          return Response.json(
            { message: 'Could not update the quiz.' },
            { status: 503 },
          )
        }
        return Response.json(publishedQuiz)
      }
      return originalFetch(input, init)
    }

    window.fetch = fetch
    setReady(true)
    return () => {
      if (window.fetch === fetch) window.fetch = originalFetch
    }
  }, [failFirst])

  if (!ready) return null

  return (
    <QueryClientProvider client={queryClient}>
      <PrivateQuizOwnerResults />
      <ToastContainer />
    </QueryClientProvider>
  )
}

export const PrivateQuizOwner = {
  args: { results: privateQuizResults, currentParticipantId: 'MOCK' },
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          'Open Review quiz visibility, then choose Cancel or Make public. Confirming removes the prompt without leaving Summary. Reload the story to reset the mock quiz.',
      },
    },
  },
  render: () => <PrivateQuizOwnerScenario />,
} satisfies Story

export const PrivateQuizOwnerRetry = {
  ...PrivateQuizOwner,
  parameters: {
    ...PrivateQuizOwner.parameters,
    docs: {
      description: {
        story:
          'The first attempt fails so you can check the inline error and retry.',
      },
    },
  },
  render: () => <PrivateQuizOwnerScenario failFirst />,
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
