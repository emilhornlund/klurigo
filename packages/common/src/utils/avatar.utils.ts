import {
  CRITTERS_V1_COLORS,
  CRITTERS_V1_PARTS,
  type CrittersAvatarConfigurationV1,
  DEFAULT_CRITTERS_AVATAR_V1,
} from '../models/avatar'

/**
 * Checks complete v1 visual choices without normalizing or randomizing metadata.
 * Storage internals are allowed on read; transport DTOs reject extra request fields.
 *
 * @param value - Untrusted or previously persisted avatar metadata.
 * @returns Whether every required v1 part and canonical color is supported.
 */
export function isCrittersAvatarConfigurationV1(
  value: unknown,
): value is CrittersAvatarConfigurationV1 {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false
  }

  const avatar = value as Record<string, unknown>

  if (
    avatar.version !== 1 ||
    avatar.style !== 'critters' ||
    avatar.artworkVersion !== 'v1'
  ) {
    return false
  }

  for (const part of Object.keys(
    CRITTERS_V1_PARTS,
  ) as (keyof typeof CRITTERS_V1_PARTS)[]) {
    const optional = part === 'top' || part === 'pattern' || part === 'cheeks'

    if (optional && avatar[part] === null) {
      continue
    }

    if (
      !(CRITTERS_V1_PARTS[part] as readonly unknown[]).includes(avatar[part])
    ) {
      return false
    }
  }

  for (const color of ['body', 'accent', 'background'] as const) {
    if (
      !(CRITTERS_V1_COLORS[color] as readonly unknown[]).includes(
        avatar[`${color}Color`],
      )
    ) {
      return false
    }
  }

  return avatar.bodyColor !== avatar.accentColor
}

/**
 * Copies supported choices or the stable legacy default, without storage internals.
 *
 * @param value - Current or historical game/account metadata.
 * @returns A complete independent snapshot; the source record is never modified.
 */
export function resolveGameAvatarSnapshot(
  value: unknown,
): CrittersAvatarConfigurationV1 {
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

/**
 * Resolves one complete random design before previewing or accepting it.
 *
 * @returns Explicit choices with distinct body/accent colors and nullable decorations.
 */
export function randomizeCrittersAvatar(): CrittersAvatarConfigurationV1 {
  const pick = <T>(values: readonly T[]): T =>
    values[Math.floor(Math.random() * values.length)]
  const bodyColor = pick(CRITTERS_V1_COLORS.body)

  return {
    version: 1,
    style: 'critters',
    artworkVersion: 'v1',
    body: pick(CRITTERS_V1_PARTS.body),
    top: pick([...CRITTERS_V1_PARTS.top, null]),
    eyes: pick(CRITTERS_V1_PARTS.eyes),
    mouth: pick(CRITTERS_V1_PARTS.mouth),
    pattern: pick([...CRITTERS_V1_PARTS.pattern, null]),
    cheeks: pick([...CRITTERS_V1_PARTS.cheeks, null]),
    bodyColor,
    accentColor: pick(
      CRITTERS_V1_COLORS.accent.filter((color) => color !== bodyColor),
    ),
    backgroundColor: pick(CRITTERS_V1_COLORS.background),
  }
}
