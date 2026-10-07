import { QuizVisibility, TokenDto } from '@klurigo/common'
import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'

import {
  AuthGuardRequest,
  AUTHORIZED_QUIZ_ALLOW_PUBLIC,
} from '../../../app/shared/auth'
import { User } from '../../user/repositories'
import { QuizRepository } from '../repositories'

/**
 * Guard to authorize access to quizzes based on ownership.
 *
 * Ensures that the authenticated user owns the quiz they are trying to access
 * or modify. Throws appropriate exceptions if authorization fails.
 */
@Injectable()
export class QuizAuthGuard implements CanActivate {
  /**
   * Initializes the QuizAuthGuard.
   *
   * @param reflector - Used for retrieving metadata, such as if allow public.
   * @param quizRepository - Repository for accessing and modifying quiz documents.
   */
  constructor(
    private readonly reflector: Reflector,
    private readonly quizRepository: QuizRepository,
  ) {}

  /**
   * Determines whether the request can proceed based on authorization.
   *
   * @param context - The context of the incoming request.
   *
   * @returns A boolean indicating whether the request is authorized.
   *
   * @throws UnauthorizedException If the user is not authenticated.
   * @throws BadRequestException If the `quizId` parameter is missing or invalid.
   * @throws ForbiddenException If the user is not the owner of the quiz.
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<AuthGuardRequest<TokenDto, User>>()

    if (!request.user?._id) {
      throw new UnauthorizedException()
    }

    const quizId = request.params.quizId
    if (typeof quizId !== 'string' || !quizId) {
      throw new BadRequestException()
    }

    const quiz = await this.quizRepository.findQuizByIdOrThrow(quizId)

    const allowPublic =
      this.reflector.getAllAndOverride<boolean>(AUTHORIZED_QUIZ_ALLOW_PUBLIC, [
        context.getHandler(),
        context.getClass(),
      ]) ?? false

    const isOwner = quiz.owner._id === request.user._id
    const isPublicQuiz = quiz.visibility === QuizVisibility.Public

    if (
      (!allowPublic && !isOwner) ||
      (allowPublic && !isPublicQuiz && !isOwner)
    ) {
      throw new ForbiddenException()
    }

    return true
  }
}
