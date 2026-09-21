import { QuizRatingAuthorType } from '@klurigo/common'

import {
  QuizGameplaySummary,
  QuizRating,
  QuizRatingSummary,
  QuizRatingUserAuthorWithBase,
} from '../../../src/modules/quiz-core/repositories/models/schemas'
import { User } from '../../../src/modules/user/repositories'
import { createMockUniqueId, offsetSeconds } from '../shared/helpers.utils'
import { buildMockPrimaryUser } from '../user/user.data'

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

export function createMockQuizRatingSummary(
  quizRatingSummary?: Partial<QuizRatingSummary>,
): QuizRatingSummary {
  return {
    count: 0,
    avg: 0,
    stars: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 },
    commentCount: 0,
    updated: undefined,
    ...(quizRatingSummary ?? {}),
  }
}
