import { AuthPasswordForgotRequestDto } from '@klurigo/common'

import { ApiEmailProperty } from '../../../../app/swagger'

/**
 * Request object for sending password reset email.
 */
export class AuthPasswordForgotRequest implements AuthPasswordForgotRequestDto {
  /**
   * The user’s email address.
   */
  @ApiEmailProperty({ description: 'Unique email address for the user.' })
  readonly email: string
}
