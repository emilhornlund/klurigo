import {
  type DiscoveryQuizCardDto,
  GameMode,
  LanguageCode,
  QuizCategory,
  type QuizResponseDto,
  QuizVisibility,
} from '@klurigo/common'
import { describe, expect, it } from 'vitest'

import {
  toDifficultyLabel,
  toDiscoveryQuizCard,
  toDiscoveryQuizCards,
} from './quiz.utils'

const makeQuizResponse = (
  overrides?: Partial<QuizResponseDto>,
): QuizResponseDto => ({
  id: 'quiz-1',
  title: 'World capitals',
  description: 'Name the capital cities.',
  mode: GameMode.Classic,
  visibility: QuizVisibility.Public,
  category: QuizCategory.Geography,
  imageCoverURL: 'https://example.com/quiz-cover.jpg',
  languageCode: LanguageCode.English,
  numberOfQuestions: 12,
  author: {
    id: 'author-1',
    name: 'Jane Doe',
  },
  gameplaySummary: {
    count: 42,
    totalPlayerCount: 120,
  },
  ratingSummary: {
    stars: 4.6,
    comments: 8,
    total: 14,
  },
  created: new Date('2025-01-01T00:00:00.000Z'),
  updated: new Date('2025-01-02T00:00:00.000Z'),
  ...overrides,
})

describe('quiz.utils', () => {
  describe('toDifficultyLabel', () => {
    it('returns undefined when difficultyPercentage is missing', () => {
      expect(toDifficultyLabel()).toBeUndefined()
    })

    it('returns undefined when difficultyPercentage is not a number', () => {
      expect(toDifficultyLabel(undefined)).toBeUndefined()
      expect(toDifficultyLabel(null as unknown as number)).toBeUndefined()
      expect(toDifficultyLabel('0.5' as unknown as number)).toBeUndefined()
      expect(toDifficultyLabel(Number.NaN)).toBeUndefined()
    })

    it('clamps values below 0 to 0 (Easy)', () => {
      expect(toDifficultyLabel(-1)).toBe('Easy')
      expect(toDifficultyLabel(-0.0001)).toBe('Easy')
    })

    it('clamps values above 1 to 1 (Extreme)', () => {
      expect(toDifficultyLabel(1.0001)).toBe('Extreme')
      expect(toDifficultyLabel(2)).toBe('Extreme')
      expect(toDifficultyLabel(Number.POSITIVE_INFINITY)).toBe('Extreme')
    })

    it('maps Easy correctly (0.00..0.24)', () => {
      expect(toDifficultyLabel(0)).toBe('Easy')
      expect(toDifficultyLabel(0.1)).toBe('Easy')
      expect(toDifficultyLabel(0.2499)).toBe('Easy')
    })

    it('maps Medium correctly (0.25..0.49)', () => {
      expect(toDifficultyLabel(0.25)).toBe('Medium')
      expect(toDifficultyLabel(0.3)).toBe('Medium')
      expect(toDifficultyLabel(0.4999)).toBe('Medium')
    })

    it('maps Hard correctly (0.50..0.74)', () => {
      expect(toDifficultyLabel(0.5)).toBe('Hard')
      expect(toDifficultyLabel(0.6)).toBe('Hard')
      expect(toDifficultyLabel(0.7499)).toBe('Hard')
    })

    it('maps Extreme correctly (0.75..1.00)', () => {
      expect(toDifficultyLabel(0.75)).toBe('Extreme')
      expect(toDifficultyLabel(0.9)).toBe('Extreme')
      expect(toDifficultyLabel(1)).toBe('Extreme')
    })
  })

  describe('toDiscoveryQuizCard', () => {
    it('maps a backend quiz response to QuizDiscoveryCard-compatible data', () => {
      const quizResponse = makeQuizResponse()

      const result = toDiscoveryQuizCard(quizResponse)

      const expected: DiscoveryQuizCardDto = {
        id: 'quiz-1',
        title: 'World capitals',
        description: 'Name the capital cities.',
        imageCoverURL: 'https://example.com/quiz-cover.jpg',
        category: QuizCategory.Geography,
        languageCode: LanguageCode.English,
        mode: GameMode.Classic,
        numberOfQuestions: 12,
        author: {
          id: 'author-1',
          name: 'Jane Doe',
        },
        gameplaySummary: {
          count: 42,
          totalPlayerCount: 120,
        },
        ratingSummary: {
          stars: 4.6,
          comments: 8,
          total: 14,
        },
        created: new Date('2025-01-01T00:00:00.000Z'),
      }

      expect(result).toEqual(expected)
    })

    it('preserves optional fields when they are missing from the backend response', () => {
      const quizResponse = makeQuizResponse({
        description: undefined,
        imageCoverURL: undefined,
      })

      expect(toDiscoveryQuizCard(quizResponse)).toMatchObject({
        id: 'quiz-1',
        description: undefined,
        imageCoverURL: undefined,
      })
    })
  })

  describe('toDiscoveryQuizCards', () => {
    it('maps a list of backend quiz responses for discovery card rendering', () => {
      const firstQuiz = makeQuizResponse()
      const secondQuiz = makeQuizResponse({
        id: 'quiz-2',
        title: 'Historic battles',
        author: {
          id: 'author-2',
          name: 'John Smith',
        },
      })

      expect(toDiscoveryQuizCards([firstQuiz, secondQuiz])).toEqual([
        toDiscoveryQuizCard(firstQuiz),
        toDiscoveryQuizCard(secondQuiz),
      ])
    })
  })
})
