import { QuestionType } from '@klurigo/common'
import { Injectable, Logger } from '@nestjs/common'
import { InjectRedis } from '@nestjs-modules/ioredis'
import Redis from 'ioredis'

import { QuestionTaskAnswer } from './models/schemas'

/**
 * Repository for storing and retrieving current-question answers for a game in Redis.
 *
 * Storage model:
 * - Redis List per game (key: `${gameId}-player-participant-answers`)
 * - Each list entry is a JSON-serialized `QuestionTaskAnswer`
 * - Redis Set per game (key: `${gameId}-player-participant-answered`) tracking which players have answered
 */
@Injectable()
export class GameAnswerRepository {
  /**
   * Logger for repository-level diagnostics and Redis operation failures.
   * @private
   */
  private readonly logger = new Logger(GameAnswerRepository.name)

  /**
   * Sliding expiration (in seconds) for the per-game answer keys.
   *
   * The TTL is refreshed on each accepted submission to ensure stale games/rounds do not leave
   * orphaned keys in Redis while still keeping active games alive.
   *
   * @private
   */
  private static readonly ANSWER_TTL_SECONDS = 60 * 60 // 1h

  /**
   * Creates an instance of GameAnswerRepository.
   *
   * @param redis - Redis client used to persist and retrieve answer entries.
   */
  constructor(@InjectRedis() private readonly redis: Redis) {}

  /**
   * Submits an answer if the player has not already answered for the current question.
   *
   * Uses a Redis Set to enforce one answer per player:
   * - `SADD` returns `1` only for the first submission by the given `playerId`.
   * - If the player has already submitted, the method returns `{ accepted: false }` without writing to the answer list.
   *
   * On acceptance, the answer is appended to the Redis List and both keys have their TTL refreshed.
   *
   * @param gameId - Game identifier used to resolve Redis keys.
   * @param answer - Answer payload to persist.
   * @param playerCount - Current number of players in the game. Used to cap the answer list length.
   * @returns `{ accepted: false }` if the player already answered, otherwise `{ accepted: true, answerCount }`.
   */
  public async submitOnce(
    gameId: string,
    answer: QuestionTaskAnswer,
    playerCount: number,
    taskId?: string,
  ): Promise<{ accepted: true; answerCount: number } | { accepted: false }> {
    const answersKey = this.getAnswerKey(gameId, taskId)
    const answeredKey = this.getAnsweredKey(gameId, taskId)

    const serialized = this.serialize(answer)

    const added = await this.redis.sadd(answeredKey, answer.playerId)
    if (added === 0) {
      return { accepted: false }
    }

    const results = await this.redis
      .multi()
      .rpush(answersKey, serialized)
      .ltrim(answersKey, 0, Math.max(playerCount - 1, 0))
      .expire(answersKey, GameAnswerRepository.ANSWER_TTL_SECONDS)
      .expire(answeredKey, GameAnswerRepository.ANSWER_TTL_SECONDS)
      .exec()

    if (!results) {
      // Rollback: remove player from answered set to allow retry
      await this.redis.srem(answeredKey, answer.playerId)
      this.logger.error(`Redis transaction returned null for game ${gameId}.`)
      throw new Error(`Redis transaction returned null for game ${gameId}.`)
    }

    const rpushRes = results[0]
    const ltrimRes = results[1]
    const expAnswersRes = results[2]
    const expAnsweredRes = results[3]

    if (rpushRes[0]) {
      // Rollback: remove player from answered set to allow retry
      await this.redis.srem(answeredKey, answer.playerId)
      throw rpushRes[0]
    }
    if (ltrimRes[0]) {
      // Rollback: remove player from answered set to allow retry
      await this.redis.srem(answeredKey, answer.playerId)
      throw ltrimRes[0]
    }
    if (expAnswersRes[0]) {
      // Rollback: remove player from answered set to allow retry
      await this.redis.srem(answeredKey, answer.playerId)
      throw expAnswersRes[0]
    }
    if (expAnsweredRes[0]) {
      // Rollback: remove player from answered set to allow retry
      await this.redis.srem(answeredKey, answer.playerId)
      throw expAnsweredRes[0]
    }

    return { accepted: true, answerCount: rpushRes[1] as number }
  }

  /**
   * Returns all answers currently stored for the game's active question.
   *
   * @param gameId - Game identifier used to resolve the Redis key.
   * @returns Answers in insertion order.
   */
  public async findAllAnswersByGameId(
    gameId: string,
    taskId?: string,
  ): Promise<QuestionTaskAnswer[]> {
    const key = this.getAnswerKey(gameId, taskId)

    try {
      const values = await this.redis.lrange(key, 0, -1)
      return values.map((value) => this.deserialize(value, gameId))
    } catch (error) {
      this.logger.error(
        `Failed to retrieve question answers for game ${gameId}.`,
        error,
      )
      throw error
    }
  }

  /**
   * Clears all stored answers for the game's active question and resets the per-player submission state.
   *
   * @param gameId - Game identifier used to resolve Redis keys.
   */
  public async clear(gameId: string, taskId?: string): Promise<void> {
    const answersKey = this.getAnswerKey(gameId, taskId)
    const answeredKey = this.getAnsweredKey(gameId, taskId)

    try {
      await this.redis.multi().del(answersKey).del(answeredKey).exec()
    } catch (error) {
      this.logger.error(
        `Failed to clear question answers for game ${gameId}.`,
        error,
      )
      throw error
    }
  }

  /**
   * Builds the Redis key used to store the game's current-question answers.
   *
   * @param gameId - Game identifier used as the key prefix.
   * @returns The Redis list key for the game's answer storage.
   * @private
   */
  private getAnswerKey(gameId: string, taskId?: string): string {
    return `${gameId}${taskId ? `-${taskId}` : ''}-player-participant-answers`
  }

  /**
   * Builds the Redis key used to track which players have already submitted an answer
   * for the game's current question.
   *
   * @param gameId - Game identifier used as the key prefix.
   * @returns The Redis set key used for per-player submission tracking.
   * @private
   */
  private getAnsweredKey(gameId: string, taskId?: string): string {
    return `${gameId}${taskId ? `-${taskId}` : ''}-player-participant-answered`
  }

  /**
   * Serializes a `QuestionTaskAnswer` for storage in Redis.
   *
   * @param answer - The answer payload to serialize.
   * @returns A JSON string representation of the answer.
   * @private
   */
  private serialize(answer: QuestionTaskAnswer): string {
    return JSON.stringify(answer)
  }

  /**
   * Deserializes and validates an answer entry read from Redis.
   *
   * Ensures the stored value is valid JSON and matches the `QuestionTaskAnswer` shape.
   * Normalizes the `created` field back into a `Date` instance.
   *
   * @param serialized - JSON string retrieved from Redis.
   * @param gameIdForError - Game identifier used for error context.
   * @returns A validated `QuestionTaskAnswer` instance.
   * @throws {Error} If the value is not valid JSON or does not match the expected shape.
   * @private
   */
  private deserialize(
    serialized: string,
    gameIdForError: string,
  ): QuestionTaskAnswer {
    let parsed: unknown
    try {
      parsed = JSON.parse(serialized)
    } catch {
      throw new Error(
        `Invalid JSON stored for game ${gameIdForError} answers: '${serialized}'`,
      )
    }

    if (!this.isQuestionTaskAnswer(parsed)) {
      throw new Error(
        `Invalid QuestionTaskAnswer shape stored for game ${gameIdForError}: '${serialized}'`,
      )
    }

    return {
      ...parsed,
      created: new Date(parsed.created),
    }
  }

  /**
   * Runtime type guard for `QuestionTaskAnswer`.
   *
   * Validates required properties (`playerId`, `type`, `created`, `answer`) and enforces
   * the `answer` value type according to the question `type`.
   *
   * @param value - Unknown value to validate.
   * @returns `true` if the value matches `QuestionTaskAnswer`, otherwise `false`.
   * @private
   */
  private isQuestionTaskAnswer(value: unknown): value is QuestionTaskAnswer {
    if (!value || typeof value !== 'object') return false
    const v = value as Record<string, unknown>

    if (typeof v.playerId !== 'string') return false

    if (typeof v.created !== 'string') return false
    const created = new Date(v.created)
    if (Number.isNaN(created.getTime())) return false

    if (!this.isQuestionType(v.type)) return false

    switch (v.type) {
      case QuestionType.MultiChoice:
      case QuestionType.Range:
        return typeof v.answer === 'number'
      case QuestionType.TrueFalse:
        return typeof v.answer === 'boolean'
      case QuestionType.TypeAnswer:
      case QuestionType.Pin:
        return typeof v.answer === 'string'
      case QuestionType.Puzzle:
        return (
          Array.isArray(v.answer) &&
          v.answer.every((x) => typeof x === 'string')
        )
      default:
        return false
    }
  }

  /**
   * Runtime type guard for `QuestionType`.
   *
   * @param value - Unknown value to validate.
   * @returns `true` if the value is a valid `QuestionType`, otherwise `false`.
   * @private
   */
  private isQuestionType(value: unknown): value is QuestionType {
    return (
      typeof value === 'string' &&
      Object.values(QuestionType).includes(value as QuestionType)
    )
  }
}
