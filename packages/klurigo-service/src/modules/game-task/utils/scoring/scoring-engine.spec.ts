import { GameMode, QuestionType } from '@klurigo/common'

import {
  QuestionResultTaskCorrectAnswer,
  QuestionTaskAnswer,
} from '../../../game-core/repositories/models/schemas'
import { QuestionDao } from '../../../quiz-core/repositories/models/schemas'

import { ClassicMultiChoiceScoringStrategy } from './classic/classic-multichoice-strategy'
import {
  calculateQuestionScoreForParticipant,
  isQuestionAnswerCorrect,
} from './scoring-engine'
import { ZeroToOneHundredRangeScoringStrategy } from './zero-to-one-hundred/zero-to-one-hundred-range-strategy'

describe('scoring-engine', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  const buildClassicMultiChoiceQuestion = (): QuestionDao =>
    ({
      id: 'q1',
      type: QuestionType.MultiChoice,
      duration: 30,
      points: 1000,
    }) as unknown as QuestionDao

  const buildZeroToOneHundredRangeQuestion = (): QuestionDao =>
    ({
      id: 'q2',
      type: QuestionType.Range,
      duration: 30,
      points: 1000,
    }) as unknown as QuestionDao

  const buildMultiChoiceCorrect = (
    id: string,
    index: number,
  ): QuestionResultTaskCorrectAnswer =>
    ({
      id,
      questionId: 'q1',
      type: QuestionType.MultiChoice,
      index,
    }) as unknown as QuestionResultTaskCorrectAnswer

  const buildRangeCorrect = (
    id: string,
    value: number,
  ): QuestionResultTaskCorrectAnswer =>
    ({
      id,
      questionId: 'q2',
      type: QuestionType.Range,
      value,
    }) as unknown as QuestionResultTaskCorrectAnswer

  const buildMultiChoiceAnswer = (
    index: number,
    created: Date,
  ): QuestionTaskAnswer =>
    ({
      id: 'a1',
      questionId: 'q1',
      type: QuestionType.MultiChoice,
      answer: index,
      created,
    }) as unknown as QuestionTaskAnswer

  const buildRangeAnswer = (value: number, created: Date): QuestionTaskAnswer =>
    ({
      id: 'a2',
      questionId: 'q2',
      type: QuestionType.Range,
      answer: value,
      created,
    }) as unknown as QuestionTaskAnswer

  describe('calculateQuestionScoreForParticipant', () => {
    it('returns 0 for Classic mode when answer is missing', () => {
      const question = buildClassicMultiChoiceQuestion()

      const score = calculateQuestionScoreForParticipant(
        GameMode.Classic,
        new Date(),
        question,
        [],
        undefined,
      )

      expect(score).toBe(0)
    })

    it('returns 100 for ZeroToOneHundred mode when answer is missing', () => {
      const question = buildZeroToOneHundredRangeQuestion()

      const score = calculateQuestionScoreForParticipant(
        GameMode.ZeroToOneHundred,
        new Date(),
        question,
        [],
        undefined,
      )

      expect(score).toBe(100)
    })

    it('returns 0 for a Classic answer when the question duration is not positive', () => {
      const question = {
        ...buildClassicMultiChoiceQuestion(),
        duration: 0,
      }
      const answer = buildMultiChoiceAnswer(
        0,
        new Date('2025-01-01T00:00:01.000Z'),
      )

      const score = calculateQuestionScoreForParticipant(
        GameMode.Classic,
        new Date('2025-01-01T00:00:00.000Z'),
        question,
        [buildMultiChoiceCorrect('c1', 0)],
        answer,
      )

      expect(score).toBe(0)
    })

    it('throws for unsupported game mode when answer is missing', () => {
      const question = buildClassicMultiChoiceQuestion()

      expect(() =>
        calculateQuestionScoreForParticipant(
          999 as unknown as GameMode.Classic,
          new Date(),
          question,
          [],
          undefined,
        ),
      ).toThrow('Unsupported game mode 999')
    })

    it('throws for unsupported game mode when answer is present', () => {
      const question = buildClassicMultiChoiceQuestion()

      const answer = buildMultiChoiceAnswer(0, new Date())

      expect(() =>
        calculateQuestionScoreForParticipant(
          999 as unknown as GameMode.Classic,
          new Date(),
          question,
          [],
          answer,
        ),
      ).toThrow('Unsupported game mode 999')
    })

    it('throws for unknown classic strategy', () => {
      const question = {
        id: 'q1',
        type: 123 as unknown as QuestionType,
        duration: 30,
        points: 1000,
      } as unknown as QuestionDao

      const answer = buildMultiChoiceAnswer(0, new Date())

      expect(() =>
        calculateQuestionScoreForParticipant(
          GameMode.Classic,
          new Date(),
          question,
          [],
          answer,
        ),
      ).toThrow('No Classic scoring strategy for question type 123')
    })

    it('throws for unknown zero to one hundred strategy', () => {
      const question = {
        id: 'q1',
        type: 123 as unknown as QuestionType,
        duration: 30,
        points: 1000,
      } as unknown as QuestionDao

      const answer = buildMultiChoiceAnswer(0, new Date())

      expect(() =>
        calculateQuestionScoreForParticipant(
          GameMode.ZeroToOneHundred,
          new Date(),
          question,
          [],
          answer,
        ),
      ).toThrow('No ZeroToOneHundred scoring strategy for question type 123')
    })

    it('uses Classic strategy and returns the highest score among correct answers', () => {
      const question = buildClassicMultiChoiceQuestion()

      const correctAnswers: QuestionResultTaskCorrectAnswer[] = [
        buildMultiChoiceCorrect('c1', 0),
        buildMultiChoiceCorrect('c2', 1),
      ]

      const answer = buildMultiChoiceAnswer(
        0,
        new Date('2025-01-01T00:00:10.000Z'),
      )

      const calculateSpy = jest
        .spyOn(ClassicMultiChoiceScoringStrategy.prototype, 'calculateScore')
        .mockImplementationOnce(() => 100)
        .mockImplementationOnce(() => 250)

      const score = calculateQuestionScoreForParticipant(
        GameMode.Classic,
        new Date('2025-01-01T00:00:00.000Z'),
        question,
        correctAnswers,
        answer,
      )

      expect(calculateSpy).toHaveBeenCalledTimes(2)
      expect(score).toBe(250)
      // We deliberately do NOT assert on answerUtils here to avoid mocking basic guards
    })

    it('uses ZeroToOneHundred strategy and returns the lowest score among correct answers', () => {
      const question = buildZeroToOneHundredRangeQuestion()

      const correctAnswers: QuestionResultTaskCorrectAnswer[] = [
        buildRangeCorrect('c1', 50),
        buildRangeCorrect('c2', 75),
      ]

      const answer = buildRangeAnswer(52, new Date('2025-01-01T00:00:10.000Z'))

      const calculateSpy = jest
        .spyOn(ZeroToOneHundredRangeScoringStrategy.prototype, 'calculateScore')
        .mockImplementationOnce(() => 10)
        .mockImplementationOnce(() => 3)

      const score = calculateQuestionScoreForParticipant(
        GameMode.ZeroToOneHundred,
        new Date('2025-01-01T00:00:00.000Z'),
        question,
        correctAnswers,
        answer,
      )

      expect(calculateSpy).toHaveBeenCalledTimes(2)
      expect(score).toBe(3)
      // Same here: no expectations on answerUtils
    })

    it('returns 0 when there are no correct answers configured', () => {
      const question = buildClassicMultiChoiceQuestion()

      const answer = buildMultiChoiceAnswer(
        0,
        new Date('2025-01-01T00:00:10.000Z'),
      )

      const calculateSpy = jest.spyOn(
        ClassicMultiChoiceScoringStrategy.prototype,
        'calculateScore',
      )

      const score = calculateQuestionScoreForParticipant(
        GameMode.Classic,
        new Date('2025-01-01T00:00:00.000Z'),
        question,
        [],
        answer,
      )

      expect(score).toBe(0)
      expect(calculateSpy).not.toHaveBeenCalled()
    })
  })

  describe('isQuestionAnswerCorrect', () => {
    it('returns false when answer is missing', () => {
      const question = buildClassicMultiChoiceQuestion()

      const result = isQuestionAnswerCorrect(
        GameMode.Classic,
        question,
        [],
        undefined,
      )

      expect(result).toBe(false)
    })

    it('returns false when answer cannot be mapped to expected shape', () => {
      const question = buildClassicMultiChoiceQuestion()

      const correctAnswers: QuestionResultTaskCorrectAnswer[] = [
        buildMultiChoiceCorrect('c1', 0),
      ]

      // Intentionally missing `type` and `answer` so the guard fails
      const answer = {
        id: 'a1',
        questionId: 'q1',
        created: new Date(),
      } as unknown as QuestionTaskAnswer

      const isCorrectSpy = jest.spyOn(
        ClassicMultiChoiceScoringStrategy.prototype,
        'isCorrect',
      )

      const result = isQuestionAnswerCorrect(
        GameMode.Classic,
        question,
        correctAnswers,
        answer,
      )

      expect(result).toBe(false)
      expect(isCorrectSpy).not.toHaveBeenCalled()
    })

    it('returns true when any correct answer is considered correct by the strategy', () => {
      const question = buildClassicMultiChoiceQuestion()

      const correctAnswers: QuestionResultTaskCorrectAnswer[] = [
        buildMultiChoiceCorrect('c1', 0),
        buildMultiChoiceCorrect('c2', 1),
      ]

      const answer = buildMultiChoiceAnswer(0, new Date())

      const isCorrectSpy = jest
        .spyOn(ClassicMultiChoiceScoringStrategy.prototype, 'isCorrect')
        .mockImplementationOnce(() => false)
        .mockImplementationOnce(() => true)

      const result = isQuestionAnswerCorrect(
        GameMode.Classic,
        question,
        correctAnswers,
        answer,
      )

      expect(result).toBe(true)
      expect(isCorrectSpy).toHaveBeenCalledTimes(2)
      // No expectations on answerUtils here either
    })
  })
})
