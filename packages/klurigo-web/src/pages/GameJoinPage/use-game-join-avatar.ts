import {
  type CrittersAvatarConfigurationV1,
  deepEqual,
  isCrittersAvatarConfigurationV1,
  type UserProfileResponseDto,
} from '@klurigo/common'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useKlurigoServiceClient } from '../../api'
import { useAuthContext } from '../../context/auth'
import { useGameContext } from '../../context/game'
import { useAccountAvatarSave } from '../../hooks/useAccountAvatarSave'

import {
  type JoinAvatarDraft,
  loadAccountJoinDraft,
  loadGuestJoinDraft,
  storeJoinAvatarDraft,
} from './game-join-avatar-storage'

/**
 * Prepares the avatar for one signed game identity and retains its retry state.
 * Existing participants resume before any new draft is generated. Account defaults
 * come from the authenticated profile; guests never write account metadata.
 *
 * @returns The resolved draft, preparation state, and guarded edit/save actions.
 */
export function useGameJoinAvatar() {
  const { gameID, participantId } = useGameContext()
  const { user, isUserAuthenticated } = useAuthContext()
  const accountId = isUserAuthenticated ? user?.ACCESS.sub : undefined
  const storageKey =
    gameID && participantId
      ? `klurigo:join-avatar:${gameID}:${participantId}:${accountId ?? 'guest'}`
      : undefined
  const client = useKlurigoServiceClient()
  const clientRef = useRef(client)
  const navigate = useNavigate()
  const activeIdentity = useRef<{ key: string | undefined } | undefined>(
    undefined,
  )
  const [draft, setDraft] = useState<JoinAvatarDraft>()
  const [profile, setProfile] = useState<UserProfileResponseDto>()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string>()
  const [attempt, setAttempt] = useState(0)
  const [preparedIdentity, setPreparedIdentity] = useState<{
    key: string | undefined
  }>()

  useEffect(() => {
    clientRef.current = client
  }, [client])

  const updateDraft = useCallback(
    (next: JoinAvatarDraft) => {
      setDraft(next)

      if (storageKey) storeJoinAvatarDraft(storageKey, next, !!accountId)
    },
    [storageKey, accountId],
  )

  useEffect(() => {
    let cancelled = false
    // Object identity distinguishes a fresh preparation from a previous visit to this scope.
    const owner = { key: storageKey }
    activeIdentity.current = owner
    setPreparedIdentity(owner)
    setIsLoading(true)
    setError(undefined)
    setDraft(undefined)
    setProfile(undefined)

    const prepare = async () => {
      if (!gameID || !participantId || !storageKey) {
        setError('Enter the game again to prepare your avatar.')
        setIsLoading(false)
        return
      }

      try {
        const game = await clientRef.current.getGame(gameID)
        if (cancelled) return

        if (game.participant) {
          navigate('/game', { replace: true })
          return
        }

        if (
          (isUserAuthenticated &&
            (!accountId || accountId !== participantId)) ||
          (game.joiningAccountId !== undefined &&
            game.joiningAccountId !== (accountId ?? null))
        ) {
          throw new Error('account-changed')
        }

        const accountProfile = accountId
          ? await clientRef.current.getUserProfile()
          : undefined

        if (cancelled) return

        if (accountProfile && accountProfile.id !== accountId) {
          throw new Error('account-changed')
        }

        const prepared = accountProfile
          ? loadAccountJoinDraft(storageKey, accountProfile.avatar)
          : loadGuestJoinDraft(storageKey)

        setProfile(accountProfile)
        updateDraft(prepared)
      } catch (cause) {
        if (cancelled) return

        setError(
          cause instanceof Error && cause.message === 'account-changed'
            ? 'Your account changed. Go back and enter the game again.'
            : 'We couldn’t prepare your game avatar. Your draft is still here. Please retry.',
        )
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void prepare()

    return () => {
      cancelled = true
      activeIdentity.current = undefined
    }
  }, [
    gameID,
    participantId,
    storageKey,
    accountId,
    isUserAuthenticated,
    navigate,
    updateDraft,
    attempt,
  ])

  const canEdit =
    !profile?.avatar || isCrittersAvatarConfigurationV1(profile.avatar)
  const needsSave = !!(
    accountId &&
    draft &&
    !deepEqual(draft.avatar, draft.acknowledged ?? draft.baseline)
  )
  const hasSavedAccountDesign = !!(
    draft?.acknowledged && deepEqual(draft.avatar, draft.acknowledged)
  )
  const saveAccountAvatar = useAccountAvatarSave({
    profile,
    isCurrentIdentity: () =>
      !!storageKey &&
      preparedIdentity?.key === storageKey &&
      activeIdentity.current === preparedIdentity,
    onAcknowledged: (saved) =>
      updateDraft({ avatar: saved, baseline: saved, acknowledged: saved }),
  })

  /** Saves only edited account metadata, preserving the acknowledged design on retries. */
  const commitAvatar = async (): Promise<CrittersAvatarConfigurationV1> => {
    if (
      !draft ||
      !storageKey ||
      preparedIdentity?.key !== storageKey ||
      activeIdentity.current !== preparedIdentity
    ) {
      throw new Error('Join identity changed')
    }

    if (!needsSave) return draft.avatar

    if (!canEdit || profile?.id !== accountId || participantId !== accountId) {
      throw new Error('Account is not ready')
    }

    return saveAccountAvatar(draft.avatar)
  }

  return {
    avatar: preparedIdentity?.key === storageKey ? draft?.avatar : undefined,
    setAvatar: (avatar: CrittersAvatarConfigurationV1) => {
      if (draft) updateDraft({ ...draft, avatar })
    },
    canEdit,
    needsSave,
    hasSavedAccountDesign,
    commitAvatar,
    isLoading: preparedIdentity?.key !== storageKey || isLoading,
    error: preparedIdentity?.key === storageKey ? error : undefined,
    retry: () => setAttempt((value) => value + 1),
  }
}
