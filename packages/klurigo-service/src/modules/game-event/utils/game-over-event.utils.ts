import {
  GameEventType,
  GameOverPlayerEvent,
  GameOverPlayerEventBehind,
} from '@klurigo/common'

import {
  GameDocument,
  ParticipantPlayerWithBase,
  TaskType,
} from '../../game-core/repositories/models/schemas'
import { isParticipantPlayer } from '../../game-core/utils'
import { GameEventMetaData } from '../models'

/**
 * Builds a `GameOverPlayerEvent` for the given player when the current task is a Podium task.
 *
 * All quiz and rating data must be pre-fetched and supplied via the `metadata` parameter.
 * When podium enrichment fields are absent from the metadata the event is still assembled
 * with safe defaults so that partial implementations remain functional.
 *
 * @param game - Game document whose current task is a Podium task.
 * @param player - Player participant to build the game-over event for.
 * @param metadata - Optional metadata carrying podium-specific quiz and rating enrichment.
 * @returns A fully assembled `GameOverPlayerEvent`.
 */
export function buildGameOverPlayerEvent(
  game: GameDocument & { currentTask: { type: TaskType.Podium } },
  player: ParticipantPlayerWithBase,
  metadata: Partial<GameEventMetaData> = {},
): GameOverPlayerEvent {
  const playerParticipants = game.participants.filter(isParticipantPlayer)
  const totalPlayers = playerParticipants.length

  const comebackRankGain = Math.max(0, player.worstRank - player.rank)

  const behind = buildBehind(playerParticipants, player)

  return {
    type: GameEventType.GameOverPlayer,
    game: {
      id: game._id,
      mode: game.mode,
    },
    quiz: {
      id: game.quiz._id,
      title: game.name,
    },
    player: {
      nickname: player.nickname,
      rank: player.rank,
      totalPlayers,
      score: player.totalScore,
      currentStreak: player.currentStreak,
      comebackRankGain,
      behind,
    },
    rating: {
      canRateQuiz: metadata.podiumCanRateQuiz ?? false,
      stars: metadata.podiumRatingStars,
      comment: metadata.podiumRatingComment,
    },
  }
}

/**
 * Finds the participant directly ahead of `player` in rank and returns the
 * point gap and that participant's nickname, or `null` when the player is
 * already in first place.
 *
 * @param playerParticipants - All player-type participants in the game.
 * @param player - The player whose "behind" info is being computed.
 * @returns The behind info object, or `null` when the player is rank 1.
 */
function buildBehind(
  playerParticipants: ParticipantPlayerWithBase[],
  player: ParticipantPlayerWithBase,
): GameOverPlayerEventBehind | null {
  if (player.rank <= 1) {
    return null
  }

  const aheadParticipant = playerParticipants.find(
    (p) => p.rank === player.rank - 1,
  )

  if (!aheadParticipant) {
    return null
  }

  return {
    points: Math.abs(aheadParticipant.totalScore - player.totalScore),
    nickname: aheadParticipant.nickname,
  }
}
