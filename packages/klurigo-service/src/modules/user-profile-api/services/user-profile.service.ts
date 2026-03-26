import {
  PaginatedQuizResponseDto,
  PublicUserProfileResponseDto,
  QuizVisibility,
  UserQuizzesPageFilterDto,
} from '@klurigo/common'
import { Injectable } from '@nestjs/common'
import { QueryFilter } from 'mongoose'

import { GameResultRepository } from '../../game-result/repositories'
import { toQuizResponseDto } from '../../quiz-api/services/utils'
import { QuizRepository } from '../../quiz-core/repositories'
import { Quiz } from '../../quiz-core/repositories/models/schemas'
import { UserService } from '../../user/services'

/**
 * Service responsible for composing public user profile data across domains.
 */
@Injectable()
export class UserProfileService {
  /**
   * Creates a new UserProfileService.
   *
   * @param userService - Service for loading the requested user.
   * @param quizRepository - Repository for counting public quizzes authored by the user.
   * @param gameResultRepository - Repository for counting hosted and played games.
   */
  constructor(
    private readonly userService: UserService,
    private readonly quizRepository: QuizRepository,
    private readonly gameResultRepository: GameResultRepository,
  ) {}

  /**
   * Loads and aggregates a user's public profile summary.
   *
   * @param userId - The unique identifier of the requested user.
   * @returns The aggregated public profile DTO.
   */
  public async findPublicUserProfile(
    userId: string,
  ): Promise<PublicUserProfileResponseDto> {
    const user = await this.userService.findUserProfileOrThrow(userId)

    const [quizzesCount, hostedGamesCount, playedGamesCount] =
      await Promise.all([
        this.quizRepository.countPublicQuizzesByOwnerId(userId),
        this.gameResultRepository.countHostedGamesByUserId(userId),
        this.gameResultRepository.countPlayedGamesByUserId(userId),
      ])

    return {
      id: user.id,
      nickname: user.defaultNickname,
      quizzesCount,
      hostedGamesCount,
      playedGamesCount,
      createdAt: user.created,
    }
  }

  /**
   * Loads a paginated list of public quizzes authored by a specific user.
   *
   * @param userId - The unique identifier of the requested user.
   * @param sort - The field by which to sort the quiz results.
   * @param order - The sort order for the quiz results.
   * @param limit - The maximum number of quizzes to return.
   * @param offset - The number of quizzes to skip.
   * @returns The paginated public quizzes authored by the user.
   */
  public async findPublicQuizzesByUserId(
    userId: string,
    sort: NonNullable<UserQuizzesPageFilterDto['sort']> = 'title',
    order: NonNullable<UserQuizzesPageFilterDto['order']> = 'asc',
    limit: number = 10,
    offset: number = 0,
  ): Promise<PaginatedQuizResponseDto> {
    await this.userService.findUserProfileOrThrow(userId)

    const filter: QueryFilter<Quiz> = {
      owner: { _id: userId },
      visibility: QuizVisibility.Public,
    }

    const [total, quizzes] = await Promise.all([
      this.quizRepository.countQuizzes(filter),
      this.quizRepository.findQuizzes(filter, sort, order, limit, offset),
    ])

    return {
      results: quizzes.map(toQuizResponseDto),
      total,
      limit,
      offset,
    }
  }
}
