import { AuthProvider, generateNickname } from '@klurigo/common'

import {
  BSONDocument,
  extractValue,
  extractValueOrThrow,
  toDate,
} from '../utils'

import { copyAvatarMetadata } from './avatar.transformers'

/**
 * Transforms a document from the `players` collection into a `users` document format.
 *
 * @param document - A single document from the original `players` collection.
 * @returns The transformed `users`-format document.
 */
export function transformPlayerOrUserDocument(
  document: BSONDocument,
): BSONDocument {
  const authProvider = extractValueOrThrow<string>(document, {}, 'authProvider')
  return {
    _id: extractValueOrThrow<string>(document, {}, '_id'),
    __v: 0,
    authProvider,
    ...(authProvider === AuthProvider.Google
      ? { googleUserId: extractValue<string>(document, {}, 'googleUserId') }
      : {}),
    email: extractValueOrThrow<string>(document, {}, 'email'),
    unverifiedEmail: extractValue<string>(document, {}, 'unverifiedEmail'),
    ...(authProvider === AuthProvider.Local
      ? { hashedPassword: extractValue<string>(document, {}, 'hashedPassword') }
      : {}),
    givenName: extractValue<string>(document, {}, 'givenName'),
    familyName: extractValue<string>(document, {}, 'familyName'),
    defaultNickname:
      extractValue<string>(document, {}, 'defaultNickname') ||
      generateNickname(),
    lastLoggedInAt: toDate(
      extractValue<string>(document, {}, 'lastLoggedInAt'),
    ),
    createdAt: toDate(
      extractValueOrThrow<string>(document, {}, 'createdAt', 'created'),
    ),
    updatedAt: toDate(
      extractValueOrThrow<string>(document, {}, 'updatedAt', 'modified'),
    ),
    ...copyAvatarMetadata(document),
  }
}
