import type { IconDefinition } from '@fortawesome/fontawesome-common-types'
import {
  faCheckCircle,
  faFire,
  faMinusCircle,
  faStar,
  faStopwatch,
  faTimesCircle,
} from '@fortawesome/free-solid-svg-icons'
import type {
  GameResultClassicModePlayerMetricDto,
  GameResultClassicModeQuestionMetricDto,
  GameResultDto,
  GameResultZeroToOneHundredModePlayerMetricDto,
  GameResultZeroToOneHundredModeQuestionMetricDto,
} from '@klurigo/common'
import { GameMode } from '@klurigo/common'

import colors from '../../../../../styles/colors.tokens.module.scss'

import { formatRoundedSeconds } from './format.utils'

/**
 * Calculates the percentage of correct answers for a given metric.
 *
 * @param metric - The metric containing counts of correct, incorrect, and unanswered answers.
 * @returns A percentage (0–100) rounded up to the nearest integer.
 */
export function getCorrectPercentage(
  metric:
    | GameResultClassicModePlayerMetricDto
    | GameResultClassicModeQuestionMetricDto,
): number {
  const { correct, incorrect, unanswered } = metric
  const total = correct + incorrect + unanswered
  return total > 0 ? Math.ceil((correct / total) * 100) : 0
}

/**
 * Converts the average precision (0–1) into a percentage format.
 *
 * @param metric - The metric containing the average precision.
 * @returns A percentage (0–100) rounded up to the nearest integer.
 */
export function getAveragePrecision(
  metric:
    | GameResultZeroToOneHundredModePlayerMetricDto
    | GameResultZeroToOneHundredModeQuestionMetricDto,
): number {
  const { averagePrecision } = metric
  return Math.ceil(averagePrecision * 100)
}

/**
 * Returns a descriptive message based on the overall correctness percentage.
 *
 * @param percentage - The overall correctness percentage (0–100).
 * @returns A message describing the difficulty level of the quiz.
 */
export function getQuizDifficultyMessage(percentage: number): string {
  if (percentage < 20) {
    return 'This one was a brain-buster. Tougher than most could handle!'
  } else if (percentage < 40) {
    return 'Challenging quiz! Only a few managed to crack these questions.'
  } else if (percentage < 60) {
    return 'A balanced battle — tricky, but not impossible.'
  } else if (percentage < 80) {
    return 'Well played! Most players handled the challenge with confidence.'
  } else if (percentage < 95) {
    return 'Nice and smooth — players breezed through most questions!'
  } else {
    return "Too easy! Next time, let's turn up the difficulty."
  }
}

/**
 * Represents details about a metric to be displayed in the results UI.
 */
type MetricDetails = {
  title: string
  value: string | number
  icon?: IconDefinition
  iconColor?: string
}

/**
 * Builds an array of metric details for a player's performance, customized by game mode.
 *
 * @param mode - The game mode (e.g., Classic, ZeroToOneHundred).
 * @param metric - The player metric object with performance data.
 * @returns An array of metric details for display in the player section.
 */
export function buildPlayerSectionMetricDetails(
  mode: GameMode,
  metric: GameResultDto['playerMetrics'][0],
): MetricDetails[] {
  const common: MetricDetails[] = [
    {
      title: 'Unanswered',
      value: metric.unanswered,
      icon: faMinusCircle,
      iconColor: colors.colorActionDefault,
    },
    {
      title: 'Average response time',
      value: formatRoundedSeconds(metric.averageResponseTime),
      icon: faStopwatch,
      iconColor: colors.colorStatusInfo,
    },
  ]
  if (mode === GameMode.Classic) {
    const classicModePlayerMetric =
      metric as GameResultClassicModePlayerMetricDto
    return [
      {
        title: 'Correct',
        value: classicModePlayerMetric.correct,
        icon: faCheckCircle,
        iconColor: colors.colorStatusSuccess,
      },
      {
        title: 'Incorrect',
        value: classicModePlayerMetric.incorrect,
        icon: faTimesCircle,
        iconColor: colors.colorStatusDanger,
      },
      ...common,
      {
        title: 'Longest correct streak',
        value: classicModePlayerMetric.longestCorrectStreak,
        icon: faFire,
        iconColor: colors.colorStatusWarning,
      },
      {
        title: 'Score',
        value: metric.score,
        icon: faStar,
        iconColor: colors.colorRatingDefault,
      },
    ]
  }
  return [
    ...common,
    {
      title: 'Score',
      value: metric.score,
      icon: faStar,
      iconColor: colors.colorRatingDefault,
    },
  ]
}

/**
 * Builds an array of metric details for a question's performance, customized by game mode.
 *
 * @param mode - The game mode (e.g., Classic, ZeroToOneHundred).
 * @param metric - The question metric object with performance data.
 * @returns An array of metric details for display in the question section.
 */
export function buildQuestionSectionMetricDetails(
  mode: GameMode,
  metric: GameResultDto['questionMetrics'][0],
): MetricDetails[] {
  const common: MetricDetails[] = [
    {
      title: 'Unanswered',
      value: metric.unanswered,
      icon: faMinusCircle,
      iconColor: colors.colorActionDefault,
    },
    {
      title: 'Average response time',
      value: formatRoundedSeconds(metric.averageResponseTime),
      icon: faStopwatch,
      iconColor: colors.colorStatusInfo,
    },
  ]
  if (mode === GameMode.Classic) {
    const classicModePlayerMetric =
      metric as GameResultClassicModeQuestionMetricDto
    return [
      {
        title: 'Correct',
        value: classicModePlayerMetric.correct,
        icon: faCheckCircle,
        iconColor: colors.colorStatusSuccess,
      },
      {
        title: 'Incorrect',
        value: classicModePlayerMetric.incorrect,
        icon: faTimesCircle,
        iconColor: colors.colorStatusDanger,
      },
      ...common,
    ]
  }
  return common
}
