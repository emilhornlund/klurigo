import { GameEvent, GameStatus } from '@klurigo/common'

import { GameDocument } from '../../game-core/repositories/models/schemas'
import {
  isLeaderboardTask,
  isLobbyTask,
  isPodiumTask,
  isQuestionResultTask,
  isQuestionTask,
} from '../../game-task/utils/task-type-guards'
import { GameEventMetaData } from '../models'

import { buildGameLeaderboardHostEvent } from './game-leaderboard-event.utils'
import { buildGameLoadingEvent } from './game-loading-event.utils'
import {
  buildGameBeginHostEvent,
  buildGameLobbyHostEvent,
} from './game-lobby-event.utils'
import { buildGamePodiumHostEvent } from './game-podium-event.utils'
import {
  buildGameQuestionHostEvent,
  buildGameQuestionPreviewHostEvent,
} from './game-question-event.utils'
import { buildGameQuitEvent } from './game-quit-event.utils'
import { buildGameResultHostEvent } from './game-result-event.utils'

/**
 * Constructs an event for the host based on the current state of the game document.
 *
 * @param game - The `GameDocument` representing the current state of the game, including its task and associated data.
 * @param metadata - Metadata including the number of submissions and related player information.
 *
 * @throws {Error} Throws an error if the task type is not recognized.
 *
 * @returns A `GameEvent` tailored for the host, depending on the type and status of the current task.
 */
export function buildHostGameEvent(
  game: GameDocument,
  metadata: Partial<GameEventMetaData> = {},
): GameEvent {
  if (
    GameStatus.Expired === game.status ||
    GameStatus.Terminated === game.status
  ) {
    return buildGameQuitEvent(game.status)
  }

  if (isLobbyTask(game)) {
    switch (game.currentTask.status) {
      case 'pending':
        return buildGameLoadingEvent()
      case 'active':
        return buildGameLobbyHostEvent(game)
      case 'completed':
        return buildGameBeginHostEvent()
    }
  }

  if (isQuestionTask(game)) {
    switch (game.currentTask.status) {
      case 'pending':
        return buildGameQuestionPreviewHostEvent(game)
      case 'active':
        return buildGameQuestionHostEvent(
          game,
          metadata.currentAnswerSubmissions ?? 0,
          metadata.totalAnswerSubmissions ?? 0,
        )
      case 'completed':
        return buildGameLoadingEvent()
    }
  }

  if (isQuestionResultTask(game)) {
    switch (game.currentTask.status) {
      case 'pending':
        return buildGameLoadingEvent()
      case 'active':
        return buildGameResultHostEvent(game)
      case 'completed':
        return buildGameLoadingEvent()
    }
  }

  if (isLeaderboardTask(game)) {
    switch (game.currentTask.status) {
      case 'pending':
        return buildGameLoadingEvent()
      case 'active':
        return buildGameLeaderboardHostEvent(game)
      case 'completed':
        return buildGameLoadingEvent()
    }
  }

  if (isPodiumTask(game)) {
    if (game.status === GameStatus.Completed) {
      return buildGameQuitEvent(game.status)
    }
    switch (game.currentTask.status) {
      case 'pending':
        return buildGameLoadingEvent()
      case 'active':
        return buildGamePodiumHostEvent(game)
      case 'completed':
        return buildGameLoadingEvent()
    }
  }

  throw new Error('Unknown task')
}
