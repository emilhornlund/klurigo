import { Authority, TokenScope } from '@klurigo/common'
import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiExtraModels,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
  getSchemaPath,
} from '@nestjs/swagger'

import {
  PrincipalId,
  RequiredAuthorities,
  RequiresScopes,
} from '../../authentication/controllers/decorators'
import { ApiGameIdParam } from '../../game-api/controllers/decorators/api'
import { RouteGameIdParam } from '../../game-api/controllers/decorators/params'
import { AuthorizedGame } from '../../game-core/decorators/auth'
import { GameResultService } from '../services'

import {
  GameResultClassicModeResponse,
  GameResultZeroToOneHundredModeResponse,
} from './models/responses'

/**
 * Controller responsible for exposing endpoints related to game results.
 *
 * Handles the retrieval of final game data after a quiz has been completed.
 * Supports multiple game modes, each with their corresponding result structures.
 *
 * All endpoints in this controllers require authentication and user-scope authorization
 * to access the results of a specific game session.
 */
@ApiBearerAuth()
@ApiTags('game')
@ApiExtraModels(
  GameResultClassicModeResponse,
  GameResultZeroToOneHundredModeResponse,
)
@RequiresScopes(TokenScope.User)
@RequiredAuthorities(Authority.Game)
@Controller('/games/:gameID/results')
export class GameResultController {
  /**
   * Creates a new instance of the GameResultController.
   *
   * @param gameResultService - Service for retrieving quiz game results.
   */
  constructor(private readonly gameResultService: GameResultService) {}

  /**
   * Retrieves the results of a completed quiz game by its ID.
   *
   * This endpoint returns the final game outcome, including player rankings,
   * individual scores, and per-question performance metrics. The structure of the
   * response depends on the game mode (classic or zero to one hundred). Streak
   * metrics are included only for Classic mode.
   *
   * Authorization:
   * - Requires a valid access token (`@ApiBearerAuth`)
   * - The user must have permission to access the requested game results.
   *
   * @param gameID The unique identifier of the game.
   * @param participantId The authenticated participant's ID (extracted via `@PrincipalId`),
   * used to ensure the caller’s own metrics are included even if outside the top 5.
   * @returns The game result object for the requested game and mode.
   */
  @Get()
  @ApiOperation({
    summary: 'Get final results of a completed quiz game',
    description:
      'Returns performance metrics for players and questions based on the game mode (classic or zero to one hundred). Streak metrics are Classic-only.',
  })
  @ApiGameIdParam()
  @ApiOkResponse({
    description:
      'Returns the final results of the game. The response structure depends on the game mode.',
    schema: {
      oneOf: [
        { $ref: getSchemaPath(GameResultClassicModeResponse) },
        { $ref: getSchemaPath(GameResultZeroToOneHundredModeResponse) },
      ],
    },
  })
  @ApiUnauthorizedResponse({
    description:
      'Unauthorized access to the endpoint. Token is missing or invalid.',
  })
  @ApiForbiddenResponse({
    description: 'The user does not have access to the game results.',
  })
  @ApiNotFoundResponse({
    description: 'No game found with the specified unique identifier.',
  })
  @AuthorizedGame()
  @HttpCode(HttpStatus.OK)
  public async getGameResults(
    @RouteGameIdParam() gameID: string,
    @PrincipalId() participantId: string,
  ): Promise<
    GameResultClassicModeResponse | GameResultZeroToOneHundredModeResponse
  > {
    return this.gameResultService.getGameResult(gameID, participantId)
  }
}
