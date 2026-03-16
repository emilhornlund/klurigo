import type { ConfettiIntensity } from './Confetti'

/**
 * Represents the intensity of a celebration effect.
 *
 * The levels are ordered from lowest to highest:
 * `none` < `normal` < `major` < `epic`.
 */
export type CelebrationLevel = ConfettiIntensity | 'none'

/**
 * Numeric ordering for celebration levels.
 *
 * This is used to compare two levels and determine which one represents
 * the stronger celebration effect.
 */
const LEVEL_ORDER: Record<CelebrationLevel, number> = {
  none: 0,
  normal: 1,
  major: 2,
  epic: 3,
}

/**
 * Determines the celebration level based solely on a player's rank.
 *
 * Rank-based celebrations represent general achievement in the scoreboard.
 *
 * Rules:
 * - Rank 1 → `epic`
 * - Rank 2–3 → `major`
 * - Rank 4–10 → `normal`
 * - Rank >10 → `none`
 *
 * @param rank - The player's position in the ranking.
 * @returns The celebration level derived from the rank.
 */
const getRankLevel = (rank: number): CelebrationLevel => {
  if (rank === 1) return 'epic'
  if (rank <= 3) return 'major'
  if (rank <= 10) return 'normal'
  return 'none'
}

/**
 * Determines the celebration level based on a player's answer streak.
 *
 * Streak-based celebrations represent momentum from consecutive correct
 * answers during gameplay.
 *
 * Rules:
 * - Streak ≥ 7 → `epic`
 * - Streak ≥ 5 → `major`
 * - Streak ≥ 3 → `normal`
 * - Streak <3 → `none`
 *
 * @param streak - The number of consecutive correct answers.
 * @returns The celebration level derived from the streak.
 */
const getStreakLevel = (streak: number): CelebrationLevel => {
  if (streak >= 7) return 'epic'
  if (streak >= 5) return 'major'
  if (streak >= 3) return 'normal'
  return 'none'
}

/**
 * Determines the celebration level for a player based on their rank,
 * optional answer streak, and whether the latest answer was correct.
 *
 * The function evaluates two potential sources of celebration:
 *
 * 1. **Rank-based celebration** – derived from the player's position.
 * 2. **Streak-based celebration** – derived from consecutive correct answers.
 *
 * The strongest of the two levels is returned.
 *
 * If `correct` is explicitly `false`, no celebration is triggered and
 * `none` is returned regardless of rank or streak.
 *
 * @param rank - The player's position in the ranking.
 * @param streak - Optional number of consecutive correct answers.
 * @param correct - Optional flag indicating whether the latest answer was correct.
 * @returns The strongest applicable celebration level.
 */
export const getCelebrationLevel = (
  rank: number,
  streak?: number,
  correct?: boolean,
): CelebrationLevel => {
  if (correct === false) return 'none'

  const rankLevel = getRankLevel(rank)
  const streakLevel = streak !== undefined ? getStreakLevel(streak) : 'none'

  return LEVEL_ORDER[streakLevel] > LEVEL_ORDER[rankLevel]
    ? streakLevel
    : rankLevel
}
