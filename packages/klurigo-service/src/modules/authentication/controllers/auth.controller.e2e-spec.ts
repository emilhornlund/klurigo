import {
  GameParticipantType,
  GameTokenDto,
  TokenDto,
  TokenScope,
} from '@klurigo/common'
import { INestApplication } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { getModelToken } from '@nestjs/mongoose'
import type { Response } from 'superagent'
import supertest from 'supertest'
import { v4 as uuidv4 } from 'uuid'

import {
  buildMockPrimaryGoogleUser,
  buildMockPrimaryUser,
  createMockGameDocument,
  MOCK_PRIMARY_GOOGLE_USER_ID,
  MOCK_PRIMARY_INVALID_PASSWORD,
  MOCK_PRIMARY_PASSWORD,
  MOCK_PRIMARY_USER_EMAIL,
  MOCK_SECONDARY_PASSWORD,
  MOCK_WEAK_PASSWORD,
} from '../../../../test-utils/data'
import {
  MOCK_GOOGLE_VALID_CODE,
  MOCK_GOOGLE_VALID_CODE_VERIFIER,
} from '../../../../test-utils/data/google-auth.data'
import {
  cleanupTestApp,
  createBearerAuthHeader,
  createTestApp,
  expectErrorResponse,
} from '../../../../test-utils/utils'
import {
  DEFAULT_GAME_AUTHORITIES,
  DEFAULT_REFRESH_AUTHORITIES,
  DEFAULT_USER_AUTHORITIES,
} from '../../../app/shared/token'
import { GameAuthenticationService } from '../../game-authentication/services'
import { Game, GameModel } from '../../game-core/repositories/models/schemas'
import { TokenService } from '../../token/services'
import { User, UserModel } from '../../user/repositories'
import { AuthService } from '../services'

const MOCK_IP_ADDRESS = '0.0.0.0'
const MOCK_USER_AGENT = 'mock-user-agent'

describe('AuthController (e2e)', () => {
  let app: INestApplication
  let jwtService: JwtService
  let authService: AuthService
  let gameAuthenticationService: GameAuthenticationService
  let tokenService: TokenService
  let userModel: UserModel
  let gameModel: GameModel

  beforeEach(async () => {
    app = await createTestApp()
    jwtService = app.get(JwtService)
    authService = app.get<AuthService>(AuthService)
    gameAuthenticationService = app.get<GameAuthenticationService>(
      GameAuthenticationService,
    )
    tokenService = app.get<TokenService>(TokenService)
    userModel = app.get<UserModel>(getModelToken(User.name))
    gameModel = app.get<GameModel>(getModelToken(Game.name))
  })

  afterEach(async () => {
    await cleanupTestApp(app)
  })

  describe('/api/auth/login (POST)', () => {
    it('should succeed in authenticating a user', async () => {
      const user = await userModel.create(buildMockPrimaryUser())

      return supertest(app.getHttpServer())
        .post('/api/auth/login')
        .set('User-Agent', MOCK_USER_AGENT)
        .send({
          email: MOCK_PRIMARY_USER_EMAIL,
          password: MOCK_PRIMARY_PASSWORD,
        })
        .expect(200)
        .expect((res) => {
          expectUserTokenPair(user._id, res)
        })
    })

    it('should return 400 bad request when email not found', async () => {
      return supertest(app.getHttpServer())
        .post('/api/auth/login')
        .set('User-Agent', MOCK_USER_AGENT)
        .send({
          email: MOCK_PRIMARY_USER_EMAIL,
          password: MOCK_PRIMARY_PASSWORD,
        })
        .expect(400)
        .expect((res) =>
          expectErrorResponse(res, {
            message: 'Bad credentials',
            status: 400,
          }),
        )
    })

    it('should return 400 bad request when password is invalid', async () => {
      return supertest(app.getHttpServer())
        .post('/api/auth/login')
        .set('User-Agent', MOCK_USER_AGENT)
        .send({
          email: MOCK_PRIMARY_USER_EMAIL,
          password: MOCK_PRIMARY_INVALID_PASSWORD,
        })
        .expect(400)
        .expect((res) =>
          expectErrorResponse(res, {
            message: 'Bad credentials',
            status: 400,
          }),
        )
    })

    it('should return 400 bad request when validation fails', async () => {
      return supertest(app.getHttpServer())
        .post('/api/auth/login')
        .set('User-Agent', MOCK_USER_AGENT)
        .send({})
        .expect(400)
        .expect((res) =>
          expectErrorResponse(res, {
            message: 'Validation failed',
            status: 400,
            validationErrors: [
              {
                constraints: {
                  matches: 'Email must be a valid address.',
                  maxLength:
                    'email must be shorter than or equal to 128 characters',
                  minLength:
                    'email must be longer than or equal to 6 characters',
                },
                property: 'email',
              },
              {
                constraints: {
                  matches:
                    'Password must include ≥2 uppercase, ≥2 lowercase, ≥2 digits, ≥2 symbols.',
                  maxLength:
                    'password must be shorter than or equal to 128 characters',
                  minLength:
                    'password must be longer than or equal to 8 characters',
                },
                property: 'password',
              },
            ],
          }),
        )
    })

    it('should return 400 bad request when missing user agent', async () => {
      return supertest(app.getHttpServer())
        .post('/api/auth/login')
        .send({})
        .expect(400)
        .expect((res) =>
          expectErrorResponse(res, {
            message: 'Validation failed',
            status: 400,
            validationErrors: [
              {
                constraints: {
                  notEmpty: 'User agent is required.',
                },
                property: 'user-agent',
              },
            ],
          }),
        )
    })
  })

  describe('/api/auth/google/exchange (POST)', () => {
    it('should successfully authenticate a new google user', async () => {
      return supertest(app.getHttpServer())
        .post('/api/auth/google/exchange')
        .set('User-Agent', MOCK_USER_AGENT)
        .send({
          code: MOCK_GOOGLE_VALID_CODE,
          codeVerifier: MOCK_GOOGLE_VALID_CODE_VERIFIER,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual({
            accessToken: expect.any(String),
            refreshToken: expect.any(String),
          })
        })
    })

    it('should successfully authenticate an existing google user', async () => {
      await userModel.create(
        buildMockPrimaryGoogleUser({
          googleUserId: MOCK_PRIMARY_GOOGLE_USER_ID,
          email: MOCK_PRIMARY_USER_EMAIL,
        }),
      )

      return supertest(app.getHttpServer())
        .post('/api/auth/google/exchange')
        .set('User-Agent', MOCK_USER_AGENT)
        .send({
          code: MOCK_GOOGLE_VALID_CODE,
          codeVerifier: MOCK_GOOGLE_VALID_CODE_VERIFIER,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual({
            accessToken: expect.any(String),
            refreshToken: expect.any(String),
          })
        })
    })

    it('should return 409 conflict when the email is already registered', async () => {
      await userModel.create(
        buildMockPrimaryUser({
          email: MOCK_PRIMARY_USER_EMAIL,
        }),
      )

      return supertest(app.getHttpServer())
        .post('/api/auth/google/exchange')
        .set('User-Agent', MOCK_USER_AGENT)
        .send({
          code: MOCK_GOOGLE_VALID_CODE,
          codeVerifier: MOCK_GOOGLE_VALID_CODE_VERIFIER,
        })
        .expect(409)
        .expect((res) => {
          expect(res.body).toEqual({
            message: 'Email already exists',
            status: 409,
            timestamp: expect.any(String),
          })
        })
    })

    it('should return 400 bad request when validation fails', async () => {
      return supertest(app.getHttpServer())
        .post('/api/auth/google/exchange')
        .set('User-Agent', MOCK_USER_AGENT)
        .send({})
        .expect(400)
        .expect((res) => {
          expect(res.body).toEqual({
            message: 'Validation failed',
            status: 400,
            timestamp: expect.any(String),
            validationErrors: [
              {
                constraints: {
                  matches:
                    'Invalid code format. Only URL-safe characters (“A–Z”, “a–z”, “0–9”, “-”, “_”, “/”) are allowed.',
                  maxLength: 'Code must be at most 512 characters long.',
                  minLength: 'Code must be at least 10 characters long.',
                },
                property: 'code',
              },
              {
                constraints: {
                  matches:
                    'Invalid code verifier format. Only unreserved URI characters (“A–Z”, “a–z”, “0–9”, “-”, “.”, “_”, “~”) are allowed.',
                  maxLength:
                    'Code verifier must be at most 128 characters long.',
                  minLength:
                    'Code verifier must be at least 43 characters long.',
                },
                property: 'codeVerifier',
              },
            ],
          })
        })
    })

    it('should return 400 bad request when missing user agent', async () => {
      return supertest(app.getHttpServer())
        .post('/api/auth/google/exchange')
        .send({})
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
  })

  describe('/api/auth/refresh (POST)', () => {
    it('should succeed in refresh an existing authentication', async () => {
      const user = await userModel.create(buildMockPrimaryUser())

      const { refreshToken } = await authService.login(
        {
          email: MOCK_PRIMARY_USER_EMAIL,
          password: MOCK_PRIMARY_PASSWORD,
        },
        MOCK_IP_ADDRESS,
        MOCK_USER_AGENT,
      )

      return supertest(app.getHttpServer())
        .post('/api/auth/refresh')
        .set({ 'User-Agent': MOCK_USER_AGENT })
        .send({
          refreshToken,
        })
        .expect(200)
        .expect((res) => {
          expectUserTokenPair(user._id, res)
        })
    })

    it('should succeed in refresh an existing authentication for a game', async () => {
      const game = await gameModel.create(createMockGameDocument())

      const userId = uuidv4()

      const { refreshToken } = await gameAuthenticationService.authenticateGame(
        { gamePIN: game.pin },
        MOCK_IP_ADDRESS,
        MOCK_USER_AGENT,
        userId,
      )

      return supertest(app.getHttpServer())
        .post('/api/auth/refresh')
        .set({ 'User-Agent': MOCK_USER_AGENT })
        .send({
          refreshToken,
        })
        .expect(200)
        .expect((res) => {
          expectGameTokenPair(game._id, GameParticipantType.HOST, res, userId)
        })
    })

    it('should return 401 unauthorized when token has expired', async () => {
      const refreshToken = await jwtService.signAsync(
        { authorities: DEFAULT_REFRESH_AUTHORITIES },
        { subject: uuidv4(), expiresIn: '-1d' },
      )

      return supertest(app.getHttpServer())
        .post('/api/auth/refresh')
        .set({ 'User-Agent': MOCK_USER_AGENT })
        .send({
          refreshToken,
        })
        .expect(401)
        .expect((res) => {
          expect(res.body).toEqual({
            message: 'Unauthorized',
            status: 401,
            timestamp: expect.any(String),
          })
        })
    })

    it('should return 401 unauthorized when token already revoked', async () => {
      const game = await gameModel.create(createMockGameDocument())

      const userId = uuidv4()

      const { refreshToken } = await gameAuthenticationService.authenticateGame(
        { gamePIN: game.pin },
        MOCK_IP_ADDRESS,
        MOCK_USER_AGENT,
        userId,
      )

      await tokenService.revoke(refreshToken)

      return supertest(app.getHttpServer())
        .post('/api/auth/refresh')
        .set({ 'User-Agent': MOCK_USER_AGENT })
        .send({
          refreshToken,
        })
        .expect(401)
        .expect((res) => {
          expect(res.body).toEqual({
            message: 'Unauthorized',
            status: 401,
            timestamp: expect.any(String),
          })
        })
    })

    it('should return 400 bad request when token is missing REFRESH_AUTH authority.', async () => {
      const refreshToken = await jwtService.signAsync(
        { authorities: [] },
        { subject: uuidv4(), expiresIn: '30d' },
      )

      return supertest(app.getHttpServer())
        .post('/api/auth/refresh')
        .set({ 'User-Agent': MOCK_USER_AGENT })
        .send({
          refreshToken,
        })
        .expect(401)
        .expect((res) => {
          expect(res.body).toEqual({
            message: 'Unauthorized',
            status: 401,
            timestamp: expect.any(String),
          })
        })
    })

    it('should return 400 bad request when validation fails', async () => {
      return supertest(app.getHttpServer())
        .post('/api/auth/refresh')
        .set({ 'User-Agent': MOCK_USER_AGENT })
        .send({
          refreshToken: 'invalid_jwt',
        })
        .expect(400)
        .expect((res) => {
          expect(res.body).toEqual({
            message: 'Validation failed',
            status: 400,
            timestamp: expect.any(String),
            validationErrors: [
              {
                constraints: {
                  isJwt: 'refreshToken must be a jwt string',
                },
                property: 'refreshToken',
              },
            ],
          })
        })
    })

    it('should return 400 bad request when missing user agent', async () => {
      return supertest(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({})
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
  })

  describe('/api/auth/revoke (POST)', () => {
    it('should succeed in revoking an existing user scope access token', async () => {
      await userModel.create(buildMockPrimaryUser())

      const { accessToken } = await authService.login(
        {
          email: MOCK_PRIMARY_USER_EMAIL,
          password: MOCK_PRIMARY_PASSWORD,
        },
        MOCK_IP_ADDRESS,
        MOCK_USER_AGENT,
      )

      return supertest(app.getHttpServer())
        .post('/api/auth/revoke')
        .set({
          'User-Agent': MOCK_USER_AGENT,
        })
        .send({
          token: accessToken,
        })
        .expect(204)
        .expect((res) => {
          expect(res.body).toEqual({})
        })
    })

    it('should succeed in revoking an existing user scope refresh token', async () => {
      await userModel.create(buildMockPrimaryUser())

      const { refreshToken } = await authService.login(
        {
          email: MOCK_PRIMARY_USER_EMAIL,
          password: MOCK_PRIMARY_PASSWORD,
        },
        MOCK_IP_ADDRESS,
        MOCK_USER_AGENT,
      )

      return supertest(app.getHttpServer())
        .post('/api/auth/revoke')
        .set({
          'User-Agent': MOCK_USER_AGENT,
        })
        .send({
          token: refreshToken,
        })
        .expect(204)
        .expect((res) => {
          expect(res.body).toEqual({})
        })
    })

    it('should succeed in revoking an existing game scope access token', async () => {
      const game = await gameModel.create(createMockGameDocument())

      const userId = uuidv4()

      const { accessToken } = await gameAuthenticationService.authenticateGame(
        { gamePIN: game.pin },
        MOCK_IP_ADDRESS,
        MOCK_USER_AGENT,
        userId,
      )

      return supertest(app.getHttpServer())
        .post('/api/auth/revoke')
        .set({ 'User-Agent': MOCK_USER_AGENT })
        .send({
          token: accessToken,
        })
        .expect(204)
        .expect((res) => {
          expect(res.body).toEqual({})
        })
    })

    it('should succeed in revoking an existing game scope refresh token', async () => {
      const game = await gameModel.create(createMockGameDocument())

      const userId = uuidv4()

      const { refreshToken } = await gameAuthenticationService.authenticateGame(
        { gamePIN: game.pin },
        MOCK_IP_ADDRESS,
        MOCK_USER_AGENT,
        userId,
      )

      return supertest(app.getHttpServer())
        .post('/api/auth/revoke')
        .set({ 'User-Agent': MOCK_USER_AGENT })
        .send({
          token: refreshToken,
        })
        .expect(204)
        .expect((res) => {
          expect(res.body).toEqual({})
        })
    })

    it('should return 400 bad request when validation fails', async () => {
      return supertest(app.getHttpServer())
        .post('/api/auth/revoke')
        .set({ 'User-Agent': MOCK_USER_AGENT })
        .send({
          token: 'invalid_jwt',
        })
        .expect(400)
        .expect((res) => {
          expect(res.body).toEqual({
            message: 'Validation failed',
            status: 400,
            timestamp: expect.any(String),
            validationErrors: [
              {
                constraints: {
                  isJwt: 'token must be a jwt string',
                },
                property: 'token',
              },
            ],
          })
        })
    })

    describe('/api/auth/password (PATCH)', () => {
      it('should succeed in changing password of an existing user', async () => {
        await userModel.create(buildMockPrimaryUser())

        const { accessToken } = await authService.login(
          {
            email: MOCK_PRIMARY_USER_EMAIL,
            password: MOCK_PRIMARY_PASSWORD,
          },
          MOCK_IP_ADDRESS,
          MOCK_USER_AGENT,
        )

        return supertest(app.getHttpServer())
          .patch('/api/auth/password')
          .set(createBearerAuthHeader(accessToken))
          .send({
            oldPassword: MOCK_PRIMARY_PASSWORD,
            newPassword: MOCK_SECONDARY_PASSWORD,
          })
          .expect(204)
          .expect((res) => {
            expect(res.body).toEqual({})
          })
      })

      it('should return 400 bad request when old password is incorrect', async () => {
        await userModel.create(buildMockPrimaryUser())

        const { accessToken } = await authService.login(
          {
            email: MOCK_PRIMARY_USER_EMAIL,
            password: MOCK_PRIMARY_PASSWORD,
          },
          MOCK_IP_ADDRESS,
          MOCK_USER_AGENT,
        )

        return supertest(app.getHttpServer())
          .patch('/api/auth/password')
          .set(createBearerAuthHeader(accessToken))
          .send({
            oldPassword: MOCK_SECONDARY_PASSWORD,
            newPassword: MOCK_PRIMARY_PASSWORD,
          })
          .expect(400)
          .expect((res) => {
            expect(res.body).toEqual({
              message: 'Old password is incorrect',
              status: 400,
              timestamp: expect.any(String),
            })
          })
      })

      it('should return 400 bad request when passwords are invalid', async () => {
        await userModel.create(buildMockPrimaryUser())

        const { accessToken } = await authService.login(
          {
            email: MOCK_PRIMARY_USER_EMAIL,
            password: MOCK_PRIMARY_PASSWORD,
          },
          MOCK_IP_ADDRESS,
          MOCK_USER_AGENT,
        )

        return supertest(app.getHttpServer())
          .patch('/api/auth/password')
          .set(createBearerAuthHeader(accessToken))
          .send({
            oldPassword: MOCK_WEAK_PASSWORD,
            newPassword: MOCK_WEAK_PASSWORD,
          })
          .expect(400)
          .expect((res) => {
            expect(res.body).toEqual({
              message: 'Validation failed',
              status: 400,
              timestamp: expect.any(String),
              validationErrors: [
                {
                  constraints: {
                    matches:
                      'Old password must include at least 2 uppercase letters, 2 lowercase letters, 2 digits, and 2 symbols.',
                  },
                  property: 'oldPassword',
                },
                {
                  constraints: {
                    matches:
                      'New password must include at least 2 uppercase letters, 2 lowercase letters, 2 digits, and 2 symbols.',
                  },
                  property: 'newPassword',
                },
              ],
            })
          })
      })

      it('should return 401 unauthorized when missing authorization', async () => {
        return supertest(app.getHttpServer())
          .patch('/api/auth/password')
          .send({
            oldPassword: MOCK_PRIMARY_PASSWORD,
            newPassword: MOCK_SECONDARY_PASSWORD,
          })
          .expect(401)
          .expect((res) => {
            expect(res.body).toEqual({
              message: 'Missing Authorization header',
              status: 401,
              timestamp: expect.any(String),
            })
          })
      })
    })
  })

  function expectUserTokenPair(userId: string | null, response: Response) {
    expect(response.body).toEqual({
      accessToken: expect.any(String),
      refreshToken: expect.any(String),
    })

    const accessTokenDto = jwtService.verify<TokenDto>(
      response.body.accessToken,
    )
    expect(accessTokenDto.jti).toEqual(expect.any(String))
    expect(accessTokenDto.sub).toEqual(userId || expect.any(String))
    expect(accessTokenDto.scope).toEqual(TokenScope.User)
    expect(accessTokenDto.authorities).toEqual(DEFAULT_USER_AUTHORITIES)

    const refreshTokenDto = jwtService.verify<TokenDto>(
      response.body.refreshToken,
    )
    expect(refreshTokenDto.jti).toEqual(expect.any(String))
    expect(refreshTokenDto.sub).toEqual(userId || expect.any(String))
    expect(refreshTokenDto.scope).toEqual(TokenScope.User)
    expect(refreshTokenDto.authorities).toEqual(DEFAULT_REFRESH_AUTHORITIES)
  }

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
