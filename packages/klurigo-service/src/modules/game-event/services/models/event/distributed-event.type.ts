import { GameEvent } from '@klurigo/common'

export type DistributedEvent = {
  gameId: string
  playerId?: string
  /** Revision of the persisted game state that produced this event. */
  version?: number
  event: GameEvent
}
