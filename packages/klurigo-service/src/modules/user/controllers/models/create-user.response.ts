import {
  CreateUserResponseDto,
  FAMILY_NAME_REGEX,
  GIVEN_NAME_REGEX,
} from '@klurigo/common'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

import {
  ApiDateTimeProperty,
  ApiEmailProperty,
  ApiNicknameProperty,
  ApiUuidProperty,
} from '../../../../app/swagger'

import { UserAvatarResponse } from './user-avatar.response'

/**
 * Response returned after successful user creation.
 */
export class CreateUserResponse implements CreateUserResponseDto {
  /**
   * The newly created user’s UUID.
   */
  @ApiUuidProperty({
    title: 'User ID',
    description: 'Unique identifier for the created user.',
  })
  readonly id: string

  /**
   * The new user’s email address.
   */
  @ApiEmailProperty({
    title: 'Email',
    description: 'Email address of the created user.',
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
   * The new user’s given name, if provided.
   */
  @ApiPropertyOptional({
    title: 'Given Name',
    description: 'First name of the created user.',
    type: String,
    pattern: GIVEN_NAME_REGEX.source,
    example: 'John',
  })
  readonly givenName?: string

  /**
   * The new user’s family name, if provided.
   */
  @ApiPropertyOptional({
    title: 'Family Name',
    description: 'Last name of the created user.',
    type: String,
    pattern: FAMILY_NAME_REGEX.source,
    example: 'Appleseed',
  })
  readonly familyName?: string

  /**
   * The new user’s default nickname.
   */
  @ApiNicknameProperty({
    title: 'Default Nickname',
    description:
      'A nickname chosen by the player, must be 2 to 20 characters long and contain only letters, numbers, or underscores.',
  })
  readonly defaultNickname: string

  /**
   * Complete initial avatar, using the stable default until a preference is saved.
   */
  @ApiProperty({
    title: 'Avatar',
    description:
      'Complete initial avatar, using the stable default until a preference is saved.',
    type: UserAvatarResponse,
  })
  readonly avatar: UserAvatarResponse

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
