import { AuthProvider, UserProfileResponseDto } from '@klurigo/common'

import { UserNotFoundException } from '../../user/exceptions'

import { UserProfileService } from './user-profile.service'

describe('UserProfileService', () => {
  let service: UserProfileService

  let userService: {
    findUserProfileOrThrow: jest.Mock
  }
  let quizRepository: {
    countPublicQuizzesByOwnerId: jest.Mock
  }
  let gameResultRepository: {
    countHostedGamesByUserId: jest.Mock
    countPlayedGamesByUserId: jest.Mock
  }

  beforeEach(() => {
    userService = {
      findUserProfileOrThrow: jest.fn(),
    }
    quizRepository = {
      countPublicQuizzesByOwnerId: jest.fn(),
    }
    gameResultRepository = {
      countHostedGamesByUserId: jest.fn(),
      countPlayedGamesByUserId: jest.fn(),
    }

    service = new UserProfileService(
      userService as any,
      quizRepository as any,
      gameResultRepository as any,
    )
  })

  describe('findPublicUserProfile', () => {
    it('should aggregate the public profile response', async () => {
      const userId = 'user-123'
      const createdAt = new Date('2025-01-01T12:00:00.000Z')
      const user: UserProfileResponseDto = {
        id: userId,
        email: 'user@example.com',
        defaultNickname: 'FrostyBear',
        authProvider: AuthProvider.Local,
        created: createdAt,
        updated: createdAt,
      }

      userService.findUserProfileOrThrow.mockResolvedValue(user)
      quizRepository.countPublicQuizzesByOwnerId.mockResolvedValue(7)
      gameResultRepository.countHostedGamesByUserId.mockResolvedValue(11)
      gameResultRepository.countPlayedGamesByUserId.mockResolvedValue(19)

      await expect(service.findPublicUserProfile(userId)).resolves.toEqual({
        id: userId,
        nickname: 'FrostyBear',
        quizzesCount: 7,
        hostedGamesCount: 11,
        playedGamesCount: 19,
        createdAt,
      })

      expect(userService.findUserProfileOrThrow).toHaveBeenCalledWith(userId)
      expect(quizRepository.countPublicQuizzesByOwnerId).toHaveBeenCalledWith(
        userId,
      )
      expect(
        gameResultRepository.countHostedGamesByUserId,
      ).toHaveBeenCalledWith(userId)
      expect(
        gameResultRepository.countPlayedGamesByUserId,
      ).toHaveBeenCalledWith(userId)
    })

    it('should propagate user not found before loading counts', async () => {
      const userId = 'missing-user'
      const error = new UserNotFoundException(userId)

      userService.findUserProfileOrThrow.mockRejectedValue(error)

      await expect(service.findPublicUserProfile(userId)).rejects.toBe(error)

      expect(quizRepository.countPublicQuizzesByOwnerId).not.toHaveBeenCalled()
      expect(
        gameResultRepository.countHostedGamesByUserId,
      ).not.toHaveBeenCalled()
      expect(
        gameResultRepository.countPlayedGamesByUserId,
      ).not.toHaveBeenCalled()
    })
  })
})
