import {
  CRITTERS_V1_COLORS,
  CRITTERS_V1_PARTS,
  type CrittersAvatarConfigurationV1,
} from '@klurigo/common'
import { ApiProperty } from '@nestjs/swagger'

/** Complete public metadata shared by account and game identity responses. */
export class AvatarConfigurationResponse implements CrittersAvatarConfigurationV1 {
  /** Supported metadata contract version. */
  @ApiProperty({
    description: 'Avatar metadata version.',
    enum: [1],
    example: 1,
  })
  readonly version: 1

  /** Repository-owned artwork family. */
  @ApiProperty({ description: 'Avatar style.', enum: ['critters'] })
  readonly style: 'critters'

  /** Immutable artwork and rendering recipe identifier. */
  @ApiProperty({
    description: 'Immutable artwork and rendering recipe.',
    enum: ['v1'],
  })
  readonly artworkVersion: 'v1'

  /** Explicit body silhouette. */
  @ApiProperty({
    description: 'Body shape.',
    enum: [...CRITTERS_V1_PARTS.body],
  })
  readonly body: CrittersAvatarConfigurationV1['body']

  /** Head decoration, with null representing None. */
  @ApiProperty({
    description: 'Head decoration, or null for none.',
    type: String,
    enum: [...CRITTERS_V1_PARTS.top, null],
    nullable: true,
  })
  readonly top: CrittersAvatarConfigurationV1['top']

  /** Explicit eye expression. */
  @ApiProperty({ description: 'Eyes.', enum: [...CRITTERS_V1_PARTS.eyes] })
  readonly eyes: CrittersAvatarConfigurationV1['eyes']

  /** Explicit mouth expression. */
  @ApiProperty({ description: 'Mouth.', enum: [...CRITTERS_V1_PARTS.mouth] })
  readonly mouth: CrittersAvatarConfigurationV1['mouth']

  /** Body pattern, with null representing None. */
  @ApiProperty({
    description: 'Pattern, or null for none.',
    type: String,
    enum: [...CRITTERS_V1_PARTS.pattern, null],
    nullable: true,
  })
  readonly pattern: CrittersAvatarConfigurationV1['pattern']

  /** Cheek decoration, with null representing None. */
  @ApiProperty({
    description: 'Cheeks, or null for none.',
    type: String,
    enum: [...CRITTERS_V1_PARTS.cheeks, null],
    nullable: true,
  })
  readonly cheeks: CrittersAvatarConfigurationV1['cheeks']

  /** Canonical body color. */
  @ApiProperty({
    description: 'Body color.',
    enum: [...CRITTERS_V1_COLORS.body],
  })
  readonly bodyColor: CrittersAvatarConfigurationV1['bodyColor']

  /** Distinct accent color retained even when unused by visible parts. */
  @ApiProperty({
    description: 'Accent color, different from body color.',
    enum: [...CRITTERS_V1_COLORS.accent],
  })
  readonly accentColor: CrittersAvatarConfigurationV1['accentColor']

  /** Canonical solid image background. */
  @ApiProperty({
    description: 'Background color.',
    enum: [...CRITTERS_V1_COLORS.background],
  })
  readonly backgroundColor: CrittersAvatarConfigurationV1['backgroundColor']
}
