import {
  CRITTERS_V1_COLORS,
  CRITTERS_V1_PARTS,
  type CrittersAvatarConfigurationV1,
} from '@klurigo/common'
import { Equals, IsIn, ValidateBy, ValidateIf } from 'class-validator'

import { UserAvatarResponse } from './user-avatar.response'

/** Complete replacement metadata with field-level errors and the shared Swagger schema. */
export class UpdateUserAvatarRequest extends UserAvatarResponse {
  @Equals(1)
  declare readonly version: 1

  @Equals('critters')
  declare readonly style: 'critters'

  @Equals('v1')
  declare readonly artworkVersion: 'v1'

  @IsIn(CRITTERS_V1_PARTS.body)
  declare readonly body: CrittersAvatarConfigurationV1['body']

  @ValidateIf((_request, value: unknown) => value !== null)
  @IsIn(CRITTERS_V1_PARTS.top)
  declare readonly top: CrittersAvatarConfigurationV1['top']

  @IsIn(CRITTERS_V1_PARTS.eyes)
  declare readonly eyes: CrittersAvatarConfigurationV1['eyes']

  @IsIn(CRITTERS_V1_PARTS.mouth)
  declare readonly mouth: CrittersAvatarConfigurationV1['mouth']

  @ValidateIf((_request, value: unknown) => value !== null)
  @IsIn(CRITTERS_V1_PARTS.pattern)
  declare readonly pattern: CrittersAvatarConfigurationV1['pattern']

  @ValidateIf((_request, value: unknown) => value !== null)
  @IsIn(CRITTERS_V1_PARTS.cheeks)
  declare readonly cheeks: CrittersAvatarConfigurationV1['cheeks']

  @IsIn(CRITTERS_V1_COLORS.body)
  declare readonly bodyColor: CrittersAvatarConfigurationV1['bodyColor']

  @IsIn(CRITTERS_V1_COLORS.accent)
  @ValidateBy({
    name: 'distinctAvatarColors',
    validator: {
      validate: (value: unknown, args) => {
        const request = args?.object
        return (
          !!request && 'bodyColor' in request && value !== request.bodyColor
        )
      },
      defaultMessage: () => 'Accent color must differ from body color.',
    },
  })
  declare readonly accentColor: CrittersAvatarConfigurationV1['accentColor']

  @IsIn(CRITTERS_V1_COLORS.background)
  declare readonly backgroundColor: CrittersAvatarConfigurationV1['backgroundColor']
}
