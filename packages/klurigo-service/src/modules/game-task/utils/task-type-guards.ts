import { Game, TaskType } from '../../game-core/repositories/models/schemas'

/**
 * Checks if the current task of the game document is a lobby task.
 *
 * @param {Game & { currentTask: { type: TaskType.Lobby } }} document - The game with a lobby task type.
 *
 * @returns {boolean} Returns `true` if the current task type is `Lobby`, otherwise `false`.
 */
export function isLobbyTask(
  document: Game,
): document is Game & { currentTask: { type: TaskType.Lobby } } {
  return document.currentTask.type === TaskType.Lobby
}

/**
 * Checks if the current task of the game document is a question task.
 *
 * @param {Game & { currentTask: { type: TaskType.Question } }} document - The game with a question task type.
 *
 * @returns {boolean} Returns `true` if the current task type is `Question`, otherwise `false`.
 */
export function isQuestionTask(
  document: Game,
): document is Game & { currentTask: { type: TaskType.Question } } {
  return document.currentTask.type === TaskType.Question
}

/**
 * Checks if the current task of the game document is a question result task.
 *
 * @param {Game & { currentTask: { type: TaskType.QuestionResult } }} document - The game with a question result task type.
 *
 * @returns {boolean} Returns `true` if the current task type is `QuestionResult`, otherwise `false`.
 */
export function isQuestionResultTask(document: Game): document is Game & {
  currentTask: { type: TaskType.QuestionResult }
} {
  return document.currentTask.type === TaskType.QuestionResult
}

/**
 * Checks if the current task of the game document is a leaderboard task.
 *
 * @param {Game & { currentTask: { type: TaskType.Leaderboard } }} document - The game with a leaderboard task type.
 *
 * @returns {boolean} Returns `true` if the current task type is `Leaderboard`, otherwise `false`.
 */
export function isLeaderboardTask(document: Game): document is Game & {
  currentTask: { type: TaskType.Leaderboard }
} {
  return document.currentTask.type === TaskType.Leaderboard
}

/**
 * Checks if the current task of the game document is a podium task.
 *
 * @param {Game & { currentTask: { type: TaskType.Podium } }} document - The game with a podium task type.
 *
 * @returns {boolean} Returns `true` if the current task type is `Podium`, otherwise `false`.
 */
export function isPodiumTask(document: Game): document is Game & {
  currentTask: { type: TaskType.Podium }
} {
  return document.currentTask.type === TaskType.Podium
}
