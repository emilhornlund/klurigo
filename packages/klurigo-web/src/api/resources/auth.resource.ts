import type {
  AuthGameRequestDto,
  AuthGoogleExchangeRequestDto,
  AuthLoginRequestDto,
  AuthPasswordChangeRequestDto,
  AuthPasswordForgotRequestDto,
  AuthPasswordResetRequestDto,
  AuthRefreshRequestDto,
  AuthResponseDto,
  AuthRevokeRequestDto,
  CreateUserRequestDto,
  CreateUserResponseDto,
  UpdateGoogleUserProfileRequestDto,
  UpdateLocalUserProfileRequestDto,
  UserProfileResponseDto,
} from '@klurigo/common'
import { TokenScope } from '@klurigo/common'

import type { ApiClientCore } from '../api-client-core'

/**
 * Side-effect hooks used by `createAuthResource`.
 *
 * The auth resource is intentionally stateless and delegates state mutation and UI feedback
 * to these injected callbacks.
 */
export type AuthResourceDeps = {
  /**
   * Persists the latest access/refresh token pair for the provided scope.
   */
  setTokenPair: (
    scope: TokenScope,
    accessToken: string,
    refreshToken: string,
  ) => void

  /**
   * Fetches and hydrates the current user profile based on a valid access token.
   */
  fetchCurrentUser: (accessToken: string) => Promise<void>

  /**
   * Clears any locally stored current-user state (typically on revoke/logout).
   */
  clearCurrentUser: () => void

  /**
   * Emits a success notification to the user.
   *
   * Use this for positive confirmation when an operation completed as expected.
   *
   * @param message - The user-facing message to display.
   */
  notifySuccess: (message: string) => void

  /**
   * Emits an error notification to the user.
   *
   * Use this when an operation fails and the user should be informed.
   *
   * @param message - The user-facing message to display.
   */
  notifyError: (message: string) => void
}

/**
 * Auth and profile API wrapper.
 *
 * This module groups auth-related HTTP calls and keeps side effects explicit via `AuthResourceDeps`.
 * Token persistence and user hydration are performed by injected callbacks rather than hidden
 * inside the API core.
 *
 * @param api - Shared API client core used for request execution.
 * @param deps - Side-effect callbacks for token persistence, user hydration, and user notifications.
 * @returns An object containing auth and profile API functions.
 */
export const createAuthResource = (
  api: ApiClientCore,
  deps: AuthResourceDeps,
) => {
  /**
   * Sends a login request to the API and stores the returned authentication tokens.
   *
   * @param request - The login credentials containing email and password.
   * @returns A promise that resolves to the login response with access and refresh tokens.
   */
  const login = (request: AuthLoginRequestDto): Promise<AuthResponseDto> =>
    api
      .apiPost<AuthResponseDto>('/auth/login', {
        email: request.email,
        password: request.password,
      })
      .then(async (res) => {
        deps.setTokenPair(TokenScope.User, res.accessToken, res.refreshToken)
        await deps.fetchCurrentUser(res.accessToken)
        return res
      })
      .catch((error) => {
        deps.notifyError(
          'Nope — those credentials didn’t work. Give it another shot.',
        )
        throw error
      })

  /**
   * Exchanges a Google OAuth authorization code and PKCE verifier
   * for an authentication response containing access and refresh tokens.
   *
   * @param request - An object with `code` (the Google OAuth code) and `codeVerifier` (the matching PKCE verifier).
   * @returns A promise that resolves to the login response with access and refresh tokens.
   */
  const googleExchangeCode = (
    request: AuthGoogleExchangeRequestDto,
  ): Promise<AuthResponseDto> =>
    api
      .apiPost<AuthResponseDto>('/auth/google/exchange', request)
      .then(async (res) => {
        deps.setTokenPair(TokenScope.User, res.accessToken, res.refreshToken)
        await deps.fetchCurrentUser(res.accessToken)
        return res
      })
      .catch((error) => {
        deps.notifyError(
          'Nope — those credentials didn’t work. Give it another shot.',
        )
        throw error
      })

  /**
   * Sends a game authentication request to the API and stores the returned authentication tokens.
   *
   * @param request - The game authentication credentials containing the necessary game identifier.
   * @returns A promise that resolves to the authentication response with access and refresh tokens.
   */
  const authenticateGame = (
    request: AuthGameRequestDto,
  ): Promise<AuthResponseDto> =>
    api
      .apiPost<AuthResponseDto>(`/auth/game`, request, { refresh: false })
      .then((res) => {
        deps.setTokenPair(TokenScope.Game, res.accessToken, res.refreshToken)
        return res
      })
      .catch((error) => {
        deps.notifyError(
          'That game code didn’t match anything. Double-check it and try again.',
        )
        throw error
      })

  /**
   * Sends a refresh request to the API and stores the returned authentication tokens.
   *
   * @param scope - The TokenScope to use when authorizing this request (User or Game).
   * @param request - The request containing the refresh token.
   * @returns A promise that resolves to the login response with access and refresh tokens.
   */
  const refresh = (
    scope: TokenScope,
    request: AuthRefreshRequestDto,
  ): Promise<AuthResponseDto> =>
    api
      .apiPost<AuthResponseDto>('/auth/refresh', request)
      .then(async (res) => {
        deps.setTokenPair(scope, res.accessToken, res.refreshToken)
        if (scope === TokenScope.User) {
          await deps.fetchCurrentUser(res.accessToken)
        }
        return res
      })
      .catch((error) => {
        deps.notifyError(
          'Your session needed a refresh… and it didn’t go as planned. Please try again.',
        )
        throw error
      })

  /**
   * Revokes the specified authentication token.
   *
   * Sends a request to invalidate the given token on the server. Network or server
   * errors are intentionally ignored to avoid blocking local logout flows.
   *
   * @param request - An object containing the token to be revoked.
   * @param scope - The TokenScope (User or Game) whose token to revoke.
   * @returns A promise that resolves after local logout side effects have completed.
   */
  const revoke = (
    request: AuthRevokeRequestDto,
    scope: TokenScope,
  ): Promise<void> =>
    api
      .apiPost<void>('/auth/revoke', request)
      .catch(() => {
        // swallow exception
      })
      .finally(() => {
        if (scope === TokenScope.User) {
          deps.clearCurrentUser()
        }
      })

  /**
   * Verifies a user’s email address by sending the provided token to the backend.
   *
   * Sends a POST request to `/auth/email/verify` with the given token in a user scope.
   *
   * @param token – The one-time email verification token that was emailed to the user.
   * @returns A promise which:
   *   - **resolves** to `void` if the server confirms the email successfully,
   *   - **rejects** with an error if the verification fails or the token is invalid.
   */
  const verifyEmail = (token: string): Promise<void> =>
    api
      .apiPost<void>(
        '/auth/email/verify',
        {},
        { scope: TokenScope.User, token },
      )
      .catch((error) => {
        deps.notifyError(
          'That verification link looks a bit grumpy. Try requesting a new one.',
        )
        throw error
      })

  /**
   * Resend a verification email to the current user.
   *
   * @returns Resolves once the email has been sent (or rejects on failure).
   */
  const resendVerificationEmail = (): Promise<void> =>
    api
      .apiPost<void>('/auth/email/resend_verification', {})
      .then((response) => {
        deps.notifySuccess(
          'Hooray! A fresh verification email is on its way—check your inbox!',
        )
        return response
      })
      .catch((error) => {
        deps.notifyError(
          'Whoops! We couldn’t resend your verification email. Please try again.',
        )
        throw error
      })

  /**
   * Sends a password reset email to the user.
   *
   * @param request - An object containing the user’s email.
   * @returns A promise that resolves when the reset email has been successfully sent.
   */
  const sendPasswordResetEmail = (
    request: AuthPasswordForgotRequestDto,
  ): Promise<void> =>
    api
      .apiPost<void>('/auth/password/forgot', request)
      .then((response) => {
        deps.notifySuccess(
          'We’ve flung a reset link to your inbox. Didn’t see it? Sneak a peek in your spam folder.',
        )
        return response
      })
      .catch((error) => {
        deps.notifyError(
          'We couldn’t send the reset email right now. Please try again in a moment.',
        )
        throw error
      })

  /**
   * Resets the user’s password using the provided token.
   *
   * @param request - An object containing the new password details.
   * @param token   - The password reset token extracted from the reset link.
   * @returns A promise that resolves when the password has been successfully updated.
   */
  const resetPassword = (
    request: AuthPasswordResetRequestDto,
    token: string,
  ): Promise<void> =>
    api
      .apiPatch<void>('/auth/password/reset', request, {
        scope: TokenScope.User,
        token,
      })
      .then((response) => {
        deps.notifySuccess(
          'All Set! Your new password is locked and loaded. Welcome back!',
        )
        return response
      })
      .catch((error) => {
        deps.notifyError(
          'Password reset didn’t stick the landing. Please try again.',
        )
        throw error
      })

  /**
   * Sends a registration request to the API to create a new user account.
   *
   * @param request - The user registration data including email, password, and optional names.
   *
   * @returns A promise that resolves to the newly created user's information.
   */
  const register = (
    request: CreateUserRequestDto,
  ): Promise<CreateUserResponseDto> =>
    api
      .apiPost<CreateUserResponseDto>('/users', {
        email: request.email,
        password: request.password,
        givenName: request.givenName,
        familyName: request.familyName,
        defaultNickname: request.defaultNickname,
      })
      .then((response) => {
        deps.notifySuccess('Welcome aboard! Your account is ready to roll')
        return response
      })
      .catch((error) => {
        deps.notifyError(
          'We couldn’t create your account right now. Please try again.',
        )
        throw error
      })

  /**
   * Retrieves information about the current user.
   *
   * @param token - If provided, use this token instead of context.
   *
   * @returns A promise resolving to the user information.
   */
  const getUserProfile = (token?: string): Promise<UserProfileResponseDto> =>
    api
      .apiGet<UserProfileResponseDto>('/profile/user', {
        scope: TokenScope.User,
        token,
      })
      .catch((error) => {
        deps.notifyError('We couldn’t load your profile. Please try again.')
        throw error
      })

  /**
   * Updates the currently authenticated user's profile.
   *
   * @param request - The user update data including email and optional names.
   *
   * @returns A promise resolving to the updated user information.
   */
  const updateUserProfile = (
    request:
      UpdateLocalUserProfileRequestDto | UpdateGoogleUserProfileRequestDto,
  ): Promise<UserProfileResponseDto> =>
    api
      .apiPut<UserProfileResponseDto>('/profile/user', request)
      .then((response) => {
        deps.notifySuccess(
          'Nice! Your new profile is locked in. Get ready to quiz in style!',
        )
        return response
      })
      .catch((error) => {
        deps.notifyError(
          'Profile update failed. Give it another go — we’ll behave this time.',
        )
        throw error
      })

  /**
   * Updates the currently authenticated user's password.
   *
   * @param request - The password data including the old and new passwords.
   *
   * @returns A promise that resolves when the password has been successfully updated.
   */
  const updateUserPassword = (
    request: AuthPasswordChangeRequestDto,
  ): Promise<void> =>
    api
      .apiPatch<void>('/auth/password', request)
      .then(() => {
        deps.notifySuccess('Done and dusted! Your password’s been refreshed.')
      })
      .catch((error) => {
        deps.notifyError(
          'That password update didn’t take. Check your input and try again.',
        )
        throw error
      })

  return {
    login,
    googleExchangeCode,
    authenticateGame,
    refresh,
    revoke,
    verifyEmail,
    resendVerificationEmail,
    sendPasswordResetEmail,
    resetPassword,
    register,
    getUserProfile,
    updateUserProfile,
    updateUserPassword,
  }
}
