import { QuizRatingAuthorType } from '@klurigo/common'

import {
  QuizRatingAnonymousAuthorWithBase,
  QuizRatingAuthorBase,
  QuizRatingUserAuthorWithBase,
} from '../repositories/models/schemas'

/**
 * Type guard for checking whether a quiz rating author is a user author.
 *
 * @param author - The quiz rating author to check.
 * @returns `true` when the author is a user author, otherwise `false`.
 */
export function isQuizRatingUserAuthor(
  author?: QuizRatingAuthorBase,
): author is QuizRatingUserAuthorWithBase & {
  type: QuizRatingAuthorType.User
} {
  return author?.type === QuizRatingAuthorType.User
}

/**
 * Type guard for checking whether a quiz rating author is an anonymous author.
 *
 * @param author - The quiz rating author to check.
 * @returns `true` when the author is an anonymous author, otherwise `false`.
 */
export function isQuizRatingAnonymousAuthor(
  author?: QuizRatingAuthorBase,
): author is QuizRatingAnonymousAuthorWithBase & {
  type: QuizRatingAuthorType.Anonymous
} {
  return author?.type === QuizRatingAuthorType.Anonymous
}
