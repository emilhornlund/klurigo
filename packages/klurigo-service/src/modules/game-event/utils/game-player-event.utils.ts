import { GameEvent, GameStatus } from '@klurigo/common'

import {
  GameDocument,
  ParticipantPlayerWithBase,
} from '../../game-core/repositories/models/schemas'
import {
  isLeaderboardTask,
  isLobbyTask,
  isPodiumTask,
  isQuestionResultTask,
  isQuestionTask,
} from '../../game-task/utils/task-type-guards'
import { GameEventMetaData } from '../models'

import { buildGameLoadingEvent } from './game-loading-event.utils'
import {
  buildGameBeginPlayerEvent,
  buildGameLobbyPlayerEvent,
} from './game-lobby-event.utils'
import { buildGameOverPlayerEvent } from './game-over-event.utils'
import {
  buildGameQuestionPlayerEvent,
  buildGameQuestionPreviewPlayerEvent,
} from './game-question-event.utils'
import { buildGameQuitEvent } from './game-quit-event.utils'
import { buildGameResultPlayerEvent } from './game-result-event.utils'

/**
 * Constructs an event for a player based on the current state of the game document and the provided player details.
 *
 * @param game - The `GameDocument` representing the current state of the game, including its task and associated data.
 * @param player - The player participant object for whom the event is being built.
 * @param metadata - Metadata containing the number of submissions and related player information.
 *
 * @throws {Error} Throws an error if the task type is not recognized.
 *
 * @returns A `GameEvent` tailored for the player, depending on the type and status of the current task.
 */
export function buildPlayerGameEvent(
  game: GameDocument,
  player: ParticipantPlayerWithBase,
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
        return buildGameLobbyPlayerEvent(player)
      case 'completed':
        return buildGameBeginPlayerEvent(player)
    }
  }

  if (isQuestionTask(game)) {
    switch (game.currentTask.status) {
      case 'pending':
        return buildGameQuestionPreviewPlayerEvent(game, player)
      case 'active':
      case 'completed':
        return buildGameQuestionPlayerEvent(
          game,
          player,
          metadata.playerAnswerSubmission,
        )
    }
  }

  if (isQuestionResultTask(game) || isLeaderboardTask(game)) {
    switch (game.currentTask.status) {
      case 'pending':
        return buildGameLoadingEvent()
      case 'active':
        return buildGameResultPlayerEvent(game, player)
      case 'completed':
        return buildGameLoadingEvent()
    }
  }

  if (isPodiumTask(game)) {
    switch (game.currentTask.status) {
      case 'pending':
        return buildGameLoadingEvent()
      case 'active':
      case 'completed':
        return buildGameOverPlayerEvent(game, player, metadata)
    }
  }

  throw new Error('Unknown task')
}
