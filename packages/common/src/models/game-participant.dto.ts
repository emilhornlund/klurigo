import type { CrittersAvatarConfigurationV1 } from './avatar'
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
  readonly avatar?: CrittersAvatarConfigurationV1
}

/** Resolved identity of the authenticated participant, when already accepted. */
export interface GameParticipantIdentityDto {
  /** Stable signed participant identifier; never inferred from avatar metadata. */
  readonly id: string
  /** Existing host/player role used for game authorization and presentation. */
  readonly type: GameParticipantType
  /** Player nickname; hosts do not gain a synthetic player nickname. */
  readonly nickname?: string
  /** Accepted game-time design, resolved to the default for legacy records. */
  readonly avatar: CrittersAvatarConfigurationV1
}
