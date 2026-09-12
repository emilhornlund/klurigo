import { Logger } from '@nestjs/common'
import { Test } from '@nestjs/testing'

import {
  GameAnswerRepository,
  GameRepository,
} from '../../game-core/repositories'

import { GameExpirySchedulerService } from './game-expiry-scheduler.service'

// Avoid depending on MurLock implementation details in a unit test.
// We only want to test the business logic inside `clean()`.
jest.mock('murlock', () => ({
  MurLock:
    () =>
    (_target: unknown, _propertyKey: string, descriptor: PropertyDescriptor) =>
      descriptor,
}))

describe(GameExpirySchedulerService.name, () => {
  let service: GameExpirySchedulerService
  let gameRepository: jest.Mocked<GameRepository>
  let gameAnswerRepository: jest.Mocked<GameAnswerRepository>
  let errorSpy: jest.SpyInstance

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        GameExpirySchedulerService,
        {
          provide: GameRepository,
          useValue: {
            updateCompletedGames: jest.fn(),
            updateExpiredGames: jest.fn(),
            find: jest.fn(),
          },
        },
        {
          provide: GameAnswerRepository,
          useValue: { clear: jest.fn() },
        },
      ],
    }).compile()

    service = moduleRef.get(GameExpirySchedulerService)
    gameRepository = moduleRef.get(GameRepository)
    gameAnswerRepository = moduleRef.get(GameAnswerRepository)
    gameRepository.find.mockResolvedValue([])
    errorSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined)
  })

  afterEach(() => {
    errorSpy.mockRestore()
  })

  it('updates completed games and expired games, and logs counts', async () => {
    gameRepository.updateCompletedGames.mockResolvedValueOnce(3 as never)
    gameRepository.updateExpiredGames.mockResolvedValueOnce(7 as never)

    const logSpy = jest
      .spyOn((service as any).logger as Logger, 'log')
      .mockImplementation(() => undefined)

    await service.clean()

    expect(gameRepository.updateCompletedGames).toHaveBeenCalledTimes(1)
    expect(gameRepository.updateExpiredGames).toHaveBeenCalledTimes(1)

    expect(logSpy).toHaveBeenCalledTimes(2)
    expect(logSpy).toHaveBeenNthCalledWith(1, 'Updated 3 completed games.')
    expect(logSpy).toHaveBeenNthCalledWith(2, 'Updated 7 expired games.')
  })

  it('continues with expired updates when completed updates fail', async () => {
    const err = new Error('repo failed (completed)')
    gameRepository.updateCompletedGames.mockRejectedValueOnce(err)
    gameRepository.updateExpiredGames.mockResolvedValueOnce(1 as never)

    const logSpy = jest
      .spyOn((service as any).logger as Logger, 'log')
      .mockImplementation(() => undefined)

    await expect(service.clean()).resolves.toBeUndefined()

    expect(gameRepository.updateCompletedGames).toHaveBeenCalledTimes(1)
    expect(gameRepository.updateExpiredGames).toHaveBeenCalledTimes(1)
    expect(logSpy).toHaveBeenCalledWith('Updated 1 expired games.')
  })

  it('logs completed update and continues when expired updates fail', async () => {
    gameRepository.updateCompletedGames.mockResolvedValueOnce(2 as never)

    const err = new Error('repo failed (expired)')
    gameRepository.updateExpiredGames.mockRejectedValueOnce(err)

    const logSpy = jest
      .spyOn((service as any).logger as Logger, 'log')
      .mockImplementation(() => undefined)

    await expect(service.clean()).resolves.toBeUndefined()

    expect(gameRepository.updateCompletedGames).toHaveBeenCalledTimes(1)
    expect(gameRepository.updateExpiredGames).toHaveBeenCalledTimes(1)

    expect(logSpy).toHaveBeenCalledTimes(1)
    expect(logSpy).toHaveBeenCalledWith('Updated 2 completed games.')
  })

  it('clears transient state only for terminal games', async () => {
    gameRepository.updateCompletedGames.mockResolvedValueOnce(0 as never)
    gameRepository.updateExpiredGames.mockResolvedValueOnce(0 as never)
    gameRepository.find.mockResolvedValueOnce([
      {
        _id: 'expired-1',
        status: 'EXPIRED',
        currentTask: { _id: 'task-1' },
      },
      {
        _id: 'expired-2',
        status: 'EXPIRED',
        currentTask: { _id: 'task-2' },
      },
      { _id: 'active', status: 'ACTIVE', currentTask: { _id: 'task-3' } },
    ] as never)

    await service.clean()

    expect(gameRepository.find).toHaveBeenCalledWith({
      status: {
        $in: ['COMPLETED', 'EXPIRED', 'TERMINATED'],
      },
    })
    expect(gameAnswerRepository.clear).toHaveBeenNthCalledWith(
      1,
      'expired-1',
      'task-1',
    )
    expect(gameAnswerRepository.clear).toHaveBeenNthCalledWith(
      2,
      'expired-2',
      'task-2',
    )
    expect(gameAnswerRepository.clear).toHaveBeenCalledTimes(2)
  })

  it('continues clearing remaining terminal games after one cleanup failure', async () => {
    gameRepository.updateCompletedGames.mockResolvedValueOnce(0 as never)
    gameRepository.updateExpiredGames.mockResolvedValueOnce(0 as never)
    gameRepository.find.mockResolvedValueOnce([
      { _id: 'failed', status: 'EXPIRED', currentTask: { _id: 'task-1' } },
      {
        _id: 'remaining',
        status: 'EXPIRED',
        currentTask: { _id: 'task-2' },
      },
    ] as never)
    gameAnswerRepository.clear
      .mockRejectedValueOnce(new Error('redis failed'))
      .mockResolvedValueOnce(undefined)

    await expect(service.clean()).resolves.toBeUndefined()

    expect(gameAnswerRepository.clear).toHaveBeenCalledTimes(2)
    expect(gameAnswerRepository.clear).toHaveBeenLastCalledWith(
      'remaining',
      'task-2',
    )
    expect(errorSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Failed to clear transient answer state.',
        operation: 'clearTerminalAnswerState',
        gameId: 'failed',
        gameState: 'EXPIRED',
        taskId: 'task-1',
      }),
      expect.any(String),
    )
  })

  it('handles no terminal games and repeated cleanup safely', async () => {
    gameRepository.updateCompletedGames.mockResolvedValue(0 as never)
    gameRepository.updateExpiredGames.mockResolvedValue(0 as never)
    gameRepository.find.mockResolvedValue([])

    await expect(service.clean()).resolves.toBeUndefined()
    await expect(service.clean()).resolves.toBeUndefined()

    expect(gameAnswerRepository.clear).not.toHaveBeenCalled()
    expect(gameRepository.find).toHaveBeenCalledTimes(2)
  })
})
