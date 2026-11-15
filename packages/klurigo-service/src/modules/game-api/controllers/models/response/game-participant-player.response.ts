import { GameParticipantPlayerDto } from '@klurigo/common'
import { ApiProperty } from '@nestjs/swagger'

import { AvatarConfigurationResponse } from '../../../../../app/shared/avatar/avatar-configuration.response'
import {
  ApiGameParticipantIdProperty,
  ApiPlayerNicknameProperty,
} from '../../decorators/api'

/**
 * Response model representing a player participant in a game.
 */
export class GameParticipantPlayerResponse implements GameParticipantPlayerDto {
  /**
   * The unique identifier of the participant.
   */
  @ApiGameParticipantIdProperty()
  id: string

  /**
   * The nickname of the participant.
   */
  @ApiPlayerNicknameProperty()
  nickname: string

  /**
   * Accepted game-time avatar, resolving historical missing or unsupported metadata to the stable default.
   */
  @ApiProperty({
    title: 'Avatar',
    description:
      'Accepted game-time avatar, with a stable default for historical missing or unsupported metadata.',
    type: AvatarConfigurationResponse,
  })
  avatar: AvatarConfigurationResponse
}
