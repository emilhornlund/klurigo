import { AuthLoginRequestDto } from '@klurigo/common'

import { ApiEmailProperty, ApiPasswordProperty } from '../../../../app/swagger'

/**
 * Request object for user login.
 */
export class AuthLoginRequest implements AuthLoginRequestDto {
  /**
   * The user’s email address for login.
   */
  @ApiEmailProperty({ description: 'User email to authenticate.' })
  readonly email: string

  /**
   * The user’s password for login.
   */
  @ApiPasswordProperty({
    description:
      'User password; 8–128 chars, min 2 uppercase, 2 lowercase, 2 digits, 2 symbols.',
  })
  readonly password: string
}
