import type { QuizRecentGameDto } from '@klurigo/common'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

/** Aggregate activity for one completed quiz game. */
export class QuizRecentGameResponse implements QuizRecentGameDto {
  @ApiProperty({
    description: 'When the game was completed.',
    type: String,
    format: 'date-time',
    example: '2026-01-10T12:00:00.000Z',
  })
  readonly completed: string

  @ApiProperty({
    description: 'Number of player participants, excluding the host.',
    type: 'integer',
    minimum: 1,
    example: 12,
  })
  readonly playerCount: number

  @ApiPropertyOptional({
    description:
      'Percentage of answered attempts that were correct. Omitted for non-Classic games and games with no graded attempts.',
    type: 'integer',
    minimum: 0,
    maximum: 100,
    example: 74,
  })
  readonly correctnessPercentage?: number

  @ApiPropertyOptional({
    description:
      'Average of the recorded question precision values, expressed as a percentage. Only present when precision is available for a Zero To One Hundred game.',
    type: 'integer',
    minimum: 0,
    maximum: 100,
    example: 81,
  })
  readonly averagePrecisionPercentage?: number
}
