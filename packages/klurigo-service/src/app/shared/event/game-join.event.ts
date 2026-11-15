import type { CrittersAvatarConfigurationV1 } from '@klurigo/common'

/**
 * Event key emitted when a participant joins a game.
 *
 * Used with `@nestjs/event-emitter` to allow other modules to react to join events
 * without introducing hard dependencies on the game module.
 */
export const GamePlayerJoinEventKey = 'game.player.join'

/**
 * Payload for the `game.player.join` event.
 *
 * Emitted after a participant has successfully joined a game. Typical consumers
 * include user/profile side-effects such as persisting the participant's nickname.
 */
export type GamePlayerJoinEvent = {
  /**
   * The ID of the game that the participant joined.
   */
  gameId: string

  /**
   * The ID of the participant (user) that joined the game.
   */
  participantId: string

  /**
   * The nickname used by the participant when joining the game.
   */
  nickname: string

  /**
   * The complete avatar snapshot accepted for this participant in the game.
   */
  avatar: CrittersAvatarConfigurationV1
}
