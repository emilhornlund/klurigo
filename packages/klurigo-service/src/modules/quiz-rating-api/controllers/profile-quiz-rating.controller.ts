import { Authority, QuizRatingAuthorType, TokenScope } from '@klurigo/common'
import { Body, Controller, HttpCode, HttpStatus, Put } from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger'

import {
  Principal,
  RequiredAuthorities,
  RequiresScopes,
} from '../../authentication/controllers/decorators'
import {
  ApiQuizIdParam,
  RouteQuizIdParam,
} from '../../quiz-core/decorators/params'
import { QuizRatingUserAuthorWithBase } from '../../quiz-core/repositories/models/schemas'
import { User } from '../../user/repositories'
import { QuizRatingService } from '../services'

import { AuthorizedQuizRating } from './decorators/auth'
import { CreateQuizRatingRequest, QuizRatingResponse } from './models'

/**
 * Controller for creating or updating the authenticated user's rating for a quiz.
 *
 * Exposes profile-scoped endpoints that operate on the caller's own rating.
 */
@ApiBearerAuth()
@ApiTags('quiz', 'profile')
@RequiresScopes(TokenScope.User)
@RequiredAuthorities(Authority.Quiz)
@Controller('/profile/quizzes/:quizId')
export class ProfileQuizRatingController {
  /**
   * Creates an instance of ProfileQuizRatingController.
   *
   * @param quizRatingService - Service for creating and retrieving quiz ratings.
   */
  constructor(private readonly quizRatingService: QuizRatingService) {}

  /**
   * Creates or updates the authenticated user's rating for the specified quiz.
   *
   * If the user has already rated the quiz, the existing rating is updated.
   *
   * @param quizId - The unique identifier of the quiz.
   * @param request - The rating payload containing stars and an optional comment.
   * @param user - The authenticated user creating or updating the rating.
   *
   * @returns The created or updated quiz rating.
   */
  @Put('/ratings')
  @AuthorizedQuizRating()
  @ApiOperation({
    summary: 'Creates or updates the authenticated user’s quiz rating.',
    description:
      'Creates a new rating for the specified quiz or updates the existing rating made by the authenticated user.',
  })
  @ApiQuizIdParam()
  @ApiOkResponse({
    description: 'The created or updated quiz rating.',
    type: QuizRatingResponse,
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required.',
  })
  @ApiForbiddenResponse({
    description: 'Insufficient permissions to rate the quiz.',
  })
  @HttpCode(HttpStatus.OK)
  public async createOrUpdateQuizRating(
    @RouteQuizIdParam() quizId: string,
    @Body() request: CreateQuizRatingRequest,
    @Principal() user: User,
  ): Promise<QuizRatingResponse> {
    const author: QuizRatingUserAuthorWithBase = {
      type: QuizRatingAuthorType.User,
      user,
    } as QuizRatingUserAuthorWithBase
    return this.quizRatingService.createOrUpdateQuizRating(
      quizId,
      author,
      request.stars,
      request.comment,
    )
  }
}
