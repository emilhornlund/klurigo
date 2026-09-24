import {
  AuthProvider,
  UpdateGoogleUserProfileRequestDto,
} from '@klurigo/common'
import { ApiProperty } from '@nestjs/swagger'
import { IsEnum } from 'class-validator'

import { ApiNicknameProperty } from '../../../../app/swagger'

/**
 * Represents the request object for updating a Google user’s profile.
 */
export class UpdateGoogleUserProfileRequest implements UpdateGoogleUserProfileRequestDto {
  /**
   * The user’s authentication provider, Google for this request dto.
   */
  @ApiProperty({
    title: 'Authentication Provider',
    description: 'The provider used by the user to authenticate.',
    example: AuthProvider.Google,
    enum: [AuthProvider.Google],
  })
  @IsEnum(AuthProvider)
  authProvider: AuthProvider.Google

  /**
   * The user’s default nickname, if provided.
   */
  @ApiNicknameProperty({
    title: 'Default Nickname',
    description:
      'A nickname chosen by the user, must be 2 to 20 characters long and contain only letters, numbers, or underscores.',
    required: false,
  })
  readonly defaultNickname?: string
}
