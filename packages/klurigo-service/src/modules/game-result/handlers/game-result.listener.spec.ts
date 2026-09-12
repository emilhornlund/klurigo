import { Logger } from '@nestjs/common'
import { Test } from '@nestjs/testing'

import { GameResultService } from '../services'

import { GameResultListener } from './game-result.listener'

describe('GameResultListener', () => {
  let listener: GameResultListener
  let gameResultService: { deleteByGameId: jest.Mock<Promise<void>, [string]> }
  let loggerErrorSpy: jest.SpyInstance

  beforeEach(async () => {
    gameResultService = {
      deleteByGameId: jest.fn(),
    }

    const moduleRef = await Test.createTestingModule({
      providers: [
        GameResultListener,
        {
          provide: GameResultService,
          useValue: gameResultService,
        },
      ],
    }).compile()

    listener = moduleRef.get(GameResultListener)

    loggerErrorSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined)
  })

  afterEach(() => {
    loggerErrorSpy.mockRestore()
    jest.clearAllMocks()
  })

  it('deletes game results by gameId when handling game.deleted', async () => {
    const gameId = 'game-123'
    gameResultService.deleteByGameId.mockResolvedValue(undefined)

    await listener.handleGameDeleted({ gameId })

    expect(gameResultService.deleteByGameId).toHaveBeenCalledTimes(1)
    expect(gameResultService.deleteByGameId).toHaveBeenCalledWith(gameId)
    expect(loggerErrorSpy).not.toHaveBeenCalled()
  })

  it('logs an error when deleteByGameId throws an Error (uses stack)', async () => {
    const gameId = 'game-123'
    const err = new Error('boom')
    err.stack = 'stack-trace'
    gameResultService.deleteByGameId.mockRejectedValue(err)

    await listener.handleGameDeleted({ gameId })

    expect(gameResultService.deleteByGameId).toHaveBeenCalledWith(gameId)
    expect(loggerErrorSpy).toHaveBeenCalledTimes(1)
    expect(loggerErrorSpy).toHaveBeenCalledWith(
      {
        message: 'Failed to delete game results for deleted game.',
        operation: 'handleGameDeleted',
        gameId,
      },
      'stack-trace',
    )
  })

  it('logs an error when deleteByGameId throws a non-Error (stringifies it)', async () => {
    const gameId = 'game-123'
    gameResultService.deleteByGameId.mockRejectedValue('nope')

    await listener.handleGameDeleted({ gameId })

    expect(gameResultService.deleteByGameId).toHaveBeenCalledWith(gameId)
    expect(loggerErrorSpy).toHaveBeenCalledTimes(1)
    expect(loggerErrorSpy).toHaveBeenCalledWith(
      {
        message: 'Failed to delete game results for deleted game.',
        operation: 'handleGameDeleted',
        gameId,
      },
      'nope',
    )
  })
})
