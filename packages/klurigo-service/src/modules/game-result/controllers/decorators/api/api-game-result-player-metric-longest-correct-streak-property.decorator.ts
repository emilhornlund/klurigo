import { QUIZ_QUESTION_MAX, QUIZ_QUESTION_MIN } from '@klurigo/common'
import { applyDecorators } from '@nestjs/common'
import { ApiProperty } from '@nestjs/swagger'
import { IsNumber, Max, Min } from 'class-validator'

/**
 * Decorator for documenting and validating the Classic-only
 * `longestCorrectStreak` metric for a player.
 *
 * Applies:
 * - `@ApiProperty` for Swagger documentation.
 * - `@IsNumber` to ensure the value is a number.
 * - `@Min` to enforce the minimum question count.
 * - `@Max` to enforce the maximum question count.
 */
export function ApiGameResultPlayerMetricLongestCorrectStreakProperty() {
  return applyDecorators(
    ApiProperty({
      title: 'Longest Correct Streak',
      description:
        'The longest streak of consecutive correct answers by the player. This metric is available only in Classic mode.',
      required: true,
      type: Number,
      minimum: QUIZ_QUESTION_MIN,
      maximum: QUIZ_QUESTION_MAX,
      example: 3,
    }),
    IsNumber(),
    Min(QUIZ_QUESTION_MIN),
    Max(QUIZ_QUESTION_MAX),
  )
}
