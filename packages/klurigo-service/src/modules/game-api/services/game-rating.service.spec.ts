import { QuizRatingAuthorType, QuizRatingDto } from '@klurigo/common'
import { ForbiddenException } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { v4 as uuidv4 } from 'uuid'

import {
  buildMockPrimaryUser,
  createMockClassicQuiz,
  createMockGameDocument,
  createMockGamePlayerParticipantDocument,
  createMockPodiumTaskDocument,
  MOCK_DEFAULT_PLAYER_ID,
} from '../../../../test-utils/data'
import { GameRepository } from '../../game-core/repositories'
import { GameDocument } from '../../game-core/repositories/models/schemas'
import { QuizRepository } from '../../quiz-core/repositories'
import {
  QuizRatingAnonymousAuthorWithBase,
  QuizRatingUserAuthorWithBase,
} from '../../quiz-core/repositories/models/schemas'
import { QuizRatingService } from '../../quiz-rating-api/services'
import { UserRepository } from '../../user/repositories'

import { GameRatingService } from './game-rating.service'

describe(GameRatingService.name, () => {
  let service: GameRatingService

  let gameRepository: jest.Mocked<Pick<GameRepository, 'findGameByIDOrThrow'>>
  let quizRepository: jest.Mocked<Pick<QuizRepository, 'findQuizByIdOrThrow'>>
  let userRepository: jest.Mocked<Pick<UserRepository, 'findUserById'>>
  let quizRatingService: jest.Mocked<
    Pick<QuizRatingService, 'createOrUpdateQuizRating'>
  >

  const mockUser = buildMockPrimaryUser()
  const mockOwnerId = uuidv4()
  const mockOwner = buildMockPrimaryUser({ _id: mockOwnerId })
  const mockQuiz = createMockClassicQuiz({
    _id: uuidv4(),
    owner: mockOwner,
  })

  const mockAnonymousParticipantId = uuidv4()
  const mockAnonymousNickname = 'CoolPanda'

  const mockRatingDto: QuizRatingDto = {
    id: uuidv4(),
    quizId: mockQuiz._id,
    stars: 4,
    comment: 'Great quiz!',
    author: { id: mockUser._id, nickname: mockUser.defaultNickname },
    createdAt: new Date('2026-01-10T12:00:00.000Z'),
    updatedAt: new Date('2026-01-10T12:00:00.000Z'),
  }

  beforeEach(async () => {
    gameRepository = {
      findGameByIDOrThrow: jest.fn(),
    }

    quizRepository = {
      findQuizByIdOrThrow: jest.fn(),
    }

    userRepository = {
      findUserById: jest.fn(),
    }

    quizRatingService = {
      createOrUpdateQuizRating: jest.fn(),
    }

    const moduleRef = await Test.createTestingModule({
      providers: [
        GameRatingService,
        { provide: GameRepository, useValue: gameRepository },
        { provide: QuizRepository, useValue: quizRepository },
        { provide: UserRepository, useValue: userRepository },
        { provide: QuizRatingService, useValue: quizRatingService },
      ],
    }).compile()

    service = moduleRef.get(GameRatingService)

    jest.clearAllMocks()
  })

  describe('createOrUpdateRating', () => {
    it('should create a user-authored rating when participant is a logged-in user', async () => {
      const gameId = uuidv4()
      const mockGame = createMockGameDocument({
        _id: gameId,
        quiz: mockQuiz,
        currentTask: createMockPodiumTaskDocument(),
        participants: [
          createMockGamePlayerParticipantDocument({
            participantId: mockUser._id,
          }),
        ],
      }) as unknown as GameDocument

      gameRepository.findGameByIDOrThrow.mockResolvedValue(mockGame)
      quizRepository.findQuizByIdOrThrow.mockResolvedValue(mockQuiz)
      userRepository.findUserById.mockResolvedValue(mockUser)
      quizRatingService.createOrUpdateQuizRating.mockResolvedValue(
        mockRatingDto,
      )

      const result = await service.createOrUpdateRating(
        gameId,
        mockUser._id,
        4,
        'Great quiz!',
      )

      expect(result).toBe(mockRatingDto)
      expect(gameRepository.findGameByIDOrThrow).toHaveBeenCalledWith(
        gameId,
        false,
      )
      expect(quizRepository.findQuizByIdOrThrow).toHaveBeenCalledWith(
        mockQuiz._id,
      )
      expect(userRepository.findUserById).toHaveBeenCalledWith(mockUser._id)

      const authorArg = quizRatingService.createOrUpdateQuizRating.mock
        .calls[0][1] as QuizRatingUserAuthorWithBase
      expect(authorArg.type).toBe(QuizRatingAuthorType.User)
      expect(authorArg.user).toBe(mockUser)
      expect(quizRatingService.createOrUpdateQuizRating).toHaveBeenCalledWith(
        mockQuiz._id,
        authorArg,
        4,
        'Great quiz!',
      )
    })

    it('should create an anonymous-authored rating when participant is not a user', async () => {
      const gameId = uuidv4()
      const mockGame = createMockGameDocument({
        _id: gameId,
        quiz: mockQuiz,
        currentTask: createMockPodiumTaskDocument(),
        participants: [
          createMockGamePlayerParticipantDocument({
            participantId: mockAnonymousParticipantId,
            nickname: mockAnonymousNickname,
          }),
        ],
      }) as unknown as GameDocument

      const anonRatingDto: QuizRatingDto = {
        ...mockRatingDto,
        author: {
          id: mockAnonymousParticipantId,
          nickname: mockAnonymousNickname,
        },
      }

      gameRepository.findGameByIDOrThrow.mockResolvedValue(mockGame)
      quizRepository.findQuizByIdOrThrow.mockResolvedValue(mockQuiz)
      userRepository.findUserById.mockResolvedValue(null)
      quizRatingService.createOrUpdateQuizRating.mockResolvedValue(
        anonRatingDto,
      )

      const result = await service.createOrUpdateRating(
        gameId,
        mockAnonymousParticipantId,
        3,
        undefined,
      )

      expect(result).toBe(anonRatingDto)

      const authorArg = quizRatingService.createOrUpdateQuizRating.mock
        .calls[0][1] as QuizRatingAnonymousAuthorWithBase
      expect(authorArg.type).toBe(QuizRatingAuthorType.Anonymous)
      expect(authorArg.participantId).toBe(mockAnonymousParticipantId)
      expect(authorArg.nickname).toBe(mockAnonymousNickname)
      expect(quizRatingService.createOrUpdateQuizRating).toHaveBeenCalledWith(
        mockQuiz._id,
        authorArg,
        3,
        undefined,
      )
    })

    it('should fall back to participantId as nickname when anonymous participant is not in participants list', async () => {
      const unknownParticipantId = uuidv4()
      const gameId = uuidv4()
      const mockGame = createMockGameDocument({
        _id: gameId,
        quiz: mockQuiz,
        currentTask: createMockPodiumTaskDocument(),
        participants: [],
      }) as unknown as GameDocument

      const anonRatingDto: QuizRatingDto = {
        ...mockRatingDto,
        author: { id: unknownParticipantId, nickname: unknownParticipantId },
      }

      gameRepository.findGameByIDOrThrow.mockResolvedValue(mockGame)
      quizRepository.findQuizByIdOrThrow.mockResolvedValue(mockQuiz)
      userRepository.findUserById.mockResolvedValue(null)
      quizRatingService.createOrUpdateQuizRating.mockResolvedValue(
        anonRatingDto,
      )

      await service.createOrUpdateRating(
        gameId,
        unknownParticipantId,
        5,
        undefined,
      )

      const authorArg = quizRatingService.createOrUpdateQuizRating.mock
        .calls[0][1] as QuizRatingAnonymousAuthorWithBase
      expect(authorArg.type).toBe(QuizRatingAuthorType.Anonymous)
      expect(authorArg.participantId).toBe(unknownParticipantId)
      expect(authorArg.nickname).toBe(unknownParticipantId)
    })

    it('should throw ForbiddenException when logged-in participant is the quiz owner', async () => {
      const gameId = uuidv4()
      const mockGame = createMockGameDocument({
        _id: gameId,
        quiz: mockQuiz,
        currentTask: createMockPodiumTaskDocument(),
        participants: [
          createMockGamePlayerParticipantDocument({
            participantId: mockOwnerId,
          }),
        ],
      }) as unknown as GameDocument

      gameRepository.findGameByIDOrThrow.mockResolvedValue(mockGame)
      quizRepository.findQuizByIdOrThrow.mockResolvedValue(mockQuiz)
      userRepository.findUserById.mockResolvedValue(mockOwner)

      await expect(
        service.createOrUpdateRating(gameId, mockOwnerId, 5),
      ).rejects.toThrow(ForbiddenException)

      expect(quizRatingService.createOrUpdateQuizRating).not.toHaveBeenCalled()
    })

    it('should throw ForbiddenException when current task is not podium', async () => {
      const gameId = uuidv4()
      const mockGame = createMockGameDocument({
        _id: gameId,
        quiz: mockQuiz,
      }) as unknown as GameDocument

      gameRepository.findGameByIDOrThrow.mockResolvedValue(mockGame)

      await expect(
        service.createOrUpdateRating(gameId, MOCK_DEFAULT_PLAYER_ID, 4),
      ).rejects.toThrow(ForbiddenException)

      expect(quizRepository.findQuizByIdOrThrow).not.toHaveBeenCalled()
      expect(userRepository.findUserById).not.toHaveBeenCalled()
      expect(quizRatingService.createOrUpdateQuizRating).not.toHaveBeenCalled()
    })

    it('should propagate errors thrown by findGameByIDOrThrow', async () => {
      const gameId = uuidv4()
      const error = new Error('Game not found')
      gameRepository.findGameByIDOrThrow.mockRejectedValue(error)

      await expect(
        service.createOrUpdateRating(gameId, MOCK_DEFAULT_PLAYER_ID, 4),
      ).rejects.toThrow(error)
    })

    it('should propagate errors thrown by findQuizByIdOrThrow', async () => {
      const gameId = uuidv4()
      const mockGame = createMockGameDocument({
        _id: gameId,
        quiz: mockQuiz,
        currentTask: createMockPodiumTaskDocument(),
      }) as unknown as GameDocument

      gameRepository.findGameByIDOrThrow.mockResolvedValue(mockGame)
      quizRepository.findQuizByIdOrThrow.mockRejectedValue(
        new Error('Quiz not found'),
      )

      await expect(
        service.createOrUpdateRating(gameId, MOCK_DEFAULT_PLAYER_ID, 4),
      ).rejects.toThrow('Quiz not found')
    })

    it('should use comment undefined when no comment provided for anonymous author', async () => {
      const gameId = uuidv4()
      const mockGame = createMockGameDocument({
        _id: gameId,
        quiz: mockQuiz,
        currentTask: createMockPodiumTaskDocument(),
        participants: [
          createMockGamePlayerParticipantDocument({
            participantId: mockAnonymousParticipantId,
            nickname: mockAnonymousNickname,
          }),
        ],
      }) as unknown as GameDocument

      gameRepository.findGameByIDOrThrow.mockResolvedValue(mockGame)
      quizRepository.findQuizByIdOrThrow.mockResolvedValue(mockQuiz)
      userRepository.findUserById.mockResolvedValue(null)
      quizRatingService.createOrUpdateQuizRating.mockResolvedValue(
        mockRatingDto,
      )

      await service.createOrUpdateRating(gameId, mockAnonymousParticipantId, 2)

      expect(quizRatingService.createOrUpdateQuizRating).toHaveBeenCalledWith(
        mockQuiz._id,
        expect.objectContaining({ type: QuizRatingAuthorType.Anonymous }),
        2,
        undefined,
      )
    })

    it('should pass stars and comment to createOrUpdateQuizRating for user author', async () => {
      const gameId = uuidv4()
      const mockGame = createMockGameDocument({
        _id: gameId,
        quiz: mockQuiz,
        currentTask: createMockPodiumTaskDocument(),
        participants: [
          createMockGamePlayerParticipantDocument({
            participantId: mockUser._id,
          }),
        ],
      }) as unknown as GameDocument

      gameRepository.findGameByIDOrThrow.mockResolvedValue(mockGame)
      quizRepository.findQuizByIdOrThrow.mockResolvedValue(mockQuiz)
      userRepository.findUserById.mockResolvedValue(mockUser)
      quizRatingService.createOrUpdateQuizRating.mockResolvedValue(
        mockRatingDto,
      )

      await service.createOrUpdateRating(gameId, mockUser._id, 5, 'Excellent!')

      expect(quizRatingService.createOrUpdateQuizRating).toHaveBeenCalledWith(
        mockQuiz._id,
        expect.objectContaining({ type: QuizRatingAuthorType.User }),
        5,
        'Excellent!',
      )
    })
  })
})
