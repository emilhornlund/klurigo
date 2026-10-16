import { Authority, TokenScope } from '@klurigo/common'
import { INestApplication } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import supertest from 'supertest'
import { v4 as uuidv4 } from 'uuid'

import {
  MOCK_DEFAULT_HASHED_PASSWORD,
  MOCK_PRIMARY_PASSWORD,
  MOCK_PRIMARY_USER_DEFAULT_NICKNAME,
  MOCK_PRIMARY_USER_EMAIL,
  MOCK_PRIMARY_USER_FAMILY_NAME,
  MOCK_PRIMARY_USER_GIVEN_NAME,
  MOCK_SECONDARY_PASSWORD,
  MOCK_SECONDARY_USER_EMAIL,
} from '../../../../test-utils/data'
import {
  cleanupTestApp,
  createBearerAuthHeader,
  createDefaultUserAndAuthenticate,
  createTestApp,
} from '../../../../test-utils/utils'
import { AuthService } from '../../authentication/services'
import { TokenService } from '../../token/services'
import { LocalUser, UserRepository } from '../repositories'

describe('UserAuthController (e2e)', () => {
  let app: INestApplication
  let userRepository: UserRepository
  let authService: AuthService
  let tokenService: TokenService
  let jwtService: JwtService

  beforeEach(async () => {
    app = await createTestApp()
    userRepository = app.get<UserRepository>(UserRepository)
    authService = app.get<AuthService>(AuthService)
    tokenService = app.get<TokenService>(TokenService)
    jwtService = app.get(JwtService)
  })

  afterEach(async () => {
    await cleanupTestApp(app)
  })

  describe('/api/auth/email/verify (POST)', () => {
    it('should verify a user email successfully', async () => {
      const { _id: userId, email } = await userRepository.createLocalUser({
        email: MOCK_PRIMARY_USER_EMAIL,
        unverifiedEmail: MOCK_PRIMARY_USER_EMAIL,
        hashedPassword: MOCK_DEFAULT_HASHED_PASSWORD,
        givenName: MOCK_PRIMARY_USER_GIVEN_NAME,
        familyName: MOCK_PRIMARY_USER_FAMILY_NAME,
        defaultNickname: MOCK_PRIMARY_USER_DEFAULT_NICKNAME,
      })

      const accessToken = await tokenService.signVerifyEmailToken(userId, email)

      return supertest(app.getHttpServer())
        .post('/api/auth/email/verify')
        .set(createBearerAuthHeader(accessToken))
        .send()
        .expect(204)
        .expect((res) => {
          expect(res.body).toEqual({})
        })
    })

    it('should return 400 when email does not match the unverified email', async () => {
      const { _id: userId } = await userRepository.createLocalUser({
        email: MOCK_PRIMARY_USER_EMAIL,
        unverifiedEmail: MOCK_PRIMARY_USER_EMAIL,
        hashedPassword: MOCK_DEFAULT_HASHED_PASSWORD,
        givenName: MOCK_PRIMARY_USER_GIVEN_NAME,
        familyName: MOCK_PRIMARY_USER_FAMILY_NAME,
        defaultNickname: MOCK_PRIMARY_USER_DEFAULT_NICKNAME,
      })

      const accessToken = await tokenService.signVerifyEmailToken(
        userId,
        MOCK_SECONDARY_USER_EMAIL,
      )

      return supertest(app.getHttpServer())
        .post('/api/auth/email/verify')
        .set(createBearerAuthHeader(accessToken))
        .send()
        .expect(400)
        .expect((res) => {
          expect(res.body).toEqual({
            message: 'Email does not match',
            status: 400,
            timestamp: expect.anything(),
          })
        })
    })

    it('should return 401 when the authorization has expired', async () => {
      const { _id: userId, email } = await userRepository.createLocalUser({
        email: MOCK_PRIMARY_USER_EMAIL,
        unverifiedEmail: MOCK_PRIMARY_USER_EMAIL,
        hashedPassword: MOCK_DEFAULT_HASHED_PASSWORD,
        givenName: MOCK_PRIMARY_USER_GIVEN_NAME,
        familyName: MOCK_PRIMARY_USER_FAMILY_NAME,
        defaultNickname: MOCK_PRIMARY_USER_DEFAULT_NICKNAME,
      })

      const accessToken = await jwtService.signAsync(
        {
          scope: TokenScope.User,
          authorities: [Authority.VerifyEmail],
          email,
        },
        {
          jwtid: uuidv4(),
          subject: userId,
          expiresIn: '-1d',
        },
      )

      return supertest(app.getHttpServer())
        .post('/api/auth/email/verify')
        .set(createBearerAuthHeader(accessToken))
        .send()
        .expect(401)
        .expect((res) => {
          expect(res.body).toEqual({
            message: 'Invalid or expired token',
            status: 401,
            timestamp: expect.anything(),
          })
        })
    })

    it('should return 401 when malformed authorization', async () => {
      return supertest(app.getHttpServer())
        .post('/api/auth/email/verify')
        .set({ Authorization: 'Bearer garbage' })
        .send()
        .expect(401)
        .expect((res) => {
          expect(res.body).toEqual({
            message: 'Invalid or expired token',
            status: 401,
            timestamp: expect.anything(),
          })
        })
    })

    it('should return 401 when missing authorization header', async () => {
      return supertest(app.getHttpServer())
        .post('/api/auth/email/verify')
        .send()
        .expect(401)
        .expect((res) => {
          expect(res.body).toEqual({
            message: 'Missing Authorization header',
            status: 401,
            timestamp: expect.anything(),
          })
        })
    })

    it('should return 403 when missing required authority', async () => {
      const { accessToken } = await createDefaultUserAndAuthenticate(app, {
        unverifiedEmail: MOCK_PRIMARY_USER_EMAIL,
      } as Partial<LocalUser>)

      return supertest(app.getHttpServer())
        .post('/api/auth/email/verify')
        .set(createBearerAuthHeader(accessToken))
        .send()
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

  describe('/api/auth/email/resend_verification (POST)', () => {
    it('should resend the verification email successfully', async () => {
      const { accessToken } = await createDefaultUserAndAuthenticate(app, {
        unverifiedEmail: MOCK_PRIMARY_USER_EMAIL,
      } as Partial<LocalUser>)

      return supertest(app.getHttpServer())
        .post('/api/auth/email/resend_verification')
        .set(createBearerAuthHeader(accessToken))
        .send()
        .expect(204)
        .expect((res) => {
          expect(res.body).toEqual({})
        })
    })

    it('should return 401 when missing authorization header', async () => {
      return supertest(app.getHttpServer())
        .post('/api/auth/email/resend_verification')
        .send()
        .expect(401)
        .expect((res) => {
          expect(res.body).toEqual({
            message: 'Missing Authorization header',
            status: 401,
            timestamp: expect.anything(),
          })
        })
    })
  })

  describe('/api/auth/password/forgot (POST)', () => {
    it('should send a password reset email successfully', async () => {
      const { email } = await userRepository.createLocalUser({
        email: MOCK_PRIMARY_USER_EMAIL,
        hashedPassword: MOCK_DEFAULT_HASHED_PASSWORD,
        givenName: MOCK_PRIMARY_USER_GIVEN_NAME,
        familyName: MOCK_PRIMARY_USER_FAMILY_NAME,
        defaultNickname: MOCK_PRIMARY_USER_DEFAULT_NICKNAME,
      })

      return supertest(app.getHttpServer())
        .post('/api/auth/password/forgot')
        .send({ email })
        .expect(204)
        .expect((res) => {
          expect(res.body).toEqual({})
        })
    })

    it('should return successfully when a user was not found by email', async () => {
      return supertest(app.getHttpServer())
        .post('/api/auth/password/forgot')
        .send({ email: 'non-existent-email@example.com' })
        .expect(204)
        .expect((res) => {
          expect(res.body).toEqual({})
        })
    })

    it('returns the same response for a non-local account and an unknown email', async () => {
      await userRepository.createGoogleUser({
        email: MOCK_PRIMARY_USER_EMAIL,
        googleUserId: 'google-account-1',
        givenName: MOCK_PRIMARY_USER_GIVEN_NAME,
        familyName: MOCK_PRIMARY_USER_FAMILY_NAME,
        defaultNickname: MOCK_PRIMARY_USER_DEFAULT_NICKNAME,
      })

      const nonLocalResponse = await supertest(app.getHttpServer())
        .post('/api/auth/password/forgot')
        .send({ email: MOCK_PRIMARY_USER_EMAIL.toUpperCase() })
        .expect(204)
      const unknownResponse = await supertest(app.getHttpServer())
        .post('/api/auth/password/forgot')
        .send({ email: 'unknown@example.com' })
        .expect(204)

      expect(nonLocalResponse.body).toEqual(unknownResponse.body)
      expect(nonLocalResponse.body).toEqual({})
    })

    it('should return 400 bad request when email validation fails', async () => {
      return supertest(app.getHttpServer())
        .post('/api/auth/password/forgot')
        .send({ email: 'invalid-email' })
        .expect(400)
        .expect((res) => {
          expect(res.body).toEqual({
            message: 'Validation failed',
            status: 400,
            timestamp: expect.any(String),
            validationErrors: [
              {
                constraints: {
                  matches: 'Email must be a valid address.',
                },
                property: 'email',
              },
            ],
          })
        })
    })
  })

  describe('/api/auth/password/reset (POST)', () => {
    it('should update the user’s password successfully', async () => {
      const { _id: userId } = await userRepository.createLocalUser({
        email: MOCK_PRIMARY_USER_EMAIL,
        hashedPassword: MOCK_DEFAULT_HASHED_PASSWORD,
        givenName: MOCK_PRIMARY_USER_GIVEN_NAME,
        familyName: MOCK_PRIMARY_USER_FAMILY_NAME,
        defaultNickname: MOCK_PRIMARY_USER_DEFAULT_NICKNAME,
      })

      const accessToken = await tokenService.signPasswordResetToken(userId)

      const { refreshToken } = await authService.login(
        {
          email: MOCK_PRIMARY_USER_EMAIL,
          password: MOCK_PRIMARY_PASSWORD,
        },
        '0.0.0.0',
        'mock-user-agent',
      )

      await supertest(app.getHttpServer())
        .patch('/api/auth/password/reset')
        .set(createBearerAuthHeader(accessToken))
        .send({ password: MOCK_SECONDARY_PASSWORD })
        .expect(204)
        .expect((res) => {
          expect(res.body).toEqual({})
        })

      await supertest(app.getHttpServer())
        .post('/api/auth/refresh')
        .set({ 'User-Agent': 'mock-user-agent' })
        .send({ refreshToken })
        .expect(401)

      await supertest(app.getHttpServer())
        .post('/api/auth/login')
        .set('User-Agent', 'mock-user-agent')
        .send({
          email: MOCK_PRIMARY_USER_EMAIL.toUpperCase(),
          password: MOCK_SECONDARY_PASSWORD,
        })
        .expect(200)

      await supertest(app.getHttpServer())
        .post('/api/auth/login')
        .set('User-Agent', 'mock-user-agent')
        .send({
          email: MOCK_PRIMARY_USER_EMAIL,
          password: MOCK_PRIMARY_PASSWORD,
        })
        .expect(400)

      await supertest(app.getHttpServer())
        .patch('/api/auth/password/reset')
        .set(createBearerAuthHeader(accessToken))
        .send({ password: MOCK_SECONDARY_PASSWORD })
        .expect(401)

      await supertest(app.getHttpServer())
        .post('/api/auth/login')
        .set('User-Agent', 'mock-user-agent')
        .send({
          email: MOCK_PRIMARY_USER_EMAIL,
          password: MOCK_SECONDARY_PASSWORD,
        })
        .expect(200)

      await supertest(app.getHttpServer())
        .post('/api/auth/login')
        .set('User-Agent', 'mock-user-agent')
        .send({
          email: MOCK_PRIMARY_USER_EMAIL,
          password: MOCK_PRIMARY_PASSWORD,
        })
        .expect(400)
    })

    it('restores the old password and leaves the reset token usable if token consumption fails', async () => {
      const { _id: userId } = await userRepository.createLocalUser({
        email: MOCK_PRIMARY_USER_EMAIL,
        hashedPassword: MOCK_DEFAULT_HASHED_PASSWORD,
        givenName: MOCK_PRIMARY_USER_GIVEN_NAME,
        familyName: MOCK_PRIMARY_USER_FAMILY_NAME,
        defaultNickname: MOCK_PRIMARY_USER_DEFAULT_NICKNAME,
      })
      const accessToken = await tokenService.signPasswordResetToken(userId)
      const consumeSpy = jest
        .spyOn(tokenService, 'consumePasswordResetToken')
        .mockRejectedValueOnce(new Error('temporary token-store failure'))

      await supertest(app.getHttpServer())
        .patch('/api/auth/password/reset')
        .set(createBearerAuthHeader(accessToken))
        .send({ password: MOCK_SECONDARY_PASSWORD })
        .expect(500)

      await supertest(app.getHttpServer())
        .post('/api/auth/login')
        .set('User-Agent', 'mock-user-agent')
        .send({
          email: MOCK_PRIMARY_USER_EMAIL,
          password: MOCK_PRIMARY_PASSWORD,
        })
        .expect(200)

      await supertest(app.getHttpServer())
        .post('/api/auth/login')
        .set('User-Agent', 'mock-user-agent')
        .send({
          email: MOCK_PRIMARY_USER_EMAIL,
          password: MOCK_SECONDARY_PASSWORD,
        })
        .expect(400)

      consumeSpy.mockRestore()
      await supertest(app.getHttpServer())
        .patch('/api/auth/password/reset')
        .set(createBearerAuthHeader(accessToken))
        .send({ password: MOCK_SECONDARY_PASSWORD })
        .expect(204)
    })

    it('does not consume the reset token when persisting the password fails', async () => {
      const { _id: userId } = await userRepository.createLocalUser({
        email: MOCK_PRIMARY_USER_EMAIL,
        hashedPassword: MOCK_DEFAULT_HASHED_PASSWORD,
        givenName: MOCK_PRIMARY_USER_GIVEN_NAME,
        familyName: MOCK_PRIMARY_USER_FAMILY_NAME,
        defaultNickname: MOCK_PRIMARY_USER_DEFAULT_NICKNAME,
      })
      const accessToken = await tokenService.signPasswordResetToken(userId)
      const updateSpy = jest
        .spyOn(userRepository, 'updateLocalUserPassword')
        .mockRejectedValueOnce(new Error('temporary database failure'))

      await supertest(app.getHttpServer())
        .patch('/api/auth/password/reset')
        .set(createBearerAuthHeader(accessToken))
        .send({ password: MOCK_SECONDARY_PASSWORD })
        .expect(500)

      await authService.login(
        {
          email: MOCK_PRIMARY_USER_EMAIL,
          password: MOCK_PRIMARY_PASSWORD,
        },
        '0.0.0.0',
        'mock-user-agent',
      )

      updateSpy.mockRestore()
      await supertest(app.getHttpServer())
        .patch('/api/auth/password/reset')
        .set(createBearerAuthHeader(accessToken))
        .send({ password: MOCK_SECONDARY_PASSWORD })
        .expect(204)
    })

    it('should return 401 when the authorization has expired', async () => {
      const { _id: userId } = await userRepository.createLocalUser({
        email: MOCK_PRIMARY_USER_EMAIL,
        hashedPassword: MOCK_DEFAULT_HASHED_PASSWORD,
        givenName: MOCK_PRIMARY_USER_GIVEN_NAME,
        familyName: MOCK_PRIMARY_USER_FAMILY_NAME,
        defaultNickname: MOCK_PRIMARY_USER_DEFAULT_NICKNAME,
      })

      const accessToken = await jwtService.signAsync(
        {
          scope: TokenScope.User,
          authorities: [Authority.ResetPassword],
        },
        {
          jwtid: uuidv4(),
          subject: userId,
          expiresIn: '-1d',
        },
      )

      await supertest(app.getHttpServer())
        .patch('/api/auth/password/reset')
        .set(createBearerAuthHeader(accessToken))
        .send({ password: MOCK_SECONDARY_PASSWORD })
        .expect(401)
        .expect((res) => {
          expect(res.body).toEqual({
            message: 'Invalid or expired token',
            status: 401,
            timestamp: expect.anything(),
          })
        })

      return supertest(app.getHttpServer())
        .post('/api/auth/login')
        .set('User-Agent', 'mock-user-agent')
        .send({
          email: MOCK_PRIMARY_USER_EMAIL,
          password: MOCK_PRIMARY_PASSWORD,
        })
        .expect(200)
    })

    it('should return 401 when malformed authorization', async () => {
      await userRepository.createLocalUser({
        email: MOCK_PRIMARY_USER_EMAIL,
        hashedPassword: MOCK_DEFAULT_HASHED_PASSWORD,
        givenName: MOCK_PRIMARY_USER_GIVEN_NAME,
        familyName: MOCK_PRIMARY_USER_FAMILY_NAME,
        defaultNickname: MOCK_PRIMARY_USER_DEFAULT_NICKNAME,
      })

      await supertest(app.getHttpServer())
        .patch('/api/auth/password/reset')
        .set({ Authorization: 'Bearer garbage' })
        .send()
        .expect(401)
        .expect((res) => {
          expect(res.body).toEqual({
            message: 'Invalid or expired token',
            status: 401,
            timestamp: expect.anything(),
          })
        })

      return supertest(app.getHttpServer())
        .post('/api/auth/login')
        .set('User-Agent', 'mock-user-agent')
        .send({
          email: MOCK_PRIMARY_USER_EMAIL,
          password: MOCK_PRIMARY_PASSWORD,
        })
        .expect(200)
    })

    it('should return 401 when missing authorization header', async () => {
      return supertest(app.getHttpServer())
        .patch('/api/auth/password/reset')
        .send()
        .expect(401)
        .expect((res) => {
          expect(res.body).toEqual({
            message: 'Missing Authorization header',
            status: 401,
            timestamp: expect.anything(),
          })
        })
    })

    it('should return 403 when missing required authority', async () => {
      const { accessToken } = await createDefaultUserAndAuthenticate(app)

      return supertest(app.getHttpServer())
        .patch('/api/auth/password/reset')
        .set(createBearerAuthHeader(accessToken))
        .send()
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
