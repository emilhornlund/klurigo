import type { QuestionDto } from '@klurigo/common'
import {
  GameMode,
  MediaType,
  QuestionPinTolerance,
  QuestionRangeAnswerMargin,
  QuestionType,
  QUIZ_STANDARD_POINTS,
} from '@klurigo/common'
import { describe, expect, it } from 'vitest'

import {
  buildPartialClassicMultiChoiceQuestionDto,
  buildPartialClassicPinQuestionDto,
  buildPartialClassicPuzzleQuestionDto,
  buildPartialClassicQuestionDto,
  buildPartialClassicRangeQuestionDto,
  buildPartialClassicTrueFalseQuestionDto,
  buildPartialClassicTypeAnswerQuestionDto,
  buildPartialQuestionDto,
  buildPartialZeroToOneHundredQuestionDto,
  buildPartialZeroToOneHundredRangeQuestionDto,
} from './question.builder'

const media = { type: MediaType.Image, url: 'https://example.com/image.jpg' }

const classicSource = {
  type: QuestionType.MultiChoice,
  question: 'Shared question',
  media,
  points: 500,
  duration: 12,
  info: 'Shared info',
  options: [{ value: 'answer', correct: true }],
} as Partial<QuestionDto>

describe('question builders', () => {
  it('creates the supported question types with their editor defaults', () => {
    expect(buildPartialClassicMultiChoiceQuestionDto()).toEqual({
      type: QuestionType.MultiChoice,
      question: undefined,
      media: undefined,
      options: [],
      points: QUIZ_STANDARD_POINTS,
      duration: 30,
      info: undefined,
    })
    expect(buildPartialClassicTrueFalseQuestionDto()).toEqual({
      type: QuestionType.TrueFalse,
      question: undefined,
      media: undefined,
      correct: undefined,
      points: QUIZ_STANDARD_POINTS,
      duration: 30,
      info: undefined,
    })
    expect(buildPartialClassicRangeQuestionDto()).toEqual({
      type: QuestionType.Range,
      question: undefined,
      media: undefined,
      min: 0,
      max: 100,
      margin: QuestionRangeAnswerMargin.Medium,
      correct: 50,
      points: QUIZ_STANDARD_POINTS,
      duration: 30,
      info: undefined,
    })
    expect(buildPartialClassicTypeAnswerQuestionDto()).toEqual({
      type: QuestionType.TypeAnswer,
      question: undefined,
      media: undefined,
      options: [],
      points: QUIZ_STANDARD_POINTS,
      duration: 30,
      info: undefined,
    })
    expect(buildPartialClassicPinQuestionDto()).toEqual({
      type: QuestionType.Pin,
      question: undefined,
      imageURL: undefined,
      positionX: 0.5,
      positionY: 0.5,
      tolerance: QuestionPinTolerance.Medium,
      points: QUIZ_STANDARD_POINTS,
      duration: 30,
      info: undefined,
    })
    expect(buildPartialClassicPuzzleQuestionDto()).toEqual({
      type: QuestionType.Puzzle,
      question: undefined,
      media: undefined,
      values: [],
      points: QUIZ_STANDARD_POINTS,
      duration: 30,
      info: undefined,
    })
    expect(buildPartialZeroToOneHundredRangeQuestionDto()).toEqual({
      type: QuestionType.Range,
      question: undefined,
      media: undefined,
      correct: 50,
      duration: 30,
      info: undefined,
    })
  })

  it('returns an existing DTO unchanged when it already has the target Classic type', () => {
    const questions = [
      {
        type: QuestionType.MultiChoice,
        options: [],
      },
      { type: QuestionType.TrueFalse, correct: true },
      { type: QuestionType.Range, min: 0, max: 10, correct: 5 },
      { type: QuestionType.TypeAnswer, options: ['answer'] },
      {
        type: QuestionType.Pin,
        imageURL: 'https://example.com/map.jpg',
        positionX: 0.2,
        positionY: 0.8,
        tolerance: QuestionPinTolerance.Low,
      },
      { type: QuestionType.Puzzle, values: [] },
    ] as Partial<QuestionDto>[]

    const builders = [
      buildPartialClassicMultiChoiceQuestionDto,
      buildPartialClassicTrueFalseQuestionDto,
      buildPartialClassicRangeQuestionDto,
      buildPartialClassicTypeAnswerQuestionDto,
      buildPartialClassicPinQuestionDto,
      buildPartialClassicPuzzleQuestionDto,
    ]

    builders.forEach((builder, index) => {
      expect(builder(questions[index])).toBe(questions[index])
    })
  })

  it('copies shared fields between Classic question types and excludes Pin media', () => {
    expect(buildPartialClassicRangeQuestionDto(classicSource)).toMatchObject({
      type: QuestionType.Range,
      question: 'Shared question',
      media,
      points: 500,
      duration: 12,
      info: 'Shared info',
    })

    const pinSource = {
      ...classicSource,
      type: QuestionType.Pin,
      imageURL: 'https://example.com/map.jpg',
      positionX: 0.1,
      positionY: 0.9,
      tolerance: QuestionPinTolerance.High,
    } as Partial<QuestionDto>

    const convertedPin = buildPartialClassicPinQuestionDto(classicSource)
    expect(convertedPin).toMatchObject({
      question: 'Shared question',
      points: 500,
      duration: 12,
      info: 'Shared info',
    })
    expect(convertedPin).not.toHaveProperty('media')
    expect(
      buildPartialClassicMultiChoiceQuestionDto(pinSource).media,
    ).toBeUndefined()
  })

  it('copies only fields allowed by the Zero-to-One-Hundred DTO', () => {
    const converted = buildPartialZeroToOneHundredRangeQuestionDto({
      type: QuestionType.Range,
      question: 'A range question',
      media,
      min: 10,
      max: 90,
      margin: QuestionRangeAnswerMargin.High,
      correct: 50,
      points: 999,
      duration: 20,
      info: 'Explanation',
    } as Partial<QuestionDto>)

    expect(converted).toEqual({
      type: QuestionType.Range,
      question: 'A range question',
      media,
      correct: 50,
      duration: 20,
      info: 'Explanation',
    })
    expect(converted).not.toHaveProperty('points')
    expect(converted).not.toHaveProperty('min')
    expect(converted).not.toHaveProperty('max')
    expect(converted).not.toHaveProperty('margin')
  })

  it('dispatches builders by mode and rejects unsupported Zero-to-One-Hundred types', () => {
    expect(buildPartialClassicQuestionDto(QuestionType.Puzzle)).toMatchObject({
      type: QuestionType.Puzzle,
      values: [],
    })
    expect(
      buildPartialQuestionDto(GameMode.Classic, QuestionType.Pin),
    ).toMatchObject({ type: QuestionType.Pin, positionX: 0.5 })
    expect(
      buildPartialQuestionDto(GameMode.ZeroToOneHundred, QuestionType.Range),
    ).toMatchObject({ type: QuestionType.Range, correct: 50 })
    expect(() =>
      buildPartialZeroToOneHundredQuestionDto(QuestionType.MultiChoice),
    ).toThrow('Unsupported question type MULTI_CHOICE')
  })
})
