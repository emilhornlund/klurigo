import { writeFileSync } from 'fs'

/**
 * A union type representing any valid JSON value.
 *
 * Can be:
 * - a primitive (`string`, `number`, `boolean`)
 * - a `JSONObject`
 * - a `JSONArray`
 * - `undefined`
 */
export type JSONValue =
  string | number | boolean | JSONObject | JSONArray | undefined

/**
 * An object whose keys are strings and whose values are valid JSON values.
 */
export interface JSONObject {
  [x: string]: JSONValue
}

/**
 * An array of valid JSON values.
 */
export type JSONArray = Array<JSONValue>

/**
 * Writes a JSON object or array to disk as a compact string.
 *
 * @param filePath - Destination file path (e.g. `"out/collection.metadata.json"`).
 * @param data - A JSON object or array to serialize.
 */
export function writeJSONObject(
  filePath: string,
  data: JSONObject | JSONArray,
): void {
  writeFileSync(filePath, JSON.stringify(data))
}
