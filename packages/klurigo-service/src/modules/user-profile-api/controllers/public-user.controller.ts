import { Authority, TokenScope } from '@klurigo/common'
import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Query,
  ValidationPipe,
} from '@nestjs/common'
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger'

import {
  RequiredAuthorities,
  RequiresScopes,
} from '../../authentication/controllers/decorators'
import { PaginatedQuizResponse } from '../../quiz-api/controllers/models'
import { UserProfileService } from '../services'

import { UserQuizzesPageFilter } from './filters'
import { PublicUserProfileResponse } from './responses'

/**
 * Controller exposing authenticated public user profile endpoints.
 */
@ApiBearerAuth()
@ApiTags('user', 'profile')
@RequiresScopes(TokenScope.User)
@RequiredAuthorities(Authority.User)
@Controller('/users/:userId')
export class PublicUserController {
  /**
   * Creates a PublicUserController.
   *
   * @param userProfileService - Service for loading public user profile data.
   */
  constructor(private readonly userProfileService: UserProfileService) {}

  /**
   * Retrieves the public profile for the specified user.
   *
   * @param userId - The unique identifier of the requested user.
   * @returns The requested user's public profile summary.
   */
  @Get('profile')
  @ApiOperation({
    summary: 'Retrieve a public user profile',
    description:
      'Returns the public profile summary for the specified user, including ' +
      'quiz and gameplay counts.',
  })
  @ApiParam({
    name: 'userId',
    description: 'The unique identifier of the user.',
    type: String,
    example: 'eaf37189-7aa7-455e-9e47-73db2a7d0a03',
  })
  @ApiOkResponse({
    description: 'Successfully retrieved the user’s public profile.',
    type: PublicUserProfileResponse,
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required.',
  })
  @ApiForbiddenResponse({
    description: 'Insufficient permissions to view public user profiles.',
  })
  @ApiNotFoundResponse({
    description: 'The requested user was not found.',
  })
  @HttpCode(HttpStatus.OK)
  public async getPublicUserProfile(
    @Param('userId') userId: string,
  ): Promise<PublicUserProfileResponse> {
    return this.userProfileService.findPublicUserProfile(userId)
  }

  /**
   * Retrieves public quizzes authored by the specified user.
   *
   * @param userId - The unique identifier of the requested user.
   * @param queryParams - Pagination and sorting options for the public quizzes.
   * @returns A paginated list of public quizzes authored by the user.
   */
  @Get('quizzes')
  @ApiOperation({
    summary: 'Retrieve a user’s public quizzes',
    description:
      'Returns a paginated list of public quizzes authored by the specified ' +
      'user. Supports sorting and offset pagination.',
  })
  @ApiParam({
    name: 'userId',
    description: 'The unique identifier of the user.',
    type: String,
    example: 'eaf37189-7aa7-455e-9e47-73db2a7d0a03',
  })
  @ApiQuery({
    name: 'sort',
    description: 'The field by which to sort the results.',
    required: false,
    enum: ['title', 'created', 'updated'],
    example: 'title',
  })
  @ApiQuery({
    name: 'order',
    description: 'The sort order for the results.',
    required: false,
    enum: ['asc', 'desc'],
    example: 'asc',
  })
  @ApiQuery({
    name: 'limit',
    description: 'The maximum number of quizzes to retrieve per page.',
    required: false,
    type: Number,
    example: 10,
  })
  @ApiQuery({
    name: 'offset',
    description: 'The number of quizzes to skip before starting retrieval.',
    required: false,
    type: Number,
    example: 0,
  })
  @ApiOkResponse({
    description: 'Successfully retrieved the user’s public quizzes.',
    type: PaginatedQuizResponse,
  })
  @ApiBadRequestResponse({
    description: 'Invalid query parameters.',
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required.',
  })
  @ApiForbiddenResponse({
    description: 'Insufficient permissions to view public user quizzes.',
  })
  @ApiNotFoundResponse({
    description: 'The requested user was not found.',
  })
  @HttpCode(HttpStatus.OK)
  public async getPublicUserQuizzes(
    @Param('userId') userId: string,
    @Query(new ValidationPipe({ transform: true }))
    queryParams: UserQuizzesPageFilter,
  ): Promise<PaginatedQuizResponse> {
    return this.userProfileService.findPublicQuizzesByUserId(
      userId,
      queryParams.sort,
      queryParams.order,
      queryParams.limit,
      queryParams.offset,
    )
  }
}
