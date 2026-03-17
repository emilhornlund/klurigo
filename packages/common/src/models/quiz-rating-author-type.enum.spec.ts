import { describe, expect, it } from 'vitest'

import { QuizRatingAuthorType } from './quiz-rating-author-type.enum'

describe('QuizRatingAuthorType', () => {
  const EXPECTED_VALUES = ['USER', 'ANONYMOUS']

  it('contains exactly two values', () => {
    const values = Object.values(QuizRatingAuthorType)
    expect(values).toHaveLength(2)
  })

  it('contains exactly the expected string values', () => {
    const values = Object.values(QuizRatingAuthorType)
    expect(values).toEqual(expect.arrayContaining(EXPECTED_VALUES))
  })

  it('does not contain any extra values', () => {
    const values = Object.values(QuizRatingAuthorType)
    expect(values.every((v) => EXPECTED_VALUES.includes(v))).toBe(true)
  })

  it('has User = "USER"', () => {
    expect(QuizRatingAuthorType.User).toBe('USER')
  })

  it('has Anonymous = "ANONYMOUS"', () => {
    expect(QuizRatingAuthorType.Anonymous).toBe('ANONYMOUS')
  })
})
