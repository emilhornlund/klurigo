import { QuizResponseDto } from '@klurigo/common'

import { Quiz } from '../../../quiz-core/repositories/models/schemas'

import { toQuizGameplaySummaryDifficultyPercentage } from './quiz-gameplay-summary.utils'

/**
 * Maps a persisted quiz document into the public quiz response DTO used by the
 * existing quiz API.
 *
 * @param quiz - The quiz document to map.
 * @returns The mapped quiz response DTO.
 */
export function toQuizResponseDto(quiz: Quiz): QuizResponseDto {
  const {
    _id: id,
    title,
    description,
    mode,
    visibility,
    category,
    imageCoverURL,
    languageCode,
    questions,
    owner,
    gameplaySummary,
    ratingSummary,
    created,
    updated,
  } = quiz

  return {
    id,
    title,
    description,
    mode,
    visibility,
    category,
    imageCoverURL,
    languageCode,
    numberOfQuestions: questions.length,
    author: {
      id: owner._id,
      name: owner.defaultNickname,
    },
    gameplaySummary: {
      count: gameplaySummary.count,
      totalPlayerCount: gameplaySummary.totalPlayerCount,
      lastPlayed: gameplaySummary.lastPlayedAt,
      difficultyPercentage:
        toQuizGameplaySummaryDifficultyPercentage(gameplaySummary),
    },
    ratingSummary: {
      stars: ratingSummary.avg,
      comments: ratingSummary.commentCount,
      total: ratingSummary.count,
    },
    created,
    updated,
  }
}
