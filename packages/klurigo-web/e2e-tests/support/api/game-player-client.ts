import {
  type AuthGameRequestDto,
  type AuthResponseDto,
  GameParticipantType,
  type GameTokenDto,
  type SubmitQuestionAnswerRequestDto,
  TokenScope,
} from '@klurigo/common'
import { jwtDecode } from 'jwt-decode'

import { GameSessionEventClient } from './game-event-client'

export type GamePlayerIdentity = {
  readonly gameId: string
  readonly participantId: string
}

/**
 * A wire-level client for one anonymous player in a Klurigo game.
 *
 * It intentionally only wraps the public game authentication, join, answer,
 * and SSE endpoints. Game progression remains the responsibility of the host
 * or another real participant.
 */
export class GamePlayerClient extends GameSessionEventClient {
  public constructor(apiBaseUrl: string) {
    super(
      apiBaseUrl,
      'player',
      'Authenticate and join a game before using this client',
    )
  }

  /**
   * Authenticates an anonymous player and joins the identified game.
   *
   * @returns The participant and game IDs decoded from the real game token.
   */
  public async authenticateAndJoin(
    target: AuthGameRequestDto,
    nickname: string,
  ): Promise<GamePlayerIdentity> {
    this.ensureOpen()
    this.validateAuthenticationTarget(target)

    if (this.hasSession()) {
      throw new Error('This game player client is already authenticated')
    }

    const authentication = await this.post<AuthResponseDto>('/auth/game', {
      body: target,
    })

    const token = authentication.accessToken
    const claims = jwtDecode<GameTokenDto>(token)

    if (
      claims.scope !== TokenScope.Game ||
      claims.participantType !== GameParticipantType.PLAYER ||
      !claims.gameId ||
      !claims.sub
    ) {
      throw new Error('Game authentication did not return a player token')
    }

    this.setSession(token, claims.gameId)

    await this.postNoContent(this.gamePath('players'), {
      body: { nickname },
      token,
    })

    return { gameId: claims.gameId, participantId: claims.sub }
  }

  /**
   * Submits one answer through the public game API.
   */
  public async submitAnswer(
    answer: SubmitQuestionAnswerRequestDto,
  ): Promise<void> {
    this.ensureOpen()
    const { accessToken } = this.requireSession()

    await this.postNoContent(this.gamePath('answers'), {
      body: answer,
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
