import { DiscoverySectionKey } from '@klurigo/common'
import { getModelToken } from '@nestjs/mongoose'
import { Test, TestingModule } from '@nestjs/testing'
import type { Model } from 'mongoose'

import { DISCOVERY_SNAPSHOT_SINGLETON_ID } from '../constants'

import { DiscoverySnapshotRepository } from './discovery-snapshot.repository'
import { DiscoverySnapshot, DiscoverySnapshotDocument } from './models/schemas'

jest.mock('../../../app/shared/repository', () => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  class BaseRepository<T> {
    protected readonly model: unknown

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    constructor(model: unknown, _entityName: string) {
      this.model = model
    }
  }

  return { BaseRepository }
})

describe(DiscoverySnapshotRepository.name, () => {
  let repository: DiscoverySnapshotRepository
  let model: Partial<Model<DiscoverySnapshot>>

  beforeEach(async () => {
    model = {
      findById: jest.fn(),
      findOneAndReplace: jest.fn(),
      updateOne: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DiscoverySnapshotRepository,
        {
          provide: getModelToken(DiscoverySnapshot.name),
          useValue: model,
        },
      ],
    }).compile()

    repository = module.get<DiscoverySnapshotRepository>(
      DiscoverySnapshotRepository,
    )

    jest.clearAllMocks()
  })

  describe('findLatest', () => {
    it('returns null when the collection is empty', async () => {
      ;(model.findById as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      })

      const result = await repository.findLatest()

      expect(result).toBeNull()
      expect(model.findById).toHaveBeenCalledWith(
        DISCOVERY_SNAPSHOT_SINGLETON_ID,
      )
    })

    it('returns document with entries shape [{ quizId: string, score: number }]', async () => {
      const snapshot = {
        _id: DISCOVERY_SNAPSHOT_SINGLETON_ID,
        generatedAt: new Date('2025-01-01T00:00:00.000Z'),
        sections: [
          {
            key: DiscoverySectionKey.TRENDING,
            entries: [
              { quizId: 'quiz-1', score: 0.95 },
              { quizId: 'quiz-2', score: 0.87 },
            ],
          },
        ],
      } as unknown as DiscoverySnapshotDocument

      ;(model.findById as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(snapshot),
      })

      const result = await repository.findLatest()

      expect(result).not.toBeNull()
      expect(result!.sections).toHaveLength(1)
      expect(result!.sections[0].entries).toHaveLength(2)
      expect(result!.sections[0].entries[0]).toMatchObject({
        quizId: expect.any(String),
        score: expect.any(Number),
      })
      expect(result!.sections[0].entries[0].quizId).toBe('quiz-1')
      expect(result!.sections[0].entries[0].score).toBe(0.95)
    })
  })

  describe('findLatestWithQuizzes', () => {
    it('returns null when the collection is empty', async () => {
      const execMock = jest.fn().mockResolvedValue(null)
      const populateMock = jest.fn().mockReturnValue({ exec: execMock })
      ;(model.findById as jest.Mock).mockReturnValue({ populate: populateMock })

      const result = await repository.findLatestWithQuizzes()

      expect(result).toBeNull()
      expect(model.findById).toHaveBeenCalledWith(
        DISCOVERY_SNAPSHOT_SINGLETON_ID,
      )
      expect(populateMock).toHaveBeenCalledWith({
        path: 'sections.entries.quizId',
      })
    })

    it('calls populate with the correct nested path', async () => {
      const snapshot = {
        _id: DISCOVERY_SNAPSHOT_SINGLETON_ID,
        generatedAt: new Date('2025-01-01T00:00:00.000Z'),
        sections: [],
      } as unknown as DiscoverySnapshotDocument

      const execMock = jest.fn().mockResolvedValue(snapshot)
      const populateMock = jest.fn().mockReturnValue({ exec: execMock })
      ;(model.findById as jest.Mock).mockReturnValue({ populate: populateMock })

      await repository.findLatestWithQuizzes()

      expect(populateMock).toHaveBeenCalledWith({
        path: 'sections.entries.quizId',
      })
    })

    it('returns the document when present', async () => {
      const snapshot = {
        _id: DISCOVERY_SNAPSHOT_SINGLETON_ID,
        generatedAt: new Date('2025-01-01T00:00:00.000Z'),
        sections: [
          {
            key: DiscoverySectionKey.TRENDING,
            entries: [
              { quizId: { _id: 'quiz-1', title: 'Test Quiz' }, score: 0.95 },
            ],
          },
        ],
      } as unknown as DiscoverySnapshotDocument

      const execMock = jest.fn().mockResolvedValue(snapshot)
      const populateMock = jest.fn().mockReturnValue({ exec: execMock })
      ;(model.findById as jest.Mock).mockReturnValue({ populate: populateMock })

      const result = await repository.findLatestWithQuizzes()

      expect(result).toBe(snapshot)
    })
  })

  describe('upsertLatest', () => {
    it('replaces the existing document and preserves the singleton id', async () => {
      const execMock = jest.fn().mockResolvedValue(null)
      ;(model.findOneAndReplace as jest.Mock).mockReturnValue({
        exec: execMock,
      })

      const firstSnapshot = {
        generatedAt: new Date('2025-01-01T00:00:00.000Z'),
        sections: [],
      }

      await repository.upsertLatest(firstSnapshot)

      expect(model.findOneAndReplace).toHaveBeenCalledWith(
        { _id: DISCOVERY_SNAPSHOT_SINGLETON_ID },
        { _id: DISCOVERY_SNAPSHOT_SINGLETON_ID, ...firstSnapshot },
        { upsert: true },
      )

      const secondSnapshot = {
        generatedAt: new Date('2025-02-01T00:00:00.000Z'),
        sections: [
          {
            key: DiscoverySectionKey.TRENDING,
            entries: [{ quizId: 'quiz-3', score: 0.99 }],
          },
        ],
      }

      await repository.upsertLatest(secondSnapshot)

      expect(model.findOneAndReplace).toHaveBeenCalledTimes(2)
      expect(model.findOneAndReplace).toHaveBeenLastCalledWith(
        { _id: DISCOVERY_SNAPSHOT_SINGLETON_ID },
        { _id: DISCOVERY_SNAPSHOT_SINGLETON_ID, ...secondSnapshot },
        { upsert: true },
      )

      const lastCallArgs = (model.findOneAndReplace as jest.Mock).mock.calls[1]
      expect(lastCallArgs[0]).toEqual({ _id: DISCOVERY_SNAPSHOT_SINGLETON_ID })
      expect(lastCallArgs[1]._id).toBe(DISCOVERY_SNAPSHOT_SINGLETON_ID)
    })
  })

  describe('removeQuizFromSnapshot', () => {
    it('pulls the quiz from every section without replacing the snapshot', async () => {
      const execMock = jest.fn().mockResolvedValue({ modifiedCount: 1 })
      ;(model.updateOne as jest.Mock).mockReturnValue({ exec: execMock })

      await repository.removeQuizFromSnapshot('quiz-2')

      expect(model.updateOne).toHaveBeenCalledWith(
        { _id: DISCOVERY_SNAPSHOT_SINGLETON_ID },
        { $pull: { 'sections.$[].entries': { quizId: 'quiz-2' } } },
      )
      expect(execMock).toHaveBeenCalledTimes(1)
      expect(model.findById).not.toHaveBeenCalled()
      expect(model.findOneAndReplace).not.toHaveBeenCalled()
    })

    it('succeeds when the snapshot or quiz is not present', async () => {
      const execMock = jest.fn().mockResolvedValue({ modifiedCount: 0 })
      ;(model.updateOne as jest.Mock).mockReturnValue({ exec: execMock })

      await expect(
        repository.removeQuizFromSnapshot('missing-quiz'),
      ).resolves.toBeUndefined()
    })
  })
})
