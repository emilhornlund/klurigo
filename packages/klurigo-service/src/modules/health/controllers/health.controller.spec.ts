import {
  HealthCheckResult,
  HealthCheckService,
  MongooseHealthIndicator,
} from '@nestjs/terminus'
import { Test } from '@nestjs/testing'

import { RedisHealthIndicator } from '../indicators'

import { HealthController } from './health.controller'

describe('HealthController', () => {
  let controller: HealthController

  let healthCheckService: { check: jest.Mock }
  let mongooseHealthIndicator: { pingCheck: jest.Mock }
  let redisHealthIndicator: { pingCheck: jest.Mock }

  beforeEach(async () => {
    healthCheckService = { check: jest.fn() }
    mongooseHealthIndicator = { pingCheck: jest.fn() }
    redisHealthIndicator = { pingCheck: jest.fn() }

    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: HealthCheckService, useValue: healthCheckService },
        { provide: MongooseHealthIndicator, useValue: mongooseHealthIndicator },
        { provide: RedisHealthIndicator, useValue: redisHealthIndicator },
      ],
    }).compile()

    controller = moduleRef.get(HealthController)
  })

  it('calls HealthCheckService.check with two indicator functions (mongodb, redis) and returns its result', async () => {
    const expected: HealthCheckResult = {
      status: 'ok',
      info: {
        mongodb: { status: 'up' },
        redis: { status: 'up' },
      },
      error: {},
      details: {
        mongodb: { status: 'up' },
        redis: { status: 'up' },
      },
    }

    healthCheckService.check.mockResolvedValue(expected)

    const result = await controller.check()

    expect(result).toBe(expected)
    expect(healthCheckService.check).toHaveBeenCalledTimes(1)

    const [indicators] = healthCheckService.check.mock.calls[0]
    expect(Array.isArray(indicators)).toBe(true)
    expect(indicators).toHaveLength(2)
    expect(indicators[0]).toEqual(expect.any(Function))
    expect(indicators[1]).toEqual(expect.any(Function))

    mongooseHealthIndicator.pingCheck.mockResolvedValue({
      mongodb: { status: 'up' },
    })
    redisHealthIndicator.pingCheck.mockResolvedValue({
      redis: { status: 'up' },
    })

    await expect(indicators[0]()).resolves.toEqual({
      mongodb: { status: 'up' },
    })
    await expect(indicators[1]()).resolves.toEqual({ redis: { status: 'up' } })

    expect(mongooseHealthIndicator.pingCheck).toHaveBeenCalledTimes(1)
    expect(mongooseHealthIndicator.pingCheck).toHaveBeenCalledWith('mongodb')

    expect(redisHealthIndicator.pingCheck).toHaveBeenCalledTimes(1)
    expect(redisHealthIndicator.pingCheck).toHaveBeenCalledWith('redis')
  })

  it('propagates errors from HealthCheckService.check', async () => {
    const err = new Error('boom')
    healthCheckService.check.mockRejectedValue(err)

    await expect(controller.check()).rejects.toThrow('boom')
    expect(healthCheckService.check).toHaveBeenCalledTimes(1)
  })

  it('uses the same dependency checks for the explicit readiness endpoint', async () => {
    const expected: HealthCheckResult = {
      status: 'ok',
      info: {
        mongodb: { status: 'up' },
        redis: { status: 'up' },
      },
      error: {},
      details: {
        mongodb: { status: 'up' },
        redis: { status: 'up' },
      },
    }
    healthCheckService.check.mockResolvedValue(expected)

    await expect(controller.readiness()).resolves.toBe(expected)
    expect(healthCheckService.check).toHaveBeenCalledTimes(1)
  })

  it('reports liveness without checking external dependencies', () => {
    expect(controller.liveness()).toEqual({
      status: 'ok',
      info: {},
      error: {},
      details: {},
    })
    expect(healthCheckService.check).not.toHaveBeenCalled()
    expect(mongooseHealthIndicator.pingCheck).not.toHaveBeenCalled()
    expect(redisHealthIndicator.pingCheck).not.toHaveBeenCalled()
  })
})
