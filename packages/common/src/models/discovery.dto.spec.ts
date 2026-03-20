import { describe, expect, it } from 'vitest'

import {
  DiscoveryQuizCardDto,
  DiscoveryResponseDto,
  DiscoverySectionDto,
  DiscoverySectionKey,
  DiscoverySectionPageResponseDto,
} from './discovery.dto'
import { GameMode } from './game-mode.enum'
import { LanguageCode } from './language-code.enum'
import { QuizCategory } from './quiz.dto'

describe('DiscoverySectionKey', () => {
  const EXPECTED_KEYS = [
    'FEATURED',
    'TRENDING',
    'TOP_RATED',
    'MOST_PLAYED',
    'NEW_AND_NOTEWORTHY',
    'CATEGORY_SPOTLIGHT',
  ]

  it('contains exactly the six expected string values', () => {
    const values = Object.values(DiscoverySectionKey)
    expect(values).toHaveLength(6)
    expect(values).toEqual(expect.arrayContaining(EXPECTED_KEYS))
  })

  it('does not contain any extra values', () => {
    const values = Object.values(DiscoverySectionKey)
    expect(values.every((v) => EXPECTED_KEYS.includes(v))).toBe(true)
  })

  it.each(EXPECTED_KEYS)('includes %s', (key) => {
    expect(Object.values(DiscoverySectionKey)).toContain(key)
  })
})

describe('DiscoveryQuizCardDto shape', () => {
  const card: DiscoveryQuizCardDto = {
    id: 'quiz-1',
    title: 'Science Basics',
    description: 'A quiz about basic science topics',
    imageCoverURL: 'https://example.com/cover.jpg',
    category: QuizCategory.Science,
    languageCode: LanguageCode.English,
    mode: GameMode.Classic,
    numberOfQuestions: 10,
    author: { id: 'author-1', name: 'Alice' },
    gameplaySummary: { count: 42, totalPlayerCount: 150 },
    ratingSummary: { stars: 4.5, comments: 8, total: 10 },
    created: new Date('2024-01-15T12:00:00Z'),
  }

  it('has an id field', () => {
    expect(card.id).toBe('quiz-1')
  })

  it('has a title field', () => {
    expect(card.title).toBe('Science Basics')
  })

  it('has a category field', () => {
    expect(card.category).toBe(QuizCategory.Science)
  })

  it('has a languageCode field', () => {
    expect(card.languageCode).toBe(LanguageCode.English)
  })

  it('has a mode field', () => {
    expect(card.mode).toBe(GameMode.Classic)
  })

  it('has a numberOfQuestions field', () => {
    expect(card.numberOfQuestions).toBe(10)
  })

  it('has an author with id and name', () => {
    expect(card.author.id).toBe('author-1')
    expect(card.author.name).toBe('Alice')
  })

  it('has a gameplaySummary with count and totalPlayerCount', () => {
    expect(card.gameplaySummary.count).toBe(42)
    expect(card.gameplaySummary.totalPlayerCount).toBe(150)
  })

  it('has a ratingSummary with stars and comments', () => {
    expect(card.ratingSummary.stars).toBe(4.5)
    expect(card.ratingSummary.comments).toBe(8)
  })

  it('has a created date', () => {
    expect(card.created).toBeInstanceOf(Date)
  })
})

describe('DiscoverySectionDto shape', () => {
  const section: DiscoverySectionDto = {
    key: DiscoverySectionKey.TRENDING,
    quizzes: [],
  }

  it('has a key field', () => {
    expect(section.key).toBe(DiscoverySectionKey.TRENDING)
  })

  it('has a quizzes array', () => {
    expect(Array.isArray(section.quizzes)).toBe(true)
  })
})

describe('DiscoveryResponseDto shape', () => {
  it('has a sections array and a generatedAt date', () => {
    const response: DiscoveryResponseDto = {
      sections: [],
      generatedAt: new Date('2025-06-01T00:00:00Z'),
    }
    expect(Array.isArray(response.sections)).toBe(true)
    expect(response.generatedAt).toBeInstanceOf(Date)
  })

  it('allows generatedAt to be null when no snapshot exists', () => {
    const response: DiscoveryResponseDto = {
      sections: [],
      generatedAt: null,
    }
    expect(response.generatedAt).toBeNull()
  })
})

describe('DiscoverySectionPageResponseDto shape', () => {
  const page: DiscoverySectionPageResponseDto = {
    key: DiscoverySectionKey.TOP_RATED,
    results: [],
    snapshotTotal: 50,
    limit: 10,
    offset: 0,
  }

  it('uses results (not quizzes) as the quiz list field', () => {
    expect(Array.isArray(page.results)).toBe(true)
    expect((page as Record<string, unknown>)['quizzes']).toBeUndefined()
  })

  it('has a snapshotTotal field', () => {
    expect(page.snapshotTotal).toBe(50)
  })

  it('has a limit field', () => {
    expect(page.limit).toBe(10)
  })

  it('has an offset field', () => {
    expect(page.offset).toBe(0)
  })

  it('has a key field', () => {
    expect(page.key).toBe(DiscoverySectionKey.TOP_RATED)
  })

  it('does not have a cursor field', () => {
    expect((page as Record<string, unknown>)['cursor']).toBeUndefined()
  })

  it('does not have a total (db-count) field', () => {
    expect((page as Record<string, unknown>)['total']).toBeUndefined()
  })
})
