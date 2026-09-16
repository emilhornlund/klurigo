import {
  AuthGameRequestDto,
  AuthResponseDto,
  GameParticipantType,
  GameTokenDto,
  TokenScope,
} from '@klurigo/common'
import { UnauthorizedException } from '@nestjs/common'

import {
  createMockGameDocument,
  createMockGamePlayerParticipantDocument,
} from '../../../../test-utils/data'
import { GameRepository } from '../../game-core/repositories'
import type { GameDocument } from '../../game-core/repositories/models/schemas'
import { TokenService } from '../../token/services'

import { GameAuthenticationService } from './game-authentication.service'

describe(GameAuthenticationService.name, () => {
  let service: GameAuthenticationService
  let gameRepository: jest.Mocked<
    Pick<GameRepository, 'findGameByIDOrThrow' | 'findGameByPINOrThrow'>
  >
  let tokenService: jest.Mocked<Pick<TokenService, 'signTokenPair'>>

  const response: AuthResponseDto = {
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
  }

  beforeEach(() => {
    gameRepository = {
      findGameByIDOrThrow: jest.fn(),
      findGameByPINOrThrow: jest.fn(),
    }
    tokenService = { signTokenPair: jest.fn().mockResolvedValue(response) }
    service = new GameAuthenticationService(
      gameRepository as unknown as GameRepository,
      tokenService as unknown as TokenService,
    )
  })

  function mockGame(overrides?: Parameters<typeof createMockGameDocument>[0]) {
    return createMockGameDocument(overrides) as unknown as GameDocument
  }

  it('authenticates by game ID and assigns the first participant as host', async () => {
    const game = mockGame()
    gameRepository.findGameByIDOrThrow.mockResolvedValue(game)

    await expect(
      service.authenticateGame({ gameId: game._id }, '127.0.0.1', 'test-agent'),
    ).resolves.toBe(response)

    expect(gameRepository.findGameByIDOrThrow).toHaveBeenCalledWith(game._id)
    expect(tokenService.signTokenPair).toHaveBeenCalledWith(
      expect.any(String),
      TokenScope.Game,
      '127.0.0.1',
      'test-agent',
      { gameId: game._id, participantType: GameParticipantType.HOST },
    )
  })

  it('authenticates by game PIN and assigns later participants as players', async () => {
    const game = mockGame({
      participants: [createMockGamePlayerParticipantDocument()],
    })
    gameRepository.findGameByPINOrThrow.mockResolvedValue(game)

    await service.authenticateGame({ gamePIN: game.pin }, 'ip', 'agent')

    expect(gameRepository.findGameByPINOrThrow).toHaveBeenCalledWith(game.pin)
    expect(tokenService.signTokenPair).toHaveBeenCalledWith(
      expect.any(String),
      TokenScope.Game,
      'ip',
      'agent',
      { gameId: game._id, participantType: GameParticipantType.PLAYER },
    )
  })

  it('preserves an existing participant type and identity', async () => {
    const participantId = 'known-participant'
    const game = mockGame({
      participants: [
        createMockGamePlayerParticipantDocument({ participantId }),
      ],
    })
    gameRepository.findGameByIDOrThrow.mockResolvedValue(game)

    await service.authenticateGame(
      { gameId: game._id },
      'ip',
      'agent',
      participantId,
    )

    expect(tokenService.signTokenPair).toHaveBeenCalledWith(
      participantId,
      TokenScope.Game,
      'ip',
      'agent',
      { gameId: game._id, participantType: GameParticipantType.PLAYER },
    )
  })

  it('reuses a matching game token identity but ignores a token for another game', async () => {
    const game = mockGame()
    const gameToken: Pick<GameTokenDto, 'gameId' | 'sub'> = {
      gameId: game._id,
      sub: 'anonymous-participant',
    }
    gameRepository.findGameByIDOrThrow.mockResolvedValue(game)

    await service.authenticateGame(
      { gameId: game._id },
      'ip',
      'agent',
      undefined,
      gameToken,
    )
    expect(tokenService.signTokenPair).toHaveBeenCalledWith(
      gameToken.sub,
      TokenScope.Game,
      'ip',
      'agent',
      expect.any(Object),
    )

    tokenService.signTokenPair.mockClear()
    await service.authenticateGame(
      { gameId: game._id },
      'ip',
      'agent',
      undefined,
      { gameId: 'another-game', sub: gameToken.sub },
    )
    expect(tokenService.signTokenPair.mock.calls[0][0]).not.toBe(gameToken.sub)
  })

  it('rejects a request without a game identifier', async () => {
    await expect(
      service.authenticateGame({} satisfies AuthGameRequestDto, 'ip', 'agent'),
    ).rejects.toBeInstanceOf(UnauthorizedException)
    expect(gameRepository.findGameByIDOrThrow).not.toHaveBeenCalled()
    expect(gameRepository.findGameByPINOrThrow).not.toHaveBeenCalled()
  })

  it('normalizes game lookup errors as unauthorized', async () => {
    gameRepository.findGameByIDOrThrow.mockRejectedValue(new Error('not found'))

    await expect(
      service.authenticateGame({ gameId: 'game-id' }, 'ip', 'agent'),
    ).rejects.toBeInstanceOf(UnauthorizedException)
    expect(tokenService.signTokenPair).not.toHaveBeenCalled()
  })

  it('propagates token issuance errors after a successful lookup', async () => {
    const game = mockGame()
    gameRepository.findGameByIDOrThrow.mockResolvedValue(game)
    const error = new Error('token service unavailable')
    tokenService.signTokenPair.mockRejectedValue(error)

    await expect(
      service.authenticateGame({ gameId: game._id }, 'ip', 'agent'),
    ).rejects.toBe(error)
  })
})
