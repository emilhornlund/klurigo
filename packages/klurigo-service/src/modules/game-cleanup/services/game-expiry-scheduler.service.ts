import { GameStatus } from '@klurigo/common'
import { Injectable, Logger } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { InjectRedis } from '@nestjs-modules/ioredis'
import Redis from 'ioredis'
import { MurLock } from 'murlock'

import { getErrorStack, structuredLog } from '../../../app/utils'
import {
  GameAnswerRepository,
  GameRepository,
} from '../../game-core/repositories'

export const GAME_EXPIRY_CLEANUP_LOCK_LEASE_MS = 60_000

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
  private static readonly ANSWER_CLEANUP_BATCH_SIZE = 100
  private static readonly ANSWER_CLEANUP_CURSOR_KEY =
    'game-cleanup:terminal-answer-state:cursor'

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
    @InjectRedis() private readonly redis: Redis,
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
  @MurLock(GAME_EXPIRY_CLEANUP_LOCK_LEASE_MS, 'scheduled_game_expiry_lock')
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

      if (count > 0) {
        this.logger.log(`Updated ${count} ${state} games.`)
      } else {
        this.logger.debug(`Updated ${count} ${state} games.`)
      }
    } catch (error) {
      this.logger.error(
        structuredLog(
          `Failed to update ${state} games during scheduled cleanup.`,
          {
            operation: 'runUpdate',
            targetState: state,
          },
        ),
        getErrorStack(error),
      )
    }
  }

  /**
   * Clears Redis state only after a game has reached a terminal persisted state.
   * A failed item is logged and left eligible for the next scheduled run.
   */
  private async clearTerminalAnswerState(): Promise<void> {
    let afterGameId: string | undefined
    let games: Awaited<
      ReturnType<GameRepository['findTerminalGamesPendingAnswerCleanup']>
    >
    try {
      afterGameId =
        (await this.redis.get(
          GameExpirySchedulerService.ANSWER_CLEANUP_CURSOR_KEY,
        )) || undefined
      games = await this.gameRepository.findTerminalGamesPendingAnswerCleanup(
        afterGameId,
        GameExpirySchedulerService.ANSWER_CLEANUP_BATCH_SIZE,
      )
    } catch (error) {
      this.logger.error(
        structuredLog(
          'Failed to find terminal games during scheduled cleanup.',
          {
            operation: 'findTerminalGamesPendingAnswerCleanup',
            afterGameId,
          },
        ),
        getErrorStack(error),
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
          structuredLog('Failed to clear transient answer state.', {
            operation: 'clearTerminalAnswerState',
            gameId: game._id,
            gameState: game.status,
            taskId: game.currentTask._id,
          }),
          getErrorStack(error),
        )
        continue
      }

      try {
        const marked =
          await this.gameRepository.markTerminalGameAnswerStateCleared(game._id)

        if (!marked) {
          this.logger.debug(
            structuredLog(
              'Terminal game answer cleanup marker was not updated.',
              {
                operation: 'markTerminalGameAnswerStateCleared',
                gameId: game._id,
                gameState: game.status,
              },
            ),
          )
        }
      } catch (error) {
        this.logger.error(
          structuredLog('Failed to persist transient answer cleanup marker.', {
            operation: 'markTerminalGameAnswerStateCleared',
            gameId: game._id,
            gameState: game.status,
            taskId: game.currentTask._id,
          }),
          getErrorStack(error),
        )
      }
    }

    try {
      if (games.length < GameExpirySchedulerService.ANSWER_CLEANUP_BATCH_SIZE) {
        await this.redis.del(
          GameExpirySchedulerService.ANSWER_CLEANUP_CURSOR_KEY,
        )
      } else {
        await this.redis.set(
          GameExpirySchedulerService.ANSWER_CLEANUP_CURSOR_KEY,
          games[games.length - 1]._id,
        )
      }
    } catch (error) {
      this.logger.error(
        structuredLog('Failed to persist terminal game cleanup cursor.', {
          operation: 'persistTerminalGameCleanupCursor',
          afterGameId,
        }),
        getErrorStack(error),
      )
    }
  }
}
