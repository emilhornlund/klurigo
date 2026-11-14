import {
  deepEqual,
  type GameAvatarSnapshot,
  isCrittersAvatarConfigurationV1,
  randomizeCrittersAvatar,
  resolveGameAvatarSnapshot,
  type UserProfileResponseDto,
} from '@klurigo/common'
import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useKlurigoServiceClient } from '../../api'
import { useAuthContext } from '../../context/auth'
import { useGameContext } from '../../context/game'
import { useUserContext } from '../../context/user'

type AccountJoinDraft = {
  avatar: GameAvatarSnapshot
  baseline: GameAvatarSnapshot
  acknowledged?: GameAvatarSnapshot
}

function readAccountDraft(value: unknown): AccountJoinDraft | undefined {
  if (!value || typeof value !== 'object') return
  const draft = value as Record<string, unknown>
  if (
    !isCrittersAvatarConfigurationV1(draft.avatar) ||
    !isCrittersAvatarConfigurationV1(draft.baseline)
  )
    return
  if (
    draft.acknowledged !== undefined &&
    !isCrittersAvatarConfigurationV1(draft.acknowledged)
  )
    return
  return {
    avatar: draft.avatar,
    baseline: draft.baseline,
    acknowledged: draft.acknowledged,
  }
}

/** A join draft belongs to one signed game identity, never to a render or nickname. */
export function useGameJoinAvatar() {
  const { gameID, participantId } = useGameContext()
  const { user, isUserAuthenticated } = useAuthContext()
  const accountId = isUserAuthenticated ? user?.ACCESS.sub : undefined
  const { setCurrentUser } = useUserContext()
  const queryClient = useQueryClient()
  const profileRef = useRef<UserProfileResponseDto | undefined>(undefined)
  const draftMeta = useRef<
    Pick<AccountJoinDraft, 'baseline' | 'acknowledged'> | undefined
  >(undefined)
  const activeIdentity = useRef<string | undefined>(undefined)
  const client = useKlurigoServiceClient()
  const clientRef = useRef(client)
  useEffect(() => {
    clientRef.current = client
  }, [client])
  const navigate = useNavigate()
  const [avatar, setAvatarState] = useState<GameAvatarSnapshot>()
  const [initialAvatar, setInitialAvatar] = useState<GameAvatarSnapshot>()
  const [acknowledgedAvatar, setAcknowledgedAvatar] =
    useState<GameAvatarSnapshot>()
  const [canEdit, setCanEdit] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string>()
  const [attempt, setAttempt] = useState(0)
  const storageKey =
    gameID && participantId
      ? `klurigo:join-avatar:${gameID}:${participantId}:${accountId ?? 'guest'}`
      : undefined

  useEffect(() => {
    activeIdentity.current = storageKey
    return () => {
      activeIdentity.current = undefined
    }
  }, [storageKey])

  const setAvatar = useCallback(
    (next: GameAvatarSnapshot) => {
      setAvatarState(next)
      if (storageKey) {
        try {
          localStorage.setItem(
            storageKey,
            JSON.stringify(
              accountId
                ? {
                    avatar: next,
                    baseline: draftMeta.current?.baseline ?? next,
                    acknowledged: draftMeta.current?.acknowledged,
                  }
                : next,
            ),
          )
        } catch {
          /* Keep the in-memory draft when storage is unavailable. */
        }
      }
    },
    [storageKey, accountId],
  )

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setError(undefined)
    setAvatarState(undefined)
    setAcknowledgedAvatar(undefined)
    profileRef.current = undefined
    draftMeta.current = undefined
    if (!gameID || !participantId || (isUserAuthenticated && !accountId)) return
    const prepare = async () => {
      try {
        const game = await clientRef.current.getGame(gameID)
        if (cancelled) return
        if (game.participant) {
          navigate('/game', { replace: true })
          return
        }
        if (accountId && accountId !== participantId) {
          setError(
            'Your account changed. Go back and enter the game again to join with this account.',
          )
          return
        }
        const profile = accountId
          ? await clientRef.current.getUserProfile()
          : undefined
        if (cancelled) return
        if (profile && profile.id !== accountId) {
          setError('Your account changed. Go back and enter the game again.')
          return
        }
        const saved = profile
          ? resolveGameAvatarSnapshot(profile.avatar)
          : undefined
        let stored: unknown
        try {
          stored = JSON.parse(localStorage.getItem(storageKey!) ?? 'null')
        } catch {
          /* Ignore an unreadable draft. */
        }
        const retained = accountId ? readAccountDraft(stored) : undefined
        // An untouched account draft follows fresh profile defaults. Edited or
        // acknowledged drafts retain their retry state for this exact game identity.
        const draft = saved
          ? retained &&
            (retained.acknowledged ||
              !deepEqual(retained.avatar, retained.baseline))
            ? retained.avatar
            : saved
          : isCrittersAvatarConfigurationV1(stored)
            ? resolveGameAvatarSnapshot(stored)
            : randomizeCrittersAvatar()
        profileRef.current = profile
        draftMeta.current = {
          baseline: saved ?? draft,
          acknowledged: retained?.acknowledged,
        }
        setCanEdit(
          !profile?.avatar || isCrittersAvatarConfigurationV1(profile.avatar),
        )
        setAcknowledgedAvatar(retained?.acknowledged)
        setInitialAvatar(saved ?? draft)
        setAvatar(draft)
      } catch {
        if (!cancelled)
          setError(
            'We couldn’t prepare your game avatar. Your draft is still here. Please retry.',
          )
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    void prepare()
    return () => {
      cancelled = true
    }
  }, [
    gameID,
    participantId,
    accountId,
    isUserAuthenticated,
    navigate,
    storageKey,
    setAvatar,
    attempt,
  ])

  const needsSave = !!(
    accountId &&
    avatar &&
    initialAvatar &&
    !deepEqual(avatar, acknowledgedAvatar ?? initialAvatar)
  )
  const hasSavedAccountDesign = !!(
    accountId &&
    avatar &&
    acknowledgedAvatar &&
    deepEqual(avatar, acknowledgedAvatar)
  )

  const commitAvatar = async (): Promise<GameAvatarSnapshot> => {
    const profile = profileRef.current
    if (!avatar || !storageKey || activeIdentity.current !== storageKey)
      throw new Error('Join identity changed')
    if (!needsSave) return avatar
    if (
      !canEdit ||
      !accountId ||
      participantId !== accountId ||
      profile?.id !== accountId
    )
      throw new Error('Account is not ready')
    const saved = await clientRef.current.updateUserAvatar(avatar)
    if (activeIdentity.current !== storageKey)
      throw new Error('Join identity changed')
    if (!isCrittersAvatarConfigurationV1(saved) || !deepEqual(saved, avatar))
      throw new Error('Avatar acknowledgement did not match')

    // Record the acknowledged write before cache refreshes or the separate join.
    // A failed join/reload must never repeat this already-confirmed profile save.
    draftMeta.current = { baseline: saved, acknowledged: saved }
    setAcknowledgedAvatar(saved)
    setInitialAvatar(saved)
    setAvatar(saved)
    const key = ['myUserProfile', accountId]
    await queryClient.cancelQueries({ queryKey: key })
    if (activeIdentity.current !== storageKey)
      throw new Error('Join identity changed')
    queryClient.setQueryData<UserProfileResponseDto>(key, (old) =>
      old ? { ...old, avatar: saved } : old,
    )
    setCurrentUser((previous) =>
      activeIdentity.current !== storageKey
        ? previous
        : {
            ...(previous?.id === accountId
              ? previous
              : {
                  id: profile.id,
                  email: profile.email,
                  unverifiedEmail: profile.unverifiedEmail,
                  defaultNickname: profile.defaultNickname,
                  authProvider: profile.authProvider,
                }),
            avatar: saved,
          },
    )
    await queryClient.invalidateQueries({
      queryKey: ['user-profile', accountId],
    })
    if (activeIdentity.current !== storageKey)
      throw new Error('Join identity changed')
    return saved
  }

  return {
    avatar,
    initialAvatar,
    setAvatar,
    canEdit,
    needsSave,
    hasSavedAccountDesign,
    commitAvatar,
    isLoading,
    error,
    retry: () => setAttempt((value) => value + 1),
  }
}
