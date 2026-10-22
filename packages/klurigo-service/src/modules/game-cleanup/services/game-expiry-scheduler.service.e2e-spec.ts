import { getQueueToken } from '@nestjs/bullmq'
import { INestApplication } from '@nestjs/common'
import { SchedulerRegistry } from '@nestjs/schedule'
import { getRedisConnectionToken } from '@nestjs-modules/ioredis'
import { Queue } from 'bullmq'
import Redis from 'ioredis'
import { MurLockService } from 'murlock'

import { cleanupTestApp, createTestApp } from '../../../../test-utils/utils'
import {
  GameAnswerRepository,
  GameRepository,
} from '../../game-core/repositories'
import { GameEventPublisher } from '../../game-event/services'
import {
  GameTaskTransitionScheduler,
  TASK_QUEUE_NAME,
  TRANSITION_RECOVERY_LOCK_LEASE_MS,
} from '../../game-task/services'
import { GameTaskTransitionService } from '../../game-task/services/game-task-transition.service'

import {
  GAME_EXPIRY_CLEANUP_LOCK_LEASE_MS,
  GameExpirySchedulerService,
} from './game-expiry-scheduler.service'

describe('GameExpirySchedulerService (e2e)', () => {
  let app: INestApplication
  let gameRepository: GameRepository
  let gameAnswerRepository: GameAnswerRepository
  let redis: Redis
  let murlock: MurLockService

  beforeEach(async () => {
    app = await createTestApp()
    for (const cron of app.get(SchedulerRegistry).getCronJobs().values()) {
      cron.stop()
    }
    gameRepository = app.get(GameRepository)
    gameAnswerRepository = app.get(GameAnswerRepository)
    redis = app.get<Redis>(getRedisConnectionToken())
    murlock = app.get(MurLockService)
  })

  afterEach(async () => {
    await cleanupTestApp(app)
  })

  it('renews the distributed cleanup lock and prevents a second instance from overlapping', async () => {
    const service = app.get(GameExpirySchedulerService)
    const secondInstance = new GameExpirySchedulerService(
      gameRepository,
      gameAnswerRepository,
      redis,
    )
    ;(
      secondInstance as unknown as {
        murlockServiceDecorator: MurLockService
      }
    ).murlockServiceDecorator = murlock

    let signalFirstUpdate!: () => void
    const firstUpdateStarted = new Promise<void>((resolve) => {
      signalFirstUpdate = resolve
    })
    let releaseFirstUpdate!: () => void
    const firstUpdateGate = new Promise<void>((resolve) => {
      releaseFirstUpdate = resolve
    })
    let updateCalls = 0
    const update = jest
      .spyOn(gameRepository, 'updateCompletedGames')
      .mockImplementation(async () => {
        updateCalls += 1
        if (updateCalls === 1) {
          signalFirstUpdate()
          await firstUpdateGate
        }
        return 0
      })
    const runWithLock = jest.spyOn(murlock, 'runWithLock')
    const firstRun = service.clean()
    let secondRun: Promise<void> | undefined

    try {
      await firstUpdateStarted
      secondRun = secondInstance.clean()
      await expect(secondRun).rejects.toThrow('Failed to obtain lock')
      expect(updateCalls).toBe(1)
      expect(await redis.pttl('scheduled_game_expiry_lock')).toBeGreaterThan(
        5_000,
      )
      const lockCalls = runWithLock.mock.calls as unknown as Array<
        [string, number]
      >
      expect(
        lockCalls.every(
          ([, lease]) => lease === GAME_EXPIRY_CLEANUP_LOCK_LEASE_MS,
        ),
      ).toBe(true)

      releaseFirstUpdate()
      await firstRun
      await secondInstance.clean()
      expect(updateCalls).toBe(2)
    } finally {
      releaseFirstUpdate()
      update.mockRestore()
      runWithLock.mockRestore()
      await Promise.allSettled([firstRun, ...(secondRun ? [secondRun] : [])])
    }
  }, 15_000)

  it('keeps recovery batches serialized across instances for longer than the old lease', async () => {
    const queue = app.get<Queue>(getQueueToken(TASK_QUEUE_NAME))
    const transitionService = app.get(GameTaskTransitionService)
    const eventPublisher = app.get(GameEventPublisher)
    const firstScheduler = app.get(GameTaskTransitionScheduler)
    const secondScheduler = new GameTaskTransitionScheduler(
      queue,
      redis,
      gameRepository,
      gameAnswerRepository,
      transitionService,
      eventPublisher,
    )
    ;(
      secondScheduler as unknown as {
        murlockServiceDecorator: MurLockService
      }
    ).murlockServiceDecorator = murlock

    let signalFirstQuery!: () => void
    const firstQueryStarted = new Promise<void>((resolve) => {
      signalFirstQuery = resolve
    })
    let releaseFirstQuery!: () => void
    const firstQueryGate = new Promise<void>((resolve) => {
      releaseFirstQuery = resolve
    })
    let queryCalls = 0
    const query = jest
      .spyOn(gameRepository, 'findGamesWithPendingTransitionOperations')
      .mockImplementation(async () => {
        queryCalls += 1
        if (queryCalls === 1) {
          signalFirstQuery()
          await firstQueryGate
        }
        return []
      })
    const runWithLock = jest.spyOn(murlock, 'runWithLock')
    const firstRun = firstScheduler.recoverPendingTransitionOperations()
    let secondRun: Promise<void> | undefined

    try {
      await firstQueryStarted
      secondRun = secondScheduler.recoverPendingTransitionOperations()
      await expect(secondRun).rejects.toThrow('Failed to obtain lock')

      expect(queryCalls).toBe(1)
      expect(
        await redis.pttl('pending_game_transition_recovery'),
      ).toBeGreaterThan(5_000)
      const lockCalls = runWithLock.mock.calls as unknown as Array<
        [string, number]
      >
      expect(
        lockCalls.every(
          ([, lease]) => lease === TRANSITION_RECOVERY_LOCK_LEASE_MS,
        ),
      ).toBe(true)

      releaseFirstQuery()
      await firstRun
      await secondScheduler.recoverPendingTransitionOperations()
      expect(queryCalls).toBe(2)
    } finally {
      releaseFirstQuery()
      query.mockRestore()
      runWithLock.mockRestore()
      await Promise.allSettled([firstRun, ...(secondRun ? [secondRun] : [])])
    }
  }, 15_000)
})
