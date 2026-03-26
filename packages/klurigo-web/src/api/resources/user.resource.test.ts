import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { ApiClientCore } from '../api-client-core'

import { createUserResource } from './user.resource'
import type {
  UserPublicQuizzesOptions,
  UserResourceDeps,
} from './user.resource'

const makeApi = (): {
  api: ApiClientCore
  apiGet: ReturnType<typeof vi.fn>
} => {
  const apiGet = vi.fn()

  const api = {
    apiFetch: vi.fn(),
    apiGet,
    apiPost: vi.fn(),
    apiPut: vi.fn(),
    apiPatch: vi.fn(),
    apiDelete: vi.fn(),
  } as unknown as ApiClientCore

  return { api, apiGet }
}

const makeDeps = (overrides?: Partial<UserResourceDeps>) => {
  const deps: UserResourceDeps = {
    notifySuccess: vi.fn(),
    notifyError: vi.fn(),
    ...overrides,
  }

  return deps
}

describe('createUserResource', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('getUserPublicProfile calls apiGet and returns the response', async () => {
    const { api, apiGet } = makeApi()
    const deps = makeDeps()
    const user = createUserResource(api, deps)

    const response = {
      id: 'user-1',
      nickname: 'QuizMaster',
      quizzesCount: 12,
      hostedGamesCount: 7,
      playedGamesCount: 42,
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
    } as const

    apiGet.mockResolvedValue(response)

    await expect(user.getUserPublicProfile('user-1')).resolves.toBe(response)
    expect(apiGet).toHaveBeenCalledWith('/users/user-1/profile')
    expect(deps.notifyError).not.toHaveBeenCalled()
  })

  it('getUserPublicProfile notifies error and rethrows on failure', async () => {
    const { api, apiGet } = makeApi()
    const deps = makeDeps()
    const user = createUserResource(api, deps)

    const error = new Error('boom')
    apiGet.mockRejectedValue(error)

    await expect(user.getUserPublicProfile('user-1')).rejects.toBe(error)
    expect(deps.notifyError).toHaveBeenCalledWith(
      'We couldn’t load that user profile. Please try again.',
    )
  })

  it('getUserPublicQuizzes calls apiGet with query params and returns the response', async () => {
    const { api, apiGet } = makeApi()
    const deps = makeDeps()
    const user = createUserResource(api, deps)

    const response = {
      results: [],
      limit: 10,
      offset: 20,
      total: 0,
    }
    apiGet.mockResolvedValue(response)

    await expect(
      user.getUserPublicQuizzes('user-1', { limit: 10, offset: 20 }),
    ).resolves.toBe(response)
    expect(apiGet).toHaveBeenCalledWith(
      '/users/user-1/quizzes?limit=10&offset=20',
    )
    expect(deps.notifyError).not.toHaveBeenCalled()
  })

  it('getUserPublicQuizzes passes supported sort options as query params', async () => {
    const { api, apiGet } = makeApi()
    const deps = makeDeps()
    const user = createUserResource(api, deps)

    const options: UserPublicQuizzesOptions = {
      sort: 'updated',
      order: 'desc',
      limit: 25,
      offset: 50,
    }
    const response = {
      results: [],
      limit: 25,
      offset: 50,
      total: 0,
    }
    apiGet.mockResolvedValue(response)

    await expect(user.getUserPublicQuizzes('user-1', options)).resolves.toBe(
      response,
    )
    expect(apiGet).toHaveBeenCalledWith(
      '/users/user-1/quizzes?sort=updated&order=desc&limit=25&offset=50',
    )
  })

  it('getUserPublicQuizzes notifies error and rethrows on failure', async () => {
    const { api, apiGet } = makeApi()
    const deps = makeDeps()
    const user = createUserResource(api, deps)

    const error = new Error('fail')
    apiGet.mockRejectedValue(error)

    await expect(
      user.getUserPublicQuizzes('user-1', { limit: 10, offset: 20 }),
    ).rejects.toBe(error)
    expect(deps.notifyError).toHaveBeenCalledWith(
      'We couldn’t load this user’s public quizzes right now. Please try again.',
    )
  })
})
