import supertest from 'supertest'

import {
  createBearerAuthHeader,
  expectErrorResponse,
} from '../../../test-utils/utils/request.utils'

describe('backend e2e request helpers', () => {
  it('creates a Bearer Authorization header', () => {
    expect(createBearerAuthHeader('access-token')).toEqual({
      Authorization: 'Bearer access-token',
    })
  })

  it('asserts standard error fields and preserves route-specific fields', () => {
    const response = {
      body: {
        message: 'Validation failed',
        status: 400,
        timestamp: '2025-01-01T00:00:00.000Z',
        validationErrors: [{ property: 'email' }],
      },
    } as supertest.Response

    expectErrorResponse(response, {
      message: 'Validation failed',
      status: 400,
      validationErrors: [{ property: 'email' }],
    })
  })
})
