import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'

import { BaseRepository } from '../../../app/shared/repository'

import { GameResult } from './models/schemas'
import type { GameResultModel } from './models/schemas'

/**
 * Repository for querying and persisting game result documents.
 * Wraps access to the MongoDB `GameResult` collection.
 */
@Injectable()
export class GameResultRepository extends BaseRepository<GameResult> {
  /**
   * Creates a new instance of the GameResultRepository.
   *
   * @param gameResultModel - The injected Mongoose model for interacting with game result documents.
   */
  constructor(
    @InjectModel(GameResult.name) private gameResultModel: GameResultModel,
  ) {
    super(gameResultModel, 'GameResult')
  }

  /**
   * Finds the game result for a given game ID.
   *
   * @param gameID - The ID of the game to retrieve results for.
   * @returns The game result if found, otherwise null.
   */
  public async findGameResult(gameID: string): Promise<GameResult | null> {
    return this.gameResultModel
      .findOne({
        game: gameID as never,
      })
      .populate([
        {
          path: 'game',
          populate: [
            {
              path: 'quiz',
              populate: [
                {
                  path: 'owner',
                },
              ],
            },
          ],
        },
      ])
  }

  /**
   * Counts completed game result documents hosted by the given user.
   *
   * @param userId - The user identifier stored as the host participant id.
   *
   * @returns The number of hosted games associated with the user.
   */
  public async countHostedGamesByUserId(userId: string): Promise<number> {
    return this.count({
      hostParticipantId: userId,
    })
  }

  /**
   * Counts completed game result documents where the given user participated.
   *
   * @param userId - The user identifier stored in player participant ids.
   *
   * @returns The number of played games associated with the user.
   */
  public async countPlayedGamesByUserId(userId: string): Promise<number> {
    return this.count({
      'players.participantId': userId,
    })
  }

  /**
   * Persists a game result document.
   *
   * @param gameResult - The game result to persist.
   * @returns The created game result document.
   */
  public async createGameResult(gameResult: GameResult): Promise<GameResult> {
    this.logger.debug(
      `Creating game result for game with ID '${gameResult.game._id}'.`,
    )
    return this.create(gameResult)
  }
}
