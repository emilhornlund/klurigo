import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
} from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiBody,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger'

import {
  ApiBadRequestErrorResponse as ApiBadRequestResponse,
  ApiForbiddenErrorResponse as ApiForbiddenResponse,
  ApiUnauthorizedErrorResponse as ApiUnauthorizedResponse,
} from '../../../app/decorators'
import { TokenService } from '../../token/services'
import { UserService } from '../../user/services'
import { AuthService } from '../services'

import { IpAddress, PrincipalId, Public, UserAgent } from './decorators'
import {
  AuthGoogleExchangeRequest,
  AuthLoginRequest,
  AuthPasswordChangeRequest,
  AuthRefreshRequest,
  AuthResponse,
  AuthRevokeRequest,
} from './models'

/**
 * Controller for managing authentication.
 */
@ApiTags('auth')
@Controller('auth')
export class AuthController {
  /**
   * Initializes the AuthController.
   *
   * @param authService - Service handling authentication flows such as login, refresh, and game authentication.
   * @param tokenService - Service responsible for token verification and token revocation.
   * @param userService - Service providing user profile and account operations used by auth endpoints.
   */
  constructor(
    private readonly authService: AuthService,
    private readonly tokenService: TokenService,
    private readonly userService: UserService,
  ) {}

  /**
   * Authenticates a user by verifying their email and password,
   * then issues a new access token and refresh token.
   *
   * @param authLoginRequest - Request containing the user's email and password.
   * @param ipAddress - The client's IP address, extracted via the `@IpAddress()` decorator.
   * @param userAgent - The client's User-Agent header, extracted via the `@UserAgent()` decorator.
   * @returns Promise resolving to an AuthResponse with both tokens.
   */
  @Public()
  @Post('/login')
  @ApiOperation({
    summary: 'Authenticate with email and password',
    description:
      'Verifies user credentials and issues a new access token and refresh token.',
  })
  @ApiBody({
    description: 'Payload containing the user’s email and password.',
    type: AuthLoginRequest,
  })
  @ApiOkResponse({
    description: 'Returns the issued access and refresh tokens.',
    type: AuthResponse,
  })
  @ApiBadRequestResponse({
    description: 'Validation failed or credentials are incorrect.',
  })
  @HttpCode(HttpStatus.OK)
  public async login(
    @Body() authLoginRequest: AuthLoginRequest,
    @IpAddress() ipAddress: string,
    @UserAgent() userAgent: string,
  ): Promise<AuthResponse> {
    return this.authService.login(authLoginRequest, ipAddress, userAgent)
  }

  /**
   * Exchanges a Google OAuth authorization code and PKCE verifier
   * for an authentication response containing access and refresh tokens.
   *
   * @param request   - Request containing the Google OAuth `code` and `codeVerifier`.
   * @param ipAddress - The client's IP address, extracted via the `@IpAddress()` decorator.
   * @param userAgent - The client's User-Agent header, extracted via the `@UserAgent()` decorator.
   * @returns Promise resolving to an AuthResponse with both tokens.
   */
  @Public()
  @Post('/google/exchange')
  @ApiOperation({
    summary: 'Exchange a Google authorization code',
    description:
      'Exchanges a Google OAuth authorization code and PKCE verifier for access and refresh tokens.',
  })
  @ApiBody({
    description:
      'Request payload with Google OAuth authorization code and PKCE code verifier.',
    type: AuthGoogleExchangeRequest,
  })
  @ApiOkResponse({
    description:
      'Successfully exchanged code; returns access and refresh tokens.',
    type: AuthResponse,
  })
  @ApiBadRequestResponse({
    description: 'Invalid code, code verifier, or PKCE validation failed.',
  })
  @HttpCode(HttpStatus.OK)
  public async googleCodeExchange(
    @Body() request: AuthGoogleExchangeRequest,
    @IpAddress() ipAddress: string,
    @UserAgent() userAgent: string,
  ): Promise<AuthResponse> {
    return this.authService.loginGoogle(
      request.code,
      request.codeVerifier,
      ipAddress,
      userAgent,
    )
  }

  /**
   * Validates the provided refresh token and issues a new access token
   * (and rotates the refresh token if applicable).
   *
   * @param authRefreshRequest - Request containing the existing refresh token.
   * @param ipAddress - The client's IP address, extracted via the `@IpAddress()` decorator.
   * @param userAgent - The client's User-Agent header, extracted via the `@UserAgent()` decorator.
   * @returns Promise resolving to an AuthResponse with new tokens.
   */
  @Public()
  @Post('/refresh')
  @ApiOperation({
    summary: 'Refresh access token using a refresh token',
    description:
      'Validates the provided refresh token, invalidates its token pair, and issues a new access and refresh token pair.',
  })
  @ApiBody({
    description: 'Payload containing the existing refresh token.',
    type: AuthRefreshRequest,
  })
  @ApiOkResponse({
    description: 'Returns a new access token and refresh token pair.',
    type: AuthResponse,
  })
  @ApiBadRequestResponse({
    description: 'Validation failed.',
  })
  @ApiUnauthorizedResponse({
    description: 'Refresh token is invalid/expired.',
  })
  @HttpCode(HttpStatus.OK)
  public async refresh(
    @Body() authRefreshRequest: AuthRefreshRequest,
    @IpAddress() ipAddress: string,
    @UserAgent() userAgent: string,
  ): Promise<AuthResponse> {
    return this.authService.refresh(authRefreshRequest, ipAddress, userAgent)
  }

  /**
   * Revokes the specified JWT token, invalidating it for future use.
   *
   * @param authRevokeRequest - Request containing the JWT token to revoke.
   * @returns A promise that resolves when the token has been successfully revoked.
   */
  @Public()
  @Post('/revoke')
  @ApiOperation({
    summary: 'Revoke a JWT token',
    description:
      'Invalidates the provided JWT so it can no longer be used for authentication.',
  })
  @ApiBody({
    description: 'Payload containing the JWT to revoke.',
    type: AuthRevokeRequest,
  })
  @ApiNoContentResponse({
    description: 'Token successfully revoked.',
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  public async revoke(
    @Body() authRevokeRequest: AuthRevokeRequest,
  ): Promise<void> {
    return this.tokenService.revoke(authRevokeRequest.token)
  }

  /**
   * Change the authenticated user’s password.
   *
   * Allows a user to update their password by providing their current password
   * for verification and a new password to apply. Returns no content on success.
   *
   * @param authPasswordChangeRequest - DTO containing `oldPassword` and `newPassword`.
   * @param principalId - The UUID of the user whose password will be changed.
   * @returns A promise that resolves when the password has been successfully updated.
   * @throws BadRequestException if the provided old password does not match the stored password.
   * @throws UnauthorizedException if the request lacks valid authentication.
   * @throws ForbiddenException if the user is not a local account.
   */
  @Patch('/password')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Change authenticated user’s password',
    description:
      'Endpoint for authenticated users to change their password by supplying their current password for verification and a new desired password.',
  })
  @ApiBody({
    description: 'Payload containing the current and new passwords.',
    type: AuthPasswordChangeRequest,
  })
  @ApiNoContentResponse({
    description: 'Password changed successfully.',
  })
  @ApiBadRequestResponse({
    description:
      'Old password incorrect or user account not eligible for password change.',
  })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse({
    description: 'Non-local accounts cannot change password.',
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  public async changePassword(
    @Body() authPasswordChangeRequest: AuthPasswordChangeRequest,
    @PrincipalId() principalId: string,
  ): Promise<void> {
    return this.userService.changePassword(
      principalId,
      authPasswordChangeRequest.oldPassword,
      authPasswordChangeRequest.newPassword,
    )
  }
}
