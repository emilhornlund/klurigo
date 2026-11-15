import { QuizRatingAuthorDto } from '@klurigo/common'
import { ApiProperty } from '@nestjs/swagger'

import { AvatarConfigurationResponse } from '../../../../app/shared/avatar/avatar-configuration.response'
import { ApiNicknameProperty, ApiUuidProperty } from '../../../../app/swagger'

/**
 * API response model representing the author of a quiz rating.
 */
export class QuizRatingAuthorResponse implements QuizRatingAuthorDto {
  /**
   * The unique identifier of the author (the authenticated client/profile ID).
   */
  @ApiUuidProperty({
    title: 'ID',
    description:
      'The unique identifier of the author (the authenticated client/profile ID).',
    example: '6586e421-3ed2-4f6b-b29c-60bdb8ded727',
  })
  readonly id: string

  /**
   * The current account nickname or anonymous nickname captured at rating time.
   */
  @ApiNicknameProperty({
    title: 'Nickname',
    description:
      'The current account nickname or anonymous nickname captured at rating time.',
    example: 'Emil',
  })
  readonly nickname: string

  /**
   * Current account avatar or anonymous participant snapshot, with a stable historical default.
   */
  @ApiProperty({
    title: 'Avatar',
    description:
      'Current account avatar or anonymous participant snapshot, with a stable historical default.',
    type: AvatarConfigurationResponse,
  })
  readonly avatar: AvatarConfigurationResponse
}
