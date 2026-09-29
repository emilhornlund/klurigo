import { GameDetailsDto, GameStatus } from '@klurigo/common'

import { ApiGameIdProperty, ApiGameStatusProperty } from '../../decorators/api'

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
}
