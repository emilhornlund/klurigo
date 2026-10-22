import { QuizRatingAuthorType } from '@klurigo/common'

import {
  BSONDocument,
  extractValue,
  extractValueOrThrow,
  toDateOrThrow,
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
    comment: extractValue<string>(document, {}, 'comment'),
    updated: toDateOrThrow(
      extractValueOrThrow<string>(document, {}, 'updated'),
    ),
    created: toDateOrThrow(
      extractValueOrThrow<string>(document, {}, 'created'),
    ),
  }
}

function extractAuthorOrThrow(document: BSONDocument): BSONDocument {
  const rawAuthor = extractValue<BSONDocument | string>(document, {}, 'author')
  const type =
    rawAuthor && typeof rawAuthor === 'object'
      ? extractValue<string>(rawAuthor, {}, 'type')
      : null

  // Legacy ratings stored the user id directly in `author`; current ratings
  // store a discriminated author subdocument.
  if (!type && typeof rawAuthor === 'string') {
    return { type: QuizRatingAuthorType.User, user: rawAuthor }
  }

  const resolvedType =
    type ?? extractValueOrThrow<string>(document, {}, 'author.type')

  if (resolvedType === QuizRatingAuthorType.User) {
    return {
      type: resolvedType,
      user: extractValueOrThrow<string>(document, {}, 'author.user'),
    }
  } else if (resolvedType === QuizRatingAuthorType.Anonymous) {
    return {
      type: resolvedType,
      participantId: extractValueOrThrow<string>(
        document,
        {},
        'author.participantId',
      ),
      nickname: extractValueOrThrow<string>(document, {}, 'author.nickname'),
    }
  } else {
    throw new Error('Unknown author type')
  }
}
