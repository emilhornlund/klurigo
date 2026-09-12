import { GameStatus } from '@klurigo/common'
import { INestApplication } from '@nestjs/common'
import { getModelToken } from '@nestjs/mongoose'
import supertest from 'supertest'
import { v4 as uuidv4 } from 'uuid'

import {
  buildMockPrimaryUser,
  buildMockQuizRating,
  buildMockSecondaryUser,
  buildMockTertiaryUser,
  createMockClassicQuiz,
  createMockGameDocument,
  createMockGameHostParticipantDocument,
  createMockGamePlayerParticipantDocument,
  createMockLobbyTaskDocument,
  createMockPodiumTaskDocument,
} from '../../../../test-utils/data'
import {
  cleanupTestApp,
  createBearerAuthHeader,
  createDefaultUserAndAuthenticate,
  createTestApp,
  expectErrorResponse,
} from '../../../../test-utils/utils'
import { Game, GameModel } from '../../game-core/repositories/models/schemas'
import {
  Quiz,
  QuizModel,
  QuizRating,
  QuizRatingModel,
  QuizRatingSummary,
} from '../../quiz-core/repositories/models/schemas'
import { User } from '../../user/repositories'

import { ProfileQuizRatingController } from './profile-quiz-rating.controller'

describe(`${ProfileQuizRatingController.name} (e2e)`, () => {
  let app: INestApplication
  let gameModel: GameModel
  let quizModel: QuizModel
  let quizRatingModel: QuizRatingModel

  beforeEach(async () => {
    app = await createTestApp()
    gameModel = app.get<GameModel>(getModelToken(Game.name))
    quizModel = app.get<QuizModel>(getModelToken(Quiz.name))
    quizRatingModel = app.get<QuizRatingModel>(getModelToken(QuizRating.name))
  })

  afterEach(async () => {
    await cleanupTestApp(app)
  })

  describe('/api/profile/quizzes/:quizId/ratings (PUT)', () => {
    let gameParticipantHostUserAccessToken: string
    let gameParticipantHostUser: User

    let gameParticipantPlayerUser: User
    let gameParticipantPlayerUserAccessToken: string

    let gameParticipantHostUserAndQuizOwnerAccessToken: string
    let gameParticipantQuizOwnerUser: User

    let quiz: Quiz

    const stars = 5
    const comment = 'Great quiz—good pacing and fun questions.'

    const defaultDate = new Date('2025-01-01T12:00:00.000Z')

    beforeEach(async () => {
      const primaryAuthenticatedUser = await createDefaultUserAndAuthenticate(
        app,
        buildMockPrimaryUser(),
      )
      gameParticipantHostUser = primaryAuthenticatedUser.user
      gameParticipantHostUserAccessToken = primaryAuthenticatedUser.accessToken

      const secondaryAuthenticatedUser = await createDefaultUserAndAuthenticate(
        app,
        buildMockSecondaryUser(),
      )
      gameParticipantPlayerUser = secondaryAuthenticatedUser.user
      gameParticipantPlayerUserAccessToken =
        secondaryAuthenticatedUser.accessToken

      const tertiaryAuthenticatedUser = await createDefaultUserAndAuthenticate(
        app,
        buildMockTertiaryUser(),
      )
      gameParticipantQuizOwnerUser = tertiaryAuthenticatedUser.user
      gameParticipantHostUserAndQuizOwnerAccessToken =
        tertiaryAuthenticatedUser.accessToken

      quiz = await quizModel.create(
        createMockClassicQuiz({
          owner: tertiaryAuthenticatedUser.user,
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
            updated: new Date(),
          },
        }),
      )

      await gameModel.create(
        createMockGameDocument({
          quiz,
          participants: [
            createMockGameHostParticipantDocument({
              participantId: primaryAuthenticatedUser.user._id,
            }),
            createMockGameHostParticipantDocument({
              participantId: tertiaryAuthenticatedUser.user._id,
            }),
            createMockGamePlayerParticipantDocument({
              participantId: secondaryAuthenticatedUser.user._id,
              nickname: gameParticipantPlayerUser.defaultNickname,
            }),
          ],
          status: GameStatus.Completed,
        }),
      )
    })

    it('should create a rating for an active game on the podium task', async () => {
      const activeQuiz = await quizModel.create(
        createMockClassicQuiz({
          _id: uuidv4(),
          owner: gameParticipantQuizOwnerUser,
        }),
      )
      const activeGame = await gameModel.create(
        createMockGameDocument({
          _id: uuidv4(),
          quiz: activeQuiz,
          status: GameStatus.Active,
          currentTask: createMockPodiumTaskDocument({ status: 'active' }),
          participants: [
            createMockGamePlayerParticipantDocument({
              participantId: gameParticipantPlayerUser._id,
              nickname: gameParticipantPlayerUser.defaultNickname,
            }),
          ],
        }),
      )

      await supertest(app.getHttpServer())
        .put(`/api/profile/quizzes/${activeQuiz._id}/ratings`)
        .set({
          ...createBearerAuthHeader(gameParticipantPlayerUserAccessToken),
        })
        .send({ stars, comment })
        .expect(200)
        .expect((res) => {
          expect(res.body).toMatchObject({
            quizId: activeQuiz._id,
            stars,
            comment,
          })
        })

      expect(activeGame.status).toBe(GameStatus.Active)
    })

    it('should reject an active game that has not reached the podium task', async () => {
      const activeQuiz = await quizModel.create(
        createMockClassicQuiz({
          _id: uuidv4(),
          owner: gameParticipantQuizOwnerUser,
        }),
      )
      const activeGame = await gameModel.create(
        createMockGameDocument({
          _id: uuidv4(),
          quiz: activeQuiz,
          status: GameStatus.Active,
          currentTask: createMockLobbyTaskDocument(),
          participants: [
            createMockGamePlayerParticipantDocument({
              participantId: gameParticipantPlayerUser._id,
              nickname: gameParticipantPlayerUser.defaultNickname,
            }),
          ],
        }),
      )

      await supertest(app.getHttpServer())
        .put(`/api/profile/quizzes/${activeQuiz._id}/ratings`)
        .set({
          ...createBearerAuthHeader(gameParticipantPlayerUserAccessToken),
        })
        .send({ stars, comment })
        .expect(403)

      expect(activeGame.status).toBe(GameStatus.Active)
      await expect(
        quizRatingModel.countDocuments({ quizId: activeQuiz._id }),
      ).resolves.toBe(0)
    })

    it('should create a rating when caller is a player participant', async () => {
      await supertest(app.getHttpServer())
        .put(`/api/profile/quizzes/${quiz._id}/ratings`)
        .set({
          ...createBearerAuthHeader(gameParticipantPlayerUserAccessToken),
        })
        .send({
          stars,
          comment,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual({
            id: expect.any(String),
            quizId: quiz._id,
            stars,
            comment,
            author: {
              id: gameParticipantPlayerUser._id,
              nickname: gameParticipantPlayerUser.defaultNickname,
            },
            createdAt: expect.any(String),
            updatedAt: expect.any(String),
          })
        })

      await assertQuizRatingSummary({
        count: 2,
        avg: 5,
        stars: {
          '1': 0,
          '2': 0,
          '3': 0,
          '4': 0,
          '5': 2,
        },
        commentCount: 2,
        updated: expect.anything(),
      })
    })

    it('should create a rating when caller is a host participant not quiz owner', async () => {
      await supertest(app.getHttpServer())
        .put(`/api/profile/quizzes/${quiz._id}/ratings`)
        .set({
          ...createBearerAuthHeader(gameParticipantHostUserAccessToken),
        })
        .send({
          stars,
          comment,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual({
            id: expect.any(String),
            quizId: quiz._id,
            stars,
            comment,
            author: {
              id: gameParticipantHostUser._id,
              nickname: gameParticipantHostUser.defaultNickname,
            },
            createdAt: expect.any(String),
            updatedAt: expect.any(String),
          })
        })

      await assertQuizRatingSummary({
        count: 2,
        avg: 5,
        stars: {
          '1': 0,
          '2': 0,
          '3': 0,
          '4': 0,
          '5': 2,
        },
        commentCount: 2,
        updated: expect.anything(),
      })
    })

    it('should create a rating without a comment when caller is a player participant', async () => {
      await supertest(app.getHttpServer())
        .put(`/api/profile/quizzes/${quiz._id}/ratings`)
        .set({
          ...createBearerAuthHeader(gameParticipantPlayerUserAccessToken),
        })
        .send({
          stars,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual({
            id: expect.any(String),
            quizId: quiz._id,
            stars,
            author: {
              id: gameParticipantPlayerUser._id,
              nickname: gameParticipantPlayerUser.defaultNickname,
            },
            createdAt: expect.any(String),
            updatedAt: expect.any(String),
          })
        })

      await assertQuizRatingSummary({
        count: 2,
        avg: 5,
        stars: {
          '1': 0,
          '2': 0,
          '3': 0,
          '4': 0,
          '5': 2,
        },
        commentCount: 1,
        updated: expect.anything(),
      })
    })

    it('should return 403 when caller is a host participant and quiz owner', async () => {
      await supertest(app.getHttpServer())
        .put(`/api/profile/quizzes/${quiz._id}/ratings`)
        .set({
          ...createBearerAuthHeader(
            gameParticipantHostUserAndQuizOwnerAccessToken,
          ),
        })
        .send({
          stars,
          comment,
        })
        .expect(403)
        .expect((res) =>
          expectErrorResponse(res, {
            message: 'Forbidden',
            status: 403,
          }),
        )

      await assertQuizRatingSummary({
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
        updated: expect.anything(),
      })
    })

    it('should update the existing rating when caller is the rating author', async () => {
      const quizRating = await quizRatingModel.create(
        buildMockQuizRating({
          quizId: quiz._id,
          author: gameParticipantPlayerUser,
          stars,
          comment,
          created: defaultDate,
          updated: defaultDate,
        }),
      )

      const updatedStars = 3
      const updatedComment = 'Solid, but a couple of questions were tricky.'

      await supertest(app.getHttpServer())
        .put(`/api/profile/quizzes/${quiz._id}/ratings`)
        .set({
          ...createBearerAuthHeader(gameParticipantPlayerUserAccessToken),
        })
        .send({
          stars: updatedStars,
          comment: updatedComment,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual({
            id: quizRating._id,
            quizId: quiz._id,
            stars: updatedStars,
            comment: updatedComment,
            author: {
              id: gameParticipantPlayerUser._id,
              nickname: gameParticipantPlayerUser.defaultNickname,
            },
            createdAt: defaultDate.toISOString(),
            updatedAt: expect.any(String),
          })
        })

      await assertQuizRatingSummary({
        count: 1,
        avg: 3,
        stars: {
          '1': 0,
          '2': 0,
          '3': 1,
          '4': 0,
          '5': 0,
        },
        commentCount: 1,
        updated: expect.anything(),
      })
    })

    it('should update the existing rating and clear the comment when comment is undefined', async () => {
      const quizRating = await quizRatingModel.create(
        buildMockQuizRating({
          quizId: quiz._id,
          author: gameParticipantPlayerUser,
          stars,
          comment,
          created: defaultDate,
          updated: defaultDate,
        }),
      )

      const updatedStars = 3

      await supertest(app.getHttpServer())
        .put(`/api/profile/quizzes/${quiz._id}/ratings`)
        .set({
          ...createBearerAuthHeader(gameParticipantPlayerUserAccessToken),
        })
        .send({
          stars: updatedStars,
          comment: undefined,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual({
            id: quizRating._id,
            quizId: quiz._id,
            stars: updatedStars,
            comment: undefined,
            author: {
              id: gameParticipantPlayerUser._id,
              nickname: gameParticipantPlayerUser.defaultNickname,
            },
            createdAt: defaultDate.toISOString(),
            updatedAt: expect.any(String),
          })
        })

      await assertQuizRatingSummary({
        count: 1,
        avg: 3,
        stars: {
          '1': 0,
          '2': 0,
          '3': 1,
          '4': 0,
          '5': 0,
        },
        commentCount: 0,
        updated: expect.anything(),
      })
    })

    it('should return 400 when payload validation fails', async () => {
      await supertest(app.getHttpServer())
        .put(`/api/profile/quizzes/${quiz._id}/ratings`)
        .set({
          ...createBearerAuthHeader(gameParticipantPlayerUserAccessToken),
        })
        .send({
          stars: 0,
          comment: '',
        })
        .expect(400)
        .expect((res) =>
          expectErrorResponse(res, {
            message: 'Validation failed',
            status: 400,
            validationErrors: [
              {
                constraints: {
                  min: 'stars must not be less than 1',
                },
                property: 'stars',
              },
              {
                constraints: {
                  matches: 'Comment must not be blank.',
                  minLength:
                    'comment must be longer than or equal to 1 characters',
                },
                property: 'comment',
              },
            ],
          }),
        )

      await assertQuizRatingSummary({
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
        updated: expect.anything(),
      })
    })

    it('should return 404 when quiz was not found', async () => {
      const quizId = uuidv4()

      await supertest(app.getHttpServer())
        .put(`/api/profile/quizzes/${quizId}/ratings`)
        .set({
          ...createBearerAuthHeader(gameParticipantPlayerUserAccessToken),
        })
        .send({ stars, comment })
        .expect(404)
        .expect((res) =>
          expectErrorResponse(res, {
            message: `Quiz was not found by id '${quizId}'`,
            status: 404,
          }),
        )

      await assertQuizRatingSummary({
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
        updated: expect.anything(),
      })
    })

    it('should return 401 when Authorization header is missing', async () => {
      await supertest(app.getHttpServer())
        .put(`/api/profile/quizzes/${quiz._id}/ratings`)
        .send({ stars, comment })
        .expect(401)
        .expect((res) =>
          expectErrorResponse(res, {
            message: 'Missing Authorization header',
            status: 401,
          }),
        )

      await assertQuizRatingSummary({
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
        updated: expect.anything(),
      })
    })

    it('should return 401 when bearer token is invalid', async () => {
      await supertest(app.getHttpServer())
        .put(`/api/profile/quizzes/${quiz._id}/ratings`)
        .send({ stars, comment })
        .set({ Authorization: 'Bearer XXX' })
        .expect(401)
        .expect((res) =>
          expectErrorResponse(res, {
            message: 'Invalid or expired token',
            status: 401,
          }),
        )

      await assertQuizRatingSummary({
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
      })
    })

    async function assertQuizRatingSummary(
      expected: Partial<QuizRatingSummary>,
    ): Promise<void> {
      const actual = await quizModel.findById(quiz._id).lean().exec()
      const summary = actual?.ratingSummary

      expect(summary).toBeDefined()

      // Shape check so we fail loudly if something is missing.
      expect(summary).toEqual(
        expect.objectContaining({
          count: expect.any(Number),
          avg: expect.any(Number),
          stars: {
            '1': expect.any(Number),
            '2': expect.any(Number),
            '3': expect.any(Number),
            '4': expect.any(Number),
            '5': expect.any(Number),
          },
          commentCount: expect.any(Number),
          updated: expect.anything(),
        }),
      )

      // Now validate only what the test claims to care about.
      expect(summary).toEqual(expect.objectContaining(expected))

      // If expected includes stars, validate those keys precisely (don’t allow partial star maps)
      if (expected.stars) {
        expect(summary?.stars).toEqual(expected.stars)
      }
    }
  })
})
