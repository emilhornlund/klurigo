import { PaginationEvent } from '@klurigo/common'

import {
  Game,
  QuestionResultTaskWithBase,
} from '../../game-core/repositories/models/schemas'

/**
 * Builds a pagination event from the current task's question index.
 *
 * Assumes the current task stores a zero-based `questionIndex` and converts it
 * to a one-based index for the pagination event.
 *
 * @param game - Game document whose current task exposes `questionIndex`.
 * @returns Pagination metadata with current question (1-based) and total questions.
 */
export function buildPaginationEventFromGameDocument(
  game: Game & { currentTask: { questionIndex: number } },
): PaginationEvent {
  return buildPaginationEvent(
    game.currentTask.questionIndex + 1,
    game.questions.length,
  )
}

/**
 * Builds a pagination event for a specific question result task.
 *
 * Uses the task's zero-based `questionIndex` and converts it to a one-based
 * index for the pagination event.
 *
 * @param game - Game document containing all questions.
 * @param task - Question result task with the current `questionIndex`.
 * @returns Pagination metadata with current question (1-based) and total questions.
 */
export function buildPaginationEventFromQuestionResultTask(
  game: Game,
  task: QuestionResultTaskWithBase,
): PaginationEvent {
  return buildPaginationEvent(task.questionIndex + 1, game.questions.length)
}

/**
 * Builds a pagination event from explicit values.
 *
 * @param currentQuestion - One-based index of the current question.
 * @param totalQuestions - Total number of questions in the game.
 * @returns Pagination metadata with current and total.
 */
export function buildPaginationEvent(
  currentQuestion: number,
  totalQuestions: number,
): PaginationEvent {
  return {
    current: currentQuestion,
    total: totalQuestions,
  }
}
