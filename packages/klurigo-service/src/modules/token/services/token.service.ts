import {
  Authority,
  AuthResponseDto,
  TokenDto,
  TokenScope,
  TokenType,
} from '@klurigo/common'
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import ms from 'ms'
import { v4 as uuidv4 } from 'uuid'

import { TokenRepository } from '../repositories'

import { getTokenAuthorities, getTokenExpiresIn } from './utils/token.utils'

/**
 * Service responsible for JWT operations and token persistence.
 *
 * Responsibilities:
 * - Sign access/refresh token pairs with the correct authorities and expiration.
 * - Persist token metadata for revocation and refresh validation.
 * - Verify incoming JWTs and expose a consistent UnauthorizedException on failure.
 * - Revoke tokens by deleting both tokens in a pair (access + refresh).
 */
@Injectable()
export class TokenService {
  // Logger instance for recording service operations.
  private readonly logger: Logger = new Logger(TokenService.name)

  /**
   * Initializes the TokenService.
   *
   * @param tokenRepository - Repository for persisting and retrieving token metadata.
   * @param jwtService - Service for generating and verifying JWT tokens.
   */
  constructor(
    private readonly tokenRepository: TokenRepository,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Generates a new access token (15m) and refresh token (30d) for the given user.
   *
   * @param subject - The subject (user ID) for whom to sign the tokens.
   * @param scope - The broad area of the API this token grants access to (e.g. Game, User).
   * @param ipAddress - The client's IP address to record in the token metadata.
   * @param userAgent - The client's User-Agent string to record in the token metadata.
   * @param additionalClaims - Extra payload (e.g. gameId, participantType).
   * @returns Promise resolving to AuthResponseDto with both tokens.
   */
  public async signTokenPair(
    subject: string,
    scope: TokenScope,
    ipAddress: string,
    userAgent: string,
    additionalClaims?: Record<string, unknown>,
  ): Promise<AuthResponseDto> {
    const pairId = uuidv4()

    const accessToken = await this.signToken(
      pairId,
      subject,
      scope,
      false,
      ipAddress,
      userAgent,
      additionalClaims,
    )

    const refreshToken = await this.signToken(
      pairId,
      subject,
      scope,
      true,
      ipAddress,
      userAgent,
      additionalClaims,
    )
    return { accessToken, refreshToken }
  }

  /**
   * Signs a JWT for the specified scope and token type.
   *
   * @param pairId - Unique identifier linking an access token and its refresh token.
   * @param subject - The JWT “sub” claim, typically a user ID or game participant ID.
   * @param scope - The broad area of the API this token grants access to (e.g. Game, User).
   * @param isRefreshToken - If true, issues a refresh token (long-lived); otherwise an access token (short-lived).
   * @param ipAddress  - The client's IP address to record in the token metadata.
   * @param userAgent  - The client's User-Agent string to record in the token metadata.
   * @param additionalClaims - Extra JWT payload.
   * @returns A promise resolving to the signed JWT string.
   * @private
   */
  private async signToken(
    pairId: string,
    subject: string,
    scope: TokenScope,
    isRefreshToken: boolean,
    ipAddress: string,
    userAgent: string,
    additionalClaims?: Record<string, unknown>,
  ): Promise<string> {
    const authorities = getTokenAuthorities(scope, isRefreshToken)
    const expiresIn = getTokenExpiresIn(isRefreshToken)

    const jwtId = uuidv4()

    const token = await this.jwtService.signAsync(
      {
        scope,
        authorities,
        ...(additionalClaims || {}),
      },
      {
        jwtid: jwtId,
        subject,
        expiresIn,
      },
    )

    await this.tokenRepository.createToken({
      _id: jwtId,
      pairId,
      type: isRefreshToken ? TokenType.Refresh : TokenType.Access,
      scope,
      principalId: subject,
      ipAddress,
      userAgent,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + ms(expiresIn)),
    })

    return token
  }

  /**
   * Signs a JWT token for email verification.
   *
   * Generates a token with the `VERIFY_EMAIL` authority that expires in 72 hours.
   *
   * @param userId – The user ID (JWT `sub` claim) for whom the token is issued.
   * @param email  – The email address to include in the token payload.
   * @returns A promise that resolves to the signed verification token string.
   */
  public async signVerifyEmailToken(
    userId: string,
    email: string,
  ): Promise<string> {
    return this.jwtService.signAsync(
      {
        scope: TokenScope.User,
        authorities: [Authority.VerifyEmail],
        email,
      },
      {
        jwtid: uuidv4(),
        subject: userId,
        expiresIn: '72h',
      },
    )
  }

  /**
   * Signs a JWT token for password reset.
   *
   * Generates a token with the `RESET_PASSWORD` authority that expires in 1 hour.
   * The token is persisted so it can be validated and consumed on use.
   *
   * @param userId – The user ID (JWT `sub` claim) for whom the token is issued.
   * @returns A promise that resolves to the signed password reset token string.
   */
  public async signPasswordResetToken(userId: string): Promise<string> {
    const jwtId = uuidv4()

    const token = await this.jwtService.signAsync(
      {
        scope: TokenScope.User,
        authorities: [Authority.ResetPassword],
      },
      {
        jwtid: jwtId,
        subject: userId,
        expiresIn: '1h',
      },
    )

    await this.tokenRepository.createToken({
      _id: jwtId,
      pairId: jwtId,
      type: TokenType.PasswordReset,
      scope: TokenScope.User,
      principalId: userId,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + ms('1h')),
    })

    return token
  }

  /**
   * Consumes a password reset token by deleting it from persistence.
   *
   * Should be called after a successful password reset to prevent token reuse.
   *
   * @param jti – The JWT ID of the password reset token to consume.
   * @returns A promise that resolves when the token has been deleted.
   */
  public async consumePasswordResetToken(jti: string): Promise<void> {
    await this.tokenRepository.deleteTokensByPairId(jti)
  }

  /**
   * Verifies a JWT token and returns the decoded payload.
   *
   * @param {string} token - The JWT token to be verified.
   *
   * @returns {Promise<TokenDto>} A Promise that resolves to the decoded payload as a `TokenDto`.
   *
   * @throws {UnauthorizedException} If the token is invalid or verification fails.
   */
  public async verifyToken(token: string): Promise<TokenDto> {
    try {
      return await this.jwtService.verifyAsync<TokenDto>(token)
    } catch {
      throw new UnauthorizedException()
    }
  }

  /**
   * Ensures a token with the given JWT ID (jti) exists in persistence.
   *
   * Used to validate refresh tokens that must still be present (i.e., not revoked).
   *
   * @param jti - The JWT ID (`jti`) to validate.
   * @returns A promise that resolves if the token exists; otherwise throws UnauthorizedException.
   */
  public async tokenExistsOrThrow(jti: string): Promise<void> {
    try {
      await this.tokenRepository.findTokenByIdOrThrow(jti)
    } catch (error) {
      const { message, stack } = error as Error
      this.logger.debug(
        `Unable to retrieve existing token: '${message}'.`,
        stack,
      )
      throw new UnauthorizedException()
    }
  }

  /**
   * Revokes the specified JWT token.
   *
   * @param token - The JWT string that should be invalidated.
   * @returns A promise that resolves when the token has been revoked.
   * @throws If token persistence cannot be updated.
   */
  public async revoke(token: string): Promise<void> {
    try {
      const { jti } = this.jwtService.decode<TokenDto>(token)

      const document = await this.tokenRepository.findTokenById(jti)
      if (document) {
        await this.tokenRepository.deleteTokensByPairId(document.pairId)
      }
    } catch (error) {
      const { message, stack } = error as Error
      this.logger.debug(`Failed to revoke token: '${message}'.`, stack)
      throw error
    }
  }
}
