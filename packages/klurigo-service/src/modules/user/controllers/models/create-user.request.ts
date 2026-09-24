import {
  CreateUserRequestDto,
  FAMILY_NAME_MAX_LENGTH,
  FAMILY_NAME_MIN_LENGTH,
  FAMILY_NAME_REGEX,
  GIVEN_NAME_MAX_LENGTH,
  GIVEN_NAME_MIN_LENGTH,
  GIVEN_NAME_REGEX,
} from '@klurigo/common'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsOptional, Matches, MaxLength, MinLength } from 'class-validator'

import {
  ApiEmailProperty,
  ApiNicknameProperty,
  ApiPasswordProperty,
} from '../../../../app/swagger'

/**
 * Request object for creating a new user account.
 */
export class CreateUserRequest implements CreateUserRequestDto {
  /**
   * The user’s email address.
   */
  @ApiEmailProperty({ description: 'Unique email address for the new user.' })
  readonly email: string

  /**
   * The user’s password.
   */
  @ApiPasswordProperty({
    description: 'Strong password meeting complexity requirements.',
  })
  readonly password: string

  /**
   * Optional first name of the user.
   */
  @ApiPropertyOptional({
    title: 'Given Name',
    description: 'First name of the user, if provided.',
    type: String,
    pattern: GIVEN_NAME_REGEX.source,
    example: 'John',
  })
  @IsOptional()
  @MinLength(GIVEN_NAME_MIN_LENGTH)
  @MaxLength(GIVEN_NAME_MAX_LENGTH)
  @Matches(GIVEN_NAME_REGEX, {
    message:
      'Given name must be 1–64 characters of letters/marks, and may include internal spaces, apostrophes or hyphens (no leading/trailing separators).',
  })
  readonly givenName?: string

  /**
   * Optional last name of the user (1–50 alphabetic chars).
   */
  @ApiPropertyOptional({
    title: 'Family Name',
    description: 'Last name of the user, if provided.',
    type: String,
    pattern: FAMILY_NAME_REGEX.source,
    example: 'Appleseed',
  })
  @IsOptional()
  @MinLength(FAMILY_NAME_MIN_LENGTH)
  @MaxLength(FAMILY_NAME_MAX_LENGTH)
  @Matches(FAMILY_NAME_REGEX, {
    message:
      'Family name must be 1–64 characters of letters/marks, and may include internal spaces, apostrophes or hyphens (no leading/trailing separators).',
  })
  readonly familyName?: string

  /**
   * Default nickname of the user used for when participating in games.
   */
  @ApiNicknameProperty({ title: 'Default Nickname' })
  readonly defaultNickname: string
}
