import {
  DEFAULT_CRITTERS_AVATAR_V1,
  GameMode,
  GameStatus,
  isCrittersAvatarConfigurationV1,
  QuestionType,
  QuizCategory,
  QuizRequestDto,
  QuizResponseDto,
  QuizVisibility,
} from '@klurigo/common'
import { INestApplication, Logger } from '@nestjs/common'
import { getModelToken } from '@nestjs/mongoose'
import supertest from 'supertest'
import { v4 as uuidv4 } from 'uuid'

import {
  buildMockSecondaryUser,
  createMockClassicGameResultQuestionMetric,
  createMockClassicQuiz,
  createMockClassicQuizRequestDto,
  createMockGameDocument,
  createMockGameResultDocument,
  createMockGameResultPlayerMetric,
  createMockPodiumTaskDocument,
  createMockZeroToOneHundredGameResultQuestionMetric,
  createMockZeroToOneHundredQuizRequestDto,
} from '../../../../test-utils/data'
import {
  cleanupTestApp,
  createBearerAuthHeader,
  createDefaultUserAndAuthenticate,
  createTestApp,
} from '../../../../test-utils/utils'
import { Game, GameModel } from '../../game-core/repositories/models/schemas'
import {
  GameResult,
  GameResultModel,
  QuestionMetric,
} from '../../game-result/repositories/models/schemas'
import { Quiz, QuizModel } from '../../quiz-core/repositories/models/schemas'
import { User, UserModel } from '../../user/repositories'
import { QuizService } from '../services'

const originalData = createMockClassicQuizRequestDto()

const updatedData = createMockZeroToOneHundredQuizRequestDto({
  visibility: QuizVisibility.Private,
})

describe('QuizController (e2e)', () => {
  let app: INestApplication
  let quizService: QuizService
  let quizModel: QuizModel
  let userModel: UserModel

  beforeEach(async () => {
    app = await createTestApp()
    quizService = app.get(QuizService)
    quizModel = app.get<QuizModel>(getModelToken(Quiz.name))
    userModel = app.get<UserModel>(getModelToken(User.name))
  })

  afterEach(async () => {
    await cleanupTestApp(app)
  })

  describe('/api/quizzes (POST)', () => {
    it('should succeed in creating a new quiz', async () => {
      const { accessToken } = await createDefaultUserAndAuthenticate(app)

      return supertest(app.getHttpServer())
        .post('/api/quizzes')
        .set(createBearerAuthHeader(accessToken))
        .send(originalData)
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id')
          expect(res.body).toHaveProperty('title', originalData.title)
          expect(res.body).toHaveProperty(
            'description',
            originalData.description,
          )
          expect(res.body).toHaveProperty('visibility', originalData.visibility)
          expect(res.body).toHaveProperty('category', originalData.category)
          expect(res.body).toHaveProperty(
            'imageCoverURL',
            originalData.imageCoverURL,
          )
          expect(res.body).toHaveProperty(
            'languageCode',
            originalData.languageCode,
          )
          expect(res.body).toHaveProperty('created')
          expect(res.body).toHaveProperty('updated')
        })
    })

    it('keeps a timed-out quiz write and documents that retry creates a separate quiz', async () => {
      const { accessToken } = await createDefaultUserAndAuthenticate(app)
      const createQuiz = quizService.createQuiz.bind(quizService)
      const quizLogger = (quizService as unknown as { logger: Logger }).logger
      const log = jest.spyOn(quizLogger, 'log')
      let signalPersisted!: (quizId: string) => void
      const persisted = new Promise<string>((resolve) => {
        signalPersisted = resolve
      })
      let releaseResponse!: () => void
      const responseGate = new Promise<void>((resolve) => {
        releaseResponse = resolve
      })
      let signalServiceCompleted!: () => void
      const serviceCompleted = new Promise<void>((resolve) => {
        signalServiceCompleted = resolve
      })
      const delayedCreate = jest
        .spyOn(quizService, 'createQuiz')
        .mockImplementationOnce(
          async (request: QuizRequestDto, owner: User) => {
            const response = await createQuiz(request, owner)
            signalPersisted(response.id)
            await responseGate
            signalServiceCompleted()
            return response
          },
        )
      const responsePromise = (async () =>
        await supertest(app.getHttpServer())
          .post('/api/quizzes')
          .set(createBearerAuthHeader(accessToken))
          .send(originalData)
          .expect(408))()

      try {
        const firstQuizId = await persisted
        await expect(
          quizModel.findById(firstQuizId).exec(),
        ).resolves.toBeDefined()
        expect(log).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Quiz persisted before response generation.',
            operation: 'createQuiz',
            quizId: firstQuizId,
            persistenceSucceeded: true,
          }),
        )

        await responsePromise
        releaseResponse()
        await serviceCompleted
        delayedCreate.mockRestore()

        const retryResponse = await supertest(app.getHttpServer())
          .post('/api/quizzes')
          .set(createBearerAuthHeader(accessToken))
          .send(originalData)
          .expect(201)

        expect(retryResponse.body.id).not.toBe(firstQuizId)
        await expect(
          quizModel.findById(retryResponse.body.id).exec(),
        ).resolves.toBeDefined()
      } finally {
        releaseResponse()
        delayedCreate.mockRestore()
        log.mockRestore()
        await Promise.allSettled([responsePromise, serviceCompleted])
      }
    }, 15_000)
  })

  describe('/api/quizzes (GET)', () => {
    it('paginates Other quizzes past a deleted author with accurate totals and stable ordering', async () => {
      const { accessToken, user } = await createDefaultUserAndAuthenticate(app)
      const created = new Date('2026-01-01T00:00:00.000Z')
      const validIds = Array.from({ length: 45 }, () => uuidv4())
        .sort()
        .reverse()
      await quizModel.create(
        validIds.map((_id) =>
          createMockClassicQuiz({
            _id,
            owner: user,
            category: QuizCategory.Other,
            visibility: QuizVisibility.Public,
            created,
          }),
        ),
      )
      await quizModel.create(
        createMockClassicQuiz({
          _id: uuidv4(),
          owner: { _id: uuidv4() } as User,
          category: QuizCategory.Other,
          visibility: QuizVisibility.Public,
          created,
        }),
      )
      await quizModel.create(
        createMockClassicQuiz({
          _id: uuidv4(),
          owner: user,
          category: QuizCategory.Other,
          visibility: QuizVisibility.Private,
          created,
        }),
      )
      await quizModel.create(
        createMockClassicQuiz({
          _id: uuidv4(),
          owner: user,
          category: QuizCategory.Science,
          visibility: QuizVisibility.Public,
          created,
        }),
      )

      const ids: string[] = []
      for (const offset of [0, 20, 40, 60]) {
        const { body } = await supertest(app.getHttpServer())
          .get('/api/quizzes')
          .query({
            category: QuizCategory.Other,
            sort: 'created',
            order: 'desc',
            limit: 20,
            offset,
          })
          .set(createBearerAuthHeader(accessToken))
          .expect(200)
        expect(body.total).toBe(45)
        expect(body.results.map((quiz: QuizResponseDto) => quiz.id)).toEqual(
          validIds.slice(offset, offset + 20),
        )
        ids.push(...body.results.map((quiz: QuizResponseDto) => quiz.id))
        expect(
          body.results.every(
            (quiz: QuizResponseDto) => quiz.author.id === user._id,
          ),
        ).toBe(true)
      }
      expect(ids).toEqual(validIds)
      expect(new Set(ids).size).toBe(45)
    })

    it('should return a paginated list of public quizzes', async () => {
      const { accessToken, user } = await createDefaultUserAndAuthenticate(app)

      const publicQuizzes: QuizResponseDto[] = []
      for (let i = 0; i < 10; i++) {
        publicQuizzes.push(await quizService.createQuiz(originalData, user))
      }

      await Promise.all(
        [...Array(5).keys()].map(() =>
          quizService.createQuiz(
            { ...originalData, visibility: QuizVisibility.Private },
            user,
          ),
        ),
      )

      const allResultsSortedByCreatedDate = publicQuizzes
        .sort((a, b) => b.created.getTime() - a.created.getTime())
        .map((quiz) => JSON.parse(JSON.stringify(quiz)))

      return supertest(app.getHttpServer())
        .get('/api/quizzes')
        .set(createBearerAuthHeader(accessToken))
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual({
            results: allResultsSortedByCreatedDate,
            total: 10,
            limit: 10,
            offset: 0,
          })
        })
    })

    it('should return quizzes filtered by search term', async () => {
      const { accessToken, user } = await createDefaultUserAndAuthenticate(app)

      await Promise.all([
        ...[...Array(10).keys()].map(() =>
          quizService.createQuiz({ ...originalData }, user),
        ),
      ])

      const uniqueQuiz = await quizService.createQuiz(
        { ...originalData, title: 'Unique Quiz Title' },
        user,
      )

      const uniqueQuizTitleResultsSortedByCreatedDate = [uniqueQuiz].map(
        (quiz) => JSON.parse(JSON.stringify(quiz)),
      )

      return supertest(app.getHttpServer())
        .get('/api/quizzes?search=Unique%20Quiz%20Title')
        .set(createBearerAuthHeader(accessToken))
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual({
            results: uniqueQuizTitleResultsSortedByCreatedDate,
            total: 1,
            limit: 10,
            offset: 0,
          })
        })
    })

    it('should return quizzes filtered by mode', async () => {
      const { accessToken, user } = await createDefaultUserAndAuthenticate(app)

      await Promise.all(
        [...Array(10).keys()].map(() =>
          quizService.createQuiz({ ...originalData }, user),
        ),
      )

      const zeroToOneHundredQuizzes: QuizResponseDto[] = []
      for (let i = 0; i < 10; i++) {
        zeroToOneHundredQuizzes.push(
          await quizService.createQuiz(
            { ...updatedData, visibility: QuizVisibility.Public },
            user,
          ),
        )
      }

      const zeroToOneHundredModeResultsSortedByCreatedDate =
        zeroToOneHundredQuizzes
          .filter((quiz) => quiz.mode === GameMode.ZeroToOneHundred)
          .sort((a, b) => b.created.getTime() - a.created.getTime())
          .map((quiz) => JSON.parse(JSON.stringify(quiz)))

      return supertest(app.getHttpServer())
        .get('/api/quizzes?mode=ZERO_TO_ONE_HUNDRED')
        .set(createBearerAuthHeader(accessToken))
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual({
            results: zeroToOneHundredModeResultsSortedByCreatedDate,
            total: 10,
            limit: 10,
            offset: 0,
          })
        })
    })

    it('should return quizzes sort by updated in ascending order', async () => {
      const { accessToken, user } = await createDefaultUserAndAuthenticate(app)

      const publicQuizzes: QuizResponseDto[] = []
      for (let i = 0; i < 10; i++) {
        publicQuizzes.push(await quizService.createQuiz(originalData, user))
      }

      const allResultsSortedByUpdatedAscendingDate = publicQuizzes
        .sort((a, b) => a.updated.getTime() - b.updated.getTime())
        .map((quiz) => JSON.parse(JSON.stringify(quiz)))

      return supertest(app.getHttpServer())
        .get('/api/quizzes?sort=updated&order=asc')
        .set(createBearerAuthHeader(accessToken))
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual({
            results: allResultsSortedByUpdatedAscendingDate,
            total: 10,
            limit: 10,
            offset: 0,
          })
        })
    })

    it('should return the correct number of quizzes based on the limit', async () => {
      const { accessToken, user } = await createDefaultUserAndAuthenticate(app)

      const publicQuizzes: QuizResponseDto[] = []
      for (let i = 0; i < 10; i++) {
        publicQuizzes.push(await quizService.createQuiz(originalData, user))
      }

      const firstFiveResultsSortedByCreatedDate = publicQuizzes
        .sort((a, b) => b.created.getTime() - a.created.getTime())
        .filter((_, index) => index >= 0 && index < 5)
        .map((quiz) => JSON.parse(JSON.stringify(quiz)))

      return supertest(app.getHttpServer())
        .get('/api/quizzes?limit=5')
        .set(createBearerAuthHeader(accessToken))
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual({
            results: firstFiveResultsSortedByCreatedDate,
            total: 10,
            limit: 5,
            offset: 0,
          })
        })
    })

    it('should return quizzes with the correct offset', async () => {
      const { accessToken, user } = await createDefaultUserAndAuthenticate(app)

      const publicQuizzes: QuizResponseDto[] = []
      for (let i = 0; i < 10; i++) {
        publicQuizzes.push(await quizService.createQuiz(originalData, user))
      }

      const secondFiveResultsSortedByCreatedDate = publicQuizzes
        .sort((a, b) => b.created.getTime() - a.created.getTime())
        .filter((_, index) => index >= 5 && index < 10)
        .map((quiz) => JSON.parse(JSON.stringify(quiz)))

      return supertest(app.getHttpServer())
        .get('/api/quizzes?limit=5&offset=5')
        .set(createBearerAuthHeader(accessToken))
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual({
            results: secondFiveResultsSortedByCreatedDate,
            total: 10,
            limit: 5,
            offset: 5,
          })
        })
    })

    it('should return an empty list when no quizzes exists', async () => {
      const { accessToken } = await createDefaultUserAndAuthenticate(app)

      return supertest(app.getHttpServer())
        .get('/api/quizzes')
        .set(createBearerAuthHeader(accessToken))
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual({
            results: [],
            total: 0,
            limit: 10,
            offset: 0,
          })
        })
    })

    it('should return a 401 error when the request is unauthorized', async () => {
      return supertest(app.getHttpServer())
        .get('/api/quizzes')
        .expect(401)
        .expect((res) => {
          expect(res.body).toEqual({
            message: 'Missing Authorization header',
            status: 401,
            timestamp: expect.anything(),
          })
        })
    })

    it('should validate query parameters and return a 400 error for invalid input', async () => {
      const { accessToken } = await createDefaultUserAndAuthenticate(app)

      return supertest(app.getHttpServer())
        .get('/api/quizzes?limit=X&offset=X&mode=X&sort=X&order=X')
        .set(createBearerAuthHeader(accessToken))
        .expect(400)
        .expect((res) => {
          expect(res.body).toEqual({
            message: 'Validation failed',
            status: 400,
            timestamp: expect.anything(),
            validationErrors: [
              {
                constraints: {
                  isEnum:
                    'mode must be one of the following values: CLASSIC, ZERO_TO_ONE_HUNDRED',
                },
                property: 'mode',
              },
              {
                constraints: {
                  isEnum:
                    'sort must be one of the following values: title, created, updated',
                },
                property: 'sort',
              },
              {
                constraints: {
                  isEnum:
                    'order must be one of the following values: asc, desc',
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
            ],
          })
        })
    })
  })

  describe('/api/quizzes/:quizId (GET)', () => {
    it.each([
      undefined,
      { ...DEFAULT_CRITTERS_AVATAR_V1, top: null, cheeks: null },
      { version: 99 },
    ])(
      'resolves the current author design %p without rewriting stored metadata',
      async (avatar) => {
        const { accessToken, user } =
          await createDefaultUserAndAuthenticate(app)
        const { id } = await quizService.createQuiz(originalData, user)
        const users = userModel.db.collection<{
          _id: string
          avatar?: unknown
        }>(userModel.collection.collectionName)
        if (avatar !== undefined)
          await users.updateOne({ _id: user._id }, { $set: { avatar } })

        await supertest(app.getHttpServer())
          .get(`/api/quizzes/${id}`)
          .set(createBearerAuthHeader(accessToken))
          .expect(200)
          .expect(({ body }) => {
            expect(body.author).toEqual({
              id: user._id,
              name: user.defaultNickname,
              avatar: isCrittersAvatarConfigurationV1(avatar)
                ? avatar
                : DEFAULT_CRITTERS_AVATAR_V1,
            })
          })
        expect((await users.findOne({ _id: user._id }))?.avatar).toEqual(avatar)
      },
    )

    it('should succeed in retrieving an existing quiz', async () => {
      const { accessToken, user } = await createDefaultUserAndAuthenticate(app)

      const originalQuiz = await quizService.createQuiz(originalData, user)

      return supertest(app.getHttpServer())
        .get(`/api/quizzes/${originalQuiz.id}`)
        .set(createBearerAuthHeader(accessToken))
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('id', originalQuiz.id)
          expect(res.body).toHaveProperty('title', originalData.title)
          expect(res.body).toHaveProperty(
            'description',
            originalData.description,
          )
          expect(res.body).toHaveProperty('mode')
          expect(res.body).toHaveProperty('visibility', originalData.visibility)
          expect(res.body).toHaveProperty('category', originalData.category)
          expect(res.body).toHaveProperty(
            'imageCoverURL',
            originalData.imageCoverURL,
          )
          expect(res.body).toHaveProperty(
            'languageCode',
            originalData.languageCode,
          )
          expect(res.body).toHaveProperty(
            'created',
            originalQuiz.created.toISOString(),
          )
          expect(res.body).toHaveProperty(
            'updated',
            originalQuiz.updated.toISOString(),
          )
        })
    })

    it('should fail in retrieving a non existing quiz', async () => {
      const quizId = uuidv4()

      const { accessToken } = await createDefaultUserAndAuthenticate(app)

      return supertest(app.getHttpServer())
        .get(`/api/quizzes/${quizId}`)
        .set(createBearerAuthHeader(accessToken))
        .expect(404)
        .expect((res) => {
          expect(res.body).toHaveProperty(
            'message',
            `Quiz was not found by id '${quizId}'`,
          )
          expect(res.body).toHaveProperty('status', 404)
          expect(res.body).toHaveProperty('timestamp')
        })
    })

    it('should succeed in retrieving a public quiz', async () => {
      const { accessToken, user } = await createDefaultUserAndAuthenticate(app)

      const {
        id,
        title,
        description,
        mode,
        visibility,
        languageCode,
        category,
        imageCoverURL,
        created,
        updated,
      } = await quizService.createQuiz(originalData, user)

      return supertest(app.getHttpServer())
        .get(`/api/quizzes/${id}`)
        .set(createBearerAuthHeader(accessToken))
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual({
            id,
            title,
            description,
            mode,
            visibility,
            languageCode,
            category,
            imageCoverURL,
            numberOfQuestions: originalData.questions.length,
            author: {
              id: user._id,
              name: user.defaultNickname,
              avatar: DEFAULT_CRITTERS_AVATAR_V1,
            },
            gameplaySummary: {
              count: 0,
              totalPlayerCount: 0,
            },
            ratingSummary: {
              comments: 0,
              stars: 0,
              total: 0,
            },
            created: created.toISOString(),
            updated: updated.toISOString(),
          })
        })
    })

    it('should fail in retrieving a private quiz', async () => {
      const user = await userModel.create(buildMockSecondaryUser())

      const { id } = await quizService.createQuiz(
        { ...originalData, visibility: QuizVisibility.Private },
        user,
      )

      const { accessToken } = await createDefaultUserAndAuthenticate(app)

      return supertest(app.getHttpServer())
        .get(`/api/quizzes/${id}`)
        .set(createBearerAuthHeader(accessToken))
        .expect(403)
        .expect((res) => {
          expect(res.body).toHaveProperty('message', 'Forbidden')
          expect(res.body).toHaveProperty('status', 403)
          expect(res.body).toHaveProperty('timestamp')
        })
    })
  })

  describe('/api/quizzes/:quizId (PATCH)', () => {
    it('lets the owner update visibility without replacing quiz content', async () => {
      const { accessToken, user } = await createDefaultUserAndAuthenticate(app)
      const quiz = await quizModel.create(
        createMockClassicQuiz({
          owner: user,
          visibility: QuizVisibility.Private,
        }),
      )
      const before = await quizModel.findById(quiz._id).lean()

      await supertest(app.getHttpServer())
        .patch(`/api/quizzes/${quiz._id}`)
        .set(createBearerAuthHeader(accessToken))
        .send({ visibility: QuizVisibility.Public })
        .expect(200)
        .expect(({ body }) => {
          expect(body).toMatchObject({
            id: quiz._id,
            visibility: QuizVisibility.Public,
          })
        })

      expect(await quizModel.findById(quiz._id).lean()).toEqual({
        ...before,
        visibility: QuizVisibility.Public,
        updated: expect.any(Date),
      })
    })

    it.each([
      {},
      { visibility: 'unknown' },
      { visibility: QuizVisibility.Public, title: 'Unexpected overwrite' },
    ])('rejects invalid visibility updates: %j', async (body) => {
      const { accessToken, user } = await createDefaultUserAndAuthenticate(app)
      const quiz = await quizModel.create(
        createMockClassicQuiz({
          owner: user,
          visibility: QuizVisibility.Private,
        }),
      )

      await supertest(app.getHttpServer())
        .patch(`/api/quizzes/${quiz._id}`)
        .set(createBearerAuthHeader(accessToken))
        .send(body)
        .expect(400)

      expect((await quizModel.findById(quiz._id))?.visibility).toBe(
        QuizVisibility.Private,
      )
    })

    it.each(Object.values(QuizVisibility))(
      'forbids non-owners from changing a %s quiz',
      async (visibility) => {
        const { accessToken } = await createDefaultUserAndAuthenticate(app)
        const owner = await userModel.create(buildMockSecondaryUser())
        const quiz = await quizModel.create(
          createMockClassicQuiz({ owner, visibility }),
        )

        await supertest(app.getHttpServer())
          .patch(`/api/quizzes/${quiz._id}`)
          .set(createBearerAuthHeader(accessToken))
          .send({
            visibility:
              visibility === QuizVisibility.Private
                ? QuizVisibility.Public
                : QuizVisibility.Private,
          })
          .expect(403)

        expect((await quizModel.findById(quiz._id))?.visibility).toBe(
          visibility,
        )
      },
    )
  })

  describe('/api/quizzes/:quizId (PUT)', () => {
    it('should succeed in updating an existing quiz', async () => {
      const { accessToken, user } = await createDefaultUserAndAuthenticate(app)

      const now = new Date()

      const originalQuiz = await quizModel.create(
        createMockClassicQuiz({
          owner: user,
          gameplaySummary: {
            count: 2,
            totalPlayerCount: 12,
            totalClassicCorrectCount: 10,
            totalClassicIncorrectCount: 30,
            totalClassicUnansweredCount: 60,
            totalZeroToOneHundredPrecisionSum: 0,
            totalZeroToOneHundredAnsweredCount: 0,
            totalZeroToOneHundredUnansweredCount: 0,
            lastPlayedAt: now,
          },
          ratingSummary: {
            count: 1,
            avg: 5,
            stars: {
              '1': 0,
              '2': 0,
              '3': 0,
              '4': 0,
              '5': 1,
            },
            commentCount: 1,
            updated: now,
          },
          created: now,
          updated: now,
        }),
      )

      return supertest(app.getHttpServer())
        .put(`/api/quizzes/${originalQuiz._id}`)
        .set(createBearerAuthHeader(accessToken))
        .send(updatedData)
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual({
            id: originalQuiz._id,
            title: updatedData.title,
            mode: updatedData.mode,
            visibility: updatedData.visibility,
            description: updatedData.description,
            category: originalData.category,
            imageCoverURL: updatedData.imageCoverURL,
            languageCode: updatedData.languageCode,
            numberOfQuestions: updatedData.questions.length,
            author: {
              id: user._id,
              name: user.defaultNickname,
              avatar: DEFAULT_CRITTERS_AVATAR_V1,
            },
            gameplaySummary: {
              count: 2,
              totalPlayerCount: 12,
              difficultyPercentage: 0.78,
              lastPlayed: now.toISOString(),
            },
            ratingSummary: {
              stars: 5,
              comments: 1,
              total: 1,
            },
            created: now.toISOString(),
            updated: expect.any(String),
          })
        })
    })

    it('should accept local upload URLs for ordinary question media', async () => {
      const { accessToken, user } = await createDefaultUserAndAuthenticate(app)
      const quiz = await quizService.createQuiz(originalData, user)
      const localUrl = 'http://localhost:8080/uploads/images/test.webp'
      const payload = {
        ...originalData,
        questions: originalData.questions.map((question) =>
          question.type === QuestionType.MultiChoice
            ? { ...question, media: { ...question.media!, url: localUrl } }
            : question,
        ),
      }

      await supertest(app.getHttpServer())
        .put(`/api/quizzes/${quiz.id}`)
        .set(createBearerAuthHeader(accessToken))
        .send(payload)
        .expect(200)

      const saved = await quizModel.findById(quiz.id)
      expect(
        (saved!.questions[0] as { media: { url: string } }).media.url,
      ).toBe(localUrl)
    })

    it('should accept local upload URLs for Pin question images', async () => {
      const { accessToken, user } = await createDefaultUserAndAuthenticate(app)
      const quiz = await quizService.createQuiz(originalData, user)
      const localUrl = 'http://localhost:8080/uploads/images/pin.webp'
      const payload = {
        ...originalData,
        questions: originalData.questions.map((question) =>
          question.type === QuestionType.Pin
            ? { ...question, imageURL: localUrl }
            : question,
        ),
      }

      await supertest(app.getHttpServer())
        .put(`/api/quizzes/${quiz.id}`)
        .set(createBearerAuthHeader(accessToken))
        .send(payload)
        .expect(200)

      const saved = await quizModel.findById(quiz.id)
      expect((saved!.questions[4] as { imageURL: string }).imageURL).toBe(
        localUrl,
      )
    })

    it.each([0, 25, 100])(
      'should persist Zero-to-100 correct answer %s',
      async (correct) => {
        const { accessToken, user } =
          await createDefaultUserAndAuthenticate(app)
        const quiz = await quizService.createQuiz(updatedData, user)
        const payload = {
          ...updatedData,
          questions: updatedData.questions.map((question) => ({
            ...question,
            correct,
          })),
        }

        await supertest(app.getHttpServer())
          .put(`/api/quizzes/${quiz.id}`)
          .set(createBearerAuthHeader(accessToken))
          .send(payload)
          .expect(200)

        const saved = await quizModel.findById(quiz.id)
        expect((saved!.questions[0] as { correct: number }).correct).toBe(
          correct,
        )
      },
    )

    it.each([25.5, -1, 101])(
      'should reject and not persist invalid Zero-to-100 answer %s',
      async (correct) => {
        const { accessToken, user } =
          await createDefaultUserAndAuthenticate(app)
        const quiz = await quizService.createQuiz(updatedData, user)
        const payload = {
          ...updatedData,
          questions: updatedData.questions.map((question) => ({
            ...question,
            correct,
          })),
        }

        await supertest(app.getHttpServer())
          .put(`/api/quizzes/${quiz.id}`)
          .set(createBearerAuthHeader(accessToken))
          .send(payload)
          .expect(400)

        const saved = await quizModel.findById(quiz.id)
        expect((saved!.questions[0] as { correct: number }).correct).toBe(
          updatedData.questions[0]!.correct,
        )
      },
    )

    it.each([
      ['ordinary media', QuestionType.MultiChoice],
      ['Pin image', QuestionType.Pin],
    ])(
      'should reject malformed URL in %s without saving it',
      async (_label, questionType) => {
        const { accessToken, user } =
          await createDefaultUserAndAuthenticate(app)
        const quiz = await quizService.createQuiz(originalData, user)
        const questionIndex = originalData.questions.findIndex(
          (question) => question.type === questionType,
        )
        const payload = {
          ...originalData,
          questions: originalData.questions.map((question) => {
            if (question.type !== questionType) return question
            return question.type === QuestionType.Pin
              ? { ...question, imageURL: 'ftp://bad' }
              : { ...question, media: { ...question.media!, url: 'ftp://bad' } }
          }),
        }

        await supertest(app.getHttpServer())
          .put(`/api/quizzes/${quiz.id}`)
          .set(createBearerAuthHeader(accessToken))
          .send(payload)
          .expect(400)

        const saved = await quizModel.findById(quiz.id)
        const savedQuestion = saved!.questions[questionIndex] as unknown as {
          imageURL?: string
          media?: { url: string }
        }
        const originalQuestion = originalData.questions[questionIndex]
        if (originalQuestion.type === QuestionType.Pin) {
          expect(savedQuestion.imageURL).toBe(originalQuestion.imageURL)
        } else {
          expect(savedQuestion.media?.url).toBe(originalQuestion.media?.url)
        }
      },
    )

    it('should fail in updating a non existing quiz', async () => {
      const quizId = uuidv4()
      const { accessToken } = await createDefaultUserAndAuthenticate(app)

      return supertest(app.getHttpServer())
        .put(`/api/quizzes/${quizId}`)
        .set(createBearerAuthHeader(accessToken))
        .send(updatedData)
        .expect(404)
        .expect((res) => {
          expect(res.body).toHaveProperty(
            'message',
            `Quiz was not found by id '${quizId}'`,
          )
          expect(res.body).toHaveProperty('status', 404)
          expect(res.body).toHaveProperty('timestamp')
        })
    })

    it('should fail in updating a non authorized quiz', async () => {
      const user = await userModel.create(buildMockSecondaryUser())

      const { id } = await quizService.createQuiz(originalData, user)

      const { accessToken } = await createDefaultUserAndAuthenticate(app)

      return supertest(app.getHttpServer())
        .put(`/api/quizzes/${id}`)
        .set(createBearerAuthHeader(accessToken))
        .send(updatedData)
        .expect(403)
        .expect((res) => {
          expect(res.body).toHaveProperty('message', 'Forbidden')
          expect(res.body).toHaveProperty('status', 403)
          expect(res.body).toHaveProperty('timestamp')
        })
    })
  })

  describe('/api/quizzes/:quizId (DELETE)', () => {
    it('should succeed in deleting an existing quiz', async () => {
      const { accessToken, user } = await createDefaultUserAndAuthenticate(app)

      const originalQuiz = await quizService.createQuiz(originalData, user)

      return supertest(app.getHttpServer())
        .delete(`/api/quizzes/${originalQuiz.id}`)
        .set(createBearerAuthHeader(accessToken))
        .expect(204)
        .expect((res) => {
          expect(res.body).toEqual({})
        })
    })

    it('should fail in deleting a non existing quiz', async () => {
      const quizId = uuidv4()

      const { accessToken } = await createDefaultUserAndAuthenticate(app)

      return supertest(app.getHttpServer())
        .delete(`/api/quizzes/${quizId}`)
        .set(createBearerAuthHeader(accessToken))
        .expect(404)
        .expect((res) => {
          expect(res.body).toHaveProperty(
            'message',
            `Quiz was not found by id '${quizId}'`,
          )
          expect(res.body).toHaveProperty('status', 404)
          expect(res.body).toHaveProperty('timestamp')
        })
    })

    it('should fail in deleting a non authorized quiz', async () => {
      const user = await userModel.create(buildMockSecondaryUser())

      const { id } = await quizService.createQuiz(originalData, user)

      const { accessToken } = await createDefaultUserAndAuthenticate(app)

      return supertest(app.getHttpServer())
        .delete(`/api/quizzes/${id}`)
        .set(createBearerAuthHeader(accessToken))
        .expect(403)
        .expect((res) => {
          expect(res.body).toHaveProperty('message', 'Forbidden')
          expect(res.body).toHaveProperty('status', 403)
          expect(res.body).toHaveProperty('timestamp')
        })
    })
  })

  describe('/api/quizzes/:quizId/questions/preview (GET)', () => {
    it('returns only the first three prompts in stored order to a signed-in non-owner of a public quiz', async () => {
      const owner = await userModel.create(buildMockSecondaryUser())
      const quiz = await quizService.createQuiz(originalData, owner)
      const { accessToken } = await createDefaultUserAndAuthenticate(app)
      const api = supertest(app.getHttpServer())
      const path = `/api/quizzes/${quiz.id}/questions/preview`
      const games = app.get<GameModel>(getModelToken(Game.name))
      const gameFilter = { quiz: quiz.id }
      const gameCountBefore = await games.collection.countDocuments(gameFilter)

      await api
        .get(path)
        .set(createBearerAuthHeader(accessToken))
        .expect(200)
        .expect([
          {
            type: QuestionType.MultiChoice,
            question: originalData.questions[0].question,
          },
          {
            type: QuestionType.Range,
            question: originalData.questions[1].question,
          },
          {
            type: QuestionType.TrueFalse,
            question: originalData.questions[2].question,
          },
        ])

      expect(await games.collection.countDocuments(gameFilter)).toBe(
        gameCountBefore,
      )
      await api.get(path).expect(401)
      await api
        .get(`/api/quizzes/${quiz.id}/questions`)
        .set(createBearerAuthHeader(accessToken))
        .expect(403)

      await api
        .get(`/api/quizzes/${quiz.id}`)
        .set(createBearerAuthHeader(accessToken))
        .expect(200)
        .expect(({ body }: { body: QuizResponseDto }) => {
          expect(body.gameplaySummary).toEqual(quiz.gameplaySummary)
        })
    })

    it('returns prompts for type-answer, pin and puzzle without their solutions or media', async () => {
      const { accessToken, user } = await createDefaultUserAndAuthenticate(app)
      const questions = originalData.questions.slice(3)
      const quiz = await quizService.createQuiz(
        { ...originalData, questions },
        user,
      )

      await supertest(app.getHttpServer())
        .get(`/api/quizzes/${quiz.id}/questions/preview`)
        .set(createBearerAuthHeader(accessToken))
        .expect(200)
        .expect([
          { type: QuestionType.TypeAnswer, question: questions[0].question },
          { type: QuestionType.Pin, question: questions[1].question },
          { type: QuestionType.Puzzle, question: questions[2].question },
        ])
    })

    it('returns a shorter private 0 to 100 preview only to its owner', async () => {
      const { accessToken, user } = await createDefaultUserAndAuthenticate(app)
      const quiz = await quizService.createQuiz(updatedData, user)
      const otherOwner = await userModel.create(buildMockSecondaryUser())
      const otherQuiz = await quizService.createQuiz(updatedData, otherOwner)
      const api = supertest(app.getHttpServer())
      const auth = createBearerAuthHeader(accessToken)

      await api
        .get(`/api/quizzes/${quiz.id}/questions/preview`)
        .set(auth)
        .expect(200)
        .expect([
          {
            type: QuestionType.Range,
            question: updatedData.questions[0].question,
          },
        ])
      await api
        .get(`/api/quizzes/${otherQuiz.id}/questions/preview`)
        .set(auth)
        .expect(403)
      await api
        .get(`/api/quizzes/${uuidv4()}/questions/preview`)
        .set(auth)
        .expect(404)
    })
  })

  describe('/api/quizzes/:quizId/recent-games (GET)', () => {
    const saveGame = async (
      quiz: QuizResponseDto,
      completed: string,
      {
        mode = quiz.mode,
        status = GameStatus.Completed,
        playerCount = 4,
        onPodium = false,
      } = {},
      questions: QuestionMetric[] = [
        createMockClassicGameResultQuestionMetric({ correct: 3, incorrect: 1 }),
        createMockClassicGameResultQuestionMetric({
          correct: 1,
          unanswered: 3,
        }),
      ],
    ) => {
      const games = app.get<GameModel>(getModelToken(Game.name))
      const results = app.get<GameResultModel>(getModelToken(GameResult.name))
      const game = await games.create({
        ...createMockGameDocument({
          _id: uuidv4(),
          status,
          mode,
          ...(onPodium
            ? {
                currentTask: createMockPodiumTaskDocument({ status: 'active' }),
              }
            : {}),
        }),
        quiz: { _id: quiz.id },
      })
      await results.create(
        createMockGameResultDocument({
          _id: uuidv4(),
          game,
          completed: new Date(completed),
          players: Array.from({ length: playerCount }, () =>
            createMockGameResultPlayerMetric({ participantId: uuidv4() }),
          ),
          questions,
        }),
      )
    }

    it('returns the latest three eligible games as aggregates to a signed-in non-owner', async () => {
      const owner = await userModel.create(buildMockSecondaryUser())
      const quiz = await quizService.createQuiz(originalData, owner)
      const otherQuiz = await quizService.createQuiz(originalData, owner)
      const { accessToken } = await createDefaultUserAndAuthenticate(app)
      const date = (day: number) => `2026-01-1${day}T12:00:00.000Z`

      await saveGame(
        quiz,
        date(4),
        { status: GameStatus.Active, onPodium: true, playerCount: 3 },
        [createMockClassicGameResultQuestionMetric({ incorrect: 3 })],
      )
      await saveGame(quiz, date(1))
      await saveGame(quiz, date(5), { playerCount: 0 })
      // A saved result does not make an active non-podium game eligible.
      await saveGame(quiz, date(6), { status: GameStatus.Active })
      await saveGame(quiz, date(3))
      await saveGame(otherQuiz, date(7))
      await saveGame(quiz, date(2), { playerCount: 1 }, [
        createMockClassicGameResultQuestionMetric({ unanswered: 1 }),
      ])
      // A terminal game without a persisted result is also ineligible.
      await app.get<GameModel>(getModelToken(Game.name)).create({
        ...createMockGameDocument({
          _id: uuidv4(),
          status: GameStatus.Completed,
        }),
        quiz: { _id: quiz.id },
        completedAt: new Date(date(8)),
      })

      const api = supertest(app.getHttpServer())
      const path = `/api/quizzes/${quiz.id}/recent-games`
      await api.get(path).expect(401)
      await api
        .get(path)
        .set(createBearerAuthHeader(accessToken))
        .expect(200)
        .expect([
          { completed: date(4), playerCount: 3, correctnessPercentage: 0 },
          { completed: date(3), playerCount: 4, correctnessPercentage: 80 },
          { completed: date(2), playerCount: 1 },
        ])
    })

    it('restricts private quizzes to their owner and returns average precision for Zero To One Hundred games', async () => {
      const owner = await userModel.create(buildMockSecondaryUser())
      const privateQuiz = await quizService.createQuiz(updatedData, owner)
      const { accessToken, user } = await createDefaultUserAndAuthenticate(app)
      const ownQuiz = await quizService.createQuiz(updatedData, user)
      const completed = '2026-01-10T12:00:00.000Z'
      const olderCompleted = '2026-01-09T12:00:00.000Z'
      const questions = [
        createMockZeroToOneHundredGameResultQuestionMetric({
          averagePrecision: 0.92,
        }),
        createMockZeroToOneHundredGameResultQuestionMetric({
          averagePrecision: 0.69,
        }),
      ]
      await saveGame(privateQuiz, completed, {}, questions)
      await saveGame(ownQuiz, completed, {}, questions)
      await saveGame(ownQuiz, olderCompleted, {}, [])

      const api = supertest(app.getHttpServer())
      const auth = createBearerAuthHeader(accessToken)
      await api
        .get(`/api/quizzes/${privateQuiz.id}/recent-games`)
        .set(auth)
        .expect(403)
      await api
        .get(`/api/quizzes/${ownQuiz.id}/recent-games`)
        .set(auth)
        .expect(200)
        .expect([
          { completed, playerCount: 4, averagePrecisionPercentage: 81 },
          { completed: olderCompleted, playerCount: 4 },
        ])
      await api
        .get(`/api/quizzes/${uuidv4()}/recent-games`)
        .set(auth)
        .expect(404)
    })

    it('returns an empty list for a quiz without eligible games', async () => {
      const { accessToken, user } = await createDefaultUserAndAuthenticate(app)
      const quiz = await quizService.createQuiz(originalData, user)
      await saveGame(quiz, '2026-01-10T12:00:00.000Z', { playerCount: 0 })

      await supertest(app.getHttpServer())
        .get(`/api/quizzes/${quiz.id}/recent-games`)
        .set(createBearerAuthHeader(accessToken))
        .expect(200)
        .expect([])
    })
  })

  describe('/api/quizzes/:quizId/questions (GET)', () => {
    it('should succeed in retrieving all questions for a classic mode quiz', async () => {
      const { accessToken, user } = await createDefaultUserAndAuthenticate(app)

      const quiz = await quizService.createQuiz(originalData, user)

      return supertest(app.getHttpServer())
        .get(`/api/quizzes/${quiz.id}/questions`)
        .set(createBearerAuthHeader(accessToken))
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual(originalData.questions)
        })
    })

    it('should succeed in retrieving all questions for a zero to one hundred mode quiz', async () => {
      const { accessToken, user } = await createDefaultUserAndAuthenticate(app)

      const quiz = await quizService.createQuiz(updatedData, user)

      return supertest(app.getHttpServer())
        .get(`/api/quizzes/${quiz.id}/questions`)
        .set(createBearerAuthHeader(accessToken))
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual(updatedData.questions)
        })
    })

    it('should fail in retrieving all questions for a non existing quiz', async () => {
      const unknownQuizId = uuidv4()

      const { accessToken } = await createDefaultUserAndAuthenticate(app)

      return supertest(app.getHttpServer())
        .get(`/api/quizzes/${unknownQuizId}/questions`)
        .set(createBearerAuthHeader(accessToken))
        .expect(404)
        .expect((res) => {
          expect(res.body).toHaveProperty(
            'message',
            `Quiz was not found by id '${unknownQuizId}'`,
          )
          expect(res.body).toHaveProperty('status', 404)
          expect(res.body).toHaveProperty('timestamp')
        })
    })

    it('should fail in retrieving all questions for a non authorized quiz', async () => {
      const user = await userModel.create(buildMockSecondaryUser())

      const quiz = await quizService.createQuiz(originalData, user)

      const { accessToken } = await createDefaultUserAndAuthenticate(app)

      return supertest(app.getHttpServer())
        .get(`/api/quizzes/${quiz.id}/questions`)
        .set(createBearerAuthHeader(accessToken))
        .expect(403)
        .expect((res) => {
          expect(res.body).toHaveProperty('message', 'Forbidden')
          expect(res.body).toHaveProperty('status', 403)
          expect(res.body).toHaveProperty('timestamp')
        })
    })
  })
})
