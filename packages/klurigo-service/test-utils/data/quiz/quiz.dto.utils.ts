import {
  GameMode,
  LanguageCode,
  MediaType,
  QuestionMediaDto,
  QuestionMultiChoiceDto,
  QuestionPinDto,
  QuestionPinTolerance,
  QuestionPuzzleDto,
  QuestionRangeAnswerMargin,
  QuestionRangeDto,
  QuestionTrueFalseDto,
  QuestionType,
  QuestionTypeAnswerDto,
  QuestionZeroToOneHundredRangeDto,
  QuizCategory,
  QuizClassicModeRequestDto,
  QuizVisibility,
  QuizZeroToOneHundredModeRequestDto,
} from '@klurigo/common'

export function createMockQuestionMediaDto(
  dto?: Partial<QuestionMediaDto>,
): QuestionMediaDto {
  return {
    type: MediaType.Image,
    url: 'https://example.com/question-image.png',
    ...(dto ?? {}),
  }
}

export function createMockQuestionMultiChoiceDto(
  dto?: Partial<QuestionMultiChoiceDto>,
): QuestionMultiChoiceDto {
  return {
    type: QuestionType.MultiChoice,
    question: 'What is the capital of Sweden?',
    media: createMockQuestionMediaDto(),
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
    info: 'This is an info text displayed along the question result.',
    ...(dto ?? {}),
  }
}

export function createMockQuestionRangeDto(
  dto?: Partial<QuestionRangeDto>,
): QuestionRangeDto {
  return {
    type: QuestionType.Range,
    question: 'Guess the temperature of the hottest day ever recorded.',
    media: createMockQuestionMediaDto(),
    min: 0,
    max: 100,
    correct: 50,
    margin: QuestionRangeAnswerMargin.Medium,
    points: 1000,
    duration: 30,
    info: 'This is an info text displayed along the question result.',
    ...(dto ?? {}),
  }
}

export function createMockQuestionTrueFalseDto(
  dto?: Partial<QuestionTrueFalseDto>,
): QuestionTrueFalseDto {
  return {
    type: QuestionType.TrueFalse,
    question: 'The earth is flat.',
    media: createMockQuestionMediaDto(),
    correct: false,
    points: 1000,
    duration: 30,
    info: 'This is an info text displayed along the question result.',
    ...(dto ?? {}),
  }
}

export function createMockQuestionTypeAnswerDto(
  dto?: Partial<QuestionTypeAnswerDto>,
): QuestionTypeAnswerDto {
  return {
    type: QuestionType.TypeAnswer,
    question: 'What is the capital of Denmark?',
    media: createMockQuestionMediaDto(),
    options: ['Copenhagen'],
    points: 1000,
    duration: 30,
    info: 'This is an info text displayed along the question result.',
    ...(dto ?? {}),
  }
}

export function createMockQuestionPinDto(
  dto?: Partial<QuestionPinDto>,
): QuestionPinDto {
  return {
    type: QuestionType.Pin,
    question:
      'Where is the Eiffel Tower located in Paris? Pin the answer on a map of Paris',
    imageURL: 'https://example.com/question-image.png',
    positionX: 0.5,
    positionY: 0.5,
    tolerance: QuestionPinTolerance.Medium,
    points: 1000,
    duration: 30,
    info: 'This is an info text displayed along the question result.',
    ...(dto ?? {}),
  }
}

export function createMockQuestionPuzzleDto(
  dto?: Partial<QuestionPuzzleDto>,
): QuestionPuzzleDto {
  return {
    type: QuestionType.Puzzle,
    question: 'Sort the oldest cities in Europe',
    media: createMockQuestionMediaDto(),
    values: ['Athens', 'Argos', 'Plovdiv', 'Lisbon'],
    points: 1000,
    duration: 30,
    info: 'This is an info text displayed along the question result.',
    ...(dto ?? {}),
  }
}

export function createMockQuestionZeroToOneHundredRangeDto(
  dto?: Partial<QuestionZeroToOneHundredRangeDto>,
): QuestionZeroToOneHundredRangeDto {
  return {
    type: QuestionType.Range,
    question: 'Guess the temperature of the hottest day ever recorded.',
    media: createMockQuestionMediaDto(),
    correct: 50,
    duration: 30,
    info: 'This is an info text displayed along the question result.',
    ...(dto ?? {}),
  }
}

export function createMockClassicQuizRequestDto(
  dto?: Partial<QuizClassicModeRequestDto>,
): QuizClassicModeRequestDto {
  return {
    title: 'Trivia Battle',
    description: 'A fun and engaging trivia quiz for all ages.',
    mode: GameMode.Classic,
    visibility: QuizVisibility.Public,
    category: QuizCategory.GeneralKnowledge,
    imageCoverURL: 'https://example.com/question-cover-image.png',
    languageCode: LanguageCode.English,
    questions: [
      createMockQuestionMultiChoiceDto(),
      createMockQuestionRangeDto(),
      createMockQuestionTrueFalseDto(),
      createMockQuestionTypeAnswerDto(),
      createMockQuestionPinDto(),
      createMockQuestionPuzzleDto(),
    ],
    ...(dto ?? {}),
  }
}

export function createMockZeroToOneHundredQuizRequestDto(
  dto?: Partial<QuizZeroToOneHundredModeRequestDto>,
): QuizZeroToOneHundredModeRequestDto {
  return {
    title: 'Trivia Battle',
    description: 'A fun and engaging trivia quiz for all ages.',
    mode: GameMode.ZeroToOneHundred,
    visibility: QuizVisibility.Public,
    category: QuizCategory.GeneralKnowledge,
    imageCoverURL: 'https://example.com/question-cover-image.png',
    languageCode: LanguageCode.English,
    questions: [createMockQuestionZeroToOneHundredRangeDto()],
    ...(dto ?? {}),
  }
}
