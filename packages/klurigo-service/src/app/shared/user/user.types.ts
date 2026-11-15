import {
  AuthProvider,
  type CrittersAvatarConfigurationV1,
} from '@klurigo/common'

/**
 * Shared user model contracts.
 *
 * These interfaces describe the structural shape of user records used across modules.
 * They are intentionally framework-agnostic (no Mongoose/NestJS imports) so they can
 * be consumed from shared utilities without creating circular dependencies.
 */
export interface SharedUserBase {
  avatar?: CrittersAvatarConfigurationV1
  _id: string
  authProvider: AuthProvider
  email: string
  unverifiedEmail?: string
  givenName?: string
  familyName?: string
  defaultNickname: string
  lastLoggedInAt?: Date
  createdAt: Date
  updatedAt: Date
}

/**
 * User shape for locally authenticated accounts.
 */
export interface SharedLocalUser extends SharedUserBase {
  authProvider: AuthProvider.Local
  hashedPassword: string
}

/**
 * User shape for Google authenticated accounts.
 */
export interface SharedGoogleUser extends SharedUserBase {
  authProvider: AuthProvider.Google
  googleUserId: string
}

/**
 * User shape for legacy/anonymous accounts without an external provider.
 */
export interface SharedNoneUser extends SharedUserBase {
  authProvider: AuthProvider.None
}

/**
 * Discriminated union of all supported user shapes.
 */
export type SharedUser = SharedLocalUser | SharedGoogleUser | SharedNoneUser
