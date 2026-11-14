import { describe, expect, it } from 'vitest'

import { DEFAULT_CRITTERS_AVATAR_V1 } from '../models/avatar'

import {
  isCrittersAvatarConfigurationV1,
  resolveGameAvatarSnapshot,
} from './avatar.utils'

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

describe('resolveGameAvatarSnapshot', () => {
  it('copies complete metadata without storage internals or profile references', () => {
    const stored = { ...DEFAULT_CRITTERS_AVATAR_V1, top: null, _id: 'storage' }
    const snapshot = resolveGameAvatarSnapshot(stored)
    expect(snapshot).toEqual({ ...DEFAULT_CRITTERS_AVATAR_V1, top: null })
    expect(snapshot).not.toBe(stored)
    stored.body = 'block'
    expect(snapshot.body).toBe('round')
  })

  it.each([
    undefined,
    null,
    {},
    { ...DEFAULT_CRITTERS_AVATAR_V1, version: 99 },
  ])(
    'resolves legacy or unsupported metadata to an independent stable default: %j',
    (stored) => {
      const before = JSON.stringify(stored)
      const first = resolveGameAvatarSnapshot(stored)
      expect(first).toEqual(DEFAULT_CRITTERS_AVATAR_V1)
      expect(resolveGameAvatarSnapshot(stored)).toEqual(first)
      expect(first).not.toBe(DEFAULT_CRITTERS_AVATAR_V1)
      expect(JSON.stringify(stored)).toBe(before)
    },
  )
})
