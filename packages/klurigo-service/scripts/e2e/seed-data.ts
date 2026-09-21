import {
  GameMode,
  LanguageCode,
  QuestionPinTolerance,
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

export type UserDoc = {
  _id: string
  authProvider: 'LOCAL'
  defaultNickname: string
  email: string
  hashedPassword: string
  createdAt: Date
  updatedAt: Date
}

export type QuizQuestionDoc =
  | {
      type: QuestionType.MultiChoice
      text: string
      points: number
      duration: number
      options: { value: string; correct: boolean }[]
    }
  | {
      type: QuestionType.TrueFalse
      text: string
      points: number
      duration: number
      correct: boolean
    }
  | {
      type: QuestionType.TypeAnswer
      text: string
      points: number
      duration: number
      options: string[]
    }
  | {
      type: QuestionType.Puzzle
      text: string
      points: number
      duration: number
      values: string[]
    }
  | {
      type: QuestionType.Pin
      text: string
      points: number
      duration: number
      imageURL: string
      positionX: number
      positionY: number
      tolerance: QuestionPinTolerance
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

export type QuizDoc = {
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

export type E2eSeedDocuments = {
  users: UserDoc[]
  quizzes: QuizDoc[]
}

const E2E_HASHED_PASSWORD =
  '$2a$10$.0oD9nYtp3OuDONp9Xfx7OP2cl1m22V1ALOpTlfRODbsHpHtQqUhu'
const E2E_USER_CREATED = new Date('2025-08-11T14:52:16.031Z')
const E2E_USER_UPDATED = new Date('2025-12-17T08:18:50.228Z')
const E2E_QUIZ_CREATED = new Date('2025-08-11T14:52:16.031Z')
const E2E_QUIZ_UPDATED = new Date('2025-12-17T08:18:50.228Z')

export function createE2eUserDoc({
  id,
  nickname,
  email,
}: (typeof E2E_FIXTURE_MANIFEST.users)[keyof typeof E2E_FIXTURE_MANIFEST.users]): UserDoc {
  return {
    _id: id,
    authProvider: 'LOCAL',
    defaultNickname: nickname,
    email,
    hashedPassword: E2E_HASHED_PASSWORD,
    createdAt: E2E_USER_CREATED,
    updatedAt: E2E_USER_UPDATED,
  }
}

export function createE2eQuizQuestionDoc(
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

  if (question.type === QuestionType.TrueFalse) {
    return {
      type: question.type,
      text: question.text,
      points: question.points,
      duration: question.duration,
      correct: question.correct,
    }
  }

  if (question.type === QuestionType.TypeAnswer) {
    return {
      type: question.type,
      text: question.text,
      points: question.points,
      duration: question.duration,
      options: [...question.options],
    }
  }

  if (question.type === QuestionType.Puzzle) {
    return {
      type: question.type,
      text: question.text,
      points: question.points,
      duration: question.duration,
      values: [...question.values],
    }
  }

  if (question.type === QuestionType.Pin) {
    return {
      type: question.type,
      text: question.text,
      points: question.points,
      duration: question.duration,
      imageURL: question.imageURL,
      positionX: question.positionX,
      positionY: question.positionY,
      tolerance: question.tolerance,
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

export function createE2eQuizDoc(
  quiz: GameSessionQuizFixture,
  owner: string,
): QuizDoc {
  return {
    _id: quiz.id,
    title: quiz.title,
    mode: quiz.mode,
    visibility: QuizVisibility.Private,
    category: QuizCategory.GeneralKnowledge,
    languageCode: LanguageCode.English,
    questions: quiz.questions.map(createE2eQuizQuestionDoc),
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

export function createE2eSeedDocuments(
  manifest: typeof E2E_FIXTURE_MANIFEST,
): E2eSeedDocuments {
  const users = Object.values(manifest.users).map(createE2eUserDoc)
  const quizzes = Object.values(manifest.users).flatMap(({ id, quizzes }) =>
    Object.values(quizzes).map((quiz) => createE2eQuizDoc(quiz, id)),
  )

  return { users, quizzes }
}

export const E2E_SEED_DOCUMENTS = createE2eSeedDocuments(E2E_FIXTURE_MANIFEST)
