import { PublicUserProfileResponse } from './public-user-profile.response'

describe(PublicUserProfileResponse.name, () => {
  const validData = {
    id: 'eaf37189-7aa7-455e-9e47-73db2a7d0a03',
    nickname: 'FrostyBear',
    quizzesCount: 12,
    hostedGamesCount: 34,
    playedGamesCount: 56,
    createdAt: new Date('2025-06-18T12:00:00.000Z'),
  }

  it('stores the expected public profile fields', () => {
    const response = Object.assign(new PublicUserProfileResponse(), validData)

    expect(response).toEqual(validData)
  })

  it('keeps `createdAt` as a Date instance', () => {
    const response = Object.assign(new PublicUserProfileResponse(), {
      ...validData,
      createdAt: new Date('2025-06-18T12:00:00.000Z'),
    })

    expect(response.createdAt).toBeInstanceOf(Date)
  })

  it('preserves the documented nickname metadata shape', () => {
    const response = Object.assign(new PublicUserProfileResponse(), {
      ...validData,
      nickname: 'FrostyBear',
    })

    expect(response.nickname).toBe('FrostyBear')
  })
})
