import type { CrittersAvatarConfigurationV1 } from '@klurigo/common'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useKlurigoServiceClient } from '../../api'

/** Metadata and account-save state needed for a single first-join attempt. */
interface JoinSubmissionOptions {
  /** Game, participant, and account scope that owns this submission state. */
  readonly identityKey: string
  /** Game associated with the current signed participant. */
  readonly gameID?: string
  /** Complete chosen metadata shown in the preview. */
  readonly avatar?: CrittersAvatarConfigurationV1
  /** Edited account drafts must be saved before the game join. */
  readonly needsSave: boolean
  /** An earlier attempt already confirmed this design's profile write. */
  readonly hasSavedAccountDesign: boolean
  /** Resolves to the exact saved design and records its acknowledgement. */
  readonly commitAvatar: () => Promise<CrittersAvatarConfigurationV1>
}

/**
 * Orders profile saving before joining and prevents duplicate in-flight attempts.
 *
 * @param options - Signed game identity, draft, and acknowledged account-save state.
 * @returns Submission state, actionable failure feedback, and retry-safe actions.
 */
export function useGameJoinSubmission({
  identityKey,
  gameID,
  avatar,
  needsSave,
  hasSavedAccountDesign,
  commitAvatar,
}: JoinSubmissionOptions) {
  const { joinGame } = useKlurigoServiceClient()
  const navigate = useNavigate()
  const activeIdentity = useRef<{ key: string } | undefined>(undefined)
  const submitting = useRef(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string>()

  useEffect(() => {
    // A new owner invalidates earlier attempts even when the user returns to the same key.
    activeIdentity.current = { key: identityKey }
    submitting.current = false
    setBusy(false)
    setMessage(undefined)

    return () => {
      activeIdentity.current = undefined
    }
  }, [identityKey])

  /** Sends the nickname and acknowledged design without repeating a confirmed save. */
  const submit = async (nickname: string) => {
    const owner = activeIdentity.current
    const isCurrentIdentity = () =>
      owner?.key === identityKey && activeIdentity.current === owner

    if (!gameID || !avatar || submitting.current || !isCurrentIdentity()) return

    submitting.current = true
    setBusy(true)
    setMessage(undefined)

    let saved = hasSavedAccountDesign
    let joining = false

    try {
      const chosen = needsSave ? await commitAvatar() : avatar
      if (!isCurrentIdentity()) return

      saved ||= needsSave
      joining = true

      await joinGame(gameID, nickname, chosen)

      if (isCurrentIdentity()) navigate('/game')
    } catch {
      if (!isCurrentIdentity()) return

      if (!joining) {
        setMessage(
          'We couldn’t save your account avatar. Your design is still here. Retry joining to save it first.',
        )
      } else if (saved) {
        setMessage(
          'Your account avatar was saved, but joining failed. Your design is ready to retry; it won’t be saved again.',
        )
      } else {
        setMessage('Joining failed. Your design is still here. Please retry.')
      }
    } finally {
      if (isCurrentIdentity()) {
        submitting.current = false
        setBusy(false)
      }
    }
  }

  return { busy, message, submit, clearMessage: () => setMessage(undefined) }
}
