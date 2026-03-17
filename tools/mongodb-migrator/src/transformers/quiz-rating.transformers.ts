import { QuizRatingAuthorType } from '@klurigo/common'

import {
  BSONDocument,
  extractValue,
  extractValueOrThrow,
  toDate,
} from '../utils'

/**
 * Transforms a document from the `quiz_ratings` collection into a `QuizRating` document format.
 *
 * @param document - A single document from the original `quiz_ratings` collection.
 * @returns The transformed `QuizRating`-format document.
 */
export function transformQuizRatingDocument(
  document: BSONDocument,
): BSONDocument {
  return {
    _id: extractValueOrThrow<string>(document, {}, '_id'),
    __v: 0,
    quizId: extractValueOrThrow<string>(document, {}, 'quizId'),
    author: extractAuthorOrThrow(document),
    stars: extractValueOrThrow<number>(document, {}, 'stars'),
    comment: extractValue<number>(document, {}, 'comment'),
    updated: toDate(extractValueOrThrow<string>(document, {}, 'updated')),
    created: toDate(extractValueOrThrow<string>(document, {}, 'created')),
  }
}

function extractAuthorOrThrow(document: BSONDocument): BSONDocument {
  const type = extractValue<string>(document, {}, 'author.type')

  if (type === QuizRatingAuthorType.User) {
    return {
      type,
      user: extractValueOrThrow<string>(document, {}, 'author.user'),
    }
  } else if (type === QuizRatingAuthorType.Anonymous) {
    return {
      type,
      participantId: extractValueOrThrow<string>(
        document,
        {},
        'author.participantId',
      ),
      nickname: extractValueOrThrow<string>(document, {}, 'author.nickname'),
    }
  } else {
    return {
      type: QuizRatingAuthorType.User,
      user: extractValueOrThrow<string>(document, {}, 'author'),
    }
  }
}
