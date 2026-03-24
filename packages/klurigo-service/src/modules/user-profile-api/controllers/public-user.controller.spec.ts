import { Test } from '@nestjs/testing'

import { PaginatedQuizResponse } from '../../quiz-api/controllers/models'
import { UserProfileService } from '../services'

import { UserQuizzesPageFilter } from './filters'
import { PublicUserController } from './public-user.controller'
import { PublicUserProfileResponse } from './responses'

describe('PublicUserController', () => {
  let controller: PublicUserController

  let userProfileService: {
    findPublicUserProfile: jest.Mock
    findPublicQuizzesByUserId: jest.Mock
  }

  beforeEach(async () => {
    userProfileService = {
      findPublicUserProfile: jest.fn(),
      findPublicQuizzesByUserId: jest.fn(),
    }

    const moduleRef = await Test.createTestingModule({
      controllers: [PublicUserController],
      providers: [
        { provide: UserProfileService, useValue: userProfileService },
      ],
    }).compile()

    controller = moduleRef.get(PublicUserController)
  })

  describe('getPublicUserProfile', () => {
    it('delegates to UserProfileService.findPublicUserProfile', async () => {
      const userId = 'user-123'
      const profile: PublicUserProfileResponse = {
        id: userId,
        nickname: 'FrostyBear',
        quizzesCount: 7,
        hostedGamesCount: 11,
        playedGamesCount: 19,
        createdAt: new Date('2025-01-01T12:00:00.000Z'),
      }

      userProfileService.findPublicUserProfile.mockResolvedValue(profile)

      await expect(controller.getPublicUserProfile(userId)).resolves.toBe(
        profile,
      )
      expect(userProfileService.findPublicUserProfile).toHaveBeenCalledWith(
        userId,
      )
    })
  })

  describe('getPublicUserQuizzes', () => {
    it('delegates to UserProfileService.findPublicQuizzesByUserId with query params', async () => {
      const userId = 'user-123'
      const queryParams: UserQuizzesPageFilter = {
        sort: 'updated',
        order: 'desc',
        limit: 25,
        offset: 50,
      }
      const response: PaginatedQuizResponse = {
        results: [],
        total: 0,
        limit: 25,
        offset: 50,
      }

      userProfileService.findPublicQuizzesByUserId.mockResolvedValue(response)

      await expect(
        controller.getPublicUserQuizzes(userId, queryParams),
      ).resolves.toBe(response)
      expect(userProfileService.findPublicQuizzesByUserId).toHaveBeenCalledWith(
        userId,
        'updated',
        'desc',
        25,
        50,
      )
    })
  })
})
