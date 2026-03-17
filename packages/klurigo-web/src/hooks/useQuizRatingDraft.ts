import type { QuizRatingDto } from '@klurigo/common'
import { useEffect, useRef, useState } from 'react'

/**
 * Internal snapshot of the last rating payload sent to the backend.
 *
 * Used to deduplicate requests and avoid re-sending identical updates.
 */
type SavedPayload = {
  /**
   * The star rating value for the quiz (1–5).
   */
  stars: number

  /**
   * Optional free-text feedback about the quiz.
   */
  comment?: string
}

/**
 * Arguments for `useQuizRatingDraft`.
 */
export type UseQuizRatingDraftArgs = {
  /**
   * The quiz identifier the rating belongs to.
   *
   * Used to detect quiz changes and reset draft state on hydration.
   */
  quizId: string

  /**
   * Whether the current user is allowed to rate this quiz.
   *
   * When `false`, no backend writes will be performed.
   */
  canRateQuiz: boolean

  /**
   * Initial star rating value, if a rating already exists.
   */
  initialStars?: number

  /**
   * Initial comment value, if a rating already exists.
   */
  initialComment?: string

  /**
   * Persists the rating update to the backend.
   *
   * Called with the current star rating and optional comment. The implementation
   * is responsible for knowing which resource to update (e.g. by closing over
   * the quiz or game ID).
   */
  persist: (stars: number, comment?: string) => Promise<QuizRatingDto>

  /**
   * Debounce duration (in milliseconds) for comment updates.
   *
   * Defaults to `600`.
   */
  debounceMs?: number
}

/**
 * Result returned by `useQuizRatingDraft`.
 */
export type UseQuizRatingDraftResult = {
  /**
   * The currently selected star rating value, if set.
   */
  stars?: number

  /**
   * The current comment draft value shown in the UI.
   *
   * This value updates immediately as the user types.
   */
  commentDraft: string

  /**
   * Sets the star rating value.
   *
   * Triggers an immediate backend write (no debounce).
   */
  setStars: (next: number) => void

  /**
   * Sets the comment draft value.
   *
   * Triggers a debounced backend write if a star rating is selected.
   */
  setCommentDraft: (next: string) => void

  /**
   * Whether the user has interacted with the rating UI since the last hydration.
   *
   * Used to prevent saving on initial render when values are pre-populated from props.
   */
  hasInteracted: boolean
}

/**
 * React hook for managing a quiz rating draft (stars + comment) with:
 * - No writes during initial hydration.
 * - Immediate save when selecting a star rating.
 * - Debounced saves while typing a comment.
 * - Deduplication to prevent re-sending identical payloads.
 *
 * @param quizId - The quiz identifier the rating belongs to.
 * @param canRateQuiz - Whether the current user is allowed to rate this quiz.
 * @param initialStars - Initial star rating value, if a rating already exists.
 * @param initialComment - Initial comment value, if a rating already exists.
 * @param persist - Callback that persists the rating to the backend.
 * @param debounceMs - Debounce duration (in milliseconds) for comment updates.
 * @returns The current draft state and setters for stars and comment.
 */
export function useQuizRatingDraft({
  quizId,
  canRateQuiz,
  initialStars,
  initialComment,
  persist,
  debounceMs = 600,
}: UseQuizRatingDraftArgs): UseQuizRatingDraftResult {
  const [stars, setStarsState] = useState<number | undefined>(initialStars)
  const [commentDraft, setCommentDraftState] = useState<string>(
    initialComment ?? '',
  )

  const hasInteractedRef = useRef(false)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSentRef = useRef<SavedPayload | null>(null)

  const persistRef = useRef(persist)
  useEffect(() => {
    persistRef.current = persist
  }, [persist])

  // Hydrate when quiz/rating changes, without triggering saves.
  useEffect(() => {
    setStarsState(initialStars)
    setCommentDraftState(initialComment ?? '')
    hasInteractedRef.current = false
    lastSentRef.current = null

    if (saveTimerRef.current !== null) {
      clearTimeout(saveTimerRef.current)
      saveTimerRef.current = null
    }
  }, [quizId, initialStars, initialComment])

  const scheduleSave = (
    nextStars: number,
    nextCommentDraft: string,
    delay: number,
  ): void => {
    if (!canRateQuiz) {
      return
    }

    const trimmed = nextCommentDraft.trim()
    const commentToSend = trimmed.length ? trimmed : undefined

    if (saveTimerRef.current !== null) {
      clearTimeout(saveTimerRef.current)
    }

    saveTimerRef.current = setTimeout(() => {
      const payload: SavedPayload = {
        stars: nextStars,
        comment: commentToSend,
      }

      const last = lastSentRef.current
      if (
        last &&
        last.stars === payload.stars &&
        last.comment === payload.comment
      ) {
        return
      }

      lastSentRef.current = payload
      persistRef.current(payload.stars, payload.comment)
    }, delay)
  }

  const setStars = (next: number): void => {
    if (next === stars) {
      return
    }

    hasInteractedRef.current = true
    setStarsState(next)

    scheduleSave(next, commentDraft, 0)
  }

  const setCommentDraft = (next: string): void => {
    hasInteractedRef.current = true
    setCommentDraftState(next)

    // Only save comments if there is a rating selected.
    if (stars) {
      scheduleSave(stars, next, debounceMs)
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current !== null) {
        clearTimeout(saveTimerRef.current)
      }
    }
  }, [])

  return {
    stars,
    commentDraft,
    setStars,
    setCommentDraft,
    hasInteracted: hasInteractedRef.current,
  }
}
