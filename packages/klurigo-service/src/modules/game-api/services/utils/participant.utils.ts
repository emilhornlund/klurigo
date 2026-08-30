import { GameMode, GameParticipantType } from '@klurigo/common'

import {
  GameDocument,
  QuestionResultTaskItem,
} from '../../../game-core/repositories/models/schemas'
import { isParticipantPlayer } from '../../../game-core/utils'
import {
  compareClassicModeQuestionResultTaskItemByScoreThenTime,
  compareZeroToOneHundredModeQuestionResultTaskItemByScoreThenTime,
} from '../../../game-task/utils/task-sorting.utils'
import {
  isLeaderboardTask,
  isLobbyTask,
  isQuestionResultTask,
  isQuestionTask,
} from '../../../game-task/utils/task-type-guards'

type QuestionResultRankingData = Pick<
  QuestionResultTaskItem,
  'totalScore' | 'totalResponseTime'
>

/**
 * Creates and appends a new `PLAYER` participant to the given game document.
 *
 * Initializes player state fields (`rank`, `worstRank`, `totalScore`, streak and response tracking)
 * and sets `created`/`updated` timestamps.
 *
 * Special rules:
 * - In Lobby, the initial rank is `0`.
 * - When joining after Lobby, the rank is calculated from the current result or leaderboard snapshot when available.
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

  const totalScore = calculateTotalScore(game)

  const rank = calculateRank(game, totalScore)

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
 * - If a current result, leaderboard snapshot, or established question ranking
 *   exists, the rank is calculated from it and the player's initialized score.
 * - Otherwise, the rank is assigned as `max(existingPlayerRanks) + 1`.
 * - If there are no existing player ranks, returns `1` as the first non-lobby rank.
 *
 * @param game - The game document containing existing participants and current task state.
 * @returns The initial rank to assign to the newly joining player.
 */
function calculateRank(game: GameDocument, totalScore: number): number {
  if (isLobbyTask(game)) {
    return 0 // default initial rank
  }

  const currentRanking = getCurrentRanking(game)
  if (currentRanking) {
    const joiningPlayer: QuestionResultRankingData = {
      totalScore,
      totalResponseTime: 0,
    }

    const ranking = [...currentRanking, joiningPlayer].sort(
      compareRankingData(game),
    )

    // The joining player is appended last so exact ties retain insertion order.
    return ranking.indexOf(joiningPlayer) + 1
  }

  const ranks = game.participants
    .filter(isParticipantPlayer)
    .map(({ rank }) => rank)
    .filter((rank): rank is number => typeof rank === 'number' && rank > 0)

  if (ranks.length === 0) {
    return 1
  }

  return Math.max(...ranks) + 1
}

/**
 * Gets the latest score snapshot available for ranking a joining player.
 *
 * Participant ranks intentionally lag while a QuestionResult task is active,
 * so its result entries are authoritative until the task is finalized. The
 * same applies to the leaderboard snapshot while that task is active.
 */
function getCurrentRanking(
  game: GameDocument,
): QuestionResultRankingData[] | undefined {
  const players = game.participants.filter(isParticipantPlayer)

  if (isQuestionResultTask(game)) {
    return players.map((participant) => {
      const result = game.currentTask.results.find(
        ({ playerId }) => playerId === participant.participantId,
      )

      return result ?? participant
    })
  }

  if (
    isQuestionTask(game) &&
    players.every(({ rank }) => typeof rank === 'number' && rank > 0)
  ) {
    return players.map(({ totalScore, totalResponseTime }) => ({
      totalScore,
      totalResponseTime,
    }))
  }

  if (isLeaderboardTask(game)) {
    return players.map((participant) => {
      const leaderboardItem = game.currentTask.leaderboard.find(
        ({ playerId }) => playerId === participant.participantId,
      )

      return {
        totalScore: leaderboardItem?.score ?? participant.totalScore,
        totalResponseTime: participant.totalResponseTime,
      }
    })
  }

  return undefined
}

function compareRankingData(
  game: GameDocument,
): (lhs: QuestionResultRankingData, rhs: QuestionResultRankingData) => number {
  return game.mode === GameMode.Classic
    ? compareClassicModeQuestionResultTaskItemByScoreThenTime
    : compareZeroToOneHundredModeQuestionResultTaskItemByScoreThenTime
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
    const players = game.participants.filter(isParticipantPlayer)
    if (players.length === 0) {
      return 0
    }

    const sumOfTotalScores = players.reduce(
      (prev, current) => prev + current.totalScore,
      0,
    )

    // average rounded score if joining late in a 0-100 game
    return Math.round(sumOfTotalScores / players.length)
  }

  return 0 // default initial totalScore
}
