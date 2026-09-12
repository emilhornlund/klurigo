import { Injectable, Logger } from '@nestjs/common'
import { OnEvent } from '@nestjs/event-emitter'

import { getErrorStack, structuredLog } from '../../../app/utils'
import { GameResultService } from '../services'

/**
 * Event listener that performs game-result cleanup in response to game lifecycle events.
 */
@Injectable()
export class GameResultListener {
  private readonly logger = new Logger(GameResultListener.name)

  /**
   * Constructs a new GameResultListener.
   *
   * @param gameResultService - Service responsible for managing persisted game results.
   */
  constructor(private readonly gameResultService: GameResultService) {}

  /**
   * Handles the `game.deleted` event by deleting all game results associated with the deleted game.
   *
   * @param payload - Event payload containing the deleted game ID.
   */
  @OnEvent('game.deleted')
  public async handleGameDeleted({
    gameId,
  }: {
    gameId: string
  }): Promise<void> {
    try {
      await this.gameResultService.deleteByGameId(gameId)
    } catch (error) {
      this.logger.error(
        structuredLog('Failed to delete game results for deleted game.', {
          operation: 'handleGameDeleted',
          gameId,
        }),
        getErrorStack(error),
      )
    }
  }
}
