import type { GameAvatarSnapshot } from './avatar'
import { GameParticipantType } from './game-participant-type.enum'

/**
 * Represents a player participant in a game.
 */
export type GameParticipantPlayerDto = {
  /**
   * The unique identifier of the participant.
   */
  readonly id: string

  /**
   * The nickname of the participant.
   */
  readonly nickname: string
  /** Optional during rollout; current servers always return a resolved snapshot. */
  readonly avatar?: GameAvatarSnapshot
}
/** Resolved identity of the authenticated participant, when already accepted. */
export interface GameParticipantIdentityDto {
  readonly id: string
  readonly type: GameParticipantType
  readonly nickname?: string
  readonly avatar: GameAvatarSnapshot
}
