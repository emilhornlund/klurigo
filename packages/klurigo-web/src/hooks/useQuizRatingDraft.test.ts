import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useQuizRatingDraft } from './useQuizRatingDraft'

describe('useQuizRatingDraft', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  it('does not write on initial hydration', () => {
    const persist = vi.fn()

    renderHook(() =>
      useQuizRatingDraft({
        quizId: 'quiz-1',
        canRateQuiz: true,
        initialStars: 4,
        initialComment: 'Nice',
        persist,
      }),
    )

    vi.advanceTimersByTime(0)
    expect(persist).not.toHaveBeenCalled()
  })

  it('writes immediately when selecting stars', () => {
    vi.useFakeTimers()
    try {
      const persist = vi.fn()

      const { result } = renderHook(() =>
        useQuizRatingDraft({
          quizId: 'quiz-1',
          canRateQuiz: true,
          initialStars: undefined,
          initialComment: '',
          persist,
        }),
      )

      act(() => {
        result.current.setStars(3)
      })

      act(() => {
        vi.advanceTimersByTime(0)
      })

      expect(persist).toHaveBeenCalledTimes(1)
      expect(persist).toHaveBeenCalledWith(3, undefined)
    } finally {
      vi.clearAllTimers()
      vi.useRealTimers()
    }
  })

  it('debounces comment saves once stars are set', () => {
    const persist = vi.fn()

    const { result } = renderHook(() =>
      useQuizRatingDraft({
        quizId: 'quiz-1',
        canRateQuiz: true,
        initialStars: undefined,
        initialComment: '',
        persist,
        debounceMs: 600,
      }),
    )

    act(() => {
      result.current.setStars(5)
    })

    act(() => {
      vi.advanceTimersByTime(0)
    })

    expect(persist).toHaveBeenCalledTimes(1)
    expect(persist).toHaveBeenLastCalledWith(5, undefined)

    act(() => {
      result.current.setCommentDraft('a')
      result.current.setCommentDraft('ab')
      result.current.setCommentDraft('abc')
    })

    expect(persist).toHaveBeenCalledTimes(1)

    act(() => {
      vi.advanceTimersByTime(599)
    })
    expect(persist).toHaveBeenCalledTimes(1)

    act(() => {
      vi.advanceTimersByTime(1)
    })

    expect(persist).toHaveBeenCalledTimes(2)
    expect(persist).toHaveBeenLastCalledWith(5, 'abc')
  })

  it('does not write again when selecting the same stars value', () => {
    const persist = vi.fn()

    const { result } = renderHook(() =>
      useQuizRatingDraft({
        quizId: 'quiz-1',
        canRateQuiz: true,
        initialStars: undefined,
        initialComment: '',
        persist,
      }),
    )

    act(() => {
      result.current.setStars(4)
    })
    act(() => {
      vi.advanceTimersByTime(0)
    })

    expect(persist).toHaveBeenCalledTimes(1)

    act(() => {
      result.current.setStars(4)
    })
    act(() => {
      vi.advanceTimersByTime(0)
    })

    expect(persist).toHaveBeenCalledTimes(1)
  })

  it('does not save comment when stars are not set', () => {
    const persist = vi.fn()

    const { result } = renderHook(() =>
      useQuizRatingDraft({
        quizId: 'quiz-1',
        canRateQuiz: true,
        initialStars: undefined,
        initialComment: '',
        persist,
      }),
    )

    act(() => {
      result.current.setCommentDraft('hello')
    })

    act(() => {
      vi.advanceTimersByTime(0)
    })

    expect(persist).not.toHaveBeenCalled()
  })

  it('sends undefined when an existing comment is cleared to whitespace', () => {
    const persist = vi.fn()

    const { result } = renderHook(() =>
      useQuizRatingDraft({
        quizId: 'quiz-1',
        canRateQuiz: true,
        initialStars: undefined,
        initialComment: '',
        persist,
        debounceMs: 200,
      }),
    )

    act(() => {
      result.current.setStars(5)
    })
    act(() => {
      vi.advanceTimersByTime(0)
    })

    act(() => {
      result.current.setCommentDraft('abc')
    })
    act(() => {
      vi.advanceTimersByTime(200)
    })

    expect(persist).toHaveBeenCalledTimes(2)
    expect(persist).toHaveBeenLastCalledWith(5, 'abc')

    act(() => {
      result.current.setCommentDraft('   ')
    })
    act(() => {
      vi.advanceTimersByTime(200)
    })

    expect(persist).toHaveBeenCalledTimes(3)
    expect(persist).toHaveBeenLastCalledWith(5, undefined)
  })

  it('does not write when canRateQuiz is false', () => {
    const persist = vi.fn()

    const { result } = renderHook(() =>
      useQuizRatingDraft({
        quizId: 'quiz-1',
        canRateQuiz: false,
        initialStars: undefined,
        initialComment: '',
        persist,
      }),
    )

    act(() => {
      result.current.setStars(4)
    })

    act(() => {
      result.current.setCommentDraft('test')
    })

    act(() => {
      vi.advanceTimersByTime(0)
    })

    expect(persist).not.toHaveBeenCalled()
  })

  it('deduplicates identical payloads', () => {
    const persist = vi.fn()

    const { result } = renderHook(() =>
      useQuizRatingDraft({
        quizId: 'quiz-1',
        canRateQuiz: true,
        initialStars: undefined,
        initialComment: '',
        persist,
        debounceMs: 200,
      }),
    )

    act(() => {
      result.current.setStars(4)
    })

    act(() => {
      vi.advanceTimersByTime(0)
    })

    expect(persist).toHaveBeenCalledTimes(1)
    expect(persist).toHaveBeenLastCalledWith(4, undefined)

    act(() => {
      result.current.setCommentDraft('same')
    })

    act(() => {
      vi.advanceTimersByTime(200)
    })

    expect(persist).toHaveBeenCalledTimes(2)
    expect(persist).toHaveBeenLastCalledWith(4, 'same')

    act(() => {
      result.current.setCommentDraft('same')
    })

    act(() => {
      vi.advanceTimersByTime(200)
    })

    expect(persist).toHaveBeenCalledTimes(2)
  })

  it('cancels pending debounced save when quizId/initial values change', () => {
    const persist = vi.fn()

    const { result, rerender } = renderHook(
      (props: {
        quizId: string
        initialStars?: number
        initialComment?: string
      }) =>
        useQuizRatingDraft({
          quizId: props.quizId,
          canRateQuiz: true,
          initialStars: props.initialStars,
          initialComment: props.initialComment,
          persist,
          debounceMs: 300,
        }),
      {
        initialProps: {
          quizId: 'quiz-1',
          initialStars: undefined,
          initialComment: '',
        } as {
          quizId: string
          initialStars?: number
          initialComment?: string
        },
      },
    )

    act(() => {
      result.current.setStars(5)
    })

    act(() => {
      vi.advanceTimersByTime(0)
    })

    expect(persist).toHaveBeenCalledTimes(1)

    act(() => {
      result.current.setCommentDraft('pending')
    })

    rerender({ quizId: 'quiz-2', initialStars: 2, initialComment: 'new' })

    act(() => {
      vi.advanceTimersByTime(0)
    })

    expect(persist).toHaveBeenCalledTimes(1)
    expect(result.current.stars).toBe(2)
    expect(result.current.commentDraft).toBe('new')
  })

  it('does not fire a pending debounced save after unmount', () => {
    const persist = vi.fn()

    const { result, unmount } = renderHook(() =>
      useQuizRatingDraft({
        quizId: 'quiz-1',
        canRateQuiz: true,
        initialStars: undefined,
        initialComment: '',
        persist,
        debounceMs: 500,
      }),
    )

    act(() => {
      result.current.setStars(4)
    })

    act(() => {
      vi.advanceTimersByTime(0)
    })

    expect(persist).toHaveBeenCalledTimes(1)

    act(() => {
      result.current.setCommentDraft('will-cancel')
    })

    unmount()

    act(() => {
      vi.advanceTimersByTime(0)
    })

    expect(persist).toHaveBeenCalledTimes(1)
  })
})
