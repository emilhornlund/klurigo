import type { GameParticipantPlayerDto } from '@klurigo/common'
import { type FC, useEffect, useRef, useState } from 'react'

import {
  type NicknameChipAnimationState,
  Typography,
} from '../../../../../components'
import { ConfirmDialog, Modal, NicknameChip } from '../../../../../components'
import { useGameContext } from '../../../../../context/game'

import styles from './PlayerManagementModal.module.scss'

/**
 * Per-player animation configuration used by {@link PlayerManagementModal}.
 *
 * The key is the player's `id`. Each entry controls:
 * - `animationState`: Which animation class to apply to that player's {@link NicknameChip}.
 * - `staggerDelay`: Optional delay (in ms) to apply as `animationDelay` for staggered effects.
 */
interface PlayerAnimationState {
  [playerId: string]: {
    /**
     * The animation state applied to a player's {@link NicknameChip}.
     */
    animationState: NicknameChipAnimationState

    /**
     * Delay (in milliseconds) applied to the player's chip animation via inline style.
     */
    staggerDelay: number
  }
}

/**
 * Props for {@link PlayerManagementModal}.
 */
export type PlayerManagementModalProps = {
  /**
   * Whether the modal is open/visible.
   *
   * This is forwarded directly to the underlying {@link Modal}.
   */
  open?: boolean

  /**
   * Callback invoked when the modal should close (e.g. user clicks outside or presses close).
   *
   * This is forwarded directly to the underlying {@link Modal}.
   */
  onClose?: () => void
}

const REMOVE_SHAKE_DELAY_MS = 500

/**
 * Modal for viewing and removing players from an active game session.
 *
 * Responsibilities:
 * - Fetches current players via {@link useGameContext} (`getPlayers`) and renders them as {@link NicknameChip}s.
 * - Allows selecting a player for removal by clicking the chip delete button.
 * - Shows a {@link ConfirmDialog} to confirm removal.
 * - On confirmation, triggers a short "shake" animation for the selected player, then calls `leaveGame`.
 *
 * Fetch behavior:
 * - Only fetches players when `open` becomes true.
 * - Clears local state when `open` becomes false to avoid stale data on next open.
 *
 * Removal flow:
 * 1. User clicks delete on a chip -> `playerToRemove` is set.
 * 2. Confirm dialog opens (`open={!!playerToRemove}`).
 * 3. User confirms -> chip gets `shake` animation immediately.
 * 4. After 500ms:
 *    - Confirm dialog closes (clears `playerToRemove`),
 *    - `loading` is enabled,
 *    - `leaveGame(playerId)` is executed,
 *    - on success the player is removed from the local list,
 *    - optionally re-fetches players with `getPlayers()` to reconcile with backend truth,
 *    - `loading` is disabled when the promise settles.
 *
 * Timer cleanup:
 * - Any pending removal timeout is cleared on unmount and when closing the modal.
 */
const PlayerManagementModal: FC<PlayerManagementModalProps> = ({
  open,
  onClose,
}) => {
  /**
   * Game context API for retrieving players and removing players from the session.
   *
   * Note: `getPlayers` is optional in the context typing.
   */
  const { getPlayers, leaveGame } = useGameContext()

  /**
   * Current players in the session.
   */
  const [players, setPlayers] = useState<GameParticipantPlayerDto[]>([])

  /**
   * The player currently selected for removal.
   *
   * When set, the confirm dialog becomes visible. When cleared, the dialog closes.
   */
  const [playerToRemove, setPlayerToRemove] = useState<{
    id: string
    nickname: string
  }>()

  /**
   * True while an actual removal request is in flight.
   *
   * This is used to drive the `loading` prop of the confirm dialog.
   */
  const [isRemovingPlayer, setIsRemovingPlayer] = useState<boolean>(false)

  /**
   * Per-player animation overrides applied to {@link NicknameChip}.
   */
  const [playerAnimations, setPlayerAnimations] =
    useState<PlayerAnimationState>({})

  /**
   * Tracks a pending removal timer so it can be cleaned up.
   */
  const removeTimerRef = useRef<number | null>(null)

  /**
   * Clears any pending removal timeout.
   */
  const clearRemoveTimer = () => {
    if (removeTimerRef.current !== null) {
      window.clearTimeout(removeTimerRef.current)
      removeTimerRef.current = null
    }
  }

  /**
   * Fetch players when the modal is opened.
   *
   * - No-op when `open` is false.
   * - Uses optional chaining because `getPlayers` is optional.
   */
  useEffect(() => {
    if (!open) {
      clearRemoveTimer()
      setPlayers([])
      setPlayerAnimations({})
      setPlayerToRemove(undefined)
      setIsRemovingPlayer(false)
      return
    }

    let cancelled = false

    getPlayers?.().then((fetched) => {
      if (!cancelled) {
        setPlayers(fetched)
      }
    })

    return () => {
      cancelled = true
      clearRemoveTimer()
    }
  }, [open, getPlayers])

  /**
   * Confirms removal of the selected player.
   *
   * - If no player is selected, this is a no-op.
   * - Applies a "shake" animation to the selected player's chip immediately.
   * - After 500ms, closes the dialog and triggers the actual `leaveGame` call.
   * - On success, updates the local list and optionally re-fetches to reconcile.
   */
  const handleRemovePlayer = () => {
    if (!playerToRemove) return

    const selected = playerToRemove

    setPlayerAnimations((prev) => ({
      ...prev,
      [selected.id]: {
        animationState: 'shake',
        staggerDelay: 0,
      },
    }))

    clearRemoveTimer()

    removeTimerRef.current = window.setTimeout(() => {
      setPlayerToRemove(undefined)
      setIsRemovingPlayer(true)

      leaveGame?.(selected.id)
        .then(async () => {
          setPlayers((prev) => prev.filter((p) => p.id !== selected.id))

          if (getPlayers) {
            const refreshed = await getPlayers()
            setPlayers(refreshed)
          }
        })
        .finally(() => setIsRemovingPlayer(false))
    }, REMOVE_SHAKE_DELAY_MS)
  }

  return (
    <Modal title="Who’s Playing?" size="large" open={open} onClose={onClose}>
      <div className={styles.playerManagementModal}>
        <Typography variant="body2" align="left" color="default">
          Here’s everyone in the game. If someone shouldn’t be here, you can
          politely show them the exit.
        </Typography>

        <div className={styles.flow}>
          {players.map(({ id, nickname }) => (
            <NicknameChip
              key={id}
              value={nickname}
              variant="accent"
              animationState={playerAnimations[id]?.animationState || 'none'}
              staggerDelay={playerAnimations[id]?.staggerDelay || 0}
              onDelete={() => setPlayerToRemove({ id, nickname })}
            />
          ))}
        </div>
      </div>

      <ConfirmDialog
        title="Kick from the Game?"
        message={`This will remove ${playerToRemove?.nickname} from the game. They’ll need to rejoin if they want back in.`}
        open={!!playerToRemove}
        confirmTitle="Remove Player"
        loading={isRemovingPlayer}
        onConfirm={handleRemovePlayer}
        onClose={() => setPlayerToRemove(undefined)}
        destructive
      />
    </Modal>
  )
}

export default PlayerManagementModal
