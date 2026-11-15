import { AuthProvider, resolveGameAvatarSnapshot } from '@klurigo/common'
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
 * - After an accepted join, retain the nickname and account avatar preferences
 *   through the existing best-effort user update.
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
   * updated to match the nickname used when joining the game. Local and Google
   * accounts also retain the accepted avatar for future games. Anonymous users
   * retain the existing nickname behavior without persisting an account avatar.
   * Preference-update failures do not undo the accepted game snapshot.
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
          ...(user.authProvider !== AuthProvider.None
            ? { avatar: resolveGameAvatarSnapshot(event.avatar) }
            : {}),
          updatedAt: new Date(),
        })
      } catch (error) {
        this.logger.error(
          `Failed to update join preferences for user '${user._id}' and game '${event.gameId}'.`,
          error instanceof Error ? error.stack : String(error),
        )
      }
    }
  }
}
