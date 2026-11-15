import type { CrittersAvatarConfigurationV1 } from '@klurigo/common'

/** Reference design shared by the rendering proof and immutable regression fixtures. */
export const CRITTERS_V1_REFERENCE = {
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
} as const satisfies CrittersAvatarConfigurationV1

/** Intentionally varied golden designs; update only after compatibility review. */
export const CRITTERS_V1_FIXTURES = [
  { name: 'Friendly', configuration: CRITTERS_V1_REFERENCE },
  {
    name: 'Minimal',
    configuration: {
      ...CRITTERS_V1_REFERENCE,
      body: 'blob',
      top: null,
      pattern: null,
      cheeks: null,
      eyes: 'dots',
      mouth: 'smile',
      bodyColor: '#6ee7b9',
      accentColor: '#fdba74',
      backgroundColor: '#0f766e',
    },
  },
  {
    name: 'Three eyes',
    configuration: {
      ...CRITTERS_V1_REFERENCE,
      body: 'block',
      top: 'antennae',
      eyes: 'trio',
      mouth: 'blep',
      pattern: 'stripes',
      cheeks: 'freckles',
      bodyColor: '#fcd34d',
      accentColor: '#fda4af',
      backgroundColor: '#be185d',
    },
  },
  {
    name: 'Tall sprout',
    configuration: {
      ...CRITTERS_V1_REFERENCE,
      body: 'chimney',
      top: 'sprout',
      eyes: 'wide',
      mouth: 'tooth',
      pattern: 'ring',
      cheeks: 'blushBig',
      bodyColor: '#7dd3fc',
      accentColor: '#bef264',
      backgroundColor: '#1e293b',
    },
  },
] as const satisfies readonly {
  name: string
  configuration: CrittersAvatarConfigurationV1
}[]
