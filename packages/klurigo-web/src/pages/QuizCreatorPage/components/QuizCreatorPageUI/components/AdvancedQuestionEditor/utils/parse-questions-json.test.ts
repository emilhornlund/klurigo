import { GameMode, QUIZ_QUESTION_MAX, QUIZ_QUESTION_MIN } from '@klurigo/common'
import { describe, expect, it, vi } from 'vitest'

import { parseQuestionsJson } from './parse-questions-json'

// IMPORTANT: mock the guards module used by parseQuestionsJson.
vi.mock('../../../../../../../utils/questions', () => ({
  isClassicMultiChoiceQuestion: vi.fn(),
  isClassicTrueFalseQuestion: vi.fn(),
  isClassicRangeQuestion: vi.fn(),
  isClassicTypeAnswerQuestion: vi.fn(),
  isClassicPinQuestion: vi.fn(),
  isClassicPuzzleQuestion: vi.fn(),
  isZeroToOneHundredRangeQuestion: vi.fn(),
}))

// eslint-disable-next-line import/order
import {
  isClassicMultiChoiceQuestion,
  isClassicPinQuestion,
  isClassicPuzzleQuestion,
  isClassicRangeQuestion,
  isClassicTrueFalseQuestion,
  isClassicTypeAnswerQuestion,
  isZeroToOneHundredRangeQuestion,
} from '../../../../../../../utils/questions'

type Guards = {
  isClassicMultiChoiceQuestion: ReturnType<typeof vi.fn>
  isClassicTrueFalseQuestion: ReturnType<typeof vi.fn>
  isClassicRangeQuestion: ReturnType<typeof vi.fn>
  isClassicTypeAnswerQuestion: ReturnType<typeof vi.fn>
  isClassicPinQuestion: ReturnType<typeof vi.fn>
  isClassicPuzzleQuestion: ReturnType<typeof vi.fn>
  isZeroToOneHundredRangeQuestion: ReturnType<typeof vi.fn>
}

const guards = {
  isClassicMultiChoiceQuestion,
  isClassicTrueFalseQuestion,
  isClassicRangeQuestion,
  isClassicTypeAnswerQuestion,
  isClassicPinQuestion,
  isClassicPuzzleQuestion,
  isZeroToOneHundredRangeQuestion,
} as unknown as Guards

const resetGuards = () => {
  Object.values(guards).forEach((fn) => fn.mockReset())
}

const allFalse = () => {
  Object.values(guards).forEach((fn) => fn.mockReturnValue(false))
}

describe('parseQuestionsJson', () => {
  it('throws when root element is not an array', () => {
    resetGuards()
    expect(() => parseQuestionsJson({} as unknown, GameMode.Classic)).toThrow(
      /Unexpected root element\. Expected array got object\./,
    )
    expect(() => parseQuestionsJson('x' as unknown, GameMode.Classic)).toThrow(
      /Unexpected root element\. Expected array got string\./,
    )
    expect(() => parseQuestionsJson(123 as unknown, GameMode.Classic)).toThrow(
      /Unexpected root element\. Expected array got number\./,
    )
  })

  it('throws when array length is smaller than QUIZ_QUESTION_MIN', () => {
    resetGuards()
    allFalse()

    // Make the first guard return true for any element, so the mapper succeeds.
    guards.isClassicMultiChoiceQuestion.mockReturnValue(true)

    const tooShort = Array.from(
      { length: Math.max(QUIZ_QUESTION_MIN - 1, 0) },
      (_, i) => ({ id: `q-${i}` }),
    )

    expect(() => parseQuestionsJson(tooShort, GameMode.Classic)).toThrow(
      new RegExp(
        `Invalid length for field 'questions'\\. Expected at least ${QUIZ_QUESTION_MIN}, got ${tooShort.length}\\.`,
      ),
    )
  })

  it('throws when array length is larger than QUIZ_QUESTION_MAX', () => {
    resetGuards()
    allFalse()

    guards.isClassicMultiChoiceQuestion.mockReturnValue(true)

    const tooLong = Array.from({ length: QUIZ_QUESTION_MAX + 1 }, (_, i) => ({
      id: `q-${i}`,
    }))

    expect(() => parseQuestionsJson(tooLong, GameMode.Classic)).toThrow(
      new RegExp(
        `Invalid length for field 'questions'\\. Expected at most ${QUIZ_QUESTION_MAX}, got ${tooLong.length}\\.`,
      ),
    )
  })

  it('returns the same question objects for supported questions (Classic MultiChoice path)', () => {
    resetGuards()
    allFalse()

    const q1 = { type: 'MultiChoice', question: 'A' }
    const q2 = { type: 'MultiChoice', question: 'B' }
    const arr = Array.from(
      { length: Math.max(QUIZ_QUESTION_MIN, 2) },
      (_, i) => (i === 0 ? q1 : i === 1 ? q2 : { type: 'MultiChoice' }),
    )

    guards.isClassicMultiChoiceQuestion.mockImplementation(
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      (_mode: unknown, _q: unknown) => true,
    )

    const res = parseQuestionsJson(arr, GameMode.Classic)
    expect(res).toHaveLength(arr.length)
    expect(res[0]).toBe(q1)
    expect(res[1]).toBe(q2)

    // Ensure guards were called with (gameMode, question)
    expect(guards.isClassicMultiChoiceQuestion).toHaveBeenCalled()
    const firstCall = guards.isClassicMultiChoiceQuestion.mock.calls[0]
    expect(firstCall[0]).toBe(GameMode.Classic)
    expect(firstCall[1]).toBe(arr[0])
  })

  it('routes to the first matching guard for each element (Classic path ordering)', () => {
    resetGuards()
    allFalse()

    const q = { any: 'thing' }
    const arr = Array.from({ length: QUIZ_QUESTION_MIN }, () => q)

    // Make MultiChoice false, TrueFalse true => should return via TrueFalse
    guards.isClassicMultiChoiceQuestion.mockReturnValue(false)
    guards.isClassicTrueFalseQuestion.mockReturnValue(true)

    const res = parseQuestionsJson(arr, GameMode.Classic)
    expect(res).toHaveLength(arr.length)
    expect(res[0]).toBe(q)

    // Ensures later classic guards are not necessary once TrueFalse matches
    expect(guards.isClassicRangeQuestion).not.toHaveBeenCalled()
    expect(guards.isClassicTypeAnswerQuestion).not.toHaveBeenCalled()
    expect(guards.isClassicPinQuestion).not.toHaveBeenCalled()
    expect(guards.isClassicPuzzleQuestion).not.toHaveBeenCalled()
    expect(guards.isZeroToOneHundredRangeQuestion).not.toHaveBeenCalled()
  })

  it('accepts every supported question type at its matching guard', () => {
    const supportedGuards = [
      guards.isClassicMultiChoiceQuestion,
      guards.isClassicTrueFalseQuestion,
      guards.isClassicRangeQuestion,
      guards.isClassicTypeAnswerQuestion,
      guards.isClassicPinQuestion,
      guards.isClassicPuzzleQuestion,
      guards.isZeroToOneHundredRangeQuestion,
    ]

    supportedGuards.forEach((matchingGuard) => {
      resetGuards()
      allFalse()
      matchingGuard.mockReturnValue(true)
      const question = { type: 'supported' }

      expect(
        parseQuestionsJson(
          Array.from({ length: QUIZ_QUESTION_MIN }, () => question),
          GameMode.Classic,
        )[0],
      ).toBe(question)
    })
  })

  it('supports ZeroToOneHundred range questions via isZeroToOneHundredRangeQuestion', () => {
    resetGuards()
    allFalse()

    const q = { type: 'Range', question: '0-100' }
    const arr = Array.from({ length: QUIZ_QUESTION_MIN }, (_, i) =>
      i === 0 ? q : { type: 'Range' },
    )

    guards.isZeroToOneHundredRangeQuestion.mockReturnValue(true)

    const res = parseQuestionsJson(arr, GameMode.ZeroToOneHundred)
    expect(res).toHaveLength(arr.length)
    expect(res[0]).toBe(q)

    expect(guards.isZeroToOneHundredRangeQuestion).toHaveBeenCalled()
    const firstCall = guards.isZeroToOneHundredRangeQuestion.mock.calls[0]
    expect(firstCall[0]).toBe(GameMode.ZeroToOneHundred)
    expect(firstCall[1]).toBe(arr[0])
  })

  it('throws "Unsupported game mode or question type" when no guard matches for an element', () => {
    resetGuards()
    allFalse()

    const arr = Array.from({ length: QUIZ_QUESTION_MIN }, (_, i) => ({
      id: `q-${i}`,
    }))

    expect(() => parseQuestionsJson(arr, GameMode.Classic)).toThrow(
      'Unsupported game mode or question type',
    )
  })
})
