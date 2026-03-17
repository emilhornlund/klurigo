import { TokenScope } from '@klurigo/common'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { ApiClientCore } from '../api-client-core'

import { createGameResource } from './game.resource'
import type { GameResourceDeps } from './game.resource'

vi.mock('../api.utils', () => ({
  parseQueryParams: vi.fn(() => '?limit=10&offset=20'),
}))

const makeApi = (): {
  api: ApiClientCore
  apiPost: ReturnType<typeof vi.fn>
  apiGet: ReturnType<typeof vi.fn>
  apiPut: ReturnType<typeof vi.fn>
  apiDelete: ReturnType<typeof vi.fn>
} => {
  const apiPost = vi.fn()
  const apiGet = vi.fn()
  const apiPut = vi.fn()
  const apiDelete = vi.fn()

  const api = {
    apiFetch: vi.fn(),
    apiGet,
    apiPost,
    apiPut,
    apiPatch: vi.fn(),
    apiDelete,
  } as unknown as ApiClientCore

  return { api, apiPost, apiGet, apiPut, apiDelete }
}

const makeDeps = (): {
  deps: GameResourceDeps
  notifySuccess: ReturnType<typeof vi.fn>
  notifyError: ReturnType<typeof vi.fn>
} => {
  const notifySuccess = vi.fn()
  const notifyError = vi.fn()

  return {
    deps: { notifySuccess, notifyError },
    notifySuccess,
    notifyError,
  }
}

describe('createGameResource', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('createGame posts to /quizzes/:quizId/games; notifies and rethrows on failure', async () => {
    const { api, apiPost } = makeApi()
    const { deps, notifyError } = makeDeps()

    const game = createGameResource(api, deps)

    apiPost.mockResolvedValue({ id: 'g1' })
    await expect(game.createGame('q1')).resolves.toEqual({ id: 'g1' })

    expect(apiPost).toHaveBeenCalledWith('/quizzes/q1/games', {})

    const err = new Error('fail')
    apiPost.mockRejectedValueOnce(err)

    await expect(game.createGame('q1')).rejects.toBe(err)
    expect(notifyError).toHaveBeenCalledWith(
      'We couldn’t spin up your game right now. Please try again.',
    )
  })

  it('joinGame posts nickname with game scope; notifies and rethrows on failure', async () => {
    const { api, apiPost } = makeApi()
    const { deps, notifyError } = makeDeps()

    const game = createGameResource(api, deps)

    apiPost.mockResolvedValue(undefined)
    await expect(game.joinGame('g1', 'Emil')).resolves.toBeUndefined()

    expect(apiPost).toHaveBeenCalledWith(
      '/games/g1/players',
      { nickname: 'Emil' },
      { scope: TokenScope.Game },
    )

    const err = new Error('fail')
    apiPost.mockRejectedValueOnce(err)

    await expect(game.joinGame('g1', 'Emil')).rejects.toBe(err)
    expect(notifyError).toHaveBeenCalledWith(
      'Couldn’t join the game. Check the code and try again.',
    )
  })

  it('leaveGame deletes player with game scope; notifies and rethrows on failure', async () => {
    const { api, apiDelete } = makeApi()
    const { deps, notifyError } = makeDeps()

    const game = createGameResource(api, deps)

    apiDelete.mockResolvedValue(undefined)
    await expect(game.leaveGame('g1', 'p1')).resolves.toBeUndefined()

    expect(apiDelete).toHaveBeenCalledWith('/games/g1/players/p1', undefined, {
      scope: TokenScope.Game,
    })

    const err = new Error('fail')
    apiDelete.mockRejectedValueOnce(err)

    await expect(game.leaveGame('g1', 'p1')).rejects.toBe(err)
    expect(notifyError).toHaveBeenCalledWith(
      'We couldn’t remove that player right now. Please try again.',
    )
  })

  it('getPlayers gets players with game scope; notifies and rethrows on failure', async () => {
    const { api, apiGet } = makeApi()
    const { deps, notifyError } = makeDeps()

    const game = createGameResource(api, deps)

    apiGet.mockResolvedValue([{ id: 'p1', nickname: 'A' }])
    await expect(game.getPlayers('g1')).resolves.toEqual([
      { id: 'p1', nickname: 'A' },
    ])

    expect(apiGet).toHaveBeenCalledWith('/games/g1/players', {
      scope: TokenScope.Game,
    })

    const err = new Error('fail')
    apiGet.mockRejectedValueOnce(err)

    await expect(game.getPlayers('g1')).rejects.toBe(err)
    expect(notifyError).toHaveBeenCalledWith(
      "Couldn't load players for this game. Please try again.",
    )
  })

  it('updateGameSettings puts to /games/:gameId/settings with game scope; notifies and rethrows on failure', async () => {
    const { api, apiPut } = makeApi()
    const { deps, notifyError } = makeDeps()

    const game = createGameResource(api, deps)

    const settings = {
      randomizeQuestionOrder: true,
      randomizeAnswerOrder: false,
    }

    apiPut.mockResolvedValue(settings)
    await expect(game.updateGameSettings('g1', settings)).resolves.toEqual(
      settings,
    )

    expect(apiPut).toHaveBeenCalledWith('/games/g1/settings', settings, {
      scope: TokenScope.Game,
    })

    const err = new Error('fail')
    apiPut.mockRejectedValueOnce(err)

    await expect(game.updateGameSettings('g1', settings)).rejects.toBe(err)
    expect(notifyError).toHaveBeenCalledWith(
      "Couldn't update game settings right now. Please try again.",
    )
  })

  it('completeTask posts to current complete with game scope; notifies and rethrows on failure', async () => {
    const { api, apiPost } = makeApi()
    const { deps, notifyError } = makeDeps()

    const game = createGameResource(api, deps)

    apiPost.mockResolvedValue(undefined)
    await expect(game.completeTask('g1')).resolves.toBeUndefined()

    expect(apiPost).toHaveBeenCalledWith(
      '/games/g1/tasks/current/complete',
      {},
      { scope: TokenScope.Game },
    )

    const err = new Error('fail')
    apiPost.mockRejectedValueOnce(err)

    await expect(game.completeTask('g1')).rejects.toBe(err)
    expect(notifyError).toHaveBeenCalledWith(
      'We couldn’t move to the next step. Please try again.',
    )
  })

  it('submitQuestionAnswer posts to /answers with game scope; notifies and rethrows on failure', async () => {
    const { api, apiPost } = makeApi()
    const { deps, notifyError } = makeDeps()

    const game = createGameResource(api, deps)

    const req = { type: 'MultiChoice', answer: 'A' } as never

    apiPost.mockResolvedValue(undefined)
    await expect(game.submitQuestionAnswer('g1', req)).resolves.toBeUndefined()

    expect(apiPost).toHaveBeenCalledWith('/games/g1/answers', req, {
      scope: TokenScope.Game,
    })

    const err = new Error('fail')
    apiPost.mockRejectedValueOnce(err)

    await expect(game.submitQuestionAnswer('g1', req)).rejects.toBe(err)
    expect(notifyError).toHaveBeenCalledWith(
      'Your answer didn’t make it through. Please try submitting again.',
    )
  })

  it('addCorrectAnswer posts to correct_answers with game scope; notifies and rethrows on failure', async () => {
    const { api, apiPost } = makeApi()
    const { deps, notifyError } = makeDeps()

    const game = createGameResource(api, deps)

    const answer = { type: 'TrueFalse', correct: true } as never

    apiPost.mockResolvedValue(undefined)
    await expect(game.addCorrectAnswer('g1', answer)).resolves.toBeUndefined()

    expect(apiPost).toHaveBeenCalledWith(
      '/games/g1/tasks/current/correct_answers',
      answer,
      { scope: TokenScope.Game },
    )

    const err = new Error('fail')
    apiPost.mockRejectedValueOnce(err)

    await expect(game.addCorrectAnswer('g1', answer)).rejects.toBe(err)
    expect(notifyError).toHaveBeenCalledWith(
      'Couldn’t save the correct answer. Please try again.',
    )
  })

  it('deleteCorrectAnswer deletes correct_answers with game scope; notifies and rethrows on failure', async () => {
    const { api, apiDelete } = makeApi()
    const { deps, notifyError } = makeDeps()

    const game = createGameResource(api, deps)

    const answer = { type: 'TrueFalse', correct: true } as never

    apiDelete.mockResolvedValue(undefined)
    await expect(
      game.deleteCorrectAnswer('g1', answer),
    ).resolves.toBeUndefined()

    expect(apiDelete).toHaveBeenCalledWith(
      '/games/g1/tasks/current/correct_answers',
      answer,
      { scope: TokenScope.Game },
    )

    const err = new Error('fail')
    apiDelete.mockRejectedValueOnce(err)

    await expect(game.deleteCorrectAnswer('g1', answer)).rejects.toBe(err)
    expect(notifyError).toHaveBeenCalledWith(
      'Couldn’t remove that correct answer. Please try again.',
    )
  })

  it('quitGame posts /quit with game scope; notifies and rethrows on failure', async () => {
    const { api, apiPost } = makeApi()
    const { deps, notifyError } = makeDeps()

    const game = createGameResource(api, deps)

    apiPost.mockResolvedValue(undefined)
    await expect(game.quitGame('g1')).resolves.toBeUndefined()

    expect(apiPost).toHaveBeenCalledWith(
      '/games/g1/quit',
      {},
      { scope: TokenScope.Game },
    )

    const err = new Error('fail')
    apiPost.mockRejectedValueOnce(err)

    await expect(game.quitGame('g1')).rejects.toBe(err)
    expect(notifyError).toHaveBeenCalledWith(
      'We couldn’t quit the game cleanly. Please try again.',
    )
  })

  it('getGameResults gets /results; notifies and rethrows on failure', async () => {
    const { api, apiGet } = makeApi()
    const { deps, notifyError } = makeDeps()

    const game = createGameResource(api, deps)

    apiGet.mockResolvedValue({ totalPlayers: 2 })
    await expect(game.getGameResults('g1')).resolves.toEqual({
      totalPlayers: 2,
    })

    expect(apiGet).toHaveBeenCalledWith('/games/g1/results')

    const err = new Error('fail')
    apiGet.mockRejectedValueOnce(err)

    await expect(game.getGameResults('g1')).rejects.toBe(err)
    expect(notifyError).toHaveBeenCalledWith(
      'Results are playing hide-and-seek. Please try again.',
    )
  })

  it('getProfileGames builds query via parseQueryParams and calls apiGet; notifies and rethrows on failure', async () => {
    const { api, apiGet } = makeApi()
    const { deps, notifyError } = makeDeps()

    const game = createGameResource(api, deps)

    apiGet.mockResolvedValue({ items: [], limit: 10, offset: 20, total: 0 })
    await expect(
      game.getProfileGames({ limit: 10, offset: 20 }),
    ).resolves.toEqual({ items: [], limit: 10, offset: 20, total: 0 })

    expect(apiGet).toHaveBeenCalledWith('/profile/games?limit=10&offset=20')

    const err = new Error('fail')
    apiGet.mockRejectedValueOnce(err)

    await expect(game.getProfileGames({ limit: 10, offset: 20 })).rejects.toBe(
      err,
    )
    expect(notifyError).toHaveBeenCalledWith(
      'We couldn’t load your game history. Please try again.',
    )
  })

  it('getProfileGames calls parseQueryParams with the provided pagination options', async () => {
    const { api, apiGet } = makeApi()
    const { deps } = makeDeps()

    const { parseQueryParams } = await import('../api.utils')

    const game = createGameResource(api, deps)

    apiGet.mockResolvedValue({ items: [], limit: 10, offset: 20, total: 0 })
    await game.getProfileGames({ limit: 10, offset: 20 })

    expect(parseQueryParams).toHaveBeenCalledWith({ limit: 10, offset: 20 })
  })

  it('createOrUpdateGameRating puts to /games/:gameId/ratings with game scope; notifies and rethrows on failure', async () => {
    const { api, apiPut } = makeApi()
    const { deps, notifyError } = makeDeps()

    const game = createGameResource(api, deps)

    const rating = { stars: 4, comment: 'Great quiz!' }
    const responseRating = {
      id: 'r1',
      quizId: 'q1',
      stars: 4,
      comment: 'Great quiz!',
      author: { id: 'p1', nickname: 'Emil' },
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    apiPut.mockResolvedValue(responseRating)
    await expect(game.createOrUpdateGameRating('g1', rating)).resolves.toEqual(
      responseRating,
    )

    expect(apiPut).toHaveBeenCalledWith('/games/g1/ratings', rating, {
      scope: TokenScope.Game,
    })

    const err = new Error('fail')
    apiPut.mockRejectedValueOnce(err)

    await expect(game.createOrUpdateGameRating('g1', rating)).rejects.toBe(err)
    expect(notifyError).toHaveBeenCalledWith(
      'We couldn’t save your rating. Please try again.',
    )
  })
})
