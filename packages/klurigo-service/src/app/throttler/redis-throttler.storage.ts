import type { ThrottlerStorage } from '@nestjs/throttler'
import type { ThrottlerStorageRecord } from '@nestjs/throttler/dist/throttler-storage-record.interface'
import type Redis from 'ioredis'

const incrementScript = `
  local hitKey = KEYS[1]
  local blockKey = KEYS[2]
  local ttl = tonumber(ARGV[2])
  local limit = tonumber(ARGV[3])
  local blockDuration = tonumber(ARGV[4])

  local totalHits = redis.call('INCR', hitKey)
  local timeToExpire = redis.call('PTTL', hitKey)

  if timeToExpire <= 0 then
    redis.call('PEXPIRE', hitKey, ttl)
    timeToExpire = ttl
  end

  local isBlocked = redis.call('GET', blockKey)
  local timeToBlockExpire = 0

  if isBlocked then
    timeToBlockExpire = redis.call('PTTL', blockKey)
  elseif totalHits > limit then
    redis.call('SET', blockKey, 1, 'PX', blockDuration)
    isBlocked = '1'
    timeToBlockExpire = blockDuration
  end

  if isBlocked and timeToBlockExpire <= 0 then
    redis.call('DEL', blockKey)
    redis.call('SET', hitKey, 1, 'PX', ttl)
    totalHits = 1
    timeToExpire = ttl
    isBlocked = false
  end

  return { totalHits, timeToExpire, isBlocked and 1 or 0, timeToBlockExpire }
`.replace(/^\s+/gm, '')

export class RedisThrottlerStorage implements ThrottlerStorage {
  constructor(private readonly redis: Redis) {}

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    const hitKey = `{${key}:${throttlerName}}:hits`
    const blockKey = `{${key}:${throttlerName}}:blocked`
    const result = await this.redis.eval(
      incrementScript,
      2,
      hitKey,
      blockKey,
      throttlerName,
      ttl,
      limit,
      blockDuration,
    )

    if (!Array.isArray(result) || result.length !== 4) {
      throw new TypeError(
        `Expected Redis throttler result to be an array of four values, got ${result}`,
      )
    }

    const [totalHits, timeToExpire, isBlocked, timeToBlockExpire] = result
    if (!result.every((value) => typeof value === 'number')) {
      throw new TypeError(
        'Expected Redis throttler result values to be numbers',
      )
    }

    return {
      totalHits,
      timeToExpire: Math.ceil(timeToExpire / 1000),
      isBlocked: isBlocked === 1,
      timeToBlockExpire: Math.ceil(timeToBlockExpire / 1000),
    }
  }
}
