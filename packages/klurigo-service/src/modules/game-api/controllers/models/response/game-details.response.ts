import {
  GameDetailsDto,
  GameParticipantIdentityDto,
  GameParticipantType,
  GameStatus,
} from '@klurigo/common'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

import { UserAvatarResponse } from '../../../../user/controllers/models/user-avatar.response'
import { ApiGameIdProperty, ApiGameStatusProperty } from '../../decorators/api'

/** Only the requesting participant's public game-time identity. */
class GameParticipantIdentityResponse implements GameParticipantIdentityDto {
  @ApiProperty()
  readonly id: string

  @ApiProperty({ enum: GameParticipantType })
  readonly type: GameParticipantType

  @ApiPropertyOptional()
  readonly nickname?: string

  @ApiProperty({ type: UserAvatarResponse })
  readonly avatar: UserAvatarResponse
}

/**
 * Response model containing the authenticated participant's basic game details.
 */
export class GameDetailsResponse implements GameDetailsDto {
  /**
   * The unique identifier of the game.
   */
  @ApiGameIdProperty({
    description: 'The unique identifier of the game.',
  })
  readonly id: string

  /**
   * The current lifecycle status of the game.
   */
  @ApiGameStatusProperty()
  readonly status: GameStatus

  @ApiPropertyOptional({ type: GameParticipantIdentityResponse })
  readonly participant?: GameParticipantIdentityResponse
}
