import {
  GameMode,
  QuestionPinTolerance,
  QuestionRangeAnswerMargin,
  QuestionType,
} from '@klurigo/common'

export type GameSessionQuestionFixture =
  | {
      readonly type: QuestionType.MultiChoice
      readonly text: string
      readonly points: number
      readonly duration: number
      readonly options: readonly {
        readonly value: string
        readonly correct: boolean
      }[]
    }
  | {
      readonly type: QuestionType.TrueFalse
      readonly text: string
      readonly points: number
      readonly duration: number
      readonly correct: boolean
    }
  | {
      readonly type: QuestionType.TypeAnswer
      readonly text: string
      readonly points: number
      readonly duration: number
      readonly options: readonly string[]
    }
  | {
      readonly type: QuestionType.Puzzle
      readonly text: string
      readonly points: number
      readonly duration: number
      readonly values: readonly string[]
    }
  | {
      readonly type: QuestionType.Pin
      readonly text: string
      readonly points: number
      readonly duration: number
      readonly imageURL: string
      readonly positionX: number
      readonly positionY: number
      readonly tolerance: QuestionPinTolerance
    }
  | {
      readonly type: QuestionType.Range
      readonly text: string
      readonly points: number
      readonly duration: number
      readonly min: number
      readonly max: number
      readonly step: number
      readonly margin: QuestionRangeAnswerMargin
      readonly correct: number
    }

export type GameSessionQuizFixture = {
  readonly id: string
  readonly title: string
  readonly mode: GameMode
  readonly questions: readonly GameSessionQuestionFixture[]
}

export type GameSessionQuizzes = {
  readonly classic: GameSessionQuizFixture
  readonly classicMixed: GameSessionQuizFixture
  readonly classicTrueFalse: GameSessionQuizFixture
  readonly classicTypeAnswer: GameSessionQuizFixture
  readonly classicPuzzle: GameSessionQuizFixture
  readonly classicPin: GameSessionQuizFixture
  readonly classicLateJoin: GameSessionQuizFixture
  readonly zeroToOneHundred: GameSessionQuizFixture
  readonly zeroToOneHundredLateJoin: GameSessionQuizFixture
}

export type E2eUserFixture = {
  readonly id: string
  readonly nickname: string
  readonly email: string
  readonly quizzes: Partial<GameSessionQuizzes>
}

export type GameSessionUserFixture = Omit<E2eUserFixture, 'quizzes'> & {
  readonly quizzes: GameSessionQuizzes
}

export const E2E_GAME_SESSION_QUESTIONS = {
  clearDaytimeSky: {
    type: QuestionType.MultiChoice,
    text: 'Which color is associated with a clear daytime sky?',
    points: 1000,
    duration: 30,
    options: [
      { value: 'Blue', correct: true },
      { value: 'Green', correct: false },
    ],
  },
  moonIsLargerThanEarth: {
    type: QuestionType.TrueFalse,
    text: 'The Moon is larger than the Earth.',
    points: 1000,
    duration: 30,
    correct: false,
  },
  capitalOfFrance: {
    type: QuestionType.TypeAnswer,
    text: 'What is the capital of France?',
    points: 1000,
    duration: 30,
    options: ['Paris'],
  },
  europeanCapitals: {
    type: QuestionType.Puzzle,
    text: 'Sort these European capitals from west to east.',
    points: 1000,
    duration: 30,
    values: ['Lisbon', 'Paris', 'Berlin', 'Athens'],
  },
  coordinatesOfEiffelTower: {
    type: QuestionType.Pin,
    text: 'Where is the Eiffel Tower located?',
    points: 1000,
    duration: 30,
    imageURL:
      'https://images.pexels.com/photos/247599/pexels-photo-247599.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    positionX: 0.25,
    positionY: 0.75,
    tolerance: QuestionPinTolerance.Medium,
  },
  redPlanet: {
    type: QuestionType.MultiChoice,
    text: 'Which planet is known as the Red Planet?',
    points: 1000,
    duration: 30,
    options: [
      { value: 'Mars', correct: true },
      { value: 'Venus', correct: false },
    ],
  },
  halfwayToOneHundred: {
    type: QuestionType.Range,
    text: 'What number is halfway between zero and one hundred?',
    points: 0,
    duration: 30,
    min: 0,
    max: 100,
    step: 1,
    margin: QuestionRangeAnswerMargin.None,
    correct: 50,
  },
  classicRange: {
    type: QuestionType.Range,
    text: 'What number is halfway between zero and one hundred?',
    points: 1000,
    duration: 30,
    min: 0,
    max: 100,
    step: 1,
    margin: QuestionRangeAnswerMargin.None,
    correct: 50,
  },
  quarterOfOneHundred: {
    type: QuestionType.Range,
    text: 'What number is one quarter of one hundred?',
    points: 0,
    duration: 30,
    min: 0,
    max: 100,
    step: 1,
    margin: QuestionRangeAnswerMargin.None,
    correct: 25,
  },
} as const

const E2E_GAME_SESSION_QUIZ_IDS = {
  tester02: {
    classic: 'e2e00002-0000-4000-8000-000000000002',
    classicMixed: 'e2e80002-0000-4000-8000-000000000002',
    classicTrueFalse: 'e2e40002-0000-4000-8000-000000000002',
    classicTypeAnswer: 'e2e50002-0000-4000-8000-000000000002',
    classicPuzzle: 'e2e70002-0000-4000-8000-000000000002',
    classicPin: 'e2e60002-0000-4000-8000-000000000002',
    classicLateJoin: 'e2e10002-0000-4000-8000-000000000002',
    zeroToOneHundred: 'e2e20002-0000-4000-8000-000000000002',
    zeroToOneHundredLateJoin: 'e2e30002-0000-4000-8000-000000000002',
  },
  tester05: {
    classic: 'e2e00005-0000-4000-8000-000000000005',
    classicMixed: 'e2e80005-0000-4000-8000-000000000005',
    classicTrueFalse: 'e2e40005-0000-4000-8000-000000000005',
    classicTypeAnswer: 'e2e50005-0000-4000-8000-000000000005',
    classicPuzzle: 'e2e70005-0000-4000-8000-000000000005',
    classicPin: 'e2e60005-0000-4000-8000-000000000005',
    classicLateJoin: 'e2e10005-0000-4000-8000-000000000005',
    zeroToOneHundred: 'e2e20005-0000-4000-8000-000000000005',
    zeroToOneHundredLateJoin: 'e2e30005-0000-4000-8000-000000000005',
  },
  tester08: {
    classic: 'e2e00008-0000-4000-8000-000000000008',
    classicMixed: 'e2e80008-0000-4000-8000-000000000008',
    classicTrueFalse: 'e2e40008-0000-4000-8000-000000000008',
    classicTypeAnswer: 'e2e50008-0000-4000-8000-000000000008',
    classicPuzzle: 'e2e70008-0000-4000-8000-000000000008',
    classicPin: 'e2e60008-0000-4000-8000-000000000008',
    classicLateJoin: 'e2e10008-0000-4000-8000-000000000008',
    zeroToOneHundred: 'e2e20008-0000-4000-8000-000000000008',
    zeroToOneHundredLateJoin: 'e2e30008-0000-4000-8000-000000000008',
  },
} as const

function createGameSessionQuizzes(
  ids: (typeof E2E_GAME_SESSION_QUIZ_IDS)[keyof typeof E2E_GAME_SESSION_QUIZ_IDS],
): GameSessionQuizzes {
  return {
    classic: {
      id: ids.classic,
      title: 'E2E Game Session Quiz',
      mode: GameMode.Classic,
      questions: [E2E_GAME_SESSION_QUESTIONS.clearDaytimeSky],
    },
    classicMixed: {
      id: ids.classicMixed,
      title: 'E2E Mixed Question Types Quiz',
      mode: GameMode.Classic,
      questions: [
        E2E_GAME_SESSION_QUESTIONS.clearDaytimeSky,
        E2E_GAME_SESSION_QUESTIONS.classicRange,
        E2E_GAME_SESSION_QUESTIONS.moonIsLargerThanEarth,
        E2E_GAME_SESSION_QUESTIONS.capitalOfFrance,
        E2E_GAME_SESSION_QUESTIONS.coordinatesOfEiffelTower,
        E2E_GAME_SESSION_QUESTIONS.europeanCapitals,
      ],
    },
    classicTrueFalse: {
      id: ids.classicTrueFalse,
      title: 'E2E True/False Quiz',
      mode: GameMode.Classic,
      questions: [E2E_GAME_SESSION_QUESTIONS.moonIsLargerThanEarth],
    },
    classicTypeAnswer: {
      id: ids.classicTypeAnswer,
      title: 'E2E Type Answer Quiz',
      mode: GameMode.Classic,
      questions: [E2E_GAME_SESSION_QUESTIONS.capitalOfFrance],
    },
    classicPuzzle: {
      id: ids.classicPuzzle,
      title: 'E2E Puzzle Quiz',
      mode: GameMode.Classic,
      questions: [E2E_GAME_SESSION_QUESTIONS.europeanCapitals],
    },
    classicPin: {
      id: ids.classicPin,
      title: 'E2E Pin Quiz',
      mode: GameMode.Classic,
      questions: [E2E_GAME_SESSION_QUESTIONS.coordinatesOfEiffelTower],
    },
    classicLateJoin: {
      id: ids.classicLateJoin,
      title: 'E2E Late Join Quiz',
      mode: GameMode.Classic,
      questions: [
        E2E_GAME_SESSION_QUESTIONS.clearDaytimeSky,
        E2E_GAME_SESSION_QUESTIONS.moonIsLargerThanEarth,
      ],
    },
    zeroToOneHundred: {
      id: ids.zeroToOneHundred,
      title: 'E2E Zero to One Hundred Quiz',
      mode: GameMode.ZeroToOneHundred,
      questions: [E2E_GAME_SESSION_QUESTIONS.halfwayToOneHundred],
    },
    zeroToOneHundredLateJoin: {
      id: ids.zeroToOneHundredLateJoin,
      title: 'E2E Zero to One Hundred Late Join Quiz',
      mode: GameMode.ZeroToOneHundred,
      questions: [
        E2E_GAME_SESSION_QUESTIONS.halfwayToOneHundred,
        E2E_GAME_SESSION_QUESTIONS.quarterOfOneHundred,
      ],
    },
  }
}

export const E2E_USERS = {
  tester01: {
    id: '81b661d2-9b92-4011-b744-8ca7d14b71df',
    nickname: 'tester01',
    email: 'tester01@klurigo.com',
    quizzes: {},
  },
  tester02: {
    id: '8b8f99d8-91c9-4e0e-83d0-4d8b72b8fda2',
    nickname: 'tester02',
    email: 'tester02@klurigo.com',
    quizzes: createGameSessionQuizzes(E2E_GAME_SESSION_QUIZ_IDS.tester02),
  },
  tester05: {
    id: '6e2e1b12-1a48-47a9-9a95-11b8b3c2e7fd',
    nickname: 'tester05',
    email: 'tester05@klurigo.com',
    quizzes: createGameSessionQuizzes(E2E_GAME_SESSION_QUIZ_IDS.tester05),
  },
  tester08: {
    id: 'b7c8d9e0-35f6-4a78-c9d2-46f708b91a23',
    nickname: 'tester08',
    email: 'tester08@klurigo.com',
    quizzes: createGameSessionQuizzes(E2E_GAME_SESSION_QUIZ_IDS.tester08),
  },
} as const satisfies Record<string, E2eUserFixture>

export const E2E_PLAINTEXT_PASSWORD = 'Super$ecretPassw0rd123#'

export const E2E_GAME_SESSION_FIXTURE_SLOTS = {
  chromium: [E2E_USERS.tester02, E2E_USERS.tester05, E2E_USERS.tester08],
} as const satisfies Record<string, readonly GameSessionUserFixture[]>

export const E2E_FIXTURE_MANIFEST = {
  password: E2E_PLAINTEXT_PASSWORD,
  questions: E2E_GAME_SESSION_QUESTIONS,
  users: E2E_USERS,
  gameSessionFixtureSlots: E2E_GAME_SESSION_FIXTURE_SLOTS,
} as const
