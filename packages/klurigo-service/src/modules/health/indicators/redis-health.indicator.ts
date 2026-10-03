import { Injectable } from '@nestjs/common'
import {
  type HealthIndicatorResult,
  HealthIndicatorService,
} from '@nestjs/terminus'
import { InjectRedis } from '@nestjs-modules/ioredis'
import Redis from 'ioredis'

@Injectable()
export class RedisHealthIndicator {
  constructor(
    private readonly healthIndicatorService: HealthIndicatorService,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  async pingCheck(key: string): Promise<HealthIndicatorResult> {
    const indicator = this.healthIndicatorService.check(key)

    try {
      await this.redis.ping()
      return indicator.up()
    } catch {
      return indicator.down()
    }
  }
}
