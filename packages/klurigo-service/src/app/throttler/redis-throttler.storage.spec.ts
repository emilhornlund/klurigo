import type Redis from 'ioredis'

import { RedisThrottlerStorage } from './redis-throttler.storage'

describe('RedisThrottlerStorage', () => {
  it('increments the throttler state atomically and converts expiry to seconds', async () => {
    const redis = {
      eval: jest.fn().mockResolvedValue([3, 1499, 1, 5000]),
    } as unknown as Redis
    const storage = new RedisThrottlerStorage(redis)

    await expect(
      storage.increment('client-key', 1000, 2, 5000, 'short'),
    ).resolves.toEqual({
      totalHits: 3,
      timeToExpire: 2,
      isBlocked: true,
      timeToBlockExpire: 5,
    })

    expect(redis.eval).toHaveBeenCalledWith(
      expect.stringContaining("redis.call('INCR', hitKey)"),
      2,
      '{client-key:short}:hits',
      '{client-key:short}:blocked',
      'short',
      1000,
      2,
      5000,
    )
  })

  it('rejects malformed Redis results', async () => {
    const redis = {
      eval: jest.fn().mockResolvedValue(['3', 1499, 1, 5000]),
    } as unknown as Redis
    const storage = new RedisThrottlerStorage(redis)

    await expect(
      storage.increment('client-key', 1000, 2, 5000, 'short'),
    ).rejects.toThrow('Expected Redis throttler result values to be numbers')
  })
})
