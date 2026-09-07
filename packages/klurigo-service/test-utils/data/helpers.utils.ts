export const BASE_OFFSET_DATE = new Date('2025-04-09T14:43:03.687Z')

/**
 * Test fixtures use fixed IDs and dates by default. Use an explicit sequence
 * when a scenario needs more than one distinct fixture ID, and use
 * `offsetSeconds` for explicit temporal relationships.
 */
export function createMockUniqueId(sequence: number): string {
  if (
    !Number.isSafeInteger(sequence) ||
    sequence < 0 ||
    sequence > 0xffffffffffff
  ) {
    throw new Error(
      'The fixture ID sequence must be a safe integer between 0 and 2^48 - 1',
    )
  }

  return `00000000-0000-4000-8000-${sequence.toString(16).padStart(12, '0')}`
}

export function offsetSeconds(seconds: number): Date {
  return offsetMilliseconds(seconds * 1000)
}

export function offsetMilliseconds(milliseconds: number): Date {
  return new Date(BASE_OFFSET_DATE.getTime() + milliseconds)
}
