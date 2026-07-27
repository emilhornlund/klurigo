import { GameMode, GameParticipantType } from '@klurigo/common'

import { GameDocument } from '../../../game-core/repositories/models/schemas'
import { isParticipantPlayer } from '../../../game-core/utils'
import { isLobbyTask } from '../../../game-task/utils/task-type-guards'

/**
 * Creates and appends a new `PLAYER` participant to the given game document.
 *
 * Initializes player state fields (`rank`, `worstRank`, `totalScore`, streak and response tracking)
 * and sets `created`/`updated` timestamps.
 *
 * Special rules:
 * - In Lobby, the initial rank is `0`.
 * - When joining after Lobby, the rank is set to the next rank after the highest existing player rank.
 * - In ZeroToOneHundred mode, when joining after Lobby, the initial total score is the current average
 *   total score of existing players (to avoid late-joiners starting at a disadvantage).
 *
 * @param game - The game document to mutate.
 * @param participantId - The unique participant identifier to assign to the new player.
 * @param nickname - The nickname to assign to the new player.
 * @returns The same game document instance with the new player participant appended.
 */
export function addPlayerParticipantToGame(
  game: GameDocument,
  participantId: string,
  nickname: string,
): GameDocument {
  const now = new Date()

  const rank = calculateRank(game)

  const totalScore = calculateTotalScore(game)

  game.participants.push({
    participantId,
    type: GameParticipantType.PLAYER,
    nickname,
    rank,
    worstRank: rank,
    totalScore,
    currentStreak: 0,
    totalResponseTime: 0,
    responseCount: 0,
    created: now,
    updated: now,
  })

  return game
}

/**
 * Calculates the initial rank for a newly joining player.
 *
 * - If the game is still in the Lobby task, the rank defaults to `0`.
 * - Otherwise, the rank is assigned as `max(existingPlayerRanks) + 1`.
 * - If there are no existing player ranks, returns `1` as the first non-lobby rank.
 *
 * @param game - The game document containing existing participants and current task state.
 * @returns The initial rank to assign to the newly joining player.
 */
function calculateRank(game: GameDocument): number {
  if (isLobbyTask(game)) {
    return 0 // default initial rank
  }

  const ranks = game.participants
    .filter(isParticipantPlayer)
    .map(({ rank }) => rank)

  if (ranks.length === 0) {
    return 1
  }

  return Math.max(...ranks) + 1
}

/**
 * Calculates the initial total score for a newly joining player.
 *
 * - In ZeroToOneHundred mode, when joining after Lobby, the initial total score is the
 *   average total score of existing players (late-join normalization).
 * - In all other cases, the initial total score defaults to `0`.
 *
 * @param game - The game document containing existing participants and the game mode.
 * @returns The initial total score to assign to the newly joining player.
 */
function calculateTotalScore(game: GameDocument): number {
  if (!isLobbyTask(game) && game.mode === GameMode.ZeroToOneHundred) {
    const sumOfTotalScores = game.participants
      .filter(isParticipantPlayer)
      .reduce((prev, current) => prev + current.totalScore, 0)

    const playerCount = game.participants.filter(isParticipantPlayer).length

    // average rounded score if joining late in a 0-100 game
    return Math.round(sumOfTotalScores / playerCount)
  }

  return 0 // default initial totalScore
}
