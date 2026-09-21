import {
  Game,
  ParticipantPlayerWithBase,
  QuestionResultTaskItem,
  QuestionResultTaskWithBase,
  TaskType,
} from '../../game-core/repositories/models/schemas'
import { isQuestionResultTask } from '../../game-task/utils/task-type-guards'

/**
 * Finds the question result entry for a specific player in a QuestionResult task.
 *
 * @param task - The QuestionResult task containing the result items.
 * @param player - The player participant whose result should be retrieved.
 *
 * @returns The matching QuestionResultTaskItem, or `null` if no entry exists.
 */
export function findQuestionResultForPlayer(
  task: QuestionResultTaskWithBase,
  player: ParticipantPlayerWithBase,
): QuestionResultTaskItem | null {
  const index = findQuestionResultIndexForPlayer(task, player)

  if (index < 0) {
    return null
  }

  return task.results[index]
}

/**
 * Finds the question result entry that appears immediately before the entry for a given player.
 *
 * Useful for evaluating movement in rankings or comparing scoring progression.
 *
 * @param task - The QuestionResult task containing the result items.
 * @param player - The player participant whose previous result should be retrieved.
 *
 * @returns The previous QuestionResultTaskItem, or `null` if none exists.
 */
export function findPreviousQuestionResultForPlayer(
  task: QuestionResultTaskWithBase,
  player: ParticipantPlayerWithBase,
): QuestionResultTaskItem | null {
  const index = findQuestionResultIndexForPlayer(task, player)

  if (index <= 0) {
    return null
  }

  return task.results[index - 1]
}

/**
 * Returns the array index of a player's QuestionResult entry within a QuestionResult task.
 *
 * Uses the player's participantId to locate the corresponding result.
 *
 * @param task - The QuestionResult task containing the result items.
 * @param player - The player participant whose index should be located.
 *
 * @returns The index of the matching result, or -1 if not found.
 */
function findQuestionResultIndexForPlayer(
  task: QuestionResultTaskWithBase,
  player: ParticipantPlayerWithBase,
): number {
  return task.results.findIndex(
    ({ playerId }) => playerId === player.participantId,
  )
}

/**
 * Finds the most recent QuestionResult task for a game.
 *
 * If the current task is a QuestionResult task, that task is returned.
 * Otherwise, the method searches `previousTasks` from last to first and
 * returns the last task with type `TaskType.QuestionResult`, or `null`
 * if none exists.
 *
 * @param gameDocument - Game document containing the current and previous tasks.
 * @returns The latest QuestionResult task if found, otherwise `null`.
 */
export function findLastQuestionResultTask(
  gameDocument: Game,
): QuestionResultTaskWithBase | null {
  if (isQuestionResultTask(gameDocument)) {
    return gameDocument.currentTask
  }

  const { previousTasks } = gameDocument

  for (let i = previousTasks.length - 1; i >= 0; i -= 1) {
    const task = previousTasks[i]
    if (task.type === TaskType.QuestionResult) {
      return task
    }
  }

  return null
}
