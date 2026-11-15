import {
  CRITTERS_V1_COLORS,
  CRITTERS_V1_PARTS,
  type CrittersAvatarConfigurationV1,
} from '@klurigo/common'
import { Equals, IsIn, ValidateBy, ValidateIf } from 'class-validator'

import { AvatarConfigurationResponse } from './avatar-configuration.response'

/** Complete replacement metadata with field-level errors and the shared Swagger schema. */
export class AvatarConfigurationRequest extends AvatarConfigurationResponse {
  /** Accepts only the supported static v1 contract. */
  @Equals(1)
  declare readonly version: 1

  /** Rejects arbitrary artwork families. */
  @Equals('critters')
  declare readonly style: 'critters'

  /** Pins choices to the immutable local v1 recipe. */
  @Equals('v1')
  declare readonly artworkVersion: 'v1'

  /** Requires a catalog body silhouette. */
  @IsIn(CRITTERS_V1_PARTS.body)
  declare readonly body: CrittersAvatarConfigurationV1['body']

  /** Required nullable decoration: null means None, omission is invalid. */
  @ValidateIf((_request, value: unknown) => value !== null)
  @IsIn(CRITTERS_V1_PARTS.top)
  declare readonly top: CrittersAvatarConfigurationV1['top']

  /** Requires a catalog eye expression. */
  @IsIn(CRITTERS_V1_PARTS.eyes)
  declare readonly eyes: CrittersAvatarConfigurationV1['eyes']

  /** Requires a catalog mouth expression. */
  @IsIn(CRITTERS_V1_PARTS.mouth)
  declare readonly mouth: CrittersAvatarConfigurationV1['mouth']

  /** Required nullable pattern: null means None, omission is invalid. */
  @ValidateIf((_request, value: unknown) => value !== null)
  @IsIn(CRITTERS_V1_PARTS.pattern)
  declare readonly pattern: CrittersAvatarConfigurationV1['pattern']

  /** Required nullable cheeks: null means None, omission is invalid. */
  @ValidateIf((_request, value: unknown) => value !== null)
  @IsIn(CRITTERS_V1_PARTS.cheeks)
  declare readonly cheeks: CrittersAvatarConfigurationV1['cheeks']

  /** Requires a canonical body palette value. */
  @IsIn(CRITTERS_V1_COLORS.body)
  declare readonly bodyColor: CrittersAvatarConfigurationV1['bodyColor']

  /** Requires a canonical accent that differs from the body, even when hidden. */
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

  /** Requires a canonical solid background color. */
  @IsIn(CRITTERS_V1_COLORS.background)
  declare readonly backgroundColor: CrittersAvatarConfigurationV1['backgroundColor']
}
