import { QuizRatingAuthorType } from '@klurigo/common'
import { v4 as uuidv4 } from 'uuid'

import {
  QuizGameplaySummary,
  QuizRating,
  QuizRatingUserAuthorWithBase,
} from '../../src/modules/quiz-core/repositories/models/schemas'
import { User } from '../../src/modules/user/repositories'

export function buildMockQuizRating(
  quizRating?: Partial<Omit<QuizRating, 'author'>> & {
    author?: User | QuizRatingUserAuthorWithBase
  },
): QuizRating {
  const now = new Date()
  const rawAuthor = quizRating?.author ?? ({ _id: uuidv4() } as unknown as User)
  const author: QuizRatingUserAuthorWithBase =
    'type' in rawAuthor
      ? (rawAuthor as QuizRatingUserAuthorWithBase)
      : ({
          type: QuizRatingAuthorType.User,
          user: rawAuthor as User,
        } as QuizRatingUserAuthorWithBase)
  return {
    _id: uuidv4(),
    quizId: uuidv4(),
    stars: 5,
    comment: undefined,
    created: now,
    updated: now,
    ...quizRating,
    author,
  }
}

export function createMockQuizGameplaySummary(
  quizGameplaySummary?: Partial<QuizGameplaySummary>,
): QuizGameplaySummary {
  return {
    count: 0,
    totalPlayerCount: 0,
    totalClassicCorrectCount: 0,
    totalClassicIncorrectCount: 0,
    totalClassicUnansweredCount: 0,
    totalZeroToOneHundredPrecisionSum: 0,
    totalZeroToOneHundredAnsweredCount: 0,
    totalZeroToOneHundredUnansweredCount: 0,
    lastPlayedAt: undefined,
    updated: new Date(),
    ...(quizGameplaySummary ?? {}),
  }
}
