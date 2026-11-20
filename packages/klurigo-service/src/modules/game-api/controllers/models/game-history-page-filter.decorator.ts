import { GameMode, GameParticipantType, GameStatus } from '@klurigo/common'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsEnum, IsOptional, IsString } from 'class-validator'

import {
  ApiPaginationLimitProperty,
  ApiPaginationOffsetProperty,
} from '../../../../app/swagger'

/**
 * Represents the query parameters used to filter and paginate game history results.
 */
export class GameHistoryPageFilter {
  /** Literal text to match anywhere in the game name. */
  @ApiPropertyOptional({
    description: 'Literal, case-insensitive partial game name search.',
  })
  @IsOptional()
  @IsString()
  search?: string

  /** The authenticated user's role in the game. */
  @ApiPropertyOptional({
    description: "The authenticated user's participation type.",
    enum: GameParticipantType,
  })
  @IsOptional()
  @IsEnum(GameParticipantType)
  participantType?: GameParticipantType

  /** The game mode to include. */
  @ApiPropertyOptional({ description: 'Filter games by mode.', enum: GameMode })
  @IsOptional()
  @IsEnum(GameMode)
  mode?: GameMode

  /** The status presented in game history, including podium completion. */
  @ApiPropertyOptional({
    description: 'Effective game status; active podium games are completed.',
    enum: [GameStatus.Active, GameStatus.Completed],
  })
  @IsOptional()
  @IsEnum([GameStatus.Active, GameStatus.Completed])
  status?: GameStatus.Active | GameStatus.Completed

  /** The primary sorting field. */
  @ApiPropertyOptional({
    description: 'The field by which to sort games.',
    enum: ['name', 'created', 'updated'],
    default: 'updated',
  })
  @IsOptional()
  @IsEnum(['name', 'created', 'updated'])
  sort?: 'name' | 'created' | 'updated'

  /** The direction applied to the primary field and ID tie-breaker. */
  @ApiPropertyOptional({
    description: 'The sort direction.',
    enum: ['asc', 'desc'],
    default: 'desc',
  })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  order?: 'asc' | 'desc'

  /**
   * The maximum number of game history results to retrieve per page.
   */
  @ApiPaginationLimitProperty({
    description:
      'The maximum number of game history results to retrieve per page.',
    default: 5,
  })
  limit?: number

  /**
   * The number of game history results to skip before starting retrieval.
   */
  @ApiPaginationOffsetProperty({
    description:
      'The number of game history results to skip before starting retrieval.',
    default: 0,
  })
  offset?: number
}
