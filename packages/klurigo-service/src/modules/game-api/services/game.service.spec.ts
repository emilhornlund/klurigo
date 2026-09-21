import { GameParticipantType, GameStatus, QuestionType } from '@klurigo/common'
import { Logger } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { Test } from '@nestjs/testing'
import { getRedisConnectionToken } from '@nestjs-modules/ioredis'

import {
  createMockClassicQuiz,
  createMockGameDocument,
  createMockGameHostParticipantDocument,
  createMockGamePlayerParticipantDocument,
  createMockLobbyTaskDocument,
  createMockMultiChoiceQuestionDocument,
  createMockPodiumTaskDocument,
  createMockQuestionResultTaskDocument,
  createMockQuestionTaskDocument,
  createMockRangeQuestionDocument,
  createMockTrueFalseQuestionDocument,
  createMockTypeAnswerQuestionDocument,
} from '../../../../test-utils/data'
import { GamePlayerJoinEventKey } from '../../../app/shared/event/game-join.event'
import {
  GameAnswerRepository,
  GameRepository,
} from '../../game-core/repositories'
import { TaskType } from '../../game-core/repositories/models/schemas'
import type {
  Game,
  QuestionResultTaskCorrectAnswer,
} from '../../game-core/repositories/models/schemas'
import { GameEventPublisher } from '../../game-event/services'
import { GameTaskTransitionScheduler } from '../../game-task/services'
import { QuizRepository } from '../../quiz-core/repositories'

import { GameService } from './game.service'

describe(GameService.name, () => {
  let service: GameService

  let gameRepository: {
    find: jest.Mock
    delete: jest.Mock
    findGamesByParticipantId: jest.Mock
    findGameByIDOrThrow: jest.Mock
    findAndSaveWithLock: jest.Mock
    findAndSaveWithLockIfChanged: jest.Mock
  }

  let gameAnswerRepository: {
    submitOnce: jest.Mock
    findAllAnswersByGameId: jest.Mock
    clear: jest.Mock
  }

  let eventEmitter: {
    emit: jest.Mock
  }

  let debugSpy: jest.SpyInstance
  let errorSpy: jest.SpyInstance

  beforeEach(async () => {
    gameRepository = {
      find: jest.fn(),
      delete: jest.fn(),
      findGamesByParticipantId: jest.fn(),
      findGameByIDOrThrow: jest.fn(),
      findAndSaveWithLock: jest.fn(),
      findAndSaveWithLockIfChanged: jest.fn(),
    }

    gameAnswerRepository = {
      submitOnce: jest.fn(),
      findAllAnswersByGameId: jest.fn(),
      clear: jest.fn(),
    }

    eventEmitter = {
      emit: jest.fn(),
    }

    const moduleRef = await Test.createTestingModule({
      providers: [
        GameService,
        { provide: GameRepository, useValue: gameRepository },
        { provide: GameAnswerRepository, useValue: gameAnswerRepository },
        { provide: QuizRepository, useValue: {} },
        { provide: GameTaskTransitionScheduler, useValue: {} },
        { provide: GameEventPublisher, useValue: {} },
        { provide: EventEmitter2, useValue: eventEmitter },
        { provide: getRedisConnectionToken(), useValue: {} },
      ],
    }).compile()

    service = moduleRef.get(GameService)

    const logger = (service as unknown as { logger: Logger }).logger
    debugSpy = jest.spyOn(logger, 'debug').mockImplementation(() => undefined)
    errorSpy = jest.spyOn(logger, 'error').mockImplementation(() => undefined)

    jest.clearAllMocks()
  })

  afterEach(() => {
    debugSpy.mockRestore()
    errorSpy.mockRestore()
  })

  describe('findGamesByParticipantId', () => {
    it('calls repository with participantId, offset, and limit (explicit values)', async () => {
      gameRepository.findGamesByParticipantId = jest
        .fn()
        .mockResolvedValueOnce({ results: [], total: 0 })

      await service.findGamesByParticipantId('p-1', 10, 25)

      expect(gameRepository.findGamesByParticipantId).toHaveBeenCalledTimes(1)
      expect(gameRepository.findGamesByParticipantId).toHaveBeenCalledWith(
        'p-1',
        10,
        25,
      )
    })

    it('uses default offset=0 and limit=5 when not provided', async () => {
      gameRepository.findGamesByParticipantId = jest
        .fn()
        .mockResolvedValueOnce({ results: [], total: 0 })

      await service.findGamesByParticipantId('p-1')

      expect(gameRepository.findGamesByParticipantId).toHaveBeenCalledTimes(1)
      expect(gameRepository.findGamesByParticipantId).toHaveBeenCalledWith(
        'p-1',
        0,
        5,
      )
    })

    it('maps host participant to host history dto', async () => {
      const game = createMockGameDocument({
        _id: 'g-1',
        name: 'Game 1',
        created: new Date('2026-01-01T10:00:00.000Z'),
        quiz: createMockClassicQuiz({
          imageCoverURL: 'https://example.test/cover.png',
        }),
        currentTask: createMockLobbyTaskDocument(),
        participants: [
          createMockGameHostParticipantDocument({ participantId: 'p-host' }),
        ],
      })
      gameRepository.findGamesByParticipantId = jest
        .fn()
        .mockResolvedValueOnce({
          results: [game],
          total: 1,
        })

      const result = await service.findGamesByParticipantId('p-host', 0, 5)

      expect(result).toEqual({
        results: [
          {
            id: 'g-1',
            name: 'Game 1',
            mode: game.mode,
            status: GameStatus.Active,
            imageCoverURL: 'https://example.test/cover.png',
            created: game.created,
            participantType: GameParticipantType.HOST,
          },
        ],
        total: 1,
        limit: 5,
        offset: 0,
      })
    })

    it('maps player participant to player history dto including rank and score', async () => {
      const game = createMockGameDocument({
        _id: 'g-2',
        name: 'Game 2',
        created: new Date('2026-01-01T11:00:00.000Z'),
        quiz: createMockClassicQuiz({ imageCoverURL: undefined }),
        currentTask: createMockLobbyTaskDocument(),
        participants: [
          createMockGamePlayerParticipantDocument({
            participantId: 'p-1',
            rank: 3,
            totalScore: 420,
          }),
        ],
      })
      gameRepository.findGamesByParticipantId = jest
        .fn()
        .mockResolvedValueOnce({
          results: [game],
          total: 1,
        })

      const result = await service.findGamesByParticipantId('p-1', 0, 5)

      expect(result.results[0]).toEqual({
        id: 'g-2',
        name: 'Game 2',
        mode: game.mode,
        status: GameStatus.Active,
        imageCoverURL: undefined,
        created: game.created,
        participantType: GameParticipantType.PLAYER,
        rank: 3,
        score: 420,
      })
    })

    it('forces status to Completed when game is Active and current task is Podium', async () => {
      const game = createMockGameDocument({
        _id: 'g-3',
        name: 'Game 3',
        created: new Date('2026-01-01T12:00:00.000Z'),
        currentTask: createMockPodiumTaskDocument(),
        participants: [
          createMockGameHostParticipantDocument({ participantId: 'p-1' }),
        ],
      })
      gameRepository.findGamesByParticipantId = jest
        .fn()
        .mockResolvedValueOnce({
          results: [game],
          total: 1,
        })

      const result = await service.findGamesByParticipantId('p-1', 0, 5)

      expect(result.results[0]).toMatchObject({
        id: 'g-3',
        status: GameStatus.Completed,
        participantType: GameParticipantType.HOST,
      })
    })

    it('keeps status as Completed when repository returns Completed', async () => {
      const game = createMockGameDocument({
        _id: 'g-4',
        name: 'Game 4',
        status: GameStatus.Completed,
        created: new Date('2026-01-01T13:00:00.000Z'),
        currentTask: createMockPodiumTaskDocument(),
        participants: [
          createMockGamePlayerParticipantDocument({
            participantId: 'p-1',
            rank: 1,
            totalScore: 999,
          }),
        ],
      })
      gameRepository.findGamesByParticipantId = jest
        .fn()
        .mockResolvedValueOnce({
          results: [game],
          total: 1,
        })

      const result = await service.findGamesByParticipantId('p-1', 0, 5)

      expect(result.results[0]).toMatchObject({
        id: 'g-4',
        status: GameStatus.Completed,
        participantType: GameParticipantType.PLAYER,
        rank: 1,
        score: 999,
      })
    })

    it('throws when the participant is not present in a returned game', async () => {
      const game = createMockGameDocument({
        _id: 'g-missing',
        name: 'Missing',
        created: new Date('2026-01-01T14:00:00.000Z'),
        currentTask: createMockLobbyTaskDocument(),
        participants: [
          createMockGameHostParticipantDocument({
            participantId: 'someone-else',
          }),
        ],
      })
      gameRepository.findGamesByParticipantId = jest
        .fn()
        .mockResolvedValueOnce({
          results: [game],
          total: 1,
        })

      await expect(
        service.findGamesByParticipantId('p-1', 0, 5),
      ).rejects.toThrow(`Participant p-1 not found in game g-missing`)
    })

    it('throws when participant exists but has an unknown type', async () => {
      gameRepository.findGamesByParticipantId = jest
        .fn()
        .mockResolvedValueOnce({
          results: [
            {
              _id: 'g-unknown',
              name: 'Unknown',
              mode: 'Classic',
              status: GameStatus.Active,
              currentTask: { type: TaskType.Lobby },
              created: '2026-01-01T15:00:00.000Z',
              participants: [{ participantId: 'p-1', type: 'ALIEN' }],
            },
          ],
          total: 1,
        })

      await expect(
        service.findGamesByParticipantId('p-1', 0, 5),
      ).rejects.toThrow(`Unknown participant type: ALIEN`)
    })

    it('maps multiple games and preserves total/limit/offset', async () => {
      const firstGame = createMockGameDocument({
        _id: 'g-1',
        name: 'Game 1',
        created: new Date('2026-01-01T10:00:00.000Z'),
        quiz: createMockClassicQuiz({
          imageCoverURL: 'https://example.test/c1.png',
        }),
        currentTask: createMockLobbyTaskDocument(),
        participants: [
          createMockGameHostParticipantDocument({ participantId: 'p-1' }),
        ],
      })
      const secondGame = createMockGameDocument({
        _id: 'g-2',
        name: 'Game 2',
        created: new Date('2026-01-01T11:00:00.000Z'),
        quiz: createMockClassicQuiz({
          imageCoverURL: 'https://example.test/c2.png',
        }),
        currentTask: createMockPodiumTaskDocument(),
        participants: [
          createMockGamePlayerParticipantDocument({
            participantId: 'p-1',
            rank: 2,
            totalScore: 200,
          }),
        ],
      })
      gameRepository.findGamesByParticipantId = jest
        .fn()
        .mockResolvedValueOnce({
          results: [firstGame, secondGame],
          total: 123,
        })

      const result = await service.findGamesByParticipantId('p-1', 20, 2)

      expect(result).toEqual({
        results: [
          {
            id: 'g-1',
            name: 'Game 1',
            mode: firstGame.mode,
            status: GameStatus.Active,
            imageCoverURL: 'https://example.test/c1.png',
            created: firstGame.created,
            participantType: GameParticipantType.HOST,
          },
          {
            id: 'g-2',
            name: 'Game 2',
            mode: secondGame.mode,
            status: GameStatus.Completed,
            imageCoverURL: 'https://example.test/c2.png',
            created: secondGame.created,
            participantType: GameParticipantType.PLAYER,
            rank: 2,
            score: 200,
          },
        ],
        total: 123,
        limit: 2,
        offset: 20,
      })
    })
  })

  describe('deleteQuiz', () => {
    it('finds games by quiz id and deletes each one', async () => {
      gameRepository.find.mockResolvedValueOnce([
        { _id: 'g-1' },
        { _id: 'g-2' },
      ])
      gameRepository.delete.mockResolvedValue(true)

      await service.deleteQuiz('q-1')

      expect(gameRepository.find).toHaveBeenCalledTimes(1)
      expect(gameRepository.find).toHaveBeenCalledWith({
        quiz: 'q-1',
      })

      expect(gameRepository.delete).toHaveBeenCalledTimes(2)
      expect(gameRepository.delete).toHaveBeenNthCalledWith(1, 'g-1')
      expect(gameRepository.delete).toHaveBeenNthCalledWith(2, 'g-2')
    })

    it('emits game.deleted only for successfully deleted games', async () => {
      gameRepository.find.mockResolvedValueOnce([
        { _id: 'g-1' },
        { _id: 'g-2' },
        { _id: 'g-3' },
      ])

      gameRepository.delete
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true)

      await service.deleteQuiz('q-1')

      expect(eventEmitter.emit).toHaveBeenCalledTimes(2)
      expect(eventEmitter.emit).toHaveBeenNthCalledWith(1, 'game.deleted', {
        gameId: 'g-1',
      })
      expect(eventEmitter.emit).toHaveBeenNthCalledWith(2, 'game.deleted', {
        gameId: 'g-3',
      })

      expect(debugSpy).toHaveBeenCalledTimes(2)
      expect(debugSpy).toHaveBeenCalledWith(
        `Emitting deleted event for game 'g-1'`,
      )
      expect(debugSpy).toHaveBeenCalledWith(
        `Emitting deleted event for game 'g-3'`,
      )
    })

    it('suppresses repository delete errors and continues processing remaining games', async () => {
      gameRepository.find.mockResolvedValueOnce([
        { _id: 'g-1' },
        { _id: 'g-2' },
        { _id: 'g-3' },
      ])

      const deleteError = new Error('db down')
      gameRepository.delete
        .mockRejectedValueOnce(deleteError)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(true)

      await service.deleteQuiz('q-1')

      expect(gameRepository.delete).toHaveBeenCalledTimes(3)
      expect(gameRepository.delete).toHaveBeenNthCalledWith(1, 'g-1')
      expect(gameRepository.delete).toHaveBeenNthCalledWith(2, 'g-2')
      expect(gameRepository.delete).toHaveBeenNthCalledWith(3, 'g-3')

      expect(eventEmitter.emit).toHaveBeenCalledTimes(2)
      expect(eventEmitter.emit).toHaveBeenNthCalledWith(1, 'game.deleted', {
        gameId: 'g-2',
      })
      expect(eventEmitter.emit).toHaveBeenNthCalledWith(2, 'game.deleted', {
        gameId: 'g-3',
      })
      expect(errorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Failed to delete game during quiz cleanup.',
          operation: 'deleteQuiz',
          quizId: 'q-1',
          gameId: 'g-1',
        }),
        deleteError.stack,
      )
    })

    it('does nothing when no games are found', async () => {
      gameRepository.find.mockResolvedValueOnce([])

      await service.deleteQuiz('q-empty')

      expect(gameRepository.delete).not.toHaveBeenCalled()
      expect(eventEmitter.emit).not.toHaveBeenCalled()
      expect(debugSpy).not.toHaveBeenCalled()
    })
  })

  describe('joinGame', () => {
    beforeEach(() => {
      const gameDocument = createMockGameDocument({
        _id: 'game-123',
        currentTask: createMockLobbyTaskDocument(),
      })
      gameRepository.findGameByIDOrThrow = jest
        .fn()
        .mockResolvedValue(gameDocument)
      gameRepository.findAndSaveWithLockIfChanged = jest
        .fn()
        .mockImplementation(
          async (
            _gameId: string,
            callback: (
              game: typeof gameDocument,
            ) => Promise<typeof gameDocument | undefined>,
          ) => (await callback(gameDocument)) ?? gameDocument,
        )
      ;(
        service as unknown as { gameEventPublisher: { publish: jest.Mock } }
      ).gameEventPublisher = {
        publish: jest.fn().mockResolvedValue(undefined),
      }
    })

    it('emits game.player.join event with correct key and payload', async () => {
      await service.joinGame('game-123', 'participant-456', 'TestNickname')

      expect(eventEmitter.emit).toHaveBeenCalledTimes(1)
      expect(eventEmitter.emit).toHaveBeenCalledWith(GamePlayerJoinEventKey, {
        gameId: 'game-123',
        participantId: 'participant-456',
        nickname: 'TestNickname',
      })
    })

    it('completes successfully when event emission throws', async () => {
      eventEmitter.emit.mockImplementation(() => {
        throw new Error('Event emission failed')
      })

      await expect(
        service.joinGame('game-123', 'participant-456', 'TestNickname'),
      ).resolves.toBeUndefined()

      expect(eventEmitter.emit).toHaveBeenCalledTimes(1)
      expect(errorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Failed to emit player join event.',
          operation: 'emitGamePlayerJoinEvent',
          gameId: 'game-123',
          playerId: 'participant-456',
        }),
        expect.any(String),
      )
    })

    it('treats a repeated join with the same nickname as a no-op', async () => {
      await service.joinGame('game-123', 'participant-456', 'TestNickname')
      await service.joinGame('game-123', 'participant-456', 'TestNickname')

      expect(gameRepository.findGameByIDOrThrow.mock.results).toHaveLength(2)
      expect(
        (await gameRepository.findGameByIDOrThrow.mock.results[0]!.value)
          .participants,
      ).toHaveLength(1)
      expect(eventEmitter.emit).toHaveBeenCalledTimes(1)
      expect(
        (
          service as unknown as {
            gameEventPublisher: { publish: jest.Mock }
          }
        ).gameEventPublisher.publish,
      ).toHaveBeenCalledTimes(1)
    })

    it('serializes concurrent joins for the same identity into one player', async () => {
      await Promise.all([
        service.joinGame('game-123', 'participant-456', 'TestNickname'),
        service.joinGame('game-123', 'participant-456', 'TestNickname'),
      ])

      const game =
        await gameRepository.findGameByIDOrThrow.mock.results[0]!.value
      expect(game.participants).toHaveLength(1)
      expect(eventEmitter.emit).toHaveBeenCalledTimes(1)
    })

    it('rejects a repeated join that changes the player nickname', async () => {
      await service.joinGame('game-123', 'participant-456', 'TestNickname')

      await expect(
        service.joinGame('game-123', 'participant-456', 'OtherNickname'),
      ).rejects.toThrow('Player has already joined this game')
    })

    it('rejects joining while the final Podium leaderboard is active', async () => {
      const gameDoc = createMockGameDocument({
        _id: 'game-123',
        currentTask: createMockPodiumTaskDocument(),
      })
      gameRepository.findGameByIDOrThrow.mockResolvedValueOnce(gameDoc)
      gameRepository.findAndSaveWithLockIfChanged.mockImplementationOnce(
        async (_gameId: string, callback: (game: typeof gameDoc) => unknown) =>
          callback(gameDoc),
      )

      await expect(
        service.joinGame('game-123', 'participant-456', 'TestNickname'),
      ).rejects.toThrow('final leaderboard is active')

      expect(eventEmitter.emit).not.toHaveBeenCalled()
    })
  })

  describe('submitQuestionAnswer', () => {
    let gameTaskTransitionScheduler: { scheduleTaskTransition: jest.Mock }
    let gameEventPublisher: { publish: jest.Mock }

    beforeEach(() => {
      gameTaskTransitionScheduler = {
        scheduleTaskTransition: jest.fn().mockResolvedValue(undefined),
      }
      gameEventPublisher = {
        publish: jest.fn().mockResolvedValue(undefined),
      }
      gameRepository.findAndSaveWithLock.mockImplementation(
        async (gameId: string, callback: (game: Game) => Promise<Game>) =>
          callback(await gameRepository.findGameByIDOrThrow(gameId)),
      )
      ;(
        service as unknown as {
          gameTaskTransitionScheduler: { scheduleTaskTransition: jest.Mock }
        }
      ).gameTaskTransitionScheduler = gameTaskTransitionScheduler
      ;(
        service as unknown as { gameEventPublisher: { publish: jest.Mock } }
      ).gameEventPublisher = gameEventPublisher
    })

    it('schedules transition when answerCount equals playerCount', async () => {
      const gameDoc = createMockGameDocument({
        _id: 'game-1',
        currentTask: createMockQuestionTaskDocument({ status: 'active' }),
        participants: [
          createMockGamePlayerParticipantDocument({ participantId: 'p1' }),
          createMockGamePlayerParticipantDocument({ participantId: 'p2' }),
          createMockGameHostParticipantDocument({ participantId: 'host' }),
        ],
      })
      gameRepository.findGameByIDOrThrow.mockResolvedValue(gameDoc)
      gameAnswerRepository.submitOnce.mockResolvedValue({
        accepted: true,
        answerCount: 2,
      })

      await service.submitQuestionAnswer('game-1', 'p1', {
        type: QuestionType.MultiChoice,
        optionIndex: 1,
      })

      expect(gameAnswerRepository.submitOnce).toHaveBeenCalledWith(
        'game-1',
        expect.objectContaining({ playerId: 'p1' }),
        2,
        gameDoc.currentTask._id,
      )
      expect(
        gameTaskTransitionScheduler.scheduleTaskTransition,
      ).toHaveBeenCalledWith(gameDoc)
      expect(gameEventPublisher.publish).not.toHaveBeenCalled()
    })

    it('publishes event when answerCount does not equal playerCount', async () => {
      const gameDoc = createMockGameDocument({
        _id: 'game-1',
        currentTask: createMockQuestionTaskDocument({ status: 'active' }),
        participants: [
          createMockGamePlayerParticipantDocument({ participantId: 'p1' }),
          createMockGamePlayerParticipantDocument({ participantId: 'p2' }),
          createMockGamePlayerParticipantDocument({ participantId: 'p3' }),
          createMockGameHostParticipantDocument({ participantId: 'host' }),
        ],
      })
      gameRepository.findGameByIDOrThrow.mockResolvedValue(gameDoc)
      gameAnswerRepository.submitOnce.mockResolvedValue({
        accepted: true,
        answerCount: 1,
      })

      await service.submitQuestionAnswer('game-1', 'p1', {
        type: QuestionType.MultiChoice,
        optionIndex: 2,
      })

      expect(gameAnswerRepository.submitOnce).toHaveBeenCalledWith(
        'game-1',
        expect.objectContaining({ playerId: 'p1' }),
        3,
        gameDoc.currentTask._id,
      )
      expect(gameEventPublisher.publish).toHaveBeenCalledWith(gameDoc)
      expect(
        gameTaskTransitionScheduler.scheduleTaskTransition,
      ).not.toHaveBeenCalled()
    })

    it('throws BadRequestException when repository rejects submission', async () => {
      const gameDoc = createMockGameDocument({
        _id: 'game-1',
        currentTask: createMockQuestionTaskDocument({ status: 'active' }),
        participants: [
          createMockGamePlayerParticipantDocument({ participantId: 'p1' }),
        ],
      })
      gameRepository.findGameByIDOrThrow.mockResolvedValue(gameDoc)
      gameAnswerRepository.submitOnce.mockRejectedValue(
        new Error('Redis connection failed'),
      )

      await expect(
        service.submitQuestionAnswer('game-1', 'p1', {
          type: QuestionType.MultiChoice,
          optionIndex: 1,
        }),
      ).rejects.toThrow('Redis connection failed')

      expect(gameAnswerRepository.submitOnce).toHaveBeenCalledWith(
        'game-1',
        expect.objectContaining({ playerId: 'p1' }),
        1,
        gameDoc.currentTask._id,
      )
      expect(
        gameTaskTransitionScheduler.scheduleTaskTransition,
      ).not.toHaveBeenCalled()
      expect(gameEventPublisher.publish).not.toHaveBeenCalled()
    })
  })

  describe('correct answers', () => {
    let gameEventPublisher: { publish: jest.Mock }

    beforeEach(() => {
      gameEventPublisher = { publish: jest.fn().mockResolvedValue(undefined) }
      ;(
        service as unknown as { gameEventPublisher: { publish: jest.Mock } }
      ).gameEventPublisher = gameEventPublisher
      gameRepository.findAndSaveWithLockIfChanged.mockImplementation(
        async (
          gameId: string,
          callback: (game: Game) => Promise<Game | undefined>,
        ) => {
          const game = await gameRepository.findGameByIDOrThrow(gameId)
          return (await callback(game)) ?? game
        },
      )
    })

    function buildGame(
      question: Game['questions'][number],
      correctAnswers: QuestionResultTaskCorrectAnswer[],
    ) {
      return createMockGameDocument({
        questions: [question],
        currentTask: createMockQuestionResultTaskDocument({
          status: 'active',
          questionIndex: 0,
          correctAnswers,
          results: [],
        }),
        previousTasks: [
          createMockQuestionTaskDocument({
            status: 'completed',
            questionIndex: 0,
            answers: [],
          }),
        ],
      })
    }

    function getQuestionResultTask(game: Game) {
      if (game.currentTask.type !== TaskType.QuestionResult) {
        throw new Error('Expected a question result task')
      }

      return game.currentTask
    }

    it('adds, deduplicates, and removes multi-choice answers', async () => {
      const game = buildGame(createMockMultiChoiceQuestionDocument(), [
        { type: QuestionType.MultiChoice, index: 0 },
      ])
      gameRepository.findGameByIDOrThrow.mockResolvedValue(game)

      await service.addCorrectAnswer('game-1', {
        type: QuestionType.MultiChoice,
        index: 1,
      })
      await service.addCorrectAnswer('game-1', {
        type: QuestionType.MultiChoice,
        index: 1,
      })
      await service.deleteCorrectAnswer('game-1', {
        type: QuestionType.MultiChoice,
        index: 0,
      })
      await service.deleteCorrectAnswer('game-1', {
        type: QuestionType.MultiChoice,
        index: 0,
      })

      expect(getQuestionResultTask(game).correctAnswers).toEqual([
        { type: QuestionType.MultiChoice, index: 1 },
      ])
      expect(gameEventPublisher.publish).toHaveBeenCalledTimes(4)
    })

    it('normalizes type-answer identity for repeated add and delete', async () => {
      const game = buildGame(
        createMockTypeAnswerQuestionDocument({ options: ['Copenhagen'] }),
        [{ type: QuestionType.TypeAnswer, value: 'Copenhagen' }],
      )
      gameRepository.findGameByIDOrThrow.mockResolvedValue(game)

      await service.addCorrectAnswer('game-1', {
        type: QuestionType.TypeAnswer,
        value: ' copenhagen ',
      })
      await service.addCorrectAnswer('game-1', {
        type: QuestionType.TypeAnswer,
        value: 'Kobenhavn',
      })
      await service.deleteCorrectAnswer('game-1', {
        type: QuestionType.TypeAnswer,
        value: 'COPENHAGEN',
      })

      expect(getQuestionResultTask(game).correctAnswers).toEqual([
        { type: QuestionType.TypeAnswer, value: 'Kobenhavn' },
      ])
      expect(gameEventPublisher.publish).toHaveBeenCalledTimes(3)
    })

    it('rejects a whitespace-only type answer', async () => {
      const game = buildGame(createMockTypeAnswerQuestionDocument(), [
        { type: QuestionType.TypeAnswer, value: 'Copenhagen' },
      ])
      gameRepository.findGameByIDOrThrow.mockResolvedValue(game)

      await expect(
        service.addCorrectAnswer('game-1', {
          type: QuestionType.TypeAnswer,
          value: ' ',
        }),
      ).rejects.toThrow('Correct type-answer value is invalid')
      expect(getQuestionResultTask(game).correctAnswers).toEqual([
        { type: QuestionType.TypeAnswer, value: 'Copenhagen' },
      ])
      expect(gameEventPublisher.publish).not.toHaveBeenCalled()
    })

    it('rejects a type answer beyond the accepted-answer limit', async () => {
      const game = buildGame(
        createMockTypeAnswerQuestionDocument({
          options: ['Alpha', 'Bravo', 'Charlie', 'Delta'],
        }),
        [
          { type: QuestionType.TypeAnswer, value: 'Alpha' },
          { type: QuestionType.TypeAnswer, value: 'Bravo' },
          { type: QuestionType.TypeAnswer, value: 'Charlie' },
          { type: QuestionType.TypeAnswer, value: 'Delta' },
        ],
      )
      gameRepository.findGameByIDOrThrow.mockResolvedValue(game)

      await expect(
        service.addCorrectAnswer('game-1', {
          type: QuestionType.TypeAnswer,
          value: 'Echo',
        }),
      ).rejects.toThrow(
        'The current question already has the maximum number of accepted answers',
      )
      expect(getQuestionResultTask(game).correctAnswers).toEqual([
        { type: QuestionType.TypeAnswer, value: 'Alpha' },
        { type: QuestionType.TypeAnswer, value: 'Bravo' },
        { type: QuestionType.TypeAnswer, value: 'Charlie' },
        { type: QuestionType.TypeAnswer, value: 'Delta' },
      ])
      expect(gameEventPublisher.publish).not.toHaveBeenCalled()
    })

    const singletonCorrectAnswerCases: Array<{
      question: Game['questions'][number]
      current: QuestionResultTaskCorrectAnswer[]
      request: Parameters<GameService['addCorrectAnswer']>[1]
      expected: QuestionResultTaskCorrectAnswer[]
    }> = [
      {
        question: createMockTrueFalseQuestionDocument({ correct: true }),
        current: [{ type: QuestionType.TrueFalse, value: true }],
        request: { type: QuestionType.TrueFalse, value: false },
        expected: [{ type: QuestionType.TrueFalse, value: false }],
      },
      {
        question: createMockTrueFalseQuestionDocument({ correct: false }),
        current: [{ type: QuestionType.TrueFalse, value: false }],
        request: { type: QuestionType.TrueFalse, value: true },
        expected: [{ type: QuestionType.TrueFalse, value: true }],
      },
      {
        question: createMockRangeQuestionDocument({ correct: 50 }),
        current: [{ type: QuestionType.Range, value: 50 }],
        request: { type: QuestionType.Range, value: 40 },
        expected: [{ type: QuestionType.Range, value: 40 }],
      },
    ]

    it.each(singletonCorrectAnswerCases)(
      'atomically replaces singleton correct answers',
      async (testCase) => {
        const game = buildGame(testCase.question, testCase.current)
        gameRepository.findGameByIDOrThrow.mockResolvedValue(game)

        await service.addCorrectAnswer('game-1', testCase.request)

        expect(getQuestionResultTask(game).correctAnswers).toEqual(
          testCase.expected,
        )
        expect(gameEventPublisher.publish).toHaveBeenCalledTimes(1)
      },
    )

    it('accepts both configured range boundaries', async () => {
      const game = buildGame(
        createMockRangeQuestionDocument({ min: 0, max: 100, correct: 50 }),
        [{ type: QuestionType.Range, value: 50 }],
      )
      gameRepository.findGameByIDOrThrow.mockResolvedValue(game)

      await service.addCorrectAnswer('game-1', {
        type: QuestionType.Range,
        value: 0,
      })
      await service.addCorrectAnswer('game-1', {
        type: QuestionType.Range,
        value: 100,
      })

      expect(getQuestionResultTask(game).correctAnswers).toEqual([
        { type: QuestionType.Range, value: 100 },
      ])
      expect(gameEventPublisher.publish).toHaveBeenCalledTimes(2)
    })

    const singletonDeletionCases: Array<
      Extract<
        Parameters<GameService['deleteCorrectAnswer']>[1],
        {
          type: QuestionType.TrueFalse | QuestionType.Range
        }
      >
    > = [
      { type: QuestionType.TrueFalse, value: false },
      { type: QuestionType.Range, value: 50 },
    ]

    it.each(singletonDeletionCases)(
      'rejects deleting a singleton correct answer',
      async (request) => {
        const question =
          request.type === QuestionType.TrueFalse
            ? createMockTrueFalseQuestionDocument({
                correct: request.value,
              })
            : createMockRangeQuestionDocument({
                correct: request.value,
              })
        const game = buildGame(question, [request])
        gameRepository.findGameByIDOrThrow.mockResolvedValue(game)

        await expect(
          service.deleteCorrectAnswer('game-1', request),
        ).rejects.toThrow('Cannot delete the only correct')

        expect(getQuestionResultTask(game).correctAnswers).toEqual([request])
        expect(gameEventPublisher.publish).not.toHaveBeenCalled()
      },
    )

    it('rejects mismatched and contextually invalid answers', async () => {
      const game = buildGame(createMockMultiChoiceQuestionDocument(), [
        { type: QuestionType.MultiChoice, index: 0 },
      ])
      gameRepository.findGameByIDOrThrow.mockResolvedValue(game)

      await expect(
        service.addCorrectAnswer('game-1', {
          type: QuestionType.Range,
          value: 50,
        }),
      ).rejects.toThrow('does not match the current question')
      await expect(
        service.addCorrectAnswer('game-1', {
          type: QuestionType.MultiChoice,
          index: 99,
        }),
      ).rejects.toThrow('does not belong to the current question')

      expect(getQuestionResultTask(game).correctAnswers).toEqual([
        { type: QuestionType.MultiChoice, index: 0 },
      ])
      expect(gameEventPublisher.publish).not.toHaveBeenCalled()
    })

    it('keeps deterministic state when an add fails after delete', async () => {
      const game = buildGame(createMockMultiChoiceQuestionDocument(), [
        { type: QuestionType.MultiChoice, index: 0 },
      ])
      gameRepository.findGameByIDOrThrow.mockResolvedValue(game)

      await service.deleteCorrectAnswer('game-1', {
        type: QuestionType.MultiChoice,
        index: 0,
      })
      await expect(
        service.addCorrectAnswer('game-1', {
          type: QuestionType.MultiChoice,
          index: 99,
        }),
      ).rejects.toThrow('does not belong to the current question')

      expect(getQuestionResultTask(game).correctAnswers).toEqual([])
      expect(gameEventPublisher.publish).toHaveBeenCalledTimes(1)
    })

    it('preserves a singleton answer when a replacement add fails', async () => {
      const game = buildGame(
        createMockRangeQuestionDocument({ min: 0, max: 100, correct: 50 }),
        [{ type: QuestionType.Range, value: 50 }],
      )
      gameRepository.findGameByIDOrThrow.mockResolvedValue(game)

      await expect(
        service.deleteCorrectAnswer('game-1', {
          type: QuestionType.Range,
          value: 50,
        }),
      ).rejects.toThrow('Cannot delete the only correct')
      await expect(
        service.addCorrectAnswer('game-1', {
          type: QuestionType.Range,
          value: 101,
        }),
      ).rejects.toThrow('within the current question range')

      expect(getQuestionResultTask(game).correctAnswers).toEqual([
        { type: QuestionType.Range, value: 50 },
      ])
      expect(gameEventPublisher.publish).not.toHaveBeenCalled()
    })

    it('rejects corrections after the current task changes under the lock', async () => {
      const game = buildGame(createMockMultiChoiceQuestionDocument(), [
        { type: QuestionType.MultiChoice, index: 0 },
      ])
      const changedGame = buildGame(createMockMultiChoiceQuestionDocument(), [
        { type: QuestionType.MultiChoice, index: 0 },
      ])
      changedGame.currentTask._id = 'changed-task'
      gameRepository.findGameByIDOrThrow
        .mockResolvedValueOnce(game)
        .mockResolvedValueOnce(changedGame)

      await expect(
        service.addCorrectAnswer('game-1', {
          type: QuestionType.MultiChoice,
          index: 1,
        }),
      ).rejects.toThrow('current task changed')
      expect(gameEventPublisher.publish).not.toHaveBeenCalled()
    })
  })
})
