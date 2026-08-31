import {
  GameMode,
  type GameResultClassicModePlayerMetricDto,
  type GameResultDto,
  type GameResultParticipantDto,
  type GameResultZeroToOneHundredModePlayerMetricDto,
} from '@klurigo/common'

/**
 * Represents a computed leaderboard-style metric.
 *
 * The metric value represents the winning score for the metric, and `players`
 * contains all participants that share that value (ties included).
 */
export type Metric = { value: number; players: GameResultParticipantDto[] }

/**
 * Sorts participants alphabetically by nickname.
 *
 * Returns a new array and does not mutate the input.
 *
 * @param players - The participants to sort.
 * @returns The participants sorted by nickname.
 */
const sortPlayersByNickname = (
  players: GameResultParticipantDto[],
): GameResultParticipantDto[] => {
  return [...players].sort((a, b) => a.nickname.localeCompare(b.nickname))
}

/**
 * Computes the fastest overall player metric.
 *
 * Determines the lowest average response time across all players and returns
 * all players that share that value.
 *
 * @param playerMetrics - Final performance metrics for all players.
 * @returns The fastest overall player metric, or `null` if no players exist.
 */
export const getFastestOverallPlayerMetric = (
  playerMetrics: GameResultDto['playerMetrics'],
): Metric | null => {
  if (playerMetrics.length === 0) {
    return null
  }

  const value = Math.min(...playerMetrics.map((m) => m.averageResponseTime))

  const players = sortPlayersByNickname(
    playerMetrics
      .filter((m) => m.averageResponseTime === value)
      .map((m) => m.player),
  )

  return { value, players }
}

/**
 * Computes the longest correct answer streak metric.
 *
 * Determines the highest number of consecutive correct answers achieved by
 * any player and returns all players that share that streak.
 *
 * @param playerMetrics - Final performance metrics for all players.
 * @returns The longest correct streak metric, or `null` if no players exist.
 */
export const getLongestCorrectStreakMetric = (
  playerMetrics: GameResultClassicModePlayerMetricDto[],
): Metric | null => {
  if (playerMetrics.length === 0) {
    return null
  }

  const value = Math.max(...playerMetrics.map((m) => m.longestCorrectStreak))

  const players = sortPlayersByNickname(
    playerMetrics
      .filter((m) => m.longestCorrectStreak === value)
      .map((m) => m.player),
  )

  return { value, players }
}

/**
 * Computes the most accurate player metric for classic mode games.
 *
 * Accuracy is calculated as the ratio of correctly answered questions to the
 * total number of questions in the game. All players with the highest accuracy
 * are returned.
 *
 * @param args - Metric calculation arguments.
 * @param args.mode - The game mode of the completed game.
 * @param args.playerMetrics - Final performance metrics for all players.
 * @param args.numberOfQuestions - Total number of questions in the game.
 * @returns The most accurate player metric, or `null` if not applicable.
 */
export const getMostAccuratePlayerMetric = (args: {
  mode: GameMode
  playerMetrics: GameResultDto['playerMetrics']
  numberOfQuestions: number
}): Metric | null => {
  const { mode, playerMetrics, numberOfQuestions } = args

  if (mode !== GameMode.Classic) {
    return null
  }

  if (playerMetrics.length === 0 || numberOfQuestions <= 0) {
    return null
  }

  const accuracies = playerMetrics.map((metric) => ({
    player: metric.player,
    value:
      (metric as GameResultClassicModePlayerMetricDto).correct /
      numberOfQuestions,
  }))

  const bestAccuracy = Math.max(...accuracies.map((x) => x.value))

  const players = sortPlayersByNickname(
    accuracies.filter((x) => x.value === bestAccuracy).map((x) => x.player),
  )

  return { value: Math.round(bestAccuracy * 100), players }
}

/**
 * Computes the precision champion metric for zero-to-one-hundred mode games.
 *
 * Precision is based on each player's average precision score, where higher
 * values indicate closer answers to the correct value.
 *
 * @param args - Metric calculation arguments.
 * @param args.mode - The game mode of the completed game.
 * @param args.playerMetrics - Final performance metrics for all players.
 * @returns The precision champion metric, or `null` if not applicable.
 */
export const getPrecisionChampionMetric = (args: {
  mode: GameMode
  playerMetrics: GameResultDto['playerMetrics']
}): Metric | null => {
  const { mode, playerMetrics } = args

  if (mode !== GameMode.ZeroToOneHundred) {
    return null
  }

  if (playerMetrics.length === 0) {
    return null
  }

  const precisions = playerMetrics.map((metric) => ({
    player: metric.player,
    value: (metric as GameResultZeroToOneHundredModePlayerMetricDto)
      .averagePrecision,
  }))

  const bestPrecision = Math.max(...precisions.map((x) => x.value))

  const players = sortPlayersByNickname(
    precisions.filter((x) => x.value === bestPrecision).map((x) => x.player),
  )

  return { value: Math.round(bestPrecision * 100), players }
}

/**
 * Builds the "best comeback" metric based on `comebackRankGain`.
 *
 * Selects the highest `comebackRankGain` value across all players and returns
 * the value along with the players who achieved it (ties included).
 *
 * @param playerMetrics - Final performance metrics for all players.
 * @returns The metric value and tied players, or `null` when no meaningful comeback exists.
 */
export const getComebackRankGainMetric = (
  playerMetrics: GameResultDto['playerMetrics'],
): Metric | null => {
  if (playerMetrics.length === 0) {
    return null
  }

  const value = Math.max(...playerMetrics.map((m) => m.comebackRankGain))

  const players = sortPlayersByNickname(
    playerMetrics
      .filter((m) => m.comebackRankGain === value)
      .map((m) => m.player),
  )

  return { value, players }
}
