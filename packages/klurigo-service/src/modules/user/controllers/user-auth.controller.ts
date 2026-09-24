import type { TokenDto } from '@klurigo/common'
import { Authority, TokenScope } from '@klurigo/common'
import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  UnauthorizedException,
} from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiBody,
  ApiNoContentResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'

import {
  ApiBadRequestErrorResponse as ApiBadRequestResponse,
  ApiForbiddenErrorResponse as ApiForbiddenResponse,
  ApiTooManyRequestsErrorResponse,
  ApiUnauthorizedErrorResponse as ApiUnauthorizedResponse,
} from '../../../app/decorators'
import {
  JwtPayload,
  PrincipalId,
  Public,
  RequiredAuthorities,
  RequiresScopes,
} from '../../authentication/controllers/decorators'
import { UserService } from '../services'

import { AuthPasswordForgotRequest, AuthPasswordResetRequest } from './models'

/**
 * Controller for email verification and other user-auth endpoints.
 */
@ApiTags('auth')
@Controller('auth')
export class UserAuthController {
  /**
   * Initializes the UserAuthController.
   *
   * @param userService Service for user operations.
   */
  constructor(private readonly userService: UserService) {}

  /**
   * Verifies a user's email address using a signed JWT.
   *
   * Checks that the `email` claim on the payload matches the user's
   * `unverifiedEmail` and, if so, marks it as verified.
   *
   * @param payload - JWT payload containing `sub` (userId) and `email` claim.
   * @returns A promise that resolves with no content on success.
   */
  @Post('/email/verify')
  @RequiresScopes(TokenScope.User)
  @RequiredAuthorities(Authority.VerifyEmail)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Verify user email',
    description:
      'Consume a signed email-verification token and mark the user’s email as verified.',
  })
  @ApiNoContentResponse({
    description: 'Email successfully verified; no content returned.',
  })
  @ApiBadRequestResponse({
    description:
      'The provided email does not match the user’s pending unverified email.',
  })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse({
    description: 'Authenticated user lacks the VerifyEmail authority.',
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  public async verifyEmail(@JwtPayload() payload: TokenDto): Promise<void> {
    if (!payload.email || !(typeof payload.email === 'string')) {
      throw new UnauthorizedException('Unauthorized')
    }
    return this.userService.verifyEmail(payload.sub, payload.email)
  }

  /**
   * Resends the verification email to the authenticated user’s unverified email address.
   *
   * Applies:
   * - `@RequiresScopes(TokenScope.User)` to enforce the user scope.
   * - `@RequiredAuthorities(Authority.User)` to ensure the user has the proper authority.
   *
   * @param userId - The unique identifier of the authenticated user requesting the resend.
   * @returns void upon successful dispatch of the verification email.
   */
  @Post('/email/resend_verification')
  @ApiBearerAuth()
  @RequiresScopes(TokenScope.User)
  @RequiredAuthorities(Authority.User)
  @ApiOperation({
    summary: 'Resend email verification',
    description:
      'Sends a new email verification link to the user’s unverified email address.',
  })
  @ApiNoContentResponse({
    description:
      'No content returned when the verification email is sent successfully.',
  })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse({
    description:
      'User does not have sufficient authority to perform this operation.',
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  public async resendEmailVerification(
    @PrincipalId() userId: string,
  ): Promise<void> {
    return this.userService.resendVerificationEmail(userId)
  }

  /**
   * Initiates a forgot-password flow by sending a reset link to the user's email.
   *
   * @param authPasswordForgotRequest – DTO containing the user’s email.
   * @returns A promise that resolves when the password reset email has been sent.
   */
  @Public()
  @Post('/password/forgot')
  @Throttle({
    short: { limit: 1, ttl: 1000 }, // 1 request per 1 000 ms (burst control)
    medium: { limit: 5, ttl: 1000 * 60 }, // 5 requests per 60 000 ms (human retries)
    long: { limit: 10, ttl: 1000 * 60 * 60 * 24 }, // 10 requests per 86 400 000 ms (per IP per day)
  })
  @ApiOperation({
    summary: 'Request a password reset',
    description: 'Sends a password reset link to the user’s email address.',
  })
  @ApiBody({
    description: 'Password forgot request payload',
    type: AuthPasswordForgotRequest,
  })
  @ApiNoContentResponse({
    description:
      'No content returned when the password reset email is sent successfully.',
  })
  @ApiTooManyRequestsErrorResponse()
  @HttpCode(HttpStatus.NO_CONTENT)
  public async resetPassword(
    @Body() authPasswordForgotRequest: AuthPasswordForgotRequest,
  ): Promise<void> {
    return this.userService.sendPasswordResetEmail(
      authPasswordForgotRequest.email,
    )
  }

  /**
   * Completes the password-reset flow for an authenticated user.
   *
   * @param userId - The unique identifier of the user to reset the password for.
   * @param payload – The decoded JWT payload; its `jti` is consumed after a successful reset.
   * @param authPasswordResetRequest – DTO containing the user’s new password.
   * @returns A promise that resolves when the password has been reset.
   */
  @Patch('/password/reset')
  @ApiBearerAuth()
  @RequiresScopes(TokenScope.User)
  @RequiredAuthorities(Authority.ResetPassword)
  @ApiOperation({
    summary: 'Reset authenticated user’s password',
    description: `\`Authorization: Scope(${TokenScope.User}), Authorities(${Authority.ResetPassword})\`\n\nResets the password for the authenticated user.`,
  })
  @ApiBody({
    description: 'Password reset request payload',
    type: AuthPasswordResetRequest,
  })
  @ApiNoContentResponse({
    description: 'No content returned when the password is reset.',
  })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse({
    description:
      'User does not have sufficient authority to perform this operation.',
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  public async setPassword(
    @PrincipalId() userId: string,
    @JwtPayload() payload: TokenDto,
    @Body() authPasswordResetRequest: AuthPasswordResetRequest,
  ): Promise<void> {
    return this.userService.setPassword(
      userId,
      authPasswordResetRequest.password,
      payload.jti,
    )
  }
}
