import type { Mock } from 'vitest'
// eslint-disable-next-line import/order
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('jwt-decode', () => ({
  jwtDecode: vi.fn(),
}))
vi.mock('../config', () => ({
  default: { klurigoServiceUrl: 'https://api.example.com' },
}))

// eslint-disable-next-line import/order
import { jwtDecode } from 'jwt-decode'

import config from '../config'

import {
  ApiError,
  isTokenExpired,
  parseQueryParams,
  parseResponseAndHandleError,
  resolveUrl,
} from './api.utils'

// Helper to build a minimal Response-like object
const makeResponse = (opts: {
  ok: boolean
  status: number
  body?: unknown
}): Response =>
  ({
    ok: opts.ok,
    status: opts.status,
    json: vi.fn(async () => opts.body),
  }) as unknown as Response

describe('resolveUrl', () => {
  afterEach(() => {
    // reset base URL mock after each test
    config.klurigoServiceUrl = 'https://api.example.com'
  })

  it('joins when base has no trailing slash and path has no leading slash', () => {
    config.klurigoServiceUrl = 'https://api.example.com'
    expect(resolveUrl('v1/games')).toBe('https://api.example.com/v1/games')
  })

  it('does not duplicate slashes when both have slashes', () => {
    config.klurigoServiceUrl = 'https://api.example.com/'
    expect(resolveUrl('/v1/games')).toBe('https://api.example.com/v1/games')
  })

  it('works when only base has trailing slash', () => {
    config.klurigoServiceUrl = 'https://api.example.com/'
    expect(resolveUrl('v1/games')).toBe('https://api.example.com/v1/games')
  })

  it('works when only path has leading slash', () => {
    config.klurigoServiceUrl = 'https://api.example.com'
    expect(resolveUrl('/v1/games')).toBe('https://api.example.com/v1/games')
  })
})

describe('parseResponseAndHandleError', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns empty object for 204 No Content', async () => {
    const res = makeResponse({ ok: true, status: 204 })
    const result = await parseResponseAndHandleError(res)
    expect(result).toEqual({})
  })

  it('parses JSON when response is ok', async () => {
    const payload = { id: 123, name: 'Quiz' }
    const res = makeResponse({ ok: true, status: 200, body: payload })
    const result = await parseResponseAndHandleError<typeof payload>(res)
    expect(result).toEqual(payload)
  })

  it('throws ApiError without a UI side effect when response is not ok', async () => {
    const res = makeResponse({
      ok: false,
      status: 400,
      body: { message: 'Bad Request' },
    })

    await expect(parseResponseAndHandleError(res)).rejects.toBeInstanceOf(
      ApiError,
    )

    // Verify thrown error has status/message
    try {
      await parseResponseAndHandleError(res)
    } catch (e) {
      const err = e as ApiError
      expect(err.status).toBe(400)
      expect(err.message).toBe('Bad Request')
    }
  })
})

describe('isTokenExpired', () => {
  const mockedJwtDecode = jwtDecode as Mock

  let consoleErrorSpy: ReturnType<typeof vi.spyOn>
  beforeEach(() => {
    vi.clearAllMocks()
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })
  afterEach(() => {
    consoleErrorSpy.mockRestore()
  })

  it('returns true when token is undefined', () => {
    expect(isTokenExpired(undefined)).toBe(true)
  })

  it('returns false for a token with future exp', () => {
    const future = Math.floor(Date.now() / 1000) + 60
    mockedJwtDecode.mockReturnValueOnce({ exp: future })
    expect(isTokenExpired('valid.token.here')).toBe(false)
  })

  it('returns true for a token with past exp', () => {
    const past = Math.floor(Date.now() / 1000) - 60
    mockedJwtDecode.mockReturnValueOnce({ exp: past })
    expect(isTokenExpired('expired.token.here')).toBe(true)
  })

  it('returns true and logs error if jwtDecode throws', () => {
    mockedJwtDecode.mockImplementationOnce(() => {
      throw new Error('invalid token')
    })
    expect(isTokenExpired('broken.token')).toBe(true)
    expect(consoleErrorSpy).toHaveBeenCalled()
  })
})

describe('parseQueryParams', () => {
  it('builds a query string and filters empty/undefined', () => {
    const q = parseQueryParams({
      a: '1',
      b: undefined,
      c: '   ', // trimmed -> empty
      d: 42,
    })
    expect(q).toBe('?a=1&d=42')
  })

  it('encodes keys and values', () => {
    const q = parseQueryParams({
      'sp ce': 'a b',
      'sym&bols': 'x&y',
    })
    // order is insertion order of object entries
    expect(q).toBe('?sp%20ce=a%20b&sym%26bols=x%26y')
  })

  it('returns empty string when no valid params', () => {
    const q = parseQueryParams({
      a: undefined,
      b: '',
      c: '   ',
    })
    expect(q).toBe('')
  })

  it('returns empty string when params is undefined', () => {
    const q = parseQueryParams(undefined)
    expect(q).toBe('')
  })

  it('serializes boolean values', () => {
    const q = parseQueryParams({
      t: true,
      f: false,
    })
    expect(q).toBe('?t=true&f=false')
  })

  it('keeps numeric zero', () => {
    const q = parseQueryParams({
      zero: 0,
    })
    expect(q).toBe('?zero=0')
  })

  it('keeps non-empty strings after trimming', () => {
    const q = parseQueryParams({
      a: '  x  ',
    })
    expect(q).toBe('?a=%20%20x%20%20')
  })

  it('encodes boolean-like and equals characters correctly', () => {
    const q = parseQueryParams({
      'k=v': 'a=b',
      ok: true,
    })
    expect(q).toBe('?k%3Dv=a%3Db&ok=true')
  })
})
