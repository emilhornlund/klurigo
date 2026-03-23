import { AuthProvider } from './auth'

/**
 * DTO for creating a new user.
 */
export interface CreateUserRequestDto {
  /**
   * The user’s unique email address.
   */
  readonly email: string

  /**
   * The user’s password.
   */
  readonly password: string

  /**
   * Optional given name (first name) of the user.
   */
  readonly givenName?: string

  /**
   * Optional family name (last name) of the user.
   */
  readonly familyName?: string

  /**
   * Default nickname of the user used for when participating in games.
   */
  readonly defaultNickname: string
}

/**
 * DTO returned after creating a user.
 */
export interface CreateUserResponseDto {
  /**
   * The new user’s unique identifier (UUID).
   */
  readonly id: string

  /**
   * The new user’s email address.
   */
  readonly email: string

  /**
   * The user’s unverified email address, if provided.
   */
  readonly unverifiedEmail?: string

  /**
   * The new user’s given name, if provided.
   */
  readonly givenName?: string

  /**
   * The new user’s family name, if provided.
   */
  readonly familyName?: string

  /**
   * The new user’s default nickname.
   */
  readonly defaultNickname: string

  /**
   * Timestamp when the user was created (ISO 8601 string).
   */
  readonly created: Date

  /**
   * Timestamp when the user was last updated (ISO 8601 string).
   */
  readonly updated: Date
}

/**
 * DTO for retrieving a user’s profile.
 */
export interface UserProfileResponseDto {
  /**
   * The user’s unique identifier (UUID).
   */
  readonly id: string

  /**
   * The user’s email address.
   */
  readonly email: string

  /**
   * The user’s unverified email address, if provided.
   */
  readonly unverifiedEmail?: string

  /**
   * The user’s given name, if provided.
   */
  readonly givenName?: string

  /**
   * The user’s family name, if provided.
   */
  readonly familyName?: string

  /**
   * The user’s default nickname.
   */
  readonly defaultNickname: string

  /**
   * The user’s authentication provider.
   */
  readonly authProvider: AuthProvider

  /**
   * Timestamp when the user was created (ISO 8601 string).
   */
  readonly created: Date

  /**
   * Timestamp when the user was last updated (ISO 8601 string).
   */
  readonly updated: Date
}

/**
 * DTO for retrieving a user's public profile summary.
 */
export interface PublicUserProfileResponseDto {
  /**
   * The user's unique identifier (UUID).
   */
  readonly id: string

  /**
   * The public nickname displayed for the user.
   */
  readonly nickname: string

  /**
   * The total number of public quizzes authored by the user.
   */
  readonly quizzesCount: number

  /**
   * The total number of games hosted by the user.
   */
  readonly hostedGamesCount: number

  /**
   * The total number of games played by the user.
   */
  readonly playedGamesCount: number

  /**
   * The timestamp when the user account was created.
   */
  readonly createdAt: Date
}

/**
 * DTO for updating an existing local user.
 */
export interface UpdateLocalUserProfileRequestDto {
  /**
   * The user’s authentication provider, Local for this request dto.
   */
  readonly authProvider: AuthProvider.Local

  /**
   * Optional email address of the user.
   */
  readonly email?: string

  /**
   * Optional given name (first name) of the user.
   */
  readonly givenName?: string

  /**
   * Optional family name (last name) of the user.
   */
  readonly familyName?: string

  /**
   * Optional default nickname of the user used for when participating in games.
   */
  readonly defaultNickname?: string
}

/**
 * DTO for updating an existing Google user.
 */
export interface UpdateGoogleUserProfileRequestDto {
  /**
   * The user’s authentication provider, Google for this request dto.
   */
  readonly authProvider: AuthProvider.Google

  /**
   * Optional default nickname of the user used for when participating in games.
   */
  readonly defaultNickname?: string
}
