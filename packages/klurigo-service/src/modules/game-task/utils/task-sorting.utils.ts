import { QuestionResultTaskItem } from '../../game-core/repositories/models/schemas'

type QuestionResultRankingData = Pick<
  QuestionResultTaskItem,
  'totalScore' | 'totalResponseTime'
>

type ParticipationRankingData = QuestionResultRankingData &
  Pick<QuestionResultTaskItem, 'responseCount'>

/**
 * Compares two numeric values for sorting in descending order.
 *
 * A higher value is considered better and will be ordered before a lower value.
 *
 * @param lhs - The left-hand numeric value.
 * @param rhs - The right-hand numeric value.
 * @returns
 * - A positive number if `lhs` should be ordered after `rhs`
 * - A negative number if `lhs` should be ordered before `rhs`
 * - `0` if both values are equal
 */
function compareNumbersDesc(lhs: number, rhs: number): number {
  if (lhs < rhs) return 1
  if (lhs > rhs) return -1
  return 0
}

/**
 * Compares two numeric values for sorting in ascending order.
 *
 * A lower value is considered better and will be ordered before a higher value.
 *
 * @param lhs - The left-hand numeric value.
 * @param rhs - The right-hand numeric value.
 * @returns
 * - A positive number if `lhs` should be ordered after `rhs`
 * - A negative number if `lhs` should be ordered before `rhs`
 * - `0` if both values are equal
 */
function compareNumbersAsc(lhs: number, rhs: number): number {
  if (lhs < rhs) return -1
  if (lhs > rhs) return 1
  return 0
}

/**
 * Compares two question result task items for ranking in Classic mode.
 *
 * Sorting rules:
 * 1. Players are ranked by `totalScore` in descending order (higher score ranks higher).
 * 2. If multiple players have the same score, they are ranked by `totalResponseTime`
 *    in ascending order (faster total response time ranks higher).
 *
 * This ensures a fair and deterministic ranking when scores are tied.
 *
 * @param lhs - The first question result task item to compare.
 * @param rhs - The second question result task item to compare.
 * @returns
 * - A negative number if `lhs` should rank higher than `rhs`
 * - A positive number if `lhs` should rank lower than `rhs`
 * - `0` if both items are considered equal for ranking
 */
export function compareClassicModeQuestionResultTaskItemByScoreThenTime(
  lhs: QuestionResultRankingData,
  rhs: QuestionResultRankingData,
): number {
  const scoreCmp = compareNumbersDesc(lhs.totalScore, rhs.totalScore)
  if (scoreCmp !== 0) {
    return scoreCmp
  }

  return compareNumbersAsc(lhs.totalResponseTime, rhs.totalResponseTime)
}

/**
 * Compares Classic results while keeping players with more completed rounds
 * ahead of late joiners when their scores are tied.
 *
 * Participation is only consulted for equal scores. The existing response-time
 * tie-breaker remains the final rule, so this does not alter score calculation.
 */
export function compareClassicModeQuestionResultTaskItemByScoreThenParticipationThenTime(
  lhs: ParticipationRankingData,
  rhs: ParticipationRankingData,
): number {
  const scoreCmp = compareNumbersDesc(lhs.totalScore, rhs.totalScore)
  if (scoreCmp !== 0) {
    return scoreCmp
  }

  const responseCountCmp = compareNumbersDesc(
    lhs.responseCount ?? 0,
    rhs.responseCount ?? 0,
  )
  if (responseCountCmp !== 0) {
    return responseCountCmp
  }

  return compareNumbersAsc(lhs.totalResponseTime, rhs.totalResponseTime)
}

/**
 * Compares two question result task items for ranking in ZeroToOneHundred mode.
 *
 * Sorting rules:
 * 1. Players are ranked by `totalScore` in ascending order (lower score ranks higher).
 * 2. If multiple players have the same score, they are ranked by `totalResponseTime`
 *    in ascending order (faster total response time ranks higher).
 *
 * This preserves the existing ZeroToOneHundred scoring semantics while introducing
 * response-time–based tie-breaking for improved fairness.
 *
 * @param lhs - The first question result task item to compare.
 * @param rhs - The second question result task item to compare.
 * @returns
 * - A negative number if `lhs` should rank higher than `rhs`
 * - A positive number if `lhs` should rank lower than `rhs`
 * - `0` if both items are considered equal for ranking
 */
export function compareZeroToOneHundredModeQuestionResultTaskItemByScoreThenTime(
  lhs: QuestionResultRankingData,
  rhs: QuestionResultRankingData,
): number {
  const scoreCmp = compareNumbersAsc(lhs.totalScore, rhs.totalScore)
  if (scoreCmp !== 0) {
    return scoreCmp
  }

  return compareNumbersAsc(lhs.totalResponseTime, rhs.totalResponseTime)
}

/**
 * Compares ZeroToOneHundred results while keeping players with more completed
 * rounds ahead of late joiners when their penalties are tied.
 */
export function compareZeroToOneHundredModeQuestionResultTaskItemByScoreThenParticipationThenTime(
  lhs: ParticipationRankingData,
  rhs: ParticipationRankingData,
): number {
  const scoreCmp = compareNumbersAsc(lhs.totalScore, rhs.totalScore)
  if (scoreCmp !== 0) {
    return scoreCmp
  }

  const responseCountCmp = compareNumbersDesc(
    lhs.responseCount ?? 0,
    rhs.responseCount ?? 0,
  )
  if (responseCountCmp !== 0) {
    return responseCountCmp
  }

  return compareNumbersAsc(lhs.totalResponseTime, rhs.totalResponseTime)
}
