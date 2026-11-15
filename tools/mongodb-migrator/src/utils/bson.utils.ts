import { readFileSync, writeFileSync } from 'fs'

import {
  Binary,
  BSON,
  BSONRegExp,
  Decimal128,
  Long,
  ObjectId,
  Timestamp,
} from 'bson'

/**
 * A union type representing any value that can be stored in BSON.
 *
 * Can be:
 * - a primitive (`string`, `number`, `boolean`, `null`)
 * - a `Date`
 * - a BSON-specific type (`ObjectId`, `Binary`, `Long`, `Timestamp`, `Decimal128`, `BSONRegExp`)
 * - a nested `BSONDocument`
 * - a `BSONArray`
 */
export type BSONValue =
  | string
  | number
  | boolean
  | null
  | Date
  | ObjectId
  | Binary
  | Long
  | Timestamp
  | Decimal128
  | BSONRegExp
  | BSONDocument
  | BSONArray

/**
 * An object whose keys are strings and whose values are valid BSON values.
 */
export interface BSONDocument {
  [key: string]: BSONValue
}

/**
 * An array of valid BSON values.
 */
export type BSONArray = BSONValue[]

/**
 * Reads and deserializes a `.bson` file into an array of JSON-like documents.
 *
 * @param filePath - Path to the `.bson` file.
 * @returns An array of deserialized documents from the file.
 */
export function parseBsonDocuments(filePath: string): BSONDocument[] {
  const bsonBuffer = readFileSync(filePath)
  const documents: BSONDocument[] = []
  let offset = 0
  while (offset < bsonBuffer.length) {
    const size = bsonBuffer.readInt32LE(offset)
    const slice = bsonBuffer.slice(offset, offset + size)
    const doc = BSON.deserialize(slice)
    documents.push(doc)
    offset += size
  }
  return documents
}

/**
 * Serializes an array of JavaScript objects into a single BSON buffer and writes it to disk.
 *
 * @param filePath - The target file path for the BSON output.
 * @param documents - Array of plain objects to serialize into BSON.
 */
export function writeBsonDocuments(
  filePath: string,
  documents: BSONDocument[],
) {
  const transformedBuffer = Buffer.concat(
    documents.map((document) => BSON.serialize(document)),
  )
  writeFileSync(filePath, transformedBuffer)
}

/**
 * Type guard for identifying plain BSON document objects.
 *
 * Excludes arrays and `Date` instances.
 *
 * @param value - The value to check.
 * @returns `true` if the value is a plain object suitable to treat as a `BSONDocument`.
 */
const isPlainObject = (value: unknown): value is BSONDocument =>
  typeof value === 'object' &&
  value !== null &&
  !Array.isArray(value) &&
  !(value instanceof Date)

/**
 * Recursively removes `null` values outside stored avatar metadata.
 *
 * - `null` becomes `undefined` (caller may drop the field).
 * - Arrays are cleaned element-wise and `undefined` entries are removed.
 * - Plain objects are cleaned property-wise and `undefined` properties are removed.
 * - Avatar fields are preserved whole: null parts are meaningful persisted choices.
 * - All other values are returned unchanged.
 *
 * @param value - The BSON value to clean.
 * @returns The cleaned BSON value, or `undefined` if the value should be removed.
 */
export const cleanBSONValue = (value: BSONValue): BSONValue | undefined => {
  if (value === null) {
    return undefined
  }

  if (Array.isArray(value)) {
    return value
      .map(cleanBSONValue)
      .filter((v): v is BSONValue => v !== undefined)
  }

  if (isPlainObject(value)) {
    const cleanedObject: BSONDocument = {}

    for (const [key, childValue] of Object.entries(value)) {
      if (key === 'avatar' || key === 'hostAvatar') {
        cleanedObject[key] = childValue
        continue
      }
      const cleanedChild = cleanBSONValue(childValue)
      if (cleanedChild !== undefined) {
        cleanedObject[key] = cleanedChild
      }
    }

    return cleanedObject
  }

  return value
}
