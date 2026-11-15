import type { GameParticipantIdentityDto } from './game-participant.dto'
import { GameStatus } from './game-status.enum'

/**
 * DTO representing the response structure for a created game.
 */
export interface CreateGameResponseDto {
  /**
   * Unique identifier for the created game.
   */
  id: string
}

/**
 * DTO representing the authenticated participant's basic game details.
 */
export interface GameDetailsDto {
  /**
   * Unique identifier for the game.
   */
  id: string

  /**
   * Current lifecycle status of the game.
   */
  status: GameStatus

  /** Present only for this authenticated identity after its first accepted join. */
  participant?: GameParticipantIdentityDto

  /**
   * Account bound to an unaccepted signed game identity, or null for a guest.
   * Older servers may omit this rollout hint. Accepted identities use participant.
   */
  joiningAccountId?: string | null
}
