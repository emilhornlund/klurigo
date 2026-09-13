import { Authority, GameTokenDto, TokenDto, TokenScope } from '@klurigo/common'
import type {
  AuthLoginRequestDto,
  AuthRefreshRequestDto,
  AuthResponseDto,
} from '@klurigo/common'
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { MurLock } from 'murlock'

import { TokenService } from '../../token/services'
import { UserService } from '../../user/services'

import { GoogleAuthService } from './google-auth.service'
import { UserLoginEvent } from './models'
import { USER_LOGIN_EVENT_KEY } from './utils'

/**
 * Service responsible for authenticating users and managing authentication workflows.
 *
 * This service delegates JWT signing, verification, and token persistence concerns to TokenService.
 */
@Injectable()
export class AuthService {
  // Logger instance for recording service operations.
  private readonly logger: Logger = new Logger(AuthService.name)

  /**
   * Initializes the AuthService.
   *
   * @param userService - Service for user credential verification.
   * @param tokenService - Service for signing, verifying, and revoking JWTs, and validating token persistence.
   * @param eventEmitter - EventEmitter2 instance for emitting authentication-related events.
   * @param googleAuthService - Service responsible for handling Google OAuth flows.
   */
  constructor(
    private readonly userService: UserService,
    private readonly tokenService: TokenService,
    private readonly eventEmitter: EventEmitter2,
    private readonly googleAuthService: GoogleAuthService,
  ) {}

  /**
   * Authenticates a user by email and password, then issues a new pair of JWTs.
   *
   * @param authLoginRequestDto - DTO containing the user's email and password.
   * @param ipAddress - The client's IP address, used for logging and token metadata.
   * @param userAgent - The client's User-Agent string, used for logging and token metadata.
   *
   * @returns Promise resolving to an AuthResponseDto with access & refresh tokens.
   *
   * @throws BadCredentialsException if credentials are invalid.
   */
  public async login(
    authLoginRequestDto: AuthLoginRequestDto,
    ipAddress: string,
    userAgent: string,
  ): Promise<AuthResponseDto> {
    const { _id: userId } = await this.userService.verifyUserCredentialsOrThrow(
      authLoginRequestDto.email,
      authLoginRequestDto.password,
    )

    const tokenPair = await this.tokenService.signTokenPair(
      userId,
      TokenScope.User,
      ipAddress,
      userAgent,
    )

    await this.emitUserLoginEvent(userId)

    return tokenPair
  }

  /**
   * Performs authentication via Google OAuth.
   *
   * @param code - The OAuth2 authorization code returned by Google after user consent.
   * @param codeVerifier - The PKCE code verifier originally used to generate the code challenge.
   * @param ipAddress - The client's IP address, used for logging and token metadata.
   * @param userAgent - The client's User-Agent string, used for logging and token metadata.
   * @returns A promise resolving to an AuthResponseDto containing the issued tokens.
   */
  public async loginGoogle(
    code: string,
    codeVerifier: string,
    ipAddress: string,
    userAgent: string,
  ): Promise<AuthResponseDto> {
    const accessToken = await this.googleAuthService.exchangeCodeForAccessToken(
      code,
      codeVerifier,
    )

    const profile = await this.googleAuthService.fetchGoogleProfile(accessToken)

    const { _id: userId } =
      await this.userService.verifyOrCreateGoogleUser(profile)

    const tokenPair = await this.tokenService.signTokenPair(
      userId,
      TokenScope.User,
      ipAddress,
      userAgent,
    )

    await this.emitUserLoginEvent(userId)

    return tokenPair
  }

  /**
   * Validates the provided refresh token, consumes its token pair, and issues
   * a new pair of JWTs.
   *
   * @param authRefreshRequestDto - DTO containing the refresh token.
   * @param ipAddress - The client's IP address, used for logging and token metadata.
   * @param userAgent - The client's User-Agent string, used for logging and token metadata.
   * @returns Promise resolving to an AuthResponseDto with fresh tokens.
   * @throws UnauthorizedException if token is invalid or missing REFRESH_AUTH authority.
   */
  @MurLock(5000, 'auth_refresh', 'authRefreshRequestDto.refreshToken')
  public async refresh(
    authRefreshRequestDto: AuthRefreshRequestDto,
    ipAddress: string,
    userAgent: string,
  ): Promise<AuthResponseDto> {
    let payload: TokenDto

    try {
      payload = await this.tokenService.verifyToken(
        authRefreshRequestDto.refreshToken,
      )
    } catch (error) {
      const { message, stack } = error as Error
      this.logger.debug(`Failed to verify refresh token: '${message}'.`, stack)
      throw new UnauthorizedException()
    }

    try {
      await this.tokenService.tokenExistsOrThrow(payload.jti)
    } catch (error) {
      const { message, stack } = error as Error
      this.logger.debug(
        `Unable to retrieve existing refresh token: '${message}'.`,
        stack,
      )
      throw new UnauthorizedException()
    }

    if (!payload.authorities.includes(Authority.RefreshAuth)) {
      this.logger.debug(
        `Failed to refresh token since missing '${Authority.RefreshAuth}' authority.`,
      )
      throw new UnauthorizedException()
    }

    let additionalClaims = {}

    if (payload.scope === TokenScope.Game) {
      const { gameId, participantType } = payload as GameTokenDto
      additionalClaims = { gameId, participantType }
    }

    this.logger.debug(`Refreshing token with userId '${payload.sub}'.`)
    const tokenPair = await this.tokenService.signTokenPair(
      payload.sub,
      payload.scope,
      ipAddress,
      userAgent,
      additionalClaims,
    )

    await this.tokenService.revoke(authRefreshRequestDto.refreshToken)

    if (payload.scope === TokenScope.User) {
      await this.emitUserLoginEvent(payload.sub)
    }

    return tokenPair
  }

  /**
   * Emits a UserLoginEvent to notify subscribers that a user has logged in.
   *
   * @param userId - The unique identifier of the user whose login event is emitted.
   * @returns A Promise that resolves once the event has been emitted (errors are caught and logged).
   * @private
   */
  private async emitUserLoginEvent(userId: string): Promise<void> {
    const event: UserLoginEvent = { userId, date: new Date() }
    try {
      this.eventEmitter.emit(USER_LOGIN_EVENT_KEY, event)
    } catch (error) {
      const { message, stack } = error as Error
      this.logger.error(
        `Failed to emit user login event for userId '${userId}': '${message}.'`,
        stack,
      )
    }
  }
}
