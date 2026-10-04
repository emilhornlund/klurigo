import { Injectable, Logger } from '@nestjs/common'
import { OnEvent } from '@nestjs/event-emitter'

import {
  type GamePlayerJoinEvent,
  GamePlayerJoinEventKey,
} from '../../../app/shared/event/game-join.event'
import { UserRepository } from '../repositories'

/**
 * Listens to game events and performs user-related side-effects.
 *
 * Current responsibility:
 * - When a participant joins a game, persist the used nickname as the user's
 *   `defaultNickname` (best-effort).
 */
@Injectable()
export class GameEventListener {
  private readonly logger = new Logger(GameEventListener.name)

  /**
   * Creates a new listener instance.
   *
   * @param userRepository - Repository used to look up and update users.
   */
  constructor(private readonly userRepository: UserRepository) {}

  /**
   * Handles `game.player.join` events.
   *
   * If the joining participant exists as a user, the user's `defaultNickname` is
   * updated to match the nickname used when joining the game.
   *
   * @param event - The player join event payload.
   */
  @OnEvent(GamePlayerJoinEventKey)
  public async handleGamePlayerJoined(
    event: GamePlayerJoinEvent,
  ): Promise<void> {
    const user = await this.userRepository.findUserById(event.participantId)

    if (user) {
      try {
        await this.userRepository.update(user._id, {
          defaultNickname: event.nickname,
          updatedAt: new Date(),
        })
      } catch (error) {
        this.logger.error(
          `Failed to update default nickname '${event.nickname}' for user '${user._id}' and game '${event.gameId}'.`,
          error instanceof Error ? error.stack : String(error),
        )
      }
    }
  }
}
