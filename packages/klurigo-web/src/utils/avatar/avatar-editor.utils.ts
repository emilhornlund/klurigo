import { CRITTERS_V1_COLORS } from '@klurigo/common'

export { randomizeCrittersAvatar } from '@klurigo/common'

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
