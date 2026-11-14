import { DEFAULT_CRITTERS_AVATAR_V1 } from '@klurigo/common'
import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'

import { JoinGameRequest } from './join-game.request'

describe('JoinGameRequest', () => {
  let joinGameRequest: JoinGameRequest

  beforeEach(() => {
    joinGameRequest = new JoinGameRequest()
  })

  describe('avatar', () => {
    const check = (avatar?: unknown) =>
      validate(
        plainToInstance(JoinGameRequest, { nickname: 'FrostyBear', avatar }),
        {
          whitelist: true,
          forbidNonWhitelisted: true,
        },
      )

    it('accepts nickname-only legacy callers and complete account/guest designs', async () => {
      expect(await check()).toEqual([])
      expect(await check(DEFAULT_CRITTERS_AVATAR_V1)).toEqual([])
      expect(await check({ ...DEFAULT_CRITTERS_AVATAR_V1, top: null })).toEqual(
        [],
      )
    })

    it.each([
      null,
      [],
      'avatar',
      {},
      { ...DEFAULT_CRITTERS_AVATAR_V1, version: 2 },
      { ...DEFAULT_CRITTERS_AVATAR_V1, body: 'unknown' },
      { ...DEFAULT_CRITTERS_AVATAR_V1, bodyColor: '#C4B5FD' },
      {
        ...DEFAULT_CRITTERS_AVATAR_V1,
        accentColor: DEFAULT_CRITTERS_AVATAR_V1.bodyColor,
      },
      { ...DEFAULT_CRITTERS_AVATAR_V1, userId: 'someone-else' },
    ])(
      'rejects invalid or authority-bearing nested metadata: %j',
      async (avatar) => {
        expect(await check(avatar)).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ property: 'avatar' }),
          ]),
        )
      },
    )

    it('requires every metadata field, including nullable parts', async () => {
      for (const key of Object.keys(DEFAULT_CRITTERS_AVATAR_V1)) {
        const incomplete: Record<string, unknown> = {
          ...DEFAULT_CRITTERS_AVATAR_V1,
        }
        delete incomplete[key]
        expect((await check(incomplete)).length).toBeGreaterThan(0)
      }
    })
  })

  describe('nickname', () => {
    it('should be valid when the nickname is between 2 and 20 characters and contains only allowed characters', async () => {
      joinGameRequest.nickname = 'FrostyBear'

      const errors = await validate(joinGameRequest)
      expect(errors.length).toBe(0)
    })

    it('should fail validation if nickname is empty', async () => {
      joinGameRequest.nickname = ''

      const errors = await validate(joinGameRequest)
      expect(errors.length).toBeGreaterThan(0)
      expect(errors[0].constraints).toHaveProperty('minLength')
    })

    it('should fail validation if nickname is less than 2 characters', async () => {
      joinGameRequest.nickname = 'A'

      const errors = await validate(joinGameRequest)
      expect(errors.length).toBeGreaterThan(0)
      expect(errors[0].constraints).toHaveProperty('minLength')
    })

    it('should fail validation if nickname is more than 20 characters', async () => {
      joinGameRequest.nickname = 'ThisNicknameIsWayTooLong'

      const errors = await validate(joinGameRequest)
      expect(errors.length).toBeGreaterThan(0)
      expect(errors[0].constraints).toHaveProperty('maxLength')
    })

    it('should fail validation if nickname contains invalid characters', async () => {
      joinGameRequest.nickname = 'Invalid@Nickname!'

      const errors = await validate(joinGameRequest)
      expect(errors.length).toBeGreaterThan(0)
      expect(errors[0].constraints).toHaveProperty('matches')
      expect(errors[0].constraints?.matches).toContain(
        'Nickname can only contain letters, numbers, and underscores.',
      )
    })

    it('should pass validation for nickname with exactly 2 characters', async () => {
      joinGameRequest.nickname = 'AB'

      const errors = await validate(joinGameRequest)
      expect(errors.length).toBe(0)
    })

    it('should pass validation for nickname with exactly 20 characters', async () => {
      joinGameRequest.nickname = 'A'.repeat(20)

      const errors = await validate(joinGameRequest)
      expect(errors.length).toBe(0)
    })

    it('should fail validation if nickname is not a string', async () => {
      ;(joinGameRequest as any).nickname = 12345

      const errors = await validate(joinGameRequest)
      expect(errors.length).toBeGreaterThan(0)
      expect(errors[0].constraints).toHaveProperty('isString')
    })
  })
})
