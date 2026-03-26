import { Authority, QuizVisibility, TokenScope } from '@klurigo/common'
import { INestApplication } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { getModelToken } from '@nestjs/mongoose'
import supertest from 'supertest'
import { v4 as uuidv4 } from 'uuid'

import {
  buildMockQuaternaryUser,
  buildMockSecondaryUser,
  buildMockTertiaryUser,
  createMockClassicQuiz,
  createMockGameResultDocument,
  createMockGameResultPlayerMetric,
} from '../../../../test-utils/data'
import {
  closeTestApp,
  createDefaultUserAndAuthenticate,
  createTestApp,
} from '../../../../test-utils/utils'
import { DEFAULT_ACCESS_TOKEN_EXPIRATION_TIME } from '../../../app/shared/token'
import {
  GameResult,
  GameResultModel,
} from '../../game-result/repositories/models/schemas'
import { Quiz, QuizModel } from '../../quiz-core/repositories/models/schemas'
import { User, UserModel } from '../../user/repositories'

describe('PublicUserController (e2e)', () => {
  let app: INestApplication
  let jwtService: JwtService
  let userModel: UserModel
  let quizModel: QuizModel
  let gameResultModel: GameResultModel

  beforeEach(async () => {
    app = await createTestApp()
    jwtService = app.get<JwtService>(JwtService)
    userModel = app.get<UserModel>(getModelToken(User.name))
    quizModel = app.get<QuizModel>(getModelToken(Quiz.name))
    gameResultModel = app.get<GameResultModel>(getModelToken(GameResult.name))
  })

  afterEach(async () => {
    await closeTestApp(app)
  })

  async function createUserTokenWithoutUserAuthority(
    userId: string,
  ): Promise<string> {
    return jwtService.signAsync(
      {
        scope: TokenScope.User,
        authorities: [Authority.Quiz],
      },
      {
        subject: userId,
        expiresIn: DEFAULT_ACCESS_TOKEN_EXPIRATION_TIME,
      },
    )
  }

  describe('/api/users/:userId/profile (GET)', () => {
    it('should return the public profile summary with aggregated counts', async () => {
      const { accessToken } = await createDefaultUserAndAuthenticate(app)
      const joinedAt = new Date('2024-05-10T12:00:00.000Z')
      const targetUser = await userModel.create(
        buildMockSecondaryUser({
          createdAt: joinedAt,
          updatedAt: joinedAt,
        }),
      )
      const otherUser = await userModel.create(buildMockTertiaryUser())

      await quizModel.create([
        createMockClassicQuiz({
          owner: targetUser,
          title: 'Alpha Astronomy',
          visibility: QuizVisibility.Public,
        }),
        createMockClassicQuiz({
          owner: targetUser,
          title: 'Beta Biology',
          visibility: QuizVisibility.Public,
        }),
        createMockClassicQuiz({
          owner: targetUser,
          title: 'Private Practice',
          visibility: QuizVisibility.Private,
        }),
        createMockClassicQuiz({
          owner: otherUser,
          title: 'Other Public Quiz',
          visibility: QuizVisibility.Public,
        }),
      ])

      await gameResultModel.create([
        createMockGameResultDocument({
          hostParticipantId: targetUser._id,
          players: [
            createMockGameResultPlayerMetric({ participantId: otherUser._id }),
          ],
        }),
        createMockGameResultDocument({
          hostParticipantId: otherUser._id,
          players: [
            createMockGameResultPlayerMetric({
              participantId: targetUser._id,
              nickname: targetUser.defaultNickname,
            }),
          ],
        }),
        createMockGameResultDocument({
          hostParticipantId: otherUser._id,
          players: [
            createMockGameResultPlayerMetric({ participantId: otherUser._id }),
          ],
        }),
      ])

      return supertest(app.getHttpServer())
        .get(`/api/users/${targetUser._id}/profile`)
        .set({ Authorization: `Bearer ${accessToken}` })
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual({
            id: targetUser._id,
            nickname: targetUser.defaultNickname,
            quizzesCount: 2,
            hostedGamesCount: 1,
            playedGamesCount: 1,
            createdAt: joinedAt.toISOString(),
          })
        })
    })

    it('should return 404 when the requested user does not exist', async () => {
      const { accessToken } = await createDefaultUserAndAuthenticate(app)
      const missingUserId = uuidv4()

      return supertest(app.getHttpServer())
        .get(`/api/users/${missingUserId}/profile`)
        .set({ Authorization: `Bearer ${accessToken}` })
        .expect(404)
        .expect((res) => {
          expect(res.body).toEqual({
            message: `User '${missingUserId}' was not found`,
            status: 404,
            timestamp: expect.anything(),
          })
        })
    })

    it('should return 401 without an access token', async () => {
      const targetUser = await userModel.create(buildMockSecondaryUser())

      return supertest(app.getHttpServer())
        .get(`/api/users/${targetUser._id}/profile`)
        .expect(401)
        .expect((res) => {
          expect(res.body).toEqual({
            message: 'Missing Authorization header',
            status: 401,
            timestamp: expect.anything(),
          })
        })
    })

    it('should return 403 when the token lacks Authority.User', async () => {
      const { user: requester } = await createDefaultUserAndAuthenticate(app)
      const targetUser = await userModel.create(buildMockSecondaryUser())
      const accessToken = await createUserTokenWithoutUserAuthority(
        requester._id,
      )

      return supertest(app.getHttpServer())
        .get(`/api/users/${targetUser._id}/profile`)
        .set({ Authorization: `Bearer ${accessToken}` })
        .expect(403)
        .expect((res) => {
          expect(res.body).toEqual({
            message: 'Insufficient authorities',
            status: 403,
            timestamp: expect.anything(),
          })
        })
    })
  })

  describe('/api/users/:userId/quizzes (GET)', () => {
    it('should return only the requested user’s public quizzes using the paginated quiz response contract', async () => {
      const { accessToken } = await createDefaultUserAndAuthenticate(app)
      const targetUser = await userModel.create(buildMockSecondaryUser())
      const otherUser = await userModel.create(buildMockTertiaryUser())

      const [publicQuiz] = await quizModel.create([
        createMockClassicQuiz({
          owner: targetUser,
          title: 'Astronomy Essentials',
          visibility: QuizVisibility.Public,
        }),
        createMockClassicQuiz({
          owner: targetUser,
          title: 'Private Draft',
          visibility: QuizVisibility.Private,
        }),
        createMockClassicQuiz({
          owner: otherUser,
          title: 'Other User Public Quiz',
          visibility: QuizVisibility.Public,
        }),
      ])

      return supertest(app.getHttpServer())
        .get(`/api/users/${targetUser._id}/quizzes`)
        .set({ Authorization: `Bearer ${accessToken}` })
        .expect(200)
        .expect((res) => {
          expect(res.body.total).toBe(1)
          expect(res.body.limit).toBe(10)
          expect(res.body.offset).toBe(0)
          expect(res.body.results).toHaveLength(1)
          expect(res.body.results[0]).toEqual({
            id: publicQuiz._id,
            title: 'Astronomy Essentials',
            description: publicQuiz.description,
            mode: publicQuiz.mode,
            visibility: QuizVisibility.Public,
            category: publicQuiz.category,
            imageCoverURL: publicQuiz.imageCoverURL,
            languageCode: publicQuiz.languageCode,
            numberOfQuestions: publicQuiz.questions.length,
            author: {
              id: targetUser._id,
              name: targetUser.defaultNickname,
            },
            gameplaySummary: {
              count: 0,
              totalPlayerCount: 0,
            },
            ratingSummary: {
              stars: 0,
              comments: 0,
              total: 0,
            },
            created: publicQuiz.created.toISOString(),
            updated: publicQuiz.updated.toISOString(),
          })
        })
    })

    it('should apply sort, order, limit, and offset query parameters', async () => {
      const { accessToken } = await createDefaultUserAndAuthenticate(app)
      const targetUser = await userModel.create(buildMockSecondaryUser())

      await quizModel.create([
        createMockClassicQuiz({
          owner: targetUser,
          title: 'Alpha',
          visibility: QuizVisibility.Public,
          created: new Date('2024-01-01T00:00:00.000Z'),
          updated: new Date('2024-01-01T00:00:00.000Z'),
        }),
        createMockClassicQuiz({
          owner: targetUser,
          title: 'Bravo',
          visibility: QuizVisibility.Public,
          created: new Date('2024-02-01T00:00:00.000Z'),
          updated: new Date('2024-02-01T00:00:00.000Z'),
        }),
        createMockClassicQuiz({
          owner: targetUser,
          title: 'Charlie',
          visibility: QuizVisibility.Public,
          created: new Date('2024-03-01T00:00:00.000Z'),
          updated: new Date('2024-03-01T00:00:00.000Z'),
        }),
        createMockClassicQuiz({
          owner: targetUser,
          title: 'Delta',
          visibility: QuizVisibility.Public,
          created: new Date('2024-04-01T00:00:00.000Z'),
          updated: new Date('2024-04-01T00:00:00.000Z'),
        }),
      ])

      return supertest(app.getHttpServer())
        .get(`/api/users/${targetUser._id}/quizzes`)
        .query({
          sort: 'updated',
          order: 'desc',
          limit: 5,
          offset: 1,
        })
        .set({ Authorization: `Bearer ${accessToken}` })
        .expect(200)
        .expect((res) => {
          expect(res.body.total).toBe(4)
          expect(res.body.limit).toBe(5)
          expect(res.body.offset).toBe(1)
          expect(res.body.results).toHaveLength(3)
          expect(
            res.body.results.map(({ title }: { title: string }) => title),
          ).toEqual(['Charlie', 'Bravo', 'Alpha'])
        })
    })

    it('should return 404 when the requested user does not exist', async () => {
      const { accessToken } = await createDefaultUserAndAuthenticate(app)
      const missingUserId = uuidv4()

      return supertest(app.getHttpServer())
        .get(`/api/users/${missingUserId}/quizzes`)
        .set({ Authorization: `Bearer ${accessToken}` })
        .expect(404)
        .expect((res) => {
          expect(res.body).toEqual({
            message: `User '${missingUserId}' was not found`,
            status: 404,
            timestamp: expect.anything(),
          })
        })
    })

    it('should return 401 without an access token', async () => {
      const targetUser = await userModel.create(buildMockSecondaryUser())

      return supertest(app.getHttpServer())
        .get(`/api/users/${targetUser._id}/quizzes`)
        .expect(401)
        .expect((res) => {
          expect(res.body).toEqual({
            message: 'Missing Authorization header',
            status: 401,
            timestamp: expect.anything(),
          })
        })
    })

    it('should return 403 when the token lacks Authority.User', async () => {
      const { user: requester } = await createDefaultUserAndAuthenticate(app)
      const targetUser = await userModel.create(buildMockQuaternaryUser())
      const accessToken = await createUserTokenWithoutUserAuthority(
        requester._id,
      )

      return supertest(app.getHttpServer())
        .get(`/api/users/${targetUser._id}/quizzes`)
        .set({ Authorization: `Bearer ${accessToken}` })
        .expect(403)
        .expect((res) => {
          expect(res.body).toEqual({
            message: 'Insufficient authorities',
            status: 403,
            timestamp: expect.anything(),
          })
        })
    })
  })
})
