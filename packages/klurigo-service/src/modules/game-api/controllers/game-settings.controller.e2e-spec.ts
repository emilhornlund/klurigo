import { GameParticipantType } from '@klurigo/common'
import { INestApplication } from '@nestjs/common'
import { getModelToken } from '@nestjs/mongoose'
import supertest from 'supertest'
import { v4 as uuidv4 } from 'uuid'

import {
  buildMockPrimaryUser,
  buildMockSecondaryUser,
  createMockGameDocument,
  createMockLobbyTaskDocument,
  createMockQuestionTaskDocument,
} from '../../../../test-utils/data'
import {
  authenticateGame,
  cleanupTestApp,
  createTestApp,
} from '../../../../test-utils/utils'
import { Game, GameModel } from '../../game-core/repositories/models/schemas'
import { User, UserModel } from '../../user/repositories'

describe('GameSettingsController (e2e)', () => {
  let app: INestApplication
  let gameModel: GameModel
  let userModel: UserModel

  let hostUser: User
  let playerUser: User

  beforeEach(async () => {
    app = await createTestApp()
    gameModel = app.get<GameModel>(getModelToken(Game.name))
    userModel = app.get<UserModel>(getModelToken(User.name))

    hostUser = await userModel.create(buildMockPrimaryUser())
    playerUser = await userModel.create(buildMockSecondaryUser())
  })

  afterEach(async () => {
    await cleanupTestApp(app)
  })

  describe('/api/games/:gameId/settings (PUT)', () => {
    it('should successfully update settings when host updates in active lobby', async () => {
      const game = await gameModel.create(
        createMockGameDocument({
          currentTask: createMockLobbyTaskDocument({ status: 'active' }),
          participants: [
            {
              participantId: hostUser._id,
              type: GameParticipantType.HOST,
              created: new Date(),
              updated: new Date(),
            },
          ],
          settings: {
            shouldAutoCompleteQuestionResultTask: false,
            shouldAutoCompleteLeaderboardTask: false,
            shouldAutoCompletePodiumTask: false,
            randomizeQuestionOrder: false,
            randomizeAnswerOrder: false,
          },
        }),
      )

      const hostToken = await authenticateGame(
        app,
        game._id,
        hostUser._id,
        GameParticipantType.HOST,
      )

      const requestBody = {
        randomizeQuestionOrder: true,
        randomizeAnswerOrder: true,
      }

      await supertest(app.getHttpServer())
        .put(`/api/games/${game._id}/settings`)
        .set({ Authorization: `Bearer ${hostToken}` })
        .send(requestBody)
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual({
            randomizeQuestionOrder: true,
            randomizeAnswerOrder: true,
          })
        })

      const updatedGame = await gameModel.findById(game._id)
      expect(updatedGame?.settings.randomizeQuestionOrder).toBe(true)
      expect(updatedGame?.settings.randomizeAnswerOrder).toBe(true)
    })

    it('should persist different values than defaults', async () => {
      const game = await gameModel.create(
        createMockGameDocument({
          currentTask: createMockLobbyTaskDocument({ status: 'active' }),
          participants: [
            {
              participantId: hostUser._id,
              type: GameParticipantType.HOST,
              created: new Date(),
              updated: new Date(),
            },
          ],
          settings: {
            shouldAutoCompleteQuestionResultTask: false,
            shouldAutoCompleteLeaderboardTask: false,
            shouldAutoCompletePodiumTask: false,
            randomizeQuestionOrder: true,
            randomizeAnswerOrder: true,
          },
        }),
      )

      const hostToken = await authenticateGame(
        app,
        game._id,
        hostUser._id,
        GameParticipantType.HOST,
      )

      const requestBody = {
        randomizeQuestionOrder: false,
        randomizeAnswerOrder: true,
      }

      await supertest(app.getHttpServer())
        .put(`/api/games/${game._id}/settings`)
        .set({ Authorization: `Bearer ${hostToken}` })
        .send(requestBody)
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual({
            randomizeQuestionOrder: false,
            randomizeAnswerOrder: true,
          })
        })

      const updatedGame = await gameModel.findById(game._id)
      expect(updatedGame?.settings.randomizeQuestionOrder).toBe(false)
      expect(updatedGame?.settings.randomizeAnswerOrder).toBe(true)
    })

    it('should return 400 when game is not in lobby task', async () => {
      const game = await gameModel.create(
        createMockGameDocument({
          currentTask: createMockQuestionTaskDocument({ status: 'active' }),
          participants: [
            {
              participantId: hostUser._id,
              type: GameParticipantType.HOST,
              created: new Date(),
              updated: new Date(),
            },
          ],
          settings: {
            shouldAutoCompleteQuestionResultTask: false,
            shouldAutoCompleteLeaderboardTask: false,
            shouldAutoCompletePodiumTask: false,
            randomizeQuestionOrder: false,
            randomizeAnswerOrder: false,
          },
        }),
      )

      const hostToken = await authenticateGame(
        app,
        game._id,
        hostUser._id,
        GameParticipantType.HOST,
      )

      const requestBody = {
        randomizeQuestionOrder: true,
        randomizeAnswerOrder: true,
      }

      await supertest(app.getHttpServer())
        .put(`/api/games/${game._id}/settings`)
        .set({ Authorization: `Bearer ${hostToken}` })
        .send(requestBody)
        .expect(400)
        .expect((res) => {
          expect(res.body).toHaveProperty(
            'message',
            'Game settings can only be updated while the game is in an active lobby task.',
          )
          expect(res.body).toHaveProperty('status', 400)
          expect(res.body).toHaveProperty('timestamp')
        })

      const unchangedGame = await gameModel.findById(game._id)
      expect(unchangedGame?.settings.randomizeQuestionOrder).toBe(false)
      expect(unchangedGame?.settings.randomizeAnswerOrder).toBe(false)
    })

    it('should return 400 when lobby task status is not active', async () => {
      const game = await gameModel.create(
        createMockGameDocument({
          currentTask: createMockLobbyTaskDocument({ status: 'pending' }),
          participants: [
            {
              participantId: hostUser._id,
              type: GameParticipantType.HOST,
              created: new Date(),
              updated: new Date(),
            },
          ],
          settings: {
            shouldAutoCompleteQuestionResultTask: false,
            shouldAutoCompleteLeaderboardTask: false,
            shouldAutoCompletePodiumTask: false,
            randomizeQuestionOrder: false,
            randomizeAnswerOrder: false,
          },
        }),
      )

      const hostToken = await authenticateGame(
        app,
        game._id,
        hostUser._id,
        GameParticipantType.HOST,
      )

      const requestBody = {
        randomizeQuestionOrder: true,
        randomizeAnswerOrder: true,
      }

      await supertest(app.getHttpServer())
        .put(`/api/games/${game._id}/settings`)
        .set({ Authorization: `Bearer ${hostToken}` })
        .send(requestBody)
        .expect(400)
        .expect((res) => {
          expect(res.body).toHaveProperty(
            'message',
            'Game settings can only be updated while the game is in an active lobby task.',
          )
          expect(res.body).toHaveProperty('status', 400)
          expect(res.body).toHaveProperty('timestamp')
        })

      const unchangedGame = await gameModel.findById(game._id)
      expect(unchangedGame?.settings.randomizeQuestionOrder).toBe(false)
      expect(unchangedGame?.settings.randomizeAnswerOrder).toBe(false)
    })

    it('should return 400 when lobby task status is completed', async () => {
      const game = await gameModel.create(
        createMockGameDocument({
          currentTask: createMockLobbyTaskDocument({ status: 'completed' }),
          participants: [
            {
              participantId: hostUser._id,
              type: GameParticipantType.HOST,
              created: new Date(),
              updated: new Date(),
            },
          ],
          settings: {
            shouldAutoCompleteQuestionResultTask: false,
            shouldAutoCompleteLeaderboardTask: false,
            shouldAutoCompletePodiumTask: false,
            randomizeQuestionOrder: false,
            randomizeAnswerOrder: false,
          },
        }),
      )

      const hostToken = await authenticateGame(
        app,
        game._id,
        hostUser._id,
        GameParticipantType.HOST,
      )

      const requestBody = {
        randomizeQuestionOrder: true,
        randomizeAnswerOrder: true,
      }

      await supertest(app.getHttpServer())
        .put(`/api/games/${game._id}/settings`)
        .set({ Authorization: `Bearer ${hostToken}` })
        .send(requestBody)
        .expect(400)
        .expect((res) => {
          expect(res.body).toHaveProperty(
            'message',
            'Game settings can only be updated while the game is in an active lobby task.',
          )
          expect(res.body).toHaveProperty('status', 400)
          expect(res.body).toHaveProperty('timestamp')
        })
    })

    it('should return 401 when missing authorization token', async () => {
      const game = await gameModel.create(
        createMockGameDocument({
          currentTask: createMockLobbyTaskDocument({ status: 'active' }),
          participants: [
            {
              participantId: hostUser._id,
              type: GameParticipantType.HOST,
              created: new Date(),
              updated: new Date(),
            },
          ],
        }),
      )

      const requestBody = {
        randomizeQuestionOrder: true,
        randomizeAnswerOrder: true,
      }

      await supertest(app.getHttpServer())
        .put(`/api/games/${game._id}/settings`)
        .send(requestBody)
        .expect(401)
        .expect((res) => {
          expect(res.body).toHaveProperty('status', 401)
          expect(res.body).toHaveProperty('timestamp')
        })
    })

    it('should return 403 when authenticated user is not the host', async () => {
      const game = await gameModel.create(
        createMockGameDocument({
          currentTask: createMockLobbyTaskDocument({ status: 'active' }),
          participants: [
            {
              participantId: hostUser._id,
              type: GameParticipantType.HOST,
              created: new Date(),
              updated: new Date(),
            },
            {
              participantId: playerUser._id,
              type: GameParticipantType.PLAYER,
              nickname: 'PlayerNick',
              rank: 0,
              worstRank: 0,
              totalScore: 0,
              currentStreak: 0,
              totalResponseTime: 0,
              responseCount: 0,
              created: new Date(),
              updated: new Date(),
            },
          ],
          settings: {
            shouldAutoCompleteQuestionResultTask: false,
            shouldAutoCompleteLeaderboardTask: false,
            shouldAutoCompletePodiumTask: false,
            randomizeQuestionOrder: false,
            randomizeAnswerOrder: false,
          },
        }),
      )

      const playerToken = await authenticateGame(
        app,
        game._id,
        playerUser._id,
        GameParticipantType.PLAYER,
      )

      const requestBody = {
        randomizeQuestionOrder: true,
        randomizeAnswerOrder: true,
      }

      await supertest(app.getHttpServer())
        .put(`/api/games/${game._id}/settings`)
        .set({ Authorization: `Bearer ${playerToken}` })
        .send(requestBody)
        .expect(403)
        .expect((res) => {
          expect(res.body).toHaveProperty('status', 403)
          expect(res.body).toHaveProperty('timestamp')
        })

      const unchangedGame = await gameModel.findById(game._id)
      expect(unchangedGame?.settings.randomizeQuestionOrder).toBe(false)
      expect(unchangedGame?.settings.randomizeAnswerOrder).toBe(false)
    })

    it('should return 404 when game does not exist', async () => {
      const nonExistentGameId = uuidv4()

      const hostToken = await authenticateGame(
        app,
        nonExistentGameId,
        hostUser._id,
        GameParticipantType.HOST,
      )

      const requestBody = {
        randomizeQuestionOrder: true,
        randomizeAnswerOrder: true,
      }

      await supertest(app.getHttpServer())
        .put(`/api/games/${nonExistentGameId}/settings`)
        .set({ Authorization: `Bearer ${hostToken}` })
        .send(requestBody)
        .expect(404)
        .expect((res) => {
          expect(res.body).toHaveProperty(
            'message',
            `Game not found by id '${nonExistentGameId}'`,
          )
          expect(res.body).toHaveProperty('status', 404)
          expect(res.body).toHaveProperty('timestamp')
        })
    })

    it('should return 400 validation error when randomizeQuestionOrder is not boolean', async () => {
      const game = await gameModel.create(
        createMockGameDocument({
          currentTask: createMockLobbyTaskDocument({ status: 'active' }),
          participants: [
            {
              participantId: hostUser._id,
              type: GameParticipantType.HOST,
              created: new Date(),
              updated: new Date(),
            },
          ],
        }),
      )

      const hostToken = await authenticateGame(
        app,
        game._id,
        hostUser._id,
        GameParticipantType.HOST,
      )

      const invalidRequestBody = {
        randomizeQuestionOrder: 'true',
        randomizeAnswerOrder: true,
      }

      await supertest(app.getHttpServer())
        .put(`/api/games/${game._id}/settings`)
        .set({ Authorization: `Bearer ${hostToken}` })
        .send(invalidRequestBody)
        .expect(400)
        .expect((res) => {
          expect(res.body).toHaveProperty('status', 400)
          expect(res.body).toHaveProperty('timestamp')
          expect(res.body.message).toContain('Validation failed')
        })
    })

    it('should return 400 validation error when randomizeAnswerOrder is not boolean', async () => {
      const game = await gameModel.create(
        createMockGameDocument({
          currentTask: createMockLobbyTaskDocument({ status: 'active' }),
          participants: [
            {
              participantId: hostUser._id,
              type: GameParticipantType.HOST,
              created: new Date(),
              updated: new Date(),
            },
          ],
        }),
      )

      const hostToken = await authenticateGame(
        app,
        game._id,
        hostUser._id,
        GameParticipantType.HOST,
      )

      const invalidRequestBody = {
        randomizeQuestionOrder: true,
        randomizeAnswerOrder: 1,
      }

      await supertest(app.getHttpServer())
        .put(`/api/games/${game._id}/settings`)
        .set({ Authorization: `Bearer ${hostToken}` })
        .send(invalidRequestBody)
        .expect(400)
        .expect((res) => {
          expect(res.body).toHaveProperty('status', 400)
          expect(res.body).toHaveProperty('timestamp')
          expect(res.body.message).toContain('Validation failed')
        })
    })

    it('should return 400 validation error when both fields have invalid types', async () => {
      const game = await gameModel.create(
        createMockGameDocument({
          currentTask: createMockLobbyTaskDocument({ status: 'active' }),
          participants: [
            {
              participantId: hostUser._id,
              type: GameParticipantType.HOST,
              created: new Date(),
              updated: new Date(),
            },
          ],
        }),
      )

      const hostToken = await authenticateGame(
        app,
        game._id,
        hostUser._id,
        GameParticipantType.HOST,
      )

      const invalidRequestBody = {
        randomizeQuestionOrder: 'not-a-boolean',
        randomizeAnswerOrder: 123,
      }

      await supertest(app.getHttpServer())
        .put(`/api/games/${game._id}/settings`)
        .set({ Authorization: `Bearer ${hostToken}` })
        .send(invalidRequestBody)
        .expect(400)
        .expect((res) => {
          expect(res.body).toHaveProperty('status', 400)
          expect(res.body).toHaveProperty('timestamp')
        })
    })
  })
})
