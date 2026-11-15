import { createHash } from 'node:crypto'

import {
  CRITTERS_V1_COLORS,
  CRITTERS_V1_PARTS,
  type CrittersAvatarConfigurationV1,
  isCrittersAvatarConfigurationV1,
  QuizRatingAuthorType,
  resolveGameAvatarSnapshot,
} from '@klurigo/common'
import {
  Binary,
  type Double,
  type Int32,
  type Long,
  type ObjectId,
  UUID,
} from 'bson'

import type { CollectionsRecord } from '../utils'

/** Open dump documents are inspected without normalizing their existing fields. */
export type AvatarDocument = Record<string, unknown>

/** Only these collections contain persisted avatar preferences or snapshots. */
export const AVATAR_COLLECTIONS = [
  'users',
  'games',
  'game_results',
  'quiz_ratings',
] as const

type AvatarCollection = (typeof AVATAR_COLLECTIONS)[number]

interface AvatarSlot {
  collection: AvatarCollection
  document: AvatarDocument
  target: AvatarDocument
  field: 'avatar' | 'hostAvatar'
  identity: string | undefined
}

/** Counts additions, including unresolved identities that were left untouched. */
export interface AvatarBackfillResult {
  changedDocuments: Set<AvatarDocument>
  addedAvatars: Record<AvatarCollection, number>
  generatedIdentities: number
  skippedMissingIdentity: number
}

const isDocument = (value: unknown): value is AvatarDocument =>
  value !== null &&
  typeof value === 'object' &&
  Object.getPrototypeOf(value) === Object.prototype

const documents = (value: unknown): AvatarDocument[] =>
  Array.isArray(value) ? value.filter(isDocument) : []

// BSON uses separate ESM/CJS constructors. Its type tag also works across those
// module boundaries, unlike instanceof checks on values supplied by a caller.
const bsonType = (value: unknown): unknown =>
  value !== null && typeof value === 'object' && '_bsontype' in value
    ? value._bsontype
    : undefined

/** Matches UUID/ObjectId references across their BSON and string representations. */
function identityKey(value: unknown): string | undefined {
  if (typeof value === 'string' && value.length > 0) {
    return /^[\da-f]{24}$/i.test(value) ||
      /^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(value)
      ? value.toLowerCase()
      : value
  }
  if (
    bsonType(value) === 'ObjectId' &&
    typeof (value as ObjectId).toHexString === 'function'
  )
    return (value as ObjectId).toHexString()
  const binary = value as Binary | undefined
  if (
    bsonType(binary) === 'Binary' &&
    binary?.sub_type === Binary.SUBTYPE_UUID &&
    binary.buffer?.length === 16
  ) {
    return new UUID(binary.buffer).toHexString()
  }
  if (isDocument(value)) return identityKey(value._id)
  return undefined
}

/** Extract supported choices for copying, leaving the source BSON value intact. */
function existingAvatar(
  value: unknown,
): CrittersAvatarConfigurationV1 | undefined {
  if (!isDocument(value)) return undefined
  const version = value.version
  const candidate = {
    ...value,
    version:
      bsonType(version) === 'Int32' || bsonType(version) === 'Double'
        ? (version as Int32 | Double).valueOf()
        : bsonType(version) === 'Long' &&
            typeof (version as Long).toNumber === 'function'
          ? (version as Long).toNumber()
          : version,
  }
  return isCrittersAvatarConfigurationV1(candidate)
    ? resolveGameAvatarSnapshot(candidate)
    : undefined
}

/**
 * Produces identity-seeded random-looking v1 choices, independent of dump order
 * and previous runs. The complete configuration, not the seed, is persisted.
 */
function generateAvatar(identity: string): CrittersAvatarConfigurationV1 {
  const bytes = createHash('sha512')
    .update(`klurigo-missing-avatars-v1:${identity}`)
    .digest()
  let offset = 0
  const pick = <T>(values: readonly T[]): T => {
    const index = bytes.readUInt32BE(offset) % values.length
    offset += 4
    return values[index]
  }
  const bodyColor = pick(CRITTERS_V1_COLORS.body)
  return {
    version: 1,
    style: 'critters',
    artworkVersion: 'v1',
    body: pick(CRITTERS_V1_PARTS.body),
    top: pick([...CRITTERS_V1_PARTS.top, null]),
    eyes: pick(CRITTERS_V1_PARTS.eyes),
    mouth: pick(CRITTERS_V1_PARTS.mouth),
    pattern: pick([...CRITTERS_V1_PARTS.pattern, null]),
    cheeks: pick([...CRITTERS_V1_PARTS.cheeks, null]),
    bodyColor,
    accentColor: pick(
      CRITTERS_V1_COLORS.accent.filter((color) => color !== bodyColor),
    ),
    backgroundColor: pick(CRITTERS_V1_COLORS.background),
  }
}

/** Enumerates only persisted avatar locations; answers and unrelated data are excluded. */
function avatarSlots(
  collections: Record<string, AvatarDocument[]>,
): AvatarSlot[] {
  const slots: AvatarSlot[] = []
  for (const collection of AVATAR_COLLECTIONS) {
    const ordered = [...(collections[collection] ?? [])].sort((left, right) => {
      const a = identityKey(left._id) ?? ''
      const b = identityKey(right._id) ?? ''
      return a < b ? -1 : a > b ? 1 : 0
    })
    for (const document of ordered) {
      const add = (
        target: AvatarDocument,
        field: AvatarSlot['field'],
        identity: unknown,
      ) =>
        slots.push({
          collection,
          document,
          target,
          field,
          identity: identityKey(identity),
        })

      if (collection === 'users') {
        add(document, 'avatar', document._id)
      } else if (collection === 'games') {
        for (const participant of documents(document.participants)) {
          add(participant, 'avatar', participant.participantId)
        }
        const tasks = [
          document.currentTask,
          ...documents(document.previousTasks),
        ]
        for (const task of tasks) {
          if (!isDocument(task)) continue
          const entries =
            task.type === 'QUESTION_RESULT'
              ? documents(task.results)
              : task.type === 'LEADERBOARD' || task.type === 'PODIUM'
                ? documents(task.leaderboard)
                : []
          for (const entry of entries) {
            add(entry, 'avatar', entry.playerId)
          }
        }
      } else if (collection === 'game_results') {
        add(document, 'hostAvatar', document.hostParticipantId)
        for (const player of documents(document.players)) {
          add(player, 'avatar', player.participantId)
        }
      } else if (
        isDocument(document.author) &&
        document.author.type === QuizRatingAuthorType.Anonymous
      ) {
        add(document.author, 'avatar', document.author.participantId)
      }
    }
  }
  return slots
}

/**
 * Adds absent avatar fields in place. Existing fields, including null, malformed
 * values, and future versions, are never replaced. One design per identity fills
 * every gap, using a supported account preference or historical anchor first.
 *
 * @param collections - Documents from a single database dump, in current storage shapes.
 * @returns Changed document references and addition/skip counts for the dump writer.
 */
export function patchMissingAvatars(
  collections: Record<string, AvatarDocument[]>,
): AvatarBackfillResult {
  const slots = avatarSlots(collections)
  const identities = new Map<string, CrittersAvatarConfigurationV1>()

  // Read all existing anchors before filling any gaps. Sorted collection/document
  // order makes conflicting historical anchors deterministic without changing them.
  for (const slot of slots) {
    if (!slot.identity) continue
    const avatar = existingAvatar(slot.target[slot.field])
    if (!avatar) continue
    if (!identities.has(slot.identity)) identities.set(slot.identity, avatar)
  }

  const result: AvatarBackfillResult = {
    changedDocuments: new Set(),
    addedAvatars: { users: 0, games: 0, game_results: 0, quiz_ratings: 0 },
    generatedIdentities: 0,
    skippedMissingIdentity: 0,
  }
  for (const slot of slots) {
    if (Object.prototype.hasOwnProperty.call(slot.target, slot.field)) continue
    if (!slot.identity) {
      result.skippedMissingIdentity++
      continue
    }
    let avatar = identities.get(slot.identity)
    if (!avatar) {
      avatar = generateAvatar(slot.identity)
      identities.set(slot.identity, avatar)
      result.generatedIdentities++
    }
    slot.target[slot.field] = { ...avatar }
    result.changedDocuments.add(slot.document)
    result.addedAvatars[slot.collection]++
  }
  return result
}

/**
 * Applies the temporary missing-only backfill to transformed collections.
 * Permanent transformers and cleanup preserve existing metadata independently.
 *
 * @param transformed - Cleaned legacy migration output to augment with avatars.
 * @returns Backfill counts and references to augmented output documents.
 */
export function patchCollectionAvatars(
  transformed: CollectionsRecord,
): AvatarBackfillResult {
  const targets = Object.fromEntries(
    Object.entries(transformed).map(([name, collection]) => [
      name,
      collection.documents,
    ]),
  )
  return patchMissingAvatars(targets)
}
