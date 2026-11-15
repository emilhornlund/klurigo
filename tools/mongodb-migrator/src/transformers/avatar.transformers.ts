import type { BSONDocument } from '../utils'

/**
 * Carries existing avatar metadata through collection transformations unchanged.
 * Does not generate defaults or turn absent fields into present fields.
 *
 * @param document - Source document or identity subdocument.
 * @param field - Stored avatar field to preserve.
 * @returns The existing field, including null or unsupported values, or no fields.
 */
export function copyAvatarMetadata(
  document: BSONDocument,
  field: 'avatar' | 'hostAvatar' = 'avatar',
): BSONDocument {
  return Object.prototype.hasOwnProperty.call(document, field)
    ? { [field]: document[field] }
    : {}
}
