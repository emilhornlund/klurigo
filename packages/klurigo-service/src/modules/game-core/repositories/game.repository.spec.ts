import { GameMode, GameStatus } from '@klurigo/common'
import type { QueryFilter } from 'mongoose'

import type { Quiz } from '../../quiz-core/repositories/models/schemas'
import type { User } from '../../user/repositories/models'

import { GameRepository } from './game.repository'
import type { Game, GameDocument } from './models/schemas'
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
    ;(repository as unknown as { logger: { error: jest.Mock } }).logger = {
      error: jest.fn(),
    }
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

  it('filters by id and active status by default', async () => {
    const game = { _id: 'game-1' } as unknown as GameDocument
    populateMock.mockResolvedValueOnce(game)

    await expect(repository.findGameByID('game-1')).resolves.toBe(game)
    expect(findOneMock).toHaveBeenCalledWith({
      _id: { $eq: 'game-1' },
      status: { $eq: GameStatus.Active },
    })
  })

  it('omits the active status filter when inactive games are requested', async () => {
    await repository.findGameByID('game-1', false)

    expect(findOneMock).toHaveBeenCalledWith({
      _id: { $eq: 'game-1' },
    })
  })

  it('propagates lookup errors', async () => {
    const error = new Error('database unavailable')
    findOneMock.mockImplementationOnce(() => {
      throw error
    })

    await expect(repository.findGameByID('game-1')).rejects.toBe(error)
    expect(
      (repository as unknown as { logger: { error: jest.Mock } }).logger.error,
    ).toHaveBeenCalled()
  })
})

describe('GameRepository.findGameByIDOrThrow', () => {
  let repository: GameRepository
  let findGameByIDMock: jest.MockedFunction<
    (gameId: string, active: boolean) => Promise<GameDocument | null>
  >

  beforeEach(() => {
    repository = Object.create(GameRepository.prototype) as GameRepository
    findGameByIDMock = jest.fn()
    ;(
      repository as unknown as { findGameByID: typeof findGameByIDMock }
    ).findGameByID = findGameByIDMock
  })

  it('throws the active-game exception for a missing active game', async () => {
    findGameByIDMock.mockResolvedValueOnce(null)

    await expect(repository.findGameByIDOrThrow('game-1')).rejects.toThrow(
      'Active game not found by id game-1',
    )
    expect(findGameByIDMock).toHaveBeenCalledWith('game-1', true)
  })

  it('throws the general exception for a missing inactive lookup', async () => {
    findGameByIDMock.mockResolvedValueOnce(null)

    await expect(
      repository.findGameByIDOrThrow('game-1', false),
    ).rejects.toThrow("Game not found by id 'game-1'")
    expect(findGameByIDMock).toHaveBeenCalledWith('game-1', false)
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

describe('GameRepository.hasRateableGamesByQuizIdAndParticipantId', () => {
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
      repository.hasRateableGamesByQuizIdAndParticipantId('quiz-1', 'user-1'),
    ).resolves.toBe(true)

    expect(existsMock).toHaveBeenCalledTimes(1)
    expect(existsMock).toHaveBeenCalledWith({
      quiz: 'quiz-1',
      'participants.participantId': 'user-1',
      $or: [
        { status: GameStatus.Completed },
        { status: GameStatus.Active, 'currentTask.type': TaskType.Podium },
      ],
    })
  })

  it('calls exists with the expected filter and returns false', async () => {
    existsMock.mockResolvedValueOnce(false)

    await expect(
      repository.hasRateableGamesByQuizIdAndParticipantId('quiz-1', 'user-1'),
    ).resolves.toBe(false)

    expect(existsMock).toHaveBeenCalledTimes(1)
    expect(existsMock).toHaveBeenCalledWith({
      quiz: 'quiz-1',
      'participants.participantId': 'user-1',
      $or: [
        { status: GameStatus.Completed },
        { status: GameStatus.Active, 'currentTask.type': TaskType.Podium },
      ],
    })
  })

  it('propagates errors thrown by exists', async () => {
    existsMock.mockRejectedValueOnce(new Error('db failed'))

    await expect(
      repository.hasRateableGamesByQuizIdAndParticipantId('quiz-1', 'user-1'),
    ).rejects.toThrow('db failed')

    expect(existsMock).toHaveBeenCalledTimes(1)
    expect(existsMock).toHaveBeenCalledWith({
      quiz: 'quiz-1',
      'participants.participantId': 'user-1',
      $or: [
        { status: GameStatus.Completed },
        { status: GameStatus.Active, 'currentTask.type': TaskType.Podium },
      ],
    })
  })
})

describe('GameRepository pending transition operations', () => {
  let repository: GameRepository
  let findMock: jest.Mock
  let populateMock: jest.Mock
  let findAndSaveWithLockIfChangedMock: jest.Mock

  beforeEach(() => {
    repository = Object.create(GameRepository.prototype) as GameRepository
    findMock = jest.fn()
    populateMock = jest.fn()
    findAndSaveWithLockIfChangedMock = jest.fn()
    ;(
      repository as unknown as {
        gameModel: { find: jest.Mock }
        findAndSaveWithLockIfChanged: jest.Mock
        logger: { error: jest.Mock }
      }
    ).gameModel = { find: findMock }
    ;(
      repository as unknown as { findAndSaveWithLockIfChanged: jest.Mock }
    ).findAndSaveWithLockIfChanged = findAndSaveWithLockIfChangedMock
    ;(repository as unknown as { logger: { error: jest.Mock } }).logger = {
      error: jest.fn(),
    }
  })

  it('finds active and completed games with pending work and populates quizzes', async () => {
    const games = [{ _id: 'game-1' }] as unknown as GameDocument[]
    populateMock.mockResolvedValueOnce(games)
    findMock.mockReturnValueOnce({ populate: populateMock })

    await expect(
      repository.findGamesWithPendingTransitionOperations(),
    ).resolves.toBe(games)
    expect(findMock).toHaveBeenCalledWith({
      status: { $in: [GameStatus.Active, GameStatus.Completed] },
      'pendingTransitionOperations.0': { $exists: true },
    })
    expect(populateMock).toHaveBeenCalledWith('quiz')
  })

  it('propagates pending-transition query errors and logs them', async () => {
    const error = new Error('database unavailable')
    findMock.mockImplementationOnce(() => {
      throw error
    })

    await expect(
      repository.findGamesWithPendingTransitionOperations(),
    ).rejects.toBe(error)
    expect(
      (repository as unknown as { logger: { error: jest.Mock } }).logger.error,
    ).toHaveBeenCalled()
  })

  it('clears only the requested pending operation while holding the game lock', async () => {
    const game = {
      pendingTransitionOperations: [
        {
          id: 'operation-1',
          operation: 'schedule',
          taskId: 'task-1',
          taskType: TaskType.Lobby,
          taskStatus: 'pending',
        },
        {
          id: 'operation-2',
          operation: 'transition',
          taskId: 'task-2',
          taskType: TaskType.Question,
          taskStatus: 'active',
        },
      ],
    } as unknown as GameDocument
    findAndSaveWithLockIfChangedMock.mockImplementationOnce(
      async (
        _id: string,
        callback: (document: GameDocument) => Promise<GameDocument>,
      ) => callback(game),
    )

    await repository.clearPendingTransitionOperation('game-1', 'operation-1')

    expect(findAndSaveWithLockIfChangedMock).toHaveBeenCalledWith(
      'game-1',
      expect.any(Function),
    )
    expect(game.pendingTransitionOperations).toEqual([
      expect.objectContaining({ id: 'operation-2' }),
    ])
  })

  it('does not change or save when the pending operation was already cleared', async () => {
    const game = {
      pendingTransitionOperations: [],
    } as unknown as GameDocument
    findAndSaveWithLockIfChangedMock.mockImplementationOnce(
      async (
        _id: string,
        callback: (document: GameDocument) => Promise<undefined>,
      ) => callback(game),
    )

    await repository.clearPendingTransitionOperation(
      'game-1',
      'missing-operation',
    )

    expect(game.pendingTransitionOperations).toEqual([])
    expect(findAndSaveWithLockIfChangedMock).toHaveBeenCalledTimes(1)
  })

  it('returns the original document without saving when a locked callback is unchanged', async () => {
    const repositoryWithLock = Object.create(
      GameRepository.prototype,
    ) as GameRepository
    const game = {
      version: 4,
      updated: new Date('2026-01-01T00:00:00.000Z'),
      save: jest.fn(),
    } as unknown as GameDocument
    const findGameMock = jest.fn().mockResolvedValueOnce(game)
    ;(
      repositoryWithLock as unknown as {
        findGameByIDWithStatusesOrThrow: typeof findGameMock
      }
    ).findGameByIDWithStatusesOrThrow = findGameMock

    const result = await (
      repositoryWithLock as unknown as {
        findAndSaveLocked: (
          gameId: string,
          callback: (
            document: GameDocument,
          ) => Promise<GameDocument | undefined>,
        ) => Promise<GameDocument>
      }
    ).findAndSaveLocked('game-1', async () => undefined)

    expect(result).toBe(game)
    expect(game.save).not.toHaveBeenCalled()
    expect(findGameMock).toHaveBeenCalledWith('game-1', [
      GameStatus.Active,
      GameStatus.Completed,
    ])
  })

  it('executes findAndSaveWithLock through the per-game MurLock key', async () => {
    const repositoryWithLock = Object.create(
      GameRepository.prototype,
    ) as GameRepository
    const game = {
      version: 1,
      updated: new Date('2026-01-01T00:00:00.000Z'),
      save: jest.fn().mockResolvedValueOnce('saved-game'),
    } as unknown as GameDocument
    const findGameMock = jest.fn().mockResolvedValueOnce(game)
    const runWithLockMock = jest.fn(
      (
        _key: string,
        _releaseTime: number,
        _wait: undefined,
        callback: () => Promise<unknown>,
      ) => callback(),
    )
    Object.assign(repositoryWithLock, {
      findGameByIDWithStatusesOrThrow: findGameMock,
      murlockServiceDecorator: {
        options: { lockKeyPrefix: 'default', encodeKeyParts: false },
        runWithLock: runWithLockMock,
      },
    })

    await expect(
      repositoryWithLock.findAndSaveWithLock(
        'game-1',
        async (document) => document,
      ),
    ).resolves.toBe('saved-game')

    expect(runWithLockMock).toHaveBeenCalledWith(
      'GameRepository:findAndSaveWithLock:game-1',
      5000,
      undefined,
      expect.any(Function),
    )
  })

  it('updates version and timestamp before saving a changed locked document', async () => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-02-01T00:00:00.000Z'))
    const repositoryWithLock = Object.create(
      GameRepository.prototype,
    ) as GameRepository
    const game = {
      version: 4,
      updated: new Date('2026-01-01T00:00:00.000Z'),
      save: jest.fn().mockResolvedValueOnce('saved-game'),
    } as unknown as GameDocument
    const findGameMock = jest.fn().mockResolvedValueOnce(game)
    ;(
      repositoryWithLock as unknown as {
        findGameByIDWithStatusesOrThrow: typeof findGameMock
      }
    ).findGameByIDWithStatusesOrThrow = findGameMock

    await expect(
      (
        repositoryWithLock as unknown as {
          findAndSaveLocked: (
            gameId: string,
            callback: (
              document: GameDocument,
            ) => Promise<GameDocument | undefined>,
          ) => Promise<GameDocument>
        }
      ).findAndSaveLocked('game-1', async (document) => document),
    ).resolves.toBe('saved-game')

    expect(game.version).toBe(5)
    expect(game.updated).toEqual(new Date('2026-02-01T00:00:00.000Z'))
    expect(game.save).toHaveBeenCalledTimes(1)
    jest.useRealTimers()
  })
})

describe('GameRepository.findGameByPIN', () => {
  it('uses the active status filter by default and supports all statuses', async () => {
    const repository = Object.create(GameRepository.prototype) as GameRepository
    const populateMock = jest.fn().mockResolvedValueOnce(null)
    const findOneMock = jest.fn().mockReturnValue({ populate: populateMock })
    ;(
      repository as unknown as { gameModel: { findOne: jest.Mock } }
    ).gameModel = {
      findOne: findOneMock,
    }

    await repository.findGameByPIN('123456')
    await repository.findGameByPIN('123456', false)

    expect(findOneMock).toHaveBeenNthCalledWith(1, {
      pin: { $eq: '123456' },
      status: { $eq: GameStatus.Active },
    })
    expect(findOneMock).toHaveBeenNthCalledWith(2, {
      pin: { $eq: '123456' },
    })
    expect(populateMock).toHaveBeenCalledWith('quiz')
  })
})

describe('GameRepository.createGame', () => {
  it('retries a colliding PIN before persisting a lobby game', async () => {
    const repository = Object.create(GameRepository.prototype) as GameRepository
    const findGameByPINMock = jest
      .fn()
      .mockResolvedValueOnce({ _id: 'existing-game' })
      .mockResolvedValueOnce(null)
    const createMock = jest.fn().mockResolvedValueOnce({ _id: 'new-game' })
    ;(
      repository as unknown as {
        findGameByPIN: typeof findGameByPINMock
        create: typeof createMock
      }
    ).findGameByPIN = findGameByPINMock
    ;(repository as unknown as { create: typeof createMock }).create =
      createMock

    const randomMock = jest
      .spyOn(Math, 'random')
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0.5)
    const quiz = {
      _id: 'quiz-1',
      title: 'Quiz',
      mode: GameMode.Classic,
      questions: [],
    } as unknown as Quiz
    const user = { _id: 'user-1' } as User

    await expect(repository.createGame(quiz, user)).resolves.toEqual({
      _id: 'new-game',
    })

    expect(findGameByPINMock).toHaveBeenNthCalledWith(1, '100000')
    expect(findGameByPINMock).toHaveBeenNthCalledWith(2, '550000')
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Quiz',
        mode: GameMode.Classic,
        status: GameStatus.Active,
        pin: '550000',
        quiz,
        currentTask: expect.objectContaining({ type: TaskType.Lobby }),
        participants: [expect.objectContaining({ participantId: 'user-1' })],
      }),
    )
    randomMock.mockRestore()
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
