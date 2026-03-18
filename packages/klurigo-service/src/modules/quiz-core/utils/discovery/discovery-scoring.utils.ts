import {
  QuestionType,
  QUIZ_DESCRIPTION_MAX_LENGTH,
  QUIZ_QUESTION_MAX,
} from '@klurigo/common'

import { Quiz } from '../../repositories/models/schemas'

// ---------------------------------------------------------------------------
// Trending score constants
// ---------------------------------------------------------------------------

/**
 * Multiplier applied to `recentPlayCount` when computing the trending score.
 *
 * Increasing this value gives more weight to recent plays, raising scores
 * faster relative to `TRENDING_SCALE_MAX`.
 *
 * Default: `1`
 */
export const TRENDING_PLAY_WEIGHT = 1

/**
 * Number of days defining the "recent" activity window used to gather
 * `recentPlayCount` for trending score computation.
 *
 * The aggregation over this window is performed by the discovery snapshot
 * computation service; this constant is exported so that the compute service
 * and unit tests share the same value.
 *
 * Default: `7`
 */
export const TRENDING_WINDOW_DAYS = 30

/**
 * Maximum weighted recent-play value used to normalise the trending score
 * to the [0, 100] range.
 *
 * A quiz whose `recentPlayCount * TRENDING_PLAY_WEIGHT` equals or exceeds
 * this value receives the maximum trending score of 100.
 *
 * Default: `10000`
 */
export const TRENDING_SCALE_MAX = 10000

// ---------------------------------------------------------------------------
// Quality score scale constants
// ---------------------------------------------------------------------------

/**
 * Maximum total-play count used to normalise the play-engagement sub-score
 * to its weight ceiling via log-scaling.
 *
 * Formula: `min(weight, weight * log10(count + 1) / log10(PLAY_SCALE_MAX))`
 *
 * Default: `10000`
 */
export const PLAY_SCALE_MAX = 10000

/**
 * Maximum unique-player count used to normalise the unique-player sub-score
 * to its weight ceiling via log-scaling.
 *
 * Applies the same log-scaling pattern as `PLAY_SCALE_MAX` but uses
 * `gameplaySummary.totalPlayerCount`.
 *
 * Default: `10000`
 */
export const PLAYER_SCALE_MAX = 10000

// ---------------------------------------------------------------------------
// Quality score weight constants
// ---------------------------------------------------------------------------

/**
 * Weight of the cover-image sub-score within the overall quality score.
 *
 * A quiz with a non-empty `imageCoverURL` receives the full weight; a quiz
 * without a cover receives 0.
 *
 * Default: `10`
 */
export const QUALITY_WEIGHT_COVER = 10

/**
 * Weight of the description-quality sub-score within the overall quality score.
 *
 * The sub-score is bucketed by description length:
 * - 20–49 chars → 4
 * - 50–99 chars → 8
 * - 100–199 chars → 12
 * - 200+ chars → 15
 *
 * Default: `15`
 */
export const QUALITY_WEIGHT_DESCRIPTION = 15

/**
 * Weight of the question-count sub-score within the overall quality score.
 *
 * The sub-score is bucketed by number of questions:
 * - 10–14 → 4
 * - 15–19 → 6
 * - 20–29 → 8
 * - 30+ → 10
 *
 * Default: `10`
 */
export const QUALITY_WEIGHT_QUESTIONS = 10

/**
 * Weight of the play-engagement sub-score within the overall quality score.
 *
 * Derived from `gameplaySummary.count` (total completed plays) using
 * log-scaling against `PLAY_SCALE_MAX`.
 *
 * Default: `25`
 */
export const QUALITY_WEIGHT_PLAYS = 25

/**
 * Weight of the unique-player sub-score within the overall quality score.
 *
 * Derived from `gameplaySummary.totalPlayerCount` using the same log-scaling
 * pattern as the play-engagement sub-score.
 *
 * Default: `10`
 */
export const QUALITY_WEIGHT_PLAYERS = 10

/**
 * Weight of the Bayesian-adjusted rating sub-score within the overall quality
 * score.
 *
 * The raw Bayesian rating (0–5) is mapped to [0, `QUALITY_WEIGHT_RATING`] via
 * `bayesianRating * (QUALITY_WEIGHT_RATING / 5)`.
 *
 * Default: `10`
 */
export const QUALITY_WEIGHT_RATING = 10

/**
 * Weight of the question media density sub-score within the overall quality
 * score.
 *
 * The sub-score is the proportion of questions that have an associated media
 * attachment (any `MediaType`: image, audio, or video), scaled to this weight:
 * `(questionsWithMedia / totalQuestions) * QUALITY_WEIGHT_QUESTION_MEDIA`.
 *
 * `Pin` questions are treated as always having media because they carry a
 * required `imageURL` field instead of the standard `media` subdocument.
 *
 * A quiz where every question has media receives the full weight; a quiz with
 * no media on any question receives 0.
 *
 * Default: `10`
 */
export const QUALITY_WEIGHT_QUESTION_MEDIA = 10

/**
 * Weight of the question info density sub-score within the overall quality
 * score.
 *
 * The sub-score is the proportion of questions that have a non-blank `info`
 * property, scaled to this weight:
 * `(questionsWithInfo / totalQuestions) * QUALITY_WEIGHT_QUESTION_INFO`.
 *
 * A quiz where every question has info receives the full weight; a quiz with
 * no question info receives 0.
 *
 * Default: `10`
 */
export const QUALITY_WEIGHT_QUESTION_INFO = 10

/**
 * Weight of the question type variety sub-score within the overall quality
 * score.
 *
 * The sub-score is the proportion of distinct question types used, scaled to
 * this weight:
 * `(uniqueTypeCount / TOTAL_QUESTION_TYPES) * QUALITY_WEIGHT_QUESTION_VARIETY`.
 *
 * A quiz that uses only one question type receives a low score; a quiz that
 * uses all available types receives the full weight.
 *
 * Default: `10`
 */
export const QUALITY_WEIGHT_QUESTION_VARIETY = 10

/**
 * Total number of distinct question types supported by the platform.
 *
 * Used as the denominator when computing the question type variety sub-score.
 * Must be kept in sync with the `QuestionType` enum in `@klurigo/common`.
 *
 * Default: `6` (MultiChoice, Range, TrueFalse, TypeAnswer, Pin, Puzzle)
 */
export const TOTAL_QUESTION_TYPES = Object.keys(QuestionType).length

// ---------------------------------------------------------------------------
// Bayesian rating confidence threshold
// ---------------------------------------------------------------------------

/**
 * Confidence threshold for Bayesian-adjusted rating.
 *
 * A quiz needs at least this many ratings before its own average begins to
 * dominate the Bayesian result. With fewer ratings the global mean pulls the
 * score toward the platform average, preventing a single 5-star review from
 * outranking widely-rated quizzes.
 *
 * Default: `10`
 */
export const MIN_RATING_COUNT = 10

// ---------------------------------------------------------------------------
// RecentActivityStats type
// ---------------------------------------------------------------------------

/**
 * Precomputed activity statistics gathered by `DiscoveryComputeService` for a
 * single quiz within the recent trending window (`TRENDING_WINDOW_DAYS` days).
 *
 * Stats are provided to `computeTrendingScore` as explicit parameters rather
 * than read from global state, keeping the function deterministic and pure.
 *
 * Future enhancement: once the data model supports it, add
 * `recentUniquePlayerCount` and a corresponding `TRENDING_PLAYER_WEIGHT` to
 * give additional signal from distinct players in the window.
 */
export type RecentActivityStats = {
  /**
   * Number of completed plays recorded within the last `TRENDING_WINDOW_DAYS`
   * days.
   */
  readonly recentPlayCount: number
}

// ---------------------------------------------------------------------------
// Threshold-based quality scoring constants
// ---------------------------------------------------------------------------

/**
 * Represents a minimum input value and the score awarded when that threshold
 * is met or exceeded.
 */
type ScoreThreshold = {
  /**
   * Minimum value required for this threshold to apply.
   */
  readonly min: number

  /**
   * Score awarded when the input value is greater than or equal to `min`.
   */
  readonly score: number
}

/**
 * Description-length thresholds for the description-quality sub-score.
 *
 * Thresholds are derived from `QUIZ_DESCRIPTION_MAX_LENGTH` so discovery
 * scoring stays aligned with the quiz validation limits used elsewhere in
 * the platform.
 *
 * With the current max length of 500, the thresholds become:
 * - 20 chars  -> 4
 * - 50 chars  -> 8
 * - 100 chars -> 12
 * - 200 chars -> 15
 */
export const DESCRIPTION_SCORE_THRESHOLDS: readonly ScoreThreshold[] = [
  {
    min: Math.floor(QUIZ_DESCRIPTION_MAX_LENGTH * 0.4),
    score: QUALITY_WEIGHT_DESCRIPTION,
  },
  {
    min: Math.floor(QUIZ_DESCRIPTION_MAX_LENGTH * 0.2),
    score: 12,
  },
  {
    min: Math.floor(QUIZ_DESCRIPTION_MAX_LENGTH * 0.1),
    score: 8,
  },
  {
    min: Math.floor(QUIZ_DESCRIPTION_MAX_LENGTH * 0.04),
    score: 4,
  },
]

/**
 * Question-count thresholds for the question-count sub-score.
 *
 * Thresholds are derived from `QUIZ_QUESTION_MAX` so discovery scoring stays
 * aligned with the quiz validation limits used elsewhere in the platform.
 *
 * With the current max question count of 50, the thresholds become:
 * - 10 questions -> 4
 * - 15 questions -> 6
 * - 20 questions -> 8
 * - 30 questions -> 10
 */
export const QUESTION_COUNT_SCORE_THRESHOLDS: readonly ScoreThreshold[] = [
  {
    min: Math.floor(QUIZ_QUESTION_MAX * 0.6),
    score: QUALITY_WEIGHT_QUESTIONS,
  },
  {
    min: Math.floor(QUIZ_QUESTION_MAX * 0.4),
    score: 8,
  },
  {
    min: Math.floor(QUIZ_QUESTION_MAX * 0.3),
    score: 6,
  },
  {
    min: Math.floor(QUIZ_QUESTION_MAX * 0.2),
    score: 4,
  },
]

/**
 * Returns the score for the first threshold whose `min` value is met or
 * exceeded.
 *
 * Thresholds must be ordered from highest `min` to lowest `min`.
 *
 * @param value - Input value to evaluate.
 * @param thresholds - Threshold definitions ordered from highest to lowest.
 * @returns The matching score, or `0` if no threshold is reached.
 */
function getThresholdScore(
  value: number,
  thresholds: readonly ScoreThreshold[],
): number {
  return thresholds.find((threshold) => value >= threshold.min)?.score ?? 0
}

// ---------------------------------------------------------------------------
// Scoring functions
// ---------------------------------------------------------------------------

/**
 * Computes a Bayesian-adjusted star rating for a quiz in the range [0, 5].
 *
 * The formula pulls low-rating-count quizzes toward the global mean, preventing
 * a quiz with a single 5-star review from outranking one with hundreds of
 * ratings:
 *
 *   `(count / (count + minCount)) * avg + (minCount / (count + minCount)) * globalMean`
 *
 * As `count` grows relative to `minCount`, the result converges toward the
 * quiz's own average. When `count` is small, the global mean dominates.
 *
 * If `quiz.ratingSummary` is absent or has missing fields, the function
 * defaults to `count = 0` and `avg = 0`, which causes the result to equal
 * `globalMean` — the safest fallback for an unrated quiz.
 *
 * @param quiz - The quiz whose `ratingSummary` is used.
 * @param globalMean - The platform-wide average rating (0–5), typically
 *   pre-computed across all public quizzes.
 * @param minCount - The confidence threshold. A quiz needs this many ratings
 *   before its own average dominates the result. Typical value: 10–50.
 * @returns A Bayesian-adjusted rating in [0, 5].
 */
export function computeBayesianRatingScore(
  quiz: Quiz,
  globalMean: number,
  minCount: number,
): number {
  const count = quiz.ratingSummary?.count ?? 0
  const avg = quiz.ratingSummary?.avg ?? 0
  return (
    (count / (count + minCount)) * avg +
    (minCount / (count + minCount)) * globalMean
  )
}

/**
 * Computes an overall quality score for a quiz in the range [0, 100].
 *
 * The score is a weighted sum of nine independent sub-scores. Accepting
 * `globalMean` and `minRatingCount` as explicit parameters (rather than
 * reading from global state) keeps this function **deterministic and pure**:
 * the same inputs always produce the same output, making it trivially
 * unit-testable without mocking.
 *
 * Sub-scores and weights:
 *
 * 1. Cover (`QUALITY_WEIGHT_COVER` = 10): `imageCoverURL` present and
 *    non-whitespace → 10, absent/blank → 0.
 * 2. Description (`QUALITY_WEIGHT_DESCRIPTION` = 15): bucketed by trimmed
 *    length — 20–49 → 4, 50–99 → 8, 100–199 → 12, 200+ → 15.
 * 3. Questions (`QUALITY_WEIGHT_QUESTIONS` = 10): bucketed by count —
 *    10–14 → 4, 15–19 → 6, 20–29 → 8, 30+ → 10.
 * 4. Play engagement (`QUALITY_WEIGHT_PLAYS` = 25): log-scaled from
 *    `gameplaySummary.count` — `min(25, 25 * log10(count+1) / log10(PLAY_SCALE_MAX))`.
 * 5. Unique players (`QUALITY_WEIGHT_PLAYERS` = 10): same log-scale pattern
 *    on `gameplaySummary.totalPlayerCount`, capped at 10.
 * 6. Rating (`QUALITY_WEIGHT_RATING` = 10): `computeBayesianRatingScore(...)
 *    * (QUALITY_WEIGHT_RATING / 5)`.
 * 7. Question media density (`QUALITY_WEIGHT_QUESTION_MEDIA` = 10): proportion
 *    of questions that have any media attachment (image, audio, or video) —
 *    `(questionsWithMedia / totalQuestions) * 10`. `Pin` questions are treated
 *    as always having media because they carry a required `imageURL` field
 *    instead of the standard `media` subdocument.
 * 8. Question info density (`QUALITY_WEIGHT_QUESTION_INFO` = 10): proportion
 *    of questions that have a non-blank `info` property —
 *    `(questionsWithInfo / totalQuestions) * 10`.
 * 9. Question type variety (`QUALITY_WEIGHT_QUESTION_VARIETY` = 10): proportion
 *    of distinct question types used out of `TOTAL_QUESTION_TYPES` (6) —
 *    `(uniqueTypeCount / TOTAL_QUESTION_TYPES) * 10`.
 *
 * Missing or partially populated sub-documents (`gameplaySummary`,
 * `ratingSummary`, `questions`) are treated as zero-valued defaults so the
 * function never throws on partial documents.
 *
 * @param quiz - The quiz to score.
 * @param globalMean - Platform-wide average rating used by the Bayesian
 *   rating sub-score.
 * @param minRatingCount - Confidence threshold used by the Bayesian rating
 *   sub-score.
 * @returns A quality score in [0, 100].
 */
export function computeQualityScore(
  quiz: Quiz,
  globalMean: number,
  minRatingCount: number,
): number {
  // Sub-score 1: cover image (trim-aware)
  const coverScore = quiz.imageCoverURL?.trim() ? QUALITY_WEIGHT_COVER : 0

  // Sub-score 2: description quality from threshold-based length scoring
  const descLen = quiz.description?.trim().length ?? 0
  const descScore = getThresholdScore(descLen, DESCRIPTION_SCORE_THRESHOLDS)

  // Sub-score 3: question count from threshold-based scoring
  const qCount = (quiz.questions ?? []).length
  const questionScore = getThresholdScore(
    qCount,
    QUESTION_COUNT_SCORE_THRESHOLDS,
  )

  // Sub-score 4: play engagement (log-scaled, defensive defaults)
  const playCount = quiz.gameplaySummary?.count ?? 0
  const playScore = Math.min(
    QUALITY_WEIGHT_PLAYS,
    (QUALITY_WEIGHT_PLAYS * Math.log10(playCount + 1)) /
      Math.log10(PLAY_SCALE_MAX),
  )

  // Sub-score 5: unique players (log-scaled, defensive defaults)
  const playerCount = quiz.gameplaySummary?.totalPlayerCount ?? 0
  const playerScore = Math.min(
    QUALITY_WEIGHT_PLAYERS,
    (QUALITY_WEIGHT_PLAYERS * Math.log10(playerCount + 1)) /
      Math.log10(PLAYER_SCALE_MAX),
  )

  // Sub-score 6: Bayesian-adjusted rating mapped to [0, QUALITY_WEIGHT_RATING]
  // computeBayesianRatingScore handles missing ratingSummary internally.
  const bayesian = computeBayesianRatingScore(quiz, globalMean, minRatingCount)
  const ratingScore = bayesian * (QUALITY_WEIGHT_RATING / 5)

  // Sub-score 7: question media density — proportion of questions with any media.
  // Pin questions use a dedicated `imageURL` field instead of `media`, so they
  // are treated as always having media when `imageURL` is non-empty.
  const questions = quiz.questions ?? []
  const mediaScore =
    questions.length > 0
      ? (questions.filter(
          (q) =>
            q.media != null ||
            (q.type === QuestionType.Pin &&
              (q as unknown as { imageURL?: string }).imageURL != null),
        ).length /
          questions.length) *
        QUALITY_WEIGHT_QUESTION_MEDIA
      : 0

  // Sub-score 8: question info density — proportion of questions with non-blank info.
  const infoScore =
    questions.length > 0
      ? (questions.filter((q) => q.info?.trim()).length / questions.length) *
        QUALITY_WEIGHT_QUESTION_INFO
      : 0

  // Sub-score 9: question type variety — proportion of distinct types out of total
  const uniqueTypeCount = new Set(questions.map((q) => q.type)).size
  const varietyScore =
    questions.length > 0
      ? (uniqueTypeCount / TOTAL_QUESTION_TYPES) *
        QUALITY_WEIGHT_QUESTION_VARIETY
      : 0

  return Math.min(
    100,
    coverScore +
      descScore +
      questionScore +
      playScore +
      playerScore +
      ratingScore +
      mediaScore +
      infoScore +
      varietyScore,
  )
}

/**
 * Computes a trending score for a quiz in the range [0, 100] based on
 * recent-window play activity.
 *
 * Formula:
 *   `min(100, (recentStats.recentPlayCount * TRENDING_PLAY_WEIGHT) / TRENDING_SCALE_MAX * 100)`
 *
 * The function is **deterministic and pure** — it receives precomputed stats
 * and applies only arithmetic. The `recentStats` are gathered during snapshot
 * computation by querying the games collection for plays completed within
 * `TRENDING_WINDOW_DAYS` days.
 *
 * This approach replaces a previous "days since last played" heuristic with a
 * proper recent-window play score.
 *
 * Future enhancement: once the data model supports it, incorporate
 * `recentUniquePlayerCount` and a corresponding `TRENDING_PLAYER_WEIGHT` to
 * add signal from distinct players in the window.
 *
 * @param recentStats - Precomputed recent-activity statistics for the quiz.
 *   Contains `recentPlayCount`: the number of completed plays recorded within
 *   the last `TRENDING_WINDOW_DAYS` days.
 * @returns A trending score in [0, 100].
 */
export function computeTrendingScore(recentStats: RecentActivityStats): number {
  const weighted = recentStats.recentPlayCount * TRENDING_PLAY_WEIGHT
  return Math.min(100, (weighted / TRENDING_SCALE_MAX) * 100)
}
