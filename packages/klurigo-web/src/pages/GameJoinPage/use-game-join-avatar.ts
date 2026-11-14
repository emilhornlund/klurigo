import {
  type GameAvatarSnapshot,
  isCrittersAvatarConfigurationV1,
  randomizeCrittersAvatar,
  resolveGameAvatarSnapshot,
} from '@klurigo/common'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useKlurigoServiceClient } from '../../api'
import { useAuthContext } from '../../context/auth'
import { useGameContext } from '../../context/game'

/** A join draft belongs to one signed game identity, never to a render or nickname. */
export function useGameJoinAvatar() {
  const { gameID, participantId } = useGameContext()
  const { user, isUserAuthenticated } = useAuthContext()
  const accountId = isUserAuthenticated ? user?.ACCESS.sub : undefined
  const client = useKlurigoServiceClient()
  const clientRef = useRef(client)
  useEffect(() => {
    clientRef.current = client
  }, [client])
  const navigate = useNavigate()
  const [avatar, setAvatarState] = useState<GameAvatarSnapshot>()
  const [initialAvatar, setInitialAvatar] = useState<GameAvatarSnapshot>()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string>()
  const [attempt, setAttempt] = useState(0)
  const storageKey =
    gameID && participantId
      ? `klurigo:join-avatar:${gameID}:${participantId}:${accountId ?? 'guest'}`
      : undefined

  const setAvatar = useCallback(
    (next: GameAvatarSnapshot) => {
      setAvatarState(next)
      if (storageKey) {
        try {
          localStorage.setItem(storageKey, JSON.stringify(next))
        } catch {
          /* Keep the in-memory draft when storage is unavailable. */
        }
      }
    },
    [storageKey],
  )

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setError(undefined)
    setAvatarState(undefined)
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
        // Account defaults come from the profile; guest choices are generated only once.
        const draft =
          saved ??
          (isCrittersAvatarConfigurationV1(stored)
            ? resolveGameAvatarSnapshot(stored)
            : randomizeCrittersAvatar())
        setInitialAvatar(draft)
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

  return {
    avatar,
    initialAvatar,
    setAvatar,
    isLoading,
    error,
    retry: () => setAttempt((value) => value + 1),
  }
}
