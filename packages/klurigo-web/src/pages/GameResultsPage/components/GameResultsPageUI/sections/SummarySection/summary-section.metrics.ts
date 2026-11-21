import {
  GameMode,
  type GameResultClassicModePlayerMetricDto,
  type GameResultClassicModeQuestionMetricDto,
  type GameResultDto,
  type GameResultParticipantDto,
  type GameResultPlayerMetricDto,
  type GameResultZeroToOneHundredModePlayerMetricDto,
} from '@klurigo/common'

/**
 * Represents a computed leaderboard-style metric.
 *
 * The metric value represents the winning score for the metric, and `players`
 * contains all participants that share that value (ties included).
 */
export type Metric = { value: number; players: GameResultParticipantDto[] }

type AwardMetricArgs = Pick<
  GameResultDto,
  'mode' | 'playerMetrics' | 'numberOfQuestions'
>

/** The toughest eligible question, with its original 1-based number and tie status. */
export type ToughestQuestionMetric = {
  question: GameResultClassicModeQuestionMetricDto
  number: number
  tied: boolean
}

/**
 * Selects the Classic question with the lowest unrounded correctness ratio.
 * Unanswered attempts count toward the ratio, but each eligible question must
 * have at least one submission. Ties keep the earliest question in the list.
 *
 * @param questionMetrics - Classic question metrics in Questions-tab order.
 * @returns The toughest question, or `null` if fewer than two qualify or all are perfect.
 */
export const getToughestQuestionMetric = (
  questionMetrics: readonly GameResultClassicModeQuestionMetricDto[],
): ToughestQuestionMetric | null => {
  let eligibleCount = 0
  let lowestRatio = Infinity
  let toughest: ToughestQuestionMetric | null = null

  for (const [index, question] of questionMetrics.entries()) {
    const { correct, incorrect, unanswered } = question
    const submitted = correct + incorrect
    const total = submitted + unanswered
    if (!(submitted > 0) || !Number.isFinite(total)) continue

    eligibleCount++
    const ratio = correct / total
    if (ratio < lowestRatio) {
      lowestRatio = ratio
      toughest = { question, number: index + 1, tied: false }
    } else if (toughest && ratio === lowestRatio) {
      toughest.tied = true
    }
  }

  return eligibleCount >= 2 && lowestRatio < 1 ? toughest : null
}

/**
 * Selects the best finite value and all tied players, sorted by nickname.
 *
 * @param playerMetrics - Final performance metrics for all players.
 * @param getValue - Returns a raw candidate value, or `undefined` for an ineligible player.
 * @param order - Whether the highest or lowest value wins.
 * @returns The winning value and players, or `null` if no player qualifies.
 */
const getWinningMetric = <T extends GameResultPlayerMetricDto>(
  playerMetrics: T[],
  getValue: (metric: T) => number | undefined,
  order: 'highest' | 'lowest' = 'highest',
): Metric | null => {
  let winner: Metric | null = null
  for (const metric of playerMetrics) {
    const value = getValue(metric)
    if (
      value === undefined ||
      !Number.isFinite(value) ||
      typeof metric.player?.nickname !== 'string'
    ) {
      continue
    }

    if (
      !winner ||
      (order === 'highest' ? value > winner.value : value < winner.value)
    ) {
      winner = { value, players: [metric.player] }
    } else if (value === winner.value) {
      winner.players.push(metric.player)
    }
  }

  winner?.players.sort((a, b) => a.nickname.localeCompare(b.nickname))
  return winner
}

/**
 * Determines whether a player submitted an answer using the mode's recorded counts.
 *
 * @param mode - The game mode of the completed game.
 * @param metric - The player's final performance metrics.
 * @param numberOfQuestions - Total number of questions in the game.
 * @returns Whether the recorded answer count is positive.
 */
const hasSubmittedAnswer = (
  mode: GameMode,
  metric: GameResultPlayerMetricDto,
  numberOfQuestions: number,
): boolean => {
  if (mode === GameMode.Classic) {
    const { correct, incorrect } =
      metric as GameResultClassicModePlayerMetricDto
    return (
      Number.isFinite(correct) &&
      Number.isFinite(incorrect) &&
      correct + incorrect > 0
    )
  }

  return (
    Number.isFinite(numberOfQuestions) &&
    Number.isFinite(metric.unanswered) &&
    numberOfQuestions - metric.unanswered > 0
  )
}

/**
 * Computes the fastest overall player metric.
 *
 * Uses the recorded average response time and considers only players who
 * submitted at least one answer. A recorded time of zero can qualify.
 *
 * @param args - Metric calculation arguments.
 * @param args.mode - The game mode of the completed game.
 * @param args.playerMetrics - Final performance metrics for all players.
 * @param args.numberOfQuestions - Total number of questions in the game.
 * @returns The fastest overall player metric, or `null` if no player qualifies.
 */
export const getFastestOverallPlayerMetric = (
  args: AwardMetricArgs,
): Metric | null =>
  getWinningMetric<GameResultPlayerMetricDto>(
    args.playerMetrics,
    (metric) =>
      hasSubmittedAnswer(args.mode, metric, args.numberOfQuestions) &&
      metric.averageResponseTime >= 0
        ? metric.averageResponseTime
        : undefined,
    'lowest',
  )

/**
 * Computes the longest correct answer streak metric for Classic games.
 *
 * Counts streaks of at least two consecutive correct answers.
 *
 * @param playerMetrics - Final Classic performance metrics for all players.
 * @returns The longest correct streak metric, or `null` if no player qualifies.
 */
export const getLongestCorrectStreakMetric = (
  playerMetrics: GameResultClassicModePlayerMetricDto[],
): Metric | null =>
  getWinningMetric(playerMetrics, ({ longestCorrectStreak }) =>
    longestCorrectStreak >= 2 ? longestCorrectStreak : undefined,
  )

/**
 * Computes the most accurate player metric for classic mode games.
 *
 * Accuracy is calculated as the ratio of correctly answered questions to the
 * total number of questions in the game. Only players who submitted an answer
 * and have positive accuracy qualify. Winners are selected before rounding.
 *
 * @param args - Metric calculation arguments.
 * @param args.mode - The game mode of the completed game.
 * @param args.playerMetrics - Final performance metrics for all players.
 * @param args.numberOfQuestions - Total number of questions in the game.
 * @returns The most accurate player metric, or `null` if no player qualifies.
 */
export const getMostAccuratePlayerMetric = ({
  mode,
  playerMetrics,
  numberOfQuestions,
}: AwardMetricArgs): Metric | null => {
  if (
    mode !== GameMode.Classic ||
    !Number.isFinite(numberOfQuestions) ||
    numberOfQuestions <= 0
  ) {
    return null
  }

  const winner = getWinningMetric(
    playerMetrics as GameResultClassicModePlayerMetricDto[],
    (metric) =>
      hasSubmittedAnswer(mode, metric, numberOfQuestions) && metric.correct > 0
        ? metric.correct / numberOfQuestions
        : undefined,
  )

  return winner && { ...winner, value: Math.round(winner.value * 100) }
}

/**
 * Computes the precision champion metric for zero-to-one-hundred mode games.
 *
 * Only players who submitted an answer and have positive average precision
 * qualify. Winners are selected before rounding.
 *
 * @param args - Metric calculation arguments.
 * @param args.mode - The game mode of the completed game.
 * @param args.playerMetrics - Final performance metrics for all players.
 * @param args.numberOfQuestions - Total number of questions in the game.
 * @returns The precision champion metric, or `null` if no player qualifies.
 */
export const getPrecisionChampionMetric = ({
  mode,
  playerMetrics,
  numberOfQuestions,
}: AwardMetricArgs): Metric | null => {
  if (mode !== GameMode.ZeroToOneHundred) {
    return null
  }

  const winner = getWinningMetric(
    playerMetrics as GameResultZeroToOneHundredModePlayerMetricDto[],
    (metric) =>
      hasSubmittedAnswer(mode, metric, numberOfQuestions) &&
      metric.averagePrecision > 0
        ? metric.averagePrecision
        : undefined,
  )

  return winner && { ...winner, value: Math.round(winner.value * 100) }
}

/**
 * Builds the "best comeback" metric based on `comebackRankGain`.
 *
 * Selects the highest positive `comebackRankGain` value across all players.
 *
 * @param playerMetrics - Final performance metrics for all players.
 * @returns The metric value and tied players, or `null` when no meaningful comeback exists.
 */
export const getComebackRankGainMetric = (
  playerMetrics: GameResultDto['playerMetrics'],
): Metric | null =>
  getWinningMetric<GameResultPlayerMetricDto>(
    playerMetrics,
    ({ comebackRankGain }) =>
      comebackRankGain > 0 ? comebackRankGain : undefined,
  )
