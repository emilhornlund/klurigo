import {
  GameMode,
  LanguageCode,
  MediaType,
  QuestionPinTolerance,
  QuestionRangeAnswerMargin,
  QuestionType,
  QuizCategory,
  QuizVisibility,
} from '@klurigo/common'
import { v4 as uuidv4 } from 'uuid'

import { Quiz } from '../../src/modules/quiz-core/repositories/models/schemas'

import { buildMockPrimaryUser } from './user.data'

export function createMockClassicQuiz(quiz?: Partial<Quiz>): Quiz {
  return {
    _id: uuidv4(),
    title: 'Trivia Battle',
    description: 'A fun and engaging trivia quiz for all ages.',
    mode: GameMode.Classic,
    visibility: QuizVisibility.Public,
    category: QuizCategory.GeneralKnowledge,
    imageCoverURL: 'https://example.com/question-cover-image.png',
    languageCode: LanguageCode.English,
    questions: [
      {
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
            value: 'Copenhagen',
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
        duration: 30,
      },
      {
        type: QuestionType.Range,
        text: 'Guess the temperature of the hottest day ever recorded.',
        media: {
          type: MediaType.Image,
          url: 'https://example.com/question-image.png',
        },
        min: 0,
        max: 100,
        step: 0,
        correct: 50,
        margin: QuestionRangeAnswerMargin.Medium,
        points: 1000,
        duration: 30,
      },
      {
        type: QuestionType.TrueFalse,
        text: 'The earth is flat.',
        media: {
          type: MediaType.Image,
          url: 'https://example.com/question-image.png',
        },
        correct: false,
        points: 1000,
        duration: 30,
      },
      {
        type: QuestionType.TypeAnswer,
        text: 'What is the capital of Denmark?',
        media: {
          type: MediaType.Image,
          url: 'https://example.com/question-image.png',
        },
        options: ['Copenhagen'],
        points: 1000,
        duration: 30,
      },
      {
        type: QuestionType.Pin,
        text: 'Where is the Eiffel Tower located in Paris? Pin the answer on a map of Paris',
        imageURL: 'https://example.com/question-image.png',
        positionX: 0.5,
        positionY: 0.5,
        tolerance: QuestionPinTolerance.Medium,
        points: 1000,
        duration: 30,
        info: 'This is an info text displayed along the question result.',
      },
      {
        type: QuestionType.Puzzle,
        text: 'Sort the oldest cities in Europe',
        media: {
          type: MediaType.Image,
          url: 'https://example.com/question-image.png',
        },
        values: ['Athens', 'Argos', 'Plovdiv', 'Lisbon'],
        points: 1000,
        duration: 30,
        info: 'This is an info text displayed along the question result.',
      },
    ],
    owner: buildMockPrimaryUser(),
    gameplaySummary: {
      count: 0,
      totalPlayerCount: 0,
      totalClassicCorrectCount: 0,
      totalClassicIncorrectCount: 0,
      totalClassicUnansweredCount: 0,
      totalZeroToOneHundredPrecisionSum: 0,
      totalZeroToOneHundredAnsweredCount: 0,
      totalZeroToOneHundredUnansweredCount: 0,
    },
    ratingSummary: {
      count: 0,
      avg: 0,
      stars: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 },
      commentCount: 0,
    },
    created: new Date(),
    updated: new Date(),
    ...(quiz ?? {}),
  }
}

export function createMockZeroToOneHundredQuiz(quiz?: Partial<Quiz>): Quiz {
  return {
    _id: uuidv4(),
    title: 'Trivia Battle',
    description: 'A fun and engaging trivia quiz for all ages.',
    mode: GameMode.ZeroToOneHundred,
    visibility: QuizVisibility.Public,
    category: QuizCategory.GeneralKnowledge,
    imageCoverURL: 'https://example.com/question-cover-image.png',
    languageCode: LanguageCode.English,
    questions: [
      {
        type: QuestionType.Range,
        text: 'Guess the temperature of the hottest day ever recorded.',
        media: {
          type: MediaType.Image,
          url: 'https://example.com/question-image.png',
        },
        min: 0,
        max: 100,
        margin: QuestionRangeAnswerMargin.None,
        step: 1,
        correct: 50,
        points: 0,
        duration: 30,
        info: 'This is an info text displayed along the question result.',
      },
    ],
    owner: buildMockPrimaryUser(),
    gameplaySummary: {
      count: 0,
      totalPlayerCount: 0,
      totalClassicCorrectCount: 0,
      totalClassicIncorrectCount: 0,
      totalClassicUnansweredCount: 0,
      totalZeroToOneHundredPrecisionSum: 0,
      totalZeroToOneHundredAnsweredCount: 0,
      totalZeroToOneHundredUnansweredCount: 0,
    },
    ratingSummary: {
      count: 0,
      avg: 0,
      stars: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 },
      commentCount: 0,
    },
    created: new Date(),
    updated: new Date(),
    ...(quiz ?? {}),
  }
}
