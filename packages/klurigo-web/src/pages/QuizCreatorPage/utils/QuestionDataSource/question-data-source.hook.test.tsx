import type {
  QuestionDto,
  QuestionMultiChoiceDto,
  QuestionPinDto,
  QuestionPuzzleDto,
  QuestionRangeDto,
  QuestionTrueFalseDto,
  QuestionTypeAnswerDto,
  QuestionZeroToOneHundredRangeDto,
} from '@klurigo/common'
import { GameMode, QuestionType } from '@klurigo/common'
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import {
  buildPartialClassicMultiChoiceQuestionDto,
  buildPartialClassicPinQuestionDto,
  buildPartialClassicPuzzleQuestionDto,
  buildPartialClassicRangeQuestionDto,
  buildPartialClassicTrueFalseQuestionDto,
  buildPartialClassicTypeAnswerQuestionDto,
  buildPartialZeroToOneHundredRangeQuestionDto,
} from '../../../../utils/questions'

import { useQuestionDataSource } from './question-data-source.hook'

const makeValidClassicMultiChoice = (): Partial<QuestionMultiChoiceDto> => ({
  ...buildPartialClassicMultiChoiceQuestionDto(),
  question: 'HELLO',
  options: [{ value: 'A', correct: true }],
  points: 1000,
  duration: 30,
})

const makeValidClassicTrueFalse = (): Partial<QuestionTrueFalseDto> => ({
  ...buildPartialClassicTrueFalseQuestionDto(),
  question: 'HELLO',
  correct: true,
  points: 1000,
  duration: 30,
})

const makeValidClassicRange = (): Partial<QuestionRangeDto> => ({
  ...buildPartialClassicRangeQuestionDto(),
  question: 'HELLO',
  min: 0,
  max: 100,
  correct: 50,
  points: 1000,
  duration: 30,
})

const makeValidClassicTypeAnswer = (): Partial<QuestionTypeAnswerDto> => ({
  ...buildPartialClassicTypeAnswerQuestionDto(),
  question: 'HELLO',
  options: ['A'],
  points: 1000,
  duration: 30,
})

const makeValidClassicPin = (): Partial<QuestionPinDto> => ({
  ...buildPartialClassicPinQuestionDto(),
  question: 'HELLO',
  imageURL: 'https://example.com/image.png',
  positionX: 0.5,
  positionY: 0.5,
  points: 1000,
  duration: 30,
})

const makeValidClassicPuzzle = (): Partial<QuestionPuzzleDto> => ({
  ...buildPartialClassicPuzzleQuestionDto(),
  question: 'HELLO',
  values: ['A', 'B'],
  points: 1000,
  duration: 30,
})

const makeValidZeroToOneHundredRange =
  (): Partial<QuestionZeroToOneHundredRangeDto> => ({
    ...buildPartialZeroToOneHundredRangeQuestionDto(),
    question: 'HELLO',
    correct: 50,
    duration: 30,
  })

const expectThrowInAct = (fn: () => void, message: string) => {
  expect(() => {
    act(() => {
      fn()
    })
  }).toThrow(message)
}

describe('useQuestionDataSource', () => {
  describe('initial state', () => {
    it('starts uninitialized', () => {
      const { result } = renderHook(() => useQuestionDataSource())

      expect(result.current.gameMode).toBeUndefined()
      expect(result.current.questions).toEqual([])
      expect(result.current.selectedQuestionIndex).toBe(-1)
      expect(result.current.selectedQuestion).toBeUndefined()
      expect(result.current.questionValidations).toEqual([])
      expect(result.current.allQuestionsValid).toBe(false)
    })
  })

  describe('guards: throws when mode is missing', () => {
    it('selectQuestion throws', () => {
      const { result } = renderHook(() => useQuestionDataSource())
      expect(() => result.current.selectQuestion(0)).toThrow(
        'Invalid game mode',
      )
    })

    it('addQuestion throws', () => {
      const { result } = renderHook(() => useQuestionDataSource())
      expect(() => result.current.addQuestion(QuestionType.TrueFalse)).toThrow(
        'Invalid game mode',
      )
    })

    it('duplicateQuestion throws', () => {
      const { result } = renderHook(() => useQuestionDataSource())
      expect(() => result.current.duplicateQuestion(0)).toThrow(
        'Invalid game mode',
      )
    })

    it('deleteQuestion throws', () => {
      const { result } = renderHook(() => useQuestionDataSource())
      expect(() => result.current.deleteQuestion(0)).toThrow(
        'Invalid game mode',
      )
    })

    it('replaceQuestion throws', () => {
      const { result } = renderHook(() => useQuestionDataSource())
      expect(() =>
        result.current.replaceQuestion(QuestionType.TrueFalse),
      ).toThrow('Invalid game mode')
    })

    it('updateSelectedQuestionField throws', () => {
      const { result } = renderHook(() => useQuestionDataSource())
      expect(() =>
        result.current.updateSelectedQuestionField('question', 'X'),
      ).toThrow('Invalid game mode')
    })
  })

  describe('setGameMode', () => {
    it('Classic initializes one question and selects it', () => {
      const { result } = renderHook(() => useQuestionDataSource())

      act(() => result.current.setGameMode(GameMode.Classic))

      expect(result.current.gameMode).toBe(GameMode.Classic)
      expect(result.current.questions).toHaveLength(1)
      expect(result.current.selectedQuestionIndex).toBe(0)
      expect(result.current.selectedQuestion).toBeDefined()
    })

    it('ZeroToOneHundred initializes one question and selects it', () => {
      const { result } = renderHook(() => useQuestionDataSource())

      act(() => result.current.setGameMode(GameMode.ZeroToOneHundred))

      expect(result.current.gameMode).toBe(GameMode.ZeroToOneHundred)
      expect(result.current.questions).toHaveLength(1)
      expect(result.current.selectedQuestionIndex).toBe(0)
      expect(result.current.selectedQuestion).toBeDefined()
    })

    it('can reapply a mode without resetting the current questions', () => {
      const { result } = renderHook(() => useQuestionDataSource())
      const questions = [
        makeValidClassicMultiChoice(),
        makeValidClassicTrueFalse(),
      ]

      act(() => result.current.setGameMode(GameMode.Classic))
      act(() => result.current.setQuestions(questions))

      act(() => result.current.setGameModeWithoutReset(GameMode.Classic))

      expect(result.current.questions).toEqual(questions)
      expect(result.current.selectedQuestionIndex).toBe(0)
    })

    it('resets questions when the user intentionally selects a mode', () => {
      const { result } = renderHook(() => useQuestionDataSource())

      act(() => result.current.setGameMode(GameMode.Classic))
      act(() =>
        result.current.setQuestions([
          makeValidClassicMultiChoice(),
          makeValidClassicTrueFalse(),
        ]),
      )

      act(() => result.current.setGameMode(GameMode.ZeroToOneHundred))

      expect(result.current.gameMode).toBe(GameMode.ZeroToOneHundred)
      expect(result.current.questions).toHaveLength(1)
      expect(result.current.questions[0]?.type).toBe(QuestionType.Range)
      expect(result.current.selectedQuestionIndex).toBe(0)
    })

    it('replaces questions and selects the first item atomically', () => {
      const { result } = renderHook(() => useQuestionDataSource())
      const questions = [makeValidClassicMultiChoice()]

      act(() => result.current.setGameModeWithoutReset(GameMode.Classic))
      act(() => result.current.setQuestionsAndSelect(questions))

      expect(result.current.questions).toEqual(questions)
      expect(result.current.selectedQuestionIndex).toBe(0)
    })
  })

  describe('selectQuestion', () => {
    it('selects the requested index', () => {
      const { result } = renderHook(() => useQuestionDataSource())

      act(() => result.current.setGameMode(GameMode.Classic))
      act(() => {
        result.current.setQuestions([
          makeValidClassicMultiChoice(),
          makeValidClassicTrueFalse(),
          makeValidClassicRange(),
        ])
      })
      act(() => result.current.selectQuestion(2))

      expect(result.current.selectedQuestionIndex).toBe(2)
      expect(result.current.selectedQuestion?.type).toBe(QuestionType.Range)
    })

    it('throws for invalid index', () => {
      const { result } = renderHook(() => useQuestionDataSource())

      act(() => result.current.setGameMode(GameMode.Classic))

      expect(() => result.current.selectQuestion(99)).toThrow(
        'Invalid question index',
      )
    })

    it('selectedQuestion becomes undefined when selection becomes invalid via delete', () => {
      const { result } = renderHook(() => useQuestionDataSource())

      act(() => result.current.setGameMode(GameMode.Classic))
      act(() => {
        result.current.setQuestions([
          makeValidClassicMultiChoice(),
          makeValidClassicTrueFalse(),
        ])
      })
      act(() => result.current.selectQuestion(1))

      act(() => result.current.deleteQuestion(1))

      expect(result.current.selectedQuestionIndex).toBe(0)
      expect(result.current.selectedQuestion).toBeDefined()
    })
  })

  describe('questionValidations / allQuestionsValid', () => {
    it('questionValidations length matches questions length across mutations', () => {
      const { result } = renderHook(() => useQuestionDataSource())

      act(() => result.current.setGameMode(GameMode.Classic))
      expect(result.current.questionValidations).toHaveLength(
        result.current.questions.length,
      )

      act(() => result.current.addQuestion(QuestionType.TrueFalse))
      expect(result.current.questionValidations).toHaveLength(
        result.current.questions.length,
      )

      act(() => result.current.duplicateQuestion(0))
      expect(result.current.questionValidations).toHaveLength(
        result.current.questions.length,
      )

      act(() => result.current.deleteQuestion(1))
      expect(result.current.questionValidations).toHaveLength(
        result.current.questions.length,
      )
    })

    it('allQuestionsValid is boolean and computed for a complete Classic set', () => {
      const { result } = renderHook(() => useQuestionDataSource())

      act(() => result.current.setGameMode(GameMode.Classic))
      act(() => {
        result.current.setQuestions([
          makeValidClassicMultiChoice(),
          makeValidClassicTrueFalse(),
          makeValidClassicRange(),
          makeValidClassicTypeAnswer(),
          makeValidClassicPin(),
          makeValidClassicPuzzle(),
        ])
      })
      act(() => result.current.selectQuestion(0))

      expect(result.current.questionValidations).toHaveLength(6)
      expect(typeof result.current.allQuestionsValid).toBe('boolean')
    })
  })

  describe('updateSelectedQuestionField', () => {
    it('updates the selected question', () => {
      const { result } = renderHook(() => useQuestionDataSource())

      act(() => result.current.setGameMode(GameMode.Classic))
      act(() => {
        result.current.setQuestions([makeValidClassicMultiChoice()])
      })
      act(() => result.current.selectQuestion(0))
      act(() => {
        result.current.updateSelectedQuestionField('question', 'UPDATED')
      })

      expect(result.current.questions[0]?.question).toBe('UPDATED')
      expect(result.current.selectedQuestion?.question).toBe('UPDATED')
    })

    it('throws when no valid question is selected (selectedQuestionIndex = -1)', () => {
      const { result } = renderHook(() => useQuestionDataSource())

      act(() => result.current.setGameMode(GameMode.Classic))

      act(() => {
        result.current.setQuestions([makeValidClassicMultiChoice()])
      })

      act(() => {
        result.current.selectQuestion(0)
      })

      act(() => {
        result.current.deleteQuestion(0)
      })

      expect(result.current.selectedQuestionIndex).toBe(-1)

      expectThrowInAct(
        () => result.current.updateSelectedQuestionField('question', 'X'),
        'Invalid question index',
      )
    })

    it('throws when selectedQuestionIndex is out of bounds', () => {
      const { result } = renderHook(() => useQuestionDataSource())

      act(() => result.current.setGameMode(GameMode.Classic))
      act(() => result.current.setQuestions([makeValidClassicMultiChoice()]))
      act(() => result.current.selectQuestion(0))

      act(() => {
        result.current.setQuestions([])
      })

      expect(result.current.questions).toHaveLength(0)
      expect(result.current.selectedQuestionIndex).toBe(0)

      expectThrowInAct(
        () => result.current.updateSelectedQuestionField('question', 'X'),
        'Invalid question index',
      )
    })
  })

  describe('addQuestion', () => {
    it('appends and selects the new question', () => {
      const { result } = renderHook(() => useQuestionDataSource())

      act(() => result.current.setGameMode(GameMode.Classic))
      act(() => {
        result.current.setQuestions([makeValidClassicMultiChoice()])
      })
      act(() => result.current.selectQuestion(0))
      act(() => result.current.addQuestion(QuestionType.TrueFalse))

      expect(result.current.questions).toHaveLength(2)
      expect(result.current.selectedQuestionIndex).toBe(1)
      expect(result.current.selectedQuestion?.type).toBe(QuestionType.TrueFalse)
    })
  })

  describe('duplicateQuestion', () => {
    it('throws for invalid index', () => {
      const { result } = renderHook(() => useQuestionDataSource())

      act(() => result.current.setGameMode(GameMode.Classic))
      act(() => result.current.setQuestions([makeValidClassicMultiChoice()]))

      expectThrowInAct(
        () => result.current.duplicateQuestion(99),
        'Invalid question index',
      )
    })

    it('inserts a deep copy (options array is not shared)', () => {
      const { result } = renderHook(() => useQuestionDataSource())

      act(() => result.current.setGameMode(GameMode.Classic))
      act(() => {
        result.current.setQuestions([makeValidClassicMultiChoice()])
      })
      act(() => result.current.selectQuestion(0))
      act(() => result.current.duplicateQuestion(0))

      expect(result.current.questions).toHaveLength(2)

      const original = result.current.questions[0] as Partial<
        Extract<QuestionDto, { type: QuestionType.MultiChoice }>
      >
      const copy = result.current.questions[1] as Partial<
        Extract<QuestionDto, { type: QuestionType.MultiChoice }>
      >

      expect(original).not.toBe(copy)
      expect(original.options).toBeDefined()
      expect(copy.options).toBeDefined()

      act(() => {
        if (!original.options || !copy.options) {
          throw new Error('Missing options in test data')
        }
        original.options[0].value = 'CHANGED'
      })

      expect(copy.options?.[0].value).toBe('A')
    })
  })

  describe('moveSelectedQuestionTo', () => {
    it('throws for invalid target index', () => {
      const { result } = renderHook(() => useQuestionDataSource())

      act(() => result.current.setGameMode(GameMode.Classic))
      act(() => {
        result.current.setQuestions([
          makeValidClassicMultiChoice(),
          makeValidClassicTrueFalse(),
          makeValidClassicRange(),
        ])
      })
      act(() => result.current.selectQuestion(1))

      expectThrowInAct(
        () => result.current.moveSelectedQuestionTo(99),
        'Invalid question index',
      )
    })

    it('throws when no valid question is selected (selectedQuestionIndex = -1)', () => {
      const { result } = renderHook(() => useQuestionDataSource())

      act(() => result.current.setGameMode(GameMode.Classic))
      act(() => {
        result.current.setQuestions([
          makeValidClassicMultiChoice(),
          makeValidClassicTrueFalse(),
        ])
      })

      expect(result.current.selectedQuestionIndex).toBe(0)

      act(() => result.current.deleteQuestion(0))
      act(() => result.current.deleteQuestion(0))

      expect(result.current.selectedQuestionIndex).toBe(-1)

      expectThrowInAct(
        () => result.current.moveSelectedQuestionTo(0),
        'Invalid question index',
      )
    })

    it('does nothing when moving to the same index', () => {
      const { result } = renderHook(() => useQuestionDataSource())

      act(() => result.current.setGameMode(GameMode.Classic))
      act(() => {
        result.current.setQuestions([
          makeValidClassicMultiChoice(),
          makeValidClassicTrueFalse(),
          makeValidClassicRange(),
        ])
      })
      act(() => result.current.selectQuestion(1))

      const before = result.current.questions

      act(() => result.current.moveSelectedQuestionTo(1))

      expect(result.current.selectedQuestionIndex).toBe(1)
      expect(result.current.questions).toEqual(before)
    })

    it('moves the selected question forward in the list and preserves relative order', () => {
      const { result } = renderHook(() => useQuestionDataSource())

      act(() => result.current.setGameMode(GameMode.Classic))
      act(() => {
        result.current.setQuestions([
          makeValidClassicMultiChoice(), // 0
          makeValidClassicTrueFalse(), // 1
          makeValidClassicRange(), // 2
        ])
      })

      act(() => result.current.selectQuestion(0))
      act(() => result.current.moveSelectedQuestionTo(2))

      expect(result.current.selectedQuestionIndex).toBe(2)
      expect(result.current.questions.map((q) => q.type)).toEqual([
        QuestionType.TrueFalse,
        QuestionType.Range,
        QuestionType.MultiChoice,
      ])
    })

    it('moves the selected question backward in the list and preserves relative order', () => {
      const { result } = renderHook(() => useQuestionDataSource())

      act(() => result.current.setGameMode(GameMode.Classic))
      act(() => {
        result.current.setQuestions([
          makeValidClassicMultiChoice(), // 0
          makeValidClassicTrueFalse(), // 1
          makeValidClassicRange(), // 2
        ])
      })

      act(() => result.current.selectQuestion(2))
      act(() => result.current.moveSelectedQuestionTo(0))

      expect(result.current.selectedQuestionIndex).toBe(0)
      expect(result.current.questions.map((q) => q.type)).toEqual([
        QuestionType.Range,
        QuestionType.MultiChoice,
        QuestionType.TrueFalse,
      ])
    })
  })

  describe('deleteQuestion', () => {
    it('throws for invalid index', () => {
      const { result } = renderHook(() => useQuestionDataSource())

      act(() => result.current.setGameMode(GameMode.Classic))
      act(() => result.current.setQuestions([makeValidClassicMultiChoice()]))

      expectThrowInAct(
        () => result.current.deleteQuestion(99),
        'Invalid question index',
      )
    })

    it('clears selection when deleting last question', () => {
      const { result } = renderHook(() => useQuestionDataSource())

      act(() => result.current.setGameMode(GameMode.Classic))
      act(() => {
        result.current.setQuestions([makeValidClassicMultiChoice()])
      })
      act(() => result.current.selectQuestion(0))
      act(() => result.current.deleteQuestion(0))

      expect(result.current.questions).toEqual([])
      expect(result.current.selectedQuestionIndex).toBe(-1)
      expect(result.current.selectedQuestion).toBeUndefined()
    })

    it('selects nearest remaining item when deleting the selected index (not last)', () => {
      const { result } = renderHook(() => useQuestionDataSource())

      act(() => result.current.setGameMode(GameMode.Classic))
      act(() => {
        result.current.setQuestions([
          makeValidClassicMultiChoice(),
          makeValidClassicTrueFalse(),
          makeValidClassicRange(),
        ])
      })
      act(() => result.current.selectQuestion(1))
      act(() => result.current.deleteQuestion(1))

      expect(result.current.questions).toHaveLength(2)
      expect(result.current.selectedQuestionIndex).toBe(1)
      expect(result.current.selectedQuestion?.type).toBe(QuestionType.Range)
    })

    it('shifts selection when deleting an item before the selection', () => {
      const { result } = renderHook(() => useQuestionDataSource())

      act(() => result.current.setGameMode(GameMode.Classic))
      act(() => {
        result.current.setQuestions([
          makeValidClassicMultiChoice(),
          makeValidClassicTrueFalse(),
          makeValidClassicRange(),
        ])
      })
      act(() => result.current.selectQuestion(2))
      act(() => result.current.deleteQuestion(0))

      expect(result.current.questions).toHaveLength(2)
      expect(result.current.selectedQuestionIndex).toBe(1)
      expect(result.current.selectedQuestion?.type).toBe(QuestionType.Range)
    })

    it('does not change selection when deleting an item after the selection', () => {
      const { result } = renderHook(() => useQuestionDataSource())

      act(() => result.current.setGameMode(GameMode.Classic))
      act(() => {
        result.current.setQuestions([
          makeValidClassicMultiChoice(),
          makeValidClassicTrueFalse(),
          makeValidClassicRange(),
        ])
      })
      act(() => result.current.selectQuestion(0))
      act(() => result.current.deleteQuestion(2))

      expect(result.current.selectedQuestionIndex).toBe(0)
      expect(result.current.selectedQuestion?.type).toBe(
        QuestionType.MultiChoice,
      )
    })
  })

  describe('replaceQuestion', () => {
    it('throws when no valid question is selected', () => {
      const { result } = renderHook(() => useQuestionDataSource())

      act(() => result.current.setGameMode(GameMode.Classic))

      act(() => {
        result.current.setQuestions([makeValidClassicMultiChoice()])
      })

      act(() => {
        result.current.selectQuestion(0)
      })

      act(() => {
        result.current.deleteQuestion(0)
      })

      expect(result.current.selectedQuestionIndex).toBe(-1)

      expectThrowInAct(
        () => result.current.replaceQuestion(QuestionType.TrueFalse),
        'Invalid question index',
      )
    })

    it('replaces selected question and preserves Classic shared fields (question)', () => {
      const { result } = renderHook(() => useQuestionDataSource())

      act(() => result.current.setGameMode(GameMode.Classic))
      act(() => {
        result.current.setQuestions([makeValidClassicMultiChoice()])
      })
      act(() => result.current.selectQuestion(0))
      act(() =>
        result.current.updateSelectedQuestionField('question', 'PRESERVE_ME'),
      )
      act(() => result.current.replaceQuestion(QuestionType.TrueFalse))

      expect(result.current.selectedQuestion?.type).toBe(QuestionType.TrueFalse)
      expect(result.current.selectedQuestion?.question).toBe('PRESERVE_ME')
    })

    it('preserves Classic shared fields (info) when replacing between non-Pin types', () => {
      const { result } = renderHook(() => useQuestionDataSource())

      act(() => result.current.setGameMode(GameMode.Classic))
      act(() => result.current.setQuestions([makeValidClassicMultiChoice()]))
      act(() => result.current.selectQuestion(0))
      act(() => result.current.updateSelectedQuestionField('info', 'KEEP_ME'))
      act(() => result.current.replaceQuestion(QuestionType.TrueFalse))

      expect(result.current.selectedQuestion?.info).toBe('KEEP_ME')
    })
  })

  describe('ZeroToOneHundred mode', () => {
    it('works with a valid Range question', () => {
      const { result } = renderHook(() => useQuestionDataSource())

      act(() => result.current.setGameMode(GameMode.ZeroToOneHundred))
      act(() => {
        result.current.setQuestions([makeValidZeroToOneHundredRange()])
      })
      act(() => result.current.selectQuestion(0))

      expect(result.current.gameMode).toBe(GameMode.ZeroToOneHundred)
      expect(result.current.questions).toHaveLength(1)
      expect(result.current.selectedQuestion?.type).toBe(QuestionType.Range)
      expect(result.current.questionValidations).toHaveLength(1)
    })

    it('addQuestion throws in ZeroToOneHundred mode for non-Range type', () => {
      const { result } = renderHook(() => useQuestionDataSource())

      act(() => result.current.setGameMode(GameMode.ZeroToOneHundred))

      expectThrowInAct(
        () => result.current.addQuestion(QuestionType.TrueFalse),
        'Unsupported question type',
      )
    })
  })
})
