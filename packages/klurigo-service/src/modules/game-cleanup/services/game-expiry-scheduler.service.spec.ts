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
            findTerminalGamesPendingAnswerCleanup: jest.fn(),
            markTerminalGameAnswerStateCleared: jest.fn(),
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
    gameRepository.findTerminalGamesPendingAnswerCleanup.mockResolvedValue([])
    gameRepository.markTerminalGameAnswerStateCleared.mockResolvedValue(true)
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
    const debugSpy = jest
      .spyOn((service as any).logger as Logger, 'debug')
      .mockImplementation(() => undefined)

    await service.clean()

    expect(gameRepository.updateCompletedGames).toHaveBeenCalledTimes(1)
    expect(gameRepository.updateExpiredGames).toHaveBeenCalledTimes(1)

    expect(logSpy).toHaveBeenCalledTimes(2)
    expect(logSpy).toHaveBeenNthCalledWith(1, 'Updated 3 completed games.')
    expect(logSpy).toHaveBeenNthCalledWith(2, 'Updated 7 expired games.')
    expect(debugSpy).not.toHaveBeenCalled()
  })

  it('logs zero completed games updated at debug level only', async () => {
    gameRepository.updateCompletedGames.mockResolvedValueOnce(0 as never)
    gameRepository.updateExpiredGames.mockResolvedValueOnce(1 as never)

    const logSpy = jest
      .spyOn((service as any).logger as Logger, 'log')
      .mockImplementation(() => undefined)
    const debugSpy = jest
      .spyOn((service as any).logger as Logger, 'debug')
      .mockImplementation(() => undefined)

    await service.clean()

    expect(logSpy).toHaveBeenCalledTimes(1)
    expect(logSpy).toHaveBeenCalledWith('Updated 1 expired games.')
    expect(debugSpy).toHaveBeenCalledTimes(1)
    expect(debugSpy).toHaveBeenCalledWith('Updated 0 completed games.')
  })

  it('logs zero expired games updated at debug level only', async () => {
    gameRepository.updateCompletedGames.mockResolvedValueOnce(1 as never)
    gameRepository.updateExpiredGames.mockResolvedValueOnce(0 as never)

    const logSpy = jest
      .spyOn((service as any).logger as Logger, 'log')
      .mockImplementation(() => undefined)
    const debugSpy = jest
      .spyOn((service as any).logger as Logger, 'debug')
      .mockImplementation(() => undefined)

    await service.clean()

    expect(logSpy).toHaveBeenCalledTimes(1)
    expect(logSpy).toHaveBeenCalledWith('Updated 1 completed games.')
    expect(debugSpy).toHaveBeenCalledTimes(1)
    expect(debugSpy).toHaveBeenCalledWith('Updated 0 expired games.')
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
    expect(errorSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Failed to update completed games during scheduled cleanup.',
        operation: 'runUpdate',
        targetState: 'completed',
      }),
      expect.any(String),
    )
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

  it('clears pending terminal game answers in bounded pages and skips them on later runs', async () => {
    gameRepository.updateCompletedGames.mockResolvedValueOnce(0 as never)
    gameRepository.updateExpiredGames.mockResolvedValueOnce(0 as never)
    const firstPage = Array.from({ length: 100 }, (_, index) => ({
      _id: `game-${String(index).padStart(3, '0')}`,
      status: 'EXPIRED',
      currentTask: { _id: `task-${index}` },
    }))
    const finalPage = [
      {
        _id: 'game-100',
        status: 'COMPLETED',
        currentTask: { _id: 'task-100' },
      },
    ]
    gameRepository.findTerminalGamesPendingAnswerCleanup
      .mockResolvedValueOnce(firstPage as never)
      .mockResolvedValueOnce(finalPage as never)

    await service.clean()

    expect(
      gameRepository.findTerminalGamesPendingAnswerCleanup,
    ).toHaveBeenNthCalledWith(1, undefined, 100)
    expect(
      gameRepository.findTerminalGamesPendingAnswerCleanup,
    ).toHaveBeenNthCalledWith(2, 'game-099', 100)
    expect(gameAnswerRepository.clear).toHaveBeenCalledTimes(101)
    expect(
      gameRepository.markTerminalGameAnswerStateCleared,
    ).toHaveBeenCalledTimes(101)
    expect(gameAnswerRepository.clear).toHaveBeenLastCalledWith(
      'game-100',
      'task-100',
    )

    await service.clean()
    expect(
      gameRepository.findTerminalGamesPendingAnswerCleanup,
    ).toHaveBeenCalledTimes(3)
    expect(gameAnswerRepository.clear).toHaveBeenCalledTimes(101)
  })

  it('keeps Redis cleanup failures eligible for the next run and continues the current page', async () => {
    gameRepository.updateCompletedGames.mockResolvedValueOnce(0 as never)
    gameRepository.updateExpiredGames.mockResolvedValueOnce(0 as never)
    const failedGame = {
      _id: 'failed',
      status: 'EXPIRED',
      currentTask: { _id: 'task-1' },
    }
    const remainingGame = {
      _id: 'remaining',
      status: 'EXPIRED',
      currentTask: { _id: 'task-2' },
    }
    gameRepository.findTerminalGamesPendingAnswerCleanup
      .mockResolvedValueOnce([failedGame, remainingGame] as never)
      .mockResolvedValueOnce([failedGame] as never)
    gameAnswerRepository.clear
      .mockRejectedValueOnce(new Error('redis failed'))
      .mockResolvedValueOnce(undefined)

    await expect(service.clean()).resolves.toBeUndefined()

    expect(gameAnswerRepository.clear).toHaveBeenNthCalledWith(
      1,
      'failed',
      'task-1',
    )
    expect(gameAnswerRepository.clear).toHaveBeenNthCalledWith(
      2,
      'remaining',
      'task-2',
    )
    expect(
      gameRepository.markTerminalGameAnswerStateCleared,
    ).toHaveBeenCalledTimes(1)
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

    await expect(service.clean()).resolves.toBeUndefined()
    expect(gameAnswerRepository.clear).toHaveBeenLastCalledWith(
      'failed',
      'task-1',
    )
    expect(
      gameRepository.markTerminalGameAnswerStateCleared,
    ).toHaveBeenCalledTimes(2)
  })

  it('retries idempotent Redis deletion when persisting the cleanup marker fails', async () => {
    const candidate = {
      _id: 'game-1',
      status: 'TERMINATED',
      currentTask: { _id: 'task-1' },
    }
    gameRepository.findTerminalGamesPendingAnswerCleanup
      .mockResolvedValueOnce([candidate] as never)
      .mockResolvedValueOnce([candidate] as never)
    gameRepository.markTerminalGameAnswerStateCleared
      .mockRejectedValueOnce(new Error('Mongo unavailable'))
      .mockResolvedValueOnce(true)

    await expect(service.clean()).resolves.toBeUndefined()
    expect(gameAnswerRepository.clear).toHaveBeenCalledTimes(1)
    expect(errorSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Failed to persist transient answer cleanup marker.',
        operation: 'markTerminalGameAnswerStateCleared',
        gameId: 'game-1',
      }),
      expect.any(String),
    )

    await expect(service.clean()).resolves.toBeUndefined()
    expect(gameAnswerRepository.clear).toHaveBeenCalledTimes(2)
    expect(
      gameRepository.markTerminalGameAnswerStateCleared,
    ).toHaveBeenCalledTimes(2)
  })

  it('does not clear answers if a stale cleanup candidate is now active', async () => {
    gameRepository.findTerminalGamesPendingAnswerCleanup.mockResolvedValueOnce([
      {
        _id: 'active',
        status: 'ACTIVE',
        currentTask: { _id: 'task-1' },
      },
    ] as never)

    await expect(service.clean()).resolves.toBeUndefined()

    expect(gameAnswerRepository.clear).not.toHaveBeenCalled()
    expect(
      gameRepository.markTerminalGameAnswerStateCleared,
    ).not.toHaveBeenCalled()
  })

  it('handles no terminal games and repeated cleanup safely', async () => {
    gameRepository.updateCompletedGames.mockResolvedValue(0 as never)
    gameRepository.updateExpiredGames.mockResolvedValue(0 as never)
    gameRepository.findTerminalGamesPendingAnswerCleanup.mockResolvedValue([])

    await expect(service.clean()).resolves.toBeUndefined()
    await expect(service.clean()).resolves.toBeUndefined()

    expect(gameAnswerRepository.clear).not.toHaveBeenCalled()
    expect(
      gameRepository.findTerminalGamesPendingAnswerCleanup,
    ).toHaveBeenCalledTimes(2)
  })
})
