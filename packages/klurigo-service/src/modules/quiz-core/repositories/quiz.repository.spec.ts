import { QuizVisibility } from '@klurigo/common'

import { QuizNotFoundException } from '../exceptions'

jest.mock('murlock', () => ({
  MurLock:
    () =>
    (_target: unknown, _propertyKey: string, descriptor: PropertyDescriptor) =>
      descriptor,
}))

import {
  normalizeUploadedImageReference,
  QuizRepository,
} from './quiz.repository'

/**
 * We mock the shared repository layer so we can unit-test QuizRepository in isolation
 * (i.e., without depending on BaseRepository implementation details).
 */
jest.mock('../../../app/shared/repository', () => {
  class BaseRepositoryMock<T> {
    // Expose the methods QuizRepository delegates to.
    public count = jest.fn<Promise<number>, [unknown]>()
    public findWithPagination = jest.fn<
      Promise<{ documents: T[] }>,
      [
        unknown,
        { skip: number; limit: number; sort: unknown; populate?: unknown },
      ]
    >()
    public create = jest.fn<Promise<T>, [Partial<T>]>()
    public update = jest.fn<Promise<T | null>, [string, Partial<T>]>()
    public delete = jest.fn<Promise<boolean>, [string]>()

    // Keep constructor shape compatible with super(quizModel, 'Quiz')
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    constructor(_model: unknown, _entityName: string) {}
  }

  return {
    BaseRepository: BaseRepositoryMock,
    buildSortObject: jest.fn((opts: { field: string; direction: 1 | -1 }) => ({
      [opts.field]: opts.direction,
    })),
  }
})

// eslint-disable-next-line import/order
import { buildSortObject } from '../../../app/shared/repository'

type Quiz = {
  id: string
  title?: string
  created?: Date
  updated?: Date
  owner?: unknown
}

type QuizModel = {
  findById: jest.Mock
  find: jest.Mock
  exists: jest.Mock
}

describe('QuizRepository', () => {
  describe('normalizeUploadedImageReference', () => {
    it('normalizes managed uploads regardless of host', () => {
      expect(
        normalizeUploadedImageReference(
          'https://previous-klurigo-host.test/uploads/images/507f1f77bcf86cd799439011/550e8400-e29b-41d4-a716-446655440000.webp',
        ),
      ).toBe(
        '507f1f77bcf86cd799439011/550e8400-e29b-41d4-a716-446655440000.webp',
      )
    })

    it('ignores external and malformed image URLs', () => {
      expect(
        normalizeUploadedImageReference(
          'https://images.pexels.com/photos/123/photo.jpg',
        ),
      ).toBeUndefined()
      expect(
        normalizeUploadedImageReference(
          'https://images.example.test/507f1f77bcf86cd799439011/550e8400-e29b-41d4-a716-446655440000.webp',
        ),
      ).toBeUndefined()
      expect(
        normalizeUploadedImageReference('/uploads/images/../../secret.webp'),
      ).toBeUndefined()
      expect(normalizeUploadedImageReference('%%%')).toBeUndefined()
    })
  })

  let quizModel: QuizModel
  let repo: QuizRepository

  beforeEach(() => {
    jest.clearAllMocks()

    quizModel = {
      findById: jest.fn(),
      find: jest.fn(),
      exists: jest.fn(),
    }

    // QuizRepository expects @InjectModel(Quiz.name) which is a Mongoose model.
    // For unit tests we only need the subset we use (findById + populate chain).
    repo = new QuizRepository(quizModel as unknown as never)
  })

  describe('findReferencedUploadedImages', () => {
    it('collects deduplicated local cover, question media, and Pin image references', async () => {
      const cursor = {
        async *[Symbol.asyncIterator]() {
          yield {
            imageCoverURL:
              'https://old-host.test/uploads/images/507f1f77bcf86cd799439011/550e8400-e29b-41d4-a716-446655440000.webp',
            questions: [
              {
                media: {
                  url: '/uploads/images/507f1f77bcf86cd799439011/550e8400-e29b-41d4-a716-446655440000.webp',
                },
              },
              {
                imageURL:
                  'https://current-host.test/uploads/images/507f1f77bcf86cd799439011/6ba7b810-9dad-41d1-80b4-00c04fd430c8.webp',
              },
              {
                media: {
                  url: 'https://images.pexels.com/photos/123/image.jpg',
                },
              },
            ],
          }
        },
      }
      const lean = jest
        .fn()
        .mockReturnValue({ cursor: jest.fn().mockReturnValue(cursor) })
      quizModel.find.mockReturnValue({ lean })

      await expect(repo.findReferencedUploadedImages()).resolves.toEqual(
        new Set([
          '507f1f77bcf86cd799439011/550e8400-e29b-41d4-a716-446655440000.webp',
          '507f1f77bcf86cd799439011/6ba7b810-9dad-41d1-80b4-00c04fd430c8.webp',
        ]),
      )
      expect(quizModel.find).toHaveBeenCalledWith(
        {},
        {
          imageCoverURL: 1,
          'questions.media.url': 1,
          'questions.imageURL': 1,
        },
      )
    })
  })

  describe('isUploadedImageReferenced', () => {
    it.each([
      '/uploads/images/507f1f77bcf86cd799439011/550e8400-e29b-41d4-a716-446655440000.webp',
      'https://cdn.example.test/uploads/images/507f1f77bcf86cd799439011/550e8400-e29b-41d4-a716-446655440000.webp?size=large',
      'https://cdn.example.test/uploads%2Fimages%2F507f1f77bcf86cd799439011%2F550e8400-e29b-41d4-a716-446655440000%2Ewebp#preview',
      '507f1f77bcf86cd799439011/550e8400-e29b-41d4-a716-446655440000.webp',
    ])('uses a Mongo existence query matching %s', async (reference) => {
      const exec = jest.fn().mockResolvedValue({ _id: 'quiz-1' })
      quizModel.exists.mockReturnValue({ exec })

      await expect(
        repo.isUploadedImageReferenced(
          '507f1f77bcf86cd799439011/550e8400-e29b-41d4-a716-446655440000.webp',
        ),
      ).resolves.toBe(true)

      const query = quizModel.exists.mock.calls[0][0] as {
        $or: Array<Record<string, RegExp>>
      }
      expect(query.$or).toHaveLength(3)
      for (const field of [
        'imageCoverURL',
        'questions.media.url',
        'questions.imageURL',
      ]) {
        const pattern = query.$or.find((condition) => condition[field])?.[field]
        expect(pattern).toBeInstanceOf(RegExp)
        expect(pattern?.test(reference)).toBe(true)
      }
      expect(exec).toHaveBeenCalledTimes(1)
    })

    it('fails closed for unsafe relative paths without querying Mongo', async () => {
      await expect(
        repo.isUploadedImageReferenced('../unsafe.webp'),
      ).resolves.toBe(true)
      expect(quizModel.exists).not.toHaveBeenCalled()
    })

    it('returns false when MongoDB confirms no image reference exists', async () => {
      quizModel.exists.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      })

      await expect(
        repo.isUploadedImageReferenced(
          '507f1f77bcf86cd799439011/550e8400-e29b-41d4-a716-446655440000.webp',
        ),
      ).resolves.toBe(false)
    })
  })

  describe('findQuizByIdOrThrow', () => {
    it('returns the populated document when found', async () => {
      const quizId = 'quiz-1'
      const document = { id: quizId } as unknown as Quiz

      const populate = jest.fn().mockResolvedValue(document)
      quizModel.findById.mockReturnValue({ populate })

      await expect(repo.findQuizByIdOrThrow(quizId)).resolves.toBe(document)

      expect(quizModel.findById).toHaveBeenCalledTimes(1)
      expect(quizModel.findById).toHaveBeenCalledWith(quizId)

      expect(populate).toHaveBeenCalledTimes(1)
      expect(populate).toHaveBeenCalledWith('owner')
    })

    it('throws QuizNotFoundException when not found', async () => {
      const quizId = 'missing-quiz'

      const populate = jest.fn().mockResolvedValue(null)
      quizModel.findById.mockReturnValue({ populate })

      await expect(repo.findQuizByIdOrThrow(quizId)).rejects.toBeInstanceOf(
        QuizNotFoundException,
      )

      expect(quizModel.findById).toHaveBeenCalledWith(quizId)
      expect(populate).toHaveBeenCalledWith('owner')
    })
  })

  describe('countQuizzes', () => {
    it('delegates to BaseRepository.count with the provided filter', async () => {
      const filter = { owner: 'owner-1' }
      ;(repo as unknown as { count: jest.Mock }).count.mockResolvedValue(42)

      await expect(repo.countQuizzes(filter as never)).resolves.toBe(42)

      expect(
        (repo as unknown as { count: jest.Mock }).count,
      ).toHaveBeenCalledTimes(1)
      expect(
        (repo as unknown as { count: jest.Mock }).count,
      ).toHaveBeenCalledWith(filter)
    })
  })

  describe('countPublicQuizzesByOwnerId', () => {
    it('counts only public quizzes for the given owner', async () => {
      const countMock = (repo as unknown as { count: jest.Mock }).count
      countMock.mockResolvedValue(7)

      await expect(repo.countPublicQuizzesByOwnerId('owner-1')).resolves.toBe(7)

      expect(countMock).toHaveBeenCalledTimes(1)
      expect(countMock).toHaveBeenCalledWith({
        owner: 'owner-1',
        visibility: QuizVisibility.Public,
      })
    })
  })

  describe('findQuizzes', () => {
    it('uses defaults (sortField=created, sortOrder=desc, limit=10, offset=0) and returns documents', async () => {
      const filter = { owner: 'owner-1' }
      const documents: Quiz[] = [{ id: 'q1' }, { id: 'q2' }]

      ;(
        repo as unknown as { findWithPagination: jest.Mock }
      ).findWithPagination.mockResolvedValue({ documents })

      await expect(repo.findQuizzes(filter as never)).resolves.toEqual(
        documents,
      )

      expect(buildSortObject).toHaveBeenCalledTimes(1)
      expect(buildSortObject).toHaveBeenCalledWith({
        field: 'created',
        direction: -1,
      })

      expect(
        (repo as unknown as { findWithPagination: jest.Mock })
          .findWithPagination,
      ).toHaveBeenCalledTimes(1)

      expect(
        (repo as unknown as { findWithPagination: jest.Mock })
          .findWithPagination,
      ).toHaveBeenCalledWith(filter, {
        skip: 0,
        limit: 10,
        sort: { created: -1 },
        populate: 'owner',
      })
    })

    it('supports sorting ascending and custom pagination params', async () => {
      const filter = { title: /history/i }
      const documents: Quiz[] = [{ id: 'q10' }]

      ;(
        repo as unknown as { findWithPagination: jest.Mock }
      ).findWithPagination.mockResolvedValue({ documents })

      await expect(
        repo.findQuizzes(filter as never, 'title', 'asc', 25, 50),
      ).resolves.toEqual(documents)

      expect(buildSortObject).toHaveBeenCalledTimes(1)
      expect(buildSortObject).toHaveBeenCalledWith({
        field: 'title',
        direction: 1,
      })

      expect(
        (repo as unknown as { findWithPagination: jest.Mock })
          .findWithPagination,
      ).toHaveBeenCalledWith(filter, {
        skip: 50,
        limit: 25,
        sort: { title: 1 },
        populate: 'owner',
      })
    })
  })

  describe('createQuiz', () => {
    it('delegates to BaseRepository.create and returns the created document', async () => {
      const input: Partial<Quiz> = { title: 'My quiz' }
      const created = { id: 'new', title: 'My quiz' }

      ;(repo as unknown as { create: jest.Mock }).create.mockResolvedValue(
        created,
      )

      await expect(repo.createQuiz(input as never)).resolves.toBe(
        created as never,
      )

      expect(
        (repo as unknown as { create: jest.Mock }).create,
      ).toHaveBeenCalledTimes(1)
      expect(
        (repo as unknown as { create: jest.Mock }).create,
      ).toHaveBeenCalledWith(input)
    })
  })

  describe('updateQuiz', () => {
    beforeEach(() => {
      jest.useFakeTimers()
      jest.setSystemTime(new Date('2026-01-10T10:11:12.000Z'))
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it('updates quiz and injects updated timestamp', async () => {
      const quizId = 'quiz-1'
      const patch: Partial<Quiz> = { title: 'Updated title' }
      const updatedDocument = { id: quizId, title: 'Updated title' }

      ;(repo as unknown as { update: jest.Mock }).update.mockResolvedValue(
        updatedDocument,
      )

      await expect(repo.updateQuiz(quizId, patch as never)).resolves.toBe(
        updatedDocument as never,
      )

      expect(
        (repo as unknown as { update: jest.Mock }).update,
      ).toHaveBeenCalledTimes(1)
      expect(
        (repo as unknown as { update: jest.Mock }).update,
      ).toHaveBeenCalledWith(
        quizId,
        {
          ...patch,
          updated: new Date('2026-01-10T10:11:12.000Z'),
        },
        { populate: { path: 'owner' } },
      )
    })

    it('throws QuizNotFoundException when BaseRepository.update returns null', async () => {
      const quizId = 'missing'
      const patch: Partial<Quiz> = { title: 'Does not matter' }

      ;(repo as unknown as { update: jest.Mock }).update.mockResolvedValue(null)

      await expect(
        repo.updateQuiz(quizId, patch as never),
      ).rejects.toBeInstanceOf(QuizNotFoundException)

      expect(
        (repo as unknown as { update: jest.Mock }).update,
      ).toHaveBeenCalledWith(
        quizId,
        {
          ...patch,
          updated: new Date('2026-01-10T10:11:12.000Z'),
        },
        { populate: { path: 'owner' } },
      )
    })
  })

  describe('deleteQuiz', () => {
    it('deletes quiz when BaseRepository.delete returns true', async () => {
      const quizId = 'quiz-1'
      ;(repo as unknown as { delete: jest.Mock }).delete.mockResolvedValue(true)

      await expect(repo.deleteQuiz(quizId)).resolves.toBeUndefined()

      expect(
        (repo as unknown as { delete: jest.Mock }).delete,
      ).toHaveBeenCalledTimes(1)
      expect(
        (repo as unknown as { delete: jest.Mock }).delete,
      ).toHaveBeenCalledWith(quizId)
    })

    it('throws QuizNotFoundException when BaseRepository.delete returns false', async () => {
      const quizId = 'missing'
      ;(repo as unknown as { delete: jest.Mock }).delete.mockResolvedValue(
        false,
      )

      await expect(repo.deleteQuiz(quizId)).rejects.toBeInstanceOf(
        QuizNotFoundException,
      )

      expect(
        (repo as unknown as { delete: jest.Mock }).delete,
      ).toHaveBeenCalledWith(quizId)
    })
  })

  describe('findEligiblePublicQuizzes', () => {
    let findMock: jest.Mock
    let sortMock: jest.Mock
    let skipMock: jest.Mock
    let limitMock: jest.Mock
    let execMock: jest.Mock

    beforeEach(() => {
      execMock = jest.fn().mockResolvedValue([])
      limitMock = jest.fn().mockReturnValue({ exec: execMock })
      skipMock = jest.fn().mockReturnValue({ limit: limitMock })
      sortMock = jest.fn().mockReturnValue({ skip: skipMock })
      findMock = jest.fn().mockReturnValue({ sort: sortMock })
      ;(repo as unknown as { quizModel: { find: jest.Mock } }).quizModel = {
        find: findMock,
      } as never
    })

    it('forwards offset and limit correctly to the query chain', async () => {
      await repo.findEligiblePublicQuizzes(100, 500)

      expect(findMock).toHaveBeenCalledTimes(1)
      expect(findMock).toHaveBeenCalledWith({
        visibility: QuizVisibility.Public,
        owner: { $exists: true, $ne: null },
        'questions.9': { $exists: true },
      })
      expect(skipMock).toHaveBeenCalledWith(100)
      expect(limitMock).toHaveBeenCalledWith(500)
      expect(execMock).toHaveBeenCalledTimes(1)
    })

    it('returns the documents from the query', async () => {
      const docs = [{ _id: 'q1' }, { _id: 'q2' }]
      execMock.mockResolvedValueOnce(docs)

      const result = await repo.findEligiblePublicQuizzes(0, 10)
      expect(result).toEqual(docs)
    })
  })

  describe('replaceQuiz', () => {
    it('returns the replaced document when replace succeeds', async () => {
      const quizId = 'quiz-1'
      const patch: Partial<Quiz> = { title: 'Replaced title' }
      const replaced = { id: quizId, title: 'Replaced title' }

      ;(repo as unknown as { replace: jest.Mock }).replace = jest
        .fn()
        .mockResolvedValue(replaced)

      await expect(repo.replaceQuiz(quizId, patch as never)).resolves.toBe(
        replaced as never,
      )

      expect(
        (repo as unknown as { replace: jest.Mock }).replace,
      ).toHaveBeenCalledTimes(1)
      expect(
        (repo as unknown as { replace: jest.Mock }).replace,
      ).toHaveBeenCalledWith(quizId, patch, { populate: { path: 'owner' } })
    })

    it('throws QuizNotFoundException when replace returns null', async () => {
      const quizId = 'missing'
      const patch: Partial<Quiz> = { title: 'Does not matter' }

      ;(repo as unknown as { replace: jest.Mock }).replace = jest
        .fn()
        .mockResolvedValue(null)

      await expect(
        repo.replaceQuiz(quizId, patch as never),
      ).rejects.toBeInstanceOf(QuizNotFoundException)

      expect(
        (repo as unknown as { replace: jest.Mock }).replace,
      ).toHaveBeenCalledWith(quizId, patch, { populate: { path: 'owner' } })
    })
  })

  describe('findManyByIds', () => {
    let findMock: jest.Mock
    let populateMock: jest.Mock
    let execMock: jest.Mock

    beforeEach(() => {
      execMock = jest.fn().mockResolvedValue([])
      populateMock = jest.fn().mockReturnValue({ exec: execMock })
      findMock = jest.fn().mockReturnValue({ populate: populateMock })
      ;(repo as unknown as { quizModel: { find: jest.Mock } }).quizModel = {
        find: findMock,
      } as never
    })

    it('calls find with $in filter and populates owner', async () => {
      const ids = ['q1', 'q2', 'q3']

      await repo.findManyByIds(ids)

      expect(findMock).toHaveBeenCalledTimes(1)
      expect(findMock).toHaveBeenCalledWith({ _id: { $in: ids } })
      expect(populateMock).toHaveBeenCalledWith('owner')
      expect(execMock).toHaveBeenCalledTimes(1)
    })

    it('returns the documents from the query', async () => {
      const docs = [{ _id: 'q1' }, { _id: 'q2' }]
      execMock.mockResolvedValueOnce(docs)

      const result = await repo.findManyByIds(['q1', 'q2'])
      expect(result).toEqual(docs)
    })
  })
})
