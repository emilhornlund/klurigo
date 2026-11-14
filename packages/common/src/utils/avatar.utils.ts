import {
  CRITTERS_V1_COLORS,
  CRITTERS_V1_PARTS,
  type CrittersAvatarConfigurationV1,
} from '../models/avatar'

/** Validate the complete persisted design without normalizing or randomizing it. */
export function isCrittersAvatarConfigurationV1(
  value: unknown,
): value is CrittersAvatarConfigurationV1 {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const avatar = value as Record<string, unknown>
  if (
    avatar.version !== 1 ||
    avatar.style !== 'critters' ||
    avatar.artworkVersion !== 'v1'
  )
    return false
  for (const part of Object.keys(
    CRITTERS_V1_PARTS,
  ) as (keyof typeof CRITTERS_V1_PARTS)[]) {
    if (['top', 'pattern', 'cheeks'].includes(part) && avatar[part] === null)
      continue
    if (!(CRITTERS_V1_PARTS[part] as readonly unknown[]).includes(avatar[part]))
      return false
  }
  for (const color of ['body', 'accent', 'background'] as const) {
    if (
      !(CRITTERS_V1_COLORS[color] as readonly unknown[]).includes(
        avatar[`${color}Color`],
      )
    )
      return false
  }
  return avatar.bodyColor !== avatar.accentColor
}
