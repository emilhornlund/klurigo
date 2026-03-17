import { GameStatus, isDefined } from '@klurigo/common'
import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq'
import { Injectable, Logger } from '@nestjs/common'
import { Job, Queue } from 'bullmq'

import { GameRepository } from '../../game-core/repositories'
import {
  GameDocument,
  GameSettings,
  TaskType,
} from '../../game-core/repositories/models/schemas'
import { GameEventPublisher } from '../../game-event/services'

import { GameTaskTransitionService } from './game-task-transition.service'

export const TASK_QUEUE_NAME = 'task'
const TASK_TRANSITION_JOB_NAME = TASK_QUEUE_NAME + 'transition'

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

    this.logger.log(
      `Scheduling ${type} task transition from ${status} to ${nextStatus} for Game ID: ${gameDocument._id}`,
    )

    const jobId = GameTaskTransitionScheduler.getTransitionJobId(gameDocument)

    const existingTransitionJob = await this.taskQueue.getJob(jobId)
    if (existingTransitionJob) {
      if (status === 'active') {
        this.logger.debug(
          `Deleting existing timeout for task type ${type} and status ${status} for Game ID: ${gameDocument._id}`,
        )
        await this.taskQueue.remove(jobId)
        await this.performTransition(gameDocument, nextStatus, callback)
      } else {
        this.logger.warn(
          `Skipping scheduling task transition for task type: ${type}, status: ${status} for Game ID: ${gameDocument._id} since timeout exists`,
        )
        return
      }
    } else {
      const delay =
        this.gameTaskTransitionService.getTaskTransitionDelay(gameDocument)

      const savedGameDocument = await this.gameRepository.findAndSaveWithLock(
        gameID,
        async (doc) => {
          this.setTransitionTiming(doc, delay)
          return doc
        },
      )

      await this.gameEventPublisher.publish(savedGameDocument)

      if (delay > 0) {
        await this.scheduleDeferredTransition(gameDocument, delay, nextStatus)
      } else {
        await this.performTransition(gameDocument, nextStatus, callback)
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

    this.logger.debug(
      `Performing transition for task ${type} from status ${status} to ${nextStatus} for Game ID: ${_id}`,
    )

    let updatedGameDocument: GameDocument | null = null

    try {
      updatedGameDocument = await this.gameRepository.findAndSaveWithLock(
        _id,
        async (doc) => {
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
            const delay =
              this.gameTaskTransitionService.getTaskTransitionDelay(doc)
            this.setTransitionTiming(doc, delay)
          }

          return doc
        },
      )

      await this.gameEventPublisher.publish(updatedGameDocument)

      this.logger.debug(
        `Successfully performed transition for task ${type} to status ${nextStatus} for Game ID: ${_id}`,
      )
    } catch (error) {
      this.logger.error(
        `Failed to perform transition for task ${type} from status ${status} to ${nextStatus} for Game ID: ${_id}`,
        error,
      )
    }

    if (updatedGameDocument) {
      if (
        nextStatus !== undefined &&
        updatedGameDocument.currentTask.status !== nextStatus
      ) {
        this.logger.warn(
          `Skipping post-transition actions since current status ${updatedGameDocument.currentTask.status} does not match expected status ${nextStatus} for Game ID: ${_id}`,
        )
        return
      }
      if (updatedGameDocument.currentTask.type === TaskType.Quit) {
        this.logger.warn(
          `Skipping post-transition actions since current type ${TaskType.Quit} for Game ID: ${_id}`,
        )
        return
      }
      await this.performPostTransition(updatedGameDocument)
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
          latestGameDocument.currentTask.type === type &&
          latestGameDocument.currentTask.status === status
        ) {
          if (job.id) {
            const existingTransitionJob = await this.taskQueue.getJob(job.id)
            if (isDefined(existingTransitionJob)) {
              await this.taskQueue.remove(job.id)
            }
          }
          await this.performTransition(gameDocument, nextStatus, callback)
        } else {
          this.logger.warn(
            `Skipping timeout handler since task type or status has changed for Game ID: ${gameDocument._id}`,
          )
        }
      } catch (error) {
        if (job.id) {
          const existingTransitionJob = await this.taskQueue.getJob(job.id)
          if (isDefined(existingTransitionJob)) {
            await this.taskQueue.remove(job.id)
          }
        }
        this.logger.error(
          `Error during scheduled deferred transition for task ${type} from status ${status} to ${nextStatus} for Game ID: ${gameDocument._id}`,
          error,
        )
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
