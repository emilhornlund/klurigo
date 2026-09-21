import { Game } from '../../game-core/repositories/models/schemas'

/**
 * Validates that the question index is within bounds and returns the question.
 *
 * @param game - The game document containing questions and current task
 * @throws {Error} When questionIndex is out of bounds or questions array is empty
 * @returns The question at the specified index
 */
export function validateAndGetQuestion(
  game: Game & { currentTask: { questionIndex: number } },
) {
  if (!game.questions || game.questions.length === 0) {
    throw new Error('Game has no questions')
  }

  const { questionIndex } = game.currentTask

  if (questionIndex < 0 || questionIndex >= game.questions.length) {
    throw new Error(
      `Question index ${questionIndex} is out of bounds. Game has ${game.questions.length} questions (0-${game.questions.length - 1})`,
    )
  }

  return game.questions[questionIndex]
}

/**
 * Validates that the game document has the required structure for event building.
 *
 * @param game - The game document to validate
 * @throws {Error} When required properties are missing
 */
export function validateGameDocument(game: Game): void {
  if (!game) {
    throw new Error('Game document is required')
  }

  if (!game._id) {
    throw new Error('Game document must have an ID')
  }

  if (!game.currentTask) {
    throw new Error('Game document must have a current task')
  }
}
