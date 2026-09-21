import {
  createMockGameDocument,
  createMockLobbyTaskDocument,
  createMockMultiChoiceQuestionDocument,
  createMockQuestionTaskDocument,
} from '../../../../test-utils/data'

import {
  validateAndGetQuestion,
  validateGameDocument,
} from './validation.utils'

describe('validation.utils', () => {
  describe('validateAndGetQuestion', () => {
    const mockQuestion = createMockMultiChoiceQuestionDocument()

    it('should return the question when valid game and index', () => {
      const mockGame = {
        ...createMockGameDocument(),
        questions: [mockQuestion],
        currentTask: createMockQuestionTaskDocument(),
      }
      const result = validateAndGetQuestion(mockGame)
      expect(result).toBe(mockQuestion)
    })

    it('should throw error when game has no questions', () => {
      const gameWithNoQuestions = {
        ...createMockGameDocument(),
        questions: [],
        currentTask: createMockQuestionTaskDocument(),
      }

      expect(() => validateAndGetQuestion(gameWithNoQuestions)).toThrow(
        'Game has no questions',
      )
    })

    it('should throw error when questions array is undefined', () => {
      const gameWithUndefinedQuestions = createMockGameDocument({
        questions: undefined as never,
        currentTask: createMockQuestionTaskDocument(),
      })

      expect(() =>
        validateAndGetQuestion(gameWithUndefinedQuestions as never),
      ).toThrow('Game has no questions')
    })

    it('should throw error when questionIndex is negative', () => {
      const gameWithNegativeIndex = {
        ...createMockGameDocument(),
        questions: [mockQuestion],
        currentTask: createMockQuestionTaskDocument({ questionIndex: -1 }),
      }

      expect(() => validateAndGetQuestion(gameWithNegativeIndex)).toThrow(
        'Question index -1 is out of bounds. Game has 1 questions (0-0)',
      )
    })

    it('should throw error when questionIndex is equal to questions length', () => {
      const gameWithIndexAtLength = {
        ...createMockGameDocument(),
        questions: [mockQuestion],
        currentTask: createMockQuestionTaskDocument({ questionIndex: 1 }),
      }

      expect(() => validateAndGetQuestion(gameWithIndexAtLength)).toThrow(
        'Question index 1 is out of bounds. Game has 1 questions (0-0)',
      )
    })

    it('should throw error when questionIndex is greater than questions length', () => {
      const gameWithIndexBeyondLength = {
        ...createMockGameDocument(),
        questions: [mockQuestion],
        currentTask: createMockQuestionTaskDocument({ questionIndex: 5 }),
      }

      expect(() => validateAndGetQuestion(gameWithIndexBeyondLength)).toThrow(
        'Question index 5 is out of bounds. Game has 1 questions (0-0)',
      )
    })

    it('should work with multiple questions and valid index', () => {
      const mockQuestions = [
        mockQuestion,
        createMockMultiChoiceQuestionDocument({ text: 'Second question' }),
        createMockMultiChoiceQuestionDocument({ text: 'Third question' }),
      ]

      const gameWithMultipleQuestions = {
        ...createMockGameDocument(),
        questions: mockQuestions,
        currentTask: createMockQuestionTaskDocument({ questionIndex: 1 }),
      }

      const result = validateAndGetQuestion(gameWithMultipleQuestions)
      expect(result).toBe(mockQuestions[1])
      expect(result.text).toBe('Second question')
    })

    it('should work with last valid index', () => {
      const mockQuestions = [
        mockQuestion,
        createMockMultiChoiceQuestionDocument({ text: 'Second question' }),
        createMockMultiChoiceQuestionDocument({ text: 'Third question' }),
      ]

      const gameWithLastIndex = {
        ...createMockGameDocument(),
        questions: mockQuestions,
        currentTask: createMockQuestionTaskDocument({ questionIndex: 2 }),
      }

      const result = validateAndGetQuestion(gameWithLastIndex)
      expect(result).toBe(mockQuestions[2])
      expect(result.text).toBe('Third question')
    })

    it('should work with index 0 when there are many questions', () => {
      const mockQuestions = Array.from({ length: 10 }, (_, i) => ({
        ...createMockMultiChoiceQuestionDocument(),
        text: `Question ${i}`,
      }))

      const gameWithZeroIndex = {
        ...createMockGameDocument(),
        questions: mockQuestions,
        currentTask: createMockQuestionTaskDocument(),
      }

      const result = validateAndGetQuestion(gameWithZeroIndex)
      expect(result).toBe(mockQuestions[0])
      expect(result.text).toBe('Question 0')
    })
  })

  describe('validateGameDocument', () => {
    it('should not throw when game document is valid', () => {
      const mockGame = createMockGameDocument()
      expect(() => validateGameDocument(mockGame)).not.toThrow()
    })

    it('should throw error when game document is null', () => {
      expect(() => validateGameDocument(null as never)).toThrow(
        'Game document is required',
      )
    })

    it('should throw error when game document is undefined', () => {
      expect(() => validateGameDocument(undefined as never)).toThrow(
        'Game document is required',
      )
    })

    it('should throw error when game document is empty object', () => {
      expect(() => validateGameDocument({} as never)).toThrow(
        'Game document must have an ID',
      )
    })

    it('should throw error when game document has no _id', () => {
      const gameWithoutId = createMockGameDocument({ _id: undefined })

      expect(() => validateGameDocument(gameWithoutId as never)).toThrow(
        'Game document must have an ID',
      )
    })

    it('should throw error when game document has null _id', () => {
      const gameWithNullId = createMockGameDocument({ _id: null as never })

      expect(() => validateGameDocument(gameWithNullId as never)).toThrow(
        'Game document must have an ID',
      )
    })

    it('should throw error when game document has empty string _id', () => {
      const gameWithEmptyId = createMockGameDocument({ _id: '' })

      expect(() => validateGameDocument(gameWithEmptyId as never)).toThrow(
        'Game document must have an ID',
      )
    })

    it('should throw error when game document has no currentTask', () => {
      const gameWithoutCurrentTask = createMockGameDocument({
        currentTask: undefined,
      })

      expect(() =>
        validateGameDocument(gameWithoutCurrentTask as never),
      ).toThrow('Game document must have a current task')
    })

    it('should throw error when game document has null currentTask', () => {
      const gameWithNullCurrentTask = createMockGameDocument({
        currentTask: null as never,
      })

      expect(() =>
        validateGameDocument(gameWithNullCurrentTask as never),
      ).toThrow('Game document must have a current task')
    })

    it('should work with valid game that has minimal required fields', () => {
      const minimalGame = {
        _id: createMockGameDocument()._id,
        currentTask: createMockLobbyTaskDocument(),
      }

      expect(() => validateGameDocument(minimalGame)).not.toThrow()
    })

    it('should work with different task types', () => {
      const gameWithQuestionTask = createMockGameDocument({
        currentTask: createMockQuestionTaskDocument({
          status: 'active',
          questionIndex: 0,
        }),
      })

      expect(() => validateGameDocument(gameWithQuestionTask)).not.toThrow()
    })

    it('should work with string ID', () => {
      const gameWithStringId = createMockGameDocument({ _id: 'string-id-123' })

      expect(() => validateGameDocument(gameWithStringId)).not.toThrow()
    })

    it('should work with numeric ID (as string)', () => {
      const gameWithNumericId = createMockGameDocument({ _id: '12345' })

      expect(() => validateGameDocument(gameWithNumericId)).not.toThrow()
    })
  })
})
