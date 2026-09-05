import {
  GameEventType,
  GameLeaderboardHostEvent,
  GameMode,
} from '@klurigo/common'

import {
  GameDocument,
  TaskType,
} from '../../game-core/repositories/models/schemas'

import { buildPaginationEventFromGameDocument } from './pagination-event.utils'

/**
 * Builds a leaderboard event for the host.
 *
 * @param game - The game document containing the current leaderboard task.
 */
export function buildGameLeaderboardHostEvent(
  game: GameDocument & { currentTask: { type: TaskType.Leaderboard } },
): GameLeaderboardHostEvent {
  const leaderboard = game.currentTask.leaderboard.slice(0, 5)

  if (game.mode === GameMode.Classic) {
    return {
      type: GameEventType.GameLeaderboardHost,
      game: {
        pin: game.pin,
        mode: game.mode,
      },
      leaderboard: leaderboard.map(
        ({ position, previousPosition, nickname, score, streaks }) => ({
          position,
          previousPosition,
          nickname,
          score,
          streaks,
        }),
      ),
      pagination: buildPaginationEventFromGameDocument(game),
    }
  }

  return {
    type: GameEventType.GameLeaderboardHost,
    game: {
      pin: game.pin,
      mode: game.mode,
    },
    leaderboard: leaderboard.map(
      ({ position, previousPosition, nickname, score }) => ({
        position,
        previousPosition,
        nickname,
        score,
      }),
    ),
    pagination: buildPaginationEventFromGameDocument(game),
  }
}
