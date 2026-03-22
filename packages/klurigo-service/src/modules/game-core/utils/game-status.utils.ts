import { GameStatus } from '@klurigo/common'

import { GameDocument } from '../repositories/models/schemas'

/**
 * Returns `true` if the game has ended due to expiry or early termination by the host.
 *
 * @param game - The game document to check.
 * @returns `true` when the game status is `Expired` or `Terminated`, otherwise `false`.
 */
export function isGameEnded(game: GameDocument): boolean {
  return (
    game.status === GameStatus.Expired || game.status === GameStatus.Terminated
  )
}
