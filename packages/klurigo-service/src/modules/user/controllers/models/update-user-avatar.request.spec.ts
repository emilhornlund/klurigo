import { DEFAULT_CRITTERS_AVATAR_V1 } from '@klurigo/common'
import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'

import { UpdateUserAvatarRequest } from './update-user-avatar.request'

describe('UpdateUserAvatarRequest', () => {
  const check = (value: unknown) =>
    validate(plainToInstance(UpdateUserAvatarRequest, value), {
      whitelist: true,
      forbidNonWhitelisted: true,
    })

  it('accepts complete designs and explicit null optional features', async () => {
    expect(await check(DEFAULT_CRITTERS_AVATAR_V1)).toEqual([])
    expect(
      await check({
        ...DEFAULT_CRITTERS_AVATAR_V1,
        top: null,
        pattern: null,
        cheeks: null,
      }),
    ).toEqual([])
  })

  it('rejects each omitted field and unknown properties', async () => {
    for (const key of Object.keys(DEFAULT_CRITTERS_AVATAR_V1)) {
      const incomplete: Record<string, unknown> = {
        ...DEFAULT_CRITTERS_AVATAR_V1,
      }
      delete incomplete[key]
      expect(await check(incomplete)).toEqual(
        expect.arrayContaining([expect.objectContaining({ property: key })]),
      )
    }
    expect(
      (await check({ ...DEFAULT_CRITTERS_AVATAR_V1, userId: 'another-user' }))
        .length,
    ).toBeGreaterThan(0)
  })

  it('rejects unsupported versions and conflicting colors', async () => {
    expect(
      (await check({ ...DEFAULT_CRITTERS_AVATAR_V1, version: 2 })).length,
    ).toBeGreaterThan(0)
    expect(
      (
        await check({
          ...DEFAULT_CRITTERS_AVATAR_V1,
          accentColor: DEFAULT_CRITTERS_AVATAR_V1.bodyColor,
        })
      ).length,
    ).toBeGreaterThan(0)
  })

  it('reports invalid palette entries against the relevant field', async () => {
    expect(
      await check({ ...DEFAULT_CRITTERS_AVATAR_V1, bodyColor: '#C4B5FD' }),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ property: 'bodyColor' }),
      ]),
    )
  })
})
