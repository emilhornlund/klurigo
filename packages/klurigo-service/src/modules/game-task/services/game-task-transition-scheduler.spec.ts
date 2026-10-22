import { GameStatus } from '@klurigo/common'
import * as Sentry from '@sentry/nestjs'
import { Job, Queue } from 'bullmq'
import type Redis from 'ioredis'

import {
  GameAnswerRepository,
  GameRepository,
} from '../../game-core/repositories'
import {
  GameDocument,
  PendingGameTransitionOperation,
  TaskType,
} from '../../game-core/repositories/models/schemas'
import { GameEventPublisher } from '../../game-event/services'

jest.mock('@sentry/nestjs', () => ({ captureMessage: jest.fn() }))

// The scheduler tests exercise business logic directly and do not need Redis.
// Keep the decorator's serialization behavior for concurrency tests.
jest.mock('murlock', () => {
  const locks = new Map<string, Promise<void>>()

  return {
    MurLock:
      (...lockArgs: unknown[]) =>
      (
        _target: unknown,
        _propertyKey: string,
        descriptor: PropertyDescriptor,
      ) => {
        const originalMethod = descriptor.value
        descriptor.value = async function (...args: unknown[]) {
          const lockKey = String(lockArgs[1] ?? 'default')
          const previous = locks.get(lockKey) ?? Promise.resolve()
          let release: () => void = () => undefined
          const current = new Promise<void>((resolve) => {
            release = resolve
          })
          locks.set(lockKey, current)
          await previous
          try {
            return await originalMethod.apply(this, args)
          } finally {
            release()
            if (locks.get(lockKey) === current) locks.delete(lockKey)
          }
        }
        return descriptor
      },
  }
})

import {
  GameTaskTransitionScheduler,
  OVERDUE_RECOVERY_CURSOR_KEY,
  PENDING_RECOVERY_CURSOR_KEY,
  TASK_QUEUE_NAME,
  TRANSITION_RECOVERY_BATCH_SIZE,
} from './game-task-transition-scheduler'
import { GameTaskTransitionService } from './game-task-transition.service'

describe('GameTaskTransitionScheduler', () => {
  const TASK_TRANSITION_JOB_NAME = TASK_QUEUE_NAME + 'transition'

  let scheduler: GameTaskTransitionScheduler

  let taskQueue: jest.Mocked<
    Pick<Queue<GameDocument, void, string>, 'getJob' | 'remove' | 'add'>
  >
  let redis: jest.Mocked<Pick<Redis, 'get' | 'set' | 'del'>>
  let recoveryCursors: Map<string, string>
  let gameRepository: jest.Mocked<
    Pick<
      GameRepository,
      | 'findAndSaveWithLock'
      | 'findAndSaveWithLockIfChanged'
      | 'findGameByIDWithStatusesOrThrow'
      | 'findGamesWithPendingTransitionOperations'
      | 'findGamesWithOverdueTaskTransitions'
      | 'clearPendingTransitionOperation'
      | 'recordPendingTransitionOperationFailure'
    >
  >
  let gameAnswerRepository: jest.Mocked<Pick<GameAnswerRepository, 'clear'>>
  let gameTaskTransitionService: jest.Mocked<
    Pick<
      GameTaskTransitionService,
      'getTaskTransitionCallback' | 'getTaskTransitionDelay'
    >
  >
  let gameEventPublisher: jest.Mocked<Pick<GameEventPublisher, 'publish'>>
  let saveGameWithLock: jest.Mock

  const logger = {
    log: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }

  const buildGameDocument = (
    overrides?: Partial<GameDocument>,
    taskOverrides?: Partial<GameDocument['currentTask']>,
  ): GameDocument => {
    const base: GameDocument = {
      _id: 'game-1',
      settings: {
        shouldAutoCompleteQuestionResultTask: false,
        shouldAutoCompleteLeaderboardTask: false,
        shouldAutoCompletePodiumTask: false,
        randomizeQuestionOrder: false,
        randomizeAnswerOrder: false,
      },
      currentTask: {
        _id: 'task-1',
        type: TaskType.Lobby,
        status: 'pending',
        currentTransitionInitiated: undefined,
        currentTransitionExpires: undefined,
      },
    } as unknown as GameDocument

    return {
      ...base,
      ...overrides,
      currentTask: {
        ...base.currentTask,
        ...taskOverrides,
      },
    } as GameDocument
  }

  beforeEach(() => {
    taskQueue = {
      getJob: jest.fn(),
      remove: jest.fn(),
      add: jest.fn(),
    }
    saveGameWithLock = jest.fn()
    recoveryCursors = new Map()
    redis = {
      get: jest.fn(async (key: string) => recoveryCursors.get(key) ?? null),
      set: jest.fn(async (key: string, value: string) => {
        recoveryCursors.set(key, value)
        return 'OK'
      }),
      del: jest.fn(async (key: string) => Number(recoveryCursors.delete(key))),
    } as unknown as jest.Mocked<Pick<Redis, 'get' | 'set' | 'del'>>

    gameRepository = {
      findAndSaveWithLock: saveGameWithLock,
      findAndSaveWithLockIfChanged: saveGameWithLock,
      findGameByIDWithStatusesOrThrow: jest.fn(),
      findGamesWithPendingTransitionOperations: jest.fn(),
      findGamesWithOverdueTaskTransitions: jest.fn().mockResolvedValue([]),
      clearPendingTransitionOperation: jest.fn().mockResolvedValue(undefined),
      recordPendingTransitionOperationFailure: jest
        .fn()
        .mockResolvedValue(undefined),
    }

    gameAnswerRepository = {
      clear: jest.fn().mockResolvedValue(undefined),
    }

    gameTaskTransitionService = {
      getTaskTransitionCallback: jest.fn(),
      getTaskTransitionDelay: jest.fn(),
    }

    gameEventPublisher = {
      publish: jest.fn(),
    }

    scheduler = new GameTaskTransitionScheduler(
      taskQueue as unknown as Queue<GameDocument, void, string>,
      redis as unknown as Redis,
      gameRepository as unknown as GameRepository,
      gameAnswerRepository as unknown as GameAnswerRepository,
      gameTaskTransitionService as unknown as GameTaskTransitionService,
      gameEventPublisher as unknown as GameEventPublisher,
    )
    ;(scheduler as any).logger = logger

    jest.clearAllMocks()
  })

  describe('onTaskTransitionJobFailed', () => {
    const makeJob = (attemptsMade: number) =>
      ({
        id: 'transition-job-1',
        name: TASK_TRANSITION_JOB_NAME,
        attemptsMade,
        opts: { attempts: 5 },
        data: buildGameDocument(undefined, {
          type: TaskType.Question,
          status: 'active',
        }),
      }) as Job<GameDocument, void, string>

    it('keeps retryable failures out of error reporting and Sentry', () => {
      const captureMessage = Sentry.captureMessage as jest.Mock

      scheduler.onTaskTransitionJobFailed(
        makeJob(2),
        new Error('sensitive payload must not be logged'),
      )

      expect(logger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Task transition failed and will be retried.',
          attempts: 2,
          maxAttempts: 5,
          errorCategory: 'unexpected',
        }),
      )
      expect(logger.log).not.toHaveBeenCalled()
      expect(logger.error).not.toHaveBeenCalled()
      expect(captureMessage).not.toHaveBeenCalled()
    })

    it('reports an exhausted job with safe IDs, attempts, and bounded error category', () => {
      const captureMessage = Sentry.captureMessage as jest.Mock

      scheduler.onTaskTransitionJobFailed(
        makeJob(5),
        new Error('sensitive payload must not be logged'),
      )

      expect(logger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Game task transition job exhausted its retries.',
          gameId: 'game-1',
          taskId: 'task-1',
          jobId: 'transition-job-1',
          attempts: 5,
          maxAttempts: 5,
          errorCategory: 'unexpected',
        }),
      )
      expect(JSON.stringify(logger.log.mock.calls[0]?.[0])).not.toContain(
        'sensitive payload must not be logged',
      )
      expect(captureMessage).toHaveBeenCalledWith(
        'Game task transition job exhausted its retries.',
        expect.objectContaining({
          level: 'error',
          fingerprint: ['task-transition-job', 'transition-job-1'],
          extra: expect.objectContaining({
            gameId: 'game-1',
            taskId: 'task-1',
            attempts: 5,
            maxAttempts: 5,
          }),
        }),
      )
    })
  })

  describe('setTransitionTiming', () => {
    it('sets currentTransitionInitiated to current time', () => {
      const game = buildGameDocument()
      const delay = 5000
      const beforeTime = Date.now()

      ;(scheduler as any).setTransitionTiming(game, delay)

      expect(game.currentTask.currentTransitionInitiated).toBeInstanceOf(Date)
      const initiatedTime = (
        game.currentTask.currentTransitionInitiated as Date
      ).getTime()
      expect(initiatedTime).toBeGreaterThanOrEqual(beforeTime)
      expect(initiatedTime).toBeLessThanOrEqual(Date.now())
    })

    it('sets currentTransitionExpires to initiated time plus delay', () => {
      const game = buildGameDocument()
      const delay = 5000

      ;(scheduler as any).setTransitionTiming(game, delay)

      const initiatedTime = (
        game.currentTask.currentTransitionInitiated as Date
      ).getTime()
      const expiresTime = (
        game.currentTask.currentTransitionExpires as Date
      ).getTime()

      expect(expiresTime).toBe(initiatedTime + delay)
    })

    it('sets expires equal to initiated when delay is 0', () => {
      const game = buildGameDocument()
      const delay = 0

      ;(scheduler as any).setTransitionTiming(game, delay)

      const initiatedTime = (
        game.currentTask.currentTransitionInitiated as Date
      ).getTime()
      const expiresTime = (
        game.currentTask.currentTransitionExpires as Date
      ).getTime()

      expect(expiresTime).toBe(initiatedTime)
    })

    it('handles large delay values correctly', () => {
      const game = buildGameDocument()
      const delay = 3600000 // 1 hour

      ;(scheduler as any).setTransitionTiming(game, delay)

      const initiatedTime = (
        game.currentTask.currentTransitionInitiated as Date
      ).getTime()
      const expiresTime = (
        game.currentTask.currentTransitionExpires as Date
      ).getTime()

      expect(expiresTime - initiatedTime).toBe(delay)
    })

    it('overwrites existing timing fields', () => {
      const oldInitiated = new Date('2025-01-01T00:00:00Z')
      const oldExpires = new Date('2025-01-01T00:05:00Z')
      const game = buildGameDocument(undefined, {
        currentTransitionInitiated: oldInitiated,
        currentTransitionExpires: oldExpires,
      })
      const delay = 1000

      ;(scheduler as any).setTransitionTiming(game, delay)

      expect(game.currentTask.currentTransitionInitiated).not.toBe(oldInitiated)
      expect(game.currentTask.currentTransitionExpires).not.toBe(oldExpires)
      expect(game.currentTask.currentTransitionInitiated).toBeInstanceOf(Date)
      expect(game.currentTask.currentTransitionExpires).toBeInstanceOf(Date)
    })

    it('modifies the document in place', () => {
      const game = buildGameDocument()
      const delay = 2000

      const result = (scheduler as any).setTransitionTiming(game, delay)

      expect(result).toBeUndefined() // void return
      expect(game.currentTask.currentTransitionInitiated).toBeDefined()
      expect(game.currentTask.currentTransitionExpires).toBeDefined()
    })
  })

  describe('scheduleTaskTransition', () => {
    it('deletes existing transition job and performs immediate transition when current status is active', async () => {
      const game = buildGameDocument(undefined, { status: 'active' })
      const callback = jest.fn().mockResolvedValue(undefined)

      gameTaskTransitionService.getTaskTransitionCallback.mockReturnValue(
        callback,
      )

      taskQueue.getJob.mockResolvedValue({
        id: 'job-1',
        getState: jest.fn().mockResolvedValue('delayed'),
      } as any)

      const performTransitionSpy = jest
        .spyOn(scheduler as any, 'performTransition')
        .mockResolvedValue(undefined)

      await scheduler.scheduleTaskTransition(game, {
        forceActiveCompletion: true,
      })

      expect(taskQueue.getJob).toHaveBeenCalledTimes(1)
      expect(taskQueue.remove).toHaveBeenCalledTimes(1)
      expect(performTransitionSpy).toHaveBeenCalledTimes(1)
      expect(performTransitionSpy).toHaveBeenCalledWith(
        game,
        'completed',
        callback,
      )
      expect(gameRepository.findAndSaveWithLock).not.toHaveBeenCalled()
      expect(gameEventPublisher.publish).not.toHaveBeenCalled()
    })

    it('performs explicit host completion immediately when no queue job exists', async () => {
      const game = buildGameDocument(undefined, { status: 'active' })
      const callback = jest.fn().mockResolvedValue(undefined)
      gameTaskTransitionService.getTaskTransitionCallback.mockReturnValue(
        callback,
      )
      taskQueue.getJob.mockResolvedValue(undefined)
      const performTransitionSpy = jest
        .spyOn(scheduler as any, 'performTransition')
        .mockResolvedValue(undefined)

      await scheduler.scheduleTaskTransition(game, {
        forceActiveCompletion: true,
      })

      expect(performTransitionSpy).toHaveBeenCalledWith(
        game,
        'completed',
        callback,
      )
      expect(taskQueue.add).not.toHaveBeenCalled()
    })

    it('keeps answer-driven completion deferred when the active task has no queue job', async () => {
      const game = buildGameDocument(undefined, { status: 'active' })
      gameTaskTransitionService.getTaskTransitionCallback.mockReturnValue(
        jest.fn().mockResolvedValue(undefined),
      )
      gameTaskTransitionService.getTaskTransitionDelay.mockReturnValue(5_000)
      taskQueue.getJob.mockResolvedValue(undefined)
      saveGameWithLock.mockImplementationOnce(
        async (_id, mutate) => (await mutate(game)) as GameDocument,
      )
      const performTransitionSpy = jest
        .spyOn(scheduler as any, 'performTransition')
        .mockResolvedValue(undefined)

      await scheduler.scheduleTaskTransition(game, {
        completeActiveTaskWhenJobExists: true,
      })

      expect(taskQueue.add).toHaveBeenCalledTimes(1)
      expect(performTransitionSpy).not.toHaveBeenCalled()
    })

    it('skips scheduling when an existing transition job exists and status is not active', async () => {
      const game = buildGameDocument(undefined, {
        status: 'pending',
        currentTransitionInitiated: new Date('2026-09-11T12:00:00Z'),
        currentTransitionExpires: new Date('2026-09-11T12:00:05Z'),
      })

      gameTaskTransitionService.getTaskTransitionCallback.mockReturnValue(
        jest.fn().mockResolvedValue(undefined),
      )

      taskQueue.getJob.mockResolvedValue({
        id: 'job-1',
        getState: jest.fn().mockResolvedValue('delayed'),
      } as any)

      const performTransitionSpy = jest
        .spyOn(scheduler as any, 'performTransition')
        .mockResolvedValue(undefined)
      const scheduleDeferredSpy = jest
        .spyOn(scheduler as any, 'scheduleDeferredTransition')
        .mockResolvedValue(undefined)

      await scheduler.scheduleTaskTransition(game)

      expect(taskQueue.remove).not.toHaveBeenCalled()
      expect(performTransitionSpy).not.toHaveBeenCalled()
      expect(scheduleDeferredSpy).not.toHaveBeenCalled()
      expect(gameRepository.findAndSaveWithLock).not.toHaveBeenCalled()
      expect(gameEventPublisher.publish).not.toHaveBeenCalled()
      expect(logger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Existing task transition job satisfies scheduling.',
          jobState: 'delayed',
        }),
      )
    })

    it('schedules a pending task when timing exists but its transition job is missing', async () => {
      const game = buildGameDocument(undefined, {
        status: 'pending',
        currentTransitionInitiated: new Date(),
        currentTransitionExpires: new Date(Date.now() + 5_000),
      })

      gameTaskTransitionService.getTaskTransitionCallback.mockReturnValue(
        jest.fn().mockResolvedValue(undefined),
      )
      gameTaskTransitionService.getTaskTransitionDelay.mockReturnValue(5_000)
      taskQueue.getJob.mockResolvedValue(undefined)
      gameRepository.findAndSaveWithLock.mockImplementation(
        async (_id, mutator) => {
          const doc = buildGameDocument(
            { _id: game._id },
            { ...game.currentTask },
          )
          return (await mutator(doc)) as GameDocument
        },
      )

      await scheduler.scheduleTaskTransition(game)

      expect(gameRepository.findAndSaveWithLock).toHaveBeenCalledTimes(1)
      expect(gameEventPublisher.publish).toHaveBeenCalledTimes(1)
      expect(taskQueue.add).toHaveBeenCalledTimes(1)
      const scheduledOptions = taskQueue.add.mock.calls[0][2]
      expect(scheduledOptions).toMatchObject({ delay: expect.any(Number) })
      expect(scheduledOptions?.delay).toBeGreaterThan(0)
      expect(scheduledOptions?.delay).toBeLessThanOrEqual(5_000)
    })

    it('serializes concurrent recovery scheduling for the same pending task', async () => {
      const game = buildGameDocument(undefined, { status: 'pending' })
      let hasJob = false

      gameTaskTransitionService.getTaskTransitionCallback.mockReturnValue(
        jest.fn().mockResolvedValue(undefined),
      )
      gameTaskTransitionService.getTaskTransitionDelay.mockReturnValue(5_000)
      taskQueue.getJob.mockImplementation(async () =>
        hasJob
          ? ({
              id: 'job-1',
              getState: jest.fn().mockResolvedValue('delayed'),
            } as any)
          : undefined,
      )
      taskQueue.add.mockImplementation(async () => {
        hasJob = true
        return undefined as any
      })
      gameRepository.findAndSaveWithLock.mockImplementation(
        async (_id, mutator) => {
          const doc = buildGameDocument(
            { _id: game._id },
            { ...game.currentTask },
          )
          return (await mutator(doc)) as GameDocument
        },
      )

      await Promise.all([
        scheduler.scheduleTaskTransition(game),
        scheduler.scheduleTaskTransition(game),
      ])

      expect(gameRepository.findAndSaveWithLock).toHaveBeenCalledTimes(1)
      expect(gameEventPublisher.publish).toHaveBeenCalledTimes(1)
      expect(taskQueue.add).toHaveBeenCalledTimes(1)
    })

    it('does not schedule when the task becomes stale while acquiring the lock', async () => {
      const game = buildGameDocument(undefined, { status: 'pending' })

      gameTaskTransitionService.getTaskTransitionCallback.mockReturnValue(
        jest.fn().mockResolvedValue(undefined),
      )
      gameTaskTransitionService.getTaskTransitionDelay.mockReturnValue(5_000)
      taskQueue.getJob.mockResolvedValue(undefined)
      gameRepository.findAndSaveWithLock.mockImplementation(
        async (_id, mutator) => {
          const staleDocument = buildGameDocument(
            { _id: game._id },
            { ...game.currentTask, status: 'active' },
          )
          return (await mutator(staleDocument)) as GameDocument
        },
      )

      await scheduler.scheduleTaskTransition(game)

      expect(gameEventPublisher.publish).not.toHaveBeenCalled()
      expect(taskQueue.add).not.toHaveBeenCalled()
      expect(logger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Skipping stale task transition scheduling.',
          operation: 'scheduleTaskTransition',
          gameId: game._id,
          taskId: game.currentTask._id,
          taskType: game.currentTask.type,
          taskStatus: game.currentTask.status,
        }),
      )
    })

    it('skips an unsupported task status before querying the queue', async () => {
      const game = buildGameDocument(undefined, {
        status: 'invalid' as any,
      })

      await scheduler.scheduleTaskTransition(game)

      expect(taskQueue.getJob).not.toHaveBeenCalled()
      expect(logger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Skipping unsupported task transition.',
          operation: 'scheduleTaskTransition',
          gameId: game._id,
          taskId: game.currentTask._id,
          taskType: game.currentTask.type,
          taskStatus: game.currentTask.status,
        }),
      )
    })

    it('propagates scheduling persistence failures without publishing or enqueueing', async () => {
      const game = buildGameDocument(undefined, { status: 'pending' })

      gameTaskTransitionService.getTaskTransitionCallback.mockReturnValue(
        jest.fn().mockResolvedValue(undefined),
      )
      gameTaskTransitionService.getTaskTransitionDelay.mockReturnValue(5_000)
      taskQueue.getJob.mockResolvedValue(undefined)
      gameRepository.findAndSaveWithLock.mockRejectedValue(new Error('db-fail'))

      await expect(scheduler.scheduleTaskTransition(game)).rejects.toThrow(
        'db-fail',
      )

      expect(gameEventPublisher.publish).not.toHaveBeenCalled()
      expect(taskQueue.add).not.toHaveBeenCalled()
    })

    it('calls setTransitionTiming with correct delay when scheduling new transition', async () => {
      const game = buildGameDocument(undefined, { status: 'pending' })
      const delay = 3000

      gameTaskTransitionService.getTaskTransitionCallback.mockReturnValue(
        jest.fn().mockResolvedValue(undefined),
      )
      gameTaskTransitionService.getTaskTransitionDelay.mockReturnValue(delay)

      taskQueue.getJob.mockResolvedValue(undefined)

      gameRepository.findAndSaveWithLock.mockImplementation(
        async (_id, mutator) => {
          const doc = buildGameDocument(
            { _id: game._id },
            { ...game.currentTask },
          )
          const mutated = await mutator(doc as any)
          return mutated as any
        },
      )

      const setTimingSpy = jest.spyOn(scheduler as any, 'setTransitionTiming')

      jest
        .spyOn(scheduler as any, 'scheduleDeferredTransition')
        .mockResolvedValue(undefined)

      await scheduler.scheduleTaskTransition(game)

      expect(setTimingSpy).toHaveBeenCalledTimes(1)
      expect(setTimingSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          _id: game._id,
          currentTask: expect.objectContaining({
            type: game.currentTask.type,
            status: game.currentTask.status,
          }),
        }),
        delay,
      )
    })

    it('persists transition timestamps, publishes, and schedules a deferred transition when delay > 0 and no existing job', async () => {
      const game = buildGameDocument(undefined, { status: 'pending' })
      const callback = jest.fn().mockResolvedValue(undefined)

      gameTaskTransitionService.getTaskTransitionCallback.mockReturnValue(
        callback,
      )
      gameTaskTransitionService.getTaskTransitionDelay.mockReturnValue(5_000)

      taskQueue.getJob.mockResolvedValue(undefined)

      gameRepository.findAndSaveWithLock.mockImplementation(
        async (_id, mutator) => {
          const doc = buildGameDocument(
            { _id: game._id },
            { ...game.currentTask },
          )
          const mutated = await mutator(doc as any)
          return mutated as any
        },
      )

      const scheduleDeferredSpy = jest
        .spyOn(scheduler as any, 'scheduleDeferredTransition')
        .mockResolvedValue(undefined)
      const performTransitionSpy = jest
        .spyOn(scheduler as any, 'performTransition')
        .mockResolvedValue(undefined)

      await scheduler.scheduleTaskTransition(game)

      expect(gameRepository.findAndSaveWithLock).toHaveBeenCalledTimes(1)
      expect(gameEventPublisher.publish).toHaveBeenCalledTimes(1)

      const publishedDoc = gameEventPublisher.publish.mock.calls[0][0] as any
      expect(
        publishedDoc.currentTask.currentTransitionInitiated,
      ).toBeInstanceOf(Date)
      expect(publishedDoc.currentTask.currentTransitionExpires).toBeInstanceOf(
        Date,
      )
      expect(
        (publishedDoc.currentTask.currentTransitionExpires as Date).getTime(),
      ).toBeGreaterThan(
        (publishedDoc.currentTask.currentTransitionInitiated as Date).getTime(),
      )

      expect(scheduleDeferredSpy).toHaveBeenCalledTimes(1)
      expect(scheduleDeferredSpy).toHaveBeenCalledWith(
        expect.objectContaining({ _id: game._id }),
        5_000,
        'active',
      )

      expect(performTransitionSpy).not.toHaveBeenCalled()
    })

    it('retains the persisted recovery operation when event publication fails', async () => {
      const game = buildGameDocument(undefined, { status: 'pending' })
      gameTaskTransitionService.getTaskTransitionCallback.mockReturnValue(
        jest.fn().mockResolvedValue(undefined),
      )
      gameTaskTransitionService.getTaskTransitionDelay.mockReturnValue(5_000)
      taskQueue.getJob.mockResolvedValue(undefined)

      let savedDocument: GameDocument | undefined
      gameRepository.findAndSaveWithLock.mockImplementation(
        async (_id, mutator) => {
          const doc = buildGameDocument(
            { _id: game._id },
            { ...game.currentTask },
          )
          savedDocument = (await mutator(doc as any)) as GameDocument
          return savedDocument
        },
      )
      const publicationError = new Error('Redis unavailable')
      gameEventPublisher.publish.mockRejectedValueOnce(publicationError)

      await expect(scheduler.scheduleTaskTransition(game)).rejects.toBe(
        publicationError,
      )

      expect(savedDocument?.pendingTransitionOperations).toEqual([
        expect.objectContaining({
          operation: 'schedule',
          taskId: game.currentTask._id,
          taskType: game.currentTask.type,
          taskStatus: game.currentTask.status,
        }),
      ])
      expect(taskQueue.add).not.toHaveBeenCalled()
    })

    it('persists transition timestamps, publishes, and performs immediate transition when delay <= 0 and no existing job', async () => {
      const game = buildGameDocument(undefined, { status: 'pending' })
      const callback = jest.fn().mockResolvedValue(undefined)

      gameTaskTransitionService.getTaskTransitionCallback.mockReturnValue(
        callback,
      )
      gameTaskTransitionService.getTaskTransitionDelay.mockReturnValue(0)

      taskQueue.getJob.mockResolvedValue(undefined)

      gameRepository.findAndSaveWithLock.mockImplementation(
        async (_id, mutator) => {
          const doc = buildGameDocument(
            { _id: game._id },
            { ...game.currentTask },
          )
          const mutated = await mutator(doc as any)
          return mutated as any
        },
      )

      const scheduleDeferredSpy = jest
        .spyOn(scheduler as any, 'scheduleDeferredTransition')
        .mockResolvedValue(undefined)
      const performTransitionSpy = jest
        .spyOn(scheduler as any, 'performTransition')
        .mockResolvedValue(undefined)

      await scheduler.scheduleTaskTransition(game)

      expect(gameRepository.findAndSaveWithLock).toHaveBeenCalledTimes(1)
      expect(gameEventPublisher.publish).toHaveBeenCalledTimes(1)

      const publishedDoc = gameEventPublisher.publish.mock.calls[0][0] as any
      expect(
        publishedDoc.currentTask.currentTransitionInitiated,
      ).toBeInstanceOf(Date)
      expect(publishedDoc.currentTask.currentTransitionExpires).toBeInstanceOf(
        Date,
      )
      // When delay is 0, both timestamps should be equal (expires immediately)
      expect(publishedDoc.currentTask.currentTransitionExpires.getTime()).toBe(
        publishedDoc.currentTask.currentTransitionInitiated.getTime(),
      )

      expect(scheduleDeferredSpy).not.toHaveBeenCalled()
      expect(performTransitionSpy).toHaveBeenCalledTimes(1)
      expect(performTransitionSpy).toHaveBeenCalledWith(
        game,
        'active',
        callback,
      )
    })
  })

  describe('scheduleDeferredTransition', () => {
    it('adds a delayed job with correct jobId, delay, and priority', async () => {
      const game = buildGameDocument(undefined, { status: 'pending' })
      const delay = 2_000

      await (scheduler as any).scheduleDeferredTransition(game, delay, 'active')

      expect(taskQueue.add).toHaveBeenCalledTimes(1)

      const [name, payload, opts] = taskQueue.add.mock.calls[0]
      expect(name).toBe(TASK_TRANSITION_JOB_NAME)
      expect(payload).toBe(game)
      expect(opts).toMatchObject({
        delay,
        priority: 1,
      })
      expect((opts as any).jobId).toContain('transition-')
    })

    it('propagates queue failures instead of reporting a scheduled transition', async () => {
      const game = buildGameDocument(undefined, { status: 'pending' })
      taskQueue.add.mockRejectedValue(new Error('boom'))

      await expect(
        (scheduler as any).scheduleDeferredTransition(game, 1_000, 'active'),
      ).rejects.toMatchObject({
        message:
          'Redis unavailable while scheduling a deferred task transition for game game-1',
      })

      expect(logger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Failed to schedule deferred task transition.',
          errorCategory: 'unexpected',
        }),
      )
    })
  })

  describe('recoverPendingTransitionOperations', () => {
    it('serializes recovery calls made by separate scheduler instances', async () => {
      let signalFirstQuery!: () => void
      const firstQueryStarted = new Promise<void>((resolve) => {
        signalFirstQuery = resolve
      })
      let releaseFirstQuery!: () => void
      const firstQueryGate = new Promise<void>((resolve) => {
        releaseFirstQuery = resolve
      })
      gameRepository.findGamesWithPendingTransitionOperations
        .mockImplementationOnce(async () => {
          signalFirstQuery()
          await firstQueryGate
          return []
        })
        .mockResolvedValueOnce([])

      const secondScheduler = new GameTaskTransitionScheduler(
        taskQueue as unknown as Queue<GameDocument, void, string>,
        redis as unknown as Redis,
        gameRepository as unknown as GameRepository,
        gameAnswerRepository as unknown as GameAnswerRepository,
        gameTaskTransitionService as unknown as GameTaskTransitionService,
        gameEventPublisher as unknown as GameEventPublisher,
      )
      ;(secondScheduler as any).logger = logger

      const firstRun = scheduler.recoverPendingTransitionOperations()
      try {
        await firstQueryStarted
        const secondRun = secondScheduler.recoverPendingTransitionOperations()
        await Promise.resolve()
        expect(
          gameRepository.findGamesWithPendingTransitionOperations,
        ).toHaveBeenCalledTimes(1)

        releaseFirstQuery()
        await Promise.all([firstRun, secondRun])
        expect(
          gameRepository.findGamesWithPendingTransitionOperations,
        ).toHaveBeenCalledTimes(2)
      } finally {
        releaseFirstQuery()
        await Promise.allSettled([firstRun])
      }
    })

    it('processes recovery pages with a shared cursor and advances past failed games', async () => {
      const firstPage = Array.from(
        { length: TRANSITION_RECOVERY_BATCH_SIZE },
        (_, index) =>
          buildGameDocument({ _id: `game-${String(index).padStart(3, '0')}` }),
      )
      const secondPage = [buildGameDocument({ _id: 'game-100' })]
      gameRepository.findGamesWithPendingTransitionOperations
        .mockResolvedValueOnce(firstPage)
        .mockResolvedValueOnce(secondPage)
      const recoverGame = jest
        .spyOn(scheduler as any, 'recoverPendingTransitionOperationsForGame')
        .mockRejectedValueOnce(new Error('temporary Redis failure'))
        .mockResolvedValue(undefined)

      await scheduler.recoverPendingTransitionOperations()

      expect(
        gameRepository.findGamesWithPendingTransitionOperations,
      ).toHaveBeenNthCalledWith(1, undefined, TRANSITION_RECOVERY_BATCH_SIZE)
      expect(recoverGame).toHaveBeenCalledTimes(TRANSITION_RECOVERY_BATCH_SIZE)
      expect(redis.set).toHaveBeenCalledWith(
        PENDING_RECOVERY_CURSOR_KEY,
        'game-099',
      )
      expect(logger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Pending game transition recovery will retry.',
          gameId: 'game-000',
        }),
      )

      await scheduler.recoverPendingTransitionOperations()

      expect(
        gameRepository.findGamesWithPendingTransitionOperations,
      ).toHaveBeenNthCalledWith(2, 'game-099', TRANSITION_RECOVERY_BATCH_SIZE)
      expect(recoverGame).toHaveBeenCalledTimes(
        TRANSITION_RECOVERY_BATCH_SIZE + 1,
      )
      expect(redis.del).toHaveBeenCalledWith(PENDING_RECOVERY_CURSOR_KEY)
    })

    it('processes overdue recovery in bounded cursor pages', async () => {
      const firstPage = Array.from(
        { length: TRANSITION_RECOVERY_BATCH_SIZE },
        (_, index) =>
          buildGameDocument({
            _id: `overdue-${String(index).padStart(3, '0')}`,
          }),
      )
      const secondPage = [buildGameDocument({ _id: 'overdue-100' })]
      gameRepository.findGamesWithPendingTransitionOperations.mockResolvedValue(
        [],
      )
      gameRepository.findGamesWithOverdueTaskTransitions
        .mockResolvedValueOnce(firstPage)
        .mockResolvedValueOnce(secondPage)
      gameTaskTransitionService.getTaskTransitionDelay.mockReturnValue(5_000)
      const processSpy = jest
        .spyOn(scheduler, 'process')
        .mockResolvedValue(undefined)

      await scheduler.recoverPendingTransitionOperations()

      expect(processSpy).toHaveBeenCalledTimes(TRANSITION_RECOVERY_BATCH_SIZE)
      expect(redis.set).toHaveBeenCalledWith(
        OVERDUE_RECOVERY_CURSOR_KEY,
        'overdue-099',
      )

      await scheduler.recoverPendingTransitionOperations()

      expect(
        gameRepository.findGamesWithOverdueTaskTransitions,
      ).toHaveBeenNthCalledWith(
        2,
        expect.any(Date),
        'overdue-099',
        TRANSITION_RECOVERY_BATCH_SIZE,
      )
      expect(processSpy).toHaveBeenCalledTimes(
        TRANSITION_RECOVERY_BATCH_SIZE + 1,
      )
      expect(redis.del).toHaveBeenCalledWith(OVERDUE_RECOVERY_CURSOR_KEY)
    })

    it('recovers a schedule after Mongo persistence succeeded but queue insertion failed', async () => {
      const game = buildGameDocument(undefined, { status: 'pending' })
      const pendingOperation = {
        id: 'schedule-game-1-task-1-LOBBY-pending',
        operation: 'schedule' as const,
        taskId: game.currentTask._id,
        taskType: game.currentTask.type,
        taskStatus: game.currentTask.status,
      }
      game.pendingTransitionOperations = [pendingOperation]
      gameTaskTransitionService.getTaskTransitionCallback.mockReturnValue(
        jest.fn().mockResolvedValue(undefined),
      )
      gameTaskTransitionService.getTaskTransitionDelay.mockReturnValue(5_000)
      gameRepository.findGamesWithPendingTransitionOperations.mockResolvedValue(
        [game],
      )
      gameRepository.findGameByIDWithStatusesOrThrow.mockResolvedValue(game)
      taskQueue.getJob.mockResolvedValue(undefined)
      gameRepository.findAndSaveWithLock.mockImplementation(
        async (_id, mutator) => ((await mutator(game)) ?? game) as GameDocument,
      )

      await scheduler.recoverPendingTransitionOperations()

      expect(taskQueue.add).toHaveBeenCalledTimes(1)
      expect(
        gameRepository.clearPendingTransitionOperation,
      ).toHaveBeenCalledWith(game._id, pendingOperation.id)
    })

    it('replaces a failed delayed job while preserving the persisted task deadline', async () => {
      const deadline = new Date(Date.now() + 4_000)
      const game = buildGameDocument(undefined, {
        status: 'pending',
        currentTransitionExpires: deadline,
      })
      game.pendingTransitionOperations = [
        {
          id: 'schedule-game-1-task-1-LOBBY-pending',
          operation: 'schedule',
          taskId: game.currentTask._id,
          taskType: game.currentTask.type,
          taskStatus: game.currentTask.status,
        },
      ]
      gameRepository.findGamesWithPendingTransitionOperations.mockResolvedValueOnce(
        [game],
      )
      gameRepository.findGameByIDWithStatusesOrThrow.mockResolvedValue(game)
      taskQueue.getJob.mockResolvedValue({
        id: 'transition-task-1_LOBBY_pending',
        getState: jest.fn().mockResolvedValue('failed'),
      } as any)
      gameTaskTransitionService.getTaskTransitionDelay.mockReturnValue(30_000)
      saveGameWithLock.mockImplementationOnce(async (_id, mutate) => {
        return ((await mutate(game)) ?? game) as GameDocument
      })

      await scheduler.recoverPendingTransitionOperations()

      expect(taskQueue.remove).toHaveBeenCalledWith(
        'transition-task-1_LOBBY_pending',
      )
      expect(taskQueue.add).toHaveBeenCalledTimes(1)
      expect(taskQueue.add.mock.calls[0][2]?.delay).toBeGreaterThan(0)
      expect(taskQueue.add.mock.calls[0][2]?.delay).toBeLessThanOrEqual(4_000)
      expect(game.currentTask.currentTransitionExpires).toBe(deadline)
    })

    it('keeps an active task scheduled when queue insertion succeeded but clearing its marker failed', async () => {
      const game = buildGameDocument(undefined, {
        status: 'active',
        currentTransitionExpires: new Date(Date.now() + 5_000),
      })
      const callback = jest.fn().mockResolvedValue(undefined)
      let savedDocument: GameDocument | undefined
      gameTaskTransitionService.getTaskTransitionCallback.mockReturnValue(
        callback,
      )
      gameTaskTransitionService.getTaskTransitionDelay.mockReturnValue(5_000)
      taskQueue.getJob.mockResolvedValueOnce(undefined).mockResolvedValueOnce({
        id: 'transition-task-1_LOBBY_active',
        getState: jest.fn().mockResolvedValue('delayed'),
      } as any)
      saveGameWithLock.mockImplementationOnce(async (_id, mutate) => {
        savedDocument = (await mutate(game)) as GameDocument
        return savedDocument
      })
      gameRepository.clearPendingTransitionOperation.mockRejectedValueOnce(
        new Error('marker cleanup failed'),
      )

      await expect(scheduler.scheduleTaskTransition(game)).rejects.toThrow(
        'marker cleanup failed',
      )
      expect(taskQueue.add).toHaveBeenCalledTimes(1)
      expect(savedDocument?.pendingTransitionOperations).toEqual([
        expect.objectContaining({ operation: 'schedule' }),
      ])

      gameRepository.findGamesWithPendingTransitionOperations.mockResolvedValueOnce(
        [savedDocument as GameDocument],
      )
      gameRepository.findGameByIDWithStatusesOrThrow.mockResolvedValue(
        savedDocument as GameDocument,
      )
      const performTransitionSpy = jest.spyOn(
        scheduler as any,
        'performTransition',
      )

      await scheduler.recoverPendingTransitionOperations()

      expect(taskQueue.remove).not.toHaveBeenCalled()
      expect(taskQueue.add).toHaveBeenCalledTimes(1)
      expect(performTransitionSpy).not.toHaveBeenCalled()
      expect(
        gameRepository.clearPendingTransitionOperation,
      ).toHaveBeenCalledTimes(2)
    })

    it('retries answer cleanup and post-transition work for a committed transition', async () => {
      const game = buildGameDocument(undefined, {
        type: TaskType.QuestionResult,
        status: 'pending',
      })
      const pendingOperation = {
        id: 'transition-game-1-task-1-QUESTION-active',
        operation: 'transition' as const,
        taskId: 'task-1',
        taskType: TaskType.Question,
        taskStatus: 'active' as const,
        attempts: 2,
      }
      game.pendingTransitionOperations = [pendingOperation]
      gameRepository.findGamesWithPendingTransitionOperations.mockResolvedValue(
        [game],
      )
      gameRepository.findGameByIDWithStatusesOrThrow.mockResolvedValue(game)
      const postTransitionSpy = jest
        .spyOn(scheduler as any, 'performPostTransition')
        .mockResolvedValue(undefined)

      await scheduler.recoverPendingTransitionOperations()

      expect(gameAnswerRepository.clear).toHaveBeenCalledWith(
        game._id,
        pendingOperation.taskId,
      )
      expect(gameEventPublisher.publish).toHaveBeenCalledWith(game)
      expect(postTransitionSpy).toHaveBeenCalledWith(game)
      expect(
        gameRepository.clearPendingTransitionOperation,
      ).toHaveBeenCalledWith(game._id, pendingOperation.id)
      expect(logger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Recovered pending game transition operation.',
          operationId: pendingOperation.id,
          gameId: game._id,
          attempts: 2,
        }),
      )
    })

    it('reports an aged pending operation once while preserving its retry eligibility', async () => {
      const game = buildGameDocument(undefined, { status: 'pending' })
      const pendingOperation: PendingGameTransitionOperation = {
        id: 'schedule-game-1-task-1-LOBBY-pending',
        operation: 'schedule',
        taskId: game.currentTask._id,
        taskType: game.currentTask.type,
        taskStatus: game.currentTask.status,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        attempts: 3,
      }
      game.pendingTransitionOperations = [pendingOperation]
      gameRepository.findGamesWithPendingTransitionOperations.mockResolvedValue(
        [game],
      )
      gameRepository.findGameByIDWithStatusesOrThrow.mockResolvedValue(game)
      taskQueue.getJob.mockResolvedValue(undefined)
      gameTaskTransitionService.getTaskTransitionCallback.mockReturnValue(
        undefined,
      )
      gameTaskTransitionService.getTaskTransitionDelay.mockImplementation(
        () => {
          throw new Error('database unavailable')
        },
      )
      gameRepository.recordPendingTransitionOperationFailure
        .mockResolvedValueOnce({
          attempts: 4,
          createdAt: pendingOperation.createdAt!,
          lastAttemptAt: new Date('2026-01-01T00:10:00.000Z'),
          lastErrorCategory: 'mongodb',
          unresolvedForMs: 600_000,
          shouldReport: true,
        })
        .mockResolvedValueOnce({
          attempts: 5,
          createdAt: pendingOperation.createdAt!,
          lastAttemptAt: new Date('2026-01-01T00:10:05.000Z'),
          lastErrorCategory: 'mongodb',
          unresolvedForMs: 605_000,
          shouldReport: false,
        })
      const captureMessage = Sentry.captureMessage as jest.Mock

      await scheduler.recoverPendingTransitionOperations()
      await scheduler.recoverPendingTransitionOperations()

      expect(
        gameRepository.recordPendingTransitionOperationFailure,
      ).toHaveBeenCalledTimes(2)
      expect(
        gameRepository.clearPendingTransitionOperation,
      ).not.toHaveBeenCalled()
      expect(captureMessage).toHaveBeenCalledTimes(1)
      expect(captureMessage).toHaveBeenCalledWith(
        'Pending game transition operation remains unresolved.',
        expect.objectContaining({
          level: 'error',
          fingerprint: ['pending-game-transition', pendingOperation.id],
          extra: expect.objectContaining({
            operationId: pendingOperation.id,
            taskId: pendingOperation.taskId,
            jobId: 'transition-task-1_LOBBY_pending',
            attempts: 4,
            errorCategory: 'mongodb',
          }),
        }),
      )
      expect(logger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          message:
            'Pending game transition operation recovery failed; retrying.',
          attempts: 5,
        }),
      )
    })

    it('processes an overdue persisted task when its queue job is missing', async () => {
      const game = buildGameDocument(undefined, {
        status: 'pending',
        currentTransitionExpires: new Date('2026-10-19T11:59:00.000Z'),
      })
      gameRepository.findGamesWithPendingTransitionOperations.mockResolvedValue(
        [],
      )
      gameRepository.findGamesWithOverdueTaskTransitions.mockResolvedValue([
        game,
      ])
      gameRepository.findGameByIDWithStatusesOrThrow.mockResolvedValue(game)
      gameRepository.findAndSaveWithLock.mockImplementation(
        async (_id, mutate) => (await mutate(game)) as GameDocument,
      )
      gameTaskTransitionService.getTaskTransitionCallback.mockReturnValue(
        undefined,
      )

      await scheduler.recoverPendingTransitionOperations()

      expect(gameRepository.findAndSaveWithLock).toHaveBeenCalledTimes(1)
      expect(game.currentTask.status).toBe('active')
      expect(gameEventPublisher.publish).toHaveBeenCalledWith(game)
      expect(
        gameRepository.findGamesWithOverdueTaskTransitions,
      ).toHaveBeenCalledTimes(1)
    })

    it('leaves a failed overdue recovery eligible for the next recovery cycle', async () => {
      const game = buildGameDocument(undefined, { status: 'pending' })
      gameRepository.findGamesWithPendingTransitionOperations.mockResolvedValue(
        [],
      )
      gameRepository.findGamesWithOverdueTaskTransitions.mockResolvedValue([
        game,
      ])
      gameRepository.findGameByIDWithStatusesOrThrow.mockRejectedValue(
        new Error('database unavailable'),
      )

      await expect(
        scheduler.recoverPendingTransitionOperations(),
      ).resolves.toBeUndefined()

      expect(logger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Overdue game task recovery will retry.',
          operation: 'recoverOverdueTaskTransition',
          gameId: game._id,
          taskId: game.currentTask._id,
          errorCategory: 'unexpected',
        }),
      )
      expect(
        gameRepository.findGamesWithOverdueTaskTransitions,
      ).toHaveBeenCalledTimes(1)
    })

    it('does not race an overdue task whose queue job is still active', async () => {
      const game = buildGameDocument(undefined, { status: 'pending' })
      gameRepository.findGamesWithPendingTransitionOperations.mockResolvedValue(
        [],
      )
      gameRepository.findGamesWithOverdueTaskTransitions.mockResolvedValue([
        game,
      ])
      taskQueue.getJob.mockResolvedValue({
        getState: jest.fn().mockResolvedValue('active'),
      } as any)

      await scheduler.recoverPendingTransitionOperations()

      expect(taskQueue.getJob).toHaveBeenCalledTimes(1)
      expect(
        gameRepository.findGameByIDWithStatusesOrThrow,
      ).not.toHaveBeenCalled()
      expect(gameRepository.findAndSaveWithLock).not.toHaveBeenCalled()
    })

    it('removes a failed overdue job before safely processing its still-current task', async () => {
      const game = buildGameDocument(undefined, { status: 'pending' })
      gameRepository.findGamesWithPendingTransitionOperations.mockResolvedValue(
        [],
      )
      gameRepository.findGamesWithOverdueTaskTransitions.mockResolvedValueOnce([
        game,
      ])
      taskQueue.getJob.mockResolvedValue({
        getState: jest.fn().mockResolvedValue('failed'),
      } as any)
      const processSpy = jest
        .spyOn(scheduler, 'process')
        .mockResolvedValue(undefined)

      await scheduler.recoverPendingTransitionOperations()

      expect(taskQueue.remove).toHaveBeenCalledWith(
        'transition-task-1_LOBBY_pending',
      )
      expect(processSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'transition-task-1_LOBBY_pending',
          data: game,
        }),
      )
    })

    it('does not recover an active task that intentionally has no transition job', async () => {
      const game = buildGameDocument(
        {
          settings: {
            shouldAutoCompleteQuestionResultTask: false,
            shouldAutoCompleteLeaderboardTask: false,
            shouldAutoCompletePodiumTask: false,
            randomizeQuestionOrder: false,
            randomizeAnswerOrder: false,
          },
        },
        { type: TaskType.QuestionResult, status: 'active' },
      )
      gameRepository.findGamesWithPendingTransitionOperations.mockResolvedValue(
        [],
      )
      gameRepository.findGamesWithOverdueTaskTransitions.mockResolvedValue([
        game,
      ])
      gameTaskTransitionService.getTaskTransitionDelay.mockReturnValue(0)

      await scheduler.recoverPendingTransitionOperations()

      expect(taskQueue.getJob).not.toHaveBeenCalled()
      expect(
        gameRepository.findGameByIDWithStatusesOrThrow,
      ).not.toHaveBeenCalled()
      expect(gameRepository.findAndSaveWithLock).not.toHaveBeenCalled()
    })
  })

  describe('performTransition', () => {
    it('clears question answers after persistence and before publishing', async () => {
      const game = buildGameDocument(undefined, {
        type: TaskType.Question,
        status: 'active',
      })
      const order: string[] = []
      const callback = jest.fn(async (document: GameDocument) => {
        document.currentTask = {
          ...document.currentTask,
          type: TaskType.QuestionResult,
        } as GameDocument['currentTask']
      })

      gameRepository.findAndSaveWithLock.mockImplementation(
        async (_id, mutator) => {
          const doc = buildGameDocument(undefined, {
            type: TaskType.Question,
            status: 'active',
          })
          const updated = (await mutator(doc)) as GameDocument
          updated.currentTask.status = 'completed'
          order.push('persist')
          return updated
        },
      )
      gameAnswerRepository.clear.mockImplementation(async () => {
        order.push('clear')
      })
      gameEventPublisher.publish.mockImplementation(async () => {
        order.push('publish')
      })
      jest
        .spyOn(scheduler as any, 'performPostTransition')
        .mockResolvedValue(undefined)

      await (scheduler as any).performTransition(game, 'completed', callback)

      expect(gameAnswerRepository.clear).toHaveBeenCalledWith(
        game._id,
        game.currentTask._id,
      )
      expect(order).toEqual(['persist', 'clear', 'publish'])
    })

    it('does not publish a transitioned game when Redis answer cleanup fails', async () => {
      const game = buildGameDocument(undefined, {
        type: TaskType.Question,
        status: 'active',
      })
      const cleanupError = new Error('redis unavailable')
      const callback = jest.fn(async (document: GameDocument) => {
        document.currentTask = {
          ...document.currentTask,
          type: TaskType.QuestionResult,
        } as GameDocument['currentTask']
      })

      gameRepository.findAndSaveWithLock.mockImplementation(
        async (_id, mutator) => {
          const doc = buildGameDocument(undefined, {
            type: TaskType.Question,
            status: 'active',
          })
          const updated = (await mutator(doc)) as GameDocument
          updated.currentTask.status = 'completed'
          return updated
        },
      )
      gameAnswerRepository.clear.mockRejectedValue(cleanupError)
      jest
        .spyOn(scheduler as any, 'performPostTransition')
        .mockResolvedValue(undefined)

      await expect(
        (scheduler as any).performTransition(game, 'completed', callback),
      ).rejects.toThrow('redis unavailable')

      expect(gameEventPublisher.publish).not.toHaveBeenCalled()
      expect(logger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Failed to perform game task transition.',
          operation: 'performTransition',
          gameId: 'game-1',
          taskId: 'task-1',
          taskType: TaskType.Question,
          taskStatus: 'active',
          nextStatus: 'completed',
          errorCategory: 'unexpected',
        }),
      )
    })

    it('updates status (when nextStatus provided), executes callback, publishes, and performs post-transition', async () => {
      const game = buildGameDocument(undefined, { status: 'pending' })
      const callback = jest.fn(async (doc: any) => {
        doc.someSideEffect = true
      })

      gameRepository.findAndSaveWithLock.mockImplementation(
        async (_id, mutator) => {
          const doc = buildGameDocument(
            { _id: game._id },
            { ...game.currentTask },
          )
          const mutated = await mutator(doc as any)
          mutated.currentTask.status = 'active'
          return mutated as any
        },
      )

      const postSpy = jest
        .spyOn(scheduler as any, 'performPostTransition')
        .mockResolvedValue(undefined)

      await (scheduler as any).performTransition(game, 'active', callback)

      expect(gameRepository.findAndSaveWithLock).toHaveBeenCalledTimes(1)
      expect(callback).toHaveBeenCalledTimes(1)
      expect(gameEventPublisher.publish).toHaveBeenCalledTimes(1)
      const publishedGame = gameEventPublisher.publish.mock.calls[0][0]
      expect(
        publishedGame.currentTask.currentTransitionInitiated,
      ).toBeInstanceOf(Date)
      expect(publishedGame.currentTask.currentTransitionExpires).toBeInstanceOf(
        Date,
      )

      expect(postSpy).toHaveBeenCalledTimes(1)
      expect(postSpy).toHaveBeenCalledWith(
        expect.objectContaining({ _id: game._id }),
      )
    })

    it('does not run post-transition when updated status does not match expected nextStatus', async () => {
      const game = buildGameDocument(undefined, { status: 'pending' })

      gameRepository.findAndSaveWithLock.mockImplementation(
        async (_id, mutator) => {
          const doc = buildGameDocument(
            { _id: game._id },
            { ...game.currentTask },
          )
          const mutated = await mutator(doc as any)
          mutated.currentTask.status = 'completed'
          return mutated as any
        },
      )

      const postSpy = jest
        .spyOn(scheduler as any, 'performPostTransition')
        .mockResolvedValue(undefined)

      await (scheduler as any).performTransition(game, 'active')

      expect(gameEventPublisher.publish).toHaveBeenCalledTimes(1)
      expect(postSpy).not.toHaveBeenCalled()
      expect(logger.warn).toHaveBeenCalledTimes(1)
    })

    it('does not run post-transition when game has ended', async () => {
      const game = buildGameDocument(undefined, { status: 'active' })

      gameRepository.findAndSaveWithLock.mockImplementation(
        async (_id, mutator) => {
          const doc = buildGameDocument(
            { _id: game._id },
            { ...game.currentTask },
          )
          const mutated = await mutator(doc as any)
          mutated.status = GameStatus.Terminated
          mutated.currentTask.status = 'completed'
          return mutated as any
        },
      )

      const postSpy = jest
        .spyOn(scheduler as any, 'performPostTransition')
        .mockResolvedValue(undefined)

      await (scheduler as any).performTransition(game, 'completed')

      expect(gameEventPublisher.publish).toHaveBeenCalledTimes(1)
      expect(postSpy).not.toHaveBeenCalled()
      expect(logger.warn).toHaveBeenCalledTimes(1)
    })

    it('propagates repository update failures instead of reporting success', async () => {
      const game = buildGameDocument(undefined, { status: 'pending' })

      gameRepository.findAndSaveWithLock.mockRejectedValue(new Error('db-fail'))

      await expect(
        (scheduler as any).performTransition(game, 'active'),
      ).rejects.toThrow('db-fail')

      expect(logger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Failed to perform game task transition.',
          errorCategory: 'unexpected',
        }),
      )
      expect(gameEventPublisher.publish).not.toHaveBeenCalled()
    })

    it('skips a transition when the task becomes stale while acquiring the lock', async () => {
      const game = buildGameDocument(undefined, { status: 'pending' })

      gameRepository.findAndSaveWithLock.mockImplementation(
        async (_id, mutator) => {
          const staleDocument = buildGameDocument(
            { _id: game._id },
            { ...game.currentTask, status: 'active' },
          )
          return (await mutator(staleDocument)) as GameDocument
        },
      )
      const postSpy = jest
        .spyOn(scheduler as any, 'performPostTransition')
        .mockResolvedValue(undefined)

      await (scheduler as any).performTransition(game, 'active')

      expect(gameEventPublisher.publish).not.toHaveBeenCalled()
      expect(postSpy).not.toHaveBeenCalled()
      expect(logger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Skipping stale game task transition.',
          operation: 'performTransition',
          gameId: game._id,
          taskId: game.currentTask._id,
          taskType: game.currentTask.type,
          taskStatus: game.currentTask.status,
        }),
      )
    })

    it('skips an unsupported status transition while holding the lock', async () => {
      const game = buildGameDocument(undefined, { status: 'pending' })

      gameRepository.findAndSaveWithLock.mockImplementation(
        async (_id, mutator) => {
          const doc = buildGameDocument(
            { _id: game._id },
            { ...game.currentTask },
          )
          return (await mutator(doc)) as GameDocument
        },
      )
      const postSpy = jest
        .spyOn(scheduler as any, 'performPostTransition')
        .mockResolvedValue(undefined)

      await (scheduler as any).performTransition(game, 'completed')

      expect(gameEventPublisher.publish).not.toHaveBeenCalled()
      expect(postSpy).not.toHaveBeenCalled()
      expect(logger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Skipping stale game task transition.',
          operation: 'performTransition',
          gameId: game._id,
          taskId: game.currentTask._id,
          taskType: game.currentTask.type,
          taskStatus: game.currentTask.status,
        }),
      )
    })

    it('skips an unsupported task type progression from a transition callback', async () => {
      const game = buildGameDocument(undefined, {
        type: TaskType.Question,
        status: 'completed',
      })
      const callback = jest.fn(async (doc: any) => {
        doc.currentTask = {
          _id: 'invalid-task-id',
          type: TaskType.Lobby,
          status: 'pending',
        }
      })

      gameRepository.findAndSaveWithLock.mockImplementation(
        async (_id, mutator) => {
          const doc = buildGameDocument(
            { _id: game._id },
            { ...game.currentTask },
          )
          return (await mutator(doc)) as GameDocument
        },
      )

      await (scheduler as any).performTransition(game, undefined, callback)

      expect(gameEventPublisher.publish).not.toHaveBeenCalled()
      expect(logger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Skipping stale game task transition.',
          operation: 'performTransition',
          gameId: game._id,
          taskId: game.currentTask._id,
          taskType: game.currentTask.type,
          taskStatus: game.currentTask.status,
        }),
      )
    })

    it('creates one deferred transition for a newly created pending task and processes it', async () => {
      const game = buildGameDocument(undefined, {
        type: TaskType.Lobby,
        status: 'completed',
      })
      const nextTask = {
        _id: 'question-task',
        type: TaskType.Question,
        status: 'pending' as const,
        questionIndex: 0,
        answers: [],
        metadata: {},
        created: new Date(),
      }
      const createNextTask = jest.fn(async (doc: GameDocument) => {
        doc.currentTask = nextTask as any
      })
      const storedGame = { ...game }

      gameTaskTransitionService.getTaskTransitionCallback.mockReturnValue(
        jest.fn().mockResolvedValue(undefined),
      )
      gameTaskTransitionService.getTaskTransitionDelay.mockImplementation(
        (doc) => (doc.currentTask.status === 'pending' ? 5_000 : 0),
      )
      taskQueue.getJob.mockResolvedValue(undefined)
      gameRepository.findAndSaveWithLock.mockImplementation(
        async (_id, mutator) => {
          const doc = buildGameDocument(
            { _id: storedGame._id },
            { ...storedGame.currentTask },
          )
          const updated = (await mutator(doc)) as GameDocument
          Object.assign(storedGame, updated)
          return updated
        },
      )

      await (scheduler as any).performTransition(
        game,
        undefined,
        createNextTask,
      )

      expect(taskQueue.add).toHaveBeenCalledTimes(1)
      const [, jobData, jobOptions] = taskQueue.add.mock.calls[0]
      expect(jobData.currentTask).toMatchObject({
        _id: nextTask._id,
        type: TaskType.Question,
        status: 'pending',
        currentTransitionInitiated: expect.any(Date),
        currentTransitionExpires: expect.any(Date),
      })

      gameRepository.findGameByIDWithStatusesOrThrow.mockResolvedValue(
        storedGame as GameDocument,
      )

      await scheduler.process({
        id: (jobOptions as any).jobId,
        name: TASK_TRANSITION_JOB_NAME,
        data: jobData,
      } as any)

      expect(storedGame.currentTask).toMatchObject({
        _id: nextTask._id,
        type: TaskType.Question,
        status: 'active',
      })
      expect(taskQueue.add).toHaveBeenCalledTimes(1)
    })

    it('sets timing for the new task status before event publishing', async () => {
      const game = buildGameDocument(undefined, { status: 'pending' })

      const delay = 5_000
      gameTaskTransitionService.getTaskTransitionDelay.mockReturnValue(delay)

      gameRepository.findAndSaveWithLock.mockImplementation(
        async (_id, mutator) => {
          const doc = buildGameDocument(
            { _id: game._id },
            { ...game.currentTask },
          )
          const mutated = await mutator(doc as any)
          expect(mutated.currentTask.currentTransitionInitiated).toBeInstanceOf(
            Date,
          )
          expect(mutated.currentTask.currentTransitionExpires).toBeInstanceOf(
            Date,
          )
          expect(
            (mutated.currentTask.currentTransitionExpires as Date).getTime() -
              (
                mutated.currentTask.currentTransitionInitiated as Date
              ).getTime(),
          ).toBe(delay)
          return mutated as any
        },
      )

      gameEventPublisher.publish.mockResolvedValue(undefined as any)

      const postSpy = jest
        .spyOn(scheduler as any, 'performPostTransition')
        .mockResolvedValue(undefined)

      await (scheduler as any).performTransition(game, 'active')

      expect(gameRepository.findAndSaveWithLock).toHaveBeenCalledTimes(1)
      expect(gameEventPublisher.publish).toHaveBeenCalledTimes(1)
      expect(postSpy).toHaveBeenCalledTimes(1)
    })

    it('calls setTransitionTiming when callback changes task type', async () => {
      const game = buildGameDocument(undefined, {
        status: 'completed',
        currentTransitionInitiated: new Date(),
        currentTransitionExpires: new Date(),
      })
      const delay = 5000
      const callback = jest.fn(async (doc: any) => {
        // Simulate callback changing task type (e.g., Lobby -> Question)
        doc.currentTask = {
          _id: 'new-task-id',
          type: TaskType.Question,
          status: 'pending',
          questionIndex: 0,
          answers: [],
          metadata: {},
          created: new Date(),
        }
      })

      gameTaskTransitionService.getTaskTransitionDelay.mockReturnValue(delay)

      gameRepository.findAndSaveWithLock.mockImplementation(
        async (_id, mutator) => {
          const doc = buildGameDocument(
            { _id: game._id },
            { ...game.currentTask },
          )
          const mutated = await mutator(doc as any)
          return mutated as any
        },
      )

      gameEventPublisher.publish.mockResolvedValue(undefined as any)

      const setTimingSpy = jest.spyOn(scheduler as any, 'setTransitionTiming')
      const postSpy = jest
        .spyOn(scheduler as any, 'performPostTransition')
        .mockResolvedValue(undefined)

      await (scheduler as any).performTransition(game, undefined, callback)

      expect(callback).toHaveBeenCalledTimes(1)
      expect(
        gameTaskTransitionService.getTaskTransitionDelay,
      ).toHaveBeenCalledTimes(1)
      expect(setTimingSpy).toHaveBeenCalledTimes(1)
      expect(setTimingSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          currentTask: expect.objectContaining({
            type: TaskType.Question,
          }),
        }),
        delay,
      )
      expect(gameEventPublisher.publish).toHaveBeenCalledTimes(1)
      expect(postSpy).toHaveBeenCalledTimes(1)
    })

    it('fills missing transition timing before publishing an explicit active-task completion', async () => {
      const game = buildGameDocument(undefined, { status: 'active' })
      gameTaskTransitionService.getTaskTransitionDelay.mockReturnValue(0)
      gameRepository.findAndSaveWithLock.mockImplementation(
        async (_id, mutator) => {
          const document = buildGameDocument(undefined, { status: 'active' })
          return (await mutator(document)) as GameDocument
        },
      )
      jest
        .spyOn(scheduler as any, 'performPostTransition')
        .mockResolvedValue(undefined)

      await (scheduler as any).performTransition(game, 'completed')

      const published = gameEventPublisher.publish.mock.calls[0][0]
      expect(published.currentTask.currentTransitionInitiated).toBeInstanceOf(
        Date,
      )
      expect(published.currentTask.currentTransitionExpires).toEqual(
        published.currentTask.currentTransitionInitiated,
      )
    })

    it('does not call setTransitionTiming when task type remains unchanged', async () => {
      const game = buildGameDocument(undefined, {
        status: 'completed',
        currentTransitionInitiated: new Date(),
        currentTransitionExpires: new Date(),
      })
      const callback = jest.fn(async (doc: any) => {
        // Change unrelated state without changing task identity or status.
        doc.transitionObserved = true
      })

      gameRepository.findAndSaveWithLock.mockImplementation(
        async (_id, mutator) => {
          const doc = buildGameDocument(
            { _id: game._id },
            { ...game.currentTask },
          )
          const mutated = await mutator(doc as any)
          return mutated as any
        },
      )

      gameEventPublisher.publish.mockResolvedValue(undefined as any)

      const setTimingSpy = jest.spyOn(scheduler as any, 'setTransitionTiming')
      const postSpy = jest
        .spyOn(scheduler as any, 'performPostTransition')
        .mockResolvedValue(undefined)

      await (scheduler as any).performTransition(game, undefined, callback)

      expect(callback).toHaveBeenCalledTimes(1)
      expect(setTimingSpy).not.toHaveBeenCalled()
      expect(
        gameTaskTransitionService.getTaskTransitionDelay,
      ).not.toHaveBeenCalled()
      expect(gameEventPublisher.publish).toHaveBeenCalledTimes(1)
      expect(postSpy).toHaveBeenCalledTimes(1)
    })

    it('sets timing fields when callback changes task type', async () => {
      const game = buildGameDocument(undefined, { status: 'completed' })
      const callback = jest.fn(async (doc: any) => {
        // Simulate callback changing task type (e.g., Lobby -> Question)
        doc.currentTask = {
          _id: 'new-task-id',
          type: TaskType.Question,
          status: 'pending',
          questionIndex: 0,
          answers: [],
          metadata: {},
          created: new Date(),
        }
      })

      gameTaskTransitionService.getTaskTransitionDelay.mockReturnValue(5000)

      gameRepository.findAndSaveWithLock.mockImplementation(
        async (_id, mutator) => {
          const doc = buildGameDocument(
            { _id: game._id },
            { ...game.currentTask },
          )
          const mutated = await mutator(doc as any)
          return mutated as any
        },
      )

      gameEventPublisher.publish.mockResolvedValue(undefined as any)

      const postSpy = jest
        .spyOn(scheduler as any, 'performPostTransition')
        .mockResolvedValue(undefined)

      await (scheduler as any).performTransition(game, undefined, callback)

      expect(gameRepository.findAndSaveWithLock).toHaveBeenCalledTimes(1)
      expect(callback).toHaveBeenCalledTimes(1)

      // Verify timing fields were set for the new task
      const savedDoc = (gameRepository.findAndSaveWithLock as jest.Mock).mock
        .results[0].value
      await expect(savedDoc).resolves.toMatchObject({
        currentTask: expect.objectContaining({
          type: TaskType.Question,
          currentTransitionInitiated: expect.any(Date),
          currentTransitionExpires: expect.any(Date),
        }),
      })

      expect(gameEventPublisher.publish).toHaveBeenCalledTimes(1)
      expect(postSpy).toHaveBeenCalledTimes(1)
    })
  })

  describe('performPostTransition', () => {
    it('schedules next transition when status is pending (regardless of delay)', async () => {
      const game = buildGameDocument(undefined, { status: 'pending' })

      gameTaskTransitionService.getTaskTransitionDelay.mockReturnValue(10_000)

      const scheduleSpy = jest
        .spyOn(scheduler, 'scheduleTaskTransition')
        .mockResolvedValue(undefined)

      await (scheduler as any).performPostTransition(game)

      expect(scheduleSpy).toHaveBeenCalledTimes(1)
      expect(scheduleSpy).toHaveBeenCalledWith(game, {
        forceActiveCompletion: false,
      })
    })

    it('schedules next transition when status is active and delay > 0', async () => {
      const game = buildGameDocument(undefined, { status: 'active' })

      gameTaskTransitionService.getTaskTransitionDelay.mockReturnValue(1_000)

      const scheduleSpy = jest
        .spyOn(scheduler, 'scheduleTaskTransition')
        .mockResolvedValue(undefined)

      await (scheduler as any).performPostTransition(game)

      expect(scheduleSpy).toHaveBeenCalledTimes(1)
    })

    it('does not schedule next transition when status is active and delay <= 0 and no settings flags enabled', async () => {
      const game = buildGameDocument(
        {
          settings: {
            shouldAutoCompleteQuestionResultTask: false,
            shouldAutoCompleteLeaderboardTask: false,
            shouldAutoCompletePodiumTask: false,
            randomizeQuestionOrder: false,
            randomizeAnswerOrder: false,
          },
        },
        { status: 'active' },
      )

      gameTaskTransitionService.getTaskTransitionDelay.mockReturnValue(0)

      const scheduleSpy = jest
        .spyOn(scheduler, 'scheduleTaskTransition')
        .mockResolvedValue(undefined)

      await (scheduler as any).performPostTransition(game)

      expect(scheduleSpy).not.toHaveBeenCalled()
    })

    it('schedules next transition when status is active, delay is 0, and shouldAutoCompleteQuestionResultTask is enabled for QuestionResult task', async () => {
      const game = buildGameDocument(
        {
          settings: {
            shouldAutoCompleteQuestionResultTask: true,
            shouldAutoCompleteLeaderboardTask: false,
            shouldAutoCompletePodiumTask: false,
            randomizeQuestionOrder: false,
            randomizeAnswerOrder: false,
          },
        },
        { status: 'active', type: TaskType.QuestionResult },
      )

      gameTaskTransitionService.getTaskTransitionDelay.mockReturnValue(0)

      const scheduleSpy = jest
        .spyOn(scheduler, 'scheduleTaskTransition')
        .mockResolvedValue(undefined)

      await (scheduler as any).performPostTransition(game)

      expect(scheduleSpy).toHaveBeenCalledTimes(1)
      expect(scheduleSpy).toHaveBeenCalledWith(game, {
        forceActiveCompletion: true,
      })
    })

    it('schedules next transition when status is active, delay is 0, and shouldAutoCompleteLeaderboardTask is enabled for Leaderboard task', async () => {
      const game = buildGameDocument(
        {
          settings: {
            shouldAutoCompleteQuestionResultTask: false,
            shouldAutoCompleteLeaderboardTask: true,
            shouldAutoCompletePodiumTask: false,
            randomizeQuestionOrder: false,
            randomizeAnswerOrder: false,
          },
        },
        { status: 'active', type: TaskType.Leaderboard },
      )

      gameTaskTransitionService.getTaskTransitionDelay.mockReturnValue(0)

      const scheduleSpy = jest
        .spyOn(scheduler, 'scheduleTaskTransition')
        .mockResolvedValue(undefined)

      await (scheduler as any).performPostTransition(game)

      expect(scheduleSpy).toHaveBeenCalledTimes(1)
      expect(scheduleSpy).toHaveBeenCalledWith(game, {
        forceActiveCompletion: true,
      })
    })

    it('schedules next transition when status is active, delay is 0, and shouldAutoCompletePodiumTask is enabled for Podium task', async () => {
      const game = buildGameDocument(
        {
          settings: {
            shouldAutoCompleteQuestionResultTask: false,
            shouldAutoCompleteLeaderboardTask: false,
            shouldAutoCompletePodiumTask: true,
            randomizeQuestionOrder: false,
            randomizeAnswerOrder: false,
          },
        },
        { status: 'active', type: TaskType.Podium },
      )

      gameTaskTransitionService.getTaskTransitionDelay.mockReturnValue(0)

      const scheduleSpy = jest
        .spyOn(scheduler, 'scheduleTaskTransition')
        .mockResolvedValue(undefined)

      await (scheduler as any).performPostTransition(game)

      expect(scheduleSpy).toHaveBeenCalledTimes(1)
      expect(scheduleSpy).toHaveBeenCalledWith(game, {
        forceActiveCompletion: true,
      })
    })

    it('does not schedule when status is active, delay is 0, task is QuestionResult but flag is disabled', async () => {
      const game = buildGameDocument(
        {
          settings: {
            shouldAutoCompleteQuestionResultTask: false,
            shouldAutoCompleteLeaderboardTask: false,
            shouldAutoCompletePodiumTask: false,
            randomizeQuestionOrder: false,
            randomizeAnswerOrder: false,
          },
        },
        { status: 'active', type: TaskType.QuestionResult },
      )

      gameTaskTransitionService.getTaskTransitionDelay.mockReturnValue(0)

      const scheduleSpy = jest
        .spyOn(scheduler, 'scheduleTaskTransition')
        .mockResolvedValue(undefined)

      await (scheduler as any).performPostTransition(game)

      expect(scheduleSpy).not.toHaveBeenCalled()
    })

    it('schedules next transition when status is completed (regardless of delay and settings)', async () => {
      const game = buildGameDocument(
        {
          settings: {
            shouldAutoCompleteQuestionResultTask: false,
            shouldAutoCompleteLeaderboardTask: false,
            shouldAutoCompletePodiumTask: false,
            randomizeQuestionOrder: false,
            randomizeAnswerOrder: false,
          },
        },
        { status: 'completed' },
      )

      gameTaskTransitionService.getTaskTransitionDelay.mockReturnValue(0)

      const scheduleSpy = jest
        .spyOn(scheduler, 'scheduleTaskTransition')
        .mockResolvedValue(undefined)

      await (scheduler as any).performPostTransition(game)

      expect(scheduleSpy).toHaveBeenCalledTimes(1)
      expect(scheduleSpy).toHaveBeenCalledWith(game, {
        forceActiveCompletion: false,
      })
    })

    it('rethrows after logging when scheduling next transition fails', async () => {
      const game = buildGameDocument(undefined, { status: 'pending' })

      gameTaskTransitionService.getTaskTransitionDelay.mockReturnValue(10_000)

      jest
        .spyOn(scheduler, 'scheduleTaskTransition')
        .mockRejectedValue(new Error('schedule-fail'))

      await expect(
        (scheduler as any).performPostTransition(game),
      ).rejects.toThrow('schedule-fail')
      expect(logger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Failed to perform post-transition actions.',
          errorCategory: 'unexpected',
        }),
      )
    })

    it('does not schedule next transition when game status is Completed', async () => {
      const game = buildGameDocument(
        { status: GameStatus.Completed },
        { status: 'completed' },
      )

      gameTaskTransitionService.getTaskTransitionDelay.mockReturnValue(0)

      const scheduleSpy = jest
        .spyOn(scheduler, 'scheduleTaskTransition')
        .mockResolvedValue(undefined)

      await (scheduler as any).performPostTransition(game)

      expect(scheduleSpy).not.toHaveBeenCalled()
      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('game is completed'),
      )
    })
  })

  describe('shouldSchedulePostTaskTransition', () => {
    it('returns true when taskStatus is pending (regardless of delay and settings)', () => {
      const settings = {
        shouldAutoCompleteQuestionResultTask: false,
        shouldAutoCompleteLeaderboardTask: false,
        shouldAutoCompletePodiumTask: false,
      }

      expect(
        (GameTaskTransitionScheduler as any).shouldSchedulePostTaskTransition(
          TaskType.Lobby,
          'pending',
          0,
          settings,
        ),
      ).toBe(true)

      expect(
        (GameTaskTransitionScheduler as any).shouldSchedulePostTaskTransition(
          TaskType.Question,
          'pending',
          5000,
          settings,
        ),
      ).toBe(true)
    })

    it('returns true when taskStatus is completed (regardless of delay and settings)', () => {
      const settings = {
        shouldAutoCompleteQuestionResultTask: false,
        shouldAutoCompleteLeaderboardTask: false,
        shouldAutoCompletePodiumTask: false,
      }

      expect(
        (GameTaskTransitionScheduler as any).shouldSchedulePostTaskTransition(
          TaskType.Lobby,
          'completed',
          0,
          settings,
        ),
      ).toBe(true)

      expect(
        (GameTaskTransitionScheduler as any).shouldSchedulePostTaskTransition(
          TaskType.Question,
          'completed',
          5000,
          settings,
        ),
      ).toBe(true)
    })

    it('returns true when taskStatus is active and delay > 0 (regardless of settings)', () => {
      const settings = {
        shouldAutoCompleteQuestionResultTask: false,
        shouldAutoCompleteLeaderboardTask: false,
        shouldAutoCompletePodiumTask: false,
      }

      expect(
        (GameTaskTransitionScheduler as any).shouldSchedulePostTaskTransition(
          TaskType.Question,
          'active',
          1000,
          settings,
        ),
      ).toBe(true)

      expect(
        (GameTaskTransitionScheduler as any).shouldSchedulePostTaskTransition(
          TaskType.QuestionResult,
          'active',
          5000,
          settings,
        ),
      ).toBe(true)
    })

    it('returns true when taskStatus is active, delay is 0, and shouldAutoCompleteQuestionResultTask is enabled for QuestionResult task', () => {
      const settings = {
        shouldAutoCompleteQuestionResultTask: true,
        shouldAutoCompleteLeaderboardTask: false,
        shouldAutoCompletePodiumTask: false,
      }

      expect(
        (GameTaskTransitionScheduler as any).shouldSchedulePostTaskTransition(
          TaskType.QuestionResult,
          'active',
          0,
          settings,
        ),
      ).toBe(true)
    })

    it('returns true when taskStatus is active, delay is 0, and shouldAutoCompleteLeaderboardTask is enabled for Leaderboard task', () => {
      const settings = {
        shouldAutoCompleteQuestionResultTask: false,
        shouldAutoCompleteLeaderboardTask: true,
        shouldAutoCompletePodiumTask: false,
      }

      expect(
        (GameTaskTransitionScheduler as any).shouldSchedulePostTaskTransition(
          TaskType.Leaderboard,
          'active',
          0,
          settings,
        ),
      ).toBe(true)
    })

    it('returns true when taskStatus is active, delay is 0, and shouldAutoCompletePodiumTask is enabled for Podium task', () => {
      const settings = {
        shouldAutoCompleteQuestionResultTask: false,
        shouldAutoCompleteLeaderboardTask: false,
        shouldAutoCompletePodiumTask: true,
      }

      expect(
        (GameTaskTransitionScheduler as any).shouldSchedulePostTaskTransition(
          TaskType.Podium,
          'active',
          0,
          settings,
        ),
      ).toBe(true)
    })

    it('returns false when taskStatus is active, delay is 0, and no matching settings flag is enabled', () => {
      const settings = {
        shouldAutoCompleteQuestionResultTask: false,
        shouldAutoCompleteLeaderboardTask: false,
        shouldAutoCompletePodiumTask: false,
      }

      expect(
        (GameTaskTransitionScheduler as any).shouldSchedulePostTaskTransition(
          TaskType.QuestionResult,
          'active',
          0,
          settings,
        ),
      ).toBe(false)

      expect(
        (GameTaskTransitionScheduler as any).shouldSchedulePostTaskTransition(
          TaskType.Leaderboard,
          'active',
          0,
          settings,
        ),
      ).toBe(false)

      expect(
        (GameTaskTransitionScheduler as any).shouldSchedulePostTaskTransition(
          TaskType.Podium,
          'active',
          0,
          settings,
        ),
      ).toBe(false)
    })

    it('returns false when taskStatus is active, delay is 0, task is QuestionResult but only other flags are enabled', () => {
      const settings = {
        shouldAutoCompleteQuestionResultTask: false,
        shouldAutoCompleteLeaderboardTask: true,
        shouldAutoCompletePodiumTask: true,
      }

      expect(
        (GameTaskTransitionScheduler as any).shouldSchedulePostTaskTransition(
          TaskType.QuestionResult,
          'active',
          0,
          settings,
        ),
      ).toBe(false)
    })

    it('returns false when taskStatus is active, delay is 0, and task type does not match any auto-complete flags', () => {
      const settings = {
        shouldAutoCompleteQuestionResultTask: true,
        shouldAutoCompleteLeaderboardTask: true,
        shouldAutoCompletePodiumTask: true,
      }

      expect(
        (GameTaskTransitionScheduler as any).shouldSchedulePostTaskTransition(
          TaskType.Question,
          'active',
          0,
          settings,
        ),
      ).toBe(false)

      expect(
        (GameTaskTransitionScheduler as any).shouldSchedulePostTaskTransition(
          TaskType.Lobby,
          'active',
          0,
          settings,
        ),
      ).toBe(false)
    })
  })

  describe('process', () => {
    it('executes deferred transition when latest game task type/status match', async () => {
      const game = buildGameDocument(undefined, { status: 'pending' })
      const callback = jest.fn().mockResolvedValue(undefined)

      const job: Job<GameDocument, void, string> = {
        id: 'transition-job-1',
        name: TASK_TRANSITION_JOB_NAME,
        data: game,
      } as any

      gameTaskTransitionService.getTaskTransitionCallback.mockReturnValue(
        callback,
      )

      gameRepository.findGameByIDWithStatusesOrThrow.mockResolvedValue(
        buildGameDocument(
          { _id: game._id },
          { type: game.currentTask.type, status: 'pending' },
        ),
      )

      taskQueue.getJob.mockResolvedValue({ id: job.id } as any)

      const performSpy = jest
        .spyOn(scheduler as any, 'performTransition')
        .mockResolvedValue(undefined)

      await expect(scheduler.process(job)).resolves.toBeUndefined()

      expect(
        gameRepository.findGameByIDWithStatusesOrThrow,
      ).toHaveBeenCalledTimes(1)
      expect(taskQueue.remove).not.toHaveBeenCalled()

      expect(performSpy).toHaveBeenCalledTimes(1)
      expect(performSpy).toHaveBeenCalledWith(game, 'active', callback)
    })

    it('skips deferred transition when latest game task type/status do not match', async () => {
      const game = buildGameDocument(undefined, { status: 'pending' })

      const job: Job<GameDocument, void, string> = {
        id: 'transition-job-1',
        name: TASK_TRANSITION_JOB_NAME,
        data: game,
      } as any

      gameTaskTransitionService.getTaskTransitionCallback.mockReturnValue(
        jest.fn().mockResolvedValue(undefined),
      )

      gameRepository.findGameByIDWithStatusesOrThrow.mockResolvedValue(
        buildGameDocument(
          { _id: game._id },
          { type: 'Other' as any as TaskType, status: 'active' },
        ),
      )

      const performSpy = jest
        .spyOn(scheduler as any, 'performTransition')
        .mockResolvedValue(undefined)

      await expect(scheduler.process(job)).resolves.toBeUndefined()

      expect(performSpy).not.toHaveBeenCalled()
      expect(taskQueue.remove).not.toHaveBeenCalled()
      expect(logger.warn).toHaveBeenCalledTimes(1)
    })

    it('skips a deferred transition when only the task identity changed', async () => {
      const game = buildGameDocument(undefined, { status: 'pending' })
      const job: Job<GameDocument, void, string> = {
        id: 'transition-job-identity',
        name: TASK_TRANSITION_JOB_NAME,
        data: game,
      } as any

      gameTaskTransitionService.getTaskTransitionCallback.mockReturnValue(
        jest.fn().mockResolvedValue(undefined),
      )
      gameRepository.findGameByIDWithStatusesOrThrow.mockResolvedValue(
        buildGameDocument(
          { _id: game._id },
          {
            _id: 'replacement-task',
            type: game.currentTask.type,
            status: game.currentTask.status,
          },
        ),
      )
      taskQueue.getJob.mockResolvedValue({ id: job.id } as any)

      const performSpy = jest
        .spyOn(scheduler as any, 'performTransition')
        .mockResolvedValue(undefined)

      await scheduler.process(job)

      expect(performSpy).not.toHaveBeenCalled()
      expect(taskQueue.remove).toHaveBeenCalledWith(job.id)
    })

    it('propagates handler failures so BullMQ can retry the job', async () => {
      const game = buildGameDocument(undefined, { status: 'pending' })

      const job: Job<GameDocument, void, string> = {
        id: 'transition-job-1',
        name: TASK_TRANSITION_JOB_NAME,
        data: game,
      } as any

      gameTaskTransitionService.getTaskTransitionCallback.mockImplementation(
        () => {
          throw new Error('callback-fail')
        },
      )

      taskQueue.getJob.mockResolvedValue({ id: job.id } as any)

      await expect(scheduler.process(job)).rejects.toThrow('callback-fail')

      expect(taskQueue.remove).not.toHaveBeenCalled()
      expect(logger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Scheduled task transition attempt failed.',
          jobId: job.id,
          attempt: 1,
          maxAttempts: 1,
          errorCategory: 'unexpected',
        }),
      )
    })

    it('propagates persistence failures without removing the job', async () => {
      const game = buildGameDocument(undefined, { status: 'pending' })
      const job: Job<GameDocument, void, string> = {
        id: 'transition-job-1',
        name: TASK_TRANSITION_JOB_NAME,
        data: game,
      } as any

      gameTaskTransitionService.getTaskTransitionCallback.mockReturnValue(
        jest.fn().mockResolvedValue(undefined),
      )
      gameRepository.findGameByIDWithStatusesOrThrow.mockResolvedValue(game)
      gameRepository.findAndSaveWithLock.mockRejectedValue(new Error('db-fail'))

      await expect(scheduler.process(job)).rejects.toThrow('db-fail')

      expect(taskQueue.remove).not.toHaveBeenCalled()
      expect(logger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Scheduled task transition attempt failed.',
          jobId: job.id,
          errorCategory: 'unexpected',
        }),
      )
    })

    it('throws "Method not implemented." even for unrelated job names', async () => {
      const game = buildGameDocument()

      const job: Job<GameDocument, void, string> = {
        id: 'something-else',
        name: 'other',
        data: game,
      } as any

      await expect(scheduler.process(job)).rejects.toThrow(
        'Method not implemented.',
      )

      expect(
        gameRepository.findGameByIDWithStatusesOrThrow,
      ).not.toHaveBeenCalled()
      expect(taskQueue.remove).not.toHaveBeenCalled()
    })
  })
})
