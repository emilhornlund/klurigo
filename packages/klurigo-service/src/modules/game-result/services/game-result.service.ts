import {
  GameMode,
  GameResultClassicModePlayerMetricDto,
  GameResultClassicModeQuestionMetricDto,
  GameResultDto,
  GameResultPlayerMetricDto,
  GameResultQuestionMetricDto,
  GameResultRatingDto,
  GameResultZeroToOneHundredModePlayerMetricDto,
  GameResultZeroToOneHundredModeQuestionMetricDto,
  QuizVisibility,
} from '@klurigo/common'
import { Injectable, Logger } from '@nestjs/common'

import { GameDocument } from '../../game-core/repositories/models/schemas'
import {
  QuizRatingRepository,
  QuizRepository,
} from '../../quiz-core/repositories'
import { User, UserRepository } from '../../user/repositories'
import { GameResultsNotFoundException } from '../exceptions'
import { GameResultRepository } from '../repositories'
import {
  GameResult,
  PlayerMetric,
  QuestionMetric,
} from '../repositories/models/schemas'

import { buildGameResultModel } from './utils/game-result.converter'
import { aggregateQuizGameplaySummary } from './utils/quiz-gameplay-summary.utils'

/**
 * Service for retrieving and formatting quiz game results.
 */
@Injectable()
export class GameResultService {
  private readonly logger = new Logger(GameResultService.name)

  /**
   * Constructs a new GameResultService.
   *
   * @param gameResultRepository - Repository for accessing stored game results.
   * @param quizRatingRepository - Repository for retrieving quiz ratings authored by participants.
   * @param quizRepository - Repository for accessing and updating quizzes, including persisting aggregated gameplay summary metrics.
   * @param userRepository - Repository for accessing user data.
   */
  constructor(
    private readonly gameResultRepository: GameResultRepository,
    private readonly quizRatingRepository: QuizRatingRepository,
    private readonly quizRepository: QuizRepository,
    private readonly userRepository: UserRepository,
  ) {}

  /**
   * Retrieves the result of a completed quiz game.
   * Player metrics are filtered to include:
   * - Top 5 by rank, and
   * - The requesting participant’s own metrics (if not already in the top 5).
   *
   * @param gameID - The ID of the game to retrieve.
   * @param participantId - participantId The authenticated participant’s ID. Used to ensure
   * the caller’s metric is included even if outside the top 5.
   *
   * @returns The structured result of the game.
   *
   * @throws GameResultsNotFoundException if the result is not found.
   */
  public async getGameResult(
    gameID: string,
    participantId: string,
  ): Promise<GameResultDto> {
    const gameResultDocument =
      await this.gameResultRepository.findGameResult(gameID)

    if (!gameResultDocument) {
      throw new GameResultsNotFoundException(gameID)
    }

    const {
      game: { _id: id, name, mode, quiz },
      hostParticipantId,
      players,
      questions,
      hosted: created,
      completed,
    } = gameResultDocument

    if (!quiz) {
      throw new GameResultsNotFoundException(gameID)
    }

    const isOwner = quiz.owner?._id === participantId
    const isPublicQuiz = quiz.visibility === QuizVisibility.Public
    const canRateQuiz = !isOwner
    const canHostLiveGame = isOwner || isPublicQuiz

    const hostUser = await this.userRepository.findUserById(hostParticipantId)

    const participantUser =
      await this.userRepository.findUserById(participantId)

    const rating = await this.getQuizRating(quiz._id, participantUser)

    return {
      id,
      name,
      quiz: { id: quiz._id, canRateQuiz, canHostLiveGame },
      host: {
        id: hostParticipantId,
        nickname: hostUser?.defaultNickname || 'N/A',
      },
      numberOfPlayers: players.length,
      numberOfQuestions: questions.length,
      ...(mode === GameMode.Classic
        ? {
            mode: GameMode.Classic,
            playerMetrics: players
              .map(GameResultService.toClassicModePlayerMetricDto)
              .filter((metric) =>
                GameResultService.playerMetricFilter(metric, participantId),
              )
              .sort((a, b) => a.rank - b.rank),
            questionMetrics: questions.map(
              GameResultService.toClassicModeQuestionMetricDto,
            ),
          }
        : {
            mode: GameMode.ZeroToOneHundred,
            playerMetrics: players
              .map(GameResultService.toZeroToOneHundredModePlayerMetricDto)
              .filter((metric) =>
                GameResultService.playerMetricFilter(metric, participantId),
              )
              .sort((a, b) => a.rank - b.rank),
            questionMetrics: questions.map(
              GameResultService.toZeroToOneHundredModeQuestionMetricDto,
            ),
          }),
      duration: (completed.getTime() - created.getTime()) / 1000,
      rating,
      created,
    }
  }

  /**
   * Creates and persists a game result for the provided game document.
   *
   * Persists the game result first, then aggregates the quiz `gameplaySummary` using the
   * completed game result and persists the updated quiz.
   *
   * @param game - The completed game document used to build the persisted result model.
   * @returns The persisted game result document.
   */
  public async createGameResult(game: GameDocument): Promise<GameResult> {
    const gameResult = await this.gameResultRepository.createGameResult(
      buildGameResultModel(game),
    )

    const quiz = await this.quizRepository.findQuizByIdOrThrow(game.quiz._id)

    const updatedGameplaySummary = aggregateQuizGameplaySummary(
      quiz.gameplaySummary,
      gameResult,
      game.mode,
      gameResult.completed,
    )

    await this.quizRepository.replaceQuiz(game.quiz._id, {
      ...quiz,
      gameplaySummary: updatedGameplaySummary,
    })

    return gameResult
  }

  /**
   * Deletes all persisted game results associated with a specific game.
   *
   * This is typically invoked as part of cascade cleanup when a game is deleted.
   *
   * @param gameId - The ID of the deleted game whose game results should be removed.
   * @returns Resolves when the delete operation has completed.
   */
  public async deleteByGameId(gameId: string): Promise<void> {
    const deletedCount = await this.gameResultRepository.deleteMany({
      game: { _id: gameId },
    })

    this.logger.log(
      `Deleted '${deletedCount}' game results by their gameId '${gameId}'.`,
    )
  }

  /**
   * Retrieves the quiz rating authored by a specific participant, if it exists.
   *
   * If the participant user cannot be resolved, or if no rating exists for the quiz authored by that user,
   * no rating is included in the game result.
   *
   * @param quizId - The quiz identifier to match against the rating's `quiz` reference.
   * @param author - The participant user to match against the rating's author.
   *
   * @returns The rating (stars and optional comment) when a rating exists; otherwise `undefined`.
   *
   * @private
   */
  private async getQuizRating(
    quizId: string,
    author: User | null,
  ): Promise<GameResultRatingDto | undefined> {
    if (!author) {
      return undefined
    }

    const rating = await this.quizRatingRepository.findQuizRatingByUserAuthor(
      quizId,
      author._id,
    )

    if (!rating) {
      return undefined
    }

    return { stars: rating.stars, comment: rating.comment }
  }

  /**
   * Returns whether a player metric should be included in the response.
   *
   * Inclusion rule:
   * - Include ranks 1–5 (top 5), OR
   * - Include the requesting participant’s metric (by `participantId`) regardless of rank.
   *
   * @param playerMetricDto A player’s metric DTO.
   * @param participantId The authenticated participant’s ID.
   *
   * @returns `true` if the metric should be included; otherwise `false`.
   *
   * @private
   */
  private static playerMetricFilter(
    playerMetricDto: GameResultPlayerMetricDto,
    participantId: string,
  ): boolean {
    const { rank, player } = playerMetricDto
    return (rank > 0 && rank <= 5) || player.id === participantId
  }

  /**
   * Maps a player metric to its base result DTO.
   *
   * @param playerMetric - The internal player metric entity.
   * @returns The base player metric DTO.
   * @private
   */
  private static toBasePlayerMetricDto(
    playerMetric: PlayerMetric,
  ): GameResultPlayerMetricDto {
    const {
      participantId: id,
      nickname,
      rank,
      comebackRankGain,
      unanswered,
      averageResponseTime,
      longestCorrectStreak,
      score,
    } = playerMetric
    return {
      player: { id, nickname },
      rank,
      comebackRankGain,
      unanswered,
      averageResponseTime,
      longestCorrectStreak,
      score,
    }
  }

  /**
   * Maps a player metric to its Classic Mode result DTO.
   *
   * @param playerMetric - The internal player metric entity.
   * @returns The Classic Mode player metric DTO.
   * @private
   */
  private static toClassicModePlayerMetricDto(
    playerMetric: PlayerMetric,
  ): GameResultClassicModePlayerMetricDto {
    const { correct, incorrect } = playerMetric
    return {
      ...GameResultService.toBasePlayerMetricDto(playerMetric),
      correct: correct ?? 0,
      incorrect: incorrect ?? 0,
    }
  }

  /**
   * Maps a player metric to its Zero-to-One-Hundred Mode result DTO.
   *
   * @param playerMetric - The internal player metric entity.
   * @returns The Zero-to-One-Hundred Mode player metric DTO.
   * @private
   */
  private static toZeroToOneHundredModePlayerMetricDto(
    playerMetric: PlayerMetric,
  ): GameResultZeroToOneHundredModePlayerMetricDto {
    const { averagePrecision } = playerMetric
    return {
      ...GameResultService.toBasePlayerMetricDto(playerMetric),
      averagePrecision: averagePrecision ?? 0,
    }
  }

  /**
   * Maps a question metric to its base result DTO.
   *
   * @param questionMetric - The internal question metric entity.
   * @returns The base question metric DTO.
   * @private
   */
  private static toBaseQuestionMetricDto(
    questionMetric: QuestionMetric,
  ): GameResultQuestionMetricDto {
    const { text, type, unanswered, averageResponseTime } = questionMetric
    return { text, type, unanswered, averageResponseTime }
  }

  /**
   * Maps a question metric to its Classic Mode result DTO.
   *
   * @param questionMetric - The internal question metric entity.
   * @returns The Classic Mode question metric DTO.
   * @private
   */
  private static toClassicModeQuestionMetricDto(
    questionMetric: QuestionMetric,
  ): GameResultClassicModeQuestionMetricDto {
    const { correct, incorrect } = questionMetric
    return {
      ...GameResultService.toBaseQuestionMetricDto(questionMetric),
      correct: correct ?? 0,
      incorrect: incorrect ?? 0,
    }
  }

  /**
   * Maps a question metric to its Zero-to-One-Hundred Mode result DTO.
   *
   * @param questionMetric - The internal question metric entity.
   * @returns The Zero-to-One-Hundred Mode question metric DTO.
   * @private
   */
  private static toZeroToOneHundredModeQuestionMetricDto(
    questionMetric: QuestionMetric,
  ): GameResultZeroToOneHundredModeQuestionMetricDto {
    const { averagePrecision } = questionMetric
    return {
      ...GameResultService.toBaseQuestionMetricDto(questionMetric),
      averagePrecision: averagePrecision ?? 0,
    }
  }
}
