import {
  MediaType,
  QuestionMultiChoiceDto,
  QuestionType,
} from '@klurigo/common'

export const QuestionResponseMultiChoiceExample = {
  id: 'eaf37189-7aa7-455e-9e47-73db2a7d0a03',
  type: QuestionType.MultiChoice,
  question: 'What is the capital of Sweden?',
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
  created: new Date(),
  updated: new Date(),
} as QuestionMultiChoiceDto
