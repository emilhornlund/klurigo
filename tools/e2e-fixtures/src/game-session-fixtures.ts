import {
  GameMode,
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
    classicLateJoin: 'e2e10002-0000-4000-8000-000000000002',
    zeroToOneHundred: 'e2e20002-0000-4000-8000-000000000002',
    zeroToOneHundredLateJoin: 'e2e30002-0000-4000-8000-000000000002',
  },
  tester03: {
    classic: 'e2e00003-0000-4000-8000-000000000003',
    classicLateJoin: 'e2e10003-0000-4000-8000-000000000003',
    zeroToOneHundred: 'e2e20003-0000-4000-8000-000000000003',
    zeroToOneHundredLateJoin: 'e2e30003-0000-4000-8000-000000000003',
  },
  tester04: {
    classic: 'e2e00004-0000-4000-8000-000000000004',
    classicLateJoin: 'e2e10004-0000-4000-8000-000000000004',
    zeroToOneHundred: 'e2e20004-0000-4000-8000-000000000004',
    zeroToOneHundredLateJoin: 'e2e30004-0000-4000-8000-000000000004',
  },
  tester05: {
    classic: 'e2e00005-0000-4000-8000-000000000005',
    classicLateJoin: 'e2e10005-0000-4000-8000-000000000005',
    zeroToOneHundred: 'e2e20005-0000-4000-8000-000000000005',
    zeroToOneHundredLateJoin: 'e2e30005-0000-4000-8000-000000000005',
  },
  tester06: {
    classic: 'e2e00006-0000-4000-8000-000000000006',
    classicLateJoin: 'e2e10006-0000-4000-8000-000000000006',
    zeroToOneHundred: 'e2e20006-0000-4000-8000-000000000006',
    zeroToOneHundredLateJoin: 'e2e30006-0000-4000-8000-000000000006',
  },
  tester07: {
    classic: 'e2e00007-0000-4000-8000-000000000007',
    classicLateJoin: 'e2e10007-0000-4000-8000-000000000007',
    zeroToOneHundred: 'e2e20007-0000-4000-8000-000000000007',
    zeroToOneHundredLateJoin: 'e2e30007-0000-4000-8000-000000000007',
  },
  tester08: {
    classic: 'e2e00008-0000-4000-8000-000000000008',
    classicLateJoin: 'e2e10008-0000-4000-8000-000000000008',
    zeroToOneHundred: 'e2e20008-0000-4000-8000-000000000008',
    zeroToOneHundredLateJoin: 'e2e30008-0000-4000-8000-000000000008',
  },
  tester09: {
    classic: 'e2e00009-0000-4000-8000-000000000009',
    classicLateJoin: 'e2e10009-0000-4000-8000-000000000009',
    zeroToOneHundred: 'e2e20009-0000-4000-8000-000000000009',
    zeroToOneHundredLateJoin: 'e2e30009-0000-4000-8000-000000000009',
  },
  tester10: {
    classic: 'e2e00010-0000-4000-8000-000000000010',
    classicLateJoin: 'e2e10010-0000-4000-8000-000000000010',
    zeroToOneHundred: 'e2e20010-0000-4000-8000-000000000010',
    zeroToOneHundredLateJoin: 'e2e30010-0000-4000-8000-000000000010',
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
    classicLateJoin: {
      id: ids.classicLateJoin,
      title: 'E2E Late Join Quiz',
      mode: GameMode.Classic,
      questions: [
        E2E_GAME_SESSION_QUESTIONS.clearDaytimeSky,
        E2E_GAME_SESSION_QUESTIONS.redPlanet,
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
  tester03: {
    id: '3c5d45b7-bf7c-4e6d-a32e-6760f8256e0c',
    nickname: 'tester03',
    email: 'tester03@klurigo.com',
    quizzes: createGameSessionQuizzes(E2E_GAME_SESSION_QUIZ_IDS.tester03),
  },
  tester04: {
    id: 'ca21dc5c-4e74-4427-b7b8-06a1d46c2f60',
    nickname: 'tester04',
    email: 'tester04@klurigo.com',
    quizzes: createGameSessionQuizzes(E2E_GAME_SESSION_QUIZ_IDS.tester04),
  },
  tester05: {
    id: '6e2e1b12-1a48-47a9-9a95-11b8b3c2e7fd',
    nickname: 'tester05',
    email: 'tester05@klurigo.com',
    quizzes: createGameSessionQuizzes(E2E_GAME_SESSION_QUIZ_IDS.tester05),
  },
  tester06: {
    id: 'f2db3a6f-6a0c-4f3e-8e02-24b6b5e4f901',
    nickname: 'tester06',
    email: 'tester06@klurigo.com',
    quizzes: createGameSessionQuizzes(E2E_GAME_SESSION_QUIZ_IDS.tester06),
  },
  tester07: {
    id: 'a4f7d9c8-24b5-4d67-b8c1-35e6f7a80912',
    nickname: 'tester07',
    email: 'tester07@klurigo.com',
    quizzes: createGameSessionQuizzes(E2E_GAME_SESSION_QUIZ_IDS.tester07),
  },
  tester08: {
    id: 'b7c8d9e0-35f6-4a78-c9d2-46f708b91a23',
    nickname: 'tester08',
    email: 'tester08@klurigo.com',
    quizzes: createGameSessionQuizzes(E2E_GAME_SESSION_QUIZ_IDS.tester08),
  },
  tester09: {
    id: 'c8d9e0f1-46a7-4b89-d0e3-57a819c02b34',
    nickname: 'tester09',
    email: 'tester09@klurigo.com',
    quizzes: createGameSessionQuizzes(E2E_GAME_SESSION_QUIZ_IDS.tester09),
  },
  tester10: {
    id: 'd9e0f1a2-57b8-4c90-e1f4-68b92ad13c45',
    nickname: 'tester10',
    email: 'tester10@klurigo.com',
    quizzes: createGameSessionQuizzes(E2E_GAME_SESSION_QUIZ_IDS.tester10),
  },
} as const satisfies Record<string, E2eUserFixture>

export const E2E_PLAINTEXT_PASSWORD = 'Super$ecretPassw0rd123#'

export const E2E_GAME_SESSION_FIXTURE_SLOTS = {
  chromium: [E2E_USERS.tester02, E2E_USERS.tester05, E2E_USERS.tester08],
  firefox: [E2E_USERS.tester03, E2E_USERS.tester06, E2E_USERS.tester09],
  webkit: [E2E_USERS.tester04, E2E_USERS.tester07, E2E_USERS.tester10],
} as const satisfies Record<string, readonly GameSessionUserFixture[]>

export const E2E_FIXTURE_MANIFEST = {
  password: E2E_PLAINTEXT_PASSWORD,
  questions: E2E_GAME_SESSION_QUESTIONS,
  users: E2E_USERS,
  gameSessionFixtureSlots: E2E_GAME_SESSION_FIXTURE_SLOTS,
} as const
