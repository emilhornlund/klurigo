import {
  MediaType,
  QuestionPinTolerance,
  QuestionRangeAnswerMargin,
  QuestionType,
} from '@klurigo/common'

import {
  QuestionMultiChoiceWithBase,
  QuestionPinWithBase,
  QuestionPuzzleWithBase,
  QuestionRangeWithBase,
  QuestionTrueFalseWithBase,
  QuestionTypeAnswerWithBase,
} from '../../src/modules/quiz-core/repositories/models/schemas'

import { MOCK_TYPE_ANSWER_OPTION_VALUE } from './game.constants'

export function createMockMultiChoiceQuestionDocument(
  question?: Partial<QuestionMultiChoiceWithBase>,
): QuestionMultiChoiceWithBase {
  return {
    type: QuestionType.MultiChoice,
    text: 'What is the capital of Sweden?',
    media: {
      type: MediaType.Image,
      url: 'https://example.com/question-image.png',
    },
    options: [
      {
        value: 'Stockholm',
        correct: true,
      },
      {
        value: 'Paris',
        correct: false,
      },
      {
        value: 'London',
        correct: false,
      },
      {
        value: 'Berlin',
        correct: false,
      },
    ],
    points: 1000,
    duration: 5,
    ...(question ?? {}),
  }
}

export function createMockRangeQuestionDocument(
  question?: Partial<QuestionRangeWithBase>,
): QuestionRangeWithBase {
  return {
    type: QuestionType.Range,
    text: 'Guess the temperature of the hottest day ever recorded.',
    media: {
      type: MediaType.Image,
      url: 'https://example.com/question-image.png',
    },
    min: 0,
    max: 100,
    margin: QuestionRangeAnswerMargin.Medium,
    step: 1,
    correct: 50,
    points: 1000,
    duration: 30,
    ...(question ?? {}),
  }
}

export function createMockTrueFalseQuestionDocument(
  question?: Partial<QuestionTrueFalseWithBase>,
): QuestionTrueFalseWithBase {
  return {
    type: QuestionType.TrueFalse,
    text: 'The earth is flat.',
    media: {
      type: MediaType.Image,
      url: 'https://example.com/question-image.png',
    },
    correct: false,
    points: 1000,
    duration: 30,
    ...(question ?? {}),
  }
}

export function createMockTypeAnswerQuestionDocument(
  question?: Partial<QuestionTypeAnswerWithBase>,
): QuestionTypeAnswerWithBase {
  return {
    type: QuestionType.TypeAnswer,
    text: 'What is the capital of Denmark?',
    media: {
      type: MediaType.Image,
      url: 'https://example.com/question-image.png',
    },
    options: [MOCK_TYPE_ANSWER_OPTION_VALUE],
    points: 1000,
    duration: 30,
    ...(question ?? {}),
  }
}

export function createMockPinQuestionDocument(
  question?: Partial<QuestionPinWithBase>,
): QuestionPinWithBase {
  return {
    type: QuestionType.Pin,
    text: 'Where is the Eiffel Tower located in Paris? Pin the answer on a map of Paris',
    imageURL: 'https://example.com/question-image.png',
    positionX: 0.5,
    positionY: 0.5,
    tolerance: QuestionPinTolerance.Medium,
    points: 1000,
    duration: 5,
    ...(question ?? {}),
  }
}

export function createMockPuzzleQuestionDocument(
  question?: Partial<QuestionPuzzleWithBase>,
): QuestionPuzzleWithBase {
  return {
    type: QuestionType.Puzzle,
    text: 'Sort the oldest cities in Europe',
    media: {
      type: MediaType.Image,
      url: 'https://example.com/question-image.png',
    },
    values: ['Athens', 'Argos', 'Plovdiv', 'Lisbon'],
    points: 1000,
    duration: 30,
    ...(question ?? {}),
  }
}
