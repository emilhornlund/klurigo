import { GameStatus } from '@klurigo/common'
import { Injectable, Logger } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { MurLock } from 'murlock'

import {
  GameAnswerRepository,
  GameRepository,
} from '../../game-core/repositories'

/**
 * Periodically checks for completed or expired games and updates their lifecycle state accordingly.
 *
 * - Marks eligible games as 'Completed' when they have reached the 'Podium' task and are stale.
 * - Removes transient answer state for terminal games.
 *
 * This helps keep the system clean by finalizing abandoned game sessions without deleting
 * persisted games that may still be referenced by an active session.
 */
@Injectable()
export class GameExpirySchedulerService {
  private readonly logger = new Logger(GameExpirySchedulerService.name)
  private readonly terminalStatuses = [
    GameStatus.Completed,
    GameStatus.Expired,
    GameStatus.Terminated,
  ]

  /**
   * Initializes the scheduler service with access to game persistence and
   * transient answer storage.
   *
   * @param gameRepository - Repository for querying and updating game documents.
   * @param gameAnswerRepository - Repository for clearing transient Redis state.
   */
  constructor(
    private readonly gameRepository: GameRepository,
    private readonly gameAnswerRepository: GameAnswerRepository,
  ) {}

  /**
   * Periodically runs cleanup logic every 5 minutes (when enabled).
   *
   * Ensures the following:
   * - Games in 'Podium' task with 'Active' status and no updates in over an hour are marked as 'Completed'.
   * - Games in 'Active' status that are not in 'Podium' or 'Quit' tasks and have not been updated in over an hour are marked as 'Expired'.
   *
   * Uses a MurLock to guarantee single-instance execution across a distributed environment.
   */
  @Cron('0 */5 * * * *')
  @MurLock(5000, 'scheduled_game_expiry_lock')
  public async clean(): Promise<void> {
    await this.runUpdate('completed', () =>
      this.gameRepository.updateCompletedGames(),
    )
    await this.runUpdate('expired', () =>
      this.gameRepository.updateExpiredGames(),
    )

    await this.clearTerminalAnswerState()
  }

  private async runUpdate(
    state: 'completed' | 'expired',
    update: () => Promise<number>,
  ): Promise<void> {
    try {
      const count = await update()
      this.logger.log(`Updated ${count} ${state} games.`)
    } catch (error) {
      this.logger.error(
        `Failed to update ${state} games during scheduled cleanup.`,
        error instanceof Error ? error.stack : String(error),
      )
    }
  }

  /**
   * Clears Redis state only after a game has reached a terminal persisted state.
   * A failed item is logged and left eligible for the next scheduled run.
   */
  private async clearTerminalAnswerState(): Promise<void> {
    let games
    try {
      games = await this.gameRepository.find({
        status: { $in: this.terminalStatuses },
      })
    } catch (error) {
      this.logger.error(
        'Failed to find terminal games during scheduled cleanup.',
        error instanceof Error ? error.stack : String(error),
      )
      return
    }

    for (const game of games) {
      // Keep the state check in addition to the query filter so an unexpected
      // stale result cannot clear data belonging to an active game.
      if (!this.terminalStatuses.includes(game.status)) continue

      try {
        await this.gameAnswerRepository.clear(game._id, game.currentTask._id)
      } catch (error) {
        this.logger.error(
          `Failed to clear transient answer state for terminal game '${game._id}'.`,
          error instanceof Error ? error.stack : String(error),
        )
      }
    }
  }
}
