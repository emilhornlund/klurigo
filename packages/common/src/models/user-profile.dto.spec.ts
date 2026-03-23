import { describe, expect, it } from 'vitest'

import type { UserQuizzesPageFilterDto } from './quiz.dto'
import type { PublicUserProfileResponseDto } from './user'

describe('PublicUserProfileResponseDto shape', () => {
  const response: PublicUserProfileResponseDto = {
    id: 'user-1',
    nickname: 'QuizMaster',
    quizzesCount: 12,
    hostedGamesCount: 34,
    playedGamesCount: 56,
    createdAt: new Date('2024-01-15T12:00:00Z'),
  }

  it('includes the expected public profile fields', () => {
    expect(response.id).toBe('user-1')
    expect(response.nickname).toBe('QuizMaster')
    expect(response.quizzesCount).toBe(12)
    expect(response.hostedGamesCount).toBe(34)
    expect(response.playedGamesCount).toBe(56)
  })

  it('uses Date for createdAt', () => {
    expect(response.createdAt).toBeInstanceOf(Date)
  })
})

describe('UserQuizzesPageFilterDto shape', () => {
  const filter: UserQuizzesPageFilterDto = {
    sort: 'title',
    order: 'asc',
    limit: 10,
    offset: 0,
  }

  it('includes pagination fields', () => {
    expect(filter.limit).toBe(10)
    expect(filter.offset).toBe(0)
  })

  it('supports the expected sort values', () => {
    const allowedSorts: NonNullable<UserQuizzesPageFilterDto['sort']>[] = [
      'title',
      'created',
      'updated',
    ]

    expect(allowedSorts).toEqual(['title', 'created', 'updated'])
  })

  it('supports the expected order values', () => {
    const allowedOrders: NonNullable<UserQuizzesPageFilterDto['order']>[] = [
      'asc',
      'desc',
    ]

    expect(allowedOrders).toEqual(['asc', 'desc'])
  })
})
