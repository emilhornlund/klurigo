import {
  BSONDocument,
  extractValue,
  extractValueOrThrow,
  toDate,
} from '../utils'

/**
 * Transforms a document from the `tokens` collection into a `tokens` document format.
 *
 * @param document - A single document from the original `tokens` collection.
 * @returns The transformed `tokens`-format document.
 */
export function transformTokenDocument(document: BSONDocument): BSONDocument {
  return {
    _id: extractValueOrThrow<string>(document, {}, '_id'),
    __v: 0,
    pairId: extractValueOrThrow<string>(document, {}, 'pairId'),
    type: extractValueOrThrow<string>(document, {}, 'type'),
    scope: extractValueOrThrow<string>(document, {}, 'scope'),
    principalId: extractValueOrThrow<string>(document, {}, 'principalId'),
    ipAddress: extractValue<string>(document, {}, 'ipAddress'),
    userAgent: extractValue<string>(document, {}, 'userAgent'),
    createdAt: toDate(extractValueOrThrow<string>(document, {}, 'createdAt')),
    expiresAt: toDate(extractValueOrThrow<string>(document, {}, 'expiresAt')),
  }
}
