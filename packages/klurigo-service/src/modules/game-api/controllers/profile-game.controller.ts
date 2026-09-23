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
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger'

import {
  PrincipalId,
  RequiredAuthorities,
  RequiresScopes,
} from '../../authentication/controllers/decorators'
import { GameService } from '../services'

import { GameHistoryPageFilter } from './models'
import {
  GameHistoryHostResponse,
  GameHistoryPlayerResponse,
  PaginatedGameHistoryResponse,
} from './models/response'

/**
 * Controller for retrieving games associated with a user.
 */
@ApiBearerAuth()
@ApiTags('profile', 'game')
@ApiExtraModels(GameHistoryHostResponse, GameHistoryPlayerResponse)
@RequiresScopes(TokenScope.User)
@RequiredAuthorities(Authority.Game)
@Controller('/profile/games')
export class ProfileGameController {
  /**
   * Initializes the ProfileGameController.
   *
   * @param gameService - Service for managing game operations.
   */
  constructor(private readonly gameService: GameService) {}

  /**
   * Retrieves the games associated with the authenticated user.
   *
   * @param userId - The unique identifier of the authenticated user making the request.
   * @param filter - The pagination parameters.
   * @returns A paginated list of games where the user is a participant.
   */
  @Get()
  @ApiOperation({
    summary: 'Retrieve associated games',
    description:
      'Retrieves a paginated list of games where the authenticated user has participated.',
  })
  @ApiQuery({
    name: 'offset',
    description: 'The number of games to skip before starting retrieval.',
    type: Number,
    required: false,
    example: 0,
  })
  @ApiQuery({
    name: 'limit',
    description: 'The maximum number of games to retrieve per page.',
    type: Number,
    required: false,
    example: 10,
  })
  @ApiBadRequestResponse({
    description: 'One or more pagination parameters are invalid.',
  })
  @ApiOkResponse({
    description: 'Successfully retrieved the list of associated games.',
    type: PaginatedGameHistoryResponse,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized access to the endpoint.',
  })
  @HttpCode(HttpStatus.OK)
  public async getUserGames(
    @PrincipalId() userId: string,
    @Query(new ValidationPipe({ transform: true }))
    filter: GameHistoryPageFilter,
  ): Promise<PaginatedGameHistoryResponse> {
    return this.gameService.findGamesByParticipantId(
      userId,
      filter.offset ?? 0,
      filter.limit ?? 5,
    )
  }
}
