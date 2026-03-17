import { GameStatus } from '@klurigo/common'
import { Job, Queue } from 'bullmq'

import { GameRepository } from '../../game-core/repositories'
import {
  GameDocument,
  TaskType,
} from '../../game-core/repositories/models/schemas'
import { GameEventPublisher } from '../../game-event/services'

import {
  GameTaskTransitionScheduler,
  TASK_QUEUE_NAME,
} from './game-task-transition-scheduler'
import { GameTaskTransitionService } from './game-task-transition.service'

describe('GameTaskTransitionScheduler', () => {
  const TASK_TRANSITION_JOB_NAME = TASK_QUEUE_NAME + 'transition'

  let scheduler: GameTaskTransitionScheduler

  let taskQueue: jest.Mocked<
    Pick<Queue<GameDocument, void, string>, 'getJob' | 'remove' | 'add'>
  >
  let gameRepository: jest.Mocked<
    Pick<
      GameRepository,
      'findAndSaveWithLock' | 'findGameByIDWithStatusesOrThrow'
    >
  >
  let gameTaskTransitionService: jest.Mocked<
    Pick<
      GameTaskTransitionService,
      'getTaskTransitionCallback' | 'getTaskTransitionDelay'
    >
  >
  let gameEventPublisher: jest.Mocked<Pick<GameEventPublisher, 'publish'>>

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
      },
      currentTask: {
        _id: 'task-1',
        type: 'Lobby' as unknown as TaskType,
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

    gameRepository = {
      findAndSaveWithLock: jest.fn(),
      findGameByIDWithStatusesOrThrow: jest.fn(),
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
      gameRepository as unknown as GameRepository,
      gameTaskTransitionService as unknown as GameTaskTransitionService,
      gameEventPublisher as unknown as GameEventPublisher,
    )
    ;(scheduler as any).logger = logger

    jest.clearAllMocks()
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

      taskQueue.getJob.mockResolvedValue({ id: 'job-1' } as any)

      const performTransitionSpy = jest
        .spyOn(scheduler as any, 'performTransition')
        .mockResolvedValue(undefined)

      await scheduler.scheduleTaskTransition(game)

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

    it('skips scheduling when an existing transition job exists and status is not active', async () => {
      const game = buildGameDocument(undefined, { status: 'pending' })

      gameTaskTransitionService.getTaskTransitionCallback.mockReturnValue(
        jest.fn().mockResolvedValue(undefined),
      )

      taskQueue.getJob.mockResolvedValue({ id: 'job-1' } as any)

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
      expect(logger.warn).toHaveBeenCalledTimes(1)
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
      expect(scheduleDeferredSpy).toHaveBeenCalledWith(game, 5_000, 'active')

      expect(performTransitionSpy).not.toHaveBeenCalled()
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

    it('logs and swallows errors when queue.add fails', async () => {
      const game = buildGameDocument(undefined, { status: 'pending' })
      taskQueue.add.mockRejectedValue(new Error('boom'))

      await (scheduler as any).scheduleDeferredTransition(game, 1_000, 'active')

      expect(logger.error).toHaveBeenCalledTimes(1)
    })
  })

  describe('performTransition', () => {
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

    it('does not run post-transition when updated task type is Quit', async () => {
      const game = buildGameDocument(undefined, { status: 'active' })

      gameRepository.findAndSaveWithLock.mockImplementation(
        async (_id, mutator) => {
          const doc = buildGameDocument(
            { _id: game._id },
            { ...game.currentTask },
          )
          const mutated = await mutator(doc as any)
          mutated.currentTask.type = TaskType.Quit
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

    it('logs errors and does not throw when repository update fails', async () => {
      const game = buildGameDocument(undefined, { status: 'pending' })

      gameRepository.findAndSaveWithLock.mockRejectedValue(new Error('db-fail'))

      await expect(
        (scheduler as any).performTransition(game, 'active'),
      ).resolves.toBeUndefined()

      expect(logger.error).toHaveBeenCalledTimes(1)
      expect(gameEventPublisher.publish).not.toHaveBeenCalled()
    })

    it('preserves transition timing fields during status transition for event publishing', async () => {
      const game = buildGameDocument(undefined, { status: 'pending' })

      const initiatedTime = new Date()
      const expiresTime = new Date(initiatedTime.getTime() + 5000)

      gameRepository.findAndSaveWithLock.mockImplementation(
        async (_id, mutator) => {
          const doc = buildGameDocument(
            { _id: game._id },
            { ...game.currentTask },
          )
          // Set transition fields to simulate they were set during scheduling
          doc.currentTask.currentTransitionInitiated = initiatedTime
          doc.currentTask.currentTransitionExpires = expiresTime
          const mutated = await mutator(doc as any)
          // Verify the mutator does NOT clear the fields (they're needed for event publishing)
          expect(mutated.currentTask.currentTransitionInitiated).toBe(
            initiatedTime,
          )
          expect(mutated.currentTask.currentTransitionExpires).toBe(expiresTime)
          mutated.currentTask.status = 'active'
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
      const game = buildGameDocument(undefined, { status: 'completed' })
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

    it('does not call setTransitionTiming when task type remains unchanged', async () => {
      const game = buildGameDocument(undefined, { status: 'pending' })
      const callback = jest.fn(async (doc: any) => {
        // Just update status, not type
        doc.currentTask.status = 'active'
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

      await (scheduler as any).performTransition(game, 'active', callback)

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
      expect(scheduleSpy).toHaveBeenCalledWith(game)
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
      expect(scheduleSpy).toHaveBeenCalledWith(game)
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
      expect(scheduleSpy).toHaveBeenCalledWith(game)
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
      expect(scheduleSpy).toHaveBeenCalledWith(game)
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
      expect(scheduleSpy).toHaveBeenCalledWith(game)
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
      expect(logger.error).toHaveBeenCalledTimes(1)
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
    it('executes deferred transition when latest game task type/status match and removes the job first', async () => {
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
      expect(taskQueue.remove).toHaveBeenCalledTimes(1)
      expect(taskQueue.remove).toHaveBeenCalledWith(job.id)

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

    it('removes job (if exists) and logs error when handler throws', async () => {
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

      await expect(scheduler.process(job)).resolves.toBeUndefined()

      expect(taskQueue.remove).toHaveBeenCalledTimes(1)
      expect(logger.error).toHaveBeenCalledTimes(1)
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
