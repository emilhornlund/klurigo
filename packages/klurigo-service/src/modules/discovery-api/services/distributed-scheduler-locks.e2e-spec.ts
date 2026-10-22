import { randomUUID } from 'node:crypto'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { INestApplication } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { getRedisConnectionToken } from '@nestjs-modules/ioredis'
import type { Redis } from 'ioredis'
import { MurLockService } from 'murlock'

import {
  cleanupTestApp,
  createTestApp,
  resetTestState,
} from '../../../../test-utils/utils'
import {
  ORPHANED_IMAGE_CLEANUP_LOCK_LEASE_MS,
  OrphanedImageCleanupService,
} from '../../media/services'

import { DiscoveryComputeService } from './discovery-compute.service'
import {
  DISCOVERY_SNAPSHOT_LOCK_LEASE_MS,
  DiscoverySchedulerService,
} from './discovery-scheduler.service'

describe('distributed scheduled-job locks (e2e)', () => {
  let app: INestApplication

  beforeAll(async () => {
    app = await createTestApp()
  })

  beforeEach(async () => {
    await resetTestState(app)
  })

  afterAll(async () => {
    await cleanupTestApp(app)
  })

  it('serializes slow discovery work and releases its lock after failure', async () => {
    const scheduler = app.get(DiscoverySchedulerService)
    const computeService = app.get(DiscoveryComputeService)
    const lockService = app.get(MurLockService)
    const runWithLock = jest.spyOn(lockService, 'runWithLock')

    let signalComputeStarted!: () => void
    const computeStarted = new Promise<void>((resolve) => {
      signalComputeStarted = resolve
    })
    let releaseCompute!: () => void
    const computeGate = new Promise<void>((resolve) => {
      releaseCompute = resolve
    })
    const compute = jest
      .spyOn(computeService, 'compute')
      .mockImplementationOnce(async () => {
        signalComputeStarted()
        await computeGate
      })

    const firstRefresh = scheduler.refreshSnapshot()
    let secondRefresh: Promise<void> | undefined
    try {
      await computeStarted
      secondRefresh = scheduler.refreshSnapshot()

      await expect(secondRefresh).rejects.toThrow(
        'Failed to obtain lock for key discovery_snapshot_lock',
      )
      expect(compute).toHaveBeenCalledTimes(1)
      expect(runWithLock.mock.calls[0]?.[0]).toBe('discovery_snapshot_lock')
      expect(runWithLock.mock.calls[0]?.[1]).toBe(
        DISCOVERY_SNAPSHOT_LOCK_LEASE_MS,
      )
      expect(DISCOVERY_SNAPSHOT_LOCK_LEASE_MS).toBeLessThan(12 * 60 * 60 * 1000)

      releaseCompute()
      await firstRefresh

      compute.mockReset()
      compute.mockRejectedValueOnce(new Error('temporary compute failure'))
      await expect(scheduler.refreshSnapshot()).rejects.toThrow(
        'temporary compute failure',
      )
      compute.mockResolvedValueOnce(undefined)
      await expect(scheduler.refreshSnapshot()).resolves.toBeUndefined()
    } finally {
      releaseCompute()
      await Promise.allSettled([
        firstRefresh,
        ...(secondRefresh ? [secondRefresh] : []),
      ])
      compute.mockRestore()
      runWithLock.mockRestore()
    }
  }, 10_000)

  it('uses a daily cleanup lease shorter than its schedule and allows a later run', async () => {
    const cleanup = app.get(OrphanedImageCleanupService)
    const config = app.get(ConfigService)
    const lockService = app.get(MurLockService)
    const runWithLock = jest.spyOn(lockService, 'runWithLock')
    const uploadDirectory = await mkdtemp(
      join(tmpdir(), 'klurigo-orphaned-image-lock-'),
    )
    config.set('UPLOAD_DIRECTORY', join(uploadDirectory, 'missing'))

    try {
      await cleanup.clean()
      config.set('UPLOAD_DIRECTORY', uploadDirectory)
      await cleanup.clean()

      expect(ORPHANED_IMAGE_CLEANUP_LOCK_LEASE_MS).toBeLessThan(
        24 * 60 * 60 * 1000,
      )
      const cleanupCalls = runWithLock.mock.calls as unknown as Array<
        [string, number, unknown?, unknown?]
      >
      expect(
        cleanupCalls.filter(
          ([lockKey]) => lockKey === 'scheduled_orphaned_image_cleanup_lock',
        ),
      ).toHaveLength(2)
      expect(
        cleanupCalls
          .filter(
            ([lockKey]) => lockKey === 'scheduled_orphaned_image_cleanup_lock',
          )
          .every((call) => call[1] === ORPHANED_IMAGE_CLEANUP_LOCK_LEASE_MS),
      ).toBe(true)
    } finally {
      runWithLock.mockRestore()
      await rm(uploadDirectory, { recursive: true, force: true })
    }
  })

  it('allows a later owner after an abandoned MurLock lease expires', async () => {
    const lockService = app.get(MurLockService)
    const redis = app.get<Redis>(getRedisConnectionToken())
    const lockKey = `bst-06-abandoned-lock-${randomUUID()}`
    const firstClientId = randomUUID()
    const lockInternals = lockService as unknown as {
      lock: (
        key: string,
        releaseTime: number,
        clientId: string,
        wait?: number,
      ) => Promise<boolean>
    }

    expect(lockService.options.autoExtend).not.toBe(true)
    await expect(lockInternals.lock(lockKey, 150, firstClientId)).resolves.toBe(
      true,
    )
    await expect(redis.pttl(lockKey)).resolves.toBeGreaterThan(0)

    const deadline = Date.now() + 3_000
    let remainingTtl = await redis.pttl(lockKey)
    while (remainingTtl >= 0 && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 20))
      remainingTtl = await redis.pttl(lockKey)
    }
    expect(remainingTtl).toBe(-2)

    await expect(
      lockService.runWithLock(lockKey, 150, async () => undefined),
    ).resolves.toBeUndefined()
  })
})
