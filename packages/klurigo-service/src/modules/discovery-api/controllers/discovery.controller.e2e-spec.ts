import { DiscoverySectionKey } from '@klurigo/common'
import { INestApplication } from '@nestjs/common'
import { getModelToken } from '@nestjs/mongoose'
import supertest from 'supertest'

import {
  BASE_OFFSET_DATE,
  createMockClassicQuiz,
  createMockUniqueId,
} from '../../../../test-utils/data'
import {
  cleanupTestApp,
  createDefaultUserAndAuthenticate,
  createTestApp,
} from '../../../../test-utils/utils'
import { Quiz, QuizModel } from '../../quiz-core/repositories/models/schemas'
import { DiscoverySnapshotRepository } from '../repositories'

describe('DiscoveryController (e2e)', () => {
  let app: INestApplication
  let quizModel: QuizModel
  let discoverySnapshotRepository: DiscoverySnapshotRepository

  beforeEach(async () => {
    app = await createTestApp()
    quizModel = app.get<QuizModel>(getModelToken(Quiz.name))
    discoverySnapshotRepository = app.get(DiscoverySnapshotRepository)
  })

  afterEach(async () => {
    await cleanupTestApp(app)
  })

  describe('/api/discover (GET)', () => {
    it('returns 401 when no auth token is provided', async () => {
      return supertest(app.getHttpServer())
        .get('/api/discover')
        .expect(401)
        .expect((res) => {
          expect(res.body).toEqual({
            message: 'Missing Authorization header',
            status: 401,
            timestamp: expect.anything(),
          })
        })
    })

    it('returns 200 with empty sections and null generatedAt when no snapshot exists', async () => {
      const { accessToken } = await createDefaultUserAndAuthenticate(app)
      return supertest(app.getHttpServer())
        .get('/api/discover')
        .set({ Authorization: `Bearer ${accessToken}` })
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual({ sections: [], generatedAt: null })
        })
    })

    it('returns 200 with hydrated quiz cards when a snapshot with entries exists', async () => {
      const { accessToken, user } = await createDefaultUserAndAuthenticate(app)
      const quiz = await quizModel.create(
        createMockClassicQuiz({ owner: user }),
      )

      await discoverySnapshotRepository.upsertLatest({
        generatedAt: new Date('2025-01-01T00:00:00.000Z'),
        sections: [
          {
            key: DiscoverySectionKey.TOP_RATED,
            entries: [{ quizId: quiz._id, score: 80 }],
          },
        ],
      })

      return supertest(app.getHttpServer())
        .get('/api/discover')
        .set({ Authorization: `Bearer ${accessToken}` })
        .expect(200)
        .expect((res) => {
          expect(res.body.generatedAt).toBe('2025-01-01T00:00:00.000Z')
          expect(res.body.sections).toHaveLength(1)
          expect(res.body.sections[0]).toHaveProperty(
            'key',
            DiscoverySectionKey.TOP_RATED,
          )
          expect(res.body.sections[0].quizzes).toHaveLength(1)
          expect(res.body.sections[0].quizzes[0]).toHaveProperty('id', quiz._id)
          expect(res.body.sections[0].quizzes[0]).toHaveProperty(
            'title',
            quiz.title,
          )
        })
    })

    it('returns sections in the fixed DISCOVERY_SECTION_ORDER regardless of snapshot order', async () => {
      const { accessToken, user } = await createDefaultUserAndAuthenticate(app)
      const quizA = await quizModel.create(
        createMockClassicQuiz({ owner: user, _id: createMockUniqueId(101) }),
      )
      const quizB = await quizModel.create(
        createMockClassicQuiz({ owner: user, _id: createMockUniqueId(102) }),
      )
      const quizC = await quizModel.create(
        createMockClassicQuiz({ owner: user, _id: createMockUniqueId(103) }),
      )

      await discoverySnapshotRepository.upsertLatest({
        generatedAt: BASE_OFFSET_DATE,
        sections: [
          {
            key: DiscoverySectionKey.MOST_PLAYED,
            entries: [{ quizId: quizC._id, score: 50 }],
          },
          {
            key: DiscoverySectionKey.TRENDING,
            entries: [{ quizId: quizB._id, score: 70 }],
          },
          {
            key: DiscoverySectionKey.TOP_RATED,
            entries: [{ quizId: quizA._id, score: 90 }],
          },
        ],
      })

      return supertest(app.getHttpServer())
        .get('/api/discover')
        .set({ Authorization: `Bearer ${accessToken}` })
        .expect(200)
        .expect((res) => {
          expect(res.body.sections).toHaveLength(3)
          expect(res.body.sections[0].key).toBe(DiscoverySectionKey.TRENDING)
          expect(res.body.sections[1].key).toBe(DiscoverySectionKey.TOP_RATED)
          expect(res.body.sections[2].key).toBe(DiscoverySectionKey.MOST_PLAYED)
        })
    })

    it('skips sections with zero entries', async () => {
      const { accessToken, user } = await createDefaultUserAndAuthenticate(app)
      const quiz = await quizModel.create(
        createMockClassicQuiz({ owner: user }),
      )

      await discoverySnapshotRepository.upsertLatest({
        generatedAt: BASE_OFFSET_DATE,
        sections: [
          {
            key: DiscoverySectionKey.TOP_RATED,
            entries: [{ quizId: quiz._id, score: 90 }],
          },
          {
            key: DiscoverySectionKey.TRENDING,
            entries: [],
          },
        ],
      })

      return supertest(app.getHttpServer())
        .get('/api/discover')
        .set({ Authorization: `Bearer ${accessToken}` })
        .expect(200)
        .expect((res) => {
          expect(res.body.sections).toHaveLength(1)
          expect(res.body.sections[0].key).toBe(DiscoverySectionKey.TOP_RATED)
        })
    })

    it('returns at most DISCOVERY_RAIL_PREVIEW_SIZE (10) quiz cards per section', async () => {
      const { accessToken, user } = await createDefaultUserAndAuthenticate(app)
      const quizzes = await Promise.all(
        Array.from({ length: 15 }, (_, index) =>
          quizModel.create(
            createMockClassicQuiz({
              owner: user,
              _id: createMockUniqueId(110 + index),
            }),
          ),
        ),
      )

      await discoverySnapshotRepository.upsertLatest({
        generatedAt: BASE_OFFSET_DATE,
        sections: [
          {
            key: DiscoverySectionKey.TOP_RATED,
            entries: quizzes.map((q, i) => ({ quizId: q._id, score: 100 - i })),
          },
        ],
      })

      return supertest(app.getHttpServer())
        .get('/api/discover')
        .set({ Authorization: `Bearer ${accessToken}` })
        .expect(200)
        .expect((res) => {
          expect(res.body.sections[0].quizzes).toHaveLength(10)
        })
    })

    it('returns quiz cards with the correct shape', async () => {
      const { accessToken, user } = await createDefaultUserAndAuthenticate(app)
      const quiz = await quizModel.create(
        createMockClassicQuiz({ owner: user }),
      )

      await discoverySnapshotRepository.upsertLatest({
        generatedAt: BASE_OFFSET_DATE,
        sections: [
          {
            key: DiscoverySectionKey.TOP_RATED,
            entries: [{ quizId: quiz._id, score: 90 }],
          },
        ],
      })

      return supertest(app.getHttpServer())
        .get('/api/discover')
        .set({ Authorization: `Bearer ${accessToken}` })
        .expect(200)
        .expect((res) => {
          const card = res.body.sections[0].quizzes[0]
          expect(card).toHaveProperty('id', quiz._id)
          expect(card).toHaveProperty('title', quiz.title)
          expect(card).toHaveProperty('description', quiz.description)
          expect(card).toHaveProperty('imageCoverURL', quiz.imageCoverURL)
          expect(card).toHaveProperty('category', quiz.category)
          expect(card).toHaveProperty('languageCode', quiz.languageCode)
          expect(card).toHaveProperty('mode', quiz.mode)
          expect(card).toHaveProperty(
            'numberOfQuestions',
            quiz.questions.length,
          )
          expect(card).toHaveProperty('author')
          expect(card.author).toHaveProperty('id', user._id)
          expect(card.author).toHaveProperty('name', user.defaultNickname)
          expect(card).toHaveProperty('gameplaySummary')
          expect(card.gameplaySummary).toHaveProperty('count', 0)
          expect(card.gameplaySummary).toHaveProperty('totalPlayerCount', 0)
          expect(card).toHaveProperty('ratingSummary')
          expect(card.ratingSummary).toHaveProperty('stars', 0)
          expect(card.ratingSummary).toHaveProperty('comments', 0)
          expect(card).toHaveProperty('created')
        })
    })

    it('silently skips quiz cards whose quiz document no longer exists', async () => {
      const { accessToken, user } = await createDefaultUserAndAuthenticate(app)
      const existingQuiz = await quizModel.create(
        createMockClassicQuiz({ owner: user }),
      )
      const missingQuizId = createMockUniqueId(120)

      await discoverySnapshotRepository.upsertLatest({
        generatedAt: BASE_OFFSET_DATE,
        sections: [
          {
            key: DiscoverySectionKey.TOP_RATED,
            entries: [
              { quizId: missingQuizId, score: 100 },
              { quizId: existingQuiz._id, score: 90 },
            ],
          },
        ],
      })

      return supertest(app.getHttpServer())
        .get('/api/discover')
        .set({ Authorization: `Bearer ${accessToken}` })
        .expect(200)
        .expect((res) => {
          expect(res.body.sections[0].quizzes).toHaveLength(1)
          expect(res.body.sections[0].quizzes[0]).toHaveProperty(
            'id',
            existingQuiz._id,
          )
        })
    })
  })

  describe('/api/discover/section/:key (GET)', () => {
    it('returns 401 when no auth token is provided', async () => {
      return supertest(app.getHttpServer())
        .get('/api/discover/section/TOP_RATED')
        .expect(401)
        .expect((res) => {
          expect(res.body).toEqual({
            message: 'Missing Authorization header',
            status: 401,
            timestamp: expect.anything(),
          })
        })
    })

    it('returns 200 with empty results when no snapshot exists', async () => {
      const { accessToken } = await createDefaultUserAndAuthenticate(app)
      return supertest(app.getHttpServer())
        .get('/api/discover/section/TOP_RATED?limit=10&offset=20')
        .set({ Authorization: `Bearer ${accessToken}` })
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual({
            key: DiscoverySectionKey.TOP_RATED,
            results: [],
            snapshotTotal: 0,
            limit: 10,
            offset: 20,
          })
        })
    })

    it('returns empty results for a section key not present in the snapshot', async () => {
      const { accessToken, user } = await createDefaultUserAndAuthenticate(app)
      const quiz = await quizModel.create(
        createMockClassicQuiz({ owner: user }),
      )

      await discoverySnapshotRepository.upsertLatest({
        generatedAt: BASE_OFFSET_DATE,
        sections: [
          {
            key: DiscoverySectionKey.TOP_RATED,
            entries: [{ quizId: quiz._id, score: 90 }],
          },
        ],
      })

      return supertest(app.getHttpServer())
        .get('/api/discover/section/TRENDING')
        .set({ Authorization: `Bearer ${accessToken}` })
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual({
            key: DiscoverySectionKey.TRENDING,
            results: [],
            snapshotTotal: 0,
            limit: 20,
            offset: 0,
          })
        })
    })

    it('applies default limit of 20 and offset of 0 when no query params are provided', async () => {
      const { accessToken, user } = await createDefaultUserAndAuthenticate(app)
      const quiz = await quizModel.create(
        createMockClassicQuiz({ owner: user }),
      )

      await discoverySnapshotRepository.upsertLatest({
        generatedAt: BASE_OFFSET_DATE,
        sections: [
          {
            key: DiscoverySectionKey.TOP_RATED,
            entries: [{ quizId: quiz._id, score: 90 }],
          },
        ],
      })

      return supertest(app.getHttpServer())
        .get('/api/discover/section/TOP_RATED')
        .set({ Authorization: `Bearer ${accessToken}` })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('limit', 20)
          expect(res.body).toHaveProperty('offset', 0)
        })
    })

    it('returns paginated results respecting custom limit and offset', async () => {
      const { accessToken, user } = await createDefaultUserAndAuthenticate(app)
      const quizzes = await Promise.all(
        Array.from({ length: 30 }, (_, index) =>
          quizModel.create(
            createMockClassicQuiz({
              owner: user,
              _id: createMockUniqueId(130 + index),
            }),
          ),
        ),
      )
      const orderedIds = quizzes.map((q) => q._id)

      await discoverySnapshotRepository.upsertLatest({
        generatedAt: BASE_OFFSET_DATE,
        sections: [
          {
            key: DiscoverySectionKey.TOP_RATED,
            entries: orderedIds.map((id, i) => ({
              quizId: id,
              score: 100 - i,
            })),
          },
        ],
      })

      return supertest(app.getHttpServer())
        .get('/api/discover/section/TOP_RATED?limit=5&offset=10')
        .set({ Authorization: `Bearer ${accessToken}` })
        .expect(200)
        .expect((res) => {
          expect(res.body.limit).toBe(5)
          expect(res.body.offset).toBe(10)
          expect(res.body.results).toHaveLength(5)
          expect(res.body.results.map((r) => r.id)).toEqual(
            orderedIds.slice(10, 15),
          )
        })
    })

    it('clamps limit to a maximum of 50', async () => {
      const { accessToken, user } = await createDefaultUserAndAuthenticate(app)
      const quizzes = await Promise.all(
        Array.from({ length: 60 }, (_, index) =>
          quizModel.create(
            createMockClassicQuiz({
              owner: user,
              _id: createMockUniqueId(170 + index),
            }),
          ),
        ),
      )

      await discoverySnapshotRepository.upsertLatest({
        generatedAt: BASE_OFFSET_DATE,
        sections: [
          {
            key: DiscoverySectionKey.TOP_RATED,
            entries: quizzes.map((q, i) => ({ quizId: q._id, score: 100 - i })),
          },
        ],
      })

      return supertest(app.getHttpServer())
        .get('/api/discover/section/TOP_RATED?limit=100')
        .set({ Authorization: `Bearer ${accessToken}` })
        .expect(200)
        .expect((res) => {
          expect(res.body.limit).toBe(50)
          expect(res.body.results).toHaveLength(50)
        })
    })

    it('clamps limit to a minimum of 1', async () => {
      const { accessToken, user } = await createDefaultUserAndAuthenticate(app)
      const quiz = await quizModel.create(
        createMockClassicQuiz({ owner: user }),
      )

      await discoverySnapshotRepository.upsertLatest({
        generatedAt: BASE_OFFSET_DATE,
        sections: [
          {
            key: DiscoverySectionKey.TOP_RATED,
            entries: [{ quizId: quiz._id, score: 90 }],
          },
        ],
      })

      return supertest(app.getHttpServer())
        .get('/api/discover/section/TOP_RATED?limit=0')
        .set({ Authorization: `Bearer ${accessToken}` })
        .expect(200)
        .expect((res) => {
          expect(res.body.limit).toBe(1)
        })
    })

    it('clamps negative offset to 0', async () => {
      const { accessToken, user } = await createDefaultUserAndAuthenticate(app)
      const quiz = await quizModel.create(
        createMockClassicQuiz({ owner: user }),
      )

      await discoverySnapshotRepository.upsertLatest({
        generatedAt: BASE_OFFSET_DATE,
        sections: [
          {
            key: DiscoverySectionKey.TOP_RATED,
            entries: [{ quizId: quiz._id, score: 90 }],
          },
        ],
      })

      return supertest(app.getHttpServer())
        .get('/api/discover/section/TOP_RATED?offset=-5')
        .set({ Authorization: `Bearer ${accessToken}` })
        .expect(200)
        .expect((res) => {
          expect(res.body.offset).toBe(0)
          expect(res.body.results).toHaveLength(1)
        })
    })

    it('returns the correct snapshotTotal matching the number of entries in the snapshot', async () => {
      const { accessToken, user } = await createDefaultUserAndAuthenticate(app)
      const quizzes = await Promise.all(
        Array.from({ length: 25 }, (_, index) =>
          quizModel.create(
            createMockClassicQuiz({
              owner: user,
              _id: createMockUniqueId(230 + index),
            }),
          ),
        ),
      )

      await discoverySnapshotRepository.upsertLatest({
        generatedAt: BASE_OFFSET_DATE,
        sections: [
          {
            key: DiscoverySectionKey.TOP_RATED,
            entries: quizzes.map((q, i) => ({ quizId: q._id, score: 100 - i })),
          },
        ],
      })

      return supertest(app.getHttpServer())
        .get('/api/discover/section/TOP_RATED?limit=5')
        .set({ Authorization: `Bearer ${accessToken}` })
        .expect(200)
        .expect((res) => {
          expect(res.body.snapshotTotal).toBe(25)
          expect(res.body.results).toHaveLength(5)
        })
    })

    it('returns quiz cards with the correct shape', async () => {
      const { accessToken, user } = await createDefaultUserAndAuthenticate(app)
      const quiz = await quizModel.create(
        createMockClassicQuiz({ owner: user }),
      )

      await discoverySnapshotRepository.upsertLatest({
        generatedAt: BASE_OFFSET_DATE,
        sections: [
          {
            key: DiscoverySectionKey.TOP_RATED,
            entries: [{ quizId: quiz._id, score: 90 }],
          },
        ],
      })

      return supertest(app.getHttpServer())
        .get('/api/discover/section/TOP_RATED')
        .set({ Authorization: `Bearer ${accessToken}` })
        .expect(200)
        .expect((res) => {
          const card = res.body.results[0]
          expect(card).toHaveProperty('id', quiz._id)
          expect(card).toHaveProperty('title', quiz.title)
          expect(card).toHaveProperty('description', quiz.description)
          expect(card).toHaveProperty('imageCoverURL', quiz.imageCoverURL)
          expect(card).toHaveProperty('category', quiz.category)
          expect(card).toHaveProperty('languageCode', quiz.languageCode)
          expect(card).toHaveProperty('mode', quiz.mode)
          expect(card).toHaveProperty(
            'numberOfQuestions',
            quiz.questions.length,
          )
          expect(card).toHaveProperty('author')
          expect(card.author).toHaveProperty('id', user._id)
          expect(card.author).toHaveProperty('name', user.defaultNickname)
          expect(card).toHaveProperty('gameplaySummary')
          expect(card.gameplaySummary).toHaveProperty('count', 0)
          expect(card.gameplaySummary).toHaveProperty('totalPlayerCount', 0)
          expect(card).toHaveProperty('ratingSummary')
          expect(card.ratingSummary).toHaveProperty('stars', 0)
          expect(card.ratingSummary).toHaveProperty('comments', 0)
          expect(card).toHaveProperty('created')
        })
    })
  })
})
