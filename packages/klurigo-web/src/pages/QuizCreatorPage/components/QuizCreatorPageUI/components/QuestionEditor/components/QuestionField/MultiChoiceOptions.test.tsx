import {
  QUIZ_MULTI_CHOICE_OPTIONS_MAX,
  QUIZ_MULTI_CHOICE_OPTIONS_MIN,
} from '@klurigo/common'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import type { ValidationResult } from '../../../../../../../../validation'

import MultiChoiceOptions from './MultiChoiceOptions'

type AnyValidation = ValidationResult<Record<string, unknown>>

function makeValidation(
  errors: Array<{ path: string; message: string }> = [],
): AnyValidation {
  return {
    valid: errors.length === 0,
    errors: errors.map((e) => ({
      path: e.path,
      message: e.message,
    })),
  } as unknown as AnyValidation
}

function lastCallArg<T>(
  mock: { calls: unknown[][] },
  argIndex = 0,
): T | undefined {
  const calls = mock.calls
  if (!calls.length) return undefined
  return calls[calls.length - 1][argIndex] as T
}

/**
 * Tries to locate the checkbox rendered by TextField inside the option wrapper for Option N.
 * We avoid depending on TextField implementation details beyond common DOM patterns.
 */
function getOptionCheckboxByIndex(index: number): HTMLElement {
  const input = screen.getByPlaceholderText(`Option ${index + 1}`)
  const optionContainer =
    input.closest('[class*="option"]') ?? input.parentElement
  if (!optionContainer) throw new Error('Could not locate option container')

  const checkboxInput = optionContainer.querySelector('input[type="checkbox"]')
  if (checkboxInput) return checkboxInput as HTMLElement

  const roleCheckbox = optionContainer.querySelector('[role="checkbox"]')
  if (roleCheckbox) return roleCheckbox as HTMLElement

  throw new Error(
    'Could not find checkbox control (input[type=checkbox] or [role=checkbox]) for multi-choice option',
  )
}

vi.mock('@dnd-kit/core', async () => {
  // Import actual for types/exports we don’t override
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const actual = await vi.importActual<any>('@dnd-kit/core')

  let lastProps: Record<string, unknown> | null = null

  const DndContext = (
    props: Record<string, unknown> & { children: ReactNode },
  ) => {
    lastProps = props
    return <div data-testid="dnd">{props.children}</div>
  }

  return {
    ...actual,
    DndContext,
    __getLastDndProps: () => lastProps,
    // sensors: we can keep the actual hooks, but mocking them simplifies runtime
    useSensor: () => ({}),
    useSensors: () => [],
    MouseSensor: function MouseSensor() {},
    TouchSensor: function TouchSensor() {},
    KeyboardSensor: function KeyboardSensor() {},
    closestCenter: () => null,
  }
})

vi.mock('@dnd-kit/sortable', async () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const actual = await vi.importActual<any>('@dnd-kit/sortable')

  return {
    ...actual,
    SortableContext: (props: { children: ReactNode }) => <>{props.children}</>,
    useSortable: () => ({
      isDragging: false,
      attributes: {},
      listeners: {},
      setNodeRef: () => {},
      setActivatorNodeRef: () => {},
      transform: null,
      transition: null,
    }),
    rectSortingStrategy: actual.rectSortingStrategy,
    sortableKeyboardCoordinates: actual.sortableKeyboardCoordinates,
    arrayMove: actual.arrayMove,
    defaultAnimateLayoutChanges: actual.defaultAnimateLayoutChanges,
  }
})

describe('MultiChoiceOptions', () => {
  it('renders QUIZ_MULTI_CHOICE_OPTIONS_MAX inputs with correct placeholders', () => {
    const onChange = vi.fn()

    render(
      <MultiChoiceOptions
        onChange={onChange}
        validation={makeValidation()}
        values={[]}
      />,
    )

    const inputs = Array.from(
      { length: QUIZ_MULTI_CHOICE_OPTIONS_MAX },
      (_, i) => screen.getByPlaceholderText(`Option ${i + 1}`),
    )
    expect(inputs).toHaveLength(QUIZ_MULTI_CHOICE_OPTIONS_MAX)
  })

  it('initializes from values and updates when values changes', () => {
    const onChange = vi.fn()

    const { rerender } = render(
      <MultiChoiceOptions
        onChange={onChange}
        validation={makeValidation()}
        values={[
          { value: 'One', correct: false },
          { value: 'Two', correct: true },
        ]}
      />,
    )

    expect(screen.getByPlaceholderText('Option 1')).toHaveValue('One')
    expect(screen.getByPlaceholderText('Option 2')).toHaveValue('Two')

    rerender(
      <MultiChoiceOptions
        onChange={onChange}
        validation={makeValidation()}
        values={[
          { value: 'A', correct: true },
          { value: 'B', correct: false },
          { value: 'C', correct: false },
        ]}
      />,
    )

    expect(screen.getByPlaceholderText('Option 1')).toHaveValue('A')
    expect(screen.getByPlaceholderText('Option 2')).toHaveValue('B')
    expect(screen.getByPlaceholderText('Option 3')).toHaveValue('C')
  })

  it('updates values and emits trimmed array enforcing QUIZ_MULTI_CHOICE_OPTIONS_MIN', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(
      <MultiChoiceOptions
        onChange={onChange}
        validation={makeValidation()}
        values={[]}
      />,
    )

    const first = screen.getByPlaceholderText('Option 1')
    const second = screen.getByPlaceholderText('Option 2')

    await user.type(first, 'Alpha')
    await user.type(second, 'Beta')

    const emitted = lastCallArg<{ value: string; correct: boolean }[]>(
      onChange.mock,
    )
    expect(emitted).toBeDefined()
    expect(emitted!.length).toBeGreaterThanOrEqual(
      QUIZ_MULTI_CHOICE_OPTIONS_MIN,
    )
    expect(emitted![0]).toEqual({ value: 'Alpha', correct: false })
    expect(emitted![1]).toEqual({ value: 'Beta', correct: false })
  })

  it('marking an option correct emits updated correct flags', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(
      <MultiChoiceOptions
        onChange={onChange}
        validation={makeValidation()}
        values={[
          { value: 'Alpha', correct: false },
          { value: 'Beta', correct: false },
        ]}
      />,
    )

    await user.click(getOptionCheckboxByIndex(1))

    const emitted = lastCallArg<{ value: string; correct: boolean }[]>(
      onChange.mock,
    )
    expect(emitted).toBeDefined()
    expect(emitted![0]).toEqual({ value: 'Alpha', correct: false })
    expect(emitted![1]).toEqual({ value: 'Beta', correct: true })
  })

  it('trims to last non-empty/checked while enforcing minimum', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(
      <MultiChoiceOptions
        onChange={onChange}
        validation={makeValidation()}
        values={[]}
      />,
    )

    // Check option 5 without text => it becomes "filled" via correct=true, so cutoff should be >= 5
    await user.click(getOptionCheckboxByIndex(4))

    const emitted1 = lastCallArg<{ value: string; correct: boolean }[]>(
      onChange.mock,
    )
    expect(emitted1).toBeDefined()
    expect(emitted1!.length).toBeGreaterThanOrEqual(5)
    expect(emitted1![4]?.correct).toBe(true)

    // Uncheck it => should fall back to min (2)
    await user.click(getOptionCheckboxByIndex(4))

    const emitted2 = lastCallArg<{ value: string; correct: boolean }[]>(
      onChange.mock,
    )
    expect(emitted2).toBeDefined()
    expect(emitted2!.length).toBe(QUIZ_MULTI_CHOICE_OPTIONS_MIN)
  })

  it('reorders on drag end and emits reordered values', async () => {
    const onChange = vi.fn()

    render(
      <MultiChoiceOptions
        onChange={onChange}
        validation={makeValidation()}
        values={[
          { value: 'One', correct: false },
          { value: 'Two', correct: true },
          { value: 'Three', correct: false },
        ]}
      />,
    )

    const option1 = screen.getByPlaceholderText('Option 1') as HTMLInputElement
    const option3 = screen.getByPlaceholderText('Option 3') as HTMLInputElement

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const core: any = await import('@dnd-kit/core')
    const dndProps = core.__getLastDndProps()
    expect(dndProps).toBeTruthy()

    act(() => {
      dndProps.onDragEnd?.({
        active: { id: option1.id },
        over: { id: option3.id },
      })
    })

    await waitFor(() => {
      const emitted = lastCallArg<{ value: string; correct: boolean }[]>(
        onChange.mock,
      )
      expect(emitted).toBeDefined()
      expect(emitted![0]?.value).toBe('Two')
      expect(emitted![1]?.value).toBe('Three')
      expect(emitted![2]?.value).toBe('One')
    })
  })

  it('shows global options error on all fields when validation has path "options"', async () => {
    const onChange = vi.fn()

    render(
      <MultiChoiceOptions
        onChange={onChange}
        validation={makeValidation([
          { path: 'options', message: 'Options error' },
        ])}
        values={[]}
      />,
    )

    const all = screen.getAllByText('Options error')
    expect(all).toHaveLength(QUIZ_MULTI_CHOICE_OPTIONS_MAX)
  })

  it('hides error messages while dragging and restores after drag end', async () => {
    const onChange = vi.fn()

    render(
      <MultiChoiceOptions
        onChange={onChange}
        validation={makeValidation([
          { path: 'options', message: 'Options error' },
        ])}
        values={[]}
      />,
    )

    expect(screen.getAllByText('Options error')).toHaveLength(
      QUIZ_MULTI_CHOICE_OPTIONS_MAX,
    )

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const core: any = await import('@dnd-kit/core')
    const dndProps = core.__getLastDndProps()
    expect(dndProps).toBeTruthy()

    act(() => {
      dndProps.onDragStart?.({ active: { id: 'x' } })
    })

    // While dragging, showErrorMessage={!isDragging} => false, so errors should not render
    expect(screen.queryAllByText('Options error')).toHaveLength(0)

    act(() => {
      dndProps.onDragEnd?.({ active: { id: 'x' }, over: { id: 'x' } })
    })

    await waitFor(() => {
      expect(screen.getAllByText('Options error')).toHaveLength(
        QUIZ_MULTI_CHOICE_OPTIONS_MAX,
      )
    })
  })
})
