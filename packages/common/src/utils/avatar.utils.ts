import {
  CRITTERS_V1_COLORS,
  CRITTERS_V1_PARTS,
  type CrittersAvatarConfigurationV1,
  DEFAULT_CRITTERS_AVATAR_V1,
  type GameAvatarSnapshot,
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

/** Resolve legacy metadata without mutating it or retaining a profile reference. */
export function resolveGameAvatarSnapshot(value: unknown): GameAvatarSnapshot {
  const avatar = isCrittersAvatarConfigurationV1(value)
    ? value
    : DEFAULT_CRITTERS_AVATAR_V1

  // Pick only metadata: persisted subdocuments may also carry storage internals.
  return {
    version: avatar.version,
    style: avatar.style,
    artworkVersion: avatar.artworkVersion,
    body: avatar.body,
    top: avatar.top,
    eyes: avatar.eyes,
    mouth: avatar.mouth,
    pattern: avatar.pattern,
    cheeks: avatar.cheeks,
    bodyColor: avatar.bodyColor,
    accentColor: avatar.accentColor,
    backgroundColor: avatar.backgroundColor,
  }
}
