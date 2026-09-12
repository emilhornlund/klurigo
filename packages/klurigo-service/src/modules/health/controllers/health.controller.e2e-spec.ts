import { INestApplication } from '@nestjs/common'
import { HealthCheckError } from '@nestjs/terminus'
import type { MongooseHealthIndicator } from '@nestjs/terminus'
import request from 'supertest'

import { cleanupTestApp, createTestApp } from '../../../../test-utils/utils'
import type { RedisHealthIndicator } from '../indicators'

import { HealthController } from './health.controller'

describe('HealthController (e2e)', () => {
  let app: INestApplication

  beforeEach(async () => {
    app = await createTestApp()
  })

  afterEach(async () => {
    await cleanupTestApp(app)
  })

  it('GET /health returns 200 with mongodb + redis status up', async () => {
    return request(app.getHttpServer())
      .get(`/health`)
      .expect(200)
      .expect((res) => {
        expect(res.body).toEqual({
          details: {
            mongodb: {
              status: 'up',
            },
            redis: {
              status: 'up',
            },
          },
          error: {},
          info: {
            mongodb: {
              status: 'up',
            },
            redis: {
              status: 'up',
            },
          },
          status: 'ok',
        })
      })
  })

  it('GET /health/ready returns 200 when dependencies are available', async () => {
    return request(app.getHttpServer())
      .get('/health/ready')
      .expect(200)
      .expect((res) => {
        expect(res.body.status).toBe('ok')
        expect(res.body.details).toEqual({
          mongodb: { status: 'up' },
          redis: { status: 'up' },
        })
      })
  })

  it('GET /health/live returns 200 even when dependencies are unavailable', async () => {
    const { mongoose, redis } = app.get(HealthController) as unknown as {
      mongoose: MongooseHealthIndicator
      redis: RedisHealthIndicator
    }
    const mongoosePingCheck = jest.spyOn(mongoose, 'pingCheck')
    const redisPingCheck = jest.spyOn(redis, 'pingCheck')
    mongoosePingCheck.mockRejectedValue(
      new HealthCheckError('MongoDB check failed', {
        mongodb: { status: 'down' },
      }),
    )
    redisPingCheck.mockRejectedValue(
      new HealthCheckError('Redis check failed', {
        redis: { status: 'down' },
      }),
    )

    try {
      await request(app.getHttpServer())
        .get('/health/live')
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual({
            status: 'ok',
            info: {},
            error: {},
            details: {},
          })
        })
    } finally {
      mongoosePingCheck.mockRestore()
      redisPingCheck.mockRestore()
    }
  })

  it('GET /health/ready returns 503 when MongoDB is unavailable', async () => {
    const { mongoose } = app.get(HealthController) as unknown as {
      mongoose: MongooseHealthIndicator
    }
    const pingCheck = jest.spyOn(mongoose, 'pingCheck').mockRejectedValue(
      new HealthCheckError('MongoDB check failed', {
        mongodb: { status: 'down' },
      }),
    )

    try {
      await request(app.getHttpServer())
        .get('/health/ready')
        .expect(503)
        .expect((res) => {
          expect(res.body.status).toBe(503)
          expect(JSON.stringify(res.body)).not.toContain('secret-password')
        })
    } finally {
      pingCheck.mockRestore()
    }
  })

  it('GET /health/ready returns 503 when Redis is unavailable', async () => {
    const { redis } = app.get(HealthController) as unknown as {
      redis: RedisHealthIndicator
    }
    const pingCheck = jest.spyOn(redis, 'pingCheck').mockRejectedValue(
      new HealthCheckError('Redis check failed', {
        redis: { status: 'down' },
      }),
    )

    try {
      await request(app.getHttpServer())
        .get('/health/ready')
        .expect(503)
        .expect((res) => {
          expect(res.body.status).toBe(503)
          expect(JSON.stringify(res.body)).not.toContain('secret-password')
        })
    } finally {
      pingCheck.mockRestore()
    }
  })
})
