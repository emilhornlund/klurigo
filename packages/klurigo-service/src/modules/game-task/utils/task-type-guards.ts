import {
  GameDocument,
  TaskType,
} from '../../game-core/repositories/models/schemas'

/**
 * Checks if the current task of the game document is a lobby task.
 *
 * @param {GameDocument & { currentTask: { type: TaskType.Lobby } }} document - The game document with a lobby task type.
 *
 * @returns {boolean} Returns `true` if the current task type is `Lobby`, otherwise `false`.
 */
export function isLobbyTask(
  document: GameDocument,
): document is GameDocument & { currentTask: { type: TaskType.Lobby } } {
  return document.currentTask.type === TaskType.Lobby
}

/**
 * Checks if the current task of the game document is a question task.
 *
 * @param {GameDocument & { currentTask: { type: TaskType.Question } }} document - The game document with a question task type.
 *
 * @returns {boolean} Returns `true` if the current task type is `Question`, otherwise `false`.
 */
export function isQuestionTask(
  document: GameDocument,
): document is GameDocument & { currentTask: { type: TaskType.Question } } {
  return document.currentTask.type === TaskType.Question
}

/**
 * Checks if the current task of the game document is a question result task.
 *
 * @param {GameDocument & { currentTask: { type: TaskType.QuestionResult } }} document - The game document with a question result task type.
 *
 * @returns {boolean} Returns `true` if the current task type is `QuestionResult`, otherwise `false`.
 */
export function isQuestionResultTask(
  document: GameDocument,
): document is GameDocument & {
  currentTask: { type: TaskType.QuestionResult }
} {
  return document.currentTask.type === TaskType.QuestionResult
}

/**
 * Checks if the current task of the game document is a leaderboard task.
 *
 * @param {GameDocument & { currentTask: { type: TaskType.Leaderboard } }} document - The game document with a leaderboard task type.
 *
 * @returns {boolean} Returns `true` if the current task type is `Leaderboard`, otherwise `false`.
 */
export function isLeaderboardTask(
  document: GameDocument,
): document is GameDocument & {
  currentTask: { type: TaskType.Leaderboard }
} {
  return document.currentTask.type === TaskType.Leaderboard
}

/**
 * Checks if the current task of the game document is a podium task.
 *
 * @param {GameDocument & { currentTask: { type: TaskType.Podium } }} document - The game document with a podium task type.
 *
 * @returns {boolean} Returns `true` if the current task type is `Podium`, otherwise `false`.
 */
export function isPodiumTask(
  document: GameDocument,
): document is GameDocument & {
  currentTask: { type: TaskType.Podium }
} {
  return document.currentTask.type === TaskType.Podium
}
