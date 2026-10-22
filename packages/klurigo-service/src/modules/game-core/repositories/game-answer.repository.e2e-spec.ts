import { randomUUID } from 'node:crypto'

import { QuestionType } from '@klurigo/common'
import { INestApplication } from '@nestjs/common'
import { getRedisConnectionToken } from '@nestjs-modules/ioredis'
import { Redis } from 'ioredis'

import {
  cleanupTestApp,
  createTestApp,
  resetTestState,
} from '../../../../test-utils/utils'
import { RedisUnavailableException } from '../../../app/exceptions'

import { GameAnswerRepository } from './game-answer.respository'
import { QuestionTaskAnswer } from './models/schemas'

describe('GameAnswerRepository (e2e)', () => {
  let app: INestApplication
  let redis: Redis
  let repository: GameAnswerRepository

  beforeAll(async () => {
    app = await createTestApp()
    redis = app.get<Redis>(getRedisConnectionToken())
    repository = app.get(GameAnswerRepository)
  })

  beforeEach(async () => {
    await resetTestState(app)
  })

  afterAll(async () => {
    await cleanupTestApp(app)
  })

  function buildAnswer(playerId: string, answer: number): QuestionTaskAnswer {
    return {
      playerId,
      type: QuestionType.MultiChoice,
      answer,
      created: new Date(),
    }
  }

  it('atomically handles competing players, duplicates, answer counts, task keys, and TTLs', async () => {
    const gameId = randomUUID()
    const taskId = randomUUID()
    const firstAnswer = buildAnswer('player-1', 0)
    const competingAnswer = buildAnswer('player-1', 1)
    const secondPlayerAnswer = buildAnswer('player-2', 2)

    const results = await Promise.all([
      repository.submitOnce(gameId, firstAnswer, 2, taskId),
      repository.submitOnce(gameId, competingAnswer, 2, taskId),
      repository.submitOnce(gameId, secondPlayerAnswer, 2, taskId),
    ])

    const acceptedResults = results.filter(
      (result): result is { accepted: true; answerCount: number } =>
        result.accepted,
    )
    expect(acceptedResults).toHaveLength(2)
    expect(
      acceptedResults.map(({ answerCount }) => answerCount).sort(),
    ).toEqual([1, 2])
    expect(results.filter(({ accepted }) => !accepted)).toHaveLength(1)

    const storedAnswers = await repository.findAllAnswersByGameId(
      gameId,
      taskId,
    )
    const firstPlayerStoredAnswer = storedAnswers.find(
      ({ playerId }) => playerId === 'player-1',
    )
    expect(firstPlayerStoredAnswer?.answer).toBe(
      results[0].accepted ? firstAnswer.answer : competingAnswer.answer,
    )
    expect(storedAnswers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ playerId: 'player-2', answer: 2 }),
      ]),
    )

    const taskKey = `${gameId}-${taskId}-player-participant-answers-v2`
    const ttl = await redis.ttl(taskKey)
    expect(ttl).toBeGreaterThan(0)
    expect(ttl).toBeLessThanOrEqual(60 * 60)

    const nextTaskResult = await repository.submitOnce(
      gameId,
      firstAnswer,
      2,
      'next-task',
    )
    expect(nextTaskResult).toEqual({ accepted: true, answerCount: 1 })
    expect(
      await redis.hlen(`${gameId}-next-task-player-participant-answers-v2`),
    ).toBe(1)
    expect(await redis.hlen(taskKey)).toBe(2)
  })

  it('does not leave an answer or TTL when EVAL fails before execution', async () => {
    const gameId = randomUUID()
    const taskId = randomUUID()
    const answer = buildAnswer('player-1', 0)
    const failingRedis = {
      eval: jest.fn().mockRejectedValue(new Error('Redis unavailable')),
    } as unknown as Redis
    const failingRepository = new GameAnswerRepository(failingRedis)

    await expect(
      failingRepository.submitOnce(gameId, answer, 1, taskId),
    ).rejects.toBeInstanceOf(RedisUnavailableException)

    const key = `${gameId}-${taskId}-player-participant-answers-v2`
    expect(await redis.hlen(key)).toBe(0)
    expect(await redis.ttl(key)).toBe(-2)

    await expect(
      repository.submitOnce(gameId, answer, 1, taskId),
    ).resolves.toEqual({ accepted: true, answerCount: 1 })
    expect(await redis.hlen(key)).toBe(1)
  })

  it('keeps the atomic claim and TTL if its EVAL response is lost', async () => {
    const gameId = randomUUID()
    const taskId = randomUUID()
    const answer = buildAnswer('player-1', 0)
    const originalEval = redis.eval.bind(redis)
    const redisWithLostReply = {
      eval: jest.fn(
        async (
          script: string,
          numberOfKeys: number,
          key: string,
          field: string,
          serialized: string,
          ttl: number,
        ) => {
          await originalEval(script, numberOfKeys, key, field, serialized, ttl)
          throw new Error('Redis reply lost after script committed')
        },
      ),
    } as unknown as Redis
    const repositoryWithLostReply = new GameAnswerRepository(redisWithLostReply)

    await expect(
      repositoryWithLostReply.submitOnce(gameId, answer, 1, taskId),
    ).rejects.toMatchObject({
      message: `Redis unavailable while persisting a question answer for game ${gameId} task ${taskId}`,
    })

    const key = `${gameId}-${taskId}-player-participant-answers-v2`
    expect(await redis.hlen(key)).toBe(1)
    expect(await redis.ttl(key)).toBeGreaterThan(0)
    expect(await redis.ttl(key)).toBeLessThanOrEqual(60 * 60)
    await expect(
      repository.submitOnce(gameId, answer, 1, taskId),
    ).resolves.toEqual({ accepted: false })
    expect(await redis.hlen(key)).toBe(1)
    expect(await repository.findAllAnswersByGameId(gameId, taskId)).toEqual([
      expect.objectContaining({ playerId: 'player-1', answer: 0 }),
    ])
  })
})
