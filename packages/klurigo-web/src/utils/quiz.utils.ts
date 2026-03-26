import type { DiscoveryQuizCardDto, QuizResponseDto } from '@klurigo/common'

export type DifficultyLabel = 'Easy' | 'Medium' | 'Hard' | 'Extreme'

/**
 * Converts a difficulty percentage into a human-readable difficulty label.
 *
 * The input is clamped to the range 0..1 and mapped to:
 * - 0.00..0.24 => Easy
 * - 0.25..0.49 => Medium
 * - 0.50..0.74 => Hard
 * - 0.75..1.00 => Extreme
 *
 * @param difficultyPercentage - Estimated difficulty as a value between 0 and 1.
 * @returns The corresponding difficulty label, or `undefined` if the input is not a number.
 */
export function toDifficultyLabel(
  difficultyPercentage?: number,
): DifficultyLabel | undefined {
  if (
    typeof difficultyPercentage !== 'number' ||
    Number.isNaN(difficultyPercentage)
  )
    return undefined

  const d = Math.min(1, Math.max(0, difficultyPercentage))

  if (d < 0.25) return 'Easy'
  if (d < 0.5) return 'Medium'
  if (d < 0.75) return 'Hard'
  return 'Extreme'
}

/**
 * Maps a backend quiz response into the discovery card shape used by
 * `QuizDiscoveryCard`.
 *
 * This keeps page-level code independent from backend response details while
 * preserving the existing API contract unchanged.
 *
 * @param quiz - Backend quiz response item to adapt.
 * @returns The quiz data in discovery card format.
 */
export function toDiscoveryQuizCard(
  quiz: QuizResponseDto,
): DiscoveryQuizCardDto {
  return {
    id: quiz.id,
    title: quiz.title,
    description: quiz.description,
    imageCoverURL: quiz.imageCoverURL,
    category: quiz.category,
    languageCode: quiz.languageCode,
    mode: quiz.mode,
    numberOfQuestions: quiz.numberOfQuestions,
    author: quiz.author,
    gameplaySummary: quiz.gameplaySummary,
    ratingSummary: quiz.ratingSummary,
    created: quiz.created,
  }
}

/**
 * Maps backend quiz response items into discovery card data for list rendering.
 *
 * @param quizzes - Backend quiz response items to adapt.
 * @returns Discovery card data ready for `QuizDiscoveryCard`.
 */
export function toDiscoveryQuizCards(
  quizzes: readonly QuizResponseDto[],
): DiscoveryQuizCardDto[] {
  return quizzes.map(toDiscoveryQuizCard)
}
