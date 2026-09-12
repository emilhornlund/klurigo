import { GameStatus } from '@klurigo/common'
import type { QueryFilter } from 'mongoose'

import { GameRepository } from './game.repository'
import type { Game } from './models/schemas'
import { GameSchema, TaskType } from './models/schemas'

describe('GameRepository.findGameByIDWithStatuses', () => {
  let repository: GameRepository
  let populateMock: jest.MockedFunction<(path: string) => Promise<unknown>>
  let findOneMock: jest.MockedFunction<
    (filter: QueryFilter<Game>) => { populate: typeof populateMock }
  >

  beforeEach(() => {
    jest.clearAllMocks()

    repository = Object.create(GameRepository.prototype) as GameRepository

    populateMock = jest.fn().mockResolvedValue(null)
    findOneMock = jest.fn().mockReturnValue({
      populate: populateMock,
    })
    ;(
      repository as unknown as {
        gameModel: { findOne: typeof findOneMock }
      }
    ).gameModel = {
      findOne: findOneMock,
    } as never
  })

  it('queries only active and completed games', async () => {
    await repository.findGameByIDWithStatuses('game-1', [
      GameStatus.Active,
      GameStatus.Completed,
    ])

    expect(findOneMock).toHaveBeenCalledWith({
      _id: { $eq: 'game-1' },
      status: { $in: [GameStatus.Active, GameStatus.Completed] },
    })
    expect(populateMock).toHaveBeenCalledWith('quiz')
  })
})

describe('GameRepository.findGameByIDWithStatusesOrThrow', () => {
  let repository: GameRepository
  let findGameByIDWithStatusesMock: jest.MockedFunction<
    (gameId: string, statuses: GameStatus[]) => Promise<Game | null>
  >

  beforeEach(() => {
    jest.clearAllMocks()

    repository = Object.create(GameRepository.prototype) as GameRepository

    findGameByIDWithStatusesMock = jest.fn()
    ;(
      repository as unknown as {
        findGameByIDWithStatuses: typeof findGameByIDWithStatusesMock
      }
    ).findGameByIDWithStatuses = findGameByIDWithStatusesMock
  })

  it('returns the matching game when one is found', async () => {
    const gameDocument = { _id: 'game-1' } as Game
    findGameByIDWithStatusesMock.mockResolvedValueOnce(gameDocument)

    await expect(
      repository.findGameByIDWithStatusesOrThrow('game-1', [
        GameStatus.Active,
        GameStatus.Completed,
      ]),
    ).resolves.toBe(gameDocument)

    expect(findGameByIDWithStatusesMock).toHaveBeenCalledWith('game-1', [
      GameStatus.Active,
      GameStatus.Completed,
    ])
  })

  it('throws when no game matches the requested statuses', async () => {
    findGameByIDWithStatusesMock.mockResolvedValueOnce(null)

    await expect(
      repository.findGameByIDWithStatusesOrThrow('game-1', [
        GameStatus.Active,
        GameStatus.Completed,
      ]),
    ).rejects.toThrow("Game not found by id 'game-1'")

    expect(findGameByIDWithStatusesMock).toHaveBeenCalledWith('game-1', [
      GameStatus.Active,
      GameStatus.Completed,
    ])
  })
})

describe('GameRepository.hasCompletedGamesByQuizIdAndParticipantId', () => {
  let repository: GameRepository
  let existsMock: jest.MockedFunction<
    (filter: QueryFilter<Game>) => Promise<boolean>
  >

  beforeEach(() => {
    jest.clearAllMocks()

    repository = Object.create(GameRepository.prototype) as GameRepository

    existsMock = jest
      .fn<Promise<boolean>, [QueryFilter<Game>]>()
      .mockName('exists')
    ;(repository as unknown as { exists: typeof existsMock }).exists =
      existsMock
  })

  it('calls exists with the expected filter and returns true', async () => {
    existsMock.mockResolvedValueOnce(true)

    await expect(
      repository.hasCompletedGamesByQuizIdAndParticipantId('quiz-1', 'user-1'),
    ).resolves.toBe(true)

    expect(existsMock).toHaveBeenCalledTimes(1)
    expect(existsMock).toHaveBeenCalledWith({
      status: { $in: [GameStatus.Completed] },
      quiz: 'quiz-1',
      'participants.participantId': 'user-1',
    })
  })

  it('calls exists with the expected filter and returns false', async () => {
    existsMock.mockResolvedValueOnce(false)

    await expect(
      repository.hasCompletedGamesByQuizIdAndParticipantId('quiz-1', 'user-1'),
    ).resolves.toBe(false)

    expect(existsMock).toHaveBeenCalledTimes(1)
    expect(existsMock).toHaveBeenCalledWith({
      status: { $in: [GameStatus.Completed] },
      quiz: 'quiz-1',
      'participants.participantId': 'user-1',
    })
  })

  it('propagates errors thrown by exists', async () => {
    existsMock.mockRejectedValueOnce(new Error('db failed'))

    await expect(
      repository.hasCompletedGamesByQuizIdAndParticipantId('quiz-1', 'user-1'),
    ).rejects.toThrow('db failed')

    expect(existsMock).toHaveBeenCalledTimes(1)
    expect(existsMock).toHaveBeenCalledWith({
      status: { $in: [GameStatus.Completed] },
      quiz: 'quiz-1',
      'participants.participantId': 'user-1',
    })
  })
})

describe('GameRepository.findRecentGameStats', () => {
  let repository: GameRepository
  let aggregateMock: jest.MockedFunction<
    (
      pipeline: unknown[],
    ) => Promise<Array<{ quizId: string; playCount: number }>>
  >

  beforeEach(() => {
    jest.clearAllMocks()

    repository = Object.create(GameRepository.prototype) as GameRepository

    aggregateMock = jest.fn().mockResolvedValue([])
    ;(
      repository as unknown as {
        gameModel: { aggregate: typeof aggregateMock }
      }
    ).gameModel = {
      aggregate: aggregateMock,
    } as never
  })

  it('returns empty array when no games exist in the window', async () => {
    aggregateMock.mockResolvedValueOnce([])

    const result = await repository.findRecentGameStats(7)

    expect(result).toEqual([])
    expect(aggregateMock).toHaveBeenCalledTimes(1)
  })

  it('returns per-quiz play counts', async () => {
    const stats = [
      { quizId: 'q1', playCount: 5 },
      { quizId: 'q2', playCount: 12 },
    ]
    aggregateMock.mockResolvedValueOnce(stats)

    const result = await repository.findRecentGameStats(7)

    expect(result).toEqual(stats)
  })

  it('passes a match stage filtering by Completed status and completedAt date', async () => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-01-15T00:00:00.000Z'))

    await repository.findRecentGameStats(7)

    const pipeline = aggregateMock.mock.calls[0][0] as Array<
      Record<string, unknown>
    >
    const matchStage = pipeline[0] as {
      $match: { status: string; completedAt: { $gte: Date } }
    }

    expect(matchStage.$match.status).toBe(GameStatus.Completed)
    expect(matchStage.$match.completedAt.$gte).toEqual(
      new Date('2026-01-08T00:00:00.000Z'),
    )

    jest.useRealTimers()
  })

  it('groups by the quiz field (UUID string matching Quiz._id)', async () => {
    await repository.findRecentGameStats(7)

    const pipeline = aggregateMock.mock.calls[0][0] as Array<
      Record<string, unknown>
    >
    const groupStage = pipeline[1] as {
      $group: { _id: string; playCount: unknown }
    }

    expect(groupStage.$group._id).toBe('$quiz')
  })

  it('projects quizId as a string from the grouped key', async () => {
    aggregateMock.mockResolvedValueOnce([{ quizId: 'abc-123', playCount: 3 }])

    const result = await repository.findRecentGameStats(7)

    expect(typeof result[0].quizId).toBe('string')
    expect(result[0].quizId).toBe('abc-123')
  })
})

describe('GameSchema compound index', () => {
  it('defines { status: 1, completedAt: 1 } for the recent-activity aggregation', () => {
    const indexes = GameSchema.indexes()
    const match = indexes.find(
      ([fields]) =>
        Object.keys(fields).length === 2 &&
        fields.status === 1 &&
        fields.completedAt === 1,
    )
    expect(match).toBeDefined()
  })
})

describe('GameRepository stale cleanup', () => {
  const staleDate = new Date('2026-01-01T00:00:00.000Z')

  function createRepository(): {
    repository: GameRepository
    find: jest.Mock
    findAndSaveWithLockIfChanged: jest.Mock
    logger: { error: jest.Mock }
  } {
    const repository = Object.create(GameRepository.prototype) as GameRepository
    const find = jest.fn()
    const findAndSaveWithLockIfChanged = jest.fn()
    const logger = { error: jest.fn() }

    ;(
      repository as unknown as {
        find: jest.Mock
        findAndSaveWithLockIfChanged: jest.Mock
        logger: { error: jest.Mock }
      }
    ).find = find
    ;(
      repository as unknown as {
        findAndSaveWithLockIfChanged: jest.Mock
      }
    ).findAndSaveWithLockIfChanged = findAndSaveWithLockIfChanged
    ;(repository as unknown as { logger: { error: jest.Mock } }).logger = logger

    return { repository, find, findAndSaveWithLockIfChanged, logger }
  }

  it('revalidates a stale candidate under the game lock', async () => {
    const { repository, find, findAndSaveWithLockIfChanged } =
      createRepository()
    const candidate = {
      _id: 'game-1',
      status: GameStatus.Active,
      updated: staleDate,
      currentTask: { type: TaskType.Leaderboard },
    }
    find.mockResolvedValueOnce([candidate])
    findAndSaveWithLockIfChanged.mockImplementationOnce(
      async (_id: string, callback: (game: Game) => Promise<unknown>) =>
        callback({
          ...candidate,
          updated: new Date(),
        } as Game),
    )

    await expect(repository.updateExpiredGames()).resolves.toBe(0)

    expect(findAndSaveWithLockIfChanged).toHaveBeenCalledTimes(1)
    expect(candidate.status).toBe(GameStatus.Active)
  })

  it('continues processing candidates when one locked update fails', async () => {
    const { repository, find, findAndSaveWithLockIfChanged, logger } =
      createRepository()
    const candidates = [
      {
        _id: 'failed',
        status: GameStatus.Active,
        updated: staleDate,
        currentTask: { type: TaskType.Leaderboard },
      },
      {
        _id: 'updated',
        status: GameStatus.Active,
        updated: staleDate,
        currentTask: { type: TaskType.Leaderboard },
      },
    ]
    find.mockResolvedValueOnce(candidates)
    findAndSaveWithLockIfChanged
      .mockRejectedValueOnce(new Error('game disappeared'))
      .mockImplementationOnce(
        async (_id: string, callback: (game: Game) => Promise<unknown>) =>
          callback(candidates[1] as Game),
      )

    await expect(repository.updateExpiredGames()).resolves.toBe(1)

    expect(findAndSaveWithLockIfChanged).toHaveBeenCalledTimes(2)
    expect(candidates[1].status).toBe(GameStatus.Expired)
    expect(logger.error).toHaveBeenCalledTimes(1)
  })

  it('does not update already-missing candidates', async () => {
    const { repository, find, findAndSaveWithLockIfChanged } =
      createRepository()
    find.mockResolvedValueOnce([
      {
        _id: 'missing',
        status: GameStatus.Active,
        updated: staleDate,
        currentTask: { type: TaskType.Leaderboard },
      },
    ])
    findAndSaveWithLockIfChanged.mockRejectedValueOnce(
      new Error("Game not found by id 'missing'"),
    )

    await expect(repository.updateExpiredGames()).resolves.toBe(0)
  })
})
