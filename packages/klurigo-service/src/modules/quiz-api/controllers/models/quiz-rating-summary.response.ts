import {
  QUIZ_RATING_STARS_MAX,
  QUIZ_RATING_STARS_MIN,
  QuizRatingSummaryDto,
} from '@klurigo/common'
import { ApiProperty } from '@nestjs/swagger'

/**
 * Represents the aggregated rating information for a quiz.
 *
 * Used as part of quiz responses to provide an average star rating and comment count.
 */
export class QuizRatingSummaryResponse implements QuizRatingSummaryDto {
  /**
   * The average star rating for the quiz.
   *
   * Value is between 1 and 5 (inclusive) when at least one rating exists.
   */
  @ApiProperty({
    title: 'Stars',
    description: 'The average star rating for the quiz.',
    required: true,
    type: Number,
    minimum: QUIZ_RATING_STARS_MIN,
    maximum: QUIZ_RATING_STARS_MAX,
    example: 4.6,
  })
  readonly stars: number

  /**
   * The total number of ratings that include a comment.
   */
  @ApiProperty({
    title: 'Comments',
    description: 'The total number of ratings that include a comment.',
    required: true,
    type: Number,
    example: 12,
    minimum: 0,
  })
  readonly comments: number

  /**
   * The total number of ratings submitted for the quiz.
   */
  @ApiProperty({
    title: 'Total',
    description: 'The total number of ratings submitted for the quiz.',
    required: true,
    type: Number,
    example: 42,
    minimum: 0,
  })
  readonly total: number
}
