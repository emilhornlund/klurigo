import { QuizVisibility } from '@klurigo/common'
import { INestApplication } from '@nestjs/common'
import { getModelToken } from '@nestjs/mongoose'
import supertest from 'supertest'
import { v4 as uuidv4 } from 'uuid'

import {
  buildMockSecondaryUser,
  createMockClassicQuizRequestDto,
  createMockZeroToOneHundredQuizRequestDto,
} from '../../../../test-utils/data'
import {
  cleanupTestApp,
  createDefaultUserAndAuthenticate,
  createTestApp,
} from '../../../../test-utils/utils'
import { QuizService } from '../../quiz-api/services'
import { User, UserModel } from '../../user/repositories'

describe('QuizGameController (e2e)', () => {
  let app: INestApplication
  let quizService: QuizService
  let userModel: UserModel

  beforeEach(async () => {
    app = await createTestApp()
    quizService = app.get(QuizService)
    userModel = app.get<UserModel>(getModelToken(User.name))
  })

  afterEach(async () => {
    await cleanupTestApp(app)
  })

  describe('/api/quizzes/:quizId/games (POST)', () => {
    it('should succeed in creating a new game from an existing classic mode quiz', async () => {
      const { accessToken, user } = await createDefaultUserAndAuthenticate(app)

      const originalQuiz = await quizService.createQuiz(
        createMockClassicQuizRequestDto(),
        user,
      )

      return supertest(app.getHttpServer())
        .post(`/api/quizzes/${originalQuiz.id}/games`)
        .set({ Authorization: `Bearer ${accessToken}` })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id')
        })
    })

    it('should succeed in creating a new game from an existing zero-to-one-hundred mode quiz', async () => {
      const { accessToken, user } = await createDefaultUserAndAuthenticate(app)

      const originalQuiz = await quizService.createQuiz(
        createMockZeroToOneHundredQuizRequestDto(),
        user,
      )

      return supertest(app.getHttpServer())
        .post(`/api/quizzes/${originalQuiz.id}/games`)
        .set({ Authorization: `Bearer ${accessToken}` })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id')
        })
    })

    it('should fail in creating a new game from a non existing quiz', async () => {
      const quizId = uuidv4()

      const { accessToken } = await createDefaultUserAndAuthenticate(app)

      return supertest(app.getHttpServer())
        .post(`/api/quizzes/${quizId}/games`)
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

    it('should succeed in creating a new game from public quiz', async () => {
      const anotherUser = await userModel.create(buildMockSecondaryUser())

      const { id } = await quizService.createQuiz(
        createMockClassicQuizRequestDto({ visibility: QuizVisibility.Public }),
        anotherUser,
      )

      const { accessToken } = await createDefaultUserAndAuthenticate(app)

      return supertest(app.getHttpServer())
        .post(`/api/quizzes/${id}/games`)
        .set({ Authorization: `Bearer ${accessToken}` })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id')
        })
    })

    it('should fail in creating a new game from a non authorized quiz', async () => {
      const anotherUser = await userModel.create(buildMockSecondaryUser())

      const { id } = await quizService.createQuiz(
        createMockZeroToOneHundredQuizRequestDto({
          visibility: QuizVisibility.Private,
        }),
        anotherUser,
      )

      const { accessToken } = await createDefaultUserAndAuthenticate(app)

      return supertest(app.getHttpServer())
        .post(`/api/quizzes/${id}/games`)
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
