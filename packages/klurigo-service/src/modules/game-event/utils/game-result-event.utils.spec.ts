import {
  arraysEqual,
  GameEventQuestionResults,
  GameEventQuestionResultsMultiChoice,
  GameEventQuestionResultsPin,
  GameEventQuestionResultsPuzzle,
  GameEventQuestionResultsRange,
  GameEventQuestionResultsTrueFalse,
  GameEventQuestionResultsTypeAnswer,
  GameEventType,
  GameMode,
  GameResultHostEvent,
  QuestionMediaEvent,
  QuestionPinTolerance,
  QuestionType,
} from '@klurigo/common'
import { v4 as uuidv4 } from 'uuid'

import {
  createMockGameDocument,
  createMockGamePlayerParticipantDocument,
  createMockLeaderboardTaskDocument,
  createMockMultiChoiceQuestionDocument,
  createMockPinQuestionDocument,
  createMockPuzzleQuestionDocument,
  createMockQuestionResultTaskDocument,
  createMockQuestionResultTaskItemDocument,
  createMockQuestionTaskMultiChoiceAnswer,
  createMockQuestionTaskPinAnswer,
  createMockQuestionTaskPuzzleAnswer,
  createMockQuestionTaskRangeAnswer,
  createMockQuestionTaskTrueFalseAnswer,
  createMockQuestionTaskTypeAnswer,
  createMockRangeQuestionDocument,
  createMockTrueFalseQuestionDocument,
  createMockTypeAnswerQuestionDocument,
  MOCK_TYPE_ANSWER_INCORRECT_OPTION_VALUE,
  MOCK_TYPE_ANSWER_OPTION_VALUE,
  MOCK_TYPE_ANSWER_OPTION_VALUE_ALTERNATIVE,
} from '../../../../test-utils/data'
import { Game, TaskType } from '../../game-core/repositories/models/schemas'
import { IllegalTaskTypeException } from '../../game-task/exceptions'

import {
  buildGameResultHostEvent,
  buildGameResultPlayerEvent,
} from './game-result-event.utils'

describe('Game Result Event Utils', () => {
  describe('buildGameResultHostEvent', () => {
    describe('aggregates MultiChoice distribution when current task is QuestionResult', () => {
      it('should handle mixed correct and incorrect answers', () => {
        const gameDocument = createMultiChoiceGame([0, 1, 0], [0])

        const actual = buildGameResultHostEvent(gameDocument as never)

        const expected = buildExpectedMultiChoiceDistribution(gameDocument, [
          { value: 'Stockholm', count: 2, correct: true, index: 0 },
          { value: 'Paris', count: 1, correct: false, index: 1 },
        ])

        expect(actual).toEqual(expected)
      })

      it('should handle multiple correct answers', () => {
        const gameDocument = createMultiChoiceGame([0, 2, 2, 1], [0, 2])

        const actual = buildGameResultHostEvent(gameDocument as never)

        const expected = buildExpectedMultiChoiceDistribution(gameDocument, [
          { value: 'London', count: 2, correct: true, index: 2 },
          { value: 'Stockholm', count: 1, correct: true, index: 0 },
          { value: 'Paris', count: 1, correct: false, index: 1 },
        ])

        expect(actual).toEqual(expected)
      })

      it('should handle all answers being correct', () => {
        const gameDocument = createMultiChoiceGame([0, 0, 0], [0])

        const actual = buildGameResultHostEvent(gameDocument as never)

        const expected = buildExpectedMultiChoiceDistribution(gameDocument, [
          { value: 'Stockholm', count: 3, correct: true, index: 0 },
        ])

        expect(actual).toEqual(expected)
      })

      it('should handle all answers being incorrect', () => {
        const gameDocument = createMultiChoiceGame([1, 1, 2], [0])

        const actual = buildGameResultHostEvent(gameDocument as never)

        const expected = buildExpectedMultiChoiceDistribution(gameDocument, [
          { value: 'Stockholm', count: 0, correct: true, index: 0 },
          { value: 'Paris', count: 2, correct: false, index: 1 },
          { value: 'London', count: 1, correct: false, index: 2 },
        ])

        expect(actual).toEqual(expected)
      })

      it('should handle no submitted answers', () => {
        const gameDocument = createMultiChoiceGame([], [0])

        const actual = buildGameResultHostEvent(gameDocument as never)

        const expected = buildExpectedMultiChoiceDistribution(gameDocument, [
          { value: 'Stockholm', count: 0, correct: true, index: 0 },
        ])

        expect(actual).toEqual(expected)
      })

      it('should handle no correct answers', () => {
        const gameDocument = createMultiChoiceGame([0, 1, 2, 3], [])

        const actual = buildGameResultHostEvent(gameDocument as never)

        const expected = buildExpectedMultiChoiceDistribution(gameDocument, [
          { value: 'Stockholm', count: 1, correct: false, index: 0 },
          { value: 'Paris', count: 1, correct: false, index: 1 },
          { value: 'London', count: 1, correct: false, index: 2 },
          { value: 'Berlin', count: 1, correct: false, index: 3 },
        ])

        expect(actual).toEqual(expected)
      })

      it('should ignore out-of-bounds indexes', () => {
        const gameDocument = createMultiChoiceGame([0, 5, 1], [0])

        const actual = buildGameResultHostEvent(gameDocument as never)

        const expected = buildExpectedMultiChoiceDistribution(gameDocument, [
          { value: 'Stockholm', count: 1, correct: true, index: 0 },
          { value: 'Paris', count: 1, correct: false, index: 1 },
        ])

        expect(actual).toEqual(expected)
      })

      it('should sort by correct status first, then by count, then by index', () => {
        const gameDocument = createMultiChoiceGame([0, 1, 0], [0])

        const actual = buildGameResultHostEvent(gameDocument as never)

        const expected = buildExpectedMultiChoiceDistribution(gameDocument, [
          { value: 'Stockholm', count: 2, correct: true, index: 0 },
          { value: 'Paris', count: 1, correct: false, index: 1 },
        ])

        expect(actual).toEqual(expected)
      })

      it('should sort by index when correct status and count are equal', () => {
        const gameDocument = createMultiChoiceGame([1, 2], [0])

        const actual = buildGameResultHostEvent(gameDocument as never)

        const expected = buildExpectedMultiChoiceDistribution(gameDocument, [
          { value: 'Stockholm', count: 0, correct: true, index: 0 }, // correct, same count, lower index
          { value: 'Paris', count: 1, correct: false, index: 1 }, // incorrect, higher count
          { value: 'London', count: 1, correct: false, index: 2 }, // incorrect, same count, higher index
        ])

        expect(actual).toEqual(expected)
      })
    })

    describe('aggregates Range distribution when current task is QuestionResult', () => {
      it('should handle mixed correct and incorrect answers', () => {
        const gameDocument = createRangeGame([50, 40, 50], [50])

        const actual = buildGameResultHostEvent(gameDocument as never)

        const expected = buildExpectedRangeDistribution(gameDocument, [
          { value: 50, count: 2, correct: true },
          { value: 40, count: 1, correct: false },
        ])

        expect(actual).toEqual(expected)
      })

      it('should handle multiple correct answers', () => {
        const gameDocument = createRangeGame([40, 50, 50, 60], [50, 60])

        const actual = buildGameResultHostEvent(gameDocument as never)

        const expected = buildExpectedRangeDistribution(gameDocument, [
          { value: 50, count: 2, correct: true },
          { value: 60, count: 1, correct: true },
          { value: 40, count: 1, correct: false },
        ])

        expect(actual).toEqual(expected)
      })

      it('should handle all answers being correct', () => {
        const gameDocument = createRangeGame([50, 50, 50], [50])

        const actual = buildGameResultHostEvent(gameDocument as never)

        const expected = buildExpectedRangeDistribution(gameDocument, [
          { value: 50, count: 3, correct: true },
        ])

        expect(actual).toEqual(expected)
      })

      it('should handle all answers being incorrect', () => {
        const gameDocument = createRangeGame([40, 40, 60], [50])

        const actual = buildGameResultHostEvent(gameDocument as never)

        const expected = buildExpectedRangeDistribution(gameDocument, [
          { value: 50, count: 0, correct: true },
          { value: 40, count: 2, correct: false },
          { value: 60, count: 1, correct: false },
        ])

        expect(actual).toEqual(expected)
      })

      it('should handle no submitted answers', () => {
        const gameDocument = createRangeGame([], [50])

        const actual = buildGameResultHostEvent(gameDocument as never)

        const expected = buildExpectedRangeDistribution(gameDocument, [
          { value: 50, count: 0, correct: true },
        ])

        expect(actual).toEqual(expected)
      })

      it('should handle no correct answers', () => {
        const gameDocument = createRangeGame([40, 50, 60], [])

        const actual = buildGameResultHostEvent(gameDocument as never)

        const expected = buildExpectedRangeDistribution(gameDocument, [
          { value: 40, count: 1, correct: false },
          { value: 50, count: 1, correct: false },
          { value: 60, count: 1, correct: false },
        ])

        expect(actual).toEqual(expected)
      })

      it('should sort by count when correct status is equal', () => {
        const gameDocument = createRangeGame([40, 60, 50], [50])

        const actual = buildGameResultHostEvent(gameDocument as never)

        const expected = buildExpectedRangeDistribution(gameDocument, [
          { value: 50, count: 1, correct: true }, // correct
          { value: 40, count: 1, correct: false }, // incorrect, same count
          { value: 60, count: 1, correct: false }, // incorrect, same count
        ])

        expect(actual).toEqual(expected)
      })

      it('should ignore out-of-bounds answers', () => {
        const gameDocument = createRangeGame([-1, 101], [50])

        const actual = buildGameResultHostEvent(gameDocument as never)

        const expected = buildExpectedRangeDistribution(gameDocument, [
          { value: 50, count: 0, correct: true },
        ])

        expect(actual).toEqual(expected)
      })
    })

    describe('aggregates True/False distribution when current task is QuestionResult', () => {
      it('should handle mixed correct and incorrect answers', () => {
        const gameDocument = createTrueFalseGame([false, true, false], [false])

        const actual = buildGameResultHostEvent(gameDocument as never)

        const expected = buildExpectedTrueFalseDistribution(gameDocument, [
          { value: false, count: 2, correct: true },
          { value: true, count: 1, correct: false },
        ])

        expect(actual).toEqual(expected)
      })

      it('should handle multiple correct answers', () => {
        const gameDocument = createTrueFalseGame(
          [false, false, true],
          [false, true],
        )

        const actual = buildGameResultHostEvent(gameDocument as never)

        const expected = buildExpectedTrueFalseDistribution(gameDocument, [
          { value: false, count: 2, correct: true },
          { value: true, count: 1, correct: true },
        ])

        expect(actual).toEqual(expected)
      })

      it('should handle all answers being correct', () => {
        const gameDocument = createTrueFalseGame([false, false], [false])

        const actual = buildGameResultHostEvent(gameDocument as never)

        const expected = buildExpectedTrueFalseDistribution(gameDocument, [
          { value: false, count: 2, correct: true },
        ])

        expect(actual).toEqual(expected)
      })

      it('should handle all answers being incorrect', () => {
        const gameDocument = createTrueFalseGame([true, true], [false])

        const actual = buildGameResultHostEvent(gameDocument as never)

        const expected = buildExpectedTrueFalseDistribution(gameDocument, [
          { value: false, count: 0, correct: true },
          { value: true, count: 2, correct: false },
        ])

        expect(actual).toEqual(expected)
      })

      it('should handle no submitted answers', () => {
        const gameDocument = createTrueFalseGame([], [false])

        const actual = buildGameResultHostEvent(gameDocument as never)

        const expected = buildExpectedTrueFalseDistribution(gameDocument, [
          { value: false, count: 0, correct: true },
        ])

        expect(actual).toEqual(expected)
      })
    })

    describe('aggregates Type Answer distribution when current task is QuestionResult', () => {
      it('should handle mixed correct and incorrect answers', () => {
        const gameDocument = createTypeAnswerGame(
          [
            MOCK_TYPE_ANSWER_OPTION_VALUE,
            MOCK_TYPE_ANSWER_INCORRECT_OPTION_VALUE,
            MOCK_TYPE_ANSWER_OPTION_VALUE.toUpperCase(),
          ],
          [MOCK_TYPE_ANSWER_OPTION_VALUE],
        )

        const actual = buildGameResultHostEvent(gameDocument as never)

        const expected = buildExpectedTypeAnswerDistribution(gameDocument, [
          { value: MOCK_TYPE_ANSWER_OPTION_VALUE, count: 2, correct: true },
          {
            value: MOCK_TYPE_ANSWER_INCORRECT_OPTION_VALUE,
            count: 1,
            correct: false,
          },
        ])

        expect(actual).toEqual(expected)
      })

      it('should handle multiple correct answers', () => {
        const gameDocument = createTypeAnswerGame(
          [
            MOCK_TYPE_ANSWER_OPTION_VALUE,
            MOCK_TYPE_ANSWER_INCORRECT_OPTION_VALUE,
            MOCK_TYPE_ANSWER_OPTION_VALUE_ALTERNATIVE,
            MOCK_TYPE_ANSWER_OPTION_VALUE.toUpperCase(),
          ],
          [
            MOCK_TYPE_ANSWER_OPTION_VALUE,
            MOCK_TYPE_ANSWER_OPTION_VALUE_ALTERNATIVE,
          ],
        )

        const actual = buildGameResultHostEvent(gameDocument as never)

        const expected = buildExpectedTypeAnswerDistribution(gameDocument, [
          { value: MOCK_TYPE_ANSWER_OPTION_VALUE, count: 2, correct: true },
          {
            value: MOCK_TYPE_ANSWER_OPTION_VALUE_ALTERNATIVE,
            count: 1,
            correct: true,
          },
          {
            value: MOCK_TYPE_ANSWER_INCORRECT_OPTION_VALUE,
            count: 1,
            correct: false,
          },
        ])

        expect(actual).toEqual(expected)
      })

      it('should handle all answers being correct', () => {
        const gameDocument = createTypeAnswerGame(
          [
            MOCK_TYPE_ANSWER_OPTION_VALUE,
            MOCK_TYPE_ANSWER_OPTION_VALUE,
            MOCK_TYPE_ANSWER_OPTION_VALUE,
          ],
          [MOCK_TYPE_ANSWER_OPTION_VALUE],
        )

        const actual = buildGameResultHostEvent(gameDocument as never)

        const expected = buildExpectedTypeAnswerDistribution(gameDocument, [
          { value: MOCK_TYPE_ANSWER_OPTION_VALUE, count: 3, correct: true },
        ])

        expect(actual).toEqual(expected)
      })

      it('should handle all answers being incorrect', () => {
        const gameDocument = createTypeAnswerGame(
          [
            MOCK_TYPE_ANSWER_INCORRECT_OPTION_VALUE,
            MOCK_TYPE_ANSWER_INCORRECT_OPTION_VALUE,
            MOCK_TYPE_ANSWER_INCORRECT_OPTION_VALUE,
          ],
          [MOCK_TYPE_ANSWER_OPTION_VALUE],
        )

        const actual = buildGameResultHostEvent(gameDocument as never)

        const expected = buildExpectedTypeAnswerDistribution(gameDocument, [
          { value: MOCK_TYPE_ANSWER_OPTION_VALUE, count: 0, correct: true },
          {
            value: MOCK_TYPE_ANSWER_INCORRECT_OPTION_VALUE,
            count: 3,
            correct: false,
          },
        ])

        expect(actual).toEqual(expected)
      })

      it('should handle no submitted answers', () => {
        const gameDocument = createTypeAnswerGame(
          [],
          [MOCK_TYPE_ANSWER_OPTION_VALUE],
        )

        const actual = buildGameResultHostEvent(gameDocument as never)

        const expected = buildExpectedTypeAnswerDistribution(gameDocument, [
          { value: MOCK_TYPE_ANSWER_OPTION_VALUE, count: 0, correct: true },
        ])

        expect(actual).toEqual(expected)
      })

      it('should ignore empty or whitespace-only answers', () => {
        const gameDocument = createTypeAnswerGame(
          [''],
          [MOCK_TYPE_ANSWER_OPTION_VALUE],
        )

        const actual = buildGameResultHostEvent(gameDocument as never)

        const expected = buildExpectedTypeAnswerDistribution(gameDocument, [
          { value: MOCK_TYPE_ANSWER_OPTION_VALUE, count: 0, correct: true },
        ])

        expect(actual).toEqual(expected)
      })

      it('should sort by correct status first, then by count', () => {
        const gameDocument = createTypeAnswerGame(
          [
            MOCK_TYPE_ANSWER_INCORRECT_OPTION_VALUE,
            MOCK_TYPE_ANSWER_INCORRECT_OPTION_VALUE,
            MOCK_TYPE_ANSWER_OPTION_VALUE,
          ],
          [MOCK_TYPE_ANSWER_OPTION_VALUE],
        )

        const actual = buildGameResultHostEvent(gameDocument as never)

        const expected = buildExpectedTypeAnswerDistribution(gameDocument, [
          { value: MOCK_TYPE_ANSWER_OPTION_VALUE, count: 1, correct: true }, // correct
          {
            value: MOCK_TYPE_ANSWER_INCORRECT_OPTION_VALUE,
            count: 2,
            correct: false,
          }, // incorrect, higher count
        ])

        expect(actual).toEqual(expected)
      })

      it('should sort by count when correct status is equal', () => {
        const gameDocument = createTypeAnswerGame(
          [
            MOCK_TYPE_ANSWER_INCORRECT_OPTION_VALUE,
            MOCK_TYPE_ANSWER_INCORRECT_OPTION_VALUE,
            MOCK_TYPE_ANSWER_OPTION_VALUE,
          ],
          [MOCK_TYPE_ANSWER_OPTION_VALUE],
        )

        const actual = buildGameResultHostEvent(gameDocument as never)

        const expected = buildExpectedTypeAnswerDistribution(gameDocument, [
          { value: MOCK_TYPE_ANSWER_OPTION_VALUE, count: 1, correct: true }, // correct
          {
            value: MOCK_TYPE_ANSWER_INCORRECT_OPTION_VALUE,
            count: 2,
            correct: false,
          }, // incorrect, same count
        ])

        expect(actual).toEqual(expected)
      })
    })

    describe('aggregates Pin distribution when current task is QuestionResult', () => {
      it('should handle mixed correct and incorrect answers', () => {
        const gameDocument = createPinGame(
          ['0.0,0.5', '0.1,0.5', '0.0,0.5'],
          ['0.0,0.5'],
        )

        const actual = buildGameResultHostEvent(gameDocument as never)

        const expected = buildExpectedPinDistribution(gameDocument, [
          { value: '0.0,0.5', count: 2, correct: true },
          { value: '0.1,0.5', count: 1, correct: false },
        ])

        expect(actual).toEqual(expected)
      })

      it('should handle multiple correct answers', () => {
        const gameDocument = createPinGame(
          ['0.0,0.5', '0.2,0.5', '0.2,0.5', '0.1,0.5'],
          ['0.0,0.5', '0.2,0.5'],
        )

        const actual = buildGameResultHostEvent(gameDocument as never)

        const expected = buildExpectedPinDistribution(gameDocument, [
          { value: '0.2,0.5', count: 2, correct: true },
          { value: '0.0,0.5', count: 1, correct: true },
          { value: '0.1,0.5', count: 1, correct: false },
        ])

        expect(actual).toEqual(expected)
      })

      it('should handle all answers being correct', () => {
        const gameDocument = createPinGame(
          ['0.0,0.5', '0.0,0.5', '0.0,0.5'],
          ['0.0,0.5'],
        )

        const actual = buildGameResultHostEvent(gameDocument as never)

        const expected = buildExpectedPinDistribution(gameDocument, [
          { value: '0.0,0.5', count: 3, correct: true },
        ])

        expect(actual).toEqual(expected)
      })

      it('should handle all answers being incorrect', () => {
        const gameDocument = createPinGame(
          ['0.1,0.5', '0.2,0.5', '0.1,0.5'],
          ['0.0,0.5'],
        )

        const actual = buildGameResultHostEvent(gameDocument as never)

        const expected = buildExpectedPinDistribution(gameDocument, [
          { value: '0.0,0.5', count: 0, correct: true },
          { value: '0.1,0.5', count: 2, correct: false },
          { value: '0.2,0.5', count: 1, correct: false },
        ])

        expect(actual).toEqual(expected)
      })

      it('should handle no submitted answers', () => {
        const gameDocument = createPinGame([], ['0.0,0.5'])

        const actual = buildGameResultHostEvent(gameDocument as never)

        const expected = buildExpectedPinDistribution(gameDocument, [
          { value: '0.0,0.5', count: 0, correct: true },
        ])

        expect(actual).toEqual(expected)
      })

      it('should handle no correct answers', () => {
        const gameDocument = createPinGame(
          ['0.0,0.5', '0.1,0.5', '0.2,0.5'],
          [],
        )

        const actual = buildGameResultHostEvent(gameDocument as never)

        const expected = buildExpectedPinDistribution(gameDocument, [
          { value: '0.0,0.5', count: 1, correct: false },
          { value: '0.1,0.5', count: 1, correct: false },
          { value: '0.2,0.5', count: 1, correct: false },
        ])

        expect(actual).toEqual(expected)
      })

      it('should ignore out-of-bounds answers', () => {
        const gameDocument = createPinGame(
          ['0.0,0.5', '1.1,1.5', '0.1,0.5'],
          ['0.0,0.5'],
        )

        const actual = buildGameResultHostEvent(gameDocument as never)

        const expected = buildExpectedPinDistribution(gameDocument, [
          { value: '0.0,0.5', count: 1, correct: true },
          { value: '0.1,0.5', count: 1, correct: false },
        ])

        expect(actual).toEqual(expected)
      })

      it('should sort by correct status first, then by count', () => {
        const gameDocument = createPinGame(
          ['0.1,0.5', '0.2,0.5', '0.0,0.5', '0.1,0.5'],
          ['0.0,0.5'],
        )

        const actual = buildGameResultHostEvent(gameDocument as never)

        const expected = buildExpectedPinDistribution(gameDocument, [
          { value: '0.0,0.5', count: 1, correct: true }, // correct
          { value: '0.1,0.5', count: 2, correct: false }, // incorrect, higher count
          { value: '0.2,0.5', count: 1, correct: false }, // incorrect, lower count
        ])

        expect(actual).toEqual(expected)
      })
    })

    describe('aggregates Puzzle distribution when current task is QuestionResult', () => {
      it('should handle mixed correct and incorrect answers', () => {
        const gameDocument = createPuzzleGame(
          [
            ['A', 'B', 'C'],
            ['C', 'B', 'A'],
            ['A', 'B', 'C'],
          ],
          [['A', 'B', 'C']],
        )

        const actual = buildGameResultHostEvent(gameDocument as never)

        const expected = buildExpectedPuzzleDistribution(gameDocument, [
          { value: ['A', 'B', 'C'], count: 2, correct: true },
          { value: ['C', 'B', 'A'], count: 1, correct: false },
        ])

        expect(actual).toEqual(expected)
      })

      it('should handle multiple correct answers', () => {
        const gameDocument = createPuzzleGame(
          [
            ['A', 'B', 'C'],
            ['C', 'B', 'A'],
            ['C', 'B', 'A'],
            ['B', 'A', 'C'],
          ],
          [
            ['A', 'B', 'C'],
            ['C', 'B', 'A'],
          ],
        )

        const actual = buildGameResultHostEvent(gameDocument as never)

        const expected = buildExpectedPuzzleDistribution(gameDocument, [
          { value: ['C', 'B', 'A'], count: 2, correct: true },
          { value: ['A', 'B', 'C'], count: 1, correct: true },
          { value: ['B', 'A', 'C'], count: 1, correct: false },
        ])

        expect(actual).toEqual(expected)
      })

      it('should handle all answers being correct', () => {
        const gameDocument = createPuzzleGame(
          [
            ['A', 'B', 'C'],
            ['A', 'B', 'C'],
            ['A', 'B', 'C'],
          ],
          [['A', 'B', 'C']],
        )

        const actual = buildGameResultHostEvent(gameDocument as never)

        const expected = buildExpectedPuzzleDistribution(gameDocument, [
          { value: ['A', 'B', 'C'], count: 3, correct: true },
        ])

        expect(actual).toEqual(expected)
      })

      it('should handle all answers being incorrect', () => {
        const gameDocument = createPuzzleGame(
          [
            ['C', 'B', 'A'],
            ['B', 'C', 'A'],
            ['C', 'B', 'A'],
          ],
          [['A', 'B', 'C']],
        )

        const actual = buildGameResultHostEvent(gameDocument as never)

        const expected = buildExpectedPuzzleDistribution(gameDocument, [
          { value: ['A', 'B', 'C'], count: 0, correct: true },
          { value: ['C', 'B', 'A'], count: 2, correct: false },
          { value: ['B', 'C', 'A'], count: 1, correct: false },
        ])

        expect(actual).toEqual(expected)
      })

      it('should handle no submitted answers', () => {
        const gameDocument = createPuzzleGame([], [['A', 'B', 'C']])

        const actual = buildGameResultHostEvent(gameDocument as never)

        const expected = buildExpectedPuzzleDistribution(gameDocument, [
          { value: ['A', 'B', 'C'], count: 0, correct: true },
        ])

        expect(actual).toEqual(expected)
      })

      it('should handle no correct answers', () => {
        const gameDocument = createPuzzleGame(
          [
            ['A', 'B', 'C'],
            ['B', 'C', 'A'],
            ['A', 'C', 'B'],
          ],
          [],
        )

        const actual = buildGameResultHostEvent(gameDocument as never)

        const expected = buildExpectedPuzzleDistribution(gameDocument, [
          { value: ['A', 'B', 'C'], count: 1, correct: false },
          { value: ['B', 'C', 'A'], count: 1, correct: false },
          { value: ['A', 'C', 'B'], count: 1, correct: false },
        ])

        expect(actual).toEqual(expected)
      })

      it('should ignore null answers', () => {
        const gameDocument = createPuzzleGame(
          [['A', 'B', 'C'], null, ['C', 'B', 'A']],
          [['A', 'B', 'C']],
        )

        const actual = buildGameResultHostEvent(gameDocument as never)

        const expected = buildExpectedPuzzleDistribution(gameDocument, [
          { value: ['A', 'B', 'C'], count: 1, correct: true },
          { value: ['C', 'B', 'A'], count: 1, correct: false },
        ])

        expect(actual).toEqual(expected)
      })

      it('should sort by correct status first, then by count', () => {
        const gameDocument = createPuzzleGame(
          [
            ['C', 'B', 'A'],
            ['C', 'B', 'A'],
            ['A', 'B', 'C'],
            ['B', 'A', 'C'],
          ],
          [['A', 'B', 'C']],
        )

        const actual = buildGameResultHostEvent(gameDocument as never)

        const expected = buildExpectedPuzzleDistribution(gameDocument, [
          { value: ['A', 'B', 'C'], count: 1, correct: true }, // correct
          { value: ['C', 'B', 'A'], count: 2, correct: false }, // incorrect, higher count
          { value: ['B', 'A', 'C'], count: 1, correct: false }, // incorrect, lower count
        ])

        expect(actual).toEqual(expected)
      })
    })

    it('throws when question type is undefined or invalid', () => {
      // Create a game with an invalid question type by modifying a valid question
      const gameDocument = createMockGameDocument({
        questions: [
          {
            ...createMockMultiChoiceQuestionDocument(),
            type: 'INVALID_TYPE' as never, // Invalid question type
          },
        ],
        currentTask: createMockQuestionResultTaskDocument({
          questionIndex: 0,
          results: [],
        }),
      })

      expect(() => buildGameResultHostEvent(gameDocument as never)).toThrow(
        'Question type is undefined or invalid.',
      )
    })
  })

  describe('buildGameResultPlayerEvent', () => {
    it('builds result from current QuestionResult task when player has a result entry', () => {
      const playerId = uuidv4()

      const player = createMockGamePlayerParticipantDocument({
        participantId: playerId,
        nickname: 'Alice',
        totalScore: 100,
        rank: 1,
        currentStreak: 3,
      })

      const questionResultTask = createMockQuestionResultTaskDocument({
        questionIndex: 0,
        results: [
          createMockQuestionResultTaskItemDocument({
            playerId,
            nickname: 'Alice',
            correct: true,
            lastScore: 40,
            totalScore: 100,
            position: 1,
            streak: 3,
          }),
        ],
      })

      const game = createMockGameDocument({
        participants: [player],
        currentTask: questionResultTask,
        questions: [
          // shape is irrelevant for this test, only length is used
          {} as never,
          {} as never,
        ],
      })

      const result = buildGameResultPlayerEvent(game as never, player)

      expect(result.type).toBe(GameEventType.GameResultPlayer)
      expect(result.game.mode).toBe(GameMode.Classic)
      expect(result.player.nickname).toBe('Alice')
      expect(result.player.score).toEqual({
        correct: true,
        last: 40,
        total: 100,
        position: 1,
        streak: 3,
      })
      expect(result.player.behind).toBeUndefined()

      expect(result.pagination.current).toBe(
        questionResultTask.questionIndex + 1,
      )
      expect(result.pagination.total).toBe(game.questions.length)
    })

    it('omits legacy streak data for ZeroToOneHundred player results', () => {
      const playerId = uuidv4()
      const player = createMockGamePlayerParticipantDocument({
        participantId: playerId,
        nickname: 'PrecisePlayer',
        totalScore: 100,
        rank: 1,
        currentStreak: 10,
      })
      const questionResultTask = createMockQuestionResultTaskDocument({
        questionIndex: 0,
        results: [
          createMockQuestionResultTaskItemDocument({
            playerId,
            nickname: 'PrecisePlayer',
            correct: true,
            lastScore: 40,
            totalScore: 100,
            position: 1,
            streak: 10,
          }),
        ],
      })
      const game = createMockGameDocument({
        mode: GameMode.ZeroToOneHundred,
        participants: [player],
        currentTask: questionResultTask,
        questions: [{} as never],
      })

      const result = buildGameResultPlayerEvent(game as never, player)

      expect(result.game.mode).toBe(GameMode.ZeroToOneHundred)
      expect(result.player.score).toEqual({
        correct: true,
        last: 40,
        total: 100,
        position: 1,
      })
      expect(result.player.score).not.toHaveProperty('streak')
    })

    it('falls back to player aggregate stats when no result entry exists in the QuestionResult task', () => {
      const playerId = uuidv4()

      const player = createMockGamePlayerParticipantDocument({
        participantId: playerId,
        nickname: 'Bob',
        totalScore: 75,
        rank: 2,
        currentStreak: 1,
      })

      const questionResultTask = createMockQuestionResultTaskDocument({
        questionIndex: 1,
        // No result for this player
        results: [],
      })

      const game = createMockGameDocument({
        participants: [player],
        currentTask: questionResultTask,
        questions: [
          // shape is irrelevant for this test, only length is used
          {} as never,
          {} as never,
        ],
      })

      const result = buildGameResultPlayerEvent(game as never, player)

      expect(result.type).toBe(GameEventType.GameResultPlayer)
      expect(result.game.mode).toBe(GameMode.Classic)
      expect(result.player.nickname).toBe('Bob')
      expect(result.player.score).toEqual({
        correct: false,
        last: 0,
        total: 75,
        position: 2,
        streak: 0,
      })
      expect(result.player.behind).toBeUndefined()

      expect(result.pagination.current).toBe(
        questionResultTask.questionIndex + 1,
      )
      expect(result.pagination.total).toBe(game.questions.length)
    })

    it('populates "behind" with the player directly ahead in score/position', () => {
      const currentPlayerId = uuidv4()
      const aheadPlayerId = uuidv4()

      const currentPlayer = createMockGamePlayerParticipantDocument({
        participantId: currentPlayerId,
        nickname: 'Charlie',
      })

      const aheadResult = createMockQuestionResultTaskItemDocument({
        playerId: aheadPlayerId,
        nickname: 'Alice',
        totalScore: 100,
        lastScore: 40,
        position: 1,
        streak: 3,
        correct: true,
      })

      const currentResult = createMockQuestionResultTaskItemDocument({
        playerId: currentPlayerId,
        nickname: 'Charlie',
        totalScore: 80,
        lastScore: 10,
        position: 2,
        streak: 1,
        correct: false,
      })

      const questionResultTask = createMockQuestionResultTaskDocument({
        questionIndex: 2,
        // Two different players: Alice (ahead) and Charlie (current).
        results: [aheadResult, currentResult],
      })

      const game = createMockGameDocument({
        participants: [currentPlayer],
        currentTask: questionResultTask,
        questions: [
          // shape is irrelevant for this test, only length is used
          {} as never,
          {} as never,
          {} as never,
        ],
      })

      const result = buildGameResultPlayerEvent(game as never, currentPlayer)

      expect(result.type).toBe(GameEventType.GameResultPlayer)
      expect(result.game.mode).toBe(GameMode.Classic)
      expect(result.player.nickname).toBe('Charlie')

      // Score should belong to the current player (Charlie)
      expect(result.player.score).toEqual({
        correct: currentResult.correct,
        last: currentResult.lastScore,
        total: currentResult.totalScore,
        position: currentResult.position,
        streak: currentResult.streak,
      })

      // "behind" should describe the player ahead (Alice)
      expect(result.player.behind).toEqual({
        points: Math.abs(aheadResult.totalScore - currentResult.totalScore),
        nickname: aheadResult.nickname,
      })

      expect(result.pagination.current).toBe(
        questionResultTask.questionIndex + 1,
      )
      expect(result.pagination.total).toBe(game.questions.length)
    })

    it('uses the last QuestionResult task when current task is Leaderboard', () => {
      const playerId = uuidv4()

      const player = createMockGamePlayerParticipantDocument({
        participantId: playerId,
        nickname: 'Dana',
      })

      const lastQuestionResultTask = createMockQuestionResultTaskDocument({
        questionIndex: 1,
        results: [
          createMockQuestionResultTaskItemDocument({
            playerId,
            nickname: 'Dana',
            correct: true,
            lastScore: 25,
            totalScore: 55,
            position: 1,
            streak: 2,
          }),
        ],
      })

      const leaderboardTask = createMockLeaderboardTaskDocument({})

      const game = createMockGameDocument({
        participants: [player],
        currentTask: leaderboardTask,
        previousTasks: [lastQuestionResultTask],
        questions: [
          // shape is irrelevant for this test, only length is used
          {} as never,
          {} as never,
        ],
      })

      const result = buildGameResultPlayerEvent(game as never, player)

      expect(result.type).toBe(GameEventType.GameResultPlayer)
      expect(result.game.mode).toBe(GameMode.Classic)
      expect(result.player.nickname).toBe('Dana')
      expect(result.player.score).toEqual({
        correct: true,
        last: 25,
        total: 55,
        position: 1,
        streak: 2,
      })
      expect(result.player.behind).toBeUndefined()

      expect(result.pagination.current).toBe(
        lastQuestionResultTask.questionIndex + 1,
      )
      expect(result.pagination.total).toBe(game.questions.length)
    })

    it('throws when current task is Leaderboard but no QuestionResult task exists', () => {
      const playerId = uuidv4()

      const player = createMockGamePlayerParticipantDocument({
        participantId: playerId,
        nickname: 'Eve',
      })

      const leaderboardTask = createMockLeaderboardTaskDocument({})

      const game = createMockGameDocument({
        participants: [player],
        currentTask: leaderboardTask,
        previousTasks: [], // no QuestionResult tasks
        questions: [
          // shape is irrelevant for this test, only length is used
          {} as never,
        ],
      })

      expect(() => buildGameResultPlayerEvent(game as never, player)).toThrow(
        'Expected at least one QuestionResultTask when building GameResultPlayerEvent for Leaderboard/Podium task',
      )
    })

    it('throws when current task type is not QuestionResult, Leaderboard, or Podium', () => {
      const playerId = uuidv4()

      const player = createMockGamePlayerParticipantDocument({
        participantId: playerId,
        nickname: 'Frank',
      })

      // Create a game with an unsupported task type (e.g., Lobby)
      const game = createMockGameDocument({
        participants: [player],
        currentTask: {
          _id: uuidv4(),
          type: TaskType.Lobby, // Invalid task type for this function
          status: 'active' as const,
          created: new Date(),
        },
        questions: [
          // shape is irrelevant for this test, only length is used
          {} as never,
        ],
      })

      expect(() => buildGameResultPlayerEvent(game as never, player)).toThrow(
        IllegalTaskTypeException,
      )
    })

    it('uses fallback position when player rank is 0', () => {
      const playerId = uuidv4()

      const player = createMockGamePlayerParticipantDocument({
        participantId: playerId,
        nickname: 'Grace',
        totalScore: 50,
        rank: 0, // Invalid rank (should be > 0)
        currentStreak: 1,
      })

      const questionResultTask = createMockQuestionResultTaskDocument({
        questionIndex: 0,
        // No result for this player - should trigger fallback
        results: [],
      })

      const game = createMockGameDocument({
        participants: [player],
        currentTask: questionResultTask,
        questions: [
          // shape is irrelevant for this test, only length is used
          {} as never,
        ],
      })

      const result = buildGameResultPlayerEvent(game as never, player)

      expect(result.player.score.position).toBe(1) // Should fallback to participants.length
    })

    it('uses fallback position when player rank is not a number', () => {
      const playerId = uuidv4()

      const player = createMockGamePlayerParticipantDocument({
        participantId: playerId,
        nickname: 'Henry',
        totalScore: 50,
        rank: undefined as never, // Invalid rank type
        currentStreak: 1,
      })

      const questionResultTask = createMockQuestionResultTaskDocument({
        questionIndex: 0,
        // No result for this player - should trigger fallback
        results: [],
      })

      const game = createMockGameDocument({
        participants: [player],
        currentTask: questionResultTask,
        questions: [
          // shape is irrelevant for this test, only length is used
          {} as never,
        ],
      })

      const result = buildGameResultPlayerEvent(game as never, player)

      expect(result.player.score.position).toBe(1) // Should fallback to participants.length
    })
  })
})

function createMultiChoiceGame(answers: number[], correctIndexes?: number[]) {
  return createMockGameDocument({
    questions: [createMockMultiChoiceQuestionDocument()],
    currentTask: withMultiChoiceAnswers(answers, correctIndexes),
  })
}

function withMultiChoiceAnswers(answers: number[], correctIndexes?: number[]) {
  return createMockQuestionResultTaskDocument({
    status: 'active',
    correctAnswers:
      correctIndexes?.map((index) => ({
        type: QuestionType.MultiChoice,
        index,
      })) || [],
    results: answers.map((answer) =>
      createMockQuestionResultTaskItemDocument({
        type: QuestionType.MultiChoice,
        answer: createMockQuestionTaskMultiChoiceAnswer({ answer }),
        correct: correctIndexes?.includes(answer) || false,
      }),
    ),
  })
}

function createRangeGame(answers: number[], correctValues?: number[]) {
  return createMockGameDocument({
    questions: [createMockRangeQuestionDocument()],
    currentTask: withRangeAnswers(answers, correctValues),
  })
}

function withRangeAnswers(answers: number[], correctValues?: number[]) {
  return createMockQuestionResultTaskDocument({
    status: 'active',
    correctAnswers:
      correctValues?.map((value) => ({
        type: QuestionType.Range,
        value,
      })) || [],
    results: answers.map((answer) =>
      createMockQuestionResultTaskItemDocument({
        type: QuestionType.MultiChoice,
        answer: createMockQuestionTaskRangeAnswer({ answer }),
        correct: correctValues?.includes(answer) || false,
      }),
    ),
  })
}

function createTrueFalseGame(answers: boolean[], correctValues?: boolean[]) {
  return createMockGameDocument({
    questions: [createMockTrueFalseQuestionDocument()],
    currentTask: withTrueFalseAnswers(answers, correctValues),
  })
}

function withTrueFalseAnswers(answers: boolean[], correctValues?: boolean[]) {
  return createMockQuestionResultTaskDocument({
    status: 'active',
    correctAnswers:
      correctValues?.map((value) => ({
        type: QuestionType.TrueFalse,
        value,
      })) || [],
    results: answers.map((answer) =>
      createMockQuestionResultTaskItemDocument({
        type: QuestionType.TrueFalse,
        answer: createMockQuestionTaskTrueFalseAnswer({ answer }),
        correct: correctValues?.includes(answer) || false,
      }),
    ),
  })
}

function createTypeAnswerGame(answers: string[], correctValues?: string[]) {
  return createMockGameDocument({
    questions: [createMockTypeAnswerQuestionDocument()],
    currentTask: withTypeAnswers(answers, correctValues),
  })
}

function withTypeAnswers(answers: string[], correctValues?: string[]) {
  return createMockQuestionResultTaskDocument({
    status: 'active',
    correctAnswers:
      correctValues?.map((value) => ({
        type: QuestionType.TypeAnswer,
        value,
      })) || [],
    results: answers.map((answer) =>
      createMockQuestionResultTaskItemDocument({
        type: QuestionType.TypeAnswer,
        answer: createMockQuestionTaskTypeAnswer({ answer }),
        correct: correctValues?.includes(answer) || false,
      }),
    ),
  })
}

function createPinGame(answers: string[], correctValues?: string[]) {
  return createMockGameDocument({
    questions: [createMockPinQuestionDocument()],
    currentTask: withPinAnswers(answers, correctValues),
  })
}

function withPinAnswers(answers: string[], correctValues?: string[]) {
  return createMockQuestionResultTaskDocument({
    status: 'active',
    correctAnswers:
      correctValues?.map((value) => ({
        type: QuestionType.Pin,
        value,
      })) || [],
    results: answers.map((answer) =>
      createMockQuestionResultTaskItemDocument({
        type: QuestionType.Pin,
        answer: createMockQuestionTaskPinAnswer({ answer }),
        correct: correctValues?.includes(answer) || false,
      }),
    ),
  })
}

function createPuzzleGame(
  answers: (string[] | null)[],
  correctValues?: string[][],
) {
  return createMockGameDocument({
    questions: [createMockPuzzleQuestionDocument()],
    currentTask: withPuzzleAnswers(answers, correctValues),
  })
}

function withPuzzleAnswers(
  answers: (string[] | null)[],
  correctValues?: string[][],
) {
  return createMockQuestionResultTaskDocument({
    status: 'active',
    correctAnswers:
      correctValues?.map((value) => ({
        type: QuestionType.Puzzle,
        value,
      })) || [],
    results: answers.map((answer) =>
      createMockQuestionResultTaskItemDocument({
        type: QuestionType.Puzzle,
        answer: answer
          ? createMockQuestionTaskPuzzleAnswer({ answer })
          : undefined,
        correct:
          (answer && correctValues?.some((cv) => arraysEqual(cv, answer))) ||
          false,
      }),
    ),
  })
}

function buildExpectedMultiChoiceDistribution(
  game: Game,
  distribution: GameEventQuestionResultsMultiChoice['distribution'],
) {
  return expectGameResultHostEvent(game, {
    type: QuestionType.MultiChoice,
    distribution,
  })
}

function buildExpectedRangeDistribution(
  game: Game,
  distribution: GameEventQuestionResultsRange['distribution'],
) {
  return expectGameResultHostEvent(game, {
    type: QuestionType.Range,
    distribution,
  })
}

function buildExpectedTrueFalseDistribution(
  game: Game,
  distribution: GameEventQuestionResultsTrueFalse['distribution'],
) {
  return expectGameResultHostEvent(game, {
    type: QuestionType.TrueFalse,
    distribution,
  })
}

function buildExpectedTypeAnswerDistribution(
  game: Game,
  distribution: GameEventQuestionResultsTypeAnswer['distribution'],
) {
  return expectGameResultHostEvent(game, {
    type: QuestionType.TypeAnswer,
    distribution,
  })
}

function buildExpectedPinDistribution(
  game: Game,
  distribution: GameEventQuestionResultsPin['distribution'],
) {
  return expectGameResultHostEvent(game, {
    type: QuestionType.Pin,
    imageURL: 'https://example.com/question-image.png',
    positionX: 0.5,
    positionY: 0.5,
    tolerance: QuestionPinTolerance.Medium,
    distribution,
  })
}

function buildExpectedPuzzleDistribution(
  game: Game,
  distribution: GameEventQuestionResultsPuzzle['distribution'],
) {
  return expectGameResultHostEvent(game, {
    type: QuestionType.Puzzle,
    values: ['Athens', 'Argos', 'Plovdiv', 'Lisbon'],
    distribution,
  })
}

function expectGameResultHostEvent(
  game: Game,
  results: GameEventQuestionResults,
): GameResultHostEvent {
  const question = game.questions[0]
  const media: QuestionMediaEvent | undefined = question?.media
    ? { type: question.media.type, url: question.media.url }
    : undefined
  return {
    type: GameEventType.GameResultHost,
    game: {
      pin: game.pin,
    },
    question: {
      type: question.type,
      question: question.text,
      media,
      info: question.info,
    },
    results,
    pagination: {
      current: 1,
      total: 1,
    },
  }
}
