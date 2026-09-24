import { PublicUserProfileResponseDto } from '@klurigo/common'
import { ApiProperty } from '@nestjs/swagger'

import {
  ApiDateTimeProperty,
  ApiNicknameProperty,
  ApiUuidProperty,
} from '../../../../app/swagger'

/**
 * Response returned when fetching a user's public profile.
 */
export class PublicUserProfileResponse implements PublicUserProfileResponseDto {
  /**
   * The user's unique identifier.
   */
  @ApiUuidProperty({
    title: 'User ID',
    description: 'Unique identifier for the user.',
  })
  readonly id: string

  /**
   * The public nickname displayed for the user.
   */
  @ApiNicknameProperty({
    title: 'Nickname',
    description: 'Public nickname displayed for the user.',
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
  @ApiDateTimeProperty({
    title: 'Created At',
    description: 'Creation timestamp for the user account.',
    example: '2025-06-18T12:00:00.000Z',
  })
  readonly createdAt: Date
}
