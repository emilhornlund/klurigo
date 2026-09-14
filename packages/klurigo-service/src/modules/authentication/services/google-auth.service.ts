import { HttpService } from '@nestjs/axios'
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { firstValueFrom } from 'rxjs'

import { EnvironmentVariables } from '../../../app/config'

import { GoogleExchangeDto, GoogleProfileDto } from './models'

/**
 * Service for performing Google OAuth operations, including exchanging
 * authorization codes for access tokens and retrieving user profile data.
 */
@Injectable()
export class GoogleAuthService {
  // Logger instance for recording service operations.
  private readonly logger: Logger = new Logger(GoogleAuthService.name)

  /**
   * Initializes the GoogleAuthService.
   *
   * @param http - HttpService used to make HTTP requests to Google’s OAuth endpoints.
   * @param configService - Service to access environment variables.
   */
  constructor(
    private readonly http: HttpService,
    private readonly configService: ConfigService<EnvironmentVariables>,
  ) {}

  /**
   * Exchanges a Google OAuth authorization code and PKCE verifier for an access token.
   *
   * @param code - The authorization code received from Google after user consent.
   * @param codeVerifier - The PKCE code verifier that matches the initial code challenge.
   * @returns A promise resolving to the OAuth2 access token as a string.
   */
  public async exchangeCodeForAccessToken(
    code: string,
    codeVerifier: string,
  ): Promise<string> {
    const params = new URLSearchParams()
    params.append('code', code)
    params.append('code_verifier', codeVerifier)
    const clientId = this.configService.get('GOOGLE_CLIENT_ID')
    const clientSecret = this.configService.get('GOOGLE_CLIENT_SECRET')
    const redirectUri = this.configService.get('GOOGLE_REDIRECT_URI')

    if (!clientId || !clientSecret || !redirectUri) {
      throw new Error('Missing required Google OAuth configuration')
    }

    params.append('client_id', clientId)
    params.append('client_secret', clientSecret)
    params.append('redirect_uri', redirectUri)
    params.append('grant_type', 'authorization_code')

    try {
      const { data } = await firstValueFrom(
        this.http.post<GoogleExchangeDto>(
          'https://oauth2.googleapis.com/token',
          params,
          {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          },
        ),
      )
      return data.access_token
    } catch (error) {
      const { message, stack } = error as Error
      this.logger.warn(
        `Failed to exchange code for access token: '${message}'.`,
        stack,
      )
      throw new UnauthorizedException(
        'Invalid authorization code or PKCE verifier.',
      )
    }
  }

  /**
   * Retrieves the authenticated user’s profile from Google’s UserInfo endpoint.
   *
   * @param accessToken - The OAuth2 access token used to authorize the request.
   * @returns A promise resolving to the user’s GoogleProfileResponse.
   */
  public async fetchGoogleProfile(
    accessToken: string,
  ): Promise<GoogleProfileDto> {
    try {
      const response = await firstValueFrom(
        this.http.get<GoogleProfileDto>(
          'https://www.googleapis.com/oauth2/v2/userinfo',
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          },
        ),
      )
      return response.data
    } catch (error) {
      const { message, stack } = error as Error
      this.logger.warn(
        `Failed to fetch Google user profile: '${message}'.`,
        stack,
      )
      throw new UnauthorizedException('Access token is invalid or has expired.')
    }
  }
}
