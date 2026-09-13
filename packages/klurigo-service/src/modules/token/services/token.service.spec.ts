import { JwtService } from '@nestjs/jwt'

import { TokenRepository } from '../repositories'

import { TokenService } from './token.service'

describe(TokenService.name, () => {
  let service: TokenService
  let tokenRepository: {
    findTokenById: jest.Mock
    deleteTokensByPairId: jest.Mock
    deleteUserAuthenticationTokensByPrincipalId: jest.Mock
  }
  let jwtService: { decode: jest.Mock }

  beforeEach(() => {
    tokenRepository = {
      findTokenById: jest.fn(),
      deleteTokensByPairId: jest.fn(),
      deleteUserAuthenticationTokensByPrincipalId: jest.fn(),
    }
    jwtService = { decode: jest.fn() }
    service = new TokenService(
      tokenRepository as unknown as TokenRepository,
      jwtService as unknown as JwtService,
    )
  })

  describe('revoke', () => {
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
