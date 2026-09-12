import { Authority, GameTokenDto, TokenScope } from '@klurigo/common'
import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  UnauthorizedException,
} from '@nestjs/common'
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger'

import {
  IpAddress,
  Public,
  UserAgent,
} from '../../authentication/controllers/decorators'
import { AuthResponse } from '../../authentication/controllers/models'
import { TokenService } from '../../token/services'
import { GameAuthenticationService } from '../services'

import { AuthGameRequest } from './models/requests'

/**
 * Controller responsible for authenticating participants into active games.
 *
 * Exposes endpoints for issuing game-scoped access and refresh tokens
 * based on a game ID or game PIN.
 */
@ApiTags('auth')
@Controller('auth')
export class GameAuthenticationController {
  /**
   * Creates a new GameAuthenticationController.
   *
   * @param gameAuthenticationService - Service responsible for game participant authentication.
   * @param tokenService - Service used to verify and validate existing tokens.
   */
  constructor(
    private readonly gameAuthenticationService: GameAuthenticationService,
    private readonly tokenService: TokenService,
  ) {}

  /**
   * Authenticate a client for participation in a specific game by supplying
   * either the game’s UUID or its 6-digit PIN.
   *
   * @param authGameRequest – The request DTO containing **either**
   *   - `gameId` (UUID) to look up the game by its internal ID, **or**
   *   - `gamePIN` (6-digit string) to look up the game by its PIN.
   * @param authorization - Optional Bearer token of an authenticated user.
   * @param ipAddress - The client's IP address, extracted via the `@IpAddress()` decorator.
   * @param userAgent - The client's User-Agent header, extracted via the `@UserAgent()` decorator.
   * @returns A pair of access + refresh tokens scoped to the specified game.
   */
  @Public()
  @Post('/game')
  @ApiOperation({
    summary: 'Game authentication',
    description:
      'Issue access and refresh tokens for participating in a game by providing either its UUID or 6-digit PIN.',
  })
  @ApiBody({
    description:
      'Payload containing either `gameId` (UUID) or `gamePIN` (6-digit string) to identify the game.',
    type: AuthGameRequest,
  })
  @ApiOkResponse({
    type: AuthResponse,
    description: 'Game access and refresh tokens.',
  })
  @ApiBadRequestResponse({ description: 'Invalid game PIN format.' })
  @ApiUnauthorizedResponse({
    description: 'No active game found with that ID or PIN.',
  })
  @HttpCode(HttpStatus.OK)
  public async authenticateGame(
    @Body() authGameRequest: AuthGameRequest,
    @IpAddress() ipAddress: string,
    @UserAgent() userAgent: string,
    @Headers('Authorization') authorization?: string,
  ): Promise<AuthResponse> {
    const identity =
      await this.extractIdentityFromAuthorizationHeader(authorization)

    return this.gameAuthenticationService.authenticateGame(
      authGameRequest,
      ipAddress,
      userAgent,
      identity?.scope === TokenScope.User ? identity.sub : undefined,
      identity?.scope === TokenScope.Game ? identity : undefined,
    )
  }

  /**
   * If present, parses and validates a Bearer user‐token from the Authorization header.
   * Returns the user ID only if it has `TokenScope.User` and includes `Authority.Game`.
   *
   * @param authorization - The raw Authorization header (e.g. "Bearer eyJ...")
   * @returns The user ID to reuse as the game participant, or `undefined`.
   * @throws UnauthorizedException when the token is invalid or expired.
   * @private
   */
  private async extractIdentityFromAuthorizationHeader(
    authorization?: string,
  ): Promise<
    | (Pick<GameTokenDto, 'gameId' | 'sub'> & { scope: TokenScope.Game })
    | { sub: string; scope: TokenScope.User }
    | undefined
  > {
    if (!authorization) {
      return undefined
    }
    const [type, token] = authorization.split(' ') ?? []
    const accessToken = type === 'Bearer' ? token : undefined

    try {
      if (!accessToken) {
        throw new UnauthorizedException('Missing access token')
      }
      const payload = await this.tokenService.verifyToken(accessToken)
      if (payload.scope === TokenScope.User) {
        if (payload.authorities.includes(Authority.Game)) {
          return { scope: TokenScope.User, sub: payload.sub }
        }
      } else if (payload.scope === TokenScope.Game) {
        if (
          !payload.authorities.includes(Authority.Game) ||
          typeof payload.gameId !== 'string' ||
          typeof payload.sub !== 'string'
        ) {
          throw new UnauthorizedException('Invalid game token')
        }

        await this.tokenService.tokenExistsOrThrow(payload.jti)

        return {
          scope: TokenScope.Game,
          gameId: payload.gameId,
          sub: payload.sub,
        }
      }
    } catch {
      throw new UnauthorizedException('Invalid or expired token')
    }
  }
}
