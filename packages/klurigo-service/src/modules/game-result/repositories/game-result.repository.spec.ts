import { GameResultRepository } from './game-result.repository'
import type { GameResult } from './models/schemas'

describe('GameResultRepository', () => {
  let repository: GameResultRepository
  let countMock: jest.MockedFunction<
    (filter: Record<string, unknown>) => Promise<number>
  >
  let findOneMock: jest.Mock
  let createMock: jest.Mock
  let logger: { debug: jest.Mock; error: jest.Mock }

  beforeEach(() => {
    jest.clearAllMocks()

    repository = Object.create(
      GameResultRepository.prototype,
    ) as GameResultRepository

    countMock = jest.fn()
    findOneMock = jest.fn()
    createMock = jest.fn()
    logger = { debug: jest.fn(), error: jest.fn() }
    Object.assign(repository, {
      count: countMock,
      findOne: findOneMock,
      create: createMock,
      logger,
      gameResultModel: { findOne: findOneMock },
    })
  })

  describe('findGameResult', () => {
    it('finds a result and populates game, quiz, and quiz owner', async () => {
      const result = {
        _id: 'result-1',
        game: { _id: 'game-1' },
      } as unknown as GameResult
      const populateMock = jest.fn().mockResolvedValueOnce(result)
      findOneMock.mockReturnValueOnce({ populate: populateMock })

      await expect(repository.findGameResult('game-1')).resolves.toBe(result)

      expect(findOneMock).toHaveBeenCalledWith({ game: 'game-1' })
      expect(populateMock).toHaveBeenCalledWith([
        {
          path: 'game',
          populate: [
            {
              path: 'quiz',
              populate: [{ path: 'owner' }],
            },
          ],
        },
      ])
    })

    it('logs and rethrows persistence errors', async () => {
      const error = new Error('database unavailable')
      findOneMock.mockImplementationOnce(() => {
        throw error
      })

      await expect(repository.findGameResult('game-1')).rejects.toBe(error)
      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Failed to find game result.',
          operation: 'findGameResult',
          gameId: 'game-1',
        }),
        expect.any(String),
      )
    })
  })

  describe('countHostedGamesByUserId', () => {
    it('counts game results hosted by the given user', async () => {
      countMock.mockResolvedValueOnce(4)

      await expect(repository.countHostedGamesByUserId('user-1')).resolves.toBe(
        4,
      )

      expect(countMock).toHaveBeenCalledTimes(1)
      expect(countMock).toHaveBeenCalledWith({
        hostParticipantId: 'user-1',
      })
    })
  })

  describe('countPlayedGamesByUserId', () => {
    it('counts game results where the given user appears in players', async () => {
      countMock.mockResolvedValueOnce(9)

      await expect(repository.countPlayedGamesByUserId('user-1')).resolves.toBe(
        9,
      )

      expect(countMock).toHaveBeenCalledTimes(1)
      expect(countMock).toHaveBeenCalledWith({
        'players.participantId': 'user-1',
      })
    })
  })

  describe('createGameResult', () => {
    it('logs and persists the game result', async () => {
      const gameResult = {
        game: { _id: 'game-1' },
      } as unknown as GameResult
      createMock.mockResolvedValueOnce(gameResult)

      await expect(repository.createGameResult(gameResult)).resolves.toBe(
        gameResult,
      )

      expect(logger.debug).toHaveBeenCalledWith(
        "Creating game result for game with ID 'game-1'.",
      )
      expect(createMock).toHaveBeenCalledWith(gameResult)
    })
  })
})
