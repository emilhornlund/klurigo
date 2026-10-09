import { describe, expect, it } from 'vitest'

import { getQuestionPreviewDurationMs } from './question-preview-duration.utils'

describe('getQuestionPreviewDurationMs', () => {
  it('uses the greater of reading and character durations', () => {
    const question = 'Short question?'
    const readingDurationMs = (2 / 220) * 60_000
    const characterDurationMs = question.length * 100

    expect(getQuestionPreviewDurationMs(question)).toBe(
      Math.max(readingDurationMs, characterDurationMs),
    )
  })

  it('caps the character duration at 15 seconds', () => {
    expect(getQuestionPreviewDurationMs('x'.repeat(1000))).toBe(15_000)
  })

  it('preserves the reading duration when it exceeds the character duration', () => {
    const question = Array.from({ length: 220 }, () => 'word').join(' ')

    expect(getQuestionPreviewDurationMs(question)).toBe(60_000)
  })
})
