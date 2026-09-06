import { GameEvent } from '@klurigo/common'

export type DistributedEvent = {
  gameId: string
  playerId?: string
  event: GameEvent
}
