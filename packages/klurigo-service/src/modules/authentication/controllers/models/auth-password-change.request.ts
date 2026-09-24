import { AuthPasswordChangeRequestDto } from '@klurigo/common'

import { ApiPasswordProperty } from '../../../../app/swagger'

/**
 * Request object for changing a user’s password.
 *
 * Contains the user’s current password (for verification) and the new password to set.
 */
export class AuthPasswordChangeRequest implements AuthPasswordChangeRequestDto {
  /**
   * The user’s current password, used to verify their identity before allowing a change.
   */
  @ApiPasswordProperty({
    title: 'Old Password',
    description:
      'The user’s existing password; must match their current credentials.',
    message:
      'Old password must include at least 2 uppercase letters, 2 lowercase letters, 2 digits, and 2 symbols.',
  })
  readonly oldPassword: string

  /**
   * The new password the user wants to set.
   * Must meet complexity requirements: 8–128 chars, ≥2 uppercase, ≥2 lowercase, ≥2 digits, ≥2 symbols.
   */
  @ApiPasswordProperty({
    title: 'New Password',
    description:
      'The new password to apply; 8–128 chars, min 2 uppercase, 2 lowercase, 2 digits, 2 symbols.',
    example: 'Tr0ub4dor&3NewP@ssw0rd!',
    message:
      'New password must include at least 2 uppercase letters, 2 lowercase letters, 2 digits, and 2 symbols.',
  })
  readonly newPassword: string
}
