import { GameStatus, isDefined } from '@klurigo/common'
import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq'
import { Injectable, Logger } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { Job, Queue } from 'bullmq'
import { MurLock } from 'murlock'

import { RedisUnavailableException } from '../../../app/exceptions'
import {
  GameAnswerRepository,
  GameRepository,
} from '../../game-core/repositories'
import {
  GameSettings,
  PendingGameTransitionOperation,
  TaskType,
} from '../../game-core/repositories/models/schemas'
import type { GameDocument } from '../../game-core/repositories/models/schemas'
import {
  getTaskIdentity,
  isGameEnded,
  isSupportedTaskStatusTransition,
  isSupportedTaskTypeProgression,
} from '../../game-core/utils'
import { GameEventPublisher } from '../../game-event/services'

import { GameTaskTransitionService } from './game-task-transition.service'

export const TASK_QUEUE_NAME = 'task'
const TASK_TRANSITION_JOB_NAME = TASK_QUEUE_NAME + 'transition'

class StaleGameTaskTransitionError extends Error {}

/**
 * Service responsible for managing task transitions within a game.
 * It schedules and performs transitions based on the current task type and status,
 * using configured handlers and delays for each transition.
 */
@Injectable()
@Processor(TASK_QUEUE_NAME)
export class GameTaskTransitionScheduler extends WorkerHost {
  private readonly logger = new Logger(GameTaskTransitionScheduler.name)

  /**
   * Constructs an instance of GameTaskTransitionScheduler.
   *
   * @param taskQueue - Task queue for scheduling deferred transitions.
   * @param gameRepository - Repository for accessing and modifying game data.
   * @param gameTaskTransitionService - Service containing logic for determining task callbacks and delays.
   * @param gameEventPublisher - Service responsible for publishing game events to clients.
   */
  constructor(
    @InjectQueue(TASK_QUEUE_NAME)
    private taskQueue: Queue<GameDocument, void, string>,
    private gameRepository: GameRepository,
    private gameAnswerRepository: GameAnswerRepository,
    private gameTaskTransitionService: GameTaskTransitionService,
    private gameEventPublisher: GameEventPublisher,
  ) {
    super()
  }

  /**
   * Sets the transition timing fields for the current task based on the provided delay.
   *
   * @param gameDocument - The game document to update.
   * @param delay - The delay in milliseconds for the transition.
   *
   * @private
   */
  private setTransitionTiming(gameDocument: GameDocument, delay: number): void {
    const now = new Date()
    gameDocument.currentTask.currentTransitionInitiated = now
    gameDocument.currentTask.currentTransitionExpires = new Date(
      now.getTime() + delay,
    )
  }

  private addPendingOperation(
    gameDocument: GameDocument,
    operation: PendingGameTransitionOperation,
  ): void {
    const pendingOperations = gameDocument.pendingTransitionOperations ?? []
    if (!pendingOperations.some(({ id }) => id === operation.id)) {
      pendingOperations.push(operation)
    }
    gameDocument.pendingTransitionOperations = pendingOperations
  }

  private static getOperationId(
    gameDocument: GameDocument,
    operation: PendingGameTransitionOperation['operation'],
  ): string {
    const { _id, currentTask } = gameDocument
    return `${operation}-${_id}-${currentTask._id}-${currentTask.type}-${currentTask.status}`
  }

  /**
   * Initiates the scheduling process for transitioning the current task
   * of the provided game document based on its type and status.
   * Handles existing scheduled transitions appropriately.
   *
   * @param gameDocument - The game document containing the current task to transition.
   */
  public async scheduleTaskTransition(
    gameDocument: GameDocument,
  ): Promise<void> {
    const { _id: gameID, currentTask } = gameDocument
    const { type, status } = currentTask

    const callback =
      this.gameTaskTransitionService.getTaskTransitionCallback(gameDocument)
    const nextStatus = GameTaskTransitionScheduler.getNextTaskStatus(status)

    if (!isSupportedTaskStatusTransition(type, status, nextStatus)) {
      this.logger.warn(
        `Skipping unsupported transition for task ${type} from ${status} for Game ID: ${gameID}`,
      )
      return
    }

    this.logger.log(
      `Scheduling ${type} task transition from ${status} to ${nextStatus} for Game ID: ${gameDocument._id}`,
    )

    const transition = await this.scheduleTaskTransitionLocked(
      gameDocument,
      callback,
      nextStatus,
    )

    if (transition) {
      await this.performTransition(
        gameDocument,
        transition.nextStatus,
        transition.callback,
      )
      if (transition.recoveryOperationId) {
        await this.gameRepository.clearPendingTransitionOperation(
          gameID,
          transition.recoveryOperationId,
        )
      }
    }
  }

  @MurLock(5000, 'game_task_transition', 'gameDocument._id')
  private async scheduleTaskTransitionLocked(
    gameDocument: GameDocument,
    callback: ((gameDocument: GameDocument) => Promise<void>) | undefined,
    nextStatus: 'active' | 'completed' | undefined,
  ): Promise<
    | {
        callback?: (gameDocument: GameDocument) => Promise<void>
        nextStatus: 'active' | 'completed' | undefined
        recoveryOperationId?: string
      }
    | undefined
  > {
    const { _id: gameID, currentTask } = gameDocument
    const { type, status } = currentTask
    const expectedTask = getTaskIdentity(gameDocument)
    const jobId = GameTaskTransitionScheduler.getTransitionJobId(gameDocument)

    let existingTransitionJob: Job<GameDocument, void, string> | undefined
    try {
      existingTransitionJob = await this.taskQueue.getJob(jobId)
    } catch (error) {
      this.logger.error(
        `Failed to inspect transition queue for task ${type} and status ${status} for Game ID: ${gameID}`,
        error,
      )
      throw new RedisUnavailableException(
        'inspecting the task transition queue',
        `game ${gameID}`,
        error,
      )
    }

    if (existingTransitionJob) {
      if (status === 'active') {
        this.logger.debug(
          `Deleting existing timeout for task type ${type} and status ${status} for Game ID: ${gameDocument._id}`,
        )
        try {
          await this.taskQueue.remove(jobId)
        } catch (error) {
          this.logger.error(
            `Failed to remove the existing transition for task ${type} and status ${status} for Game ID: ${gameID}`,
            error,
          )
          throw new RedisUnavailableException(
            'removing the task transition queue job',
            `game ${gameID}`,
            error,
          )
        }
        return { nextStatus, callback }
      } else {
        this.logger.warn(
          `Skipping scheduling task transition for task type: ${type}, status: ${status} for Game ID: ${gameDocument._id} since timeout exists`,
        )
        return
      }
    } else {
      const delay =
        this.gameTaskTransitionService.getTaskTransitionDelay(gameDocument)
      const recoveryOperationId = GameTaskTransitionScheduler.getOperationId(
        gameDocument,
        'schedule',
      )

      let savedGameDocument: GameDocument
      try {
        savedGameDocument = await this.gameRepository.findAndSaveWithLock(
          gameID,
          async (doc) => {
            if (
              (doc.status !== undefined && doc.status !== GameStatus.Active) ||
              doc.currentTask._id !== expectedTask.id ||
              doc.currentTask.type !== expectedTask.type ||
              doc.currentTask.status !== expectedTask.status
            ) {
              throw new StaleGameTaskTransitionError(
                `Task ${expectedTask.id} is no longer current for game ${gameID}`,
              )
            }
            this.setTransitionTiming(doc, delay)
            this.addPendingOperation(doc, {
              id: recoveryOperationId,
              operation: 'schedule',
              taskId: currentTask._id,
              taskType: type,
              taskStatus: status,
            })
            return doc
          },
        )
      } catch (error) {
        if (error instanceof StaleGameTaskTransitionError) {
          this.logger.warn(error.message)
          return
        }
        throw error
      }

      await this.gameEventPublisher.publish(savedGameDocument)

      if (delay > 0) {
        await this.scheduleDeferredTransition(gameDocument, delay, nextStatus)
        await this.gameRepository.clearPendingTransitionOperation(
          gameID,
          recoveryOperationId,
        )
      } else {
        return { nextStatus, callback, recoveryOperationId }
      }
    }
  }

  /**
   * Schedules a task transition to occur after a specified delay.
   * It sets up a job that will trigger the transition after the delay.
   *
   * @param gameDocument - The current game document.
   * @param delay - The transition delay for the current task.
   * @param nextStatus - The status to transition to.
   *
   * @private
   */
  private async scheduleDeferredTransition(
    gameDocument: GameDocument,
    delay: number,
    nextStatus?: 'active' | 'completed',
  ): Promise<void> {
    const { _id, currentTask } = gameDocument
    const { type, status } = currentTask

    this.logger.debug(
      `Scheduling deferred transition for task ${type} from status ${status} to ${nextStatus} with delay: ${delay}ms for Game ID: ${_id}`,
    )

    const jobId = GameTaskTransitionScheduler.getTransitionJobId(gameDocument)

    try {
      await this.taskQueue.add(TASK_TRANSITION_JOB_NAME, gameDocument, {
        jobId,
        delay,
        priority: delay ? 1 : 2,
      })
    } catch (error) {
      this.logger.error(
        `Failed to schedule deferred transition for task ${type} from status ${status} to ${nextStatus} for Game ID: ${_id}`,
        error,
      )
      throw new RedisUnavailableException(
        'scheduling a deferred task transition',
        `game ${_id}`,
        error,
      )
    }
  }

  /**
   * Executes the task transition by updating the game document to the next status,
   * and invoking the optional callback. It then triggers any post-transition logic.
   *
   * @param gameDocument - The game document to update.
   * @param nextStatus - The status to transition to.
   * @param callback - An optional callback function to execute during the transition.
   *
   * @private
   */
  private async performTransition(
    gameDocument: GameDocument,
    nextStatus: 'active' | 'completed' | undefined,
    callback?: (gameDocument: GameDocument) => Promise<void>,
  ): Promise<void> {
    const { _id, currentTask } = gameDocument
    const { type, status } = currentTask
    const recoveryOperationId = GameTaskTransitionScheduler.getOperationId(
      gameDocument,
      'transition',
    )

    this.logger.debug(
      `Performing transition for task ${type} from status ${status} to ${nextStatus} for Game ID: ${_id}`,
    )

    let updatedGameDocument: GameDocument

    try {
      updatedGameDocument = await this.gameRepository.findAndSaveWithLock(
        _id,
        async (doc) => {
          if (
            (doc.status !== undefined && doc.status !== GameStatus.Active) ||
            doc.currentTask._id !== currentTask._id ||
            doc.currentTask.type !== type ||
            doc.currentTask.status !== status
          ) {
            throw new StaleGameTaskTransitionError(
              `Skipping transition for stale task ${currentTask._id} in game ${_id}`,
            )
          }

          if (!isSupportedTaskStatusTransition(type, status, nextStatus)) {
            throw new StaleGameTaskTransitionError(
              `Skipping unsupported transition for task ${type} from ${status} in game ${_id}`,
            )
          }

          const taskTypeBefore = doc.currentTask.type

          if (nextStatus) {
            doc.currentTask.status = nextStatus
          }
          if (callback) {
            await callback(doc)
          }

          // If callback changed the task type, we need to set timing fields for the new task
          const taskTypeAfter = doc.currentTask.type
          if (taskTypeBefore !== taskTypeAfter) {
            if (
              !isSupportedTaskTypeProgression(
                taskTypeBefore,
                taskTypeAfter,
                Array.isArray(doc.questions) &&
                  typeof doc.nextQuestion === 'number'
                  ? doc.nextQuestion < doc.questions.length
                  : true,
              )
            ) {
              throw new StaleGameTaskTransitionError(
                `Skipping unsupported task progression from ${taskTypeBefore} to ${taskTypeAfter} in game ${_id}`,
              )
            }
            const delay =
              this.gameTaskTransitionService.getTaskTransitionDelay(doc)
            this.setTransitionTiming(doc, delay)
          }

          this.addPendingOperation(doc, {
            id: recoveryOperationId,
            operation: 'transition',
            taskId: currentTask._id,
            taskType: type,
            taskStatus: status,
          })

          return doc
        },
      )

      if (
        type === TaskType.Question &&
        nextStatus === 'completed' &&
        updatedGameDocument.currentTask.type !== TaskType.Question
      ) {
        await this.gameAnswerRepository.clear(_id, currentTask._id)
      }

      await this.gameEventPublisher.publish(updatedGameDocument)

      this.logger.debug(
        `Successfully performed transition for task ${type} to status ${nextStatus} for Game ID: ${_id}`,
      )
    } catch (error) {
      if (error instanceof StaleGameTaskTransitionError) {
        this.logger.warn(error.message)
        return
      }
      this.logger.error(
        `Failed to perform transition for task ${type} from status ${status} to ${nextStatus} for Game ID: ${_id}`,
        error,
      )
      throw error
    }

    if (updatedGameDocument) {
      if (
        nextStatus !== undefined &&
        updatedGameDocument.currentTask.status !== nextStatus
      ) {
        this.logger.warn(
          `Skipping post-transition actions since current status ${updatedGameDocument.currentTask.status} does not match expected status ${nextStatus} for Game ID: ${_id}`,
        )
        await this.gameRepository.clearPendingTransitionOperation(
          _id,
          recoveryOperationId,
        )
        return
      }
      if (isGameEnded(updatedGameDocument)) {
        this.logger.warn(
          `Skipping post-transition actions since game has ended with status ${updatedGameDocument.status} for Game ID: ${_id}`,
        )
        await this.gameRepository.clearPendingTransitionOperation(
          _id,
          recoveryOperationId,
        )
        return
      }
      await this.performPostTransition(updatedGameDocument)
      await this.gameRepository.clearPendingTransitionOperation(
        _id,
        recoveryOperationId,
      )
    }
  }

  /**
   * Handles any logic that needs to occur after a task transition,
   * such as scheduling the next transition if required.
   *
   * @param gameDocument - The updated game document after the transition.
   *
   * @private
   */
  private async performPostTransition(
    gameDocument: GameDocument,
  ): Promise<void> {
    const { _id, currentTask } = gameDocument
    const { type, status } = currentTask

    this.logger.debug(
      `Performing post-transition actions for task ${type} with status ${status} for Game ID: ${_id}`,
    )

    if (gameDocument.status === GameStatus.Completed) {
      this.logger.debug(
        `Skipping post-transition actions since game is completed for Game ID: ${_id}`,
      )
      return
    }

    const delay =
      this.gameTaskTransitionService.getTaskTransitionDelay(gameDocument)

    const doTransition =
      GameTaskTransitionScheduler.shouldSchedulePostTaskTransition(
        type,
        status,
        delay,
        gameDocument.settings,
      )

    try {
      if (doTransition) {
        this.logger.debug(
          `Scheduling next task transition for task ${type} with status ${status} for Game ID: ${_id}`,
        )
        await this.scheduleTaskTransition(gameDocument)
      }
    } catch (error) {
      this.logger.error(
        `Failed to perform post-transition actions for task ${type} with status ${status} for Game ID: ${_id}`,
        error,
      )
      throw error
    }
  }

  /**
   * Retries Redis side effects recorded with a persisted game transition. This
   * also covers immediate transitions, which do not have a BullMQ job to retry.
   */
  @Cron('*/5 * * * * *')
  @MurLock(5000, 'pending_game_transition_recovery')
  public async recoverPendingTransitionOperations(): Promise<void> {
    let games: GameDocument[]
    try {
      games =
        await this.gameRepository.findGamesWithPendingTransitionOperations()
    } catch (error) {
      this.logger.error(
        'Failed to find pending game transition operations for recovery.',
        error,
      )
      return
    }

    for (const game of games) {
      try {
        await this.recoverPendingTransitionOperationsForGame(game)
      } catch (error) {
        this.logger.error(
          `Failed to recover pending game transition operations for Game ID: ${game._id}`,
          error,
        )
      }
    }
  }

  private async recoverPendingTransitionOperationsForGame(
    gameDocument: GameDocument,
  ): Promise<void> {
    for (const operation of gameDocument.pendingTransitionOperations ?? []) {
      const latestGameDocument =
        await this.gameRepository.findGameByIDWithStatusesOrThrow(
          gameDocument._id,
          [GameStatus.Active, GameStatus.Completed],
        )
      const pendingOperation = (
        latestGameDocument.pendingTransitionOperations ?? []
      ).find(({ id }) => id === operation.id)

      if (!pendingOperation) continue

      if (pendingOperation.operation === 'schedule') {
        await this.scheduleTaskTransition(latestGameDocument)
      } else {
        if (
          pendingOperation.taskType === TaskType.Question &&
          pendingOperation.taskStatus === 'active'
        ) {
          await this.gameAnswerRepository.clear(
            latestGameDocument._id,
            pendingOperation.taskId,
          )
        }

        await this.gameEventPublisher.publish(latestGameDocument)
        await this.performPostTransition(latestGameDocument)
      }

      await this.gameRepository.clearPendingTransitionOperation(
        latestGameDocument._id,
        pendingOperation.id,
      )
    }
  }

  /**
   * A job consumer for scheduled deferred transitions.
   *
   * @param job - The scheduled transition job.
   */
  async process(job: Job<GameDocument, void>): Promise<void> {
    if (job.name === TASK_TRANSITION_JOB_NAME) {
      const gameDocument = job.data
      const { currentTask } = job.data
      const { type, status } = currentTask
      const nextStatus = GameTaskTransitionScheduler.getNextTaskStatus(status)

      try {
        const callback =
          this.gameTaskTransitionService.getTaskTransitionCallback(gameDocument)

        this.logger.debug(
          `Executing timeout handler for task ${type} from status ${status} to ${nextStatus} for Game ID: ${gameDocument._id}`,
        )

        const latestGameDocument =
          await this.gameRepository.findGameByIDWithStatusesOrThrow(
            gameDocument._id,
            [GameStatus.Active, GameStatus.Completed],
          )

        if (
          (latestGameDocument.status === GameStatus.Active ||
            latestGameDocument.status === undefined) &&
          latestGameDocument.currentTask._id === currentTask._id &&
          latestGameDocument.currentTask.type === type &&
          latestGameDocument.currentTask.status === status
        ) {
          await this.performTransition(gameDocument, nextStatus, callback)
        } else {
          this.logger.warn(
            `Skipping timeout handler since game status or task identity has changed for Game ID: ${gameDocument._id}`,
          )
          if (latestGameDocument.pendingTransitionOperations?.length) {
            await this.recoverPendingTransitionOperationsForGame(
              latestGameDocument,
            )
            return
          }
          if (job.id) {
            let existingTransitionJob: Awaited<
              ReturnType<typeof this.taskQueue.getJob>
            >
            try {
              existingTransitionJob = await this.taskQueue.getJob(job.id)
            } catch (error) {
              throw new RedisUnavailableException(
                'inspecting the task transition queue',
                `game ${gameDocument._id}`,
                error,
              )
            }
            if (isDefined(existingTransitionJob)) {
              try {
                await this.taskQueue.remove(job.id)
              } catch (error) {
                throw new RedisUnavailableException(
                  'removing the task transition queue job',
                  `game ${gameDocument._id}`,
                  error,
                )
              }
            }
          }
        }
      } catch (error) {
        this.logger.error(
          `Error during scheduled deferred transition for task ${type} from status ${status} to ${nextStatus} for Game ID: ${gameDocument._id}`,
          error,
        )
        throw error
      }
    } else {
      throw new Error('Method not implemented.')
    }
  }

  /**
   * Generates a unique name for the transition job based on the task details.
   *
   * @param gameDocument - The game document to generate the transition job name for.
   *
   * @returns The unique transition job name string.
   *
   * @private
   */
  private static getTransitionJobId(gameDocument: GameDocument): string {
    const {
      currentTask: { _id, type, status },
    } = gameDocument
    return `transition-${_id}_${type}_${status}`
  }

  /**
   * Determines the next status for a task based on its current status.
   *
   * @param status - The current status of the task.
   *
   * @returns The next status ('active', 'completed', or undefined if no further transitions).
   *
   * @private
   */
  private static getNextTaskStatus(
    status: 'pending' | 'active' | 'completed',
  ): 'active' | 'completed' | undefined {
    switch (status) {
      case 'pending':
        return 'active'
      case 'active':
        return 'completed'
      case 'completed':
        return undefined
    }
  }

  /**
   * Determines whether a post-task transition should be scheduled for a given
   * task state.
   *
   * Rules:
   * - For `pending` and `completed`, transitions are always scheduled (they
   *   represent entering/leaving a task state that should progress the flow).
   * - For `active`, transitions are scheduled if:
   *   - the computed delay is greater than 0, or
   *   - the task is configured to auto-complete immediately via game settings
   *     (used primarily for host-only games without player participants).
   *
   * @param taskType - The task type being evaluated for scheduling.
   * @param taskStatus - The current status of the task.
   * @param delay - The computed transition delay (milliseconds) for the current task state.
   * @param settings - The persisted game settings that may allow immediate auto-completion.
   * @returns `true` if the scheduler should enqueue the next transition; otherwise `false`.
   * @private
   */
  private static shouldSchedulePostTaskTransition(
    taskType: TaskType,
    taskStatus: 'pending' | 'active' | 'completed',
    delay: number,
    settings: GameSettings,
  ): boolean {
    if (taskStatus === 'active') {
      if (delay > 0) return true

      return (
        (settings.shouldAutoCompleteQuestionResultTask &&
          taskType === TaskType.QuestionResult) ||
        (settings.shouldAutoCompleteLeaderboardTask &&
          taskType === TaskType.Leaderboard) ||
        (settings.shouldAutoCompletePodiumTask && taskType === TaskType.Podium)
      )
    }

    return taskStatus === 'pending' || taskStatus === 'completed'
  }
}
