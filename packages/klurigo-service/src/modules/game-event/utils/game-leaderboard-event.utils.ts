import {
  GameEventType,
  GameLeaderboardHostEvent,
  GameMode,
  resolveGameAvatarSnapshot,
} from '@klurigo/common'

import { Game, TaskType } from '../../game-core/repositories/models/schemas'

import { buildPaginationEventFromGameDocument } from './pagination-event.utils'

/**
 * Builds a leaderboard event for the host.
 *
 * @param game - The game document containing the current leaderboard task.
 */
export function buildGameLeaderboardHostEvent(
  game: Game & { currentTask: { type: TaskType.Leaderboard } },
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
        ({
          playerId,
          avatar,
          position,
          previousPosition,
          nickname,
          score,
          streaks,
        }) => ({
          position,
          previousPosition,
          nickname,
          avatar: resolveGameAvatarSnapshot(
            avatar ??
              game.participants.find(
                (participant) => participant.participantId === playerId,
              )?.avatar,
          ),
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
      ({ playerId, avatar, position, previousPosition, nickname, score }) => ({
        position,
        previousPosition,
        nickname,
        avatar: resolveGameAvatarSnapshot(
          avatar ??
            game.participants.find(
              (participant) => participant.participantId === playerId,
            )?.avatar,
        ),
        score,
      }),
    ),
    pagination: buildPaginationEventFromGameDocument(game),
  }
}
