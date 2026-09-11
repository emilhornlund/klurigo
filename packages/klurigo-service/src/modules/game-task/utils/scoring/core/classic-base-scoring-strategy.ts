import { GameMode } from '@klurigo/common'

import { BaseScoringStrategy } from './base-scoring-strategy'
import {
  AnswerFor,
  CorrectFor,
  MetaFor,
  QuestionTypeForMode,
} from './scoring-mapped-types'

/**
 * Question types that are valid for the Classic game mode.
 *
 * This narrows the generics so Classic scoring strategies can only
 * be created for combinations that exist in `MappedScoringType`.
 */
export type ClassicQuestionType = QuestionTypeForMode<GameMode.Classic>

/**
 * Convenience alias for the "correct answer" payload type for
 * Classic mode and a specific question type.
 */
export type ClassicCorrect<K extends ClassicQuestionType> = CorrectFor<
  GameMode.Classic,
  K
>

/**
 * Convenience alias for the "player answer" payload type for
 * Classic mode and a specific question type.
 */
export type ClassicAnswer<K extends ClassicQuestionType> = AnswerFor<
  GameMode.Classic,
  K
>

/**
 * Convenience alias for the metadata payload type for
 * Classic mode and a specific question type.
 */
export type ClassicMeta<K extends ClassicQuestionType> = MetaFor<
  GameMode.Classic,
  K
>

/**
 * Base class for scoring strategies in Classic mode.
 *
 * Responsibilities:
 * - Enforces the `ScoringStrategy` contract for Classic questions.
 * - Provides a shared `calculateBaseScore` helper that implements
 *   a time-based score decay from 100% to 50% of the configured
 *   points over the question duration.
 *
 * Concrete subclasses implement:
 * - `isCorrect` for their specific question type.
 * - `calculateScore` which typically uses `isCorrect` and
 *   `calculateBaseScore` to produce the final score.
 */
export abstract class BaseClassicScoringStrategy<
  K extends ClassicQuestionType,
> extends BaseScoringStrategy<GameMode.Classic, K> {
  protected readonly SPEED_BASED_MULTIPLIER: number = 0.2
  protected readonly PRECISION_BASED_MULTIPLIER: number = 0.8

  /**
   * Determines whether the provided answer should be considered correct
   * for a Classic-mode question of type `K`.
   *
   * @param correct Canonical correct-answer payload for this question.
   * @param answer  Player's submitted answer payload, or `undefined` if omitted.
   * @param meta    Question-specific scoring metadata for Classic mode.
   * @returns `true` if the answer is considered correct, otherwise `false`.
   */
  public abstract isCorrect(
    correct: ClassicCorrect<K>,
    answer: ClassicAnswer<K> | undefined,
    meta: ClassicMeta<K>,
  ): boolean

  /**
   * Calculates the final Classic-mode score for a given answer.
   *
   * Implementations typically:
   * - call `isCorrect` to verify the answer
   * - use `calculateBaseScore` to apply the shared time-based decay
   * - optionally add precision- or mode-specific adjustments using `meta`
   *
   * @param presented When the question was shown to the player.
   * @param answered  When the player submitted the answer.
   * @param duration  Allowed answering time in seconds.
   * @param points    Maximum number of points configured for the question.
   * @param correct   Canonical correct-answer payload for this question.
   * @param answer    Player's submitted answer payload, or `undefined`.
   * @param meta      Question-specific scoring metadata for Classic mode.
   * @returns The calculated score for this answer.
   */
  public abstract calculateScore(
    presented: Date,
    answered: Date,
    duration: number,
    points: number,
    correct: ClassicCorrect<K>,
    answer: ClassicAnswer<K> | undefined,
    meta: ClassicMeta<K>,
  ): number

  /**
   * Shared Classic-mode scoring helper that applies a linear time-based
   * decay to the awarded points.
   *
   * Behaviour:
   * - Returns 0 for invalid input, negative/zero duration/points or
   *   if the answer timestamp is before `presented` or after the deadline.
   * - For valid answers within [presented, presented + duration]:
   *   - awards 100% of `points` if answered immediately
   *   - linearly decreases down to 50% of `points` at the deadline
   *
   * @param presented When the question was shown to the player.
   * @param answered  When the player submitted the answer.
   * @param duration  Allowed answering time in seconds.
   * @param points    Maximum number of points for the question.
   */
  protected calculateBaseScore(
    presented: Date,
    answered: Date,
    duration: number,
    points: number,
  ): number {
    if (
      !Number.isFinite(points) ||
      points <= 0 ||
      !Number.isFinite(duration) ||
      duration <= 0
    ) {
      return 0
    }

    const start = presented.getTime()
    const at = answered.getTime()

    if (!Number.isFinite(start) || !Number.isFinite(at)) {
      return 0
    }

    // Seconds between present and answer, clamped to [0, duration]
    const responseSec = Math.min(Math.max((at - start) / 1000, 0), duration)

    // Linear decay to 50% at the deadline:
    // ratio ∈ [0,1], adjustment = ratio/2, multiplier = 1 - adjustment → [1.0..0.5]
    const ratio = responseSec / duration
    const scoreMultiplier = 1 - ratio / 2

    return points * scoreMultiplier
  }
}
