import * as Sentry from '@sentry/react'

import { ApiError } from '../api/api.utils'

const EXPECTED_AUTH_FAILURE_STATUSES = new Set([400, 401, 403, 409, 422])

/** Report unexpected authentication failures while leaving HTTP client errors to the UI. */
export const reportUnexpectedAuthError = (error: unknown): void => {
  if (
    error instanceof ApiError &&
    EXPECTED_AUTH_FAILURE_STATUSES.has(error.status)
  ) {
    return
  }

  Sentry.captureException(error)
}
