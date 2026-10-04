import { Logger } from '@nestjs/common'
import { Test } from '@nestjs/testing'

import { UserRepository } from '../repositories'

import { GameEventListener } from './game-event.listener'

describe(GameEventListener.name, () => {
  let listener: GameEventListener
  let userRepository: {
    findUserById: jest.Mock
    update: jest.Mock
  }
  let errorSpy: jest.SpyInstance

  beforeEach(async () => {
    userRepository = {
      findUserById: jest.fn(),
      update: jest.fn(),
    }

    const moduleRef = await Test.createTestingModule({
      providers: [
        GameEventListener,
        { provide: UserRepository, useValue: userRepository },
      ],
    }).compile()

    listener = moduleRef.get(GameEventListener)

    const logger = (listener as unknown as { logger: Logger }).logger
    errorSpy = jest.spyOn(logger, 'error').mockImplementation(() => undefined)

    jest.clearAllMocks()
  })

  afterEach(() => {
    errorSpy.mockRestore()
  })

  describe('handleGamePlayerJoined', () => {
    it('updates user defaultNickname when user exists', async () => {
      userRepository.findUserById.mockResolvedValueOnce({ _id: 'user-123' })
      userRepository.update.mockResolvedValueOnce(undefined)

      await listener.handleGamePlayerJoined({
        gameId: 'game-456',
        participantId: 'user-123',
        nickname: 'CoolPlayer',
      })

      expect(userRepository.findUserById).toHaveBeenCalledTimes(1)
      expect(userRepository.findUserById).toHaveBeenCalledWith('user-123')

      expect(userRepository.update).toHaveBeenCalledTimes(1)
      expect(userRepository.update).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({
          defaultNickname: 'CoolPlayer',
          updatedAt: expect.any(Date),
        }),
      )
    })

    it('does not call update when user does not exist', async () => {
      userRepository.findUserById.mockResolvedValueOnce(null)

      await listener.handleGamePlayerJoined({
        gameId: 'game-456',
        participantId: 'unknown-user',
        nickname: 'GhostPlayer',
      })

      expect(userRepository.findUserById).toHaveBeenCalledTimes(1)
      expect(userRepository.findUserById).toHaveBeenCalledWith('unknown-user')

      expect(userRepository.update).not.toHaveBeenCalled()
    })

    it('does not throw when update throws an error', async () => {
      userRepository.findUserById.mockResolvedValueOnce({ _id: 'user-123' })
      userRepository.update.mockRejectedValueOnce(new Error('Database error'))

      await expect(
        listener.handleGamePlayerJoined({
          gameId: 'game-456',
          participantId: 'user-123',
          nickname: 'FailingPlayer',
        }),
      ).resolves.toBeUndefined()

      expect(userRepository.update).toHaveBeenCalledTimes(1)
      expect(errorSpy).toHaveBeenCalledTimes(1)
    })
  })
})
