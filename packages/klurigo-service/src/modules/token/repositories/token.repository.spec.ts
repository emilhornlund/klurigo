import { TokenScope, TokenType } from '@klurigo/common'

import { TokenNotFoundException } from '../exceptions'

import type { Token } from './models/schemas'
import { TokenRepository } from './token.repository'

const makeToken = (overrides: Partial<Token> = {}): Token => ({
  _id: 'token-1',
  pairId: 'pair-1',
  type: TokenType.Access,
  scope: TokenScope.User,
  principalId: 'user-1',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  expiresAt: new Date('2026-01-02T00:00:00.000Z'),
  ...overrides,
})

describe(TokenRepository.name, () => {
  let repository: TokenRepository
  let createMock: jest.Mock
  let findByIdMock: jest.Mock
  let deleteManyMock: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    repository = Object.create(TokenRepository.prototype) as TokenRepository
    createMock = jest.fn()
    findByIdMock = jest.fn()
    deleteManyMock = jest.fn()
    Object.assign(repository, {
      create: createMock,
      findById: findByIdMock,
      deleteMany: deleteManyMock,
    })
  })

  it('delegates token creation to the base repository', async () => {
    const token = makeToken()
    createMock.mockResolvedValueOnce(token)

    await expect(repository.createToken(token)).resolves.toBe(token)
    expect(createMock).toHaveBeenCalledWith(token)
  })

  describe('findTokenByIdOrThrow', () => {
    it('returns an existing token', async () => {
      const token = makeToken()
      findByIdMock.mockResolvedValueOnce(token)

      await expect(repository.findTokenByIdOrThrow('token-1')).resolves.toBe(
        token,
      )
      expect(findByIdMock).toHaveBeenCalledWith('token-1')
    })

    it('throws TokenNotFoundException when the token is missing', async () => {
      findByIdMock.mockResolvedValueOnce(null)

      await expect(
        repository.findTokenByIdOrThrow('missing'),
      ).rejects.toBeInstanceOf(TokenNotFoundException)
    })
  })

  it('returns null from findTokenById when the base lookup does not find a token', async () => {
    findByIdMock.mockResolvedValueOnce(null)

    await expect(repository.findTokenById('missing')).resolves.toBeNull()
    expect(findByIdMock).toHaveBeenCalledWith('missing')
  })

  it('deletes all tokens in a pair', async () => {
    deleteManyMock.mockResolvedValueOnce(2)

    await expect(repository.deleteTokensByPairId('pair-1')).resolves.toBe(2)
    expect(deleteManyMock).toHaveBeenCalledWith({ pairId: 'pair-1' })
  })

  it('revokes only user access and refresh tokens for a principal', async () => {
    deleteManyMock.mockResolvedValueOnce(2)

    await expect(
      repository.deleteUserAuthenticationTokensByPrincipalId('user-1'),
    ).resolves.toBe(2)

    expect(deleteManyMock).toHaveBeenCalledWith({
      principalId: 'user-1',
      scope: TokenScope.User,
      type: { $in: [TokenType.Access, TokenType.Refresh] },
    })
  })

  it('propagates base repository errors from deletion', async () => {
    deleteManyMock.mockRejectedValueOnce(new Error('database unavailable'))

    await expect(repository.deleteTokensByPairId('pair-1')).rejects.toThrow(
      'database unavailable',
    )
  })
})
