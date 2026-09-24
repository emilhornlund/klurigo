import { AuthPasswordResetRequestDto } from '@klurigo/common'

import { ApiPasswordProperty } from '../../../../app/swagger'

/**
 * Request object for resetting a user’s password.
 */
export class AuthPasswordResetRequest implements AuthPasswordResetRequestDto {
  /**
   * The new password the user wants to set.
   */
  @ApiPasswordProperty({
    description: 'Strong password meeting complexity requirements.',
  })
  readonly password: string
}
