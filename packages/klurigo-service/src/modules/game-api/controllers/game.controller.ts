import { Authority, GameParticipantType, TokenScope } from '@klurigo/common'
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  MessageEvent,
  NotFoundException,
  Post,
  Query,
  Sse,
} from '@nestjs/common'
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiExcludeEndpoint,
  ApiExtraModels,
  ApiForbiddenResponse,
  ApiGoneResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
  getSchemaPath,
} from '@nestjs/swagger'
import { SkipThrottle } from '@nestjs/throttler'
import { from, Observable } from 'rxjs'
import { mergeMap } from 'rxjs/operators'

import { NoTimeout } from '../../../app/decorators'
import {
  PrincipalId,
  RequiredAuthorities,
  RequiresScopes,
} from '../../authentication/controllers/decorators'
import { AuthorizedGame } from '../../game-core/decorators/auth'
import { GameEventSubscriber } from '../../game-event/services'
import {
  ParseCorrectAnswerRequestPipe,
  ParseSubmitQuestionAnswerRequestPipe,
} from '../pipes'
import { GameService } from '../services'

import { ApiGameIdParam, ApiPlayerIDParam } from './decorators/api'
import { RouteGameIdParam, RoutePlayerIdParam } from './decorators/params'
import {
  JoinGameRequest,
  MultiChoiceQuestionCorrectAnswerRequest,
  PinQuestionCorrectAnswerRequest,
  PuzzleQuestionCorrectAnswerRequest,
  RangeQuestionCorrectAnswerRequest,
  SubmitMultiChoiceQuestionAnswerRequest,
  SubmitPinQuestionAnswerRequest,
  SubmitPuzzleQuestionAnswerRequest,
  SubmitRangeQuestionAnswerRequest,
  SubmitTrueFalseQuestionAnswerRequest,
  SubmitTypeAnswerQuestionAnswerRequest,
  TrueFalseQuestionCorrectAnswerRequest,
  TypeAnswerQuestionCorrectAnswerRequest,
} from './models/requests'
import { GameParticipantPlayerResponse } from './models/response/game-participant-player.response'

/**
 * GameController handles incoming HTTP requests related to game operations,
 * such as creating games and subscribing to game events.
 *
 * - Uses the `LegacyAuth` decorator to indicate legacy authentication logic is used.
 */
@ApiBearerAuth()
@ApiExtraModels(
  SubmitMultiChoiceQuestionAnswerRequest,
  SubmitRangeQuestionAnswerRequest,
  SubmitTrueFalseQuestionAnswerRequest,
  SubmitTypeAnswerQuestionAnswerRequest,
  SubmitPinQuestionAnswerRequest,
  SubmitPuzzleQuestionAnswerRequest,
  MultiChoiceQuestionCorrectAnswerRequest,
  RangeQuestionCorrectAnswerRequest,
  TrueFalseQuestionCorrectAnswerRequest,
  TypeAnswerQuestionCorrectAnswerRequest,
  PinQuestionCorrectAnswerRequest,
  PuzzleQuestionCorrectAnswerRequest,
)
@ApiTags('game')
@RequiresScopes(TokenScope.Game)
@RequiredAuthorities(Authority.Game)
@Controller('games')
export class GameController {
  /**
   * Initializes a new instance of the GameController class.
   *
   * @param {GameService} gameService - The service responsible for handling game logic.
   * @param {GameEventSubscriber} gameEventSubscriber - The service responsible for managing game event streams.
   */
  constructor(
    private readonly gameService: GameService,
    private readonly gameEventSubscriber: GameEventSubscriber,
  ) {}

  /**
   * Allows a participant to join an existing game as a player.
   *
   * @param participantId - The unique identifier of the authorized participant joining the game.
   * @param gameId - The unique identifier of the game.
   * @param request - The request body containing the player's nickname.
   *
   * @returns A Promise that resolves when the player has successfully joined the game.
   */
  @Post('/:gameID/players')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Join a game',
    description:
      'Allows a participant to join an existing game as a player by providing the game ID. Returns a unique identifier and a token for the participant.',
  })
  @ApiBody({
    description: 'Request body for joining an existing game.',
    type: JoinGameRequest,
  })
  @ApiNoContentResponse({
    description: 'The game has been successfully joined.',
  })
  @ApiBadRequestResponse({
    description:
      'Invalid request, possibly due to malformed game ID or validation error.',
  })
  @ApiForbiddenResponse({
    description: 'Game is full and cannot accept more players.',
  })
  @ApiNotFoundResponse({
    description: 'No game found with the specified unique identifier.',
  })
  @ApiGameIdParam()
  async joinGame(
    @PrincipalId() participantId: string,
    @RouteGameIdParam() gameId: string,
    @Body() request: JoinGameRequest,
  ): Promise<void> {
    return this.gameService.joinGame(gameId, participantId, request.nickname)
  }

  /**
   * Retrieves the current list of player participants for a game.
   *
   * Only host participants are allowed to access this endpoint.
   *
   * @param gameId - The unique identifier of the game.
   * @returns The list of player participants currently associated with the game.
   */
  @Get('/:gameID/players')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Retrieves the current list of players for a game.',
    description:
      'Returns the player participants currently associated with the specified game. Only host participants can access this endpoint.',
  })
  @ApiOkResponse({
    description: 'Successfully retrieved the list of player participants.',
    type: GameParticipantPlayerResponse,
    isArray: true,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized. Missing or invalid access token.',
  })
  @ApiForbiddenResponse({
    description:
      'Forbidden. The authenticated participant is not allowed to access this game or does not have the required role.',
  })
  @ApiNotFoundResponse({
    description: 'No active game found with the specified unique identifier.',
  })
  @AuthorizedGame(GameParticipantType.HOST)
  @ApiGameIdParam()
  public async getPlayers(
    @RouteGameIdParam() gameId: string,
  ): Promise<GameParticipantPlayerResponse[]> {
    return this.gameService.getPlayerParticipants(gameId)
  }

  /**
   * Removes a player from a game.
   *
   * This endpoint allows an authorized participant (player or host) to remove a player from a game.
   * - Players can only remove themselves from a game.
   * - Hosts can remove any player except themselves.
   *
   * @param participantId - The unique identifier of the authorized participant performing the action.
   * @param gameId - The unique identifier of the game.
   * @param playerId - The unique identifier of the player to remove.
   */
  @Delete('/:gameID/players/:playerID')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Remove a player from a game',
    description:
      'Allows an authorized participant to remove a player from a specified game.',
  })
  @ApiNoContentResponse({
    description: 'The player has successfully left the game.',
  })
  @ApiForbiddenResponse({
    description: 'The participant is not allowed to remove the player.',
  })
  @ApiNotFoundResponse({
    description:
      'No game or player found with the specified unique identifier.',
  })
  @AuthorizedGame()
  @ApiGameIdParam()
  @ApiPlayerIDParam()
  async leaveGame(
    @PrincipalId() participantId: string,
    @RouteGameIdParam() gameId: string,
    @RoutePlayerIdParam() playerId: string,
  ): Promise<void> {
    return this.gameService.leaveGame(participantId, gameId, playerId)
  }

  /**
   * Retrieves a Server-Sent Events (SSE) stream of game events for the specified game.
   *
   * The stream includes:
   * - An authoritative initial snapshot event describing the current game state for the participant.
   * - Subsequent real-time updates published by the game event system.
   * - Heartbeat events to keep the connection alive and help clients/proxies detect stale connections.
   *
   * @param participantId - The authenticated participant ID requesting the stream.
   * @param gameId - The ID of the game to subscribe to.
   *
   * @returns An observable SSE stream where each message `data` contains JSON-encoded game event payloads and
   *          the SSE `id` contains the persisted game revision when available.
   */
  @NoTimeout()
  @Sse('/:gameID/events')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Subscribe to game events',
    description:
      'Provides a stream of real-time game events for the specified game ID. Requires an active game subscription and a valid token for access. Events are sent in Server-Sent Events (SSE) format, allowing participants to receive continuous updates.',
  })
  @ApiOkResponse({
    description:
      'Successfully subscribed to game events. Returns a continuous stream of events.',
    content: {
      'text/event-stream': {
        schema: {
          type: 'object',
          properties: {
            data: { type: 'string', description: 'Event data in JSON format' },
          },
        },
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'No active game found with the specified game ID.',
  })
  @ApiGoneResponse({
    description: 'The game has already ended.',
  })
  @ApiBadRequestResponse({
    description: 'Invalid game ID format or missing authorization token.',
  })
  @AuthorizedGame()
  @ApiGameIdParam()
  @SkipThrottle()
  public getEventStream(
    @PrincipalId() participantId: string,
    @RouteGameIdParam() gameId: string,
    @Query('connectionId') connectionId?: string,
  ): Observable<MessageEvent> {
    return from(
      this.gameEventSubscriber.subscribe(gameId, participantId, connectionId),
    ).pipe(mergeMap((stream) => stream))
  }

  @Post('/:gameID/events/interrupt')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiExcludeEndpoint()
  @AuthorizedGame()
  @ApiGameIdParam()
  public interruptEventStream(
    @PrincipalId() participantId: string,
    @RouteGameIdParam() gameId: string,
    @Query('connectionId') connectionId?: string,
  ): void {
    if (process.env.NODE_ENV !== 'test') throw new NotFoundException()
    if (!connectionId)
      throw new BadRequestException('Connection ID is required')

    this.gameEventSubscriber.closeConnection(
      gameId,
      participantId,
      connectionId,
    )
  }

  /**
   * Completes the current active task for the specified game.
   *
   * Requires the caller to be the host and the current task status to be 'active'.
   *
   * @param gameId - The unique identifier of the game.
   *
   * @returns A Promise that resolves when the task is successfully marked as completed.
   */
  @Post('/:gameID/tasks/current/complete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Marks the current task as complete for the active game session.',
    description:
      'This endpoint allows a game host to mark the active task as complete when all players have responded or the task has otherwise been concluded.',
  })
  @ApiNotFoundResponse({
    description: 'No active game found with the specified game ID.',
  })
  @ApiBadRequestResponse({
    description: 'Invalid game ID format or task not in active status.',
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized access or invalid participant role.',
  })
  @AuthorizedGame(GameParticipantType.HOST)
  @ApiGameIdParam()
  public async completeTask(@RouteGameIdParam() gameId: string): Promise<void> {
    await this.gameService.completeCurrentTask(gameId)
  }

  /**
   * Adds a correct answer to the current question result task.
   *
   * Supports multiple correct answers for a single question by appending the provided answer
   * to the list of accepted answers for the current question result.
   * Only allowed when the current task is of type `QuestionResult` and not in an active state.
   *
   * @param gameId - The unique identifier of the game.
   * @param correctAnswerRequest - The correct answer to add. Type must match the question type.
   */
  @Post('/:gameID/tasks/current/correct_answers')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Add a correct answer to the current question result task',
    description:
      'Adds a new correct answer for the current question. Only applicable when the current task is of type "QuestionResult" and in active status. A stale or replaced task is rejected with a client error.',
  })
  @ApiBody({
    description: 'Request body for adding a correct answer.',
    schema: {
      oneOf: [
        { $ref: getSchemaPath(MultiChoiceQuestionCorrectAnswerRequest) },
        { $ref: getSchemaPath(RangeQuestionCorrectAnswerRequest) },
        { $ref: getSchemaPath(TrueFalseQuestionCorrectAnswerRequest) },
        { $ref: getSchemaPath(TypeAnswerQuestionCorrectAnswerRequest) },
        { $ref: getSchemaPath(PinQuestionCorrectAnswerRequest) },
        { $ref: getSchemaPath(PuzzleQuestionCorrectAnswerRequest) },
      ],
    },
  })
  @ApiNotFoundResponse({
    description: 'No active game found with the specified game ID.',
  })
  @ApiBadRequestResponse({
    description:
      'Invalid game ID format or question result task not in active status.',
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized access or invalid participant role.',
  })
  @AuthorizedGame(GameParticipantType.HOST)
  @ApiGameIdParam()
  public async addCorrectAnswer(
    @RouteGameIdParam() gameId: string,
    @Body(new ParseCorrectAnswerRequestPipe())
    correctAnswerRequest:
      | MultiChoiceQuestionCorrectAnswerRequest
      | RangeQuestionCorrectAnswerRequest
      | TrueFalseQuestionCorrectAnswerRequest
      | TypeAnswerQuestionCorrectAnswerRequest
      | PinQuestionCorrectAnswerRequest
      | PuzzleQuestionCorrectAnswerRequest,
  ): Promise<void> {
    return this.gameService.addCorrectAnswer(gameId, correctAnswerRequest)
  }

  /**
   * Deletes a previously added correct answer from the current question result task.
   *
   * This operation removes a matching correct answer entry from the result task's list of correct answers.
   * Only allowed when the current task is of type `QuestionResult` and not in an active state.
   *
   * @param gameId - The unique identifier of the game.
   * @param correctAnswerRequest - The correct answer to delete. Type must match the question type.
   */
  @Delete('/:gameID/tasks/current/correct_answers')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a correct answer from the current question result task',
    description:
      'Deletes an existing correct answer from the current question result task. Only applicable when the current task is of type "QuestionResult" and in active status. A stale or replaced task is rejected with a client error.',
  })
  @ApiBody({
    description: 'Request body for deleting a correct answer.',
    schema: {
      oneOf: [
        { $ref: getSchemaPath(MultiChoiceQuestionCorrectAnswerRequest) },
        { $ref: getSchemaPath(RangeQuestionCorrectAnswerRequest) },
        { $ref: getSchemaPath(TrueFalseQuestionCorrectAnswerRequest) },
        { $ref: getSchemaPath(TypeAnswerQuestionCorrectAnswerRequest) },
        { $ref: getSchemaPath(PinQuestionCorrectAnswerRequest) },
        { $ref: getSchemaPath(PuzzleQuestionCorrectAnswerRequest) },
      ],
    },
  })
  @ApiNotFoundResponse({
    description: 'No active game found with the specified game ID.',
  })
  @ApiBadRequestResponse({
    description:
      'Invalid game ID format or question result task not in active status.',
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized access or invalid participant role.',
  })
  @AuthorizedGame(GameParticipantType.HOST)
  @ApiGameIdParam()
  public async deleteCorrectAnswer(
    @RouteGameIdParam() gameId: string,
    @Body(new ParseCorrectAnswerRequestPipe())
    correctAnswerRequest:
      | MultiChoiceQuestionCorrectAnswerRequest
      | RangeQuestionCorrectAnswerRequest
      | TrueFalseQuestionCorrectAnswerRequest
      | TypeAnswerQuestionCorrectAnswerRequest
      | PinQuestionCorrectAnswerRequest
      | PuzzleQuestionCorrectAnswerRequest,
  ): Promise<void> {
    return this.gameService.deleteCorrectAnswer(gameId, correctAnswerRequest)
  }

  /**
   * Submits an answer for the current question in a game.
   *
   * @param {string} playerId - The unique identifier of the player submitting the answer.
   * @param {string} gameId - The unique identifier of the game where the answer is being submitted.
   * @param {object} submitQuestionAnswerRequest - The request containing the answer details.
   *
   * @returns {Promise<void>} A Promise that resolves when the answer submission is successful.
   */
  @Post('/:gameID/answers')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Submit an answer for the current question',
    description:
      'Allows a player to submit one answer for the current active question in the game. Duplicate, retried, or late submissions are rejected; a duplicate never changes the stored answer or score.',
  })
  @ApiBody({
    description: 'Request body for submitting an answer.',
    schema: {
      oneOf: [
        { $ref: getSchemaPath(SubmitMultiChoiceQuestionAnswerRequest) },
        { $ref: getSchemaPath(SubmitRangeQuestionAnswerRequest) },
        { $ref: getSchemaPath(SubmitTrueFalseQuestionAnswerRequest) },
        { $ref: getSchemaPath(SubmitTypeAnswerQuestionAnswerRequest) },
        { $ref: getSchemaPath(SubmitPinQuestionAnswerRequest) },
        { $ref: getSchemaPath(SubmitPuzzleQuestionAnswerRequest) },
      ],
    },
  })
  @ApiNoContentResponse({
    description:
      'The answer has been successfully submitted. If the response is lost, retrying is safe but the retry is reported as a duplicate.',
  })
  @AuthorizedGame(GameParticipantType.PLAYER)
  @ApiGameIdParam()
  public async submitQuestionAnswer(
    @PrincipalId() playerId: string,
    @RouteGameIdParam() gameId: string,
    @Body(new ParseSubmitQuestionAnswerRequestPipe())
    submitQuestionAnswerRequest:
      | SubmitMultiChoiceQuestionAnswerRequest
      | SubmitRangeQuestionAnswerRequest
      | SubmitTrueFalseQuestionAnswerRequest
      | SubmitTypeAnswerQuestionAnswerRequest
      | SubmitPinQuestionAnswerRequest
      | SubmitPuzzleQuestionAnswerRequest,
  ): Promise<void> {
    return this.gameService.submitQuestionAnswer(
      gameId,
      playerId,
      submitQuestionAnswerRequest,
    )
  }

  /**
   * Ends the active game.
   *
   * Marks the game as terminated.
   *
   * @param gameId - The game ID to end.
   */
  @Post('/:gameID/quit')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Ends the active game.',
    description:
      'Ends an active game and marks it as terminated. Completed, expired, terminated, and repeated quit requests are rejected without another lifecycle event.',
  })
  @ApiNoContentResponse({
    description: 'The game was ended successfully.',
  })
  @ApiNotFoundResponse({
    description: 'No active game found with the specified game ID.',
  })
  @AuthorizedGame(GameParticipantType.HOST)
  @ApiGameIdParam()
  public async quitGame(@RouteGameIdParam() gameId: string): Promise<void> {
    return this.gameService.quitGame(gameId)
  }
}
