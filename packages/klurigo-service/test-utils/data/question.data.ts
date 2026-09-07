import {
  MediaType,
  QuestionPinTolerance,
  QuestionRangeAnswerMargin,
  QuestionType,
} from '@klurigo/common'

import {
  BaseQuestionDao,
  QuestionDao,
  QuestionMultiChoiceWithBase,
  QuestionPinDao,
  QuestionPuzzleDao,
  QuestionRangeDao,
  QuestionTrueFalseDao,
  QuestionTypeAnswerDao,
} from '../../src/modules/quiz-core/repositories/models/schemas'

import { MOCK_TYPE_ANSWER_OPTION_VALUE } from './game.constants'

export function createMockMultiChoiceQuestionDocument(
  question?: Partial<QuestionMultiChoiceWithBase>,
): QuestionDao {
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
  question?: Partial<BaseQuestionDao & QuestionRangeDao>,
): QuestionDao {
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
  question?: Partial<BaseQuestionDao & QuestionTrueFalseDao>,
): QuestionDao {
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
  question?: Partial<BaseQuestionDao & QuestionTypeAnswerDao>,
): QuestionDao {
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
  question?: Partial<BaseQuestionDao & QuestionPinDao>,
): BaseQuestionDao & QuestionPinDao {
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
  question?: Partial<BaseQuestionDao & QuestionPuzzleDao>,
): BaseQuestionDao & QuestionPuzzleDao {
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
