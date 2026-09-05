import {
  GameMode,
  LanguageCode,
  QuestionRangeAnswerMargin,
  QuestionType,
  QuizCategory,
  QuizVisibility,
} from '@klurigo/common'

import { resetE2eDb } from './e2e-db'

type UserDoc = {
  _id: string
  authProvider: 'LOCAL'
  defaultNickname: string
  email: string
  hashedPassword: string
  createdAt: Date
  updatedAt: Date
}

type QuizQuestionDoc =
  | {
      type: QuestionType.MultiChoice
      text: string
      points: number
      duration: number
      options: { value: string; correct: boolean }[]
    }
  | {
      type: QuestionType.Range
      text: string
      points: number
      duration: number
      min: number
      max: number
      step: number
      margin: QuestionRangeAnswerMargin
      correct: number
    }

type QuizDoc = {
  _id: string
  title: string
  mode: GameMode
  visibility: QuizVisibility.Private
  category: QuizCategory.GeneralKnowledge
  languageCode: LanguageCode.English
  questions: QuizQuestionDoc[]
  owner: string
  gameplaySummary: {
    count: number
    totalPlayerCount: number
    totalClassicCorrectCount: number
    totalClassicIncorrectCount: number
    totalClassicUnansweredCount: number
    totalZeroToOneHundredPrecisionSum: number
    totalZeroToOneHundredAnsweredCount: number
    totalZeroToOneHundredUnansweredCount: number
    updated: Date
  }
  ratingSummary: {
    count: number
    avg: number
    stars: Record<'1' | '2' | '3' | '4' | '5', number>
    commentCount: number
  }
  created: Date
  updated: Date
}

const E2E_HASHED_PASSWORD =
  '$2a$10$.0oD9nYtp3OuDONp9Xfx7OP2cl1m22V1ALOpTlfRODbsHpHtQqUhu'

const E2E_USER_SEEDS = [
  {
    id: '81b661d2-9b92-4011-b744-8ca7d14b71df',
    nickname: 'tester01',
  },
  {
    id: '8b8f99d8-91c9-4e0e-83d0-4d8b72b8fda2',
    nickname: 'tester02',
  },
  {
    id: '3c5d45b7-bf7c-4e6d-a32e-6760f8256e0c',
    nickname: 'tester03',
  },
  {
    id: 'ca21dc5c-4e74-4427-b7b8-06a1d46c2f60',
    nickname: 'tester04',
  },
  {
    id: '6e2e1b12-1a48-47a9-9a95-11b8b3c2e7fd',
    nickname: 'tester05',
  },
  {
    id: 'f2db3a6f-6a0c-4f3e-8e02-24b6b5e4f901',
    nickname: 'tester06',
  },
  {
    id: 'a4f7d9c8-24b5-4d67-b8c1-35e6f7a80912',
    nickname: 'tester07',
  },
  {
    id: 'b7c8d9e0-35f6-4a78-c9d2-46f708b91a23',
    nickname: 'tester08',
  },
  {
    id: 'c8d9e0f1-46a7-4b89-d0e3-57a819c02b34',
    nickname: 'tester09',
  },
  {
    id: 'd9e0f1a2-57b8-4c90-e1f4-68b92ad13c45',
    nickname: 'tester10',
  },
]

const E2E_USERS: UserDoc[] = E2E_USER_SEEDS.map(({ id, nickname }) => ({
  _id: id,
  authProvider: 'LOCAL',
  defaultNickname: nickname,
  email: `${nickname}@klurigo.com`,
  hashedPassword: E2E_HASHED_PASSWORD,
  createdAt: new Date('2025-08-11T14:52:16.031Z'),
  updatedAt: new Date('2025-12-17T08:18:50.228Z'),
}))

const E2E_QUIZ_TITLE = 'E2E Game Session Quiz'
const E2E_QUIZ_CREATED = new Date('2025-08-11T14:52:16.031Z')
const E2E_QUIZ_UPDATED = new Date('2025-12-17T08:18:50.228Z')

const E2E_QUIZ_SEEDS = [
  {
    id: 'e2e00002-0000-4000-8000-000000000002',
    lateJoinId: 'e2e10002-0000-4000-8000-000000000002',
    zeroToOneHundredId: 'e2e20002-0000-4000-8000-000000000002',
    owner: E2E_USER_SEEDS[1].id,
  },
  {
    id: 'e2e00003-0000-4000-8000-000000000003',
    lateJoinId: 'e2e10003-0000-4000-8000-000000000003',
    zeroToOneHundredId: 'e2e20003-0000-4000-8000-000000000003',
    owner: E2E_USER_SEEDS[2].id,
  },
  {
    id: 'e2e00004-0000-4000-8000-000000000004',
    lateJoinId: 'e2e10004-0000-4000-8000-000000000004',
    zeroToOneHundredId: 'e2e20004-0000-4000-8000-000000000004',
    owner: E2E_USER_SEEDS[3].id,
  },
  {
    id: 'e2e00005-0000-4000-8000-000000000005',
    lateJoinId: 'e2e10005-0000-4000-8000-000000000005',
    zeroToOneHundredId: 'e2e20005-0000-4000-8000-000000000005',
    owner: E2E_USER_SEEDS[4].id,
  },
  {
    id: 'e2e00006-0000-4000-8000-000000000006',
    lateJoinId: 'e2e10006-0000-4000-8000-000000000006',
    zeroToOneHundredId: 'e2e20006-0000-4000-8000-000000000006',
    owner: E2E_USER_SEEDS[5].id,
  },
  {
    id: 'e2e00007-0000-4000-8000-000000000007',
    lateJoinId: 'e2e10007-0000-4000-8000-000000000007',
    zeroToOneHundredId: 'e2e20007-0000-4000-8000-000000000007',
    owner: E2E_USER_SEEDS[6].id,
  },
  {
    id: 'e2e00008-0000-4000-8000-000000000008',
    lateJoinId: 'e2e10008-0000-4000-8000-000000000008',
    zeroToOneHundredId: 'e2e20008-0000-4000-8000-000000000008',
    owner: E2E_USER_SEEDS[7].id,
  },
  {
    id: 'e2e00009-0000-4000-8000-000000000009',
    lateJoinId: 'e2e10009-0000-4000-8000-000000000009',
    zeroToOneHundredId: 'e2e20009-0000-4000-8000-000000000009',
    owner: E2E_USER_SEEDS[8].id,
  },
  {
    id: 'e2e00010-0000-4000-8000-000000000010',
    lateJoinId: 'e2e10010-0000-4000-8000-000000000010',
    zeroToOneHundredId: 'e2e20010-0000-4000-8000-000000000010',
    owner: E2E_USER_SEEDS[9].id,
  },
] as const

const E2E_FIRST_QUESTION: QuizQuestionDoc = {
  type: QuestionType.MultiChoice,
  text: 'Which color is associated with a clear daytime sky?',
  points: 1000,
  duration: 30,
  options: [
    { value: 'Blue', correct: true },
    { value: 'Green', correct: false },
  ],
}

const E2E_SECOND_QUESTION: QuizQuestionDoc = {
  type: QuestionType.MultiChoice,
  text: 'Which planet is known as the Red Planet?',
  points: 1000,
  duration: 30,
  options: [
    { value: 'Mars', correct: true },
    { value: 'Venus', correct: false },
  ],
}

const E2E_ZERO_TO_ONE_HUNDRED_QUESTION: QuizQuestionDoc = {
  type: QuestionType.Range,
  text: 'What number is halfway between zero and one hundred?',
  points: 0,
  duration: 30,
  min: 0,
  max: 100,
  step: 1,
  margin: QuestionRangeAnswerMargin.None,
  correct: 50,
}

const E2E_QUIZZES: QuizDoc[] = E2E_QUIZ_SEEDS.flatMap(
  ({ id, lateJoinId, zeroToOneHundredId, owner }) => [
    createQuizDoc(id, E2E_QUIZ_TITLE, owner, [E2E_FIRST_QUESTION]),
    createQuizDoc(lateJoinId, 'E2E Late Join Quiz', owner, [
      E2E_FIRST_QUESTION,
      E2E_SECOND_QUESTION,
    ]),
    createQuizDoc(
      zeroToOneHundredId,
      'E2E Zero to One Hundred Quiz',
      owner,
      [E2E_ZERO_TO_ONE_HUNDRED_QUESTION],
      GameMode.ZeroToOneHundred,
    ),
  ],
)

function createQuizDoc(
  id: string,
  title: string,
  owner: string,
  questions: QuizQuestionDoc[],
  mode: GameMode = GameMode.Classic,
): QuizDoc {
  return {
    _id: id,
    title,
    mode,
    visibility: QuizVisibility.Private,
    category: QuizCategory.GeneralKnowledge,
    languageCode: LanguageCode.English,
    questions,
    owner,
    gameplaySummary: {
      count: 0,
      totalPlayerCount: 0,
      totalClassicCorrectCount: 0,
      totalClassicIncorrectCount: 0,
      totalClassicUnansweredCount: 0,
      totalZeroToOneHundredPrecisionSum: 0,
      totalZeroToOneHundredAnsweredCount: 0,
      totalZeroToOneHundredUnansweredCount: 0,
      updated: E2E_QUIZ_UPDATED,
    },
    ratingSummary: {
      count: 0,
      avg: 0,
      stars: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 },
      commentCount: 0,
    },
    created: E2E_QUIZ_CREATED,
    updated: E2E_QUIZ_UPDATED,
  }
}

async function main() {
  await resetE2eDb({
    shouldWipeMongo: true,
    shouldWipeRedis: true,
    seed: async ({ mongo }) => {
      const db = mongo.connection.db
      if (db) {
        await db.collection<UserDoc>('users').insertMany(E2E_USERS)
        await db.collection<QuizDoc>('quizzes').insertMany(E2E_QUIZZES)
      }
    },
  })
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
