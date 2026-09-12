import { TokenDto } from '@klurigo/common'
import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'

import { AuthGuardRequest } from '../../../app/shared/auth'
import { GameRepository } from '../../game-core/repositories'
import { QuizRepository } from '../../quiz-core/repositories'
import { User } from '../../user/repositories'

/**
 * Authorization guard for quiz rating operations.
 *
 * Ensures that the authenticated user is allowed to rate the quiz referenced by the `quizId` route parameter.
 *
 * A user is allowed to rate a quiz only if:
 * - they are not the owner of the quiz, and
 * - they have participated in at least one completed game or active podium game that used that quiz.
 */
@Injectable()
export class QuizRatingGuard implements CanActivate {
  /**
   * Creates an instance of QuizRatingGuard.
   *
   * @param quizRepository - Repository used to load the requested quiz and ensure the authenticated user is not the owner.
   * @param gameRepository - Repository used to verify whether the authenticated user has a rateable game for the
   * requested quiz.
   *
   * @constructor
   */
  constructor(
    private readonly quizRepository: QuizRepository,
    private readonly gameRepository: GameRepository,
  ) {}

  /**
   * Determines whether the current request is allowed to proceed.
   *
   * Validates that:
   * - the request is authenticated and contains a user id
   * - the `quizId` route parameter is present
   * - the authenticated user is not the owner of the quiz
   * - the authenticated user has participated in at least one completed game or active podium game for the given quiz
   *
   * @param context - The execution context for the incoming request.
   *
   * @returns `true` if the request is authorized.
   *
   * @throws UnauthorizedException If the request is missing an authenticated user id.
   * @throws BadRequestException If the `quizId` route parameter is missing.
   * @throws ForbiddenException If the authenticated user is the quiz owner or has not participated in any rateable games for the quiz.
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<AuthGuardRequest<TokenDto, User>>()

    if (!request.user?._id) {
      throw new UnauthorizedException()
    }

    const quizId: string = request.params.quizId
    if (!quizId) {
      throw new BadRequestException()
    }

    const quiz = await this.quizRepository.findQuizByIdOrThrow(quizId)

    if (quiz.owner._id === request.user._id) {
      throw new ForbiddenException()
    }

    const hasGames =
      await this.gameRepository.hasRateableGamesByQuizIdAndParticipantId(
        quizId,
        request.user._id,
      )

    if (!hasGames) {
      throw new ForbiddenException()
    }

    return true
  }
}
