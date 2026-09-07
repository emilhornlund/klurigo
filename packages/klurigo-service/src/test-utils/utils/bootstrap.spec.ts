import { INestApplication } from '@nestjs/common'
import { getConnectionToken } from '@nestjs/mongoose'
import { getRedisConnectionToken } from '@nestjs-modules/ioredis'
import { Redis } from 'ioredis'
import { Connection } from 'mongoose'

import {
  cleanupTestApp,
  closeTestApp,
  resetTestState,
} from '../../../test-utils/utils/bootstrap'

type TestDependencies = {
  app: INestApplication
  close: jest.Mock
  dropCollection: jest.Mock
  flushdb: jest.Mock
  listCollections: jest.Mock
  quit: jest.Mock
}

function createTestDependencies(): TestDependencies {
  const close = jest.fn().mockResolvedValue(undefined)
  const dropCollection = jest.fn().mockResolvedValue(undefined)
  const flushdb = jest.fn().mockResolvedValue('OK')
  const listCollections = jest
    .fn()
    .mockResolvedValue([{ name: 'users' }, { name: 'games' }])
  const connection = {
    dropCollection,
    listCollections,
  } as unknown as Connection
  const quit = jest.fn().mockResolvedValue('OK')
  const redis = { flushdb, quit, status: 'ready' } as unknown as Redis
  const get = jest.fn((token: unknown) =>
    token === getConnectionToken() && token !== getRedisConnectionToken()
      ? connection
      : redis,
  )
  const app = { close, get } as unknown as INestApplication

  return { app, close, dropCollection, flushdb, listCollections, quit }
}

describe('backend e2e lifecycle helpers', () => {
  it('resets every MongoDB collection and the Redis database without closing the app', async () => {
    const { app, close, dropCollection, flushdb, listCollections } =
      createTestDependencies()

    await resetTestState(app)

    expect(listCollections).toHaveBeenCalledTimes(1)
    expect(dropCollection).toHaveBeenCalledWith('users')
    expect(dropCollection).toHaveBeenCalledWith('games')
    expect(flushdb).toHaveBeenCalledTimes(1)
    expect(close).not.toHaveBeenCalled()
  })

  it('supports an explicit reset-then-shutdown lifecycle', async () => {
    const events: string[] = []
    const { app, close, dropCollection, flushdb, listCollections } =
      createTestDependencies()
    listCollections.mockImplementation(async () => {
      events.push('listCollections')
      return [{ name: 'users' }, { name: 'games' }]
    })
    dropCollection.mockImplementation(async () => {
      events.push('dropCollection')
    })
    flushdb.mockImplementation(async () => {
      events.push('flushdb')
    })
    close.mockImplementation(async () => {
      events.push('close')
    })

    await resetTestState(app)
    await closeTestApp(app)

    expect(events).toHaveLength(5)
    expect(events[0]).toBe('listCollections')
    expect(events).toContain('dropCollection')
    expect(events).toContain('flushdb')
    expect(events.at(-1)).toBe('close')
  })

  it('reports MongoDB reset failures and still attempts Redis cleanup', async () => {
    const { app, flushdb, listCollections } = createTestDependencies()
    listCollections.mockRejectedValue(new Error('MongoDB unavailable'))

    await expect(resetTestState(app)).rejects.toThrow(
      'Failed to reset MongoDB e2e state.',
    )
    expect(flushdb).toHaveBeenCalledTimes(1)
  })

  it('reports Redis reset failures', async () => {
    const { app, flushdb } = createTestDependencies()
    flushdb.mockRejectedValue(new Error('Redis unavailable'))

    await expect(resetTestState(app)).rejects.toThrow(
      'Failed to reset Redis e2e state.',
    )
  })

  it('reports both reset failures while attempting both cleanup operations', async () => {
    const { app, flushdb, listCollections } = createTestDependencies()
    listCollections.mockRejectedValue(new Error('MongoDB unavailable'))
    flushdb.mockRejectedValue(new Error('Redis unavailable'))

    await expect(resetTestState(app)).rejects.toMatchObject({
      message: 'Failed to reset backend e2e state.',
      errors: [
        expect.objectContaining({
          message: 'Failed to reset MongoDB e2e state.',
        }),
        expect.objectContaining({
          message: 'Failed to reset Redis e2e state.',
        }),
      ],
    })
    expect(flushdb).toHaveBeenCalledTimes(1)
  })

  it('still closes the app when suite cleanup reset fails', async () => {
    const { app, close, listCollections } = createTestDependencies()
    listCollections.mockRejectedValue(new Error('MongoDB unavailable'))

    await expect(cleanupTestApp(app)).rejects.toThrow(
      'Failed to reset MongoDB e2e state.',
    )

    expect(close).toHaveBeenCalledTimes(1)
  })

  it('preserves reset and shutdown failures when both cleanup steps fail', async () => {
    const { app, close, listCollections } = createTestDependencies()
    const closeError = new Error('Application shutdown failed')
    listCollections.mockRejectedValue(new Error('MongoDB unavailable'))
    close.mockRejectedValue(closeError)

    await expect(cleanupTestApp(app)).rejects.toMatchObject({
      message: 'Failed to clean up backend e2e application.',
      errors: [
        expect.objectContaining({
          message: 'Failed to reset MongoDB e2e state.',
        }),
        expect.objectContaining({
          message: 'Failed to close backend e2e application.',
          cause: closeError,
        }),
      ],
    })
  })

  it('propagates application shutdown failures independently', async () => {
    const { app, close, quit } = createTestDependencies()
    const error = new Error('Application shutdown failed')
    close.mockRejectedValue(error)

    await expect(closeTestApp(app)).rejects.toMatchObject({
      message: 'Failed to close backend e2e application.',
      cause: error,
    })
    expect(quit).toHaveBeenCalledTimes(1)
  })

  it('closes the primary Redis connection left outside Nest module state', async () => {
    const { app, quit } = createTestDependencies()

    await closeTestApp(app)

    expect(quit).toHaveBeenCalledTimes(1)
  })
})
