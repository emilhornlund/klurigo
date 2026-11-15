import {
  GameDetailsDto,
  GameParticipantIdentityDto,
  GameParticipantType,
  GameStatus,
} from '@klurigo/common'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

import { AvatarConfigurationResponse } from '../../../../../app/shared/avatar/avatar-configuration.response'
import {
  ApiGameIdProperty,
  ApiGameParticipantIdProperty,
  ApiGameStatusProperty,
} from '../../decorators/api'

/** Only the requesting participant's public game-time identity. */
class GameParticipantIdentityResponse implements GameParticipantIdentityDto {
  /** Stable identity of the authenticated participant. */
  @ApiGameParticipantIdProperty()
  readonly id: string

  /** Existing authorization role; hosts remain outside player scoring. */
  @ApiProperty({ enum: GameParticipantType })
  readonly type: GameParticipantType

  /** Public nickname for players; absent for host identities. */
  @ApiPropertyOptional()
  readonly nickname?: string

  /** Resolved accepted metadata without private account properties. */
  @ApiProperty({ type: AvatarConfigurationResponse })
  readonly avatar: AvatarConfigurationResponse
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

  /** Caller-only identity, absent before its first accepted join. */
  @ApiPropertyOptional({ type: GameParticipantIdentityResponse })
  readonly participant?: GameParticipantIdentityResponse

  /** Caller-only binding used to detect logout/account changes before joining. */
  @ApiPropertyOptional({ type: String, format: 'uuid', nullable: true })
  readonly joiningAccountId?: string | null
}
