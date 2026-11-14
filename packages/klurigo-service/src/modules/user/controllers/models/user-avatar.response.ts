import {
  CRITTERS_V1_COLORS,
  CRITTERS_V1_PARTS,
  type CrittersAvatarConfigurationV1,
} from '@klurigo/common'
import { ApiProperty } from '@nestjs/swagger'

/** Exact v1 metadata returned by the self-profile avatar resource. */
export class UserAvatarResponse implements CrittersAvatarConfigurationV1 {
  @ApiProperty({
    description: 'Avatar metadata version.',
    enum: [1],
    example: 1,
  })
  readonly version: 1

  @ApiProperty({ description: 'Avatar style.', enum: ['critters'] })
  readonly style: 'critters'

  @ApiProperty({
    description: 'Immutable artwork and rendering recipe.',
    enum: ['v1'],
  })
  readonly artworkVersion: 'v1'

  @ApiProperty({
    description: 'Body shape.',
    enum: [...CRITTERS_V1_PARTS.body],
  })
  readonly body: CrittersAvatarConfigurationV1['body']

  @ApiProperty({
    description: 'Head decoration, or null for none.',
    type: String,
    enum: [...CRITTERS_V1_PARTS.top, null],
    nullable: true,
  })
  readonly top: CrittersAvatarConfigurationV1['top']

  @ApiProperty({ description: 'Eyes.', enum: [...CRITTERS_V1_PARTS.eyes] })
  readonly eyes: CrittersAvatarConfigurationV1['eyes']

  @ApiProperty({ description: 'Mouth.', enum: [...CRITTERS_V1_PARTS.mouth] })
  readonly mouth: CrittersAvatarConfigurationV1['mouth']

  @ApiProperty({
    description: 'Pattern, or null for none.',
    type: String,
    enum: [...CRITTERS_V1_PARTS.pattern, null],
    nullable: true,
  })
  readonly pattern: CrittersAvatarConfigurationV1['pattern']

  @ApiProperty({
    description: 'Cheeks, or null for none.',
    type: String,
    enum: [...CRITTERS_V1_PARTS.cheeks, null],
    nullable: true,
  })
  readonly cheeks: CrittersAvatarConfigurationV1['cheeks']

  @ApiProperty({
    description: 'Body color.',
    enum: [...CRITTERS_V1_COLORS.body],
  })
  readonly bodyColor: CrittersAvatarConfigurationV1['bodyColor']

  @ApiProperty({
    description: 'Accent color, different from body color.',
    enum: [...CRITTERS_V1_COLORS.accent],
  })
  readonly accentColor: CrittersAvatarConfigurationV1['accentColor']

  @ApiProperty({
    description: 'Background color.',
    enum: [...CRITTERS_V1_COLORS.background],
  })
  readonly backgroundColor: CrittersAvatarConfigurationV1['backgroundColor']
}
