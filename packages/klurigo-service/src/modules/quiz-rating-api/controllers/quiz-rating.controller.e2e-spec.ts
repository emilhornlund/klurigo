import { QuizVisibility } from '@klurigo/common'
import { INestApplication } from '@nestjs/common'
import { getModelToken } from '@nestjs/mongoose'
import supertest from 'supertest'
import { v4 as uuidv4 } from 'uuid'

import {
  buildMockPrimaryUser,
  buildMockQuizRating,
  buildMockSecondaryUser,
  createMockClassicQuiz,
} from '../../../../test-utils/data'
import {
  closeTestApp,
  createDefaultUserAndAuthenticate,
  createTestApp,
} from '../../../../test-utils/utils'
import {
  Quiz,
  QuizModel,
  QuizRating,
  QuizRatingModel,
} from '../../quiz-core/repositories/models/schemas'
import { User, UserModel } from '../../user/repositories'

import { QuizRatingController } from './quiz-rating.controller'

type SeededRatingExpectation = {
  author: { id: string; nickname: string }
  stars: number
  comment?: string
  createdAt: string
  updatedAt: string
}

describe(`${QuizRatingController.name} (e2e)`, () => {
  let app: INestApplication
  let quizModel: QuizModel
  let quizRatingModel: QuizRatingModel
  let userModel: UserModel

  beforeEach(async () => {
    app = await createTestApp()
    quizModel = app.get<QuizModel>(getModelToken(Quiz.name))
    quizRatingModel = app.get<QuizRatingModel>(getModelToken(QuizRating.name))
    userModel = app.get<UserModel>(getModelToken(User.name))
  })

  afterEach(async () => {
    await closeTestApp(app)
  })

  describe('/api/quizzes/:quizId/ratings (GET)', () => {
    let primaryUserAccessToken: string
    let secondaryUserAccessToken: string

    let publicQuiz: Quiz
    let privateQuiz: Quiz
    let emptyQuiz: Quiz

    let expectedPublicRatings: SeededRatingExpectation[]
    let expectedPrivateRatings: SeededRatingExpectation[]

    beforeEach(async () => {
      const primaryAuthenticatedUser = await createDefaultUserAndAuthenticate(
        app,
        buildMockPrimaryUser(),
      )
      primaryUserAccessToken = primaryAuthenticatedUser.accessToken

      const secondaryAuthenticatedUser = await createDefaultUserAndAuthenticate(
        app,
        buildMockSecondaryUser(),
      )
      secondaryUserAccessToken = secondaryAuthenticatedUser.accessToken

      const user3 = await userModel.create(
        buildMockSecondaryUser({
          email: 'smartypants@example.com',
          defaultNickname: 'SmartyPants',
        }),
      )

      const user4 = await userModel.create(
        buildMockSecondaryUser({
          email: 'brainiac.bert@example.com',
          defaultNickname: 'BrainiacBert',
        }),
      )

      const user5 = await userModel.create(
        buildMockSecondaryUser({
          email: 'guess.machine@example.com',
          defaultNickname: 'GuessMachine',
        }),
      )

      const user6 = await userModel.create(
        buildMockSecondaryUser({
          email: 'quiz.whiz@example.com',
          defaultNickname: 'QuizWhiz',
        }),
      )

      const ratingAuthors = [
        primaryAuthenticatedUser.user,
        secondaryAuthenticatedUser.user,
        user3,
        user4,
        user5,
        user6,
      ]

      publicQuiz = await quizModel.create(
        createMockClassicQuiz({
          owner: primaryAuthenticatedUser.user,
          visibility: QuizVisibility.Public,
        }),
      )

      privateQuiz = await quizModel.create(
        createMockClassicQuiz({
          owner: primaryAuthenticatedUser.user,
          visibility: QuizVisibility.Private,
        }),
      )

      emptyQuiz = await quizModel.create(
        createMockClassicQuiz({
          owner: primaryAuthenticatedUser.user,
          visibility: QuizVisibility.Public,
        }),
      )

      expectedPublicRatings = await seedQuizRatings({
        quizId: publicQuiz._id,
        authors: ratingAuthors,
      })

      expectedPrivateRatings = await seedQuizRatings({
        quizId: privateQuiz._id,
        authors: ratingAuthors,
      })
    })

    it('returns ratings for public quiz when requester is owner', async () => {
      return supertest(app.getHttpServer())
        .get(`/api/quizzes/${publicQuiz._id}/ratings`)
        .set({ Authorization: `Bearer ${primaryUserAccessToken}` })
        .expect(200)
        .expect((res) => {
          expect(res.body).toMatchObject(
            buildExpectedPaginatedResponse(expectedPublicRatings),
          )
        })
    })

    it('returns ratings for public quiz when requester is not owner', async () => {
      return supertest(app.getHttpServer())
        .get(`/api/quizzes/${publicQuiz._id}/ratings`)
        .set({ Authorization: `Bearer ${secondaryUserAccessToken}` })
        .expect(200)
        .expect((res) => {
          expect(res.body).toMatchObject(
            buildExpectedPaginatedResponse(expectedPublicRatings),
          )
        })
    })

    it('returns ratings for private quiz when requester is owner', async () => {
      return supertest(app.getHttpServer())
        .get(`/api/quizzes/${privateQuiz._id}/ratings`)
        .set({ Authorization: `Bearer ${primaryUserAccessToken}` })
        .expect(200)
        .expect((res) => {
          expect(res.body).toMatchObject(
            buildExpectedPaginatedResponse(expectedPrivateRatings),
          )
        })
    })

    it('returns empty results when quiz has no ratings', async () => {
      return supertest(app.getHttpServer())
        .get(`/api/quizzes/${emptyQuiz._id}/ratings`)
        .set({ Authorization: `Bearer ${primaryUserAccessToken}` })
        .expect(200)
        .expect((res) => {
          expect(res.body).toMatchObject(buildExpectedPaginatedResponse([]))
        })
    })

    it('returns empty results when offset exceeds total but keeps total unchanged', async () => {
      return supertest(app.getHttpServer())
        .get(`/api/quizzes/${publicQuiz._id}/ratings?limit=5&offset=999`)
        .set({ Authorization: `Bearer ${primaryUserAccessToken}` })
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual({
            results: [],
            total: expectedPublicRatings.length,
            limit: 5,
            offset: 999,
          })
        })
    })

    it('filters ratings by commentsOnly=true', async () => {
      return supertest(app.getHttpServer())
        .get(`/api/quizzes/${publicQuiz._id}/ratings?commentsOnly=true`)
        .set({ Authorization: `Bearer ${primaryUserAccessToken}` })
        .expect(200)
        .expect((res) => {
          expect(res.body).toMatchObject(
            buildExpectedPaginatedResponse(
              expectedPublicRatings.filter((r) => r.comment),
            ),
          )
        })
    })

    it('forbids ratings for private quiz when requester is not owner', async () => {
      return supertest(app.getHttpServer())
        .get(`/api/quizzes/${privateQuiz._id}/ratings`)
        .set({ Authorization: `Bearer ${secondaryUserAccessToken}` })
        .expect(403)
        .expect((res) => {
          expect(res.body).toEqual({
            message: 'Forbidden',
            status: 403,
            timestamp: expect.any(String),
          })
        })
    })

    it('supports pagination and sorting: sort=created, order=desc, limit=10, offset=0', async () => {
      return supertest(app.getHttpServer())
        .get(
          `/api/quizzes/${publicQuiz._id}/ratings?limit=10&offset=0&sort=created&order=desc`,
        )
        .set({ Authorization: `Bearer ${primaryUserAccessToken}` })
        .expect(200)
        .expect((res) => {
          expect(res.body).toMatchObject(
            buildExpectedPaginatedResponse(
              expectedPublicRatings,
              10,
              0,
              'createdAt',
              'desc',
            ),
          )
        })
    })

    it('supports pagination and sorting: sort=updated, order=desc, limit=10, offset=0', async () => {
      return supertest(app.getHttpServer())
        .get(
          `/api/quizzes/${publicQuiz._id}/ratings?limit=10&offset=0&sort=updated&order=desc`,
        )
        .set({ Authorization: `Bearer ${primaryUserAccessToken}` })
        .expect(200)
        .expect((res) => {
          expect(res.body).toMatchObject(
            buildExpectedPaginatedResponse(
              expectedPublicRatings,
              10,
              0,
              'updatedAt',
              'desc',
            ),
          )
        })
    })

    it('supports pagination: limit=5, offset=5', async () => {
      return supertest(app.getHttpServer())
        .get(`/api/quizzes/${publicQuiz._id}/ratings?limit=5&offset=5`)
        .set({ Authorization: `Bearer ${primaryUserAccessToken}` })
        .expect(200)
        .expect((res) => {
          expect(res.body).toMatchObject(
            buildExpectedPaginatedResponse(expectedPublicRatings, 5, 5),
          )
        })
    })

    it('returns 400 when query params are invalid', async () => {
      return supertest(app.getHttpServer())
        .get(
          `/api/quizzes/${publicQuiz._id}/ratings?limit=XXX&offset=XXX&sort=XXX&order=XXX&commentsOnly=XXX`,
        )
        .set({ Authorization: `Bearer ${primaryUserAccessToken}` })
        .expect(400)
        .expect((res) => {
          expect(res.body).toEqual({
            message: 'Validation failed',
            status: 400,
            timestamp: expect.any(String),
            validationErrors: [
              {
                constraints: {
                  isIn: 'sort must be one of the following values: created, updated',
                },
                property: 'sort',
              },
              {
                constraints: {
                  isIn: 'order must be one of the following values: asc, desc',
                },
                property: 'order',
              },
              {
                constraints: {
                  isInt: 'limit must be an integer number',
                  max: 'limit must not be greater than 50',
                  min: 'limit must not be less than 5',
                },
                property: 'limit',
              },
              {
                constraints: {
                  isInt: 'offset must be an integer number',
                  min: 'offset must not be less than 0',
                },
                property: 'offset',
              },
              {
                constraints: {
                  isBoolean: 'commentsOnly must be a boolean value',
                },
                property: 'commentsOnly',
              },
            ],
          })
        })
    })

    it('returns 404 when quiz does not exist', async () => {
      const quizId = uuidv4()

      return supertest(app.getHttpServer())
        .get(`/api/quizzes/${quizId}/ratings`)
        .set({ Authorization: `Bearer ${primaryUserAccessToken}` })
        .expect(404)
        .expect((res) => {
          expect(res.body).toEqual({
            message: `Quiz was not found by id '${quizId}'`,
            status: 404,
            timestamp: expect.any(String),
          })
        })
    })

    it('returns 401 when Authorization header is missing', async () => {
      return supertest(app.getHttpServer())
        .get(`/api/quizzes/${publicQuiz._id}/ratings`)
        .expect(401)
        .expect((res) => {
          expect(res.body).toEqual({
            message: 'Missing Authorization header',
            status: 401,
            timestamp: expect.any(String),
          })
        })
    })

    it('returns 401 when bearer token is invalid', async () => {
      return supertest(app.getHttpServer())
        .get(`/api/quizzes/${publicQuiz._id}/ratings`)
        .set({ Authorization: 'Bearer XXX' })
        .expect(401)
        .expect((res) => {
          expect(res.body).toEqual({
            message: 'Invalid or expired token',
            status: 401,
            timestamp: expect.any(String),
          })
        })
    })

    it('reflects updated user nickname in rating responses', async () => {
      const newNickname = 'RenamedUser'

      // Update the first author's nickname after ratings have been seeded
      const authorId = expectedPublicRatings[0].author.id
      await userModel.findByIdAndUpdate(authorId, {
        defaultNickname: newNickname,
      })

      return supertest(app.getHttpServer())
        .get(
          `/api/quizzes/${publicQuiz._id}/ratings?limit=10&offset=0&sort=created&order=asc`,
        )
        .set({ Authorization: `Bearer ${primaryUserAccessToken}` })
        .expect(200)
        .expect((res) => {
          const rating = res.body.results.find(
            (r: { author: { id: string } }) => r.author.id === authorId,
          )
          expect(rating).toBeDefined()
          expect(rating.author.nickname).toBe(newNickname)
        })
    })

    it('returns fully populated author for every rating in paginated results', async () => {
      return supertest(app.getHttpServer())
        .get(
          `/api/quizzes/${publicQuiz._id}/ratings?limit=10&offset=0&sort=created&order=asc`,
        )
        .set({ Authorization: `Bearer ${primaryUserAccessToken}` })
        .expect(200)
        .expect((res) => {
          const results: Array<{
            author: { id: string; nickname: string }
          }> = res.body.results

          expect(results.length).toBe(expectedPublicRatings.length)

          for (const rating of results) {
            // author.id must be a non-empty string (resolved user _id)
            expect(typeof rating.author.id).toBe('string')
            expect(rating.author.id.length).toBeGreaterThan(0)

            // author.nickname must be a non-empty string (resolved defaultNickname)
            expect(typeof rating.author.nickname).toBe('string')
            expect(rating.author.nickname.length).toBeGreaterThan(0)
          }
        })
    })

    async function seedQuizRatings(params: {
      quizId: string
      authors: User[]
    }): Promise<SeededRatingExpectation[]> {
      const { quizId, authors } = params

      const base = new Date('2025-01-01T10:00:00.000Z')

      const rows = [
        {
          author: authors[0],
          stars: 5,
          comment: 'Great quiz—good pacing and fun questions.',
          createdAt: new Date(base.getTime() + 1_000),
          updatedAt: new Date(base.getTime() + 1_000),
        },
        {
          author: authors[1],
          stars: 4,
          comment: undefined,
          createdAt: new Date(base.getTime() + 2_000),
          updatedAt: new Date(base.getTime() + 2_000),
        },
        {
          author: authors[2],
          stars: 3,
          comment: 'Solid, but a couple of questions were tricky.',
          createdAt: new Date(base.getTime() + 3_000),
          updatedAt: new Date(base.getTime() + 3_000),
        },
        {
          author: authors[3],
          stars: 2,
          comment: undefined,
          createdAt: new Date(base.getTime() + 4_000),
          updatedAt: new Date(base.getTime() + 4_000),
        },
        {
          author: authors[4],
          stars: 1,
          comment: 'Not my style, but still well made.',
          createdAt: new Date(base.getTime() + 5_000),
          updatedAt: new Date(base.getTime() + 5_000),
        },
        {
          author: authors[5],
          stars: 4,
          comment: undefined,
          createdAt: new Date(base.getTime() + 6_000),
          updatedAt: new Date(base.getTime() + 6_000),
        },
      ] as const

      await Promise.all(
        rows.map((r) =>
          quizRatingModel.create(
            buildMockQuizRating({
              quizId,
              author: r.author,
              stars: r.stars,
              comment: r.comment,
              created: r.createdAt,
              updated: r.updatedAt,
            }),
          ),
        ),
      )

      return rows.map((r) => ({
        author: {
          id: String(r.author._id),
          nickname: r.author.defaultNickname,
        },
        stars: r.stars,
        ...(r.comment !== undefined ? { comment: r.comment } : {}),
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      }))
    }

    function buildExpectedPaginatedResponse(
      expected: SeededRatingExpectation[],
      limit: number = 5,
      offset: number = 0,
      sort: 'createdAt' | 'updatedAt' = 'updatedAt',
      direction: 'asc' | 'desc' = 'asc',
    ) {
      const sorted = expected
        .slice()
        .sort((a, b) =>
          direction === 'asc'
            ? a[sort].localeCompare(b[sort])
            : b[sort].localeCompare(a[sort]),
        )

      const expectedMatchers = sorted.slice(offset, offset + limit).map((e) => {
        const matcher: Record<string, unknown> = {
          id: expect.any(String),
          quizId: expect.any(String),
          author: {
            id: e.author.id,
            nickname: e.author.nickname,
          },
          stars: e.stars,
          createdAt: e.createdAt,
          updatedAt: e.updatedAt,
        }

        if (e.comment !== undefined) {
          matcher.comment = e.comment
        }

        return expect.objectContaining(matcher)
      })

      return {
        results: expect.arrayContaining(expectedMatchers),
        total: expected.length,
        limit,
        offset,
      }
    }
  })
})
