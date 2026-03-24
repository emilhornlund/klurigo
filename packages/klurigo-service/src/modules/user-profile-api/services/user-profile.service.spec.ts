import {
  AuthProvider,
  QuizVisibility,
  UserProfileResponseDto,
} from '@klurigo/common'

import { UserNotFoundException } from '../../user/exceptions'

import { UserProfileService } from './user-profile.service'

describe('UserProfileService', () => {
  let service: UserProfileService

  let userService: {
    findUserProfileOrThrow: jest.Mock
  }
  let quizRepository: {
    countPublicQuizzesByOwnerId: jest.Mock
    countQuizzes: jest.Mock
    findQuizzes: jest.Mock
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
      countQuizzes: jest.fn(),
      findQuizzes: jest.fn(),
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

  describe('findPublicQuizzesByUserId', () => {
    const userId = 'user-123'
    const baseQuiz = {
      description: 'A fun quiz',
      mode: 'classic',
      category: 'general-knowledge',
      imageCoverURL: 'https://example.com/quiz.jpg',
      languageCode: 'en',
      owner: {
        _id: userId,
        defaultNickname: 'FrostyBear',
      },
      gameplaySummary: {
        count: 4,
        totalPlayerCount: 16,
        lastPlayedAt: new Date('2025-02-01T12:00:00.000Z'),
        totalClassicCorrectCount: 30,
        totalClassicIncorrectCount: 10,
        totalClassicUnansweredCount: 5,
        totalZeroToOneHundredPrecisionSum: 0,
        totalZeroToOneHundredAnsweredCount: 0,
        totalZeroToOneHundredUnansweredCount: 0,
      },
      ratingSummary: {
        avg: 4.5,
        count: 6,
        commentCount: 2,
      },
      created: new Date('2025-01-01T12:00:00.000Z'),
      updated: new Date('2025-01-02T12:00:00.000Z'),
    }

    it('should return paginated public quizzes with default sorting', async () => {
      const quizzes = [
        {
          ...baseQuiz,
          _id: 'quiz-1',
          title: 'Astronomy Basics',
          questions: [{ id: 'q1' }, { id: 'q2' }],
          visibility: QuizVisibility.Public,
        },
      ]

      quizRepository.countQuizzes.mockResolvedValue(1)
      quizRepository.findQuizzes.mockResolvedValue(quizzes)

      await expect(service.findPublicQuizzesByUserId(userId)).resolves.toEqual({
        results: [
          {
            id: 'quiz-1',
            title: 'Astronomy Basics',
            description: 'A fun quiz',
            mode: 'classic',
            visibility: QuizVisibility.Public,
            category: 'general-knowledge',
            imageCoverURL: 'https://example.com/quiz.jpg',
            languageCode: 'en',
            numberOfQuestions: 2,
            author: {
              id: userId,
              name: 'FrostyBear',
            },
            gameplaySummary: {
              count: 4,
              totalPlayerCount: 16,
              lastPlayed: new Date('2025-02-01T12:00:00.000Z'),
              difficultyPercentage: 0.24444444444444444,
            },
            ratingSummary: {
              stars: 4.5,
              comments: 2,
              total: 6,
            },
            created: new Date('2025-01-01T12:00:00.000Z'),
            updated: new Date('2025-01-02T12:00:00.000Z'),
          },
        ],
        total: 1,
        limit: 10,
        offset: 0,
      })

      expect(quizRepository.countQuizzes).toHaveBeenCalledWith({
        owner: { _id: userId },
        visibility: QuizVisibility.Public,
      })
      expect(quizRepository.findQuizzes).toHaveBeenCalledWith(
        {
          owner: { _id: userId },
          visibility: QuizVisibility.Public,
        },
        'title',
        'asc',
        10,
        0,
      )
    })

    it('should pass through explicit paging and sort values', async () => {
      quizRepository.countQuizzes.mockResolvedValue(24)
      quizRepository.findQuizzes.mockResolvedValue([])

      await expect(
        service.findPublicQuizzesByUserId(userId, 'updated', 'desc', 25, 50),
      ).resolves.toEqual({
        results: [],
        total: 24,
        limit: 25,
        offset: 50,
      })

      expect(quizRepository.countQuizzes).toHaveBeenCalledWith({
        owner: { _id: userId },
        visibility: QuizVisibility.Public,
      })
      expect(quizRepository.findQuizzes).toHaveBeenCalledWith(
        {
          owner: { _id: userId },
          visibility: QuizVisibility.Public,
        },
        'updated',
        'desc',
        25,
        50,
      )
    })
  })
})
