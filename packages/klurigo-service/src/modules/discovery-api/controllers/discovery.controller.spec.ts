import {
  DiscoverySectionKey,
  GameMode,
  LanguageCode,
  QuizCategory,
} from '@klurigo/common'
import { Test } from '@nestjs/testing'

import { QuizRepository } from '../../quiz-core/repositories'
import { Quiz } from '../../quiz-core/repositories/models/schemas'
import { DISCOVERY_RAIL_PREVIEW_SIZE } from '../constants'
import { DiscoverySnapshotRepository } from '../repositories'
import type {
  DiscoverySnapshotDocument,
  DiscoverySnapshotSection,
} from '../repositories/models/schemas'

import { DiscoveryController } from './discovery.controller'

function makeQuiz(id: string): Quiz {
  return {
    _id: id,
    title: `Quiz ${id}`,
    description: `Description for ${id}`,
    imageCoverURL: `https://cdn.example.com/${id}.jpg`,
    category: QuizCategory.Geography,
    languageCode: LanguageCode.English,
    mode: GameMode.Classic,
    questions: Array.from({ length: 10 }, (_, i) => ({ _id: `q${i}` })),
    owner: { _id: `owner-${id}`, defaultNickname: `Author ${id}` },
    gameplaySummary: {
      count: 100,
      totalPlayerCount: 50,
      lastPlayedAt: new Date('2026-01-01'),
      totalClassicCorrectCount: 0,
      totalClassicIncorrectCount: 0,
      totalClassicUnansweredCount: 0,
      totalZeroToOneHundredPrecisionSum: 0,
      totalZeroToOneHundredAnsweredCount: 0,
      totalZeroToOneHundredUnansweredCount: 0,
    },
    ratingSummary: {
      avg: 4.5,
      count: 10,
      commentCount: 3,
      stars: { '1': 0, '2': 0, '3': 0, '4': 2, '5': 8 },
    },
    created: new Date('2026-01-01'),
    updated: new Date('2026-01-02'),
  } as unknown as Quiz
}

function makeSnapshot(
  sections: DiscoverySnapshotSection[],
): DiscoverySnapshotDocument {
  return {
    _id: '00000000-0000-0000-0000-000000000000',
    generatedAt: new Date('2026-02-01T06:00:00Z'),
    sections,
  } as unknown as DiscoverySnapshotDocument
}

function makeSection(
  key: DiscoverySectionKey,
  count: number,
): DiscoverySnapshotSection {
  return {
    key,
    entries: Array.from({ length: count }, (_, i) => ({
      quizId: `${key}-q${i}`,
      score: 100 - i,
    })),
  } as DiscoverySnapshotSection
}

describe(DiscoveryController.name, () => {
  let controller: DiscoveryController
  let snapshotRepo: jest.Mocked<DiscoverySnapshotRepository>
  let quizRepo: jest.Mocked<QuizRepository>

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        DiscoveryController,
        {
          provide: DiscoverySnapshotRepository,
          useValue: { findLatest: jest.fn() },
        },
        {
          provide: QuizRepository,
          useValue: { findManyByIds: jest.fn() },
        },
      ],
    }).compile()

    controller = moduleRef.get(DiscoveryController)
    snapshotRepo = moduleRef.get(DiscoverySnapshotRepository)
    quizRepo = moduleRef.get(QuizRepository)
  })

  describe('GET /discover', () => {
    it('returns empty sections and null generatedAt when no snapshot exists', async () => {
      snapshotRepo.findLatest.mockResolvedValueOnce(null)

      const result = await controller.getDiscovery()

      expect(result).toEqual({ sections: [], generatedAt: null })
      expect(quizRepo.findManyByIds).not.toHaveBeenCalled()
    })

    it('slices entries to DISCOVERY_RAIL_PREVIEW_SIZE and calls findManyByIds', async () => {
      const section = makeSection(DiscoverySectionKey.TRENDING, 25)
      const snapshot = makeSnapshot([section])
      snapshotRepo.findLatest.mockResolvedValueOnce(snapshot)

      const expectedIds = section.entries
        .slice(0, DISCOVERY_RAIL_PREVIEW_SIZE)
        .map((e) => e.quizId)
      const quizzes = expectedIds.map(makeQuiz)
      quizRepo.findManyByIds.mockResolvedValueOnce(quizzes)

      await controller.getDiscovery()

      expect(quizRepo.findManyByIds).toHaveBeenCalledTimes(1)
      const calledWithIds = quizRepo.findManyByIds.mock.calls[0][0]
      expect(calledWithIds).toEqual(expectedIds)
      expect(calledWithIds).toHaveLength(DISCOVERY_RAIL_PREVIEW_SIZE)
    })

    it('preserves snapshot entry order in output quizzes', async () => {
      const section: DiscoverySnapshotSection = {
        key: DiscoverySectionKey.TOP_RATED,
        entries: [
          { quizId: 'c', score: 90 },
          { quizId: 'a', score: 80 },
          { quizId: 'b', score: 70 },
        ],
      } as DiscoverySnapshotSection
      const snapshot = makeSnapshot([section])
      snapshotRepo.findLatest.mockResolvedValueOnce(snapshot)

      // Return quizzes in a different order than snapshot
      quizRepo.findManyByIds.mockResolvedValueOnce([
        makeQuiz('b'),
        makeQuiz('c'),
        makeQuiz('a'),
      ])

      const result = await controller.getDiscovery()

      expect(result.sections).toHaveLength(1)
      expect(result.sections[0].quizzes.map((q) => q.id)).toEqual([
        'c',
        'a',
        'b',
      ])
    })

    it('skips quizzes with a missing owner while retaining valid quizzes', async () => {
      const section: DiscoverySnapshotSection = {
        key: DiscoverySectionKey.TOP_RATED,
        entries: [
          { quizId: 'missing-owner', score: 90 },
          { quizId: 'valid-owner', score: 80 },
        ],
      } as DiscoverySnapshotSection
      snapshotRepo.findLatest.mockResolvedValueOnce(makeSnapshot([section]))

      const quizWithoutOwner = {
        ...makeQuiz('missing-owner'),
        owner: null,
      } as unknown as Quiz
      quizRepo.findManyByIds.mockResolvedValueOnce([
        quizWithoutOwner,
        makeQuiz('valid-owner'),
      ])

      const result = await controller.getDiscovery()

      expect(result.sections[0].quizzes.map((quiz) => quiz.id)).toEqual([
        'valid-owner',
      ])
    })

    it('returns sections in fixed order, skipping empty sections', async () => {
      const snapshot = makeSnapshot([
        makeSection(DiscoverySectionKey.MOST_PLAYED, 5),
        makeSection(DiscoverySectionKey.FEATURED, 3),
        makeSection(DiscoverySectionKey.TOP_RATED, 4),
      ])
      snapshotRepo.findLatest.mockResolvedValueOnce(snapshot)

      quizRepo.findManyByIds.mockImplementation(async (ids: string[]) =>
        ids.map(makeQuiz),
      )

      const result = await controller.getDiscovery()

      const keys = result.sections.map((s) => s.key)
      expect(keys).toEqual([
        DiscoverySectionKey.FEATURED,
        DiscoverySectionKey.TOP_RATED,
        DiscoverySectionKey.MOST_PLAYED,
      ])
    })
  })

  describe('GET /discover/section/:key', () => {
    it('returns paginated results with correct shape', async () => {
      const section = makeSection(DiscoverySectionKey.TOP_RATED, 150)
      const snapshot = makeSnapshot([section])
      snapshotRepo.findLatest.mockResolvedValueOnce(snapshot)

      const expectedIds = section.entries.slice(0, 10).map((e) => e.quizId)
      quizRepo.findManyByIds.mockResolvedValueOnce(expectedIds.map(makeQuiz))

      const result = await controller.getSection(
        DiscoverySectionKey.TOP_RATED,
        10,
        0,
      )

      expect(result.key).toBe(DiscoverySectionKey.TOP_RATED)
      expect(result.results).toHaveLength(10)
      expect(result.snapshotTotal).toBe(150)
      expect(result.limit).toBe(10)
      expect(result.offset).toBe(0)
    })

    it('skips quizzes with a missing owner while retaining valid results', async () => {
      const section: DiscoverySnapshotSection = {
        key: DiscoverySectionKey.TOP_RATED,
        entries: [
          { quizId: 'missing-owner', score: 90 },
          { quizId: 'valid-owner', score: 80 },
        ],
      } as DiscoverySnapshotSection
      snapshotRepo.findLatest.mockResolvedValueOnce(makeSnapshot([section]))

      const quizWithoutOwner = {
        ...makeQuiz('missing-owner'),
        owner: null,
      } as unknown as Quiz
      quizRepo.findManyByIds.mockResolvedValueOnce([
        quizWithoutOwner,
        makeQuiz('valid-owner'),
      ])

      const result = await controller.getSection(
        DiscoverySectionKey.TOP_RATED,
        10,
        0,
      )

      expect(result.results.map((quiz) => quiz.id)).toEqual(['valid-owner'])
    })

    it('applies offset correctly', async () => {
      const section = makeSection(DiscoverySectionKey.TOP_RATED, 30)
      const snapshot = makeSnapshot([section])
      snapshotRepo.findLatest.mockResolvedValueOnce(snapshot)

      const expectedIds = section.entries.slice(10, 20).map((e) => e.quizId)
      quizRepo.findManyByIds.mockResolvedValueOnce(expectedIds.map(makeQuiz))

      const result = await controller.getSection(
        DiscoverySectionKey.TOP_RATED,
        10,
        10,
      )

      expect(result.results).toHaveLength(10)
      expect(result.offset).toBe(10)
      expect(result.results[0].id).toBe('TOP_RATED-q10')
    })

    it('snapshotTotal equals entries.length, not DB count', async () => {
      const section = makeSection(DiscoverySectionKey.TOP_RATED, 150)
      const snapshot = makeSnapshot([section])
      snapshotRepo.findLatest.mockResolvedValueOnce(snapshot)

      quizRepo.findManyByIds.mockResolvedValueOnce([])

      const result = await controller.getSection(
        DiscoverySectionKey.TOP_RATED,
        10,
        0,
      )

      expect(result.snapshotTotal).toBe(150)
    })

    it('returns empty results for unknown section key', async () => {
      const snapshot = makeSnapshot([
        makeSection(DiscoverySectionKey.TRENDING, 10),
      ])
      snapshotRepo.findLatest.mockResolvedValueOnce(snapshot)

      const result = await controller.getSection(
        DiscoverySectionKey.FEATURED,
        10,
        0,
      )

      expect(result.results).toEqual([])
      expect(result.snapshotTotal).toBe(0)
      expect(result.limit).toBe(10)
      expect(result.offset).toBe(0)
    })

    it('returns empty results when no snapshot exists', async () => {
      snapshotRepo.findLatest.mockResolvedValueOnce(null)

      const result = await controller.getSection(
        DiscoverySectionKey.TOP_RATED,
        20,
        0,
      )

      expect(result.results).toEqual([])
      expect(result.snapshotTotal).toBe(0)
    })

    it('returns empty results when offset exceeds entries length', async () => {
      const section = makeSection(DiscoverySectionKey.TOP_RATED, 5)
      const snapshot = makeSnapshot([section])
      snapshotRepo.findLatest.mockResolvedValueOnce(snapshot)

      quizRepo.findManyByIds.mockResolvedValueOnce([])

      const result = await controller.getSection(
        DiscoverySectionKey.TOP_RATED,
        10,
        100,
      )

      expect(result.results).toEqual([])
      expect(result.snapshotTotal).toBe(5)
      expect(result.offset).toBe(100)
    })
  })
})
