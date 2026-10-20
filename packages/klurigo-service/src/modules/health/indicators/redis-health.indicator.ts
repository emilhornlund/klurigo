import { Injectable } from '@nestjs/common'
import {
  type HealthIndicatorResult,
  HealthIndicatorService,
} from '@nestjs/terminus'
import { InjectRedis } from '@nestjs-modules/ioredis'
import Redis from 'ioredis'

const REDIS_HEALTH_CHECK_TIMEOUT_MS = 1_000

@Injectable()
export class RedisHealthIndicator {
  constructor(
    private readonly healthIndicatorService: HealthIndicatorService,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  async pingCheck(key: string): Promise<HealthIndicatorResult> {
    const indicator = this.healthIndicatorService.check(key)
    let timeout: ReturnType<typeof setTimeout> | undefined

    try {
      await Promise.race([
        this.redis.ping(),
        new Promise<never>((_, reject) => {
          timeout = setTimeout(
            () => reject(new Error('Redis health check timed out')),
            REDIS_HEALTH_CHECK_TIMEOUT_MS,
          )
        }),
      ])
      return indicator.up()
    } catch {
      return indicator.down()
    } finally {
      if (timeout) clearTimeout(timeout)
    }
  }
}
