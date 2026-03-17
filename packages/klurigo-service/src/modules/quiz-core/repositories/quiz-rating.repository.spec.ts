import { QuizRatingAuthorType } from '@klurigo/common'
import { getModelToken } from '@nestjs/mongoose'
import { Test } from '@nestjs/testing'
import type { Model } from 'mongoose'
import { v4 as uuidv4 } from 'uuid'

import { buildMockPrimaryUser } from '../../../../test-utils/data'
import { buildSortObject } from '../../../app/shared/repository'

import { QuizRating } from './models/schemas'
import { QuizRatingRepository } from './quiz-rating.repository'

jest.mock('uuid', () => ({
  v4: jest.fn(),
}))

jest.mock('../../../app/shared/repository', () => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  class BaseRepository<T> {
    protected readonly model: unknown
    protected readonly entityName: string

    // BaseRepository methods used by QuizRatingRepository
    public findOne: jest.Mock
    public findWithPagination: jest.Mock
    public create: jest.Mock
    public update: jest.Mock

    constructor(model: unknown, entityName: string) {
      this.model = model
      this.entityName = entityName
      this.findOne = jest.fn()
      this.findWithPagination = jest.fn()
      this.create = jest.fn()
      this.update = jest.fn()
    }
  }

  return {
    BaseRepository,
    buildSortObject: jest.fn(),
  }
})

describe(QuizRatingRepository.name, () => {
  let repository: QuizRatingRepository
  let quizRatingModel: Partial<Model<QuizRating>> & {
    findOne: jest.Mock
    find: jest.Mock
    countDocuments: jest.Mock
    findById: jest.Mock
    db: { model: jest.Mock }
  }

  const fixedNow = new Date('2026-01-10T12:00:00.000Z')

  beforeEach(async () => {
    jest.useFakeTimers()
    jest.setSystemTime(fixedNow)

    quizRatingModel = {
      findOne: jest.fn(),
      find: jest.fn(),
      countDocuments: jest.fn(),
      findById: jest.fn(),
      db: { model: jest.fn() },
    } as Partial<Model<QuizRating>> & {
      findOne: jest.Mock
      find: jest.Mock
      countDocuments: jest.Mock
      findById: jest.Mock
      db: { model: jest.Mock }
    }

    const moduleRef = await Test.createTestingModule({
      providers: [
        QuizRatingRepository,
        {
          provide: getModelToken(QuizRating.name),
          useValue: quizRatingModel,
        },
      ],
    }).compile()

    repository = moduleRef.get(QuizRatingRepository)

    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('findQuizRatingByUserAuthor', () => {
    /**
     * Helper that mocks the `findOne().lean().exec()` chain used by
     * `findQuizRatingByUserAuthor`.
     */
    function setupFindOneChain(doc: QuizRating | null): void {
      const execMock = jest.fn().mockResolvedValue(doc)
      const leanMock = jest.fn().mockReturnValue({ exec: execMock })
      quizRatingModel.findOne.mockReturnValue({ lean: leanMock })
    }

    /**
     * Helper that mocks the `db.model('User')` chain used by
     * `resolveUserAuthors` for looking up User documents.
     */
    function setupUserModelMock(users: Array<{ _id: string }>): void {
      const execMock = jest.fn().mockResolvedValue(users)
      const leanMock = jest.fn().mockReturnValue({ exec: execMock })
      const findMock = jest.fn().mockReturnValue({ lean: leanMock })
      quizRatingModel.db.model.mockReturnValue({ find: findMock })
    }

    it('queries by quizId and userId, resolves the User ref, and returns the document', async () => {
      const quizId = 'quiz-1'
      const author = buildMockPrimaryUser()
      const userId = author._id

      // findOne returns a lean doc with an unresolved string user ref
      const leanDoc = {
        _id: 'rating-1',
        quizId,
        author: {
          type: QuizRatingAuthorType.User,
          user: userId,
        },
        stars: 5,
        created: fixedNow,
        updated: fixedNow,
      } as unknown as QuizRating

      setupFindOneChain(leanDoc)
      setupUserModelMock([author as unknown as { _id: string }])

      const result = await repository.findQuizRatingByUserAuthor(quizId, userId)

      expect(quizRatingModel.findOne).toHaveBeenCalledTimes(1)
      expect(quizRatingModel.findOne).toHaveBeenCalledWith({
        quizId,
        'author.type': QuizRatingAuthorType.User,
        'author.user': userId,
      })
      expect(result).not.toBeNull()
      expect(result!._id).toBe('rating-1')
    })

    it('returns null when no rating matches', async () => {
      const quizId = 'quiz-1'
      const userId = 'user-123'

      setupFindOneChain(null)

      const result = await repository.findQuizRatingByUserAuthor(quizId, userId)

      expect(quizRatingModel.findOne).toHaveBeenCalledTimes(1)
      expect(quizRatingModel.findOne).toHaveBeenCalledWith({
        quizId,
        'author.type': QuizRatingAuthorType.User,
        'author.user': userId,
      })
      expect(result).toBeNull()
    })
  })

  describe('findQuizRatingByAnonymousAuthor', () => {
    /**
     * Helper that mocks the `findOne().lean().exec()` chain used by
     * `findQuizRatingByAnonymousAuthor`.
     */
    function setupFindOneChain(doc: QuizRating | null): void {
      const execMock = jest.fn().mockResolvedValue(doc)
      const leanMock = jest.fn().mockReturnValue({ exec: execMock })
      quizRatingModel.findOne.mockReturnValue({ lean: leanMock })
    }

    it('queries by quizId and participantId and returns the document', async () => {
      const quizId = 'quiz-1'
      const participantId = 'participant-abc'

      const leanDoc = {
        _id: 'rating-2',
        quizId,
        author: {
          type: QuizRatingAuthorType.Anonymous,
          participantId,
          nickname: 'AnonPlayer',
        },
        stars: 3,
        created: fixedNow,
        updated: fixedNow,
      } as unknown as QuizRating

      setupFindOneChain(leanDoc)

      const result = await repository.findQuizRatingByAnonymousAuthor(
        quizId,
        participantId,
      )

      expect(quizRatingModel.findOne).toHaveBeenCalledTimes(1)
      expect(quizRatingModel.findOne).toHaveBeenCalledWith({
        quizId,
        'author.type': QuizRatingAuthorType.Anonymous,
        'author.participantId': participantId,
      })
      expect(result).not.toBeNull()
      expect(result!._id).toBe('rating-2')
    })

    it('returns null when no anonymous rating matches', async () => {
      const quizId = 'quiz-1'
      const participantId = 'participant-missing'

      setupFindOneChain(null)

      const result = await repository.findQuizRatingByAnonymousAuthor(
        quizId,
        participantId,
      )

      expect(quizRatingModel.findOne).toHaveBeenCalledTimes(1)
      expect(quizRatingModel.findOne).toHaveBeenCalledWith({
        quizId,
        'author.type': QuizRatingAuthorType.Anonymous,
        'author.participantId': participantId,
      })
      expect(result).toBeNull()
    })
  })

  describe('findQuizRatingsWithPagination', () => {
    /**
     * Sets up the model mocks for a `find().skip().limit().sort().lean().exec()`
     * query chain and `countDocuments()` used by `findQuizRatingsWithPagination`.
     */
    function setupFindChain(documents: QuizRating[], total: number): void {
      const execMock = jest.fn().mockResolvedValue(documents)
      const leanMock = jest.fn().mockReturnValue({ exec: execMock })
      const sortMock = jest.fn().mockReturnValue({ lean: leanMock })
      const limitMock = jest.fn().mockReturnValue({ sort: sortMock })
      const skipMock = jest.fn().mockReturnValue({ limit: limitMock })
      quizRatingModel.find.mockReturnValue({ skip: skipMock })
      quizRatingModel.countDocuments.mockResolvedValue(total)

      // resolveUserAuthors uses db.model('User') — provide a no-op mock
      // that returns no users (test documents already have resolved authors).
      const userExecMock = jest.fn().mockResolvedValue([])
      const userLeanMock = jest.fn().mockReturnValue({ exec: userExecMock })
      const userFindMock = jest.fn().mockReturnValue({ lean: userLeanMock })
      quizRatingModel.db.model.mockReturnValue({ find: userFindMock })
    }

    it('builds filter without comment constraint when commentsOnly is false/undefined', async () => {
      const quizId = 'quiz-1'

      ;(buildSortObject as jest.Mock).mockReturnValue({ updated: -1 })

      const documents = [
        { _id: 'r1' },
        { _id: 'r2' },
      ] as unknown as QuizRating[]

      setupFindChain(documents, 2)

      const result = await repository.findQuizRatingsWithPagination(quizId, {})

      expect(buildSortObject).toHaveBeenCalledTimes(1)
      expect(buildSortObject).toHaveBeenCalledWith({
        field: 'updated',
        direction: 1,
      })

      expect(quizRatingModel.find).toHaveBeenCalledTimes(1)
      expect(quizRatingModel.find).toHaveBeenCalledWith({ quizId })

      expect(result).toEqual({
        results: documents,
        total: 2,
        limit: 5,
        offset: 0,
      })
    })

    it('adds non-empty comment filter when commentsOnly is true', async () => {
      const quizId = 'quiz-1'

      ;(buildSortObject as jest.Mock).mockReturnValue({ updated: -1 })

      setupFindChain([], 0)

      await repository.findQuizRatingsWithPagination(quizId, {
        commentsOnly: true,
      })

      expect(quizRatingModel.find).toHaveBeenCalledTimes(1)
      expect(quizRatingModel.find).toHaveBeenCalledWith({
        quizId,
        comment: { $exists: true, $ne: '' },
      })
    })

    it('respects offset and limit options', async () => {
      const quizId = 'quiz-1'

      ;(buildSortObject as jest.Mock).mockReturnValue({ created: 1 })

      setupFindChain([], 0)

      const result = await repository.findQuizRatingsWithPagination(quizId, {
        offset: 10,
        limit: 25,
        sort: { field: 'created', order: 'asc' },
      })

      expect(buildSortObject).toHaveBeenCalledTimes(1)
      expect(buildSortObject).toHaveBeenCalledWith({
        field: 'created',
        direction: 1,
      })

      expect(quizRatingModel.find).toHaveBeenCalledTimes(1)
      expect(quizRatingModel.find).toHaveBeenCalledWith({ quizId })

      expect(result).toEqual({
        results: [],
        total: 0,
        limit: 25,
        offset: 10,
      })
    })

    it('defaults sort.field to updated and order to desc when sort is partially provided', async () => {
      const quizId = 'quiz-1'

      ;(buildSortObject as jest.Mock).mockReturnValue({ updated: -1 })

      setupFindChain([], 0)

      await repository.findQuizRatingsWithPagination(quizId, {
        sort: {},
      })

      expect(buildSortObject).toHaveBeenCalledTimes(1)
      expect(buildSortObject).toHaveBeenCalledWith({
        field: 'updated',
        direction: 1,
      })
    })

    it('maps model query response to {results,total,limit,offset}', async () => {
      const quizId = 'quiz-1'

      ;(buildSortObject as jest.Mock).mockReturnValue({ updated: -1 })

      const documents = [{ _id: 'r1' }] as unknown as QuizRating[]

      setupFindChain(documents, 123)

      const result = await repository.findQuizRatingsWithPagination(quizId, {
        offset: 7,
        limit: 9,
      })

      expect(result).toEqual({
        results: documents,
        total: 123,
        limit: 9,
        offset: 7,
      })
    })
  })

  describe('createQuizRating', () => {
    it('creates a rating with generated id and created/updated timestamps set to now', async () => {
      const quizId = 'quiz-1'
      const stars = 4
      const comment = 'Nice quiz'

      ;(uuidv4 as unknown as jest.Mock)
        .mockReturnValueOnce('user-uuid-1') // buildMockPrimaryUser()
        .mockReturnValueOnce('rating-uuid-1') // createQuizRating()

      const author = buildMockPrimaryUser()

      const populatedDoc = {
        _id: 'rating-uuid-1',
        quizId,
        author,
        stars,
        comment,
        created: fixedNow,
        updated: fixedNow,
      }

      ;(repository.create as jest.Mock).mockResolvedValue(undefined)
      ;(quizRatingModel.findById as jest.Mock).mockReturnValue({
        populate: jest.fn().mockResolvedValue({ toObject: () => populatedDoc }),
      })

      const result = await repository.createQuizRating(
        quizId,
        author as unknown as any,
        fixedNow,
        stars,
        comment,
      )

      expect(uuidv4).toHaveBeenCalledTimes(2)
      expect(repository.create).toHaveBeenCalledWith({
        _id: 'rating-uuid-1',
        quizId,
        author,
        stars,
        comment,
        created: fixedNow,
        updated: fixedNow,
      })
      expect(quizRatingModel.findById).toHaveBeenCalledWith('rating-uuid-1')
      expect(result).toEqual(populatedDoc)
    })

    it('creates a rating without comment when comment is undefined', async () => {
      const quizId = 'quiz-1'
      const author = buildMockPrimaryUser()
      const stars = 3

      ;(uuidv4 as unknown as jest.Mock).mockReturnValue('uuid-2')

      const populatedDoc = {
        _id: 'uuid-2',
        quizId,
        author,
        stars,
        created: fixedNow,
        updated: fixedNow,
      }

      ;(repository.create as jest.Mock).mockResolvedValue(undefined)
      ;(quizRatingModel.findById as jest.Mock).mockReturnValue({
        populate: jest.fn().mockResolvedValue({ toObject: () => populatedDoc }),
      })

      await repository.createQuizRating(
        quizId,
        author as unknown as any,
        fixedNow,
        stars,
      )

      expect(repository.create).toHaveBeenCalledTimes(1)
      expect(repository.create).toHaveBeenCalledWith({
        _id: 'uuid-2',
        quizId,
        author,
        stars,
        comment: undefined,
        created: fixedNow,
        updated: fixedNow,
      })
      expect(quizRatingModel.findById).toHaveBeenCalledWith('uuid-2')
    })
  })

  describe('updateQuizRating', () => {
    it('updates rating by id and returns the updated document', async () => {
      const ratingId = 'rating-1'
      const stars = 2
      const comment = 'Not great'

      const updated = {
        _id: ratingId,
        stars,
        comment,
        updated: fixedNow,
      } as unknown as QuizRating

      ;(repository.update as jest.Mock).mockResolvedValue(updated)

      const result = await repository.updateQuizRating(
        ratingId,
        fixedNow,
        stars,
        comment,
      )

      expect(repository.update).toHaveBeenCalledTimes(1)
      expect(repository.update).toHaveBeenCalledWith(
        ratingId,
        { stars, comment, updated: fixedNow },
        { populate: { path: 'author.user', model: 'User' } },
      )
      expect(result).toBe(updated)
    })

    it('returns null when the rating does not exist', async () => {
      const ratingId = 'missing-rating'
      const stars = 5

      ;(repository.update as jest.Mock).mockResolvedValue(null)

      await expect(
        repository.updateQuizRating(ratingId, fixedNow, stars),
      ).resolves.toBeNull()

      expect(repository.update).toHaveBeenCalledTimes(1)
      expect(repository.update).toHaveBeenCalledWith(
        ratingId,
        { stars, comment: undefined, updated: fixedNow },
        { populate: { path: 'author.user', model: 'User' } },
      )
    })

    it('always sets updated timestamp to now', async () => {
      const ratingId = 'rating-1'
      const now2 = new Date('2026-01-10T12:30:00.000Z')
      jest.setSystemTime(now2)
      ;(repository.update as jest.Mock).mockResolvedValue({
        _id: ratingId,
      } as unknown as QuizRating)

      await repository.updateQuizRating(ratingId, now2, 1, 'x')

      expect(repository.update).toHaveBeenCalledTimes(1)
      expect(repository.update).toHaveBeenCalledWith(
        ratingId,
        { stars: 1, comment: 'x', updated: now2 },
        { populate: { path: 'author.user', model: 'User' } },
      )
    })
  })
})
