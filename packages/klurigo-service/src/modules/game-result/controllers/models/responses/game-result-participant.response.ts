import { GameResultParticipantDto } from '@klurigo/common'
import { ApiPropertyOptional } from '@nestjs/swagger'

import { AvatarConfigurationResponse } from '../../../../../app/shared/avatar/avatar-configuration.response'
import {
  ApiGameParticipantIdProperty,
  ApiPlayerNicknameProperty,
} from '../../../../game-api/controllers/decorators/api'

/**
 * Response model representing a participant (either host or player) in a game result.
 */
export class GameResultParticipantResponse implements GameResultParticipantDto {
  /** Resolved game-time design, never fetched from the current account profile. */
  @ApiPropertyOptional({ type: AvatarConfigurationResponse })
  avatar?: AvatarConfigurationResponse

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
}
