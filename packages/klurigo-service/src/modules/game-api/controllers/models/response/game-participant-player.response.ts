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

  @ApiProperty({ type: AvatarConfigurationResponse })
  avatar: AvatarConfigurationResponse
}
