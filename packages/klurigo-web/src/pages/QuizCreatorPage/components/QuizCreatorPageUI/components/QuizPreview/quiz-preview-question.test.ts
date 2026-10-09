import {
  GameMode,
  QuestionPinTolerance,
  QuestionRangeAnswerMargin,
  QuestionType,
} from '@klurigo/common'
import { describe, expect, it } from 'vitest'

import type { QuizQuestionModel } from '../../../../utils/QuestionDataSource'

import { toPlayerQuestion, toPlayerQuestions } from './quiz-preview-question'

describe('quiz preview question conversion', () => {
  it('preserves editor order and unsaved values', () => {
    const questions = toPlayerQuestions(GameMode.Classic, [
      {
        type: QuestionType.MultiChoice,
        question: 'Unsaved first question',
        options: [{ value: 'Updated answer', correct: true }],
        points: 1000,
        duration: 30,
      },
      {
        type: QuestionType.TrueFalse,
        question: 'Second question',
        correct: false,
        points: 1000,
        duration: 20,
      },
    ])

    expect(questions.map(({ question }) => question)).toEqual([
      'Unsaved first question',
      'Second question',
    ])
    expect(questions[0]).toMatchObject({
      type: QuestionType.MultiChoice,
      answers: [{ value: 'Updated answer' }],
    })
  })

  it('uses mode-specific range presentation data', () => {
    const classicRange = toPlayerQuestion(GameMode.Classic, {
      type: QuestionType.Range,
      question: 'Classic range',
      min: -50,
      max: 50,
      margin: QuestionRangeAnswerMargin.Medium,
      correct: 10,
      points: 1000,
      duration: 30,
    })
    const zeroToOneHundredRange = toPlayerQuestion(GameMode.ZeroToOneHundred, {
      type: QuestionType.Range,
      question: 'Percent range',
      correct: 72,
      duration: 30,
    })

    expect(classicRange).toMatchObject({ min: -50, max: 50, step: 2 })
    expect(zeroToOneHundredRange).toMatchObject({ min: 0, max: 100, step: 1 })
  })

  it.each([
    QuestionType.MultiChoice,
    QuestionType.TrueFalse,
    QuestionType.Range,
    QuestionType.TypeAnswer,
    QuestionType.Pin,
    QuestionType.Puzzle,
  ])('converts %s into a player question', (type) => {
    const question = {
      type,
      question: 'Preview question',
      duration: 30,
      ...(type === QuestionType.MultiChoice
        ? { options: [{ value: 'A', correct: true }] }
        : {}),
      ...(type === QuestionType.Range
        ? {
            min: 0,
            max: 100,
            margin: QuestionRangeAnswerMargin.Medium,
            correct: 50,
          }
        : {}),
      ...(type === QuestionType.TrueFalse ? { correct: true } : {}),
      ...(type === QuestionType.TypeAnswer ? { options: ['answer'] } : {}),
      ...(type === QuestionType.Pin
        ? {
            imageURL: '/map.png',
            positionX: 0.5,
            positionY: 0.5,
            tolerance: QuestionPinTolerance.Medium,
          }
        : {}),
      ...(type === QuestionType.Puzzle ? { values: ['A', 'B'] } : {}),
    }

    expect(
      toPlayerQuestion(GameMode.Classic, question as QuizQuestionModel),
    ).toMatchObject({ type, question: 'Preview question' })
  })

  it('does not convert incomplete editor data', () => {
    expect(
      toPlayerQuestion(GameMode.Classic, {
        type: QuestionType.MultiChoice,
        question: 'Incomplete',
      }),
    ).toBeUndefined()
  })
})
