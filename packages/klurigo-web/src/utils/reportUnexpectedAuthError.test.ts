import * as Sentry from '@sentry/react'
import { describe, expect, it, vi } from 'vitest'

import { ApiError } from '../api/api.utils'

import { reportUnexpectedAuthError } from './reportUnexpectedAuthError'

vi.mock('@sentry/react', () => ({
  captureException: vi.fn(),
}))

describe('reportUnexpectedAuthError', () => {
  it('does not report HTTP client errors handled by the authentication UI', () => {
    reportUnexpectedAuthError(new ApiError('Bad credentials', 401))
    reportUnexpectedAuthError(new ApiError('Validation failed', 400))
    reportUnexpectedAuthError(new ApiError('Account already exists', 409))

    expect(Sentry.captureException).not.toHaveBeenCalled()
  })

  it('reports server, network, and unexpected application errors', () => {
    const errors = [
      new ApiError('Server error', 500),
      new ApiError('Endpoint not found', 404),
      new TypeError('Network request failed'),
      new Error('Unexpected failure'),
    ]

    errors.forEach(reportUnexpectedAuthError)

    expect(Sentry.captureException).toHaveBeenCalledTimes(errors.length)
    errors.forEach((error, index) => {
      expect(Sentry.captureException).toHaveBeenNthCalledWith(index + 1, error)
    })
  })
})
