import { GameParticipantPlayerDto } from '@klurigo/common'
import { ApiProperty } from '@nestjs/swagger'

import { UserAvatarResponse } from '../../../../user/controllers/models/user-avatar.response'
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

  @ApiProperty({ type: UserAvatarResponse })
  avatar: UserAvatarResponse
}
