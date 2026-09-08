import { Authority, GameTokenDto, TokenDto, TokenScope } from '@klurigo/common'
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import * as Sentry from '@sentry/nestjs'
import type { Request } from 'express'

import {
  AuthGuardRequest,
  IS_PUBLIC_KEY,
  REQUIRED_AUTHORITIES_KEY,
  REQUIRED_SCOPES_KEY,
} from '../../../app/shared/auth'
import { TokenService } from '../../token/services'
import { User, UserRepository } from '../../user/repositories'

/**
 * Guard that enforces JWT‐based authentication and authorization.
 *
 * - Skips auth for routes marked `@Public()`.
 * - Extracts & validates a Bearer JWT.
 * - Reads `{ sub, scope, authorities }` from token.
 * - Verifies route‐level `@RequiresScopes()` and `@RequiresAuthorities()`.
 * - Attaches to the request:
 *    - `scope: TokenScope`
 *    - `authorities: Authority[]`
 *    - `userId` (if scope is User or Game)
 *
 * The incoming `Request` is assumed to be an `AuthGuardRequest`.
 *
 * @throws {UnauthorizedException} if missing/invalid token.
 * @throws {ForbiddenException} if the token’s scope or authorities don’t match
 *         the route’s requirements.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  /**
   * Initializes the AuthGuard.
   *
   * @param reflector - Used to retrieve metadata such as the `IS_PUBLIC_KEY` to determine if the route is public.
   * @param tokenService - Service for verifying and decoding JWTs used for API authentication.
   * @param userRepository - Repository for accessing user data.
   */
  constructor(
    private readonly reflector: Reflector,
    private readonly tokenService: TokenService,
    private readonly userRepository: UserRepository,
  ) {}

  /**
   * Determines whether a request is allowed to proceed.
   *
   * Steps:
   * 1. If `@Public()` metadata is present, allow immediately.
   * 2. Extract and verify the Bearer token.
   * 3. Check that `scope` from token is allowed for this handler.
   * 4. Check that `authorities` from token include any required authorities.
   * 5. Attach `scope` and `authorities` to `request`.
   * 6. If `scope` is `User` or `Game`, attach `request.userId = sub`.
   *
   * @param context  The current request execution context.
   * @returns `true` if all checks pass.
   * @throws {UnauthorizedException} if authentication fails.
   * @throws {ForbiddenException} if authorization fails.
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (isPublic) {
      return true
    }

    const request = context
      .switchToHttp()
      .getRequest<AuthGuardRequest<TokenDto, User>>()
    const payload = await this.verifyTokenOrThrow(request)
    request.payload = payload
    const { sub, scope, authorities } = payload

    this.verifyAuthorizedScopesOrThrows(scope, context)
    this.verifyAuthorizedAuthoritiesOrThrows(authorities, context)

    if (authorities.includes(Authority.ResetPassword)) {
      try {
        await this.tokenService.tokenExistsOrThrow(payload.jti)
      } catch {
        throw new UnauthorizedException()
      }
    }

    if (scope === TokenScope.User) {
      try {
        request.user = await this.userRepository.findUserByIdOrThrow(sub)
        const {
          _id: id,
          email,
          defaultNickname: username,
          authProvider,
        } = request.user
        Sentry.setUser({ id, email, username })
        Sentry.setContext('auth', { provider: authProvider })
      } catch {
        throw new UnauthorizedException()
      }
    }

    if (scope === TokenScope.Game) {
      const { gameId, participantType } = payload as GameTokenDto

      if (!gameId || !participantType) {
        throw new UnauthorizedException('No gameId or participantType in token')
      }

      Sentry.setContext('game', { gameId, participantId: sub, participantType })
    }

    return true
  }

  /**
   * Ensures that the token’s authorities meet any `@RequiresAuthorities(...)` metadata.
   *
   * @param authorities  The list from the decoded token.
   * @param context      The execution context (to read metadata).
   * @throws {UnauthorizedException} if the token did not include any authorities.
   * @throws {ForbiddenException}    if the token is missing any required authority.
   * @private
   */
  private verifyAuthorizedAuthoritiesOrThrows(
    authorities: Authority[],
    context: ExecutionContext,
  ): void {
    if (!authorities) {
      throw new UnauthorizedException('No authorities in token')
    }

    const required = this.reflector.getAllAndMerge<Authority[]>(
      REQUIRED_AUTHORITIES_KEY,
      [context.getHandler(), context.getClass()],
    )

    if (required?.length && !required.every((r) => authorities.includes(r))) {
      throw new ForbiddenException('Insufficient authorities')
    }
  }

  /**
   * Ensures that the token’s scope meets any `@RequiresScopes(...)` metadata.
   *
   * @param scope    The scope from the decoded token.
   * @param context  The execution context (to read metadata).
   * @throws {UnauthorizedException} if no scope is present.
   * @throws {ForbiddenException}    if the token’s scope is not one of the required scopes.
   * @private
   */
  private verifyAuthorizedScopesOrThrows(
    scope: TokenScope,
    context: ExecutionContext,
  ): void {
    if (!scope) {
      throw new UnauthorizedException('No scope in token')
    }

    const required = this.reflector.getAllAndMerge<TokenScope[]>(
      REQUIRED_SCOPES_KEY,
      [context.getHandler(), context.getClass()],
    )

    if (required?.length && !required.includes(scope)) {
      throw new ForbiddenException(`Scope '${scope}' not allowed`)
    }
  }

  /**
   * Extracts and verifies the JWT from the request.
   *
   * @param request  The incoming HTTP request.
   * @returns The decoded TokenDto.
   * @throws {UnauthorizedException} if the token is missing or invalid.
   * @private
   */
  private async verifyTokenOrThrow(request: Request): Promise<TokenDto> {
    const token = this.extractTokenFromHeader(request)
    if (!token) {
      throw new UnauthorizedException('Missing Authorization header')
    }

    try {
      return await this.tokenService.verifyToken(token)
    } catch {
      throw new UnauthorizedException('Invalid or expired token')
    }
  }

  /**
   * Pulls the Bearer token out of the `Authorization` header.
   *
   * @param request  The incoming HTTP request.
   * @returns The raw token string, or `undefined` if not present or malformed.
   * @private
   */
  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? []
    return type === 'Bearer' ? token : undefined
  }
}
