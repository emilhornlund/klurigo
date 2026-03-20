import { GameMode, QuizResponseDto, QuizVisibility } from '@klurigo/common'
import { INestApplication } from '@nestjs/common'
import { getModelToken } from '@nestjs/mongoose'
import supertest from 'supertest'
import { v4 as uuidv4 } from 'uuid'

import {
  buildMockSecondaryUser,
  createMockClassicQuiz,
  createMockClassicQuizRequestDto,
  createMockZeroToOneHundredQuizRequestDto,
} from '../../../../test-utils/data'
import { createDefaultUserAndAuthenticate } from '../../../../test-utils/utils'
import { closeTestApp, createTestApp } from '../../../../test-utils/utils'
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
    await closeTestApp(app)
  })

  describe('/api/quizzes (POST)', () => {
    it('should succeed in creating a new quiz', async () => {
      const { accessToken } = await createDefaultUserAndAuthenticate(app)

      return supertest(app.getHttpServer())
        .post('/api/quizzes')
        .set({ Authorization: `Bearer ${accessToken}` })
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
  })

  describe('/api/quizzes (GET)', () => {
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
        .set({ Authorization: `Bearer ${accessToken}` })
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
        .set({ Authorization: `Bearer ${accessToken}` })
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
        .set({ Authorization: `Bearer ${accessToken}` })
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
        .set({ Authorization: `Bearer ${accessToken}` })
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
        .set({ Authorization: `Bearer ${accessToken}` })
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
        .set({ Authorization: `Bearer ${accessToken}` })
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
        .set({ Authorization: `Bearer ${accessToken}` })
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
        .set({ Authorization: `Bearer ${accessToken}` })
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
    it('should succeed in retrieving an existing quiz', async () => {
      const { accessToken, user } = await createDefaultUserAndAuthenticate(app)

      const originalQuiz = await quizService.createQuiz(originalData, user)

      return supertest(app.getHttpServer())
        .get(`/api/quizzes/${originalQuiz.id}`)
        .set({ Authorization: `Bearer ${accessToken}` })
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
        .set({ Authorization: `Bearer ${accessToken}` })
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
        .set({ Authorization: `Bearer ${accessToken}` })
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
        .set({ Authorization: `Bearer ${accessToken}` })
        .expect(403)
        .expect((res) => {
          expect(res.body).toHaveProperty('message', 'Forbidden')
          expect(res.body).toHaveProperty('status', 403)
          expect(res.body).toHaveProperty('timestamp')
        })
    })
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
        .set({ Authorization: `Bearer ${accessToken}` })
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

    it('should fail in updating a non existing quiz', async () => {
      const quizId = uuidv4()
      const { accessToken } = await createDefaultUserAndAuthenticate(app)

      return supertest(app.getHttpServer())
        .put(`/api/quizzes/${quizId}`)
        .set({ Authorization: `Bearer ${accessToken}` })
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
        .set({ Authorization: `Bearer ${accessToken}` })
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
        .set({ Authorization: `Bearer ${accessToken}` })
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
        .set({ Authorization: `Bearer ${accessToken}` })
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
        .set({ Authorization: `Bearer ${accessToken}` })
        .expect(403)
        .expect((res) => {
          expect(res.body).toHaveProperty('message', 'Forbidden')
          expect(res.body).toHaveProperty('status', 403)
          expect(res.body).toHaveProperty('timestamp')
        })
    })
  })

  describe('/api/quizzes/:quizId/questions (GET)', () => {
    it('should succeed in retrieving all questions for a classic mode quiz', async () => {
      const { accessToken, user } = await createDefaultUserAndAuthenticate(app)

      const quiz = await quizService.createQuiz(originalData, user)

      return supertest(app.getHttpServer())
        .get(`/api/quizzes/${quiz.id}/questions`)
        .set({ Authorization: `Bearer ${accessToken}` })
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
        .set({ Authorization: `Bearer ${accessToken}` })
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
        .set({ Authorization: `Bearer ${accessToken}` })
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
        .set({ Authorization: `Bearer ${accessToken}` })
        .expect(403)
        .expect((res) => {
          expect(res.body).toHaveProperty('message', 'Forbidden')
          expect(res.body).toHaveProperty('status', 403)
          expect(res.body).toHaveProperty('timestamp')
        })
    })
  })
})
