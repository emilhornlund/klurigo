import {
  GAME_MAX_PLAYERS,
  GameParticipantType,
  GameStatus,
  QuestionType,
} from '@klurigo/common'
import { INestApplication } from '@nestjs/common'
import { getModelToken } from '@nestjs/mongoose'
import supertest from 'supertest'
import { v4 as uuidv4 } from 'uuid'

import {
  buildMockPrimaryUser,
  buildMockQuaternaryUser,
  buildMockSecondaryUser,
  buildMockTertiaryUser,
  createMockClassicQuizRequestDto,
  createMockGameDocument,
  createMockGameHostParticipantDocument,
  createMockGamePlayerParticipantDocument,
  createMockLeaderboardTaskItem,
  createMockLobbyTaskDocument,
  createMockMultiChoiceQuestionDocument,
  createMockPodiumTaskDocument,
  createMockQuestionResultTaskDocument,
  createMockQuestionTaskDocument,
  createMockRangeQuestionDocument,
  createMockTrueFalseQuestionDocument,
  createMockTypeAnswerQuestionDocument,
  MOCK_DEFAULT_PLAYER_NICKNAME,
  MOCK_TERTIARY_USER_DEFAULT_NICKNAME,
  MOCK_TYPE_ANSWER_OPTION_VALUE,
  MOCK_TYPE_ANSWER_OPTION_VALUE_ALTERNATIVE,
  offsetSeconds,
} from '../../../../test-utils/data'
import {
  authenticateGame,
  closeTestApp,
  createTestApp,
} from '../../../../test-utils/utils'
import {
  Game,
  GameModel,
  ParticipantPlayerWithBase,
  QuestionResultTaskItem,
  QuestionResultTaskWithBase,
  QuestionTaskBaseAnswer,
  QuestionTaskMultiChoiceAnswer,
  QuestionTaskPinAnswer,
  QuestionTaskPuzzleAnswer,
  QuestionTaskRangeAnswer,
  QuestionTaskTrueFalseAnswer,
  QuestionTaskTypeAnswerAnswer,
  TaskType,
} from '../../game-core/repositories/models/schemas'
import { QuizService } from '../../quiz-api/services'
import { User, UserModel } from '../../user/repositories'
import { GameService } from '../services'

describe('GameController (e2e)', () => {
  let app: INestApplication
  let gameService: GameService
  let gameModel: GameModel
  let userModel: UserModel
  let quizService: QuizService

  let hostUser: User
  let playerUser: User

  beforeEach(async () => {
    app = await createTestApp()
    gameService = app.get(GameService)
    gameModel = app.get<GameModel>(getModelToken(Game.name))
    userModel = app.get<UserModel>(getModelToken(User.name))
    quizService = app.get(QuizService)

    hostUser = await userModel.create(buildMockPrimaryUser())
    playerUser = await userModel.create(buildMockSecondaryUser())
  })

  afterEach(async () => {
    await closeTestApp(app)
  })

  describe('/api/games/:gameID/players (POST)', () => {
    it('should succeed in joining an existing active classic mode game', async () => {
      const { id: quizId } = await quizService.createQuiz(
        createMockClassicQuizRequestDto(),
        hostUser,
      )

      const { id: gameId } = await gameService.createGame(quizId, hostUser)

      const accessToken = await authenticateGame(
        app,
        gameId,
        playerUser._id,
        GameParticipantType.PLAYER,
      )

      return supertest(app.getHttpServer())
        .post(`/api/games/${gameId}/players`)
        .set({ Authorization: `Bearer ${accessToken}` })
        .send({ nickname: MOCK_DEFAULT_PLAYER_NICKNAME })
        .expect(204)
        .expect((res) => {
          expect(res.body).toEqual({})
        })
    })

    it('should succeed in joining an existing active classic mode game when not on question task', async () => {
      const { id: quizId } = await quizService.createQuiz(
        createMockClassicQuizRequestDto(),
        hostUser,
      )

      const { id: gameId } = await gameService.createGame(quizId, hostUser)

      await gameModel
        .findByIdAndUpdate(gameId, {
          currentTask: createMockQuestionTaskDocument(),
        })
        .exec()

      const accessToken = await authenticateGame(
        app,
        gameId,
        playerUser._id,
        GameParticipantType.PLAYER,
      )

      await supertest(app.getHttpServer())
        .post(`/api/games/${gameId}/players`)
        .set({ Authorization: `Bearer ${accessToken}` })
        .send({ nickname: MOCK_DEFAULT_PLAYER_NICKNAME })
        .expect(204)
        .expect((res) => {
          expect(res.body).toEqual({})
        })

      const updatedDocument = await gameModel.findById(gameId)
      expect(updatedDocument).toBeDefined()
      expect(updatedDocument!.participants).toHaveLength(2)
    })

    it('should fail in joining when a player has already joined', async () => {
      const { id: quizId } = await quizService.createQuiz(
        createMockClassicQuizRequestDto(),
        hostUser,
      )

      const { id: gameId } = await gameService.createGame(quizId, hostUser)

      await gameModel
        .findByIdAndUpdate(gameId, {
          participants: [
            {
              type: GameParticipantType.PLAYER,
              participantId: playerUser._id,
              nickname: playerUser.defaultNickname,
              totalScore: 0,
              currentStreak: 0,
              created: new Date(),
              updated: new Date(),
            },
          ],
        })
        .exec()

      const accessToken = await authenticateGame(
        app,
        gameId,
        playerUser._id,
        GameParticipantType.PLAYER,
      )

      return supertest(app.getHttpServer())
        .post(`/api/games/${gameId}/players`)
        .set({ Authorization: `Bearer ${accessToken}` })
        .send({ nickname: MOCK_DEFAULT_PLAYER_NICKNAME })
        .expect(409)
        .expect((res) => {
          expect(res.body).toEqual({
            message: 'Player has already joined this game',
            status: 409,
            timestamp: expect.anything(),
          })
        })
    })

    it('should fail in joining when nickname already taken', async () => {
      const { id: quizId } = await quizService.createQuiz(
        createMockClassicQuizRequestDto(),
        hostUser,
      )

      const { id: gameId } = await gameService.createGame(quizId, hostUser)

      await gameModel
        .findByIdAndUpdate(gameId, {
          participants: [
            {
              type: GameParticipantType.PLAYER,
              participantId: uuidv4(),
              nickname: MOCK_DEFAULT_PLAYER_NICKNAME,
              totalScore: 0,
              currentStreak: 0,
              created: new Date(),
              updated: new Date(),
            },
          ],
        })
        .exec()

      const accessToken = await authenticateGame(
        app,
        gameId,
        playerUser._id,
        GameParticipantType.PLAYER,
      )

      return supertest(app.getHttpServer())
        .post(`/api/games/${gameId}/players`)
        .set({ Authorization: `Bearer ${accessToken}` })
        .send({ nickname: MOCK_DEFAULT_PLAYER_NICKNAME })
        .expect(409)
        .expect((res) => {
          expect(res.body).toHaveProperty(
            'message',
            'Nickname "FrostyBear" is already taken in this game',
          )
          expect(res.body).toHaveProperty('status', 409)
          expect(res.body).toHaveProperty('timestamp')
        })
    })

    it('should fail in joining an expired game', async () => {
      const { id: quizId } = await quizService.createQuiz(
        createMockClassicQuizRequestDto(),
        hostUser,
      )

      const { id: gameId } = await gameService.createGame(quizId, hostUser)

      await gameModel
        .findByIdAndUpdate(gameId, { status: GameStatus.Expired })
        .exec()

      const accessToken = await authenticateGame(
        app,
        gameId,
        playerUser._id,
        GameParticipantType.PLAYER,
      )

      return supertest(app.getHttpServer())
        .post(`/api/games/${gameId}/players`)
        .set({ Authorization: `Bearer ${accessToken}` })
        .send({ nickname: MOCK_DEFAULT_PLAYER_NICKNAME })
        .expect(404)
        .expect((res) => {
          expect(res.body).toHaveProperty(
            'message',
            `Active game not found by id ${gameId}`,
          )
          expect(res.body).toHaveProperty('status', 404)
          expect(res.body).toHaveProperty('timestamp')
        })
    })

    it('should fail in joining with a non existing game ID', async () => {
      const gameId = uuidv4()

      const accessToken = await authenticateGame(
        app,
        gameId,
        playerUser._id,
        GameParticipantType.PLAYER,
      )

      return supertest(app.getHttpServer())
        .post(`/api/games/${gameId}/players`)
        .set({ Authorization: `Bearer ${accessToken}` })
        .send({ nickname: MOCK_DEFAULT_PLAYER_NICKNAME })
        .expect(404)
        .expect((res) => {
          expect(res.body).toHaveProperty(
            'message',
            `Active game not found by id ${gameId}`,
          )
          expect(res.body).toHaveProperty('status', 404)
          expect(res.body).toHaveProperty('timestamp')
        })
    })

    it('should fail in joining with an invalid game ID', async () => {
      const gameId = 'invalid-uuid'

      const accessToken = await authenticateGame(
        app,
        gameId,
        playerUser._id,
        GameParticipantType.PLAYER,
      )

      return supertest(app.getHttpServer())
        .post(`/api/games/${gameId}/players`)
        .set({ Authorization: `Bearer ${accessToken}` })
        .send({ nickname: MOCK_DEFAULT_PLAYER_NICKNAME })
        .expect(400)
        .expect((res) => {
          expect(res.body).toHaveProperty(
            'message',
            'Validation failed (uuid is expected)',
          )
          expect(res.body).toHaveProperty('status', 400)
          expect(res.body).toHaveProperty('timestamp')
        })
    })

    it('should succeed in joining when game is almost full (maximum players reached)', async () => {
      const participants: ParticipantPlayerWithBase[] = []
      for (let i = 0; i < GAME_MAX_PLAYERS - 1; i++) {
        participants.push(
          createMockGamePlayerParticipantDocument({
            participantId: uuidv4(),
            nickname: `player${i}`,
          }),
        )
      }

      const game = await gameModel.create(
        createMockGameDocument({
          participants: [
            createMockGameHostParticipantDocument(),
            ...participants,
          ],
        }),
      )

      const accessToken = await authenticateGame(
        app,
        game._id,
        playerUser._id,
        GameParticipantType.PLAYER,
      )

      return supertest(app.getHttpServer())
        .post(`/api/games/${game._id}/players`)
        .set({ Authorization: `Bearer ${accessToken}` })
        .send({ nickname: MOCK_DEFAULT_PLAYER_NICKNAME })
        .expect(204)
        .expect((res) => {
          expect(res.body).toEqual({})
        })
    })

    it('should fail in joining when game is full (maximum players reached)', async () => {
      const participants: ParticipantPlayerWithBase[] = []
      for (let i = 0; i < GAME_MAX_PLAYERS; i++) {
        participants.push(
          createMockGamePlayerParticipantDocument({
            participantId: uuidv4(),
            nickname: `player${i}`,
          }),
        )
      }

      const game = await gameModel.create(
        createMockGameDocument({
          participants: [
            createMockGameHostParticipantDocument(),
            ...participants,
          ],
        }),
      )

      const accessToken = await authenticateGame(
        app,
        game._id,
        playerUser._id,
        GameParticipantType.PLAYER,
      )

      return supertest(app.getHttpServer())
        .post(`/api/games/${game._id}/players`)
        .set({ Authorization: `Bearer ${accessToken}` })
        .send({ nickname: MOCK_DEFAULT_PLAYER_NICKNAME })
        .expect(403)
        .expect((res) => {
          expect(res.body).toEqual({
            message: 'Game is full',
            status: 403,
            timestamp: expect.anything(),
          })
        })
    })
  })

  describe('/api/games/:gameID/players (GET)', () => {
    it('should return 200 ok when retrieving players as a host participant', async () => {
      const hostParticipantId = uuidv4()

      const player1Id = uuidv4()
      const player2Id = uuidv4()

      const player1Nickname = 'FrostyBear'
      const player2Nickname = 'WhiskerFox'

      const game = await gameModel.create(
        createMockGameDocument({
          participants: [
            createMockGameHostParticipantDocument({
              participantId: hostParticipantId,
            }),
            createMockGamePlayerParticipantDocument({
              participantId: player1Id,
              nickname: player1Nickname,
            }),
            createMockGamePlayerParticipantDocument({
              participantId: player2Id,
              nickname: player2Nickname,
            }),
          ],
          currentTask: createMockQuestionResultTaskDocument(),
          status: GameStatus.Active,
        }),
      )

      const accessToken = await authenticateGame(
        app,
        game._id,
        hostParticipantId,
        GameParticipantType.HOST,
      )

      return supertest(app.getHttpServer())
        .get(`/api/games/${game._id}/players`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual([
            {
              id: player1Id,
              nickname: player1Nickname,
            },
            {
              id: player2Id,
              nickname: player2Nickname,
            },
          ])
        })
    })

    it('should return 403 when retrieving players as a host participant for another game', async () => {
      const hostParticipantId = uuidv4()

      const game = await gameModel.create(
        createMockGameDocument({
          participants: [
            createMockGameHostParticipantDocument({
              participantId: hostParticipantId,
            }),
            createMockGamePlayerParticipantDocument(),
          ],
        }),
      )

      const accessToken = await authenticateGame(
        app,
        uuidv4(),
        hostParticipantId,
        GameParticipantType.HOST,
      )

      return supertest(app.getHttpServer())
        .get(`/api/games/${game._id}/players`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(403)
        .expect((res) => {
          expect(res.body).toEqual({
            message: 'Forbidden',
            status: 403,
            timestamp: expect.anything(),
          })
        })
    })

    it('should return 403 when retrieving players as a player participant', async () => {
      const playerId = uuidv4()

      const game = await gameModel.create(
        createMockGameDocument({
          participants: [
            createMockGameHostParticipantDocument(),
            createMockGamePlayerParticipantDocument({
              participantId: playerId,
            }),
          ],
        }),
      )

      const accessToken = await authenticateGame(
        app,
        game._id,
        playerId,
        GameParticipantType.PLAYER,
      )

      return supertest(app.getHttpServer())
        .get(`/api/games/${game._id}/players`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(403)
        .expect((res) => {
          expect(res.body).toEqual({
            message: 'Forbidden',
            status: 403,
            timestamp: expect.anything(),
          })
        })
    })

    it('should return 404 when retrieving players for a non-existing game', async () => {
      const gameId = uuidv4()

      const accessToken = await authenticateGame(
        app,
        gameId,
        hostUser._id,
        GameParticipantType.HOST,
      )

      return supertest(app.getHttpServer())
        .get(`/api/games/${gameId}/players`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404)
        .expect((res) => {
          expect(res.body).toEqual({
            message: `Game not found by id '${gameId}'`,
            status: 404,
            timestamp: expect.anything(),
          })
        })
    })
  })

  describe('/api/games/:gameID/players (DELETE)', () => {
    it('should allow a player to leave a game they are part of', async () => {
      const { id: quizId } = await quizService.createQuiz(
        createMockClassicQuizRequestDto(),
        hostUser,
      )

      const { id: gameId } = await gameService.createGame(quizId, hostUser)

      await gameModel
        .findByIdAndUpdate(gameId, {
          participants: [
            {
              type: GameParticipantType.HOST,
              participantId: hostUser._id,
              created: new Date(),
              updated: new Date(),
            },
            {
              type: GameParticipantType.PLAYER,
              participantId: playerUser._id,
              nickname: playerUser.defaultNickname,
              totalScore: 0,
              currentStreak: 0,
              created: new Date(),
              updated: new Date(),
            },
          ],
        })
        .exec()

      const accessToken = await authenticateGame(
        app,
        gameId,
        playerUser._id,
        GameParticipantType.PLAYER,
      )

      return supertest(app.getHttpServer())
        .delete(`/api/games/${gameId}/players/${playerUser._id}`)
        .set({ Authorization: `Bearer ${accessToken}` })
        .expect(204)
        .expect((res) => {
          expect(res.body).toEqual({})
        })
    })

    it('should allow the host to remove a player from the game', async () => {
      const { id: quizId } = await quizService.createQuiz(
        createMockClassicQuizRequestDto(),
        hostUser,
      )

      const { id: gameId } = await gameService.createGame(quizId, hostUser)

      await gameModel
        .findByIdAndUpdate(gameId, {
          participants: [
            {
              type: GameParticipantType.HOST,
              participantId: hostUser._id,
              created: new Date(),
              updated: new Date(),
            },
            {
              type: GameParticipantType.PLAYER,
              participantId: playerUser._id,
              nickname: playerUser.defaultNickname,
              totalScore: 0,
              currentStreak: 0,
              created: new Date(),
              updated: new Date(),
            },
          ],
        })
        .exec()

      const accessToken = await authenticateGame(
        app,
        gameId,
        hostUser._id,
        GameParticipantType.HOST,
      )

      return supertest(app.getHttpServer())
        .delete(`/api/games/${gameId}/players/${playerUser._id}`)
        .set({ Authorization: `Bearer ${accessToken}` })
        .expect(204)
        .expect((res) => {
          expect(res.body).toEqual({})
        })
    })

    it('should fail when attempting to remove a player who does not exist', async () => {
      const { id: quizId } = await quizService.createQuiz(
        createMockClassicQuizRequestDto(),
        hostUser,
      )

      const { id: gameId } = await gameService.createGame(quizId, hostUser)

      await gameModel
        .findByIdAndUpdate(gameId, {
          participants: [
            {
              type: GameParticipantType.HOST,
              participantId: hostUser._id,
              created: new Date(),
              updated: new Date(),
            },
          ],
        })
        .exec()

      const accessToken = await authenticateGame(
        app,
        gameId,
        hostUser._id,
        GameParticipantType.HOST,
      )

      return supertest(app.getHttpServer())
        .delete(`/api/games/${gameId}/players/${playerUser._id}`)
        .set({ Authorization: `Bearer ${accessToken}` })
        .expect(404)
        .expect((res) => {
          expect(res.body).toEqual({
            message: `Player not found by id ${playerUser._id}`,
            status: 404,
            timestamp: expect.anything(),
          })
        })
    })

    it('should prevent a player from removing another player from the game', async () => {
      const { id: quizId } = await quizService.createQuiz(
        createMockClassicQuizRequestDto(),
        hostUser,
      )

      const { id: gameId } = await gameService.createGame(quizId, hostUser)

      const secondPlayerId = uuidv4()

      await gameModel
        .findByIdAndUpdate(gameId, {
          participants: [
            {
              type: GameParticipantType.HOST,
              participantId: hostUser._id,
              created: new Date(),
              updated: new Date(),
            },
            {
              type: GameParticipantType.PLAYER,
              participantId: playerUser._id,
              nickname: playerUser.defaultNickname,
              totalScore: 0,
              currentStreak: 0,
              created: new Date(),
              updated: new Date(),
            },
            {
              type: GameParticipantType.PLAYER,
              participantId: secondPlayerId,
              nickname: MOCK_TERTIARY_USER_DEFAULT_NICKNAME,
              totalScore: 0,
              currentStreak: 0,
              created: new Date(),
              updated: new Date(),
            },
          ],
        })
        .exec()

      const accessToken = await authenticateGame(
        app,
        gameId,
        playerUser._id,
        GameParticipantType.PLAYER,
      )

      return supertest(app.getHttpServer())
        .delete(`/api/games/${gameId}/players/${secondPlayerId}`)
        .set({ Authorization: `Bearer ${accessToken}` })
        .expect(403)
        .expect((res) => {
          expect(res.body).toEqual({
            message: 'Forbidden to remove player',
            status: 403,
            timestamp: expect.anything(),
          })
        })
    })

    it('should prevent a host from removing themselves from the game', async () => {
      const { id: quizId } = await quizService.createQuiz(
        createMockClassicQuizRequestDto(),
        hostUser,
      )

      const { id: gameId } = await gameService.createGame(quizId, hostUser)

      await gameModel
        .findByIdAndUpdate(gameId, {
          participants: [
            {
              type: GameParticipantType.HOST,
              participantId: hostUser._id,
              created: new Date(),
              updated: new Date(),
            },
          ],
        })
        .exec()

      const accessToken = await authenticateGame(
        app,
        gameId,
        hostUser._id,
        GameParticipantType.HOST,
      )

      return supertest(app.getHttpServer())
        .delete(`/api/games/${gameId}/players/${hostUser._id}`)
        .set({ Authorization: `Bearer ${accessToken}` })
        .expect(403)
        .expect((res) => {
          expect(res.body).toEqual({
            message: 'Forbidden to remove player',
            status: 403,
            timestamp: expect.anything(),
          })
        })
    })
  })

  describe('/api/games/:gameID/events (GET)', () => {
    it('should allow event subscription after game creation with a valid token', async () => {
      const { id: quizId } = await quizService.createQuiz(
        createMockClassicQuizRequestDto(),
        hostUser,
      )

      const { id: gameId } = await gameService.createGame(quizId, hostUser)

      const accessToken = await authenticateGame(
        app,
        gameId,
        hostUser._id,
        GameParticipantType.HOST,
      )

      const response = supertest(app.getHttpServer())
        .get(`/api/games/${gameId}/events`)
        .set({ Authorization: `Bearer ${accessToken}` })
        .expect(200)
        .expect('Content-Type', /text\/event-stream/)

      await new Promise<void>((resolve) => {
        response.abort()
        resolve()
      })
    })

    it('should allow event subscription for a player who joined the game', async () => {
      const { id: quizId } = await quizService.createQuiz(
        createMockClassicQuizRequestDto(),
        hostUser,
      )

      const { id: gameId } = await gameService.createGame(quizId, hostUser)

      await gameService.joinGame(
        gameId,
        playerUser._id,
        MOCK_DEFAULT_PLAYER_NICKNAME,
      )

      const accessToken = await authenticateGame(
        app,
        gameId,
        playerUser._id,
        GameParticipantType.PLAYER,
      )

      const response = supertest(app.getHttpServer())
        .get(`/api/games/${gameId}/events`)
        .set({ Authorization: `Bearer ${accessToken}` })
        .expect(200)
        .expect('Content-Type', /text\/event-stream/)

      await new Promise<void>((resolve) => {
        response.abort()
        resolve()
      })
    })

    it('should deny event subscription without an authorization token', async () => {
      const { id: quizId } = await quizService.createQuiz(
        createMockClassicQuizRequestDto(),
        hostUser,
      )

      const { id: gameId } = await gameService.createGame(quizId, hostUser)

      return supertest(app.getHttpServer())
        .get(`/api/games/${gameId}/events`)
        .expect(401)
        .expect((res) => {
          expect(res.body).toHaveProperty(
            'message',
            'Missing Authorization header',
          )
          expect(res.body).toHaveProperty('status', 401)
          expect(res.body).toHaveProperty('timestamp')
        })
    })

    it('should return 404 when subscribing to events for a non-existent game ID', async () => {
      const unknownGameID = uuidv4()

      const accessToken = await authenticateGame(
        app,
        unknownGameID,
        hostUser._id,
        GameParticipantType.HOST,
      )

      return supertest(app.getHttpServer())
        .get(`/api/games/${unknownGameID}/events`)
        .set({ Authorization: `Bearer ${accessToken}` })
        .expect(404)
        .expect((res) => {
          expect(res.body).toHaveProperty(
            'message',
            `Game not found by id '${unknownGameID}'`,
          )
          expect(res.body).toHaveProperty('status', 404)
          expect(res.body).toHaveProperty('timestamp')
        })
    })

    it('should return Forbidden when subscribing to events with a token for a different game', async () => {
      const { id: quizId } = await quizService.createQuiz(
        createMockClassicQuizRequestDto(),
        hostUser,
      )

      const { id: gameId } = await gameService.createGame(quizId, hostUser)

      const { id: quizIdSecond } = await quizService.createQuiz(
        createMockClassicQuizRequestDto(),
        hostUser,
      )

      const { id: anotherGameId } = await gameService.createGame(
        quizIdSecond,
        playerUser,
      )

      const accessToken = await authenticateGame(
        app,
        anotherGameId,
        playerUser._id,
        GameParticipantType.PLAYER,
      )

      return supertest(app.getHttpServer())
        .get(`/api/games/${gameId}/events`)
        .set({ Authorization: `Bearer ${accessToken}` })
        .expect(403)
        .expect((res) => {
          expect(res.body).toHaveProperty('message', 'Forbidden')
          expect(res.body).toHaveProperty('status', 403)
          expect(res.body).toHaveProperty('timestamp')
        })
    })
  })

  describe('/api/games/:gameID/tasks/current/complete (POST)', () => {
    it('should succeed in completing the current task', async () => {
      const { id: quizId } = await quizService.createQuiz(
        createMockClassicQuizRequestDto(),
        hostUser,
      )

      const { id: gameId } = await gameService.createGame(quizId, hostUser)

      await gameModel
        .findByIdAndUpdate(gameId, { 'currentTask.status': 'active' })
        .exec()

      const accessToken = await authenticateGame(
        app,
        gameId,
        hostUser._id,
        GameParticipantType.HOST,
      )

      return supertest(app.getHttpServer())
        .post(`/api/games/${gameId}/tasks/current/complete`)
        .set({ Authorization: `Bearer ${accessToken}` })
        .expect(204)
        .expect((res) => {
          expect(res.body).toStrictEqual({})
        })
    })

    it('should succeed in completing the current podium task with players', async () => {
      const { id: quizId } = await quizService.createQuiz(
        createMockClassicQuizRequestDto(),
        hostUser,
      )

      const { id: gameId } = await gameService.createGame(quizId, hostUser)

      await gameModel
        .findByIdAndUpdate(gameId, {
          currentTask: createMockPodiumTaskDocument({
            status: 'active',
            leaderboard: [
              createMockLeaderboardTaskItem({ playerId: playerUser._id }),
            ],
          }),
          participants: [
            createMockGameHostParticipantDocument({
              participantId: hostUser._id,
            }),
            createMockGamePlayerParticipantDocument({
              participantId: playerUser._id,
              nickname: playerUser.defaultNickname,
            }),
          ],
        })
        .exec()

      const accessToken = await authenticateGame(
        app,
        gameId,
        hostUser._id,
        GameParticipantType.HOST,
      )

      await supertest(app.getHttpServer())
        .post(`/api/games/${gameId}/tasks/current/complete`)
        .set({ Authorization: `Bearer ${accessToken}` })
        .expect(204)
        .expect((res) => {
          expect(res.body).toStrictEqual({})
        })

      const actual = await gameModel.findById(gameId)
      expect(actual).toBeDefined()
      expect(actual!.currentTask.type).toEqual(TaskType.Podium)
      expect(actual!.status).toEqual(GameStatus.Completed)
    })

    it('should succeed in completing the current podium task without players', async () => {
      const { id: quizId } = await quizService.createQuiz(
        createMockClassicQuizRequestDto(),
        hostUser,
      )

      const { id: gameId } = await gameService.createGame(quizId, hostUser)

      await gameModel
        .findByIdAndUpdate(gameId, {
          currentTask: createMockPodiumTaskDocument({ status: 'active' }),
        })
        .exec()

      const accessToken = await authenticateGame(
        app,
        gameId,
        hostUser._id,
        GameParticipantType.HOST,
      )

      await supertest(app.getHttpServer())
        .post(`/api/games/${gameId}/tasks/current/complete`)
        .set({ Authorization: `Bearer ${accessToken}` })
        .expect(204)
        .expect((res) => {
          expect(res.body).toStrictEqual({})
        })

      const actual = await gameModel.findById(gameId)
      expect(actual).toBeDefined()
      expect(actual!.currentTask.type).toEqual(TaskType.Podium)
      expect(actual!.status).toEqual(GameStatus.Completed)
    })

    it('should fail in completing the current task if its current status is pending', async () => {
      const { id: quizId } = await quizService.createQuiz(
        createMockClassicQuizRequestDto(),
        hostUser,
      )

      const { id: gameId } = await gameService.createGame(quizId, hostUser)

      await gameModel
        .findByIdAndUpdate(gameId, { 'currentTask.status': 'pending' })
        .exec()

      const accessToken = await authenticateGame(
        app,
        gameId,
        hostUser._id,
        GameParticipantType.HOST,
      )

      return supertest(app.getHttpServer())
        .post(`/api/games/${gameId}/tasks/current/complete`)
        .set({ Authorization: `Bearer ${accessToken}` })
        .expect(400)
        .expect((res) => {
          expect(res.body).toHaveProperty(
            'message',
            'Current task not in active status',
          )
          expect(res.body).toHaveProperty('status', 400)
          expect(res.body).toHaveProperty('timestamp')
        })
    })

    it('should fail in completing the current task if its current status is already completed', async () => {
      const { id: quizId } = await quizService.createQuiz(
        createMockClassicQuizRequestDto(),
        hostUser,
      )

      const { id: gameId } = await gameService.createGame(quizId, hostUser)

      await gameModel
        .findByIdAndUpdate(gameId, { 'currentTask.status': 'completed' })
        .exec()

      const accessToken = await authenticateGame(
        app,
        gameId,
        hostUser._id,
        GameParticipantType.HOST,
      )

      return supertest(app.getHttpServer())
        .post(`/api/games/${gameId}/tasks/current/complete`)
        .set({ Authorization: `Bearer ${accessToken}` })
        .expect(400)
        .expect((res) => {
          expect(res.body).toHaveProperty(
            'message',
            'Current task not in active status',
          )
          expect(res.body).toHaveProperty('status', 400)
          expect(res.body).toHaveProperty('timestamp')
        })
    })

    it('should deny completing the current task without an authorization token', async () => {
      const { id: quizId } = await quizService.createQuiz(
        createMockClassicQuizRequestDto(),
        hostUser,
      )

      const { id: gameId } = await gameService.createGame(quizId, hostUser)

      return supertest(app.getHttpServer())
        .post(`/api/games/${gameId}/tasks/current/complete`)
        .expect(401)
        .expect((res) => {
          expect(res.body).toHaveProperty(
            'message',
            'Missing Authorization header',
          )
          expect(res.body).toHaveProperty('status', 401)
          expect(res.body).toHaveProperty('timestamp')
        })
    })

    it('should return 404 when completing the current task for a non-existent game ID', async () => {
      const unknownGameID = uuidv4()

      const accessToken = await authenticateGame(
        app,
        unknownGameID,
        hostUser._id,
        GameParticipantType.HOST,
      )

      return supertest(app.getHttpServer())
        .post(`/api/games/${unknownGameID}/tasks/current/complete`)
        .set({ Authorization: `Bearer ${accessToken}` })
        .expect(404)
        .expect((res) => {
          expect(res.body).toHaveProperty(
            'message',
            `Game not found by id '${unknownGameID}'`,
          )
          expect(res.body).toHaveProperty('status', 404)
          expect(res.body).toHaveProperty('timestamp')
        })
    })

    it('should return 401 when completing the current task with a token for a different game', async () => {
      const { id: quizId } = await quizService.createQuiz(
        createMockClassicQuizRequestDto(),
        hostUser,
      )

      const { id: gameId } = await gameService.createGame(quizId, hostUser)

      const { id: quizIdSecond } = await quizService.createQuiz(
        createMockClassicQuizRequestDto(),
        playerUser,
      )

      const { id: anotherGameId } = await gameService.createGame(
        quizIdSecond,
        playerUser,
      )

      const accessToken = await authenticateGame(
        app,
        anotherGameId,
        hostUser._id,
        GameParticipantType.HOST,
      )

      return supertest(app.getHttpServer())
        .post(`/api/games/${gameId}/tasks/current/complete`)
        .set({ Authorization: `Bearer ${accessToken}` })
        .expect(403)
        .expect((res) => {
          expect(res.body).toHaveProperty('message', 'Forbidden')
          expect(res.body).toHaveProperty('status', 403)
          expect(res.body).toHaveProperty('timestamp')
        })
    })
  })

  describe('/api/games/:gameID/answers (POST)', () => {
    it('should submit a valid multi-choice answer successfully', async () => {
      const { id: quizId } = await quizService.createQuiz(
        createMockClassicQuizRequestDto(),
        hostUser,
      )

      const { id: gameId } = await gameService.createGame(quizId, hostUser)

      await gameService.joinGame(
        gameId,
        playerUser._id,
        MOCK_DEFAULT_PLAYER_NICKNAME,
      )

      await gameModel
        .findByIdAndUpdate(gameId, {
          currentTask: {
            _id: uuidv4(),
            type: TaskType.Question,
            status: 'active',
            questionIndex: 0,
            metadata: { type: QuestionType.MultiChoice },
            answers: [],
            created: new Date(),
          },
        })
        .exec()

      const accessToken = await authenticateGame(
        app,
        gameId,
        playerUser._id,
        GameParticipantType.PLAYER,
      )

      return supertest(app.getHttpServer())
        .post(`/api/games/${gameId}/answers`)
        .set({ Authorization: `Bearer ${accessToken}` })
        .send({ type: QuestionType.MultiChoice, optionIndex: 0 })
        .expect(204)
        .expect((res) => {
          expect(res.body).toStrictEqual({})
        })
    })

    it('should return Forbidden when a host tries to submit an answer', async () => {
      const { id: quizId } = await quizService.createQuiz(
        createMockClassicQuizRequestDto(),
        hostUser,
      )

      const { id: gameId } = await gameService.createGame(quizId, hostUser)

      await gameModel
        .findByIdAndUpdate(gameId, {
          currentTask: {
            _id: uuidv4(),
            type: TaskType.Question,
            status: 'active',
            questionIndex: 0,
            answers: [],
            created: new Date(),
          },
        })
        .exec()

      const accessToken = await authenticateGame(
        app,
        gameId,
        hostUser._id,
        GameParticipantType.HOST,
      )

      return supertest(app.getHttpServer())
        .post(`/api/games/${gameId}/answers`)
        .set({ Authorization: `Bearer ${accessToken}` })
        .send({ type: QuestionType.MultiChoice, optionIndex: 0 })
        .expect(403)
        .expect((res) => {
          expect(res.body).toHaveProperty('message', 'Forbidden')
          expect(res.body).toHaveProperty('status', 403)
          expect(res.body).toHaveProperty('timestamp')
        })
    })

    it('should return BadRequest for invalid task status', async () => {
      const { id: quizId } = await quizService.createQuiz(
        createMockClassicQuizRequestDto(),
        hostUser,
      )

      const { id: gameId } = await gameService.createGame(quizId, hostUser)

      await gameService.joinGame(
        gameId,
        playerUser._id,
        MOCK_DEFAULT_PLAYER_NICKNAME,
      )

      await gameModel
        .findByIdAndUpdate(gameId, {
          currentTask: {
            _id: uuidv4(),
            type: TaskType.Question,
            status: 'pending',
            questionIndex: 0,
            answers: [],
            created: new Date(),
          },
        })
        .exec()

      const accessToken = await authenticateGame(
        app,
        gameId,
        playerUser._id,
        GameParticipantType.PLAYER,
      )

      return supertest(app.getHttpServer())
        .post(`/api/games/${gameId}/answers`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ type: QuestionType.MultiChoice, optionIndex: 0 })
        .expect(400)
        .expect((res) => {
          expect(res.body).toHaveProperty(
            'message',
            'Current task is either not of question type or not in active status',
          )
          expect(res.body).toHaveProperty('status', 400)
          expect(res.body).toHaveProperty('timestamp')
        })
    })

    it('should return BadRequest for non-question task type', async () => {
      const { id: quizId } = await quizService.createQuiz(
        createMockClassicQuizRequestDto(),
        hostUser,
      )

      const { id: gameId } = await gameService.createGame(quizId, hostUser)

      await gameService.joinGame(
        gameId,
        playerUser._id,
        MOCK_DEFAULT_PLAYER_NICKNAME,
      )

      await gameModel
        .findByIdAndUpdate(gameId, {
          currentTask: createMockLobbyTaskDocument(),
        })
        .exec()

      const accessToken = await authenticateGame(
        app,
        gameId,
        playerUser._id,
        GameParticipantType.PLAYER,
      )

      return supertest(app.getHttpServer())
        .post(`/api/games/${gameId}/answers`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ type: QuestionType.MultiChoice, optionIndex: 0 })
        .expect(400)
        .expect((res) => {
          expect(res.body).toHaveProperty(
            'message',
            'Current task is either not of question type or not in active status',
          )
          expect(res.body).toHaveProperty('status', 400)
          expect(res.body).toHaveProperty('timestamp')
        })
    })

    it('should return BadRequest when the player has already submitted an answer', async () => {
      const { id: quizId } = await quizService.createQuiz(
        createMockClassicQuizRequestDto(),
        hostUser,
      )

      const { id: gameId } = await gameService.createGame(quizId, hostUser)

      await gameService.joinGame(
        gameId,
        playerUser._id,
        MOCK_DEFAULT_PLAYER_NICKNAME,
      )

      await gameModel
        .findByIdAndUpdate(gameId, {
          currentTask: {
            _id: uuidv4(),
            type: TaskType.Question,
            status: 'active',
            questionIndex: 0,
            metadata: { type: QuestionType.MultiChoice },
            answers: [],
            created: new Date(),
          },
        })
        .exec()

      await gameService.submitQuestionAnswer(gameId, playerUser._id, {
        type: QuestionType.MultiChoice,
        optionIndex: 0,
      })

      const accessToken = await authenticateGame(
        app,
        gameId,
        playerUser._id,
        GameParticipantType.PLAYER,
      )

      return supertest(app.getHttpServer())
        .post(`/api/games/${gameId}/answers`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ type: QuestionType.MultiChoice, optionIndex: 0 })
        .expect(400)
        .expect((res) => {
          expect(res.body).toHaveProperty('message', 'Answer already provided')
          expect(res.body).toHaveProperty('status', 400)
          expect(res.body).toHaveProperty('timestamp')
        })
    })
  })

  describe('/api/games/:gameID/tasks/current/correct_answers (POST)', () => {
    let secondPlayerUser: User

    beforeEach(async () => {
      secondPlayerUser = await userModel.create(buildMockTertiaryUser())
    })

    it('should add a correct multi-choice answer successfully', async () => {
      const gameDocument = await gameModel.create(
        buildMultiChoiceQuestionGameDocument({
          users: {
            hostUser,
            playerUser,
            secondPlayerUser,
          },
        }),
      )

      const accessToken = await authenticateGame(
        app,
        gameDocument._id,
        hostUser._id,
        GameParticipantType.HOST,
      )

      await supertest(app.getHttpServer())
        .post(`/api/games/${gameDocument._id}/tasks/current/correct_answers`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ type: QuestionType.MultiChoice, index: 1 })
        .expect(204)
        .expect((res) => {
          expect(res.body).toEqual({})
        })

      const { correctAnswers, results } = (
        await gameModel.findById(gameDocument._id).exec()
      )?.currentTask as QuestionResultTaskWithBase

      expect(toPlain(correctAnswers)).toEqual([
        { type: QuestionType.MultiChoice, index: 0 },
        { type: QuestionType.MultiChoice, index: 1 },
      ])

      expect(toPlain(results)).toEqual([
        toPlain(
          buildCorrectQuestionResultTaskItem({
            user: playerUser,
            answer: {
              type: QuestionType.MultiChoice,
              answer: 0,
              created: offsetSeconds(3),
            },
            lastScore: 900,
            totalScore: 900,
            position: 1,
            lastResponseTime: 1000,
            totalResponseTime: 1000,
            responseCount: 1,
          }),
        ),
        toPlain(
          buildCorrectQuestionResultTaskItem({
            user: secondPlayerUser,
            answer: {
              type: QuestionType.MultiChoice,
              answer: 1,
              created: offsetSeconds(4),
            },
            lastScore: 800,
            totalScore: 800,
            position: 2,
            lastResponseTime: 2000,
            totalResponseTime: 2000,
            responseCount: 1,
          }),
        ),
      ])
    })

    it('should add a correct range answer successfully', async () => {
      const gameDocument = await gameModel.create(
        createMockGameDocument({
          questions: [createMockRangeQuestionDocument()],
          participants: [
            createMockGameHostParticipantDocument({
              participantId: hostUser._id,
            }),
            createMockGamePlayerParticipantDocument({
              participantId: playerUser._id,
              nickname: playerUser.defaultNickname,
            }),
            createMockGamePlayerParticipantDocument({
              participantId: secondPlayerUser._id,
              nickname: secondPlayerUser.defaultNickname,
            }),
          ],
          currentTask: createMockQuestionResultTaskDocument({
            status: 'active',
            correctAnswers: [{ type: QuestionType.Range, value: 50 }],
            results: [
              buildCorrectQuestionResultTaskItem({
                user: playerUser,
                answer: {
                  type: QuestionType.Range,
                  answer: 50,
                  created: offsetSeconds(3),
                },
                lastScore: 997,
                totalScore: 997,
                position: 1,
                lastResponseTime: 1000,
                totalResponseTime: 1000,
                responseCount: 1,
              }),
              buildIncorrectQuestionResultTaskItem({
                user: secondPlayerUser,
                answer: {
                  type: QuestionType.Range,
                  answer: 40,
                  created: offsetSeconds(4),
                },
              }),
            ],
            created: offsetSeconds(4),
          }),
          previousTasks: [
            createMockQuestionTaskDocument({
              status: 'active',
              answers: [
                {
                  type: QuestionType.Range,
                  playerId: playerUser._id,
                  created: offsetSeconds(3),
                  answer: 50,
                },
                {
                  type: QuestionType.Range,
                  playerId: secondPlayerUser._id,
                  created: offsetSeconds(4),
                  answer: 40,
                },
              ],
              presented: offsetSeconds(2),
              created: offsetSeconds(1),
            }),
          ],
        }),
      )

      const accessToken = await authenticateGame(
        app,
        gameDocument._id,
        hostUser._id,
        GameParticipantType.HOST,
      )

      await supertest(app.getHttpServer())
        .post(`/api/games/${gameDocument._id}/tasks/current/correct_answers`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ type: QuestionType.Range, value: 40 })
        .expect(204)
        .expect((res) => {
          expect(res.body).toEqual({})
        })

      const { correctAnswers, results } = (
        await gameModel.findById(gameDocument._id).exec()
      )?.currentTask as QuestionResultTaskWithBase

      expect(toPlain(correctAnswers)).toEqual([
        { type: QuestionType.Range, value: 50 },
        { type: QuestionType.Range, value: 40 },
      ])

      expect(toPlain(results)).toEqual([
        toPlain(
          buildCorrectQuestionResultTaskItem({
            user: playerUser,
            answer: {
              type: QuestionType.Range,
              answer: 50,
              created: offsetSeconds(3),
            },
            lastScore: 997,
            totalScore: 997,
            position: 1,
            lastResponseTime: 1000,
            totalResponseTime: 1000,
            responseCount: 1,
          }),
        ),
        toPlain(
          buildCorrectQuestionResultTaskItem({
            user: secondPlayerUser,
            answer: {
              type: QuestionType.Range,
              answer: 40,
              created: offsetSeconds(4),
            },
            lastScore: 993,
            totalScore: 993,
            position: 2,
            lastResponseTime: 2000,
            totalResponseTime: 2000,
            responseCount: 1,
          }),
        ),
      ])
    })

    it('should add a correct true-false answer successfully', async () => {
      const gameDocument = await gameModel.create(
        createMockGameDocument({
          questions: [createMockTrueFalseQuestionDocument()],
          participants: [
            createMockGameHostParticipantDocument({
              participantId: hostUser._id,
            }),
            createMockGamePlayerParticipantDocument({
              participantId: playerUser._id,
              nickname: playerUser.defaultNickname,
            }),
            createMockGamePlayerParticipantDocument({
              participantId: secondPlayerUser._id,
              nickname: secondPlayerUser.defaultNickname,
            }),
          ],
          currentTask: createMockQuestionResultTaskDocument({
            status: 'active',
            correctAnswers: [{ type: QuestionType.TrueFalse, value: false }],
            results: [
              buildCorrectQuestionResultTaskItem({
                user: playerUser,
                answer: {
                  type: QuestionType.TrueFalse,
                  answer: false,
                  created: offsetSeconds(3),
                },
                lastScore: 983,
                totalScore: 983,
                position: 1,
                lastResponseTime: 1000,
                totalResponseTime: 1000,
                responseCount: 1,
              }),
              buildIncorrectQuestionResultTaskItem({
                user: secondPlayerUser,
                answer: {
                  type: QuestionType.TrueFalse,
                  answer: true,
                  created: offsetSeconds(4),
                },
              }),
            ],
            created: offsetSeconds(4),
          }),
          previousTasks: [
            createMockQuestionTaskDocument({
              status: 'active',
              answers: [
                {
                  type: QuestionType.TrueFalse,
                  playerId: playerUser._id,
                  created: offsetSeconds(3),
                  answer: false,
                },
                {
                  type: QuestionType.TrueFalse,
                  playerId: secondPlayerUser._id,
                  created: offsetSeconds(4),
                  answer: true,
                },
              ],
              presented: offsetSeconds(2),
              created: offsetSeconds(1),
            }),
          ],
        }),
      )

      const accessToken = await authenticateGame(
        app,
        gameDocument._id,
        hostUser._id,
        GameParticipantType.HOST,
      )

      await supertest(app.getHttpServer())
        .post(`/api/games/${gameDocument._id}/tasks/current/correct_answers`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ type: QuestionType.TrueFalse, value: true })
        .expect(204)
        .expect((res) => {
          expect(res.body).toEqual({})
        })

      const { correctAnswers, results } = (
        await gameModel.findById(gameDocument._id).exec()
      )?.currentTask as QuestionResultTaskWithBase

      expect(toPlain(correctAnswers)).toEqual([
        { type: QuestionType.TrueFalse, value: false },
        { type: QuestionType.TrueFalse, value: true },
      ])

      expect(toPlain(results)).toEqual([
        toPlain(
          buildCorrectQuestionResultTaskItem({
            user: playerUser,
            answer: {
              type: QuestionType.TrueFalse,
              answer: false,
              created: offsetSeconds(3),
            },
            lastScore: 983,
            totalScore: 983,
            position: 1,
            lastResponseTime: 1000,
            totalResponseTime: 1000,
            responseCount: 1,
          }),
        ),
        toPlain(
          buildCorrectQuestionResultTaskItem({
            user: secondPlayerUser,
            answer: {
              type: QuestionType.TrueFalse,
              answer: true,
              created: offsetSeconds(4),
            },
            lastScore: 967,
            totalScore: 967,
            position: 2,
            lastResponseTime: 2000,
            totalResponseTime: 2000,
            responseCount: 1,
          }),
        ),
      ])
    })

    it('should add a correct type-answer answer successfully', async () => {
      const gameDocument = await gameModel.create(
        createMockGameDocument({
          questions: [createMockTypeAnswerQuestionDocument()],
          participants: [
            createMockGameHostParticipantDocument({
              participantId: hostUser._id,
            }),
            createMockGamePlayerParticipantDocument({
              participantId: playerUser._id,
              nickname: playerUser.defaultNickname,
            }),
            createMockGamePlayerParticipantDocument({
              participantId: secondPlayerUser._id,
              nickname: secondPlayerUser.defaultNickname,
            }),
          ],
          currentTask: createMockQuestionResultTaskDocument({
            status: 'active',
            correctAnswers: [
              {
                type: QuestionType.TypeAnswer,
                value: MOCK_TYPE_ANSWER_OPTION_VALUE,
              },
            ],
            results: [
              buildCorrectQuestionResultTaskItem({
                user: playerUser,
                answer: {
                  type: QuestionType.TypeAnswer,
                  answer: MOCK_TYPE_ANSWER_OPTION_VALUE,
                  created: offsetSeconds(3),
                },
                lastScore: 983,
                totalScore: 983,
                position: 1,
                lastResponseTime: 1000,
                totalResponseTime: 1000,
                responseCount: 1,
              }),
              buildIncorrectQuestionResultTaskItem({
                user: secondPlayerUser,
                answer: {
                  type: QuestionType.TypeAnswer,
                  answer: MOCK_TYPE_ANSWER_OPTION_VALUE_ALTERNATIVE,
                  created: offsetSeconds(4),
                },
              }),
            ],
            created: offsetSeconds(4),
          }),
          previousTasks: [
            createMockQuestionTaskDocument({
              status: 'active',
              answers: [
                {
                  type: QuestionType.TypeAnswer,
                  playerId: playerUser._id,
                  created: offsetSeconds(3),
                  answer: MOCK_TYPE_ANSWER_OPTION_VALUE,
                },
                {
                  type: QuestionType.TypeAnswer,
                  playerId: secondPlayerUser._id,
                  created: offsetSeconds(4),
                  answer: MOCK_TYPE_ANSWER_OPTION_VALUE_ALTERNATIVE,
                },
              ],
              presented: offsetSeconds(2),
              created: offsetSeconds(1),
            }),
          ],
        }),
      )

      const accessToken = await authenticateGame(
        app,
        gameDocument._id,
        hostUser._id,
        GameParticipantType.HOST,
      )

      await supertest(app.getHttpServer())
        .post(`/api/games/${gameDocument._id}/tasks/current/correct_answers`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          type: QuestionType.TypeAnswer,
          value: MOCK_TYPE_ANSWER_OPTION_VALUE_ALTERNATIVE,
        })
        .expect(204)
        .expect((res) => {
          expect(res.body).toEqual({})
        })

      const { correctAnswers, results } = (
        await gameModel.findById(gameDocument._id).exec()
      )?.currentTask as QuestionResultTaskWithBase

      expect(toPlain(correctAnswers)).toEqual([
        {
          type: QuestionType.TypeAnswer,
          value: MOCK_TYPE_ANSWER_OPTION_VALUE,
        },
        {
          type: QuestionType.TypeAnswer,
          value: MOCK_TYPE_ANSWER_OPTION_VALUE_ALTERNATIVE,
        },
      ])

      expect(toPlain(results)).toEqual([
        toPlain(
          buildCorrectQuestionResultTaskItem({
            user: playerUser,
            answer: {
              type: QuestionType.TypeAnswer,
              answer: MOCK_TYPE_ANSWER_OPTION_VALUE,
              created: offsetSeconds(3),
            },
            lastScore: 983,
            totalScore: 983,
            position: 1,
            lastResponseTime: 1000,
            totalResponseTime: 1000,
            responseCount: 1,
          }),
        ),
        toPlain(
          buildCorrectQuestionResultTaskItem({
            user: secondPlayerUser,
            answer: {
              type: QuestionType.TypeAnswer,
              answer: MOCK_TYPE_ANSWER_OPTION_VALUE_ALTERNATIVE,
              created: offsetSeconds(4),
            },
            lastScore: 967,
            totalScore: 967,
            position: 2,
            lastResponseTime: 2000,
            totalResponseTime: 2000,
            responseCount: 1,
          }),
        ),
      ])
    })

    it('should return 404 when adding a correct answer to a non-existing game', async () => {
      const gameId = uuidv4()

      const accessToken = await authenticateGame(
        app,
        gameId,
        hostUser._id,
        GameParticipantType.HOST,
      )

      return supertest(app.getHttpServer())
        .post(`/api/games/${gameId}/tasks/current/correct_answers`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ type: QuestionType.MultiChoice, index: 0 })
        .expect(404)
        .expect((res) => {
          expect(res.body).toEqual({
            message: `Game not found by id '${gameId}'`,
            status: 404,
            timestamp: expect.anything(),
          })
        })
    })

    it('should return 403 when adding a correct answer as a player', async () => {
      const gameDocument = await gameModel.create(
        buildMultiChoiceQuestionGameDocument({
          users: {
            hostUser,
            playerUser,
            secondPlayerUser,
          },
        }),
      )

      const accessToken = await authenticateGame(
        app,
        gameDocument._id,
        playerUser._id,
        GameParticipantType.PLAYER,
      )

      return supertest(app.getHttpServer())
        .post(`/api/games/${gameDocument._id}/tasks/current/correct_answers`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ type: QuestionType.MultiChoice, index: 1 })
        .expect(403)
        .expect((res) => {
          expect(res.body).toEqual({
            message: 'Forbidden',
            status: 403,
            timestamp: expect.anything(),
          })
        })
    })

    it('should return 403 when adding a correct answer for a non-authorized game', async () => {
      const gameDocument = await gameModel.create(
        buildMultiChoiceQuestionGameDocument({
          users: {
            hostUser,
            playerUser,
            secondPlayerUser,
          },
        }),
      )

      const anotherUser = await userModel.create(buildMockQuaternaryUser())

      const accessToken = await authenticateGame(
        app,
        gameDocument._id,
        anotherUser._id,
        GameParticipantType.PLAYER,
      )

      return supertest(app.getHttpServer())
        .post(`/api/games/${gameDocument._id}/tasks/current/correct_answers`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ type: QuestionType.MultiChoice, index: 1 })
        .expect(403)
        .expect((res) => {
          expect(res.body).toEqual({
            message: 'Forbidden',
            status: 403,
            timestamp: expect.anything(),
          })
        })
    })

    it('should return 401 when adding a correct answer when missing authorization', async () => {
      const gameDocument = await gameModel.create(
        buildMultiChoiceQuestionGameDocument({
          users: {
            hostUser,
            playerUser,
            secondPlayerUser,
          },
        }),
      )

      return supertest(app.getHttpServer())
        .post(`/api/games/${gameDocument._id}/tasks/current/correct_answers`)
        .send({ type: QuestionType.MultiChoice, index: 1 })
        .expect(401)
        .expect((res) => {
          expect(res.body).toEqual({
            message: 'Missing Authorization header',
            status: 401,
            timestamp: expect.anything(),
          })
        })
    })

    it('should return 400 when adding a correct answer when invalid result task status', async () => {
      const gameDocument = await gameModel.create(
        buildMultiChoiceQuestionGameDocument({
          game: {
            currentTask: createMockQuestionResultTaskDocument({
              status: 'pending',
              correctAnswers: [{ type: QuestionType.MultiChoice, index: 0 }],
              results: [
                buildCorrectQuestionResultTaskItem({
                  user: playerUser,
                  answer: {
                    type: QuestionType.MultiChoice,
                    answer: 0,
                    created: offsetSeconds(3),
                  },
                  lastScore: 900,
                  totalScore: 900,
                  position: 1,
                  lastResponseTime: 1000,
                  totalResponseTime: 1000,
                  responseCount: 1,
                }),
                buildIncorrectQuestionResultTaskItem({
                  user: secondPlayerUser,
                  answer: {
                    type: QuestionType.MultiChoice,
                    answer: 1,
                    created: offsetSeconds(4),
                  },
                }),
              ],
              created: offsetSeconds(4),
            }),
          },
          users: {
            hostUser,
            playerUser,
            secondPlayerUser,
          },
        }),
      )

      const accessToken = await authenticateGame(
        app,
        gameDocument._id,
        hostUser._id,
        GameParticipantType.HOST,
      )

      return supertest(app.getHttpServer())
        .post(`/api/games/${gameDocument._id}/tasks/current/correct_answers`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ type: QuestionType.MultiChoice, index: 1 })
        .expect(400)
        .expect((res) => {
          expect(res.body).toEqual({
            message:
              'Current task is either not of question result type or not in active status',
            status: 400,
            timestamp: expect.anything(),
          })
        })
    })

    it('should return 400 when adding a correct answer when wrong current task', async () => {
      const gameDocument = await gameModel.create(
        buildMultiChoiceQuestionGameDocument({
          game: {
            currentTask: createMockQuestionTaskDocument(),
          },
          users: {
            hostUser,
            playerUser,
            secondPlayerUser,
          },
        }),
      )

      const accessToken = await authenticateGame(
        app,
        gameDocument._id,
        hostUser._id,
        GameParticipantType.HOST,
      )

      return supertest(app.getHttpServer())
        .post(`/api/games/${gameDocument._id}/tasks/current/correct_answers`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ type: QuestionType.MultiChoice, index: 1 })
        .expect(400)
        .expect((res) => {
          expect(res.body).toEqual({
            message:
              'Current task is either not of question result type or not in active status',
            status: 400,
            timestamp: expect.anything(),
          })
        })
    })
  })

  describe('/api/games/:gameID/tasks/current/correct_answers (DELETE)', () => {
    let secondPlayerUser: User

    beforeEach(async () => {
      secondPlayerUser = await userModel.create(buildMockTertiaryUser())
    })

    it('should delete a correct multi-choice answer successfully', async () => {
      const gameDocument = await gameModel.create(
        buildMultiChoiceQuestionGameDocument({
          users: {
            hostUser,
            playerUser,
            secondPlayerUser,
          },
        }),
      )

      const accessToken = await authenticateGame(
        app,
        gameDocument._id,
        hostUser._id,
        GameParticipantType.HOST,
      )

      await supertest(app.getHttpServer())
        .delete(`/api/games/${gameDocument._id}/tasks/current/correct_answers`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ type: QuestionType.MultiChoice, index: 0 })
        .expect(204)
        .expect((res) => {
          expect(res.body).toEqual({})
        })

      const { correctAnswers, results } = (
        await gameModel.findById(gameDocument._id).exec()
      )?.currentTask as QuestionResultTaskWithBase

      expect(toPlain(correctAnswers)).toEqual([])

      expect(toPlain(results)).toEqual([
        toPlain(
          buildIncorrectQuestionResultTaskItem({
            user: playerUser,
            answer: {
              type: QuestionType.MultiChoice,
              answer: 0,
              created: offsetSeconds(3),
            },
            position: 1,
            lastResponseTime: 1000,
            totalResponseTime: 1000,
            responseCount: 1,
          }),
        ),
        toPlain(
          buildIncorrectQuestionResultTaskItem({
            user: secondPlayerUser,
            answer: {
              type: QuestionType.MultiChoice,
              answer: 1,
              created: offsetSeconds(4),
            },
            position: 2,
            lastResponseTime: 2000,
            totalResponseTime: 2000,
            responseCount: 1,
          }),
        ),
      ])
    })

    it('should delete a correct range answer successfully', async () => {
      const gameDocument = await gameModel.create(
        createMockGameDocument({
          questions: [createMockRangeQuestionDocument()],
          participants: [
            createMockGameHostParticipantDocument({
              participantId: hostUser._id,
            }),
            createMockGamePlayerParticipantDocument({
              participantId: playerUser._id,
              nickname: playerUser.defaultNickname,
            }),
            createMockGamePlayerParticipantDocument({
              participantId: secondPlayerUser._id,
              nickname: secondPlayerUser.defaultNickname,
            }),
          ],
          currentTask: createMockQuestionResultTaskDocument({
            status: 'active',
            correctAnswers: [{ type: QuestionType.Range, value: 50 }],
            results: [
              buildCorrectQuestionResultTaskItem({
                user: playerUser,
                answer: {
                  type: QuestionType.Range,
                  answer: 50,
                  created: offsetSeconds(3),
                },
                lastScore: 997,
                totalScore: 997,
                position: 1,
                lastResponseTime: 1000,
                totalResponseTime: 1000,
                responseCount: 1,
              }),
              buildIncorrectQuestionResultTaskItem({
                user: secondPlayerUser,
                answer: {
                  type: QuestionType.Range,
                  answer: 40,
                  created: offsetSeconds(4),
                },
              }),
            ],
            created: offsetSeconds(4),
          }),
          previousTasks: [
            createMockQuestionTaskDocument({
              status: 'active',
              answers: [
                {
                  type: QuestionType.Range,
                  playerId: playerUser._id,
                  created: offsetSeconds(3),
                  answer: 50,
                },
                {
                  type: QuestionType.Range,
                  playerId: secondPlayerUser._id,
                  created: offsetSeconds(4),
                  answer: 40,
                },
              ],
              presented: offsetSeconds(2),
              created: offsetSeconds(1),
            }),
          ],
        }),
      )

      const accessToken = await authenticateGame(
        app,
        gameDocument._id,
        hostUser._id,
        GameParticipantType.HOST,
      )

      await supertest(app.getHttpServer())
        .delete(`/api/games/${gameDocument._id}/tasks/current/correct_answers`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ type: QuestionType.Range, value: 50 })
        .expect(204)
        .expect((res) => {
          expect(res.body).toEqual({})
        })

      const { correctAnswers, results } = (
        await gameModel.findById(gameDocument._id).exec()
      )?.currentTask as QuestionResultTaskWithBase

      expect(toPlain(correctAnswers)).toEqual([])

      expect(toPlain(results)).toEqual([
        toPlain(
          buildIncorrectQuestionResultTaskItem({
            user: playerUser,
            answer: {
              type: QuestionType.Range,
              answer: 50,
              created: offsetSeconds(3),
            },
            position: 1,
            lastResponseTime: 1000,
            totalResponseTime: 1000,
            responseCount: 1,
          }),
        ),
        toPlain(
          buildIncorrectQuestionResultTaskItem({
            user: secondPlayerUser,
            answer: {
              type: QuestionType.Range,
              answer: 40,
              created: offsetSeconds(4),
            },
            position: 2,
            lastResponseTime: 2000,
            totalResponseTime: 2000,
            responseCount: 1,
          }),
        ),
      ])
    })

    it('should delete a correct true-false answer successfully', async () => {
      const gameDocument = await gameModel.create(
        createMockGameDocument({
          questions: [createMockTrueFalseQuestionDocument()],
          participants: [
            createMockGameHostParticipantDocument({
              participantId: hostUser._id,
            }),
            createMockGamePlayerParticipantDocument({
              participantId: playerUser._id,
              nickname: playerUser.defaultNickname,
            }),
            createMockGamePlayerParticipantDocument({
              participantId: secondPlayerUser._id,
              nickname: secondPlayerUser.defaultNickname,
            }),
          ],
          currentTask: createMockQuestionResultTaskDocument({
            status: 'active',
            correctAnswers: [{ type: QuestionType.TrueFalse, value: false }],
            results: [
              buildCorrectQuestionResultTaskItem({
                user: playerUser,
                answer: {
                  type: QuestionType.TrueFalse,
                  answer: false,
                  created: offsetSeconds(3),
                },
                lastScore: 983,
                totalScore: 983,
                position: 1,
                lastResponseTime: 1000,
                totalResponseTime: 1000,
                responseCount: 1,
              }),
              buildIncorrectQuestionResultTaskItem({
                user: secondPlayerUser,
                answer: {
                  type: QuestionType.TrueFalse,
                  answer: true,
                  created: offsetSeconds(4),
                },
                position: 2,
              }),
            ],
            created: offsetSeconds(4),
          }),
          previousTasks: [
            createMockQuestionTaskDocument({
              status: 'active',
              answers: [
                {
                  type: QuestionType.TrueFalse,
                  playerId: playerUser._id,
                  created: offsetSeconds(3),
                  answer: false,
                },
                {
                  type: QuestionType.TrueFalse,
                  playerId: secondPlayerUser._id,
                  created: offsetSeconds(4),
                  answer: true,
                },
              ],
              presented: offsetSeconds(2),
              created: offsetSeconds(1),
            }),
          ],
        }),
      )

      const accessToken = await authenticateGame(
        app,
        gameDocument._id,
        hostUser._id,
        GameParticipantType.HOST,
      )

      await supertest(app.getHttpServer())
        .delete(`/api/games/${gameDocument._id}/tasks/current/correct_answers`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ type: QuestionType.TrueFalse, value: false })
        .expect(204)
        .expect((res) => {
          expect(res.body).toEqual({})
        })

      const { correctAnswers, results } = (
        await gameModel.findById(gameDocument._id).exec()
      )?.currentTask as QuestionResultTaskWithBase

      expect(toPlain(correctAnswers)).toEqual([])

      expect(toPlain(results)).toEqual([
        toPlain(
          buildIncorrectQuestionResultTaskItem({
            user: playerUser,
            answer: {
              type: QuestionType.TrueFalse,
              answer: false,
              created: offsetSeconds(3),
            },
            position: 1,
            lastResponseTime: 1000,
            totalResponseTime: 1000,
            responseCount: 1,
          }),
        ),
        toPlain(
          buildIncorrectQuestionResultTaskItem({
            user: secondPlayerUser,
            answer: {
              type: QuestionType.TrueFalse,
              answer: true,
              created: offsetSeconds(4),
            },
            position: 2,
            lastResponseTime: 2000,
            totalResponseTime: 2000,
            responseCount: 1,
          }),
        ),
      ])
    })

    it('should delete a correct type-answer answer successfully', async () => {
      const gameDocument = await gameModel.create(
        createMockGameDocument({
          questions: [createMockTypeAnswerQuestionDocument()],
          participants: [
            createMockGameHostParticipantDocument({
              participantId: hostUser._id,
            }),
            createMockGamePlayerParticipantDocument({
              participantId: playerUser._id,
              nickname: playerUser.defaultNickname,
            }),
            createMockGamePlayerParticipantDocument({
              participantId: secondPlayerUser._id,
              nickname: secondPlayerUser.defaultNickname,
            }),
          ],
          currentTask: createMockQuestionResultTaskDocument({
            status: 'active',
            correctAnswers: [
              {
                type: QuestionType.TypeAnswer,
                value: MOCK_TYPE_ANSWER_OPTION_VALUE,
              },
            ],
            results: [
              buildCorrectQuestionResultTaskItem({
                user: playerUser,
                answer: {
                  type: QuestionType.TypeAnswer,
                  answer: MOCK_TYPE_ANSWER_OPTION_VALUE,
                  created: offsetSeconds(3),
                },
                lastScore: 983,
                totalScore: 983,
                position: 1,
                lastResponseTime: 1000,
                totalResponseTime: 1000,
                responseCount: 1,
              }),
              buildIncorrectQuestionResultTaskItem({
                user: playerUser,
                answer: {
                  type: QuestionType.TypeAnswer,
                  answer: MOCK_TYPE_ANSWER_OPTION_VALUE_ALTERNATIVE,
                  created: offsetSeconds(4),
                },
              }),
            ],
            created: offsetSeconds(4),
          }),
          previousTasks: [
            createMockQuestionTaskDocument({
              status: 'active',
              answers: [
                {
                  type: QuestionType.TypeAnswer,
                  playerId: playerUser._id,
                  created: offsetSeconds(3),
                  answer: MOCK_TYPE_ANSWER_OPTION_VALUE,
                },
                {
                  type: QuestionType.TypeAnswer,
                  playerId: secondPlayerUser._id,
                  created: offsetSeconds(4),
                  answer: MOCK_TYPE_ANSWER_OPTION_VALUE_ALTERNATIVE,
                },
              ],
              presented: offsetSeconds(2),
              created: offsetSeconds(1),
            }),
          ],
        }),
      )

      const accessToken = await authenticateGame(
        app,
        gameDocument._id,
        hostUser._id,
        GameParticipantType.HOST,
      )

      await supertest(app.getHttpServer())
        .delete(`/api/games/${gameDocument._id}/tasks/current/correct_answers`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          type: QuestionType.TypeAnswer,
          value: MOCK_TYPE_ANSWER_OPTION_VALUE,
        })
        .expect(204)
        .expect((res) => {
          expect(res.body).toEqual({})
        })

      const { correctAnswers, results } = (
        await gameModel.findById(gameDocument._id).exec()
      )?.currentTask as QuestionResultTaskWithBase

      expect(toPlain(correctAnswers)).toEqual([])

      expect(toPlain(results)).toEqual([
        toPlain(
          buildIncorrectQuestionResultTaskItem({
            user: playerUser,
            answer: {
              type: QuestionType.TypeAnswer,
              answer: MOCK_TYPE_ANSWER_OPTION_VALUE,
              created: offsetSeconds(3),
            },
            position: 1,
            lastResponseTime: 1000,
            totalResponseTime: 1000,
            responseCount: 1,
          }),
        ),
        toPlain(
          buildIncorrectQuestionResultTaskItem({
            user: secondPlayerUser,
            answer: {
              type: QuestionType.TypeAnswer,
              answer: MOCK_TYPE_ANSWER_OPTION_VALUE_ALTERNATIVE,
              created: offsetSeconds(4),
            },
            position: 2,
            lastResponseTime: 2000,
            totalResponseTime: 2000,
            responseCount: 1,
          }),
        ),
      ])
    })

    it('should return 404 when deleting a correct answer to a non-existing game', async () => {
      const gameId = uuidv4()

      const accessToken = await authenticateGame(
        app,
        gameId,
        hostUser._id,
        GameParticipantType.HOST,
      )

      return supertest(app.getHttpServer())
        .delete(`/api/games/${gameId}/tasks/current/correct_answers`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ type: QuestionType.MultiChoice, index: 0 })
        .expect(404)
        .expect((res) => {
          expect(res.body).toEqual({
            message: `Game not found by id '${gameId}'`,
            status: 404,
            timestamp: expect.anything(),
          })
        })
    })

    it('should return 403 when deleting a correct answer as a player', async () => {
      const gameDocument = await gameModel.create(
        buildMultiChoiceQuestionGameDocument({
          users: {
            hostUser,
            playerUser,
            secondPlayerUser,
          },
        }),
      )

      const accessToken = await authenticateGame(
        app,
        gameDocument._id,
        playerUser._id,
        GameParticipantType.PLAYER,
      )

      return supertest(app.getHttpServer())
        .delete(`/api/games/${gameDocument._id}/tasks/current/correct_answers`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ type: QuestionType.MultiChoice, index: 1 })
        .expect(403)
        .expect((res) => {
          expect(res.body).toEqual({
            message: 'Forbidden',
            status: 403,
            timestamp: expect.anything(),
          })
        })
    })

    it('should return 403 when deleting a correct answer for a non-authorized game', async () => {
      const gameDocument = await gameModel.create(
        buildMultiChoiceQuestionGameDocument({
          users: {
            hostUser,
            playerUser,
            secondPlayerUser,
          },
        }),
      )

      const anotherUser = await userModel.create(buildMockQuaternaryUser())

      const accessToken = await authenticateGame(
        app,
        gameDocument._id,
        anotherUser._id,
        GameParticipantType.PLAYER,
      )

      return supertest(app.getHttpServer())
        .delete(`/api/games/${gameDocument._id}/tasks/current/correct_answers`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ type: QuestionType.MultiChoice, index: 1 })
        .expect(403)
        .expect((res) => {
          expect(res.body).toEqual({
            message: 'Forbidden',
            status: 403,
            timestamp: expect.anything(),
          })
        })
    })

    it('should return 401 when deleting a correct answer when missing authorization', async () => {
      const gameDocument = await gameModel.create(
        buildMultiChoiceQuestionGameDocument({
          users: {
            hostUser,
            playerUser,
            secondPlayerUser,
          },
        }),
      )

      return supertest(app.getHttpServer())
        .delete(`/api/games/${gameDocument._id}/tasks/current/correct_answers`)
        .send({ type: QuestionType.MultiChoice, index: 1 })
        .expect(401)
        .expect((res) => {
          expect(res.body).toEqual({
            message: 'Missing Authorization header',
            status: 401,
            timestamp: expect.anything(),
          })
        })
    })

    it('should return 400 when deleting a correct answer when invalid result task status', async () => {
      const gameDocument = await gameModel.create(
        buildMultiChoiceQuestionGameDocument({
          game: {
            currentTask: createMockQuestionResultTaskDocument({
              status: 'pending',
              correctAnswers: [{ type: QuestionType.MultiChoice, index: 0 }],
              results: [
                buildCorrectQuestionResultTaskItem({
                  user: playerUser,
                  answer: {
                    type: QuestionType.MultiChoice,
                    answer: 0,
                    created: offsetSeconds(3),
                  },
                  lastScore: 900,
                  totalScore: 900,
                  position: 1,
                  lastResponseTime: 1000,
                  totalResponseTime: 1000,
                  responseCount: 1,
                }),
                buildIncorrectQuestionResultTaskItem({
                  user: secondPlayerUser,
                  answer: {
                    type: QuestionType.MultiChoice,
                    answer: 1,
                    created: offsetSeconds(4),
                  },
                }),
              ],
              created: offsetSeconds(4),
            }),
          },
          users: {
            hostUser,
            playerUser,
            secondPlayerUser,
          },
        }),
      )

      const accessToken = await authenticateGame(
        app,
        gameDocument._id,
        hostUser._id,
        GameParticipantType.HOST,
      )

      return supertest(app.getHttpServer())
        .delete(`/api/games/${gameDocument._id}/tasks/current/correct_answers`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ type: QuestionType.MultiChoice, index: 1 })
        .expect(400)
        .expect((res) => {
          expect(res.body).toEqual({
            message:
              'Current task is either not of question result type or not in active status',
            status: 400,
            timestamp: expect.anything(),
          })
        })
    })

    it('should return 400 when deleting a correct answer when wrong current task', async () => {
      const gameDocument = await gameModel.create(
        buildMultiChoiceQuestionGameDocument({
          game: {
            currentTask: createMockQuestionTaskDocument(),
          },
          users: {
            hostUser,
            playerUser,
            secondPlayerUser,
          },
        }),
      )

      const accessToken = await authenticateGame(
        app,
        gameDocument._id,
        hostUser._id,
        GameParticipantType.HOST,
      )

      return supertest(app.getHttpServer())
        .delete(`/api/games/${gameDocument._id}/tasks/current/correct_answers`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ type: QuestionType.MultiChoice, index: 1 })
        .expect(400)
        .expect((res) => {
          expect(res.body).toEqual({
            message:
              'Current task is either not of question result type or not in active status',
            status: 400,
            timestamp: expect.anything(),
          })
        })
    })
  })

  describe('/api/games/:gameID/quit (POST)', () => {
    it('should return 204 no content when quitting an existing active game as a host participant', async () => {
      const hostParticipantId = uuidv4()

      const game = await gameModel.create(
        createMockGameDocument({
          participants: [
            createMockGameHostParticipantDocument({
              participantId: hostParticipantId,
            }),
            createMockGamePlayerParticipantDocument(),
          ],
          currentTask: createMockQuestionResultTaskDocument(),
          status: GameStatus.Active,
        }),
      )

      const accessToken = await authenticateGame(
        app,
        game._id,
        hostParticipantId,
        GameParticipantType.HOST,
      )

      return supertest(app.getHttpServer())
        .post(`/api/games/${game._id}/quit`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(204)
        .expect((res) => {
          expect(res.body).toEqual({})
        })
    })

    it('should return 403 when quitting a game as a host participant for another game', async () => {
      const hostParticipantId = uuidv4()

      const game = await gameModel.create(
        createMockGameDocument({
          participants: [
            createMockGameHostParticipantDocument({
              participantId: hostParticipantId,
            }),
            createMockGamePlayerParticipantDocument(),
          ],
        }),
      )

      const accessToken = await authenticateGame(
        app,
        uuidv4(),
        hostParticipantId,
        GameParticipantType.HOST,
      )

      return supertest(app.getHttpServer())
        .post(`/api/games/${game._id}/quit`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(403)
        .expect((res) => {
          expect(res.body).toEqual({
            message: 'Forbidden',
            status: 403,
            timestamp: expect.anything(),
          })
        })
    })

    it('should return 403 when quitting a game as a player participant', async () => {
      const playerId = uuidv4()

      const game = await gameModel.create(
        createMockGameDocument({
          participants: [
            createMockGameHostParticipantDocument(),
            createMockGamePlayerParticipantDocument({
              participantId: playerId,
            }),
          ],
        }),
      )

      const accessToken = await authenticateGame(
        app,
        game._id,
        playerId,
        GameParticipantType.PLAYER,
      )

      return supertest(app.getHttpServer())
        .post(`/api/games/${game._id}/quit`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(403)
        .expect((res) => {
          expect(res.body).toEqual({
            message: 'Forbidden',
            status: 403,
            timestamp: expect.anything(),
          })
        })
    })

    it('should return 404 when quitting a non-existing game', async () => {
      const gameId = uuidv4()

      const accessToken = await authenticateGame(
        app,
        gameId,
        hostUser._id,
        GameParticipantType.HOST,
      )

      return supertest(app.getHttpServer())
        .post(`/api/games/${gameId}/quit`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404)
        .expect((res) => {
          expect(res.body).toEqual({
            message: `Game not found by id '${gameId}'`,
            status: 404,
            timestamp: expect.anything(),
          })
        })
    })
  })
})

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toPlain(instance: any): any {
  return JSON.parse(JSON.stringify(instance))
}

function buildMultiChoiceQuestionGameDocument(options: {
  game?: Partial<Game>
  users: {
    hostUser: User
    playerUser: User
    secondPlayerUser: User
  }
}): Game {
  return createMockGameDocument({
    questions: [createMockMultiChoiceQuestionDocument()],
    participants: [
      createMockGameHostParticipantDocument({
        participantId: options.users.hostUser._id,
      }),
      createMockGamePlayerParticipantDocument({
        participantId: options.users.playerUser._id,
        nickname: options.users.playerUser.defaultNickname,
      }),
      createMockGamePlayerParticipantDocument({
        participantId: options.users.secondPlayerUser._id,
        nickname: options.users.secondPlayerUser.defaultNickname,
      }),
    ],
    currentTask: createMockQuestionResultTaskDocument({
      status: 'active',
      correctAnswers: [{ type: QuestionType.MultiChoice, index: 0 }],
      results: [
        buildCorrectQuestionResultTaskItem({
          user: options.users.playerUser,
          answer: {
            type: QuestionType.MultiChoice,
            answer: 0,
            created: offsetSeconds(3),
          },
          lastScore: 900,
          totalScore: 900,
          position: 1,
          lastResponseTime: 1000,
          totalResponseTime: 1000,
          responseCount: 1,
        }),
        buildIncorrectQuestionResultTaskItem({
          user: options.users.secondPlayerUser,
          answer: {
            type: QuestionType.MultiChoice,
            answer: 1,
            created: offsetSeconds(4),
          },
        }),
      ],
      created: offsetSeconds(4),
    }),
    previousTasks: [
      createMockQuestionTaskDocument({
        status: 'active',
        answers: [
          {
            type: QuestionType.MultiChoice,
            playerId: options.users.playerUser._id,
            created: offsetSeconds(3),
            answer: 0,
          },
          {
            type: QuestionType.MultiChoice,
            playerId: options.users.secondPlayerUser._id,
            created: offsetSeconds(4),
            answer: 1,
          },
        ],
        presented: offsetSeconds(2),
        created: offsetSeconds(1),
      }),
    ],
    ...(options.game ?? {}),
  })
}

function buildCorrectQuestionResultTaskItem(
  options: {
    user: User
    answer:
      | Omit<QuestionTaskBaseAnswer & QuestionTaskMultiChoiceAnswer, 'playerId'>
      | Omit<QuestionTaskBaseAnswer & QuestionTaskRangeAnswer, 'playerId'>
      | Omit<QuestionTaskBaseAnswer & QuestionTaskTrueFalseAnswer, 'playerId'>
      | Omit<QuestionTaskBaseAnswer & QuestionTaskTypeAnswerAnswer, 'playerId'>
      | Omit<QuestionTaskBaseAnswer & QuestionTaskPinAnswer, 'playerId'>
      | Omit<QuestionTaskBaseAnswer & QuestionTaskPuzzleAnswer, 'playerId'>
  } & Pick<
    QuestionResultTaskItem,
    | 'lastScore'
    | 'totalScore'
    | 'position'
    | 'lastResponseTime'
    | 'totalResponseTime'
    | 'responseCount'
  >,
): QuestionResultTaskItem {
  return {
    type: options.answer.type,
    playerId: options.user._id,
    nickname: options.user.defaultNickname,
    answer: {
      type: options.answer.type,
      playerId: options.user._id,
      answer: options.answer.answer,
      created: options.answer.created,
    },
    correct: true,
    lastScore: options.lastScore,
    totalScore: options.totalScore,
    position: options.position,
    streak: 1,
    lastResponseTime: options.lastResponseTime,
    totalResponseTime: options.totalResponseTime,
    responseCount: options.responseCount,
  }
}

function buildIncorrectQuestionResultTaskItem(
  options: {
    user: User
    answer:
      | Omit<QuestionTaskBaseAnswer & QuestionTaskMultiChoiceAnswer, 'playerId'>
      | Omit<QuestionTaskBaseAnswer & QuestionTaskRangeAnswer, 'playerId'>
      | Omit<QuestionTaskBaseAnswer & QuestionTaskTrueFalseAnswer, 'playerId'>
      | Omit<QuestionTaskBaseAnswer & QuestionTaskTypeAnswerAnswer, 'playerId'>
      | Omit<QuestionTaskBaseAnswer & QuestionTaskPinAnswer, 'playerId'>
      | Omit<QuestionTaskBaseAnswer & QuestionTaskPuzzleAnswer, 'playerId'>
  } & Partial<
    Pick<
      QuestionResultTaskItem,
      'position' | 'lastResponseTime' | 'totalResponseTime' | 'responseCount'
    >
  >,
): QuestionResultTaskItem {
  return {
    type: options.answer.type,
    playerId: options.user._id,
    nickname: options.user.defaultNickname,
    answer: {
      type: options.answer.type,
      playerId: options.user._id,
      answer: options.answer.answer,
      created: options.answer.created,
    },
    correct: false,
    lastScore: 0,
    totalScore: 0,
    position: options.position ?? 2,
    streak: 0,
    lastResponseTime: options.lastResponseTime ?? 0,
    totalResponseTime: options.totalResponseTime ?? 0,
    responseCount: options.responseCount ?? 0,
  }
}
