import { Authority, TokenScope } from '@klurigo/common'
import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Query,
  ValidationPipe,
} from '@nestjs/common'
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger'

import {
  RequiredAuthorities,
  RequiresScopes,
} from '../../authentication/controllers/decorators'
import { AuthorizedQuiz } from '../../quiz-core/decorators/auth'
import {
  ApiQuizIdParam,
  RouteQuizIdParam,
} from '../../quiz-core/decorators/params'
import { QuizRatingService } from '../services'

import {
  PaginatedQuizRatingFilter,
  PaginatedQuizRatingResponse,
} from './models'

/**
 * Controller for retrieving quiz ratings for a given quiz.
 *
 * Supports pagination, sorting, and filtering to only include ratings with comments.
 */
@ApiBearerAuth()
@ApiTags('quiz')
@RequiresScopes(TokenScope.User)
@RequiredAuthorities(Authority.Quiz)
@Controller('/quizzes/:quizId')
export class QuizRatingController {
  /**
   * Creates an instance of QuizRatingController.
   *
   * @param quizRatingService - Service for creating and retrieving quiz ratings.
   */
  constructor(private readonly quizRatingService: QuizRatingService) {}

  /**
   * Retrieves quiz ratings for the specified quiz with pagination and sorting.
   *
   * @param quizId - The unique identifier of the quiz.
   * @param queryParams - Pagination, sorting, and filtering parameters.
   *
   * @returns A paginated list of quiz ratings.
   */
  @Get('/ratings')
  @AuthorizedQuiz({ allowPublic: true })
  @ApiOperation({
    summary: 'Retrieve quiz ratings',
    description:
      'Returns a paginated list of ratings for the specified quiz, with optional sorting and filtering to only include ratings that have comments.',
  })
  @ApiQuizIdParam()
  @ApiQuery({
    name: 'sort',
    description: 'Sort ratings by creation or update time.',
    required: false,
    enum: ['created', 'updated'],
  })
  @ApiQuery({
    name: 'order',
    description: 'Sort ratings in ascending or descending order.',
    required: false,
    enum: ['asc', 'desc'],
  })
  @ApiQuery({
    name: 'limit',
    description: 'Maximum number of ratings to return per page.',
    required: false,
    type: Number,
  })
  @ApiQuery({
    name: 'offset',
    description: 'Number of ratings to skip before returning results.',
    required: false,
    type: Number,
  })
  @ApiQuery({
    name: 'commentsOnly',
    description: 'Return only ratings that contain a comment.',
    required: false,
    type: Boolean,
  })
  @ApiBadRequestResponse({
    description: 'One or more rating query parameters are invalid.',
  })
  @ApiOkResponse({
    description: 'A paginated list of quiz ratings.',
    type: PaginatedQuizRatingResponse,
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required.',
  })
  @ApiForbiddenResponse({
    description: 'Insufficient permissions to access quiz ratings.',
  })
  @HttpCode(HttpStatus.OK)
  public async getAllQuizRatings(
    @RouteQuizIdParam() quizId: string,
    @Query(new ValidationPipe({ transform: true }))
    queryParams: PaginatedQuizRatingFilter,
  ): Promise<PaginatedQuizRatingResponse> {
    return this.quizRatingService.findQuizRatingsWithPagination(quizId, {
      offset: queryParams.offset,
      limit: queryParams.limit,
      sort: {
        field: queryParams.sort,
        order: queryParams.order,
      },
      commentsOnly: queryParams.commentsOnly,
    })
  }
}
