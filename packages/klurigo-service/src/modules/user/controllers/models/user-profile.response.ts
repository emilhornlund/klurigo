import {
  AuthProvider,
  FAMILY_NAME_REGEX,
  GIVEN_NAME_REGEX,
  UserProfileResponseDto,
} from '@klurigo/common'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

import {
  ApiDateTimeProperty,
  ApiEmailProperty,
  ApiNicknameProperty,
  ApiUuidProperty,
} from '../../../../app/swagger'

/**
 * Response returned after successful user creation.
 */
export class UserProfileResponse implements UserProfileResponseDto {
  /**
   * The user’s unique identifier.
   */
  @ApiUuidProperty({
    title: 'User ID',
    description: 'Unique identifier for the user.',
  })
  readonly id: string

  /**
   * The user’s email address.
   */
  @ApiEmailProperty({
    title: 'Email',
    description: 'Email address of the user.',
  })
  readonly email: string

  /**
   * The user’s unverified email address, if provided.
   */
  @ApiEmailProperty({
    title: 'Unverified Email',
    description: 'The user’s unverified email address.',
    required: false,
  })
  readonly unverifiedEmail?: string

  /**
   * The user’s given name, if provided.
   */
  @ApiPropertyOptional({
    title: 'Given Name',
    description: 'First name of the user.',
    type: String,
    pattern: GIVEN_NAME_REGEX.source,
    example: 'John',
  })
  readonly givenName?: string

  /**
   * The user’s family name, if provided.
   */
  @ApiPropertyOptional({
    title: 'Family Name',
    description: 'Last name of the user.',
    type: String,
    pattern: FAMILY_NAME_REGEX.source,
    example: 'Appleseed',
  })
  readonly familyName?: string

  /**
   * The user’s default nickname.
   */
  @ApiNicknameProperty({
    title: 'Default Nickname',
    description:
      'A nickname chosen by the user, must be 2 to 20 characters long and contain only letters, numbers, or underscores.',
  })
  readonly defaultNickname: string

  /**
   * The user’s authentication provider.
   */
  @ApiProperty({
    title: 'Authentication Provider',
    description: 'The provider used by the user to authenticate.',
    example: AuthProvider.Local,
    enum: Object.values(AuthProvider),
  })
  readonly authProvider: AuthProvider

  /**
   * ISO 8601 timestamp when the user was created.
   */
  @ApiDateTimeProperty({
    title: 'Created',
    description: 'Creation timestamp for the created user.',
    example: '2025-06-18T12:00:00.000Z',
  })
  readonly created: Date

  /**
   * ISO 8601 timestamp when the user was last updated.
   */
  @ApiDateTimeProperty({
    title: 'Updated',
    description: 'Last update timestamp for the created user.',
    example: '2025-06-18T12:00:00.000Z',
  })
  readonly updated: Date
}
