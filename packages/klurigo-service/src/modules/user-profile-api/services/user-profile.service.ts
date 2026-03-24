import { PublicUserProfileResponseDto } from '@klurigo/common'
import { Injectable } from '@nestjs/common'

import { GameResultRepository } from '../../game-result/repositories'
import { QuizRepository } from '../../quiz-core/repositories'
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
}
