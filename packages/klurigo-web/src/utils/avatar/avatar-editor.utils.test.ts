import { isCrittersAvatarConfigurationV1 } from '@klurigo/common'
import { describe, expect, it, vi } from 'vitest'

import {
  avatarChoiceLabel,
  randomizeCrittersAvatar,
} from './avatar-editor.utils'

describe('avatar editor helpers', () => {
  it('provides readable, consistently spaced component labels', () => {
    expect(avatarChoiceLabel('wedgeInv')).toBe('Inverted wedge')
    expect(avatarChoiceLabel('bigPupils')).toBe('Big pupils')
    expect(avatarChoiceLabel('tinySmile')).toBe('Tiny smile')
  })
  it('always produces complete designs, including at random selection boundaries', () => {
    const random = vi.spyOn(Math, 'random')
    try {
      for (const boundary of [0, 0.5, 0.999999]) {
        random.mockReturnValue(boundary)
        expect(isCrittersAvatarConfigurationV1(randomizeCrittersAvatar())).toBe(
          true,
        )
      }
    } finally {
      random.mockRestore()
    }
    for (let i = 0; i < 100; i++)
      expect(isCrittersAvatarConfigurationV1(randomizeCrittersAvatar())).toBe(
        true,
      )
  })
})
