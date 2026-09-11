import { GameStatus } from '@klurigo/common'

import { GameDocument, TaskType } from '../repositories/models/schemas'

export type TaskStatus = 'pending' | 'active' | 'completed'

export type TaskIdentity = {
  id: string
  type: TaskType
  status: TaskStatus
}

/**
 * The task status state machine is deliberately separate from task-to-task
 * progression. Every task enters pending, becomes active, and is completed;
 * only a completed task may create the next task.
 */
export function isSupportedTaskStatusTransition(
  type: TaskType,
  from: TaskStatus,
  to: TaskStatus | undefined,
): boolean {
  if (to === undefined) return from === 'completed'
  if (from === 'pending') return to === 'active'
  if (from === 'active') return to === 'completed'
  return false
}

export function isSupportedTaskTypeProgression(
  from: TaskType,
  to: TaskType,
  questionsRemain: boolean,
): boolean {
  switch (from) {
    case TaskType.Lobby:
      return to === TaskType.Question
    case TaskType.Question:
      return to === TaskType.QuestionResult
    case TaskType.QuestionResult:
      return to === (questionsRemain ? TaskType.Leaderboard : TaskType.Podium)
    case TaskType.Leaderboard:
      return to === TaskType.Question
    case TaskType.Podium:
      return false
  }
}

export function getTaskIdentity(game: GameDocument): TaskIdentity {
  const { currentTask } = game
  return {
    id: currentTask._id,
    type: currentTask.type,
    status: currentTask.status,
  }
}

export function isCurrentTask(
  game: GameDocument,
  expected: TaskIdentity,
): boolean {
  return (
    game.status === GameStatus.Active &&
    game.currentTask._id === expected.id &&
    game.currentTask.type === expected.type &&
    game.currentTask.status === expected.status
  )
}
