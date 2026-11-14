import { describe, expect, it } from 'vitest'

import { DEFAULT_CRITTERS_AVATAR_V1 } from '../models/avatar'

import { isCrittersAvatarConfigurationV1 } from './avatar.utils'

describe('isCrittersAvatarConfigurationV1', () => {
  it('accepts complete metadata and explicit absent components', () => {
    expect(isCrittersAvatarConfigurationV1(DEFAULT_CRITTERS_AVATAR_V1)).toBe(
      true,
    )
    expect(
      isCrittersAvatarConfigurationV1({
        ...DEFAULT_CRITTERS_AVATAR_V1,
        top: null,
        pattern: null,
        cheeks: null,
      }),
    ).toBe(true)
  })

  it.each([
    null,
    undefined,
    [],
    {},
    'avatar',
    { ...DEFAULT_CRITTERS_AVATAR_V1, version: '1' },
    { ...DEFAULT_CRITTERS_AVATAR_V1, artworkVersion: 'v2' },
    { ...DEFAULT_CRITTERS_AVATAR_V1, body: 'unknown' },
    { ...DEFAULT_CRITTERS_AVATAR_V1, bodyColor: '#C4B5FD' },
    {
      ...DEFAULT_CRITTERS_AVATAR_V1,
      accentColor: DEFAULT_CRITTERS_AVATAR_V1.bodyColor,
    },
  ])('rejects invalid metadata: %j', (value) => {
    expect(isCrittersAvatarConfigurationV1(value)).toBe(false)
  })

  it('rejects every missing field, including nullable components', () => {
    for (const field of Object.keys(DEFAULT_CRITTERS_AVATAR_V1)) {
      const incomplete: Record<string, unknown> = {
        ...DEFAULT_CRITTERS_AVATAR_V1,
      }
      delete incomplete[field]
      expect(isCrittersAvatarConfigurationV1(incomplete)).toBe(false)
    }
  })
})
