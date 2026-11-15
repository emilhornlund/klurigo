import { JoinGameRequestDto } from '@klurigo/common'
import { ApiProperty } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsDefined, IsObject, ValidateNested } from 'class-validator'

import { AvatarConfigurationRequest } from '../../../../../app/shared/avatar/avatar-configuration.request'
import { ApiNicknameProperty } from '../../../../../app/swagger'

export class JoinGameRequest implements JoinGameRequestDto {
  @ApiNicknameProperty({
    description:
      'A nickname chosen by the player, must be 2 to 20 characters long and contain only letters, numbers, or underscores.',
    validateString: true,
  })
  nickname: string

  /** Complete validated avatar accepted alongside the player's nickname. */
  @ApiProperty({
    description: 'Complete avatar metadata for the first accepted join.',
    type: AvatarConfigurationRequest,
  })
  @IsDefined()
  @IsObject()
  @ValidateNested()
  @Type(() => AvatarConfigurationRequest)
  avatar: AvatarConfigurationRequest
}
