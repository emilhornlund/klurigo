import {
  GameBeginHostEvent,
  GameBeginPlayerEvent,
  GameEventType,
  GameLobbyHostEvent,
  GameLobbyPlayerEvent,
  resolveGameAvatarSnapshot,
} from '@klurigo/common'

import {
  Game,
  ParticipantPlayerWithBase,
  TaskType,
} from '../../game-core/repositories/models/schemas'
import { isParticipantHost, isParticipantPlayer } from '../../game-core/utils'

/**
 * Builds a lobby event for the host, including game and player details.
 *
 * @param game - The game document with a lobby task type.
 *
 * @returns A lobby event containing game PIN and player list.
 */
export function buildGameLobbyHostEvent(
  game: Game & { currentTask: { type: TaskType.Lobby } },
): GameLobbyHostEvent {
  const { randomizeQuestionOrder, randomizeAnswerOrder } = game.settings
  return {
    type: GameEventType.GameLobbyHost,
    host: {
      avatar: resolveGameAvatarSnapshot(
        game.participants.find(isParticipantHost)?.avatar,
      ),
    },
    game: {
      id: game._id,
      pin: game.pin,
      settings: {
        randomizeQuestionOrder,
        randomizeAnswerOrder,
      },
    },
    players: game.participants
      .filter(isParticipantPlayer)
      .map(({ participantId: id, nickname, avatar }) => ({
        id,
        nickname,
        avatar: resolveGameAvatarSnapshot(avatar),
      })),
  }
}

/**
 * Builds a lobby event for a player.
 *
 * @param game - The game document containing the quiz name and participants.
 * @param player - The player participant object for whom the event is being built.
 *
 * @returns A lobby event containing the quiz name, player's nickname, and current player nicknames.
 */
export function buildGameLobbyPlayerEvent(
  game: Game,
  player: ParticipantPlayerWithBase,
): GameLobbyPlayerEvent {
  const { nickname } = player
  return {
    type: GameEventType.GameLobbyPlayer,
    host: {
      avatar: resolveGameAvatarSnapshot(
        game.participants.find(isParticipantHost)?.avatar,
      ),
    },
    game: { name: game.name },
    player: { nickname, avatar: resolveGameAvatarSnapshot(player.avatar) },
    players: game.participants
      .filter(isParticipantPlayer)
      .map(({ nickname, avatar }) => ({
        nickname,
        avatar: resolveGameAvatarSnapshot(avatar),
      })),
  }
}

/**
 * Builds an event to signal the start of the game for the host.
 *
 * @returns  An event indicating the game has started for the host.
 */
export function buildGameBeginHostEvent(): GameBeginHostEvent {
  return { type: GameEventType.GameBeginHost }
}

/**
 * Builds an event to signal the start of the game for a player.
 *
 * @param player - The player participant object for whom the event is being built.
 *
 * @returns An event indicating the game has started for the player.
 */
export function buildGameBeginPlayerEvent(
  player: ParticipantPlayerWithBase,
): GameBeginPlayerEvent {
  const { nickname } = player
  return {
    type: GameEventType.GameBeginPlayer,
    player: { nickname, avatar: resolveGameAvatarSnapshot(player.avatar) },
  }
}
