import {
  QUIZ_RATING_STARS_MAX,
  QUIZ_RATING_STARS_MIN,
  QuizRatingDto,
} from '@klurigo/common'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

import { ApiDateTimeProperty, ApiUuidProperty } from '../../../../app/swagger'

import { QuizRatingAuthorResponse } from './quiz-rating-author.response'

/**
 * API response model representing a single quiz rating submitted by a participant.
 */
export class QuizRatingResponse implements QuizRatingDto {
  /**
   * The unique identifier of the rating.
   */
  @ApiUuidProperty({
    title: 'ID',
    description: 'The unique identifier of the rating.',
    example: '86e51511-08d1-4e63-b122-1730f79e0300',
  })
  readonly id: string

  /**
   * The unique identifier of the quiz that was rated.
   */
  @ApiUuidProperty({
    title: 'Quiz ID',
    description: 'The unique identifier of the quiz that was rated.',
    example: 'eaf37189-7aa7-455e-9e47-73db2a7d0a03',
  })
  readonly quizId: string

  /**
   * The author who submitted the rating.
   */
  @ApiProperty({
    title: 'Author',
    description: 'The author who submitted the rating.',
    required: true,
    type: QuizRatingAuthorResponse,
  })
  readonly author: QuizRatingAuthorResponse

  /**
   * The star rating value (1–5).
   */
  @ApiProperty({
    title: 'Stars',
    description: 'The star rating value (1–5).',
    required: true,
    type: Number,
    example: QUIZ_RATING_STARS_MAX,
    minimum: QUIZ_RATING_STARS_MIN,
    maximum: QUIZ_RATING_STARS_MAX,
  })
  readonly stars: number

  /**
   * Optional free-text feedback provided by the author.
   */
  @ApiPropertyOptional({
    title: 'Comment',
    description: 'Optional free-text feedback provided by the author.',
    required: false,
    type: String,
    example: 'Great quiz—good pacing and fun questions.',
  })
  readonly comment?: string

  /**
   * The timestamp when the rating was created (ISO 8601).
   */
  @ApiDateTimeProperty({
    title: 'Created At',
    description: 'The timestamp when the rating was created (ISO 8601).',
    example: '2026-01-10T18:42:13.125Z',
  })
  readonly createdAt: Date

  /**
   * The timestamp when the rating was last updated (ISO 8601).
   */
  @ApiDateTimeProperty({
    title: 'Updated At',
    description: 'The timestamp when the rating was last updated (ISO 8601).',
    example: '2026-01-10T18:42:13.125Z',
  })
  readonly updatedAt: Date
}
