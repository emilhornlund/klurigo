import { QuizAuthorResponseDto } from '@klurigo/common'
import { ApiProperty } from '@nestjs/swagger'

import { AvatarConfigurationResponse } from '../../../../app/shared/avatar/avatar-configuration.response'
import { ApiUuidProperty } from '../../../../app/swagger'

/**
 * Represents the response object for a quiz author.
 */
export class QuizAuthorResponse implements QuizAuthorResponseDto {
  /**
   * The unique identifier of the author.
   */
  @ApiUuidProperty({
    title: 'Author ID',
    description: 'The unique identifier of the author.',
  })
  id: string

  /**
   * The name of the author.
   */
  name: string

  /**
   * The author's current public avatar, using the stable default for accounts
   * without supported saved metadata.
   */
  @ApiProperty({
    type: AvatarConfigurationResponse,
    description: 'The current public avatar of the quiz author.',
  })
  avatar: AvatarConfigurationResponse
}
