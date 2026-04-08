import { GameParticipantType, GameStatus, QuestionType } from '@klurigo/common'
import { Logger } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { Test } from '@nestjs/testing'
import { getRedisConnectionToken } from '@nestjs-modules/ioredis'

import { GamePlayerJoinEventKey } from '../../../app/shared/event/game-join.event'
import {
  GameAnswerRepository,
  GameRepository,
} from '../../game-core/repositories'
import { TaskType } from '../../game-core/repositories/models/schemas'
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

  beforeEach(async () => {
    gameRepository = {
      find: jest.fn(),
      delete: jest.fn(),
      findGamesByParticipantId: jest.fn(),
      findGameByIDOrThrow: jest.fn(),
      findAndSaveWithLock: jest.fn(),
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

    jest.clearAllMocks()
  })

  afterEach(() => {
    debugSpy.mockRestore()
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
      gameRepository.findGamesByParticipantId = jest
        .fn()
        .mockResolvedValueOnce({
          results: [
            {
              _id: 'g-1',
              name: 'Game 1',
              mode: 'Classic',
              status: GameStatus.Active,
              currentTask: { type: TaskType.Lobby },
              created: '2026-01-01T10:00:00.000Z',
              quiz: { imageCoverURL: 'https://example.test/cover.png' },
              participants: [
                { participantId: 'p-host', type: GameParticipantType.HOST },
              ],
            },
          ],
          total: 1,
        })

      const result = await service.findGamesByParticipantId('p-host', 0, 5)

      expect(result).toEqual({
        results: [
          {
            id: 'g-1',
            name: 'Game 1',
            mode: 'Classic',
            status: GameStatus.Active,
            imageCoverURL: 'https://example.test/cover.png',
            created: '2026-01-01T10:00:00.000Z',
            participantType: GameParticipantType.HOST,
          },
        ],
        total: 1,
        limit: 5,
        offset: 0,
      })
    })

    it('maps player participant to player history dto including rank and score', async () => {
      gameRepository.findGamesByParticipantId = jest
        .fn()
        .mockResolvedValueOnce({
          results: [
            {
              _id: 'g-2',
              name: 'Game 2',
              mode: 'Classic',
              status: GameStatus.Active,
              currentTask: { type: TaskType.Lobby },
              created: '2026-01-01T11:00:00.000Z',
              quiz: { imageCoverURL: undefined },
              participants: [
                {
                  participantId: 'p-1',
                  type: GameParticipantType.PLAYER,
                  rank: 3,
                  totalScore: 420,
                },
              ],
            },
          ],
          total: 1,
        })

      const result = await service.findGamesByParticipantId('p-1', 0, 5)

      expect(result.results[0]).toEqual({
        id: 'g-2',
        name: 'Game 2',
        mode: 'Classic',
        status: GameStatus.Active,
        imageCoverURL: undefined,
        created: '2026-01-01T11:00:00.000Z',
        participantType: GameParticipantType.PLAYER,
        rank: 3,
        score: 420,
      })
    })

    it('forces status to Completed when game is Active and current task is Podium', async () => {
      gameRepository.findGamesByParticipantId = jest
        .fn()
        .mockResolvedValueOnce({
          results: [
            {
              _id: 'g-3',
              name: 'Game 3',
              mode: 'Classic',
              status: GameStatus.Active,
              currentTask: { type: TaskType.Podium },
              created: '2026-01-01T12:00:00.000Z',
              participants: [
                { participantId: 'p-1', type: GameParticipantType.HOST },
              ],
            },
          ],
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
      gameRepository.findGamesByParticipantId = jest
        .fn()
        .mockResolvedValueOnce({
          results: [
            {
              _id: 'g-4',
              name: 'Game 4',
              mode: 'Classic',
              status: GameStatus.Completed,
              currentTask: { type: TaskType.Podium },
              created: '2026-01-01T13:00:00.000Z',
              participants: [
                {
                  participantId: 'p-1',
                  type: GameParticipantType.PLAYER,
                  rank: 1,
                  totalScore: 999,
                },
              ],
            },
          ],
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
      gameRepository.findGamesByParticipantId = jest
        .fn()
        .mockResolvedValueOnce({
          results: [
            {
              _id: 'g-missing',
              name: 'Missing',
              mode: 'Classic',
              status: GameStatus.Active,
              currentTask: { type: TaskType.Lobby },
              created: '2026-01-01T14:00:00.000Z',
              participants: [
                {
                  participantId: 'someone-else',
                  type: GameParticipantType.HOST,
                },
              ],
            },
          ],
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
      gameRepository.findGamesByParticipantId = jest
        .fn()
        .mockResolvedValueOnce({
          results: [
            {
              _id: 'g-1',
              name: 'Game 1',
              mode: 'Classic',
              status: GameStatus.Active,
              currentTask: { type: TaskType.Lobby },
              created: '2026-01-01T10:00:00.000Z',
              quiz: { imageCoverURL: 'https://example.test/c1.png' },
              participants: [
                { participantId: 'p-1', type: GameParticipantType.HOST },
              ],
            },
            {
              _id: 'g-2',
              name: 'Game 2',
              mode: 'Classic',
              status: GameStatus.Active,
              currentTask: { type: TaskType.Podium },
              created: '2026-01-01T11:00:00.000Z',
              quiz: { imageCoverURL: 'https://example.test/c2.png' },
              participants: [
                {
                  participantId: 'p-1',
                  type: GameParticipantType.PLAYER,
                  rank: 2,
                  totalScore: 200,
                },
              ],
            },
          ],
          total: 123,
        })

      const result = await service.findGamesByParticipantId('p-1', 20, 2)

      expect(result).toEqual({
        results: [
          {
            id: 'g-1',
            name: 'Game 1',
            mode: 'Classic',
            status: GameStatus.Active,
            imageCoverURL: 'https://example.test/c1.png',
            created: '2026-01-01T10:00:00.000Z',
            participantType: GameParticipantType.HOST,
          },
          {
            id: 'g-2',
            name: 'Game 2',
            mode: 'Classic',
            status: GameStatus.Completed,
            imageCoverURL: 'https://example.test/c2.png',
            created: '2026-01-01T11:00:00.000Z',
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

      gameRepository.delete
        .mockRejectedValueOnce(new Error('db down'))
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
      gameRepository.findGameByIDOrThrow = jest.fn().mockResolvedValue({
        _id: 'game-123',
        participants: [],
      })
      gameRepository.findAndSaveWithLock = jest.fn().mockResolvedValue({
        _id: 'game-123',
        participants: [],
      })
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
      const gameDoc = {
        _id: 'game-1',
        currentTask: { type: TaskType.Question, status: 'active' },
        participants: [
          { participantId: 'p1', type: GameParticipantType.PLAYER },
          { participantId: 'p2', type: GameParticipantType.PLAYER },
          { participantId: 'host', type: GameParticipantType.HOST },
        ],
      }
      gameRepository.findGameByIDOrThrow.mockResolvedValue(gameDoc)
      gameAnswerRepository.submitOnce.mockResolvedValue({
        accepted: true,
        answerCount: 2,
      })

      await service.submitQuestionAnswer('game-1', 'p1', {
        type: QuestionType.MultiChoice,
        optionIndex: 1,
      } as any)

      expect(gameAnswerRepository.submitOnce).toHaveBeenCalledWith(
        'game-1',
        expect.objectContaining({ playerId: 'p1' }),
        2,
      )
      expect(
        gameTaskTransitionScheduler.scheduleTaskTransition,
      ).toHaveBeenCalledWith(gameDoc)
      expect(gameEventPublisher.publish).not.toHaveBeenCalled()
    })

    it('publishes event when answerCount does not equal playerCount', async () => {
      const gameDoc = {
        _id: 'game-1',
        currentTask: { type: TaskType.Question, status: 'active' },
        participants: [
          { participantId: 'p1', type: GameParticipantType.PLAYER },
          { participantId: 'p2', type: GameParticipantType.PLAYER },
          { participantId: 'p3', type: GameParticipantType.PLAYER },
          { participantId: 'host', type: GameParticipantType.HOST },
        ],
      }
      gameRepository.findGameByIDOrThrow.mockResolvedValue(gameDoc)
      gameAnswerRepository.submitOnce.mockResolvedValue({
        accepted: true,
        answerCount: 1,
      })

      await service.submitQuestionAnswer('game-1', 'p1', {
        type: QuestionType.MultiChoice,
        optionIndex: 2,
      } as any)

      expect(gameAnswerRepository.submitOnce).toHaveBeenCalledWith(
        'game-1',
        expect.objectContaining({ playerId: 'p1' }),
        3,
      )
      expect(gameEventPublisher.publish).toHaveBeenCalledWith(gameDoc)
      expect(
        gameTaskTransitionScheduler.scheduleTaskTransition,
      ).not.toHaveBeenCalled()
    })

    it('throws BadRequestException when repository rejects submission', async () => {
      const gameDoc = {
        _id: 'game-1',
        currentTask: { type: TaskType.Question, status: 'active' },
        participants: [
          { participantId: 'p1', type: GameParticipantType.PLAYER },
        ],
      }
      gameRepository.findGameByIDOrThrow.mockResolvedValue(gameDoc)
      gameAnswerRepository.submitOnce.mockRejectedValue(
        new Error('Redis connection failed'),
      )

      await expect(
        service.submitQuestionAnswer('game-1', 'p1', {
          type: QuestionType.MultiChoice,
          optionIndex: 1,
        } as any),
      ).rejects.toThrow('Redis connection failed')

      expect(gameAnswerRepository.submitOnce).toHaveBeenCalledWith(
        'game-1',
        expect.objectContaining({ playerId: 'p1' }),
        1,
      )
      expect(
        gameTaskTransitionScheduler.scheduleTaskTransition,
      ).not.toHaveBeenCalled()
      expect(gameEventPublisher.publish).not.toHaveBeenCalled()
    })
  })
})
