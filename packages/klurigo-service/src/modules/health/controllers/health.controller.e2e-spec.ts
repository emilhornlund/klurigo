import { INestApplication } from '@nestjs/common'
import request from 'supertest'

import { cleanupTestApp, createTestApp } from '../../../../test-utils/utils'

describe('HealthController (e2e)', () => {
  let app: INestApplication

  beforeAll(async () => {
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
})
