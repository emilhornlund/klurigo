import { Authority, TokenScope } from '@klurigo/common'
import { Controller, Get, Query, ValidationPipe } from '@nestjs/common'
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
  Principal,
  RequiredAuthorities,
  RequiresScopes,
} from '../../authentication/controllers/decorators'
import { User } from '../../user/repositories'
import { QuizService } from '../services'

import { PaginatedQuizResponse, QuizPageQueryFilter } from './models'

/**
 * Controller for managing profile quiz-related operations.
 */
@ApiBearerAuth()
@ApiTags('profile', 'quiz')
@RequiresScopes(TokenScope.User)
@RequiredAuthorities(Authority.Quiz, Authority.User)
@Controller('profile')
export class ProfileQuizController {
  /**
   * Initializes the ProfileQuizController.
   *
   * @param quizService - Service responsible for managing quiz-related operations.
   */
  constructor(private readonly quizService: QuizService) {}

  /**
   * Retrieves the quizzes associated with the authenticated user.
   *
   * @param user - The authenticated user making the request.
   * @param queryParams - The pagination and filtering query parameters for retrieving quizzes.
   *
   * @returns A paginated response containing the user's associated quizzes.
   */
  @Get('/quizzes')
  @ApiOperation({
    summary: 'Retrieve associated quizzes',
    description:
      'Fetches a paginated list of quizzes associated with the authenticated user.',
  })
  @ApiQuery({
    name: 'search',
    description: 'Filter quizzes by a title search term.',
    required: false,
    type: String,
  })
  @ApiQuery({
    name: 'mode',
    description: 'Filter quizzes by game mode.',
    required: false,
    type: String,
  })
  @ApiQuery({
    name: 'visibility',
    description: 'Filter quizzes by visibility.',
    required: false,
    type: String,
  })
  @ApiQuery({
    name: 'category',
    description: 'Filter quizzes by category.',
    required: false,
    type: String,
  })
  @ApiQuery({
    name: 'languageCode',
    description: 'Filter quizzes by language code.',
    required: false,
    type: String,
  })
  @ApiQuery({
    name: 'sort',
    description: 'Sort results by title, creation time, or update time.',
    required: false,
    enum: ['title', 'created', 'updated'],
  })
  @ApiQuery({
    name: 'order',
    description: 'Sort results in ascending or descending order.',
    required: false,
    enum: ['asc', 'desc'],
  })
  @ApiQuery({
    name: 'limit',
    description: 'Maximum number of quizzes to return per page.',
    required: false,
    type: Number,
  })
  @ApiQuery({
    name: 'offset',
    description: 'Number of quizzes to skip before returning results.',
    required: false,
    type: Number,
  })
  @ApiBadRequestResponse({
    description: 'One or more quiz query parameters are invalid.',
  })
  @ApiOkResponse({
    description: "Successfully retrieved the associated user's quizzes.",
    type: PaginatedQuizResponse,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized access to the endpoint.',
  })
  @ApiForbiddenResponse({
    description: 'The token lacks the required quiz or user authority.',
  })
  public async getUserQuizzes(
    @Principal() user: User,
    @Query(new ValidationPipe({ transform: true }))
    queryParams: QuizPageQueryFilter,
  ): Promise<PaginatedQuizResponse> {
    return this.quizService.findQuizzesByOwnerId(
      user._id,
      queryParams.search,
      queryParams.mode,
      queryParams.visibility,
      queryParams.category,
      queryParams.languageCode,
      queryParams.sort,
      queryParams.order,
      queryParams.limit,
      queryParams.offset,
    )
  }
}
