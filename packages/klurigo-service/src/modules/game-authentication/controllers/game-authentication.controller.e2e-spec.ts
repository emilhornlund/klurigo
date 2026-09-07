import { GameParticipantType, GameTokenDto, TokenScope } from '@klurigo/common'
import { INestApplication } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { getModelToken } from '@nestjs/mongoose'
import { Response } from 'superagent'
import supertest from 'supertest'
import { v4 as uuidv4 } from 'uuid'

import {
  createMockGameDocument,
  createMockGameHostParticipantDocument,
} from '../../../../test-utils/data'
import {
  closeTestApp,
  createDefaultUserAndAuthenticate,
  createTestApp,
  resetTestState,
} from '../../../../test-utils/utils'
import {
  DEFAULT_GAME_AUTHORITIES,
  DEFAULT_REFRESH_AUTHORITIES,
} from '../../../app/shared/token'
import { Game, GameModel } from '../../game-core/repositories/models/schemas'

const MOCK_USER_AGENT = 'mock-user-agent'

describe('GameAuthenticationController (e2e)', () => {
  let app: INestApplication
  let jwtService: JwtService
  let gameModel: GameModel

  beforeEach(async () => {
    app = await createTestApp()
    jwtService = app.get(JwtService)
    gameModel = app.get<GameModel>(getModelToken(Game.name))
  })

  afterEach(async () => {
    try {
      await resetTestState(app)
    } finally {
      await closeTestApp(app)
    }
  })

  describe('/api/auth/game (POST)', () => {
    it('should succeed in authenticating a user participant using a game id', async () => {
      const { accessToken, user } = await createDefaultUserAndAuthenticate(app)

      const game = await gameModel.create(createMockGameDocument())

      return supertest(app.getHttpServer())
        .post('/api/auth/game')
        .set({
          'User-Agent': MOCK_USER_AGENT,
          Authorization: `Bearer ${accessToken}`,
        })
        .send({ gameId: game._id })
        .expect(200)
        .expect((res) => {
          expectGameTokenPair(game._id, GameParticipantType.HOST, res, user._id)
        })
    })

    it('should succeed in authenticating a user participant using a game PIN', async () => {
      const { accessToken, user } = await createDefaultUserAndAuthenticate(app)

      const game = await gameModel.create(createMockGameDocument())

      return supertest(app.getHttpServer())
        .post('/api/auth/game')
        .set({
          'User-Agent': MOCK_USER_AGENT,
          Authorization: `Bearer ${accessToken}`,
        })
        .send({ gamePIN: game.pin })
        .expect(200)
        .expect((res) => {
          expectGameTokenPair(game._id, GameParticipantType.HOST, res, user._id)
        })
    })

    it('should succeed in authenticating an anonymous participant using a game id', async () => {
      const game = await gameModel.create(
        createMockGameDocument({
          participants: [createMockGameHostParticipantDocument()],
        }),
      )

      return supertest(app.getHttpServer())
        .post('/api/auth/game')
        .set({ 'User-Agent': MOCK_USER_AGENT })
        .send({ gameId: game._id })
        .expect(200)
        .expect((res) => {
          expectGameTokenPair(game._id, GameParticipantType.PLAYER, res)
        })
    })

    it('should succeed in authenticating an anonymous participant using a game PIN', async () => {
      const game = await gameModel.create(
        createMockGameDocument({
          participants: [createMockGameHostParticipantDocument()],
        }),
      )

      return supertest(app.getHttpServer())
        .post('/api/auth/game')
        .set({ 'User-Agent': MOCK_USER_AGENT })
        .send({ gamePIN: game.pin })
        .expect(200)
        .expect((res) => {
          expectGameTokenPair(game._id, GameParticipantType.PLAYER, res)
        })
    })

    it('should return 400 error when game id validation fails', async () => {
      return supertest(app.getHttpServer())
        .post('/api/auth/game')
        .set({ 'User-Agent': MOCK_USER_AGENT })
        .send({ gameId: 'non-uuid' })
        .expect(400)
        .expect((res) => {
          expect(res.body).toEqual({
            message: 'Validation failed',
            status: 400,
            timestamp: expect.any(String),
            validationErrors: [
              {
                constraints: {
                  isUuid: 'gameId must be a UUID',
                },
                property: 'gameId',
              },
            ],
          })
        })
    })

    it('should return 400 error when game PIN validation fails', async () => {
      return supertest(app.getHttpServer())
        .post('/api/auth/game')
        .set({ 'User-Agent': MOCK_USER_AGENT })
        .send({ gamePIN: 'XXXXXX' })
        .expect(400)
        .expect((res) => {
          expect(res.body).toEqual({
            message: 'Validation failed',
            status: 400,
            timestamp: expect.any(String),
            validationErrors: [
              {
                constraints: {
                  matches: 'gamePIN must be a valid game PIN.',
                },
                property: 'gamePIN',
              },
            ],
          })
        })
    })

    it('should return 400 error when no request payload is provided', async () => {
      return supertest(app.getHttpServer())
        .post('/api/auth/game')
        .set({ 'User-Agent': MOCK_USER_AGENT })
        .send()
        .expect(400)
        .expect((res) => {
          expect(res.body).toEqual({
            message: 'Missing request payload',
            status: 400,
            timestamp: expect.any(String),
          })
        })
    })

    it('should return 400 error when no game id or game PIN are provided', async () => {
      return supertest(app.getHttpServer())
        .post('/api/auth/game')
        .set({ 'User-Agent': MOCK_USER_AGENT })
        .send({ gameId: undefined, gamePIN: undefined })
        .expect(400)
        .expect((res) => {
          expect(res.body).toEqual({
            message: 'Validation failed',
            status: 400,
            timestamp: expect.any(String),
            validationErrors: [
              {
                constraints: {
                  isUuid: 'gameId must be a UUID',
                },
                property: 'gameId',
              },
              {
                constraints: {
                  matches: 'gamePIN must be a valid game PIN.',
                },
                property: 'gamePIN',
              },
            ],
          })
        })
    })

    it('should return 400 bad request when missing user agent', async () => {
      return supertest(app.getHttpServer())
        .post('/api/auth/game')
        .send({ gamePIN: '123456' })
        .expect(400)
        .expect((res) => {
          expect(res.body).toEqual({
            message: 'Validation failed',
            status: 400,
            timestamp: expect.any(String),
            validationErrors: [
              {
                constraints: {
                  notEmpty: 'User agent is required.',
                },
                property: 'user-agent',
              },
            ],
          })
        })
    })

    it('should return 401 error when an active game was not found by game id', async () => {
      return supertest(app.getHttpServer())
        .post('/api/auth/game')
        .set({ 'User-Agent': MOCK_USER_AGENT })
        .send({ gameId: uuidv4() })
        .expect(401)
        .expect((res) => {
          expect(res.body).toEqual({
            message: 'Unauthorized',
            status: 401,
            timestamp: expect.any(String),
          })
        })
    })

    it('should return 401 error when an active game was not found by game PIN', async () => {
      return supertest(app.getHttpServer())
        .post('/api/auth/game')
        .set({ 'User-Agent': MOCK_USER_AGENT })
        .send({ gamePIN: '123456' })
        .expect(401)
        .expect((res) => {
          expect(res.body).toEqual({
            message: 'Unauthorized',
            status: 401,
            timestamp: expect.any(String),
          })
        })
    })
  })

  function expectGameTokenPair(
    gameId: string,
    participantType: GameParticipantType,
    response: Response,
    participantId?: string,
  ) {
    expect(response.body).toEqual({
      accessToken: expect.any(String),
      refreshToken: expect.any(String),
    })

    const accessTokenDto = jwtService.verify<GameTokenDto>(
      response.body.accessToken,
    )
    expect(accessTokenDto.jti).toEqual(expect.any(String))
    expect(accessTokenDto.sub).toEqual(participantId || expect.any(String))
    expect(accessTokenDto.scope).toEqual(TokenScope.Game)
    expect(accessTokenDto.authorities).toEqual(DEFAULT_GAME_AUTHORITIES)
    expect(accessTokenDto.gameId).toEqual(gameId)
    expect(accessTokenDto.participantType).toEqual(participantType)

    const refreshTokenDto = jwtService.verify<GameTokenDto>(
      response.body.refreshToken,
    )
    expect(refreshTokenDto.jti).toEqual(expect.any(String))
    expect(refreshTokenDto.sub).toEqual(participantId || expect.any(String))
    expect(refreshTokenDto.scope).toEqual(TokenScope.Game)
    expect(refreshTokenDto.authorities).toEqual(DEFAULT_REFRESH_AUTHORITIES)
    expect(refreshTokenDto.gameId).toEqual(gameId)
    expect(refreshTokenDto.participantType).toEqual(participantType)
  }
})
