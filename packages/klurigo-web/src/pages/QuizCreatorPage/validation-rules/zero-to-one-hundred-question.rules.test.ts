import type { ZeroToOneHundredQuestionDto } from '@klurigo/common'
import { MediaType, QuestionType } from '@klurigo/common'
import { describe, expect, it } from 'vitest'

import { validateDiscriminatedDto } from '../../../validation'

import { zeroToOneHundredQuestionRules } from './zero-to-one-hundred-question.rules'

describe('zeroToOneHundredQuestionRules (integration)', () => {
  it('should validate a happy-path Range question', () => {
    const dto: ZeroToOneHundredQuestionDto = {
      type: QuestionType.Range,
      question: 'HELLO',
      correct: 50,
      duration: 30,
      media: { type: MediaType.Image, url: 'https://example.com/a.png' },
      info: 'INFO',
    }

    const res = validateDiscriminatedDto(dto, zeroToOneHundredQuestionRules)

    expect(res.valid).toBe(true)
    expect(res.errors).toHaveLength(0)
  })

  it('should fail Range when correct is missing (required)', () => {
    const dto: unknown = {
      type: QuestionType.Range,
      question: 'HELLO',
      duration: 30,
    }

    const res = validateDiscriminatedDto(dto, zeroToOneHundredQuestionRules)

    expect(res.valid).toBe(false)
    expect(res.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: 'correct', code: 'required' }),
      ]),
    )
    expect(res.fields.correct).toBe(false)
  })

  it.each([0, 25, 100])('accepts whole-number answer %s', (correct) => {
    const dto: ZeroToOneHundredQuestionDto = {
      type: QuestionType.Range,
      question: 'HELLO',
      correct,
      duration: 30,
    }

    expect(
      validateDiscriminatedDto(dto, zeroToOneHundredQuestionRules).valid,
    ).toBe(true)
  })

  it.each([25.5, -1, 101])(
    'rejects invalid whole-number answer %s',
    (correct) => {
      const dto: ZeroToOneHundredQuestionDto = {
        type: QuestionType.Range,
        question: 'HELLO',
        correct,
        duration: 30,
      }

      const result = validateDiscriminatedDto(
        dto,
        zeroToOneHundredQuestionRules,
      )
      expect(result.fields.correct).toBe(false)
      expect(result.errors).toEqual(
        expect.arrayContaining([expect.objectContaining({ path: 'correct' })]),
      )
    },
  )
})
