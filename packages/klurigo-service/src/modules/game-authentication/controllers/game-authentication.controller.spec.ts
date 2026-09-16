import {
  AuthGameRequestDto,
  Authority,
  AuthResponseDto,
  GameParticipantType,
  TokenDto,
  TokenScope,
} from '@klurigo/common'
import { UnauthorizedException } from '@nestjs/common'

import { TokenService } from '../../token/services'
import { GameAuthenticationService } from '../services'

import { GameAuthenticationController } from './game-authentication.controller'

describe(GameAuthenticationController.name, () => {
  let controller: GameAuthenticationController
  let gameAuthenticationService: jest.Mocked<
    Pick<GameAuthenticationService, 'authenticateGame'>
  >
  let tokenService: jest.Mocked<
    Pick<TokenService, 'verifyToken' | 'tokenExistsOrThrow'>
  >

  const response: AuthResponseDto = {
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
  }

  beforeEach(() => {
    gameAuthenticationService = {
      authenticateGame: jest.fn().mockResolvedValue(response),
    }
    tokenService = {
      verifyToken: jest.fn(),
      tokenExistsOrThrow: jest.fn().mockResolvedValue(undefined),
    }
    controller = new GameAuthenticationController(
      gameAuthenticationService as unknown as GameAuthenticationService,
      tokenService as unknown as TokenService,
    )
  })

  function makeToken(overrides?: Partial<TokenDto>): TokenDto {
    return {
      jti: 'token-id',
      sub: 'identity-id',
      exp: 1_800_000_000,
      scope: TokenScope.User,
      authorities: [Authority.Game],
      ...overrides,
    }
  }

  const request: AuthGameRequestDto = { gameId: 'game-id' }

  it('delegates anonymous authentication without an authorization header', async () => {
    gameAuthenticationService.authenticateGame.mockResolvedValue(response)

    await expect(
      controller.authenticateGame(request, 'ip', 'agent'),
    ).resolves.toBe(response)

    expect(gameAuthenticationService.authenticateGame).toHaveBeenCalledWith(
      request,
      'ip',
      'agent',
      undefined,
      undefined,
    )
    expect(tokenService.verifyToken).not.toHaveBeenCalled()
  })

  it('validates and reuses a user identity token', async () => {
    tokenService.verifyToken.mockResolvedValue(makeToken())

    await controller.authenticateGame(
      request,
      'ip',
      'agent',
      'Bearer user-token',
    )

    expect(tokenService.verifyToken).toHaveBeenCalledWith('user-token')
    expect(tokenService.tokenExistsOrThrow).not.toHaveBeenCalled()
    expect(gameAuthenticationService.authenticateGame).toHaveBeenCalledWith(
      request,
      'ip',
      'agent',
      'identity-id',
      undefined,
    )
  })

  it('validates and passes through a persisted game identity token', async () => {
    tokenService.verifyToken.mockResolvedValue(
      makeToken({
        scope: TokenScope.Game,
        authorities: [Authority.Game],
        gameId: 'game-id',
        sub: 'participant-id',
        participantType: GameParticipantType.PLAYER,
      }),
    )

    await controller.authenticateGame(
      request,
      'ip',
      'agent',
      'Bearer game-token',
    )

    expect(tokenService.tokenExistsOrThrow).toHaveBeenCalledWith('token-id')
    expect(gameAuthenticationService.authenticateGame).toHaveBeenCalledWith(
      request,
      'ip',
      'agent',
      undefined,
      { scope: TokenScope.Game, gameId: 'game-id', sub: 'participant-id' },
    )
  })

  it.each(['Basic token', 'Bearer', 'Bearer token extra', 'Bearer   '])(
    'rejects malformed authorization header %s',
    async (authorization) => {
      await expect(
        controller.authenticateGame(request, 'ip', 'agent', authorization),
      ).rejects.toBeInstanceOf(UnauthorizedException)
      expect(tokenService.verifyToken).not.toHaveBeenCalled()
      expect(gameAuthenticationService.authenticateGame).not.toHaveBeenCalled()
    },
  )

  it('rejects a token that cannot be verified', async () => {
    tokenService.verifyToken.mockRejectedValue(new Error('invalid token'))

    await expect(
      controller.authenticateGame(request, 'ip', 'agent', 'Bearer invalid'),
    ).rejects.toBeInstanceOf(UnauthorizedException)
    expect(gameAuthenticationService.authenticateGame).not.toHaveBeenCalled()
  })

  it('rejects a user token without game authority or identity claims', async () => {
    for (const token of [
      makeToken({ authorities: [] }),
      makeToken({ sub: undefined }),
    ]) {
      tokenService.verifyToken.mockResolvedValueOnce(token)

      await expect(
        controller.authenticateGame(
          request,
          'ip',
          'agent',
          'Bearer user-token',
        ),
      ).rejects.toBeInstanceOf(UnauthorizedException)
    }

    expect(tokenService.tokenExistsOrThrow).not.toHaveBeenCalled()
    expect(gameAuthenticationService.authenticateGame).not.toHaveBeenCalled()
  })

  it('rejects a malformed or unknown token scope', async () => {
    tokenService.verifyToken.mockResolvedValue(
      makeToken({ scope: 'UNKNOWN' as TokenScope }),
    )

    await expect(
      controller.authenticateGame(request, 'ip', 'agent', 'Bearer token'),
    ).rejects.toBeInstanceOf(UnauthorizedException)
    expect(gameAuthenticationService.authenticateGame).not.toHaveBeenCalled()
  })

  it('propagates authentication service errors', async () => {
    const error = new Error('authentication failed')
    gameAuthenticationService.authenticateGame.mockRejectedValue(error)

    await expect(
      controller.authenticateGame(request, 'ip', 'agent'),
    ).rejects.toBe(error)
  })
})
