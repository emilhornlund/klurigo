import { Authority, GameParticipantType, TokenScope } from '@klurigo/common'
import { Body, Controller, HttpCode, HttpStatus, Put } from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger'

import {
  ApiBadRequestErrorResponse as ApiBadRequestResponse,
  ApiForbiddenErrorResponse as ApiForbiddenResponse,
  ApiNotFoundErrorResponse as ApiNotFoundResponse,
  ApiUnauthorizedErrorResponse as ApiUnauthorizedResponse,
} from '../../../app/decorators'
import {
  RequiredAuthorities,
  RequiresScopes,
} from '../../authentication/controllers/decorators'
import { AuthorizedGame } from '../../game-core/decorators/auth'
import { GameSettingsService } from '../services'

import { ApiGameIdParam } from './decorators/api'
import { RouteGameIdParam } from './decorators/params'
import { GameSettingsRequest } from './models/requests/game-settings.request'
import { GameSettingsResponse } from './models/response/game-settings.response'

/**
 * Endpoints for managing runtime settings for an existing game.
 *
 * Settings can only be changed by the host while the game is in the lobby task.
 */
@ApiBearerAuth()
@ApiTags('game')
@RequiresScopes(TokenScope.Game)
@RequiredAuthorities(Authority.Game)
@Controller('/games/:gameID/settings')
export class GameSettingsController {
  /**
   * Creates a new controller for managing game runtime settings.
   *
   * @param gameSettingsService Service responsible for validating and persisting game settings.
   */
  constructor(private readonly gameSettingsService: GameSettingsService) {}

  /**
   * Saves runtime settings for a game.
   *
   * Settings can only be updated by the host while the game is in an active lobby task.
   *
   * @param gameId Unique identifier of the game.
   * @param gameSettingsRequest The new runtime settings to persist for the game.
   * @returns The persisted runtime settings for the game.
   */
  @Put()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update game settings',
    description:
      'Updates runtime settings for an existing game. Settings can only be changed by the host while the game is in an active lobby task.',
  })
  @ApiBody({
    description: 'Payload containing the runtime settings to save.',
    type: GameSettingsRequest,
  })
  @ApiBadRequestResponse({
    description: 'The game settings payload is invalid.',
  })
  @ApiOkResponse({
    description: 'Game settings were updated successfully.',
    type: GameSettingsResponse,
  })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse({
    description:
      'Forbidden. The authenticated participant is not allowed to access this game or does not have the required role.',
  })
  @ApiNotFoundResponse({
    description: 'No active game found with the specified unique identifier.',
  })
  @AuthorizedGame(GameParticipantType.HOST)
  @ApiGameIdParam()
  public async saveGameSettings(
    @RouteGameIdParam() gameId: string,
    @Body() gameSettingsRequest: GameSettingsRequest,
  ): Promise<GameSettingsResponse> {
    return this.gameSettingsService.saveGameSettings(
      gameId,
      gameSettingsRequest,
    )
  }
}
