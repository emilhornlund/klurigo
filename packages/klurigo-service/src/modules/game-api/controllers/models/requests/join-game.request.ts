import { JoinGameRequestDto } from '@klurigo/common'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsObject, ValidateIf, ValidateNested } from 'class-validator'

import { ApiNicknameProperty } from '../../../../../app/swagger'
import { UpdateUserAvatarRequest } from '../../../../user/controllers/models/update-user-avatar.request'

export class JoinGameRequest implements JoinGameRequestDto {
  @ApiNicknameProperty({
    description:
      'A nickname chosen by the player, must be 2 to 20 characters long and contain only letters, numbers, or underscores.',
    validateString: true,
  })
  nickname: string

  @ApiPropertyOptional({
    description: 'Complete avatar metadata for the first accepted join.',
    type: UpdateUserAvatarRequest,
  })
  @ValidateIf((_request, value: unknown) => value !== undefined)
  @IsObject()
  @ValidateNested()
  @Type(() => UpdateUserAvatarRequest)
  avatar?: UpdateUserAvatarRequest
}
