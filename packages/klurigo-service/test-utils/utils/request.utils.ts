import type { Response } from 'superagent'

type BearerAuthHeader = {
  Authorization: string
}

type ErrorResponseExpectation = {
  message: string
  status: number
  [key: string]: unknown
}

/**
 * Builds the standard Authorization header for authenticated e2e requests.
 * Tests that need missing, invalid, or alternate authorization values should
 * continue setting those headers explicitly.
 */
export function createBearerAuthHeader(accessToken: string): BearerAuthHeader {
  return { Authorization: `Bearer ${accessToken}` }
}

/**
 * Asserts the exact API error envelope while allowing route-specific fields.
 */
export function expectErrorResponse(
  response: Response,
  expected: ErrorResponseExpectation,
): void {
  expect(response.body).toEqual({
    ...expected,
    timestamp: expect.any(String),
  })
}
