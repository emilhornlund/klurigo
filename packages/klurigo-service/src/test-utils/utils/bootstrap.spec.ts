import { INestApplication } from '@nestjs/common'
import { getConnectionToken } from '@nestjs/mongoose'
import { getRedisConnectionToken } from '@nestjs-modules/ioredis'
import { Redis } from 'ioredis'
import { Connection } from 'mongoose'

import {
  closeTestApp,
  resetTestState,
} from '../../../test-utils/utils/bootstrap'

type TestDependencies = {
  app: INestApplication
  close: jest.Mock
  dropCollection: jest.Mock
  flushdb: jest.Mock
  listCollections: jest.Mock
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
  const redis = { flushdb } as unknown as Redis
  const get = jest.fn((token: unknown) =>
    token === getConnectionToken() && token !== getRedisConnectionToken()
      ? connection
      : redis,
  )
  const app = { close, get } as unknown as INestApplication

  return { app, close, dropCollection, flushdb, listCollections }
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
    const { app, close, dropCollection, flushdb } = createTestDependencies()
    dropCollection.mockImplementation(async () => {
      events.push('mongo')
    })
    flushdb.mockImplementation(async () => {
      events.push('redis')
    })
    close.mockImplementation(async () => {
      events.push('close')
    })

    await resetTestState(app)
    await closeTestApp(app)

    expect(events).toEqual(expect.arrayContaining(['mongo', 'redis']))
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

  it('propagates application shutdown failures independently', async () => {
    const { app, close } = createTestDependencies()
    const error = new Error('Application shutdown failed')
    close.mockRejectedValue(error)

    await expect(closeTestApp(app)).rejects.toBe(error)
  })
})
