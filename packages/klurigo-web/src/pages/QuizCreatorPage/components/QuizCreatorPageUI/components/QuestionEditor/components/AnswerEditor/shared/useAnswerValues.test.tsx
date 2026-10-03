import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { useAnswerValues } from './useAnswerValues'

describe('useAnswerValues', () => {
  it('keeps the configured minimum, emits edits, and stops adding at the maximum', () => {
    const onChange = vi.fn()
    const { result } = renderHook(() =>
      useAnswerValues(undefined, 2, 3, onChange),
    )

    expect(result.current.values).toEqual(['', ''])

    act(() => result.current.change(0, 'First answer'))
    expect(onChange).toHaveBeenLastCalledWith(['First answer', ''])

    act(() => result.current.add())
    expect(result.current.values).toEqual(['First answer', '', ''])
    act(() => result.current.add())
    expect(result.current.values).toEqual(['First answer', '', ''])

    act(() => result.current.remove(0))
    expect(result.current.values).toEqual(['', ''])
    expect(onChange).toHaveBeenLastCalledWith(['', ''])

    const callsBeforeMinimumRemoval = onChange.mock.calls.length
    act(() => result.current.remove(0))
    expect(result.current.values).toEqual(['', ''])
    expect(onChange).toHaveBeenCalledTimes(callsBeforeMinimumRemoval)
  })

  it('syncs incoming values without dropping existing rows when values are shortened', () => {
    const onChange = vi.fn()
    const { result, rerender } = renderHook(
      ({ values }: { values?: string[] }) =>
        useAnswerValues(values, 1, 4, onChange),
      { initialProps: { values: ['First', 'Second', 'Third'] as string[] } },
    )

    expect(result.current.values).toEqual(['First', 'Second', 'Third'])

    rerender({ values: ['Updated'] })

    expect(result.current.values).toEqual(['Updated', 'Second', 'Third'])
  })
})
