import { JoinGameRequestDto } from '@klurigo/common'

import { ApiNicknameProperty } from '../../../../../app/swagger'

export class JoinGameRequest implements JoinGameRequestDto {
  @ApiNicknameProperty({
    description:
      'A nickname chosen by the player, must be 2 to 20 characters long and contain only letters, numbers, or underscores.',
    validateString: true,
  })
  nickname: string
}
