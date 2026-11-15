import {
  GameEventType,
  GamePodiumHostEvent,
  resolveGameAvatarSnapshot,
} from '@klurigo/common'

import { Game, TaskType } from '../../game-core/repositories/models/schemas'

/**
 * Builds a podium event for the host.
 *
 * @param game - The game document containing the current podium task.
 */
export function buildGamePodiumHostEvent(
  game: Game & { currentTask: { type: TaskType.Podium } },
): GamePodiumHostEvent {
  return {
    type: GameEventType.GamePodiumHost,
    game: {
      name: game.name,
    },
    leaderboard: game.currentTask.leaderboard
      .slice(0, 5)
      .map(({ playerId, avatar, position, nickname, score }) => ({
        position,
        nickname,
        avatar: resolveGameAvatarSnapshot(
          avatar ??
            game.participants.find(
              (participant) => participant.participantId === playerId,
            )?.avatar,
        ),
        score,
      })),
  }
}
