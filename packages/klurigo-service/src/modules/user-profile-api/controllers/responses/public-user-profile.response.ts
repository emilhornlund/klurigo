import {
  PLAYER_NICKNAME_MAX_LENGTH,
  PLAYER_NICKNAME_MIN_LENGTH,
  PLAYER_NICKNAME_REGEX,
  PublicUserProfileResponseDto,
} from '@klurigo/common'
import { ApiProperty } from '@nestjs/swagger'

/**
 * Response returned when fetching a user's public profile.
 */
export class PublicUserProfileResponse implements PublicUserProfileResponseDto {
  /**
   * The user's unique identifier.
   */
  @ApiProperty({
    title: 'User ID',
    description: 'Unique identifier for the user.',
    type: String,
    format: 'uuid',
  })
  readonly id: string

  /**
   * The public nickname displayed for the user.
   */
  @ApiProperty({
    title: 'Nickname',
    description: 'Public nickname displayed for the user.',
    type: String,
    minLength: PLAYER_NICKNAME_MIN_LENGTH,
    maxLength: PLAYER_NICKNAME_MAX_LENGTH,
    pattern: PLAYER_NICKNAME_REGEX.source,
    example: 'FrostyBear',
  })
  readonly nickname: string

  /**
   * The total number of public quizzes authored by the user.
   */
  @ApiProperty({
    title: 'Quizzes Count',
    description: 'Total number of public quizzes authored by the user.',
    type: Number,
    minimum: 0,
    example: 12,
  })
  readonly quizzesCount: number

  /**
   * The total number of games hosted by the user.
   */
  @ApiProperty({
    title: 'Hosted Games Count',
    description: 'Total number of games hosted by the user.',
    type: Number,
    minimum: 0,
    example: 34,
  })
  readonly hostedGamesCount: number

  /**
   * The total number of games played by the user.
   */
  @ApiProperty({
    title: 'Played Games Count',
    description: 'Total number of games played by the user.',
    type: Number,
    minimum: 0,
    example: 56,
  })
  readonly playedGamesCount: number

  /**
   * ISO 8601 timestamp when the user account was created.
   */
  @ApiProperty({
    title: 'Created At',
    description: 'Creation timestamp for the user account.',
    type: Date,
    format: 'date-time',
    example: '2025-06-18T12:00:00.000Z',
  })
  readonly createdAt: Date
}
