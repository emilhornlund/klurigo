import { Controller, Get } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import {
  HealthCheck,
  HealthCheckService,
  MongooseHealthIndicator,
} from '@nestjs/terminus'
import type { HealthCheckResult } from '@nestjs/terminus'

import { Public } from '../../authentication/controllers/decorators'
import { RedisHealthIndicator } from '../indicators'

@Public()
@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly mongoose: MongooseHealthIndicator,
    private readonly redis: RedisHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  async check(): Promise<HealthCheckResult> {
    return this.checkDependencies()
  }

  @Get('ready')
  @HealthCheck()
  async readiness(): Promise<HealthCheckResult> {
    return this.checkDependencies()
  }

  @Get('live')
  @HealthCheck()
  liveness(): HealthCheckResult {
    return {
      status: 'ok',
      info: {},
      error: {},
      details: {},
    }
  }

  private checkDependencies(): Promise<HealthCheckResult> {
    return this.health.check([
      // MongoDB check
      async () => this.mongoose.pingCheck('mongodb'),

      // Redis check
      async () => this.redis.pingCheck('redis'),
    ])
  }
}
