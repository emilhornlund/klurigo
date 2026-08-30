import { GameMode } from '@klurigo/common'
import { v4 as uuidv4 } from 'uuid'

import {
  GameDocument,
  LeaderboardTaskItem,
  LeaderboardTaskWithBase,
  TaskType,
} from '../../game-core/repositories/models/schemas'
import { isParticipantPlayer } from '../../game-core/utils'
import { IllegalTaskTypeException } from '../exceptions'

import {
  compareClassicModeQuestionResultTaskItemByScoreThenTime,
  compareZeroToOneHundredModeQuestionResultTaskItemByScoreThenTime,
} from './task-sorting.utils'
import { isQuestionResultTask } from './task-type-guards'

/**
 * Updates all player participants with their latest result data and generates
 * the leaderboard for the current question result task.
 *
 * The function:
 * - Reads each player's previous rank (if any).
 * - Applies the new score, streak, and position from the current task results.
 * - Sorts all eligible players by the current mode's score and response-time rules.
 * - Reassigns every participant's rank so late joiners cannot leave duplicate or stale positions.
 * - Produces leaderboard entries that include both current and previous positions.
 *
 * @param gameDocument - The current game document containing a QuestionResult task.
 *
 * @returns A list of leaderboard task items reflecting updated ranks, scores, and streaks.
 */
export function updateParticipantsAndBuildLeaderboard(
  gameDocument: GameDocument,
): LeaderboardTaskItem[] {
  if (!isQuestionResultTask(gameDocument)) {
    throw new IllegalTaskTypeException(
      gameDocument.currentTask.type,
      TaskType.QuestionResult,
    )
  }

  const rankedParticipants = gameDocument.participants
    .filter(isParticipantPlayer)
    .map((participant) => {
      const previousRank =
        typeof participant.rank === 'number' && participant.rank > 0
          ? participant.rank
          : undefined

      const resultEntry = gameDocument.currentTask.results.find(
        ({ playerId }) => playerId === participant.participantId,
      )

      if (resultEntry) {
        participant.rank = resultEntry.position
        if (participant.rank > participant.worstRank) {
          participant.worstRank = participant.rank
        }
        participant.totalScore = resultEntry.totalScore
        participant.currentStreak = resultEntry.streak
        participant.totalResponseTime = resultEntry.totalResponseTime
        participant.responseCount = resultEntry.responseCount
      }

      return {
        participant,
        previousRank,
        resultEntry,
      }
    })
    .filter(
      ({ participant, resultEntry }) =>
        resultEntry !== undefined ||
        (typeof participant.rank === 'number' && participant.rank > 0),
    )

  const compare =
    gameDocument.mode === GameMode.Classic
      ? compareClassicModeQuestionResultTaskItemByScoreThenTime
      : compareZeroToOneHundredModeQuestionResultTaskItemByScoreThenTime

  return rankedParticipants
    .sort((a, b) =>
      compare(a.resultEntry ?? a.participant, b.resultEntry ?? b.participant),
    )
    .map(({ participant, previousRank }, index) => {
      const position = index + 1
      participant.rank = position
      if (participant.rank > participant.worstRank) {
        participant.worstRank = participant.rank
      }

      return {
        playerId: participant.participantId,
        nickname: participant.nickname,
        position,
        previousPosition: previousRank,
        score: participant.totalScore,
        streaks: participant.currentStreak,
      }
    })
}

/**
 * Constructs a new leaderboard task based on the provided game document.
 *
 * @param gameDocument - The current game document.
 * @param leaderboard - A list of leaderboard task items reflecting updated ranks, scores, and streaks.
 *
 * @throws {IllegalTaskTypeException} If the current task type is not a question result.
 *
 * @returns A new leaderboard task object.
 */
export function buildLeaderboardTask(
  gameDocument: GameDocument,
  leaderboard: LeaderboardTaskItem[],
): LeaderboardTaskWithBase {
  if (!isQuestionResultTask(gameDocument)) {
    throw new IllegalTaskTypeException(
      gameDocument.currentTask.type,
      TaskType.QuestionResult,
    )
  }

  return {
    _id: uuidv4(),
    type: TaskType.Leaderboard,
    status: 'pending',
    questionIndex: gameDocument.nextQuestion - 1,
    leaderboard,
    created: new Date(),
  }
}
