/** Immutable component identifiers for the repository-owned Critters v1 artwork. */
export const CRITTERS_V1_PARTS = {
  body: [
    'dome',
    'block',
    'tower',
    'chimney',
    'squat',
    'blob',
    'round',
    'tilt',
    'lean',
    'peak',
    'bell',
    'wedge',
    'wedgeInv',
    'steps',
  ],
  top: [
    'horns',
    'hornsIn',
    'hornsSmall',
    'spike',
    'antenna',
    'antennae',
    'earsRound',
    'earsPointy',
    'earsDroop',
    'spikes',
    'fin',
    'crown',
    'sprout',
    'nub',
    'bobble',
  ],
  eyes: [
    'round',
    'dots',
    'bigPupils',
    'sideeye',
    'inward',
    'mono',
    'uneven',
    'trio',
    'threeRow',
    'four',
    'happy',
    'closedLine',
    'wink',
    'squint',
    'wide',
    'sleepy',
    'angry',
    'monoSleepy',
    'close',
  ],
  mouth: [
    'smile',
    'tinySmile',
    'grin',
    'laugh',
    'teeth',
    'ooh',
    'line',
    'smirk',
    'wavy',
    'catMouth',
    'zigzag',
    'frown',
    'sad',
    'slant',
    'dot',
    'open',
    'tooth',
    'tongue',
    'blep',
  ],
  pattern: [
    'belly',
    'dots',
    'speckles',
    'bar',
    'bars',
    'spot',
    'stripes',
    'dotRow',
    'chevron',
    'ring',
  ],
  cheeks: ['blush', 'blushBig', 'freckles'],
} as const

const bodyAndAccentColors = [
  '#7dd3fc',
  '#a5b4fc',
  '#c4b5fd',
  '#f0abfc',
  '#fda4af',
  '#fca5a5',
  '#fdba74',
  '#fcd34d',
  '#bef264',
  '#6ee7b9',
  '#5eead4',
  '#e2e8f0',
] as const

/** Canonical v1 colors. Body and accent must differ; ink is not player-editable. */
export const CRITTERS_V1_COLORS = {
  body: bodyAndAccentColors,
  accent: bodyAndAccentColors,
  background: [
    '#0369a1',
    '#1d4ed8',
    '#4338ca',
    '#6d28d9',
    '#a21caf',
    '#be185d',
    '#be123c',
    '#c2410c',
    '#b45309',
    '#047857',
    '#0f766e',
    '#1e293b',
  ],
  ink: '#1e293b',
} as const

/**
 * Complete, seed-independent visual choices for Critters artwork/recipe v1.
 * Null explicitly hides an optional component. Missing fields never mean random.
 * Shared by saved profiles, the editor, and local rendering.
 */
export interface CrittersAvatarConfigurationV1 {
  /** Metadata contract version. */
  readonly version: 1
  /** Artwork family. */
  readonly style: 'critters'
  /** Immutable local artwork and rendering recipe. */
  readonly artworkVersion: 'v1'
  readonly body: (typeof CRITTERS_V1_PARTS.body)[number]
  readonly top: (typeof CRITTERS_V1_PARTS.top)[number] | null
  readonly eyes: (typeof CRITTERS_V1_PARTS.eyes)[number]
  readonly mouth: (typeof CRITTERS_V1_PARTS.mouth)[number]
  readonly pattern: (typeof CRITTERS_V1_PARTS.pattern)[number] | null
  readonly cheeks: (typeof CRITTERS_V1_PARTS.cheeks)[number] | null
  readonly bodyColor: (typeof CRITTERS_V1_COLORS.body)[number]
  /** Retained even when no visible component currently uses the accent. */
  readonly accentColor: (typeof CRITTERS_V1_COLORS.accent)[number]
  readonly backgroundColor: (typeof CRITTERS_V1_COLORS.background)[number]
}

/** Shared display fallback and first-use editor draft; persisted only on explicit save. */
export const DEFAULT_CRITTERS_AVATAR_V1: CrittersAvatarConfigurationV1 = {
  version: 1,
  style: 'critters',
  artworkVersion: 'v1',
  body: 'round',
  top: 'horns',
  eyes: 'happy',
  mouth: 'tinySmile',
  pattern: 'dots',
  cheeks: 'blush',
  bodyColor: '#c4b5fd',
  accentColor: '#fcd34d',
  backgroundColor: '#4338ca',
}
