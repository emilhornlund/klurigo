import {
  GameMode,
  LanguageCode,
  QuestionRangeAnswerMargin,
  QuestionType,
  QuizCategory,
  QuizVisibility,
} from '@klurigo/common'
import {
  E2E_FIXTURE_MANIFEST,
  type GameSessionQuestionFixture,
  type GameSessionQuizFixture,
} from '@klurigo/e2e-fixtures'
import mongoose from 'mongoose'

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
const E2E_USER_CREATED = new Date('2025-08-11T14:52:16.031Z')
const E2E_USER_UPDATED = new Date('2025-12-17T08:18:50.228Z')
const E2E_QUIZ_CREATED = new Date('2025-08-11T14:52:16.031Z')
const E2E_QUIZ_UPDATED = new Date('2025-12-17T08:18:50.228Z')

const E2E_USERS: UserDoc[] = Object.values(E2E_FIXTURE_MANIFEST.users).map(
  ({ id, nickname, email }) => ({
    _id: id,
    authProvider: 'LOCAL',
    defaultNickname: nickname,
    email,
    hashedPassword: E2E_HASHED_PASSWORD,
    createdAt: E2E_USER_CREATED,
    updatedAt: E2E_USER_UPDATED,
  }),
)

const E2E_QUIZZES: QuizDoc[] = Object.values(
  E2E_FIXTURE_MANIFEST.users,
).flatMap(({ id, quizzes }) =>
  Object.values(quizzes).map((quiz) => createQuizDoc(quiz, id)),
)

function createQuizQuestionDoc(
  question: GameSessionQuestionFixture,
): QuizQuestionDoc {
  if (question.type === QuestionType.MultiChoice) {
    return {
      type: question.type,
      text: question.text,
      points: question.points,
      duration: question.duration,
      options: question.options.map(({ value, correct }) => ({
        value,
        correct,
      })),
    }
  }

  return {
    type: question.type,
    text: question.text,
    points: question.points,
    duration: question.duration,
    min: question.min,
    max: question.max,
    step: question.step,
    margin: question.margin,
    correct: question.correct,
  }
}

function createQuizDoc(quiz: GameSessionQuizFixture, owner: string): QuizDoc {
  return {
    _id: quiz.id,
    title: quiz.title,
    mode: quiz.mode,
    visibility: QuizVisibility.Private,
    category: QuizCategory.GeneralKnowledge,
    languageCode: LanguageCode.English,
    questions: quiz.questions.map(createQuizQuestionDoc),
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

export async function seedDatabase(mongo: typeof mongoose): Promise<void> {
  const db = mongo.connection.db
  if (db) {
    await db.collection<UserDoc>('users').insertMany(E2E_USERS)
    await db.collection<QuizDoc>('quizzes').insertMany(E2E_QUIZZES)
  }
}
