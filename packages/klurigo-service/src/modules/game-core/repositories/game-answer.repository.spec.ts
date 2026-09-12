import { QuestionType } from '@klurigo/common'
import type { Redis } from 'ioredis'

import { RedisUnavailableException } from '../../../app/exceptions'

import { GameAnswerRepository } from './game-answer.respository'
import { QuestionTaskAnswer } from './models/schemas'

describe('GameAnswerRepository', () => {
  let redis: jest.Mocked<Redis>
  let repository: GameAnswerRepository
  let logger: { error: jest.Mock }

  beforeEach(() => {
    logger = { error: jest.fn() }

    redis = {
      hsetnx: jest.fn(),
      hlen: jest.fn(),
      hvals: jest.fn(),
      expire: jest.fn(),
      multi: jest.fn(),
      del: jest.fn(),
    } as any

    repository = new GameAnswerRepository(redis as unknown as Redis)
    ;(repository as any).logger = logger
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('submitOnce', () => {
    it('accepts first submission from a player and returns accepted with answer count', async () => {
      const answer: QuestionTaskAnswer = {
        playerId: 'player1',
        type: QuestionType.MultiChoice,
        answer: 2,
        created: new Date(),
      }

      redis.hsetnx.mockResolvedValue(1)
      redis.hlen.mockResolvedValue(1)
      redis.expire.mockResolvedValue(1)

      const result = await repository.submitOnce(
        'game-123',
        answer,
        3,
        'task-1',
      )

      expect(result).toEqual({ accepted: true, answerCount: 1 })
      expect(redis.hsetnx).toHaveBeenCalledWith(
        'game-123-task-1-player-participant-answers-v2',
        'player1',
        JSON.stringify(answer),
      )
      expect(redis.hlen).toHaveBeenCalledWith(
        'game-123-task-1-player-participant-answers-v2',
      )
      expect(redis.expire).toHaveBeenCalledWith(
        'game-123-task-1-player-participant-answers-v2',
        3600,
      )
    })

    it('rejects duplicate submission from same player', async () => {
      const answer: QuestionTaskAnswer = {
        playerId: 'player1',
        type: QuestionType.TrueFalse,
        answer: true,
        created: new Date(),
      }

      redis.hsetnx.mockResolvedValue(0) // Player already has a hash field

      const result = await repository.submitOnce(
        'game-123',
        answer,
        3,
        'task-1',
      )

      expect(result).toEqual({ accepted: false })
      expect(redis.hsetnx).toHaveBeenCalledWith(
        'game-123-task-1-player-participant-answers-v2',
        'player1',
        JSON.stringify(answer),
      )
      expect(redis.hlen).not.toHaveBeenCalled()
      expect(redis.expire).not.toHaveBeenCalled()
    })

    it('allows concurrent submissions by different players and counts each field', async () => {
      const answer: QuestionTaskAnswer = {
        playerId: 'player2',
        type: QuestionType.MultiChoice,
        answer: 0,
        created: new Date('2026-02-07T10:00:00Z'),
      }

      redis.hsetnx.mockResolvedValue(1)
      redis.hlen.mockResolvedValue(2)
      redis.expire.mockResolvedValue(1)

      const result = await repository.submitOnce(
        'game-456',
        answer,
        4,
        'task-2',
      )

      expect(result).toEqual({ accepted: true, answerCount: 2 })
      expect(redis.hsetnx).toHaveBeenCalledWith(
        'game-456-task-2-player-participant-answers-v2',
        'player2',
        expect.stringContaining('"answer":0'),
      )
    })

    it('does not create duplicate answers for concurrent attempts by one player', async () => {
      const answer: QuestionTaskAnswer = {
        playerId: 'player3',
        type: QuestionType.TrueFalse,
        answer: true,
        created: new Date(),
      }

      redis.hsetnx.mockResolvedValueOnce(1).mockResolvedValueOnce(0)
      redis.hlen.mockResolvedValue(1)
      redis.expire.mockResolvedValue(1)

      const results = await Promise.all([
        repository.submitOnce('game-789', answer, 2, 'task-3'),
        repository.submitOnce(
          'game-789',
          { ...answer, answer: false },
          2,
          'task-3',
        ),
      ])

      expect(results).toEqual([
        { accepted: true, answerCount: 1 },
        { accepted: false },
      ])
      expect(redis.hsetnx).toHaveBeenCalledTimes(2)
      expect(redis.hlen).toHaveBeenCalledTimes(1)
    })

    it('keeps answer state isolated by question task', async () => {
      const answer: QuestionTaskAnswer = {
        playerId: 'player4',
        type: QuestionType.TypeAnswer,
        answer: 'Stockholm',
        created: new Date(),
      }

      redis.hsetnx.mockResolvedValue(1)
      redis.hlen.mockResolvedValue(1)
      redis.expire.mockResolvedValue(1)

      await repository.submitOnce('game-abc', answer, 5, 'question-a')
      await repository.submitOnce('game-abc', answer, 5, 'question-b')

      expect(redis.hsetnx).toHaveBeenNthCalledWith(
        1,
        'game-abc-question-a-player-participant-answers-v2',
        'player4',
        JSON.stringify(answer),
      )
      expect(redis.hsetnx).toHaveBeenNthCalledWith(
        2,
        'game-abc-question-b-player-participant-answers-v2',
        'player4',
        JSON.stringify(answer),
      )
    })

    it('does not leave a duplicate marker when the atomic claim fails', async () => {
      const answer: QuestionTaskAnswer = {
        playerId: 'player6',
        type: QuestionType.Pin,
        answer: '45,67',
        created: new Date(),
      }

      redis.hsetnx.mockRejectedValue(new Error('Redis unavailable'))

      await expect(
        repository.submitOnce('game-fail', answer, 3, 'task-fail'),
      ).rejects.toBeInstanceOf(RedisUnavailableException)

      expect(redis.hlen).not.toHaveBeenCalled()
      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Failed to persist question answer.',
          operation: 'submitOnce',
          gameId: 'game-fail',
          playerId: 'player6',
          questionTaskId: 'task-fail',
        }),
        expect.any(String),
      )
    })

    it('allows a retry after a failure before the atomic claim', async () => {
      const answer: QuestionTaskAnswer = {
        playerId: 'player10',
        type: QuestionType.MultiChoice,
        answer: 1,
        created: new Date(),
      }

      redis.hsetnx
        .mockRejectedValueOnce(new Error('Redis unavailable'))
        .mockResolvedValueOnce(1)
      redis.hlen.mockResolvedValue(1)
      redis.expire.mockResolvedValue(1)

      await expect(
        repository.submitOnce('game-retry', answer, 3, 'task-retry'),
      ).rejects.toMatchObject({
        message:
          'Redis unavailable while persisting a question answer for game game-retry task task-retry',
      })
      await expect(
        repository.submitOnce('game-retry', answer, 3, 'task-retry'),
      ).resolves.toEqual({ accepted: true, answerCount: 1 })
    })

    it('reports a committed answer as a duplicate when a later persistence step fails', async () => {
      const answer: QuestionTaskAnswer = {
        playerId: 'player11',
        type: QuestionType.MultiChoice,
        answer: 1,
        created: new Date(),
      }

      redis.hsetnx.mockResolvedValueOnce(1).mockResolvedValueOnce(0)
      redis.hlen.mockRejectedValueOnce(new Error('Redis unavailable'))

      await expect(
        repository.submitOnce('game-committed', answer, 3, 'task-committed'),
      ).rejects.toMatchObject({
        message:
          'Redis unavailable while persisting a question answer for game game-committed task task-committed',
      })
      await expect(
        repository.submitOnce('game-committed', answer, 3, 'task-committed'),
      ).resolves.toEqual({ accepted: false })
    })
  })

  describe('findAllAnswersByGameId', () => {
    it('returns empty array when no answers exist', async () => {
      redis.hvals.mockResolvedValue([])

      const result = await repository.findAllAnswersByGameId('game-empty')

      expect(result).toEqual([])
      expect(redis.hvals).toHaveBeenCalledWith(
        'game-empty-player-participant-answers-v2',
      )
    })

    it('deserializes and returns all stored answers', async () => {
      const serializedAnswers = [
        JSON.stringify({
          playerId: 'p1',
          type: QuestionType.MultiChoice,
          answer: 1,
          created: '2026-02-07T10:00:00Z',
        }),
        JSON.stringify({
          playerId: 'p2',
          type: QuestionType.TrueFalse,
          answer: true,
          created: '2026-02-07T10:01:00Z',
        }),
        JSON.stringify({
          playerId: 'p3',
          type: QuestionType.TypeAnswer,
          answer: 'Paris',
          created: '2026-02-07T10:02:00Z',
        }),
      ]

      redis.hvals.mockResolvedValue(serializedAnswers)

      const result = await repository.findAllAnswersByGameId('game-123')

      expect(result).toHaveLength(3)
      expect(result[0]).toEqual({
        playerId: 'p1',
        type: QuestionType.MultiChoice,
        answer: 1,
        created: new Date('2026-02-07T10:00:00Z'),
      })
      expect(result[1]).toEqual({
        playerId: 'p2',
        type: QuestionType.TrueFalse,
        answer: true,
        created: new Date('2026-02-07T10:01:00Z'),
      })
      expect(result[2]).toEqual({
        playerId: 'p3',
        type: QuestionType.TypeAnswer,
        answer: 'Paris',
        created: new Date('2026-02-07T10:02:00Z'),
      })
    })

    it('deserializes Puzzle answer correctly', async () => {
      const serializedAnswers = [
        JSON.stringify({
          playerId: 'p1',
          type: QuestionType.Puzzle,
          answer: ['a', 'b', 'c'],
          created: '2026-02-07T10:00:00Z',
        }),
      ]

      redis.hvals.mockResolvedValue(serializedAnswers)

      const result = await repository.findAllAnswersByGameId('game-puzzle')

      expect(result[0]).toEqual({
        playerId: 'p1',
        type: QuestionType.Puzzle,
        answer: ['a', 'b', 'c'],
        created: new Date('2026-02-07T10:00:00Z'),
      })
    })

    it('throws error when stored value is not valid JSON', async () => {
      redis.hvals.mockResolvedValue(['{invalid json'])

      await expect(
        repository.findAllAnswersByGameId('game-bad'),
      ).rejects.toThrow('Invalid JSON stored for game game-bad answers')
    })

    it('throws error when stored value has invalid shape', async () => {
      redis.hvals.mockResolvedValue([
        JSON.stringify({ playerId: 'p1', wrongField: 'data' }),
      ])

      await expect(
        repository.findAllAnswersByGameId('game-invalid'),
      ).rejects.toThrow(
        'Invalid QuestionTaskAnswer shape stored for game game-invalid',
      )
    })

    it('throws error when answer type does not match question type', async () => {
      // MultiChoice should have number answer, not string
      redis.hvals.mockResolvedValue([
        JSON.stringify({
          playerId: 'p1',
          type: QuestionType.MultiChoice,
          answer: 'wrong-type',
          created: '2026-02-07T10:00:00Z',
        }),
      ])

      await expect(
        repository.findAllAnswersByGameId('game-type-mismatch'),
      ).rejects.toThrow('Invalid QuestionTaskAnswer shape stored for game')
    })

    it('logs and rethrows error on Redis failure', async () => {
      const redisError = new Error('Redis connection lost')
      redis.hvals.mockRejectedValue(redisError)

      await expect(
        repository.findAllAnswersByGameId('game-redis-fail'),
      ).rejects.toMatchObject({
        message:
          'Redis unavailable while retrieving question answers for game game-redis-fail',
      })

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Failed to retrieve question answers.',
          operation: 'findAllAnswersByGameId',
          gameId: 'game-redis-fail',
        }),
        redisError.stack,
      )
    })
  })

  describe('clear', () => {
    it('deletes both answer and answered keys', async () => {
      const mockMulti = {
        del: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([
          [null, 1],
          [null, 1],
          [null, 1],
        ]),
      }
      redis.multi.mockReturnValue(mockMulti as any)

      await repository.clear('game-clear')

      expect(mockMulti.del).toHaveBeenCalledWith(
        'game-clear-player-participant-answers-v2',
      )
      expect(mockMulti.del).toHaveBeenCalledWith(
        'game-clear-player-participant-answers',
      )
      expect(mockMulti.del).toHaveBeenCalledWith(
        'game-clear-player-participant-answered',
      )
      expect(mockMulti.exec).toHaveBeenCalled()
    })

    it('removes unscoped legacy keys when clearing a task', async () => {
      const mockMulti = {
        del: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([
          [null, 1],
          [null, 1],
          [null, 1],
        ]),
      }
      redis.multi.mockReturnValue(mockMulti as any)

      await repository.clear('game-clear-task', 'task-1')

      expect(mockMulti.del).toHaveBeenCalledWith(
        'game-clear-task-task-1-player-participant-answers-v2',
      )
      expect(mockMulti.del).toHaveBeenCalledWith(
        'game-clear-task-player-participant-answers',
      )
      expect(mockMulti.del).toHaveBeenCalledWith(
        'game-clear-task-player-participant-answered',
      )
    })

    it('rethrows a per-command transaction error', async () => {
      const redisError = new Error('delete failed')
      const mockMulti = {
        del: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([
          [null, 1],
          [redisError, null],
          [null, 1],
        ]),
      }
      redis.multi.mockReturnValue(mockMulti as any)

      await expect(
        repository.clear('game-clear-partial'),
      ).rejects.toMatchObject({
        message:
          'Redis unavailable while clearing question answers for game game-clear-partial',
      })
    })

    it('logs and rethrows error on Redis failure', async () => {
      const clearError = new Error('Clear failed')
      const mockMulti = {
        del: jest.fn().mockReturnThis(),
        exec: jest.fn().mockRejectedValue(clearError),
      }
      redis.multi.mockReturnValue(mockMulti as any)

      await expect(repository.clear('game-fail-clear')).rejects.toMatchObject({
        message:
          'Redis unavailable while clearing question answers for game game-fail-clear',
      })

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Failed to clear question answers.',
          operation: 'clear',
          gameId: 'game-fail-clear',
        }),
        clearError.stack,
      )
    })
  })

  describe('type validation', () => {
    it('validates Range answer must be number', async () => {
      redis.hvals.mockResolvedValue([
        JSON.stringify({
          playerId: 'p1',
          type: QuestionType.Range,
          answer: 'not-a-number',
          created: '2026-02-07T10:00:00Z',
        }),
      ])

      await expect(
        repository.findAllAnswersByGameId('game-range-invalid'),
      ).rejects.toThrow('Invalid QuestionTaskAnswer shape')
    })

    it('validates TrueFalse answer must be boolean', async () => {
      redis.hvals.mockResolvedValue([
        JSON.stringify({
          playerId: 'p1',
          type: QuestionType.TrueFalse,
          answer: 'yes',
          created: '2026-02-07T10:00:00Z',
        }),
      ])

      await expect(
        repository.findAllAnswersByGameId('game-bool-invalid'),
      ).rejects.toThrow('Invalid QuestionTaskAnswer shape')
    })

    it('validates Pin answer must be string', async () => {
      redis.hvals.mockResolvedValue([
        JSON.stringify({
          playerId: 'p1',
          type: QuestionType.Pin,
          answer: 123,
          created: '2026-02-07T10:00:00Z',
        }),
      ])

      await expect(
        repository.findAllAnswersByGameId('game-pin-invalid'),
      ).rejects.toThrow('Invalid QuestionTaskAnswer shape')
    })

    it('validates Puzzle answer must be string array', async () => {
      redis.hvals.mockResolvedValue([
        JSON.stringify({
          playerId: 'p1',
          type: QuestionType.Puzzle,
          answer: [1, 2, 3],
          created: '2026-02-07T10:00:00Z',
        }),
      ])

      await expect(
        repository.findAllAnswersByGameId('game-puzzle-invalid'),
      ).rejects.toThrow('Invalid QuestionTaskAnswer shape')
    })

    it('validates created field is valid date', async () => {
      redis.hvals.mockResolvedValue([
        JSON.stringify({
          playerId: 'p1',
          type: QuestionType.MultiChoice,
          answer: 1,
          created: 'not-a-date',
        }),
      ])

      await expect(
        repository.findAllAnswersByGameId('game-date-invalid'),
      ).rejects.toThrow('Invalid QuestionTaskAnswer shape')
    })

    it('rejects unknown question type', async () => {
      redis.hvals.mockResolvedValue([
        JSON.stringify({
          playerId: 'p1',
          type: 'UnknownType',
          answer: 1,
          created: '2026-02-07T10:00:00Z',
        }),
      ])

      await expect(
        repository.findAllAnswersByGameId('game-unknown-type'),
      ).rejects.toThrow('Invalid QuestionTaskAnswer shape')
    })
  })
})
