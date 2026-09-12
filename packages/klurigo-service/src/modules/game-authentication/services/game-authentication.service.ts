import {
  AuthGameRequestDto,
  AuthResponseDto,
  GameParticipantType,
  GameTokenDto,
  TokenScope,
} from '@klurigo/common'
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common'
import { v4 as uuidv4 } from 'uuid'

import { GameRepository } from '../../game-core/repositories'
import { GameDocument } from '../../game-core/repositories/models/schemas'
import { TokenService } from '../../token/services'

/**
 * Service responsible for authenticating participants into games.
 *
 * Determines participant identity and role (host or player),
 * validates game existence, and issues game-scoped JWT token pairs.
 */
@Injectable()
export class GameAuthenticationService {
  // Logger instance for recording service operations.
  private readonly logger: Logger = new Logger(GameAuthenticationService.name)

  /**
   * Creates a new GameAuthenticationService.
   *
   * @param gameRepository - Repository used to resolve active games by ID or PIN.
   * @param tokenService - Service used to issue signed JWT token pairs.
   */
  constructor(
    private readonly gameRepository: GameRepository,
    private readonly tokenService: TokenService,
  ) {}

  /**
   * Authenticate into a game by its UUID or 6-digit PIN.
   *
   * @param authGameRequest – DTO containing **either**
   *   - `gameId` (UUID) to identify the game by its unique ID, **or**
   *   - `gamePIN` (6-digit string) to identify the game by its PIN.
   * @param ipAddress - The client's IP address, used for logging and token metadata.
   * @param userAgent - The client's User-Agent string, used for logging and token metadata.
   * @param userId - Optional user ID to reuse (from a valid Game‐scoped user token).
   *                 If omitted, an anonymous participant ID is generated.
   * @returns Access + refresh tokens scoped to that game.
   */
  public async authenticateGame(
    authGameRequest: AuthGameRequestDto,
    ipAddress: string,
    userAgent: string,
    userId?: string,
    gameToken?: Pick<GameTokenDto, 'gameId' | 'sub'>,
  ): Promise<AuthResponseDto> {
    let game: GameDocument | undefined = undefined
    try {
      if (authGameRequest.gameId) {
        game = await this.gameRepository.findGameByIDOrThrow(
          authGameRequest.gameId,
        )
      } else if (authGameRequest.gamePIN) {
        game = await this.gameRepository.findGameByPINOrThrow(
          authGameRequest.gamePIN!,
        )
      }
    } catch (error) {
      const { message, stack } = error as Error
      this.logger.warn(
        `Failed to authenticate since an active game was not found: '${message}'.`,
        stack,
      )
      throw new UnauthorizedException()
    }

    if (!game) {
      this.logger.warn(
        `Failed to authenticate since an active game could not be found by either ID or PIN.`,
      )
      throw new UnauthorizedException()
    }

    const gameId = game._id

    const participantId =
      userId ||
      (gameToken?.gameId === gameId ? gameToken.sub : undefined) ||
      uuidv4()

    const existingParticipant = game.participants.find(
      (participant) => participant.participantId === participantId,
    )

    let participantType: GameParticipantType
    if (existingParticipant) {
      participantType = existingParticipant.type
    } else if (game.participants.length === 0) {
      participantType = GameParticipantType.HOST
    } else {
      participantType = GameParticipantType.PLAYER
    }

    this.logger.debug(
      `Authenticating game '${gameId}' and participant '${participantId}:${participantType}'.`,
    )

    return this.tokenService.signTokenPair(
      participantId,
      TokenScope.Game,
      ipAddress,
      userAgent,
      {
        gameId,
        participantType,
      },
    )
  }
}
