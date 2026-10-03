/* eslint-disable @typescript-eslint/no-require-imports */
const {
  Injectable,
  Module,
  ServiceUnavailableException,
} = require('@nestjs/common')
const { ModuleRef } = require('@nestjs/core')
const { getConnectionToken } = require('@nestjs/mongoose')

class HealthIndicatorService {
  check(key) {
    return {
      up: (data) => ({ [key]: { ...data, status: 'up' } }),
      down: (data) => ({ [key]: { ...data, status: 'down' } }),
    }
  }
}

class MongooseHealthIndicator {
  constructor(moduleRef, healthIndicatorService) {
    this.moduleRef = moduleRef
    this.healthIndicatorService = healthIndicatorService
  }

  async pingCheck(key) {
    const indicator = this.healthIndicatorService.check(key)
    try {
      const connection = this.moduleRef.get(
        getConnectionToken('DatabaseConnection'),
        {
          strict: false,
        },
      )
      if (!connection || connection.readyState !== 1) {
        throw new Error('MongoDB is not connected')
      }
      await connection.db.command({ ping: 1 })
      return indicator.up()
    } catch {
      return indicator.down()
    }
  }
}

class HealthCheckService {
  async check(indicators) {
    const results = await Promise.all(
      indicators.map((indicator) => indicator()),
    )
    const details = Object.assign({}, ...results)
    const error = Object.fromEntries(
      Object.entries(details).filter(([, value]) => value.status === 'down'),
    )
    if (Object.keys(error).length > 0) {
      throw new ServiceUnavailableException({
        status: 'error',
        info: {},
        error,
        details,
      })
    }
    return { status: 'ok', info: details, error: {}, details }
  }
}

Injectable()(HealthIndicatorService)
Injectable()(HealthCheckService)
Injectable()(MongooseHealthIndicator)
Reflect.defineMetadata(
  'design:paramtypes',
  [ModuleRef, HealthIndicatorService],
  MongooseHealthIndicator,
)

class TerminusModule {}
Module({
  providers: [HealthCheckService, HealthIndicatorService],
  exports: [HealthCheckService, HealthIndicatorService],
})(TerminusModule)

const HealthCheck = () => () => undefined

module.exports = {
  HealthCheck,
  HealthCheckService,
  HealthIndicatorService,
  MongooseHealthIndicator,
  TerminusModule,
}
