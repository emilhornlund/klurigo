const AVERAGE_READING_SPEED_WORDS_PER_MINUTE = 220
const MILLISECONDS_PER_MINUTE = 60_000
const MILLISECONDS_PER_CHARACTER = 100
const MAX_CHARACTER_DURATION_MS = 15_000

/**
 * Calculates how long the question-preview phase displays question text.
 *
 * The character-based duration is capped, while the reading-based duration
 * remains the upper bound when it takes longer to read the question.
 */
export const getQuestionPreviewDurationMs = (questionText: string): number => {
  const wordCount = questionText.trim().split(/\s+/).length
  const readingDurationMs =
    (wordCount / AVERAGE_READING_SPEED_WORDS_PER_MINUTE) *
    MILLISECONDS_PER_MINUTE
  const characterDurationMs = Math.min(
    questionText.length * MILLISECONDS_PER_CHARACTER,
    MAX_CHARACTER_DURATION_MS,
  )

  return Math.max(readingDurationMs, characterDurationMs)
}
