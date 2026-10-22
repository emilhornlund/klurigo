import { Authority, TokenScope, TokenType } from '@klurigo/common'
import { UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'

import { TokenRepository } from '../repositories'

import { TokenService } from './token.service'

describe(TokenService.name, () => {
  let service: TokenService
  let tokenRepository: {
    createToken: jest.Mock
    findTokenById: jest.Mock
    findTokenByIdOrThrow: jest.Mock
    deleteTokensByPairId: jest.Mock
    deleteUserAuthenticationTokensByPrincipalId: jest.Mock
  }
  let jwtService: {
    decode: jest.Mock
    signAsync: jest.Mock
    verifyAsync: jest.Mock
  }

  beforeEach(() => {
    tokenRepository = {
      createToken: jest.fn(),
      findTokenById: jest.fn(),
      findTokenByIdOrThrow: jest.fn(),
      deleteTokensByPairId: jest.fn(),
      deleteUserAuthenticationTokensByPrincipalId: jest.fn(),
    }
    jwtService = {
      decode: jest.fn(),
      signAsync: jest.fn(),
      verifyAsync: jest.fn(),
    }
    service = new TokenService(
      tokenRepository as unknown as TokenRepository,
      jwtService as unknown as JwtService,
    )
  })

  describe('signTokenPair', () => {
    it('signs and persists access and refresh tokens with a shared pair ID', async () => {
      jwtService.signAsync
        .mockResolvedValueOnce('access.jwt')
        .mockResolvedValueOnce('refresh.jwt')
      tokenRepository.createToken.mockResolvedValue({})

      await expect(
        service.signTokenPair('user-1', TokenScope.User, '192.0.2.1', 'agent'),
      ).resolves.toEqual({
        accessToken: 'access.jwt',
        refreshToken: 'refresh.jwt',
      })

      const accessSign = jwtService.signAsync.mock.calls[0]
      const refreshSign = jwtService.signAsync.mock.calls[1]
      expect(accessSign[0]).toMatchObject({
        scope: TokenScope.User,
        authorities: expect.arrayContaining([Authority.User]),
      })
      expect(accessSign[1]).toMatchObject({
        subject: 'user-1',
        expiresIn: expect.any(String),
      })
      expect(refreshSign[0]).toMatchObject({
        scope: TokenScope.User,
        authorities: expect.arrayContaining([Authority.RefreshAuth]),
      })
      expect(refreshSign[1]).toMatchObject({
        subject: 'user-1',
        expiresIn: expect.any(String),
      })
      expect(accessSign[1].jwtid).not.toBe(refreshSign[1].jwtid)

      const [accessRecord, refreshRecord] =
        tokenRepository.createToken.mock.calls.map(([record]) => record)
      expect(accessRecord).toMatchObject({
        _id: accessSign[1].jwtid,
        type: TokenType.Access,
        scope: TokenScope.User,
        principalId: 'user-1',
        ipAddress: '192.0.2.1',
        userAgent: 'agent',
      })
      expect(refreshRecord).toMatchObject({
        _id: refreshSign[1].jwtid,
        type: TokenType.Refresh,
        pairId: accessRecord.pairId,
      })
      expect(accessRecord.pairId).toEqual(expect.any(String))
      expect(accessRecord.expiresAt).toBeInstanceOf(Date)
      expect(refreshRecord.expiresAt).toBeInstanceOf(Date)
    })

    it('preserves extra game claims on both tokens', async () => {
      jwtService.signAsync
        .mockResolvedValueOnce('access.jwt')
        .mockResolvedValueOnce('refresh.jwt')
      tokenRepository.createToken.mockResolvedValue({})

      await service.signTokenPair(
        'player-1',
        TokenScope.Game,
        '192.0.2.2',
        'game-agent',
        { gameId: 'game-1', participantType: 'HOST' },
      )

      expect(jwtService.signAsync).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          gameId: 'game-1',
          participantType: 'HOST',
        }),
        expect.any(Object),
      )
      expect(jwtService.signAsync).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          gameId: 'game-1',
          participantType: 'HOST',
        }),
        expect.any(Object),
      )
    })
  })

  describe('single-purpose tokens', () => {
    it('signs email verification tokens without persisting them', async () => {
      jwtService.signAsync.mockResolvedValue('verify.jwt')

      await expect(
        service.signVerifyEmailToken('user-1', 'user@example.com'),
      ).resolves.toBe('verify.jwt')
      expect(jwtService.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          scope: TokenScope.User,
          authorities: [Authority.VerifyEmail],
          email: 'user@example.com',
        }),
        expect.objectContaining({ subject: 'user-1', expiresIn: '72h' }),
      )
      expect(tokenRepository.createToken).not.toHaveBeenCalled()
    })

    it('persists password-reset tokens and consumes them by pair ID', async () => {
      jwtService.signAsync.mockResolvedValue('reset.jwt')
      tokenRepository.createToken.mockResolvedValue({})

      await expect(service.signPasswordResetToken('user-1')).resolves.toBe(
        'reset.jwt',
      )
      const [record] = tokenRepository.createToken.mock.calls[0]
      expect(record).toMatchObject({
        _id: expect.any(String),
        pairId: expect.any(String),
        type: TokenType.PasswordReset,
        scope: TokenScope.User,
        principalId: 'user-1',
      })
      expect(record.pairId).toBe(record._id)
      expect(record.expiresAt).toBeInstanceOf(Date)

      await service.consumePasswordResetToken(record._id)
      expect(tokenRepository.deleteTokensByPairId).toHaveBeenCalledWith(
        record._id,
      )
    })
  })

  describe('verifyToken', () => {
    it('returns valid claims from JwtService', async () => {
      const payload = {
        sub: 'user-1',
        jti: 'jti-1',
        scope: TokenScope.User,
        authorities: [Authority.User],
      }
      jwtService.verifyAsync.mockResolvedValue(payload)

      await expect(service.verifyToken('valid.jwt')).resolves.toBe(payload)
      expect(jwtService.verifyAsync).toHaveBeenCalledWith('valid.jwt')
    })

    it('maps invalid and expired JWTs to UnauthorizedException without exposing details', async () => {
      jwtService.verifyAsync.mockRejectedValue(
        new Error('jwt expired; secret-password must not escape'),
      )

      await expect(service.verifyToken('expired.jwt')).rejects.toBeInstanceOf(
        UnauthorizedException,
      )
      try {
        await service.verifyToken('expired.jwt')
      } catch (error) {
        expect((error as Error).message).toBe('Unauthorized')
        expect((error as Error).message).not.toContain('secret-password')
      }
    })
  })

  describe('tokenExistsOrThrow', () => {
    it('accepts persisted tokens', async () => {
      tokenRepository.findTokenByIdOrThrow.mockResolvedValue({ _id: 'jti-1' })

      await expect(service.tokenExistsOrThrow('jti-1')).resolves.toBeUndefined()
      expect(tokenRepository.findTokenByIdOrThrow).toHaveBeenCalledWith('jti-1')
    })

    it('maps missing-token and database failures to UnauthorizedException', async () => {
      const logger = jest.spyOn((service as any).logger, 'debug')
      tokenRepository.findTokenByIdOrThrow.mockRejectedValue(
        new Error('database unavailable'),
      )

      await expect(service.tokenExistsOrThrow('jti-1')).rejects.toBeInstanceOf(
        UnauthorizedException,
      )
      expect(logger).toHaveBeenCalledWith(
        expect.stringContaining('Unable to retrieve existing token'),
        expect.any(String),
      )
      logger.mockRestore()
    })
  })

  describe('revoke', () => {
    it('deletes both members of the persisted token pair', async () => {
      jwtService.decode.mockReturnValue({ jti: 'jti-1' })
      tokenRepository.findTokenById.mockResolvedValue({ pairId: 'pair-1' })
      tokenRepository.deleteTokensByPairId.mockResolvedValue(2)

      await expect(service.revoke('valid.jwt')).resolves.toBeUndefined()

      expect(tokenRepository.findTokenById).toHaveBeenCalledWith('jti-1')
      expect(tokenRepository.deleteTokensByPairId).toHaveBeenCalledWith(
        'pair-1',
      )
    })

    it('does not delete a pair when the token is absent from persistence', async () => {
      jwtService.decode.mockReturnValue({ jti: 'jti-1' })
      tokenRepository.findTokenById.mockResolvedValue(null)

      await expect(service.revoke('valid.jwt')).resolves.toBeUndefined()
      expect(tokenRepository.deleteTokensByPairId).not.toHaveBeenCalled()
    })

    it('rethrows persistence errors after logging them', async () => {
      jwtService.decode.mockReturnValue({ jti: 'jti-1' })
      tokenRepository.findTokenById.mockResolvedValue({ pairId: 'pair-1' })
      tokenRepository.deleteTokensByPairId.mockRejectedValue(
        new Error('database unavailable'),
      )

      await expect(service.revoke('refresh-token')).rejects.toThrow(
        'database unavailable',
      )

      expect(tokenRepository.deleteTokensByPairId).toHaveBeenCalledWith(
        'pair-1',
      )
    })

    it('logs and rethrows database lookup errors without changing the error contract', async () => {
      const logger = jest.spyOn((service as any).logger, 'debug')
      jwtService.decode.mockReturnValue({ jti: 'jti-1' })
      tokenRepository.findTokenById.mockRejectedValue(
        new Error('database unavailable'),
      )

      await expect(service.revoke('valid.jwt')).rejects.toThrow(
        'database unavailable',
      )
      expect(logger).toHaveBeenCalledWith(
        expect.stringContaining('Failed to revoke token'),
        expect.any(String),
      )
      expect(tokenRepository.deleteTokensByPairId).not.toHaveBeenCalled()
      logger.mockRestore()
    })
  })

  describe('revokeUserAuthenticationTokens', () => {
    it('delegates revocation to the token repository', async () => {
      await service.revokeUserAuthenticationTokens('user-123')

      expect(
        tokenRepository.deleteUserAuthenticationTokensByPrincipalId,
      ).toHaveBeenCalledWith('user-123')
    })
  })
})
