import { GameResultParticipantDto } from '@klurigo/common'
import { ApiProperty } from '@nestjs/swagger'

import { AvatarConfigurationResponse } from '../../../../../app/shared/avatar/avatar-configuration.response'
import {
  ApiGameParticipantIdProperty,
  ApiPlayerNicknameProperty,
} from '../../../../game-api/controllers/decorators/api'

/**
 * Response model representing a participant (either host or player) in a game result.
 */
export class GameResultParticipantResponse implements GameResultParticipantDto {
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
   * The participant's game-time avatar snapshot, resolved to the stable default
   * when historical result metadata is missing or unsupported.
   */
  @ApiProperty({
    type: AvatarConfigurationResponse,
    description: 'The participant’s game-time avatar.',
  })
  avatar: AvatarConfigurationResponse
}
