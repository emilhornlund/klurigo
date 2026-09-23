import {
  type AuthGameRequestDto,
  type AuthLoginRequestDto,
  type AuthResponseDto,
  GameParticipantType,
  type GameTokenDto,
  TokenScope,
} from '@klurigo/common'
import { jwtDecode } from 'jwt-decode'

import { GameSessionEventClient } from './game-event-client'

export type GameHostIdentity = {
  readonly gameId: string
  readonly participantId: string
}

/**
 * A wire-level client for one authenticated host in an existing Klurigo game.
 *
 * It intentionally only wraps the public user login, game authentication,
 * host progression, and SSE endpoints. Game creation remains the
 * responsibility of the caller.
 */
export class GameHostClient extends GameSessionEventClient {
  public constructor(apiBaseUrl: string) {
    super(apiBaseUrl, 'host', 'Authenticate as a host before using this client')
  }

  /**
   * Logs in the host user and authenticates that user for an existing game.
   *
   * The user access token is sent to the public game-authentication endpoint;
   * the returned game access token is then used for all host game requests.
   *
   * @returns The host participant and game IDs decoded from the issued token.
   */
  public async authenticate(
    login: AuthLoginRequestDto,
    target: AuthGameRequestDto,
  ): Promise<GameHostIdentity> {
    this.ensureOpen()
    this.validateAuthenticationTarget(target)

    if (this.hasSession()) {
      throw new Error('This game host client is already authenticated')
    }

    const userAuthentication = await this.post<AuthResponseDto>('/auth/login', {
      body: login,
    })
    const gameAuthentication = await this.post<AuthResponseDto>('/auth/game', {
      body: target,
      token: userAuthentication.accessToken,
    })
    const token = gameAuthentication.accessToken
    const claims = jwtDecode<GameTokenDto>(token)

    if (
      claims.scope !== TokenScope.Game ||
      claims.participantType !== GameParticipantType.HOST ||
      !claims.gameId ||
      !claims.sub
    ) {
      throw new Error('Game authentication did not return a host token')
    }

    this.setSession(token, claims.gameId)

    return { gameId: claims.gameId, participantId: claims.sub }
  }

  /**
   * Completes the current active task through the public host endpoint.
   */
  public async completeCurrentTask(): Promise<void> {
    this.ensureOpen()
    const { accessToken } = this.requireSession()

    await this.postNoContent(this.gamePath('tasks/current/complete'), {
      token: accessToken,
    })
  }

  private validateAuthenticationTarget(target: AuthGameRequestDto): void {
    const hasGameId = Boolean(target.gameId)
    const hasGamePIN = Boolean(target.gamePIN)

    if (hasGameId === hasGamePIN) {
      throw new Error('Provide exactly one gameId or gamePIN')
    }
  }
}
