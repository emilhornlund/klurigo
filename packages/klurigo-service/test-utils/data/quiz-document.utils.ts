import { QuizRatingAuthorType } from '@klurigo/common'

import {
  QuizGameplaySummary,
  QuizRating,
  QuizRatingUserAuthorWithBase,
} from '../../src/modules/quiz-core/repositories/models/schemas'
import { User } from '../../src/modules/user/repositories'

import { createMockUniqueId, offsetSeconds } from './helpers.utils'
import { buildMockPrimaryUser } from './user.data'

export function buildMockQuizRating(
  quizRating?: Partial<Omit<QuizRating, 'author'>> & {
    author?: User | QuizRatingUserAuthorWithBase
  },
): QuizRating {
  const now = offsetSeconds(0)
  const rawAuthor = quizRating?.author ?? buildMockPrimaryUser()
  const author: QuizRatingUserAuthorWithBase =
    'type' in rawAuthor
      ? rawAuthor
      : {
          type: QuizRatingAuthorType.User,
          user: rawAuthor,
        }
  return {
    _id: createMockUniqueId(51),
    quizId: createMockUniqueId(52),
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
    updated: offsetSeconds(0),
    ...(quizGameplaySummary ?? {}),
  }
}
