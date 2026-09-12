import { HealthCheckError } from '@nestjs/terminus'
import Redis from 'ioredis'

import { RedisHealthIndicator } from './redis-health.indicator'

describe('RedisHealthIndicator', () => {
  let redis: Pick<Redis, 'ping'>
  let indicator: RedisHealthIndicator

  beforeEach(() => {
    redis = {
      ping: jest.fn(),
    } as unknown as Pick<Redis, 'ping'>

    indicator = new RedisHealthIndicator(redis as Redis)
  })

  it('returns status up when redis.ping succeeds', async () => {
    ;(redis.ping as jest.Mock).mockResolvedValue('PONG')

    await expect(indicator.pingCheck('redis')).resolves.toEqual({
      redis: { status: 'up' },
    })

    expect(redis.ping).toHaveBeenCalledTimes(1)
  })

  it('throws HealthCheckError with status down without exposing the redis error', async () => {
    ;(redis.ping as jest.Mock).mockRejectedValue(
      new Error('redis://:secret-password@redis:6379 connection timeout'),
    )

    try {
      await indicator.pingCheck('redis')
      fail('Expected pingCheck to throw')
    } catch (err) {
      expect(err).toBeInstanceOf(HealthCheckError)

      const hcErr = err as HealthCheckError
      expect(hcErr.message).toBe('Redis check failed')
      expect(hcErr.causes).toEqual({
        redis: {
          status: 'down',
        },
      })
      expect(JSON.stringify(hcErr.causes)).not.toContain('secret-password')
    }

    expect(redis.ping).toHaveBeenCalledTimes(1)
  })
})
