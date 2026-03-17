import {
  GameParticipantType,
  GameStatus,
  QuizRatingAuthorType,
} from '@klurigo/common'
import { INestApplication } from '@nestjs/common'
import { getModelToken } from '@nestjs/mongoose'
import supertest from 'supertest'
import { v4 as uuidv4 } from 'uuid'

import {
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
  authenticateGame,
  closeTestApp,
  createDefaultUserAndAuthenticate,
  createTestApp,
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

import { GameRatingController } from './game-rating.controller'

describe(`${GameRatingController.name} (e2e)`, () => {
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
    await closeTestApp(app)
  })

  describe('/api/games/:gameID/ratings (PUT)', () => {
    let quizOwnerUser: User
    let playerUser: User

    let anonymousParticipantId: string
    const anonymousNickname = 'QuizMaster'

    let quiz: Quiz
    let completedGame: Game

    const stars = 4
    const comment = 'Great quiz—really enjoyed it!'

    beforeEach(async () => {
      const quizOwnerAuthenticated = await createDefaultUserAndAuthenticate(
        app,
        buildMockTertiaryUser(),
      )
      quizOwnerUser = quizOwnerAuthenticated.user

      const playerAuthenticated = await createDefaultUserAndAuthenticate(
        app,
        buildMockSecondaryUser(),
      )
      playerUser = playerAuthenticated.user

      anonymousParticipantId = uuidv4()

      quiz = await quizModel.create(
        createMockClassicQuiz({
          owner: quizOwnerUser,
          ratingSummary: {
            count: 0,
            avg: 0,
            stars: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 },
            commentCount: 0,
            updated: new Date(),
          },
        }),
      )

      completedGame = await gameModel.create(
        createMockGameDocument({
          quiz,
          currentTask: createMockPodiumTaskDocument(),
          participants: [
            createMockGameHostParticipantDocument({
              participantId: quizOwnerUser._id,
            }),
            createMockGamePlayerParticipantDocument({
              participantId: playerUser._id,
              nickname: playerUser.defaultNickname,
            }),
            createMockGamePlayerParticipantDocument({
              participantId: anonymousParticipantId,
              nickname: anonymousNickname,
            }),
          ],
          status: GameStatus.Completed,
        }),
      )
    })

    it('should create a rating for a logged-in player participant', async () => {
      const playerToken = await authenticateGame(
        app,
        completedGame._id,
        playerUser._id,
        GameParticipantType.PLAYER,
      )

      await supertest(app.getHttpServer())
        .put(`/api/games/${completedGame._id}/ratings`)
        .set({ Authorization: `Bearer ${playerToken}` })
        .send({ stars, comment })
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual({
            id: expect.any(String),
            quizId: quiz._id,
            stars,
            comment,
            author: {
              id: playerUser._id,
              nickname: playerUser.defaultNickname,
            },
            createdAt: expect.any(String),
            updatedAt: expect.any(String),
          })
        })

      await assertQuizRatingSummary({
        count: 1,
        avg: stars,
        stars: { '1': 0, '2': 0, '3': 0, '4': 1, '5': 0 },
        commentCount: 1,
        updated: expect.anything(),
      })
    })

    it('should update an existing rating for a logged-in player participant', async () => {
      const playerToken = await authenticateGame(
        app,
        completedGame._id,
        playerUser._id,
        GameParticipantType.PLAYER,
      )

      await supertest(app.getHttpServer())
        .put(`/api/games/${completedGame._id}/ratings`)
        .set({ Authorization: `Bearer ${playerToken}` })
        .send({ stars: 3, comment: 'Okay quiz.' })
        .expect(200)

      await supertest(app.getHttpServer())
        .put(`/api/games/${completedGame._id}/ratings`)
        .set({ Authorization: `Bearer ${playerToken}` })
        .send({ stars: 5, comment: 'Actually fantastic!' })
        .expect(200)
        .expect((res) => {
          expect(res.body).toMatchObject({
            quizId: quiz._id,
            stars: 5,
            comment: 'Actually fantastic!',
            author: {
              id: playerUser._id,
              nickname: playerUser.defaultNickname,
            },
          })
        })

      const ratingCount = await quizRatingModel.countDocuments({
        quizId: quiz._id,
        'author.type': QuizRatingAuthorType.User,
        'author.user': playerUser._id,
      })
      expect(ratingCount).toBe(1)
    })

    it('should create a rating for an anonymous player participant', async () => {
      const anonymousToken = await authenticateGame(
        app,
        completedGame._id,
        anonymousParticipantId,
        GameParticipantType.PLAYER,
      )

      await supertest(app.getHttpServer())
        .put(`/api/games/${completedGame._id}/ratings`)
        .set({ Authorization: `Bearer ${anonymousToken}` })
        .send({ stars, comment })
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual({
            id: expect.any(String),
            quizId: quiz._id,
            stars,
            comment,
            author: {
              id: anonymousParticipantId,
              nickname: anonymousNickname,
            },
            createdAt: expect.any(String),
            updatedAt: expect.any(String),
          })
        })

      await assertQuizRatingSummary({
        count: 1,
        avg: stars,
        stars: { '1': 0, '2': 0, '3': 0, '4': 1, '5': 0 },
        commentCount: 1,
        updated: expect.anything(),
      })
    })

    it('should update an existing rating for an anonymous player participant', async () => {
      const anonymousToken = await authenticateGame(
        app,
        completedGame._id,
        anonymousParticipantId,
        GameParticipantType.PLAYER,
      )

      await supertest(app.getHttpServer())
        .put(`/api/games/${completedGame._id}/ratings`)
        .set({ Authorization: `Bearer ${anonymousToken}` })
        .send({ stars: 2, comment: 'Not for me.' })
        .expect(200)

      await supertest(app.getHttpServer())
        .put(`/api/games/${completedGame._id}/ratings`)
        .set({ Authorization: `Bearer ${anonymousToken}` })
        .send({ stars: 4 })
        .expect(200)
        .expect((res) => {
          expect(res.body).toMatchObject({
            quizId: quiz._id,
            stars: 4,
            author: { id: anonymousParticipantId, nickname: anonymousNickname },
          })
        })

      const ratingCount = await quizRatingModel.countDocuments({
        quizId: quiz._id,
        'author.type': QuizRatingAuthorType.Anonymous,
        'author.participantId': anonymousParticipantId,
      })
      expect(ratingCount).toBe(1)
    })

    it('should return 403 when the logged-in player is the quiz owner', async () => {
      const ownerToken = await authenticateGame(
        app,
        completedGame._id,
        quizOwnerUser._id,
        GameParticipantType.PLAYER,
      )

      await supertest(app.getHttpServer())
        .put(`/api/games/${completedGame._id}/ratings`)
        .set({ Authorization: `Bearer ${ownerToken}` })
        .send({ stars, comment })
        .expect(403)
    })

    it('should return 403 when the caller is a host participant', async () => {
      const hostToken = await authenticateGame(
        app,
        completedGame._id,
        quizOwnerUser._id,
        GameParticipantType.HOST,
      )

      await supertest(app.getHttpServer())
        .put(`/api/games/${completedGame._id}/ratings`)
        .set({ Authorization: `Bearer ${hostToken}` })
        .send({ stars, comment })
        .expect(403)
    })

    it('should return 403 when the game token gameId does not match the route gameID', async () => {
      const playerToken = await authenticateGame(
        app,
        uuidv4(),
        playerUser._id,
        GameParticipantType.PLAYER,
      )

      await supertest(app.getHttpServer())
        .put(`/api/games/${completedGame._id}/ratings`)
        .set({ Authorization: `Bearer ${playerToken}` })
        .send({ stars, comment })
        .expect(403)
    })

    it('should return 403 when the current task is not podium', async () => {
      const playerToken = await authenticateGame(
        app,
        completedGame._id,
        playerUser._id,
        GameParticipantType.PLAYER,
      )

      await gameModel
        .findByIdAndUpdate(completedGame._id, {
          currentTask: createMockLobbyTaskDocument(),
        })
        .exec()

      await supertest(app.getHttpServer())
        .put(`/api/games/${completedGame._id}/ratings`)
        .set({ Authorization: `Bearer ${playerToken}` })
        .send({ stars, comment })
        .expect(403)
        .expect((res) => {
          expect(res.body).toEqual({
            message:
              'Ratings can only be created or updated during the podium task.',
            status: 403,
            timestamp: expect.anything(),
          })
        })

      const ratingCount = await quizRatingModel.countDocuments({
        quizId: quiz._id,
      })
      expect(ratingCount).toBe(0)
    })

    it('should return 400 when payload validation fails', async () => {
      const playerToken = await authenticateGame(
        app,
        completedGame._id,
        playerUser._id,
        GameParticipantType.PLAYER,
      )

      await supertest(app.getHttpServer())
        .put(`/api/games/${completedGame._id}/ratings`)
        .set({ Authorization: `Bearer ${playerToken}` })
        .send({ stars: 0, comment: '' })
        .expect(400)
        .expect((res) => {
          expect(res.body).toEqual({
            message: 'Validation failed',
            status: 400,
            timestamp: expect.any(String),
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
          })
        })
    })

    it('should return 401 when Authorization header is missing', async () => {
      await supertest(app.getHttpServer())
        .put(`/api/games/${completedGame._id}/ratings`)
        .send({ stars, comment })
        .expect(401)
        .expect((res) => {
          expect(res.body).toEqual({
            message: 'Missing Authorization header',
            status: 401,
            timestamp: expect.any(String),
          })
        })
    })

    it('should return 401 when bearer token is invalid', async () => {
      await supertest(app.getHttpServer())
        .put(`/api/games/${completedGame._id}/ratings`)
        .send({ stars, comment })
        .set({ Authorization: 'Bearer INVALID_TOKEN' })
        .expect(401)
        .expect((res) => {
          expect(res.body).toEqual({
            message: 'Invalid or expired token',
            status: 401,
            timestamp: expect.any(String),
          })
        })
    })

    it('should return 404 when the game does not exist', async () => {
      const nonExistentGameId = uuidv4()
      const playerToken = await authenticateGame(
        app,
        nonExistentGameId,
        playerUser._id,
        GameParticipantType.PLAYER,
      )

      await supertest(app.getHttpServer())
        .put(`/api/games/${nonExistentGameId}/ratings`)
        .set({ Authorization: `Bearer ${playerToken}` })
        .send({ stars, comment })
        .expect(404)
    })

    async function assertQuizRatingSummary(
      expected: Partial<QuizRatingSummary>,
    ): Promise<void> {
      const actual = await quizModel.findById(quiz._id).lean().exec()
      const summary = actual?.ratingSummary

      expect(summary).toBeDefined()

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

      expect(summary).toEqual(expect.objectContaining(expected))

      if (expected.stars) {
        expect(summary?.stars).toEqual(expected.stars)
      }
    }
  })
})
