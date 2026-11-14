import {
  CRITTERS_V1_COLORS,
  CRITTERS_V1_PARTS,
  type CrittersAvatarConfigurationV1,
} from '@klurigo/common'

const pick = <T>(values: readonly T[]): T =>
  values[Math.floor(Math.random() * values.length)]

/** Resolve every choice now; rendering and persistence never perform random selection. */
export function randomizeCrittersAvatar(): CrittersAvatarConfigurationV1 {
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

/** UI labels never change persisted component identifiers. */
export const avatarChoiceLabel = (value: string): string =>
  value === 'wedgeInv'
    ? 'Inverted wedge'
    : value
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .toLowerCase()
        .replace(/^./, (letter) => letter.toUpperCase())

type AvatarColor = (typeof CRITTERS_V1_COLORS)[
  'body' | 'accent' | 'background'][number]

export const AVATAR_COLOR_LABELS: Record<AvatarColor, string> = {
  '#7dd3fc': 'Sky',
  '#a5b4fc': 'Periwinkle',
  '#c4b5fd': 'Lavender',
  '#f0abfc': 'Lilac',
  '#fda4af': 'Rose',
  '#fca5a5': 'Coral',
  '#fdba74': 'Peach',
  '#fcd34d': 'Gold',
  '#bef264': 'Lime',
  '#6ee7b9': 'Mint',
  '#5eead4': 'Aqua',
  '#e2e8f0': 'Cloud',
  '#0369a1': 'Ocean',
  '#1d4ed8': 'Blue',
  '#4338ca': 'Indigo',
  '#6d28d9': 'Purple',
  '#a21caf': 'Orchid',
  '#be185d': 'Berry',
  '#be123c': 'Ruby',
  '#c2410c': 'Rust',
  '#b45309': 'Amber',
  '#047857': 'Emerald',
  '#0f766e': 'Teal',
  '#1e293b': 'Midnight',
}
