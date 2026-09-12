import { QuestionType } from '@klurigo/common'
import { Injectable, Logger } from '@nestjs/common'
import { InjectRedis } from '@nestjs-modules/ioredis'
import Redis from 'ioredis'

import { RedisUnavailableException } from '../../../app/exceptions'
import { getErrorStack, structuredLog } from '../../../app/utils'

import { QuestionTaskAnswer } from './models/schemas'

/**
 * Repository for storing and retrieving current-question answers for a game in Redis.
 *
 * Storage model:
 * - Redis Hash per question task (key: `${gameId}-${taskId}-player-participant-answers-v2`)
 * - Each field is a player ID and each value is a JSON-serialized `QuestionTaskAnswer`
 * - `HSETNX` atomically claims the player field and persists the answer together
 */
@Injectable()
export class GameAnswerRepository {
  /**
   * Logger for repository-level diagnostics and Redis operation failures.
   * @private
   */
  private readonly logger = new Logger(GameAnswerRepository.name)

  /**
   * Sliding expiration (in seconds) for the per-task answer keys.
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
   * Uses a Redis Hash to enforce one answer per player:
   * - `HSETNX` returns `1` only for the first submission by the given `playerId`.
   * - The claim and answer value are one Redis operation, so a failed retry cannot
   *   leave a submission marker without its answer (or append a second answer).
   *
   * On acceptance, the answer count is the hash field count and the answer key's
   * TTL is refreshed. A committed answer remains the source of truth if a later
   * Redis operation or the HTTP response fails, so retries are safely rejected.
   *
   * @param gameId - Game identifier used to resolve Redis keys.
   * @param answer - Answer payload to persist.
   * @param playerCount - Current number of players in the game. Retained for the service boundary.
   * @returns `{ accepted: false }` if the player already answered, otherwise `{ accepted: true, answerCount }`.
   */
  public async submitOnce(
    gameId: string,
    answer: QuestionTaskAnswer,
    playerCount: number,
    taskId?: string,
  ): Promise<{ accepted: true; answerCount: number } | { accepted: false }> {
    const answersKey = this.getAnswerKey(gameId, taskId)

    // The participant count is enforced by game authorization.
    void playerCount

    try {
      const serialized = this.serialize(answer)
      const added = await this.redis.hsetnx(
        answersKey,
        answer.playerId,
        serialized,
      )
      if (added === 0) {
        return { accepted: false }
      }

      const answerCount = await this.redis.hlen(answersKey)
      await this.redis.expire(
        answersKey,
        GameAnswerRepository.ANSWER_TTL_SECONDS,
      )

      return { accepted: true, answerCount }
    } catch (error) {
      this.logger.error(
        structuredLog('Failed to persist question answer.', {
          operation: 'submitOnce',
          gameId,
          playerId: answer.playerId,
          questionTaskId: taskId,
        }),
        getErrorStack(error),
      )
      throw new RedisUnavailableException(
        'persisting a question answer',
        `game ${gameId}${taskId ? ` task ${taskId}` : ''}`,
        error,
      )
    }
  }

  /**
   * Returns all answers currently stored for the game's active question.
   *
   * @param gameId - Game identifier used to resolve the Redis key.
   * @returns The stored answers for each player in the task.
   */
  public async findAllAnswersByGameId(
    gameId: string,
    taskId?: string,
  ): Promise<QuestionTaskAnswer[]> {
    const key = this.getAnswerKey(gameId, taskId)

    let values: string[]
    try {
      values = await this.redis.hvals(key)
    } catch (error) {
      this.logger.error(
        structuredLog('Failed to retrieve question answers.', {
          operation: 'findAllAnswersByGameId',
          gameId,
          questionTaskId: taskId,
        }),
        getErrorStack(error),
      )
      throw new RedisUnavailableException(
        'retrieving question answers',
        `game ${gameId}${taskId ? ` task ${taskId}` : ''}`,
        error,
      )
    }

    try {
      return values.map((value) => this.deserialize(value, gameId))
    } catch (error) {
      this.logger.error(
        structuredLog('Failed to deserialize stored question answers.', {
          operation: 'deserializeQuestionAnswers',
          gameId,
          questionTaskId: taskId,
        }),
        getErrorStack(error),
      )
      throw error
    }
  }

  /**
   * Clears all stored answers for the game's question task and legacy
   * per-game submission state.
   *
   * @param gameId - Game identifier used to resolve Redis keys.
   */
  public async clear(gameId: string, taskId?: string): Promise<void> {
    const answersKey = this.getAnswerKey(gameId, taskId)
    // Legacy answer state was scoped only by game, even when the caller has a task id.
    const legacyAnswersKey = this.getLegacyAnswerKey(gameId)
    const answeredKey = this.getAnsweredKey(gameId)

    try {
      const results = await this.redis
        .multi()
        .del(answersKey)
        .del(legacyAnswersKey)
        .del(answeredKey)
        .exec()

      const failedCommand = results?.find(([error]) => error)
      if (failedCommand?.[0]) {
        throw failedCommand[0]
      }

      if (!results) {
        throw new Error('Redis transaction returned no result')
      }
    } catch (error) {
      this.logger.error(
        structuredLog('Failed to clear question answers.', {
          operation: 'clear',
          gameId,
          questionTaskId: taskId,
        }),
        getErrorStack(error),
      )
      throw new RedisUnavailableException(
        'clearing question answers',
        `game ${gameId}${taskId ? ` task ${taskId}` : ''}`,
        error,
      )
    }
  }

  /**
   * Builds the Redis key used to store the game's current-question answers.
   *
   * @param gameId - Game identifier used as the key prefix.
   * @returns The versioned Redis hash key for the game's answer storage.
   * @private
   */
  private getAnswerKey(gameId: string, taskId?: string): string {
    return `${gameId}${taskId ? `-${taskId}` : ''}-player-participant-answers-v2`
  }

  /**
   * Builds the pre-hash Redis key used by older service versions.
   *
   * Keeping this key separate prevents a hash command from being sent to a
   * legacy list while allowing task cleanup to remove data left by that list.
   *
   * @param gameId - Game identifier used as the key prefix.
   * @returns The legacy Redis list key for the game's answer storage.
   * @private
   */
  private getLegacyAnswerKey(gameId: string, taskId?: string): string {
    return `${gameId}${taskId ? `-${taskId}` : ''}-player-participant-answers`
  }

  /**
   * Builds the Redis key used to track which players have already submitted an answer
   * for the game's current question.
   *
   * @param gameId - Game identifier used as the key prefix.
   * @returns The legacy Redis set key used for per-player submission tracking.
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
      throw new Error(`Invalid JSON stored for game ${gameIdForError} answers`)
    }

    if (!this.isQuestionTaskAnswer(parsed)) {
      throw new Error(
        `Invalid QuestionTaskAnswer shape stored for game ${gameIdForError}`,
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
