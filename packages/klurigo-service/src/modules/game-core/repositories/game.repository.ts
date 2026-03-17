import { GameStatus } from '@klurigo/common'
import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model, QueryFilter } from 'mongoose'
import { MurLock } from 'murlock'

import { BaseRepository } from '../../../app/shared/repository'
import { buildLobbyTask, buildQuitTask } from '../../game-task/utils'
import { Quiz } from '../../quiz-core/repositories/models/schemas'
import { User } from '../../user/repositories'
import {
  ActiveGameNotFoundByGamePINException,
  ActiveGameNotFoundByIDException,
  GameNotFoundException,
} from '../exceptions'
import { buildGameModel } from '../utils'

import { Game, GameDocument, TaskType } from './models/schemas'

/**
 * Repository for interacting with the Game collection in the database.
 *
 * Extends BaseRepository to provide common CRUD operations and adds game-specific methods.
 */
@Injectable()
export class GameRepository extends BaseRepository<Game> {
  /**
   * Constructs the GameRepository.
   *
   * @param gameModel - The Mongoose model representing the Game schema.
   */
  constructor(
    @InjectModel(Game.name)
    protected readonly gameModel: Model<Game>,
  ) {
    super(gameModel, 'Game')
  }

  /**
   * Finds a game by its ID.
   *
   * @param {string} gameID - The ID of the game to find.
   * @param {boolean} active - Whether to filter by active games (default: true).
   *
   * @returns {Promise<GameDocument | null>} A promise that resolves to a GameDocument or null if not found.
   */
  public async findGameByID(
    gameID: string,
    active: boolean = true,
  ): Promise<GameDocument | null> {
    const filter = {
      _id: { $eq: gameID },
      ...(active ? { status: { $eq: GameStatus.Active } } : {}),
    }

    return this.gameModel
      .findOne(filter)
      .populate('quiz') as Promise<GameDocument | null>
  }

  /**
   * Finds a game by its ID and throws an exception if not found.
   *
   * @param {string} gameID - The ID of the game to find.
   * @param {boolean} active - Whether to filter by active games (default: true).
   *
   * @returns {Promise<GameDocument>} A promise that resolves to a GameDocument.
   *
   * @throws {ActiveGameNotFoundByIDException} if no active game is found.
   */
  public async findGameByIDOrThrow(
    gameID: string,
    active: boolean = true,
  ): Promise<GameDocument> {
    const gameDocument = await this.findGameByID(gameID, active)

    if (!gameDocument) {
      if (active) {
        throw new ActiveGameNotFoundByIDException(gameID)
      }
      throw new GameNotFoundException(gameID)
    }

    return gameDocument
  }

  /**
   * Finds a game by its ID constrained to the provided statuses.
   *
   * @param gameID - The ID of the game to find.
   * @param statuses - Allowed statuses for the query.
   *
   * @returns The found game document or `null` when no matching game exists.
   */
  public async findGameByIDWithStatuses(
    gameID: string,
    statuses: GameStatus[],
  ): Promise<GameDocument | null> {
    return this.gameModel
      .findOne({
        _id: { $eq: gameID },
        status: { $in: statuses },
      })
      .populate('quiz') as Promise<GameDocument | null>
  }

  /**
   * Finds a game by its ID constrained to the provided statuses or throws when
   * no matching game exists.
   *
   * @param gameID - The ID of the game to find.
   * @param statuses - Allowed statuses for the query.
   *
   * @returns The found game document.
   *
   * @throws GameNotFoundException If no game exists with the requested ID and allowed statuses.
   */
  public async findGameByIDWithStatusesOrThrow(
    gameID: string,
    statuses: GameStatus[],
  ): Promise<GameDocument> {
    const gameDocument = await this.findGameByIDWithStatuses(gameID, statuses)

    if (!gameDocument) {
      throw new GameNotFoundException(gameID)
    }

    return gameDocument
  }

  /**
   * Finds a game by its PIN.
   *
   * @param {string} gamePIN - The unique 6-digit game PIN of the game to find.
   * @param {boolean} active - Whether to filter by active games (default: true).
   *
   * @returns {Promise<GameDocument | null>} A promise that resolves to a GameDocument or null if not found.
   */
  public async findGameByPIN(
    gamePIN: string,
    active: boolean = true,
  ): Promise<GameDocument | null> {
    const filter = {
      pin: { $eq: gamePIN },
      ...(active ? { status: { $eq: GameStatus.Active } } : {}),
    }

    return this.gameModel
      .findOne(filter)
      .populate('quiz') as Promise<GameDocument | null>
  }

  /**
   * Finds a game by its PIN and throws an exception if not found.
   *
   * @param {string} gamePIN - The unique 6-digit game PIN of the game to find.
   * @param {boolean} active - Whether to filter by active games (default: true).
   *
   * @returns {Promise<GameDocument>} A promise that resolves to a GameDocument.
   *
   * @throws {ActiveGameNotFoundByGamePINException} if no active game is found.
   */
  public async findGameByPINOrThrow(
    gamePIN: string,
    active: boolean = true,
  ): Promise<GameDocument> {
    const gameDocument = await this.findGameByPIN(gamePIN, active)

    if (!gameDocument) {
      throw new ActiveGameNotFoundByGamePINException(gamePIN)
    }

    return gameDocument
  }

  /**
   * Finds a game by its ID (active or completed), updates it using the provided callback, and saves the changes.
   *
   * @param {string} gameID - The ID of the game to find and update.
   * @param {Function} callback - A callback function to modify the game document.
   *
   * @returns {Promise<GameDocument>} A promise that resolves to the updated `GameDocument`.
   *
   * @throws {GameNotFoundException} If no active or completed game is found with the given ID.
   */
  @MurLock(5000, 'game', 'gameID')
  public async findAndSaveWithLock(
    gameID: string,
    callback: (gameDocument: GameDocument) => Promise<GameDocument>,
  ): Promise<GameDocument> {
    const gameDocument = await this.findGameByIDWithStatusesOrThrow(gameID, [
      GameStatus.Active,
      GameStatus.Completed,
    ])

    const updatedGameDocument = await callback(gameDocument)
    updatedGameDocument.updated = new Date()
    return await updatedGameDocument.save()
  }

  /**
   * Finds games associated with a specific participant ID.
   *
   * @param participantId - The ID of the participant.
   * @param offset - The number of games to skip for pagination.
   * @param limit - The maximum number of games to return.
   * @returns An object containing the list of games and the total number of matching games.
   */
  public async findGamesByParticipantId(
    participantId: string,
    offset: number = 0,
    limit: number = 5,
  ): Promise<{
    results: GameDocument[]
    total: number
  }> {
    const filter: QueryFilter<Game> = {
      status: { $in: [GameStatus.Completed, GameStatus.Active] },
      'participants.participantId': participantId,
    }

    const result = await this.findWithPagination(filter, {
      skip: offset,
      limit,
      sort: { status: 1, created: -1 },
      populate: 'quiz',
    })

    return {
      results: result.documents as GameDocument[],
      total: result.total,
    }
  }

  /**
   * Checks whether a participant has played at least one completed game for a specific quiz.
   *
   * This is used to enforce authorization rules for quiz-related operations (for example, allowing a user
   * to rate a quiz only after they have participated in a completed game that used that quiz).
   *
   * @param quizId - The quiz id to match against `game.quiz._id`.
   * @param participantId - The participant id to match against `participants.participantId`.
   *
   * @returns `true` if at least one completed game exists for the given quiz and participant; otherwise `false`.
   */
  public async hasCompletedGamesByQuizIdAndParticipantId(
    quizId: string,
    participantId: string,
  ): Promise<boolean> {
    const filter: QueryFilter<Game> = {
      status: { $in: [GameStatus.Completed] },
      quiz: { _id: quizId },
      'participants.participantId': participantId,
    }

    return this.exists(filter)
  }

  /**
   * Aggregates per-quiz play counts for games completed within a recent
   * time window.
   *
   * Queries the `games` collection for documents with
   * `status === Completed` whose `completedAt` timestamp falls within the
   * last `windowDays` days. Groups by the `quiz` reference field (a UUID
   * string matching `Quiz._id`) and counts documents per group.
   *
   * The query is backed by the `{ status: 1, completedAt: 1 }` compound index.
   *
   * @param windowDays - Number of trailing days defining the "recent" window.
   * @returns Array of `{ quizId, playCount }` objects, one per quiz that had
   *   at least one completed game in the window. Quizzes with no recent
   *   activity are omitted (callers should treat absence as `playCount: 0`).
   */
  public async findRecentGameStats(
    windowDays: number,
  ): Promise<Array<{ quizId: string; playCount: number }>> {
    const cutoff = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000)

    return this.gameModel.aggregate<{ quizId: string; playCount: number }>([
      {
        $match: {
          status: GameStatus.Completed,
          completedAt: { $gte: cutoff },
        },
      },
      {
        $group: {
          _id: '$quiz',
          playCount: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          quizId: '$_id',
          playCount: 1,
        },
      },
    ])
  }

  /**
   * Generates a unique 6-digit game PIN. It checks the database to ensure that no other active game
   * with the same PIN exists. If such a game exists, it keeps generating
   * new PINs until a unique one is found.
   *
   * @returns {Promise<string>} A Promise that resolves with a unique 6-digit game PIN.
   *
   * @private
   */
  private async generateUniqueGamePIN(): Promise<string> {
    let isUnique = false
    let gamePIN: string = ''

    while (!isUnique) {
      gamePIN = Math.floor(100000 + Math.random() * 900000).toString()

      const existingGame = await this.findGameByPIN(gamePIN)

      if (!existingGame) {
        isUnique = true
      }
    }

    return gamePIN
  }

  /**
   * Creates and saves a new game.
   *
   * @param quiz - The quiz document.
   * @param user - The user object representing the host creating the game.
   *
   * @returns A promise that resolves to the saved GameDocument.
   */
  public async createGame(quiz: Quiz, user: User): Promise<GameDocument> {
    const gamePIN = await this.generateUniqueGamePIN()

    const game = buildGameModel(quiz, gamePIN, user, buildLobbyTask())

    return (await this.create(game)) as GameDocument
  }

  /**
   * Marks stale games as 'Completed' if they:
   * - Are still marked as 'Active'
   * - Are currently in the 'Podium' task
   * - Have not been updated in over 1 hour
   *
   * @returns Number of games successfully updated to 'Completed'
   */
  public async updateCompletedGames(): Promise<number> {
    const filter = {
      status: GameStatus.Active,
      'currentTask.type': TaskType.Podium,
      updated: { $lt: new Date(Date.now() - 60 * 60 * 1000) },
    }

    const quitTask = buildQuitTask()

    return this.updateMany(filter, [
      {
        $set: {
          previousTasks: {
            $concatArrays: ['$previousTasks', ['$currentTask']],
          },
          currentTask: quitTask,
          status: GameStatus.Completed,
          completedAt: '$$NOW',
        },
      },
    ])
  }

  /**
   * Marks stale games as 'Expired' if they:
   * - Are still marked as 'Active'
   * - Are currently not in the 'Podium' or 'Quit' task
   * - Have not been updated in over 1 hour
   *
   * @returns Number of games successfully updated to 'Expired'
   */
  public async updateExpiredGames(): Promise<number> {
    const filter = {
      status: GameStatus.Active,
      'currentTask.type': { $nin: [TaskType.Podium, TaskType.Quit] },
      updated: { $lt: new Date(Date.now() - 60 * 60 * 1000) },
    }

    const quitTask = buildQuitTask()

    return this.updateMany(filter, [
      {
        $set: {
          previousTasks: {
            $concatArrays: ['$previousTasks', ['$currentTask']],
          },
          currentTask: quitTask,
          status: GameStatus.Expired,
        },
      },
    ])
  }
}
