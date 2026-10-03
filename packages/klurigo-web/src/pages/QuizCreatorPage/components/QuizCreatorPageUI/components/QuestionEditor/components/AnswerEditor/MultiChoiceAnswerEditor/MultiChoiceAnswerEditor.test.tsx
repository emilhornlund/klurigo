import {
  QUIZ_MULTI_CHOICE_OPTIONS_MAX,
  QUIZ_MULTI_CHOICE_OPTIONS_MIN,
} from '@klurigo/common'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import type { ValidationResult } from '../../../../../../../../../validation'

import MultiChoiceAnswerEditor from './MultiChoiceAnswerEditor'

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
 * Locates the correctness checkbox for an answer row.
 */
function getOptionCheckboxByIndex(index: number): HTMLElement {
  return screen.getByRole('checkbox', {
    name: `Mark Option ${index + 1} as correct`,
  })
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
  let lastSortableProps: Record<string, unknown> | null = null

  return {
    ...actual,
    SortableContext: (
      props: Record<string, unknown> & { children: ReactNode },
    ) => {
      lastSortableProps = props
      return <>{props.children}</>
    },
    __getLastSortableProps: () => lastSortableProps,
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

describe('MultiChoiceAnswerEditor', () => {
  it('starts with four required answers and allows adding answers up to the maximum', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(
      <MultiChoiceAnswerEditor
        onChange={onChange}
        validation={makeValidation()}
        validationRevealed
        values={[]}
      />,
    )

    expect(screen.getByPlaceholderText('Option 1')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Option 2')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Option 3')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Option 4')).toBeInTheDocument()

    expect(screen.queryByPlaceholderText('Option 5')).not.toBeInTheDocument()

    expect(screen.getAllByText('Enter an answer.')).toHaveLength(4)

    const addButton = screen.getByRole('button', {
      name: 'Add another answer',
    })

    for (let count = 4; count < QUIZ_MULTI_CHOICE_OPTIONS_MAX; count += 1) {
      await user.click(addButton)
    }

    expect(
      screen.getByPlaceholderText(`Option ${QUIZ_MULTI_CHOICE_OPTIONS_MAX}`),
    ).toBeInTheDocument()

    expect(
      screen.queryByRole('button', {
        name: 'Add another answer',
      }),
    ).not.toBeInTheDocument()
  })

  it('initializes from values and updates when values changes', () => {
    const onChange = vi.fn()

    const { rerender } = render(
      <MultiChoiceAnswerEditor
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
      <MultiChoiceAnswerEditor
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
      <MultiChoiceAnswerEditor
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
      <MultiChoiceAnswerEditor
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

  it('allows unmarking a correct answer and prevents deleting below the minimum', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <MultiChoiceAnswerEditor
        onChange={onChange}
        validation={makeValidation()}
        values={[
          { value: 'First', correct: true },
          { value: 'Second', correct: false },
        ]}
      />,
    )

    for (let count = 4; count > QUIZ_MULTI_CHOICE_OPTIONS_MIN; count -= 1) {
      const deleteButtons = screen
        .getAllByRole('button')
        .filter((button) => button.id.endsWith('-delete-button'))
      await user.click(deleteButtons.at(-1)!)
    }
    const minimumDeleteButtons = screen
      .getAllByRole('button')
      .filter((button) => button.id.endsWith('-delete-button'))
    expect(minimumDeleteButtons).toHaveLength(QUIZ_MULTI_CHOICE_OPTIONS_MIN)
    minimumDeleteButtons.forEach((button) => expect(button).toBeDisabled())

    await user.click(getOptionCheckboxByIndex(0))
    expect(
      lastCallArg<{ value: string; correct: boolean }[]>(onChange.mock)?.[0],
    ).toEqual({
      value: 'First',
      correct: false,
    })
  })

  it('deletes an answer above the minimum and emits all remaining visible answers', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(
      <MultiChoiceAnswerEditor
        onChange={onChange}
        validation={makeValidation()}
        values={[
          { value: 'First', correct: true },
          { value: 'Second', correct: false },
        ]}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Add another answer' }))

    const deleteButton = screen.getByTestId(/option.*-4-delete-button-button/)
    expect(deleteButton).toBeEnabled()

    await user.click(deleteButton)

    expect(screen.getByPlaceholderText('Option 1')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Option 2')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Option 3')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Option 4')).toBeInTheDocument()
    expect(screen.queryByPlaceholderText('Option 5')).not.toBeInTheDocument()

    expect(
      lastCallArg<{ value: string; correct: boolean }[]>(onChange.mock),
    ).toEqual([
      { value: 'First', correct: true },
      { value: 'Second', correct: false },
      { value: '', correct: false },
      { value: '', correct: false },
    ])
  })

  it('deleting an answer emits every remaining visible answer', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(
      <MultiChoiceAnswerEditor
        onChange={onChange}
        validation={makeValidation()}
        values={[]}
      />,
    )

    expect(screen.getByPlaceholderText('Option 4')).toBeInTheDocument()

    const deleteButton = screen.getByTestId(/option.*-3-delete-button-button/)

    await user.click(deleteButton)

    expect(screen.getByPlaceholderText('Option 1')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Option 2')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Option 3')).toBeInTheDocument()
    expect(screen.queryByPlaceholderText('Option 4')).not.toBeInTheDocument()

    expect(onChange).toHaveBeenLastCalledWith([
      { value: '', correct: false },
      { value: '', correct: false },
      { value: '', correct: false },
    ])
  })

  it('requires every remaining answer after deleting a row', async () => {
    const user = userEvent.setup()

    render(
      <MultiChoiceAnswerEditor
        onChange={vi.fn()}
        validation={makeValidation()}
        validationRevealed
        values={[]}
      />,
    )

    expect(screen.getAllByText('Enter an answer.')).toHaveLength(4)

    const deleteButton = screen.getByTestId(/option.*-3-delete-button-button/)

    await user.click(deleteButton)

    expect(screen.getAllByText('Enter an answer.')).toHaveLength(3)
  })

  it('keeps a populated optional option when deleting another option', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(
      <MultiChoiceAnswerEditor
        onChange={onChange}
        validation={makeValidation()}
        values={[
          { value: 'Blue', correct: true },
          { value: 'Green', correct: false },
          { value: 'Red', correct: false },
        ]}
      />,
    )

    const option3 = screen.getByPlaceholderText('Option 3')
    expect(option3).toHaveValue('Red')

    const deleteButton = screen.getByTestId(/option.*-3-delete-button-button/)

    await user.click(deleteButton)

    expect(onChange).toHaveBeenLastCalledWith([
      { value: 'Blue', correct: true },
      { value: 'Green', correct: false },
      { value: 'Red', correct: false },
    ])
  })

  it('keeps every visible answer in the emitted model', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(
      <MultiChoiceAnswerEditor
        onChange={onChange}
        validation={makeValidation()}
        values={[]}
      />,
    )

    await user.click(getOptionCheckboxByIndex(3))

    expect(onChange).toHaveBeenLastCalledWith([
      { value: '', correct: false },
      { value: '', correct: false },
      { value: '', correct: false },
      { value: '', correct: true },
    ])

    await user.click(getOptionCheckboxByIndex(3))

    expect(onChange).toHaveBeenLastCalledWith([
      { value: '', correct: false },
      { value: '', correct: false },
      { value: '', correct: false },
      { value: '', correct: false },
    ])
  })

  it('reorders on drag end and emits reordered values', async () => {
    const onChange = vi.fn()

    render(
      <MultiChoiceAnswerEditor
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sortable: any = await import('@dnd-kit/sortable')
    expect(sortable.__getLastSortableProps().strategy).toBe(
      sortable.verticalListSortingStrategy,
    )

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

  it('shows a group-level options validation error once after interaction', async () => {
    const onChange = vi.fn()

    render(
      <MultiChoiceAnswerEditor
        onChange={onChange}
        validation={makeValidation([
          { path: 'options', message: 'Options error' },
        ])}
        validationRevealed
        values={[]}
      />,
    )

    expect(screen.getAllByText('Options error')).toHaveLength(1)
  })

  it('keeps option-specific validation attached to its answer row', async () => {
    const onChange = vi.fn()

    render(
      <MultiChoiceAnswerEditor
        onChange={onChange}
        validation={makeValidation([
          { path: 'options[0].value', message: 'First answer is invalid' },
        ])}
        values={[
          { value: 'First', correct: true },
          { value: 'Second', correct: false },
        ]}
      />,
    )

    await userEvent.setup().type(screen.getByPlaceholderText('Option 1'), '!')

    expect(screen.getByText('First answer is invalid')).toBeInTheDocument()
  })

  it('explains answer choice selection without showing initial validation', () => {
    render(
      <MultiChoiceAnswerEditor
        onChange={vi.fn()}
        validation={makeValidation()}
        values={[]}
      />,
    )

    expect(
      screen.getByText(
        'Add the answer choices and mark one or more as correct.',
      ),
    ).toBeInTheDocument()
    expect(
      screen.queryByText('Select at least one correct answer.'),
    ).not.toBeInTheDocument()
  })

  it('shows answer text validation only on its required field and keeps it independent from correct selection', async () => {
    const user = userEvent.setup()
    render(
      <MultiChoiceAnswerEditor
        onChange={vi.fn()}
        validation={makeValidation([
          { path: 'options[0].value', message: 'Enter an answer.' },
        ])}
        values={[]}
      />,
    )

    expect(screen.queryByText('Enter an answer.')).not.toBeInTheDocument()
    expect(
      screen.queryByText('Select at least one correct answer.'),
    ).not.toBeInTheDocument()

    fireEvent.focus(screen.getByPlaceholderText('Option 1'))
    fireEvent.blur(screen.getByPlaceholderText('Option 1'))
    expect(screen.getByText('Enter an answer.')).toBeInTheDocument()
    await user.click(getOptionCheckboxByIndex(1))
    expect(screen.getByText('Enter an answer.')).toBeInTheDocument()
    expect(
      screen.queryByText('Select at least one correct answer.'),
    ).not.toBeInTheDocument()

    await user.click(getOptionCheckboxByIndex(1))
    expect(screen.getByText('Enter an answer.')).toBeInTheDocument()
    expect(
      screen.getByText('Select at least one correct answer.'),
    ).toBeInTheDocument()
  })

  it('shows the missing-correct group error after unchecking the final correct answer exactly once', async () => {
    const user = userEvent.setup()
    render(
      <MultiChoiceAnswerEditor
        onChange={vi.fn()}
        validation={makeValidation()}
        values={[
          { value: 'One', correct: true },
          { value: 'Two', correct: false },
        ]}
      />,
    )

    await user.click(getOptionCheckboxByIndex(0))
    expect(
      screen.getAllByText('Select at least one correct answer.'),
    ).toHaveLength(1)
  })

  it('reveals all invalid required answer fields and the missing-correct group error', () => {
    render(
      <MultiChoiceAnswerEditor
        onChange={vi.fn()}
        validation={makeValidation([
          { path: 'options[0].value', message: 'Option one is required.' },
          { path: 'options[1].value', message: 'Option two is required.' },
        ])}
        validationRevealed
        values={[]}
      />,
    )

    expect(screen.getByText('Option one is required.')).toBeInTheDocument()
    expect(screen.getByText('Option two is required.')).toBeInTheDocument()
    expect(
      screen.getAllByText('Select at least one correct answer.'),
    ).toHaveLength(1)
  })

  it('hides error messages while dragging and restores after drag end', async () => {
    const onChange = vi.fn()

    render(
      <MultiChoiceAnswerEditor
        onChange={onChange}
        validation={makeValidation([
          { path: 'options', message: 'Options error' },
        ])}
        validationRevealed
        values={[]}
      />,
    )

    expect(screen.getAllByText('Options error')).toHaveLength(1)

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
      expect(screen.getAllByText('Options error')).toHaveLength(1)
    })
  })
})
