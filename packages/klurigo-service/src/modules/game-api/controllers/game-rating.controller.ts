import { Authority, GameParticipantType, TokenScope } from '@klurigo/common'
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
  PrincipalId,
  RequiredAuthorities,
  RequiresScopes,
} from '../../authentication/controllers/decorators'
import { AuthorizedGame } from '../../game-core/decorators/auth'
import {
  CreateQuizRatingRequest,
  QuizRatingResponse,
} from '../../quiz-rating-api/controllers/models'
import { GameRatingService } from '../services'

import { ApiGameIdParam } from './decorators/api'
import { RouteGameIdParam } from './decorators/params'

/**
 * Controller for creating or updating a player's rating for the quiz
 * associated with a game.
 *
 * Exposes a game-scoped endpoint allowing both anonymous and authenticated
 * players to rate the quiz they just played.
 */
@ApiBearerAuth()
@ApiTags('game')
@RequiresScopes(TokenScope.Game)
@RequiredAuthorities(Authority.Game)
@Controller('games/:gameID')
export class GameRatingController {
  /**
   * Creates an instance of GameRatingController.
   *
   * @param gameRatingService - Service for bridging game-context rating requests to the quiz rating service.
   */
  constructor(private readonly gameRatingService: GameRatingService) {}

  /**
   * Creates or updates the player's rating for the quiz associated with the game.
   *
   * If the player has already rated the quiz, the existing rating is updated.
   * Quiz owners are not allowed to rate their own quiz.
   *
   * @param gameId - The unique identifier of the game.
   * @param participantId - The participant's identifier extracted from the game-scoped JWT.
   * @param request - The rating payload containing stars and an optional comment.
   *
   * @returns The created or updated quiz rating.
   */
  @Put('/ratings')
  @AuthorizedGame(GameParticipantType.PLAYER)
  @ApiOperation({
    summary: "Creates or updates the player's quiz rating from a game context.",
    description:
      'Creates a new rating for the quiz associated with the specified game, or updates the existing rating made by the current player. Supports both anonymous and authenticated players. Quiz owners cannot rate their own quiz.',
  })
  @ApiGameIdParam()
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
  public async createOrUpdateRating(
    @RouteGameIdParam() gameId: string,
    @PrincipalId() participantId: string,
    @Body() request: CreateQuizRatingRequest,
  ): Promise<QuizRatingResponse> {
    return this.gameRatingService.createOrUpdateRating(
      gameId,
      participantId,
      request.stars,
      request.comment,
    )
  }
}
