import { QUIZ_PUZZLE_VALUES_MAX, QUIZ_PUZZLE_VALUES_MIN } from '@klurigo/common'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import type { ValidationResult } from '../../../../../../../../../validation'

import PuzzleAnswerEditor from './PuzzleAnswerEditor'

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

function valueInput(index: number): HTMLElement {
  return screen.getByPlaceholderText(`Item ${index + 1}`)
}

describe('PuzzleAnswerEditor', () => {
  it('starts with the minimum number of puzzle values', () => {
    render(
      <PuzzleAnswerEditor
        onChange={vi.fn()}
        validation={makeValidation()}
        value={[]}
      />,
    )

    for (let index = 0; index < QUIZ_PUZZLE_VALUES_MIN; index += 1) {
      expect(valueInput(index)).toBeInTheDocument()
    }

    expect(
      screen.queryByPlaceholderText(`Item ${QUIZ_PUZZLE_VALUES_MIN + 1}`),
    ).not.toBeInTheDocument()
  })

  it('initializes from value prop and updates when value changes', () => {
    const onChange = vi.fn()

    const { rerender } = render(
      <PuzzleAnswerEditor
        onChange={onChange}
        validation={makeValidation()}
        value={['A', 'B', 'C']}
      />,
    )

    expect(valueInput(0)).toHaveValue('A')
    expect(valueInput(1)).toHaveValue('B')
    expect(valueInput(2)).toHaveValue('C')

    rerender(
      <PuzzleAnswerEditor
        onChange={onChange}
        validation={makeValidation()}
        value={['AA', 'BB', 'CC', 'DD']}
      />,
    )

    expect(valueInput(0)).toHaveValue('AA')
    expect(valueInput(1)).toHaveValue('BB')
    expect(valueInput(2)).toHaveValue('CC')
    expect(valueInput(3)).toHaveValue('DD')
  })

  it('emits every visible puzzle value when editing', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(
      <PuzzleAnswerEditor
        onChange={onChange}
        validation={makeValidation()}
        value={[]}
      />,
    )

    await user.type(valueInput(0), 'Alpha')
    await user.type(valueInput(1), 'Beta')

    expect(lastCallArg<string[]>(onChange.mock)).toEqual(['Alpha', 'Beta', ''])
  })

  it('adds puzzle values and emits them in order', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(
      <PuzzleAnswerEditor
        onChange={onChange}
        validation={makeValidation()}
        value={['First', 'Second', 'Third']}
      />,
    )

    await user.click(
      screen.getByRole('button', {
        name: 'Add another item',
      }),
    )

    await user.type(valueInput(3), 'Fourth')

    expect(lastCallArg<string[]>(onChange.mock)).toEqual([
      'First',
      'Second',
      'Third',
      'Fourth',
    ])
  })

  it('keeps every visible puzzle value in the model when values are cleared', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(
      <PuzzleAnswerEditor
        onChange={onChange}
        validation={makeValidation()}
        value={[]}
      />,
    )

    await user.type(valueInput(0), 'X')
    await user.clear(valueInput(0))

    expect(lastCallArg<string[]>(onChange.mock)).toEqual(['', '', ''])
  })

  it('keeps value-specific validation attached to its field', () => {
    render(
      <PuzzleAnswerEditor
        onChange={vi.fn()}
        validation={makeValidation([
          {
            path: 'values[1]',
            message: 'Value is invalid',
          },
        ])}
        validationRevealed
        value={['First', 'Invalid', 'Third']}
      />,
    )

    expect(screen.getByText('Value is invalid')).toBeInTheDocument()
  })

  it('renders numeric order indicators for visible values', () => {
    render(
      <PuzzleAnswerEditor
        onChange={vi.fn()}
        validation={makeValidation()}
        value={['First', 'Second', 'Third']}
      />,
    )

    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('adds another puzzle value', async () => {
    const user = userEvent.setup()

    render(
      <PuzzleAnswerEditor
        onChange={vi.fn()}
        validation={makeValidation()}
        value={[]}
      />,
    )

    expect(
      screen.queryByPlaceholderText(`Item ${QUIZ_PUZZLE_VALUES_MIN + 1}`),
    ).not.toBeInTheDocument()

    await user.click(
      screen.getByRole('button', {
        name: 'Add another item',
      }),
    )

    expect(
      screen.getByPlaceholderText(`Item ${QUIZ_PUZZLE_VALUES_MIN + 1}`),
    ).toBeInTheDocument()
  })

  it('allows adding values up to the maximum', async () => {
    const user = userEvent.setup()

    render(
      <PuzzleAnswerEditor
        onChange={vi.fn()}
        validation={makeValidation()}
        value={[]}
      />,
    )

    for (
      let count = QUIZ_PUZZLE_VALUES_MIN;
      count < QUIZ_PUZZLE_VALUES_MAX;
      count += 1
    ) {
      await user.click(
        screen.getByRole('button', {
          name: 'Add another item',
        }),
      )
    }

    expect(
      screen.getByPlaceholderText(`Item ${QUIZ_PUZZLE_VALUES_MAX}`),
    ).toBeInTheDocument()

    expect(
      screen.queryByRole('button', {
        name: 'Add another item',
      }),
    ).not.toBeInTheDocument()
  })

  it('deletes a puzzle value above the minimum', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(
      <PuzzleAnswerEditor
        onChange={onChange}
        validation={makeValidation()}
        value={['First', 'Second', 'Third', 'Fourth']}
      />,
    )

    const deleteButton = document.getElementById('puzzle-value-3-delete-button')

    expect(deleteButton).toBeInTheDocument()
    expect(deleteButton).toBeEnabled()

    await user.click(deleteButton!)

    expect(screen.queryByDisplayValue('Fourth')).not.toBeInTheDocument()

    expect(lastCallArg<string[]>(onChange.mock)).toEqual([
      'First',
      'Second',
      'Third',
    ])
  })

  it('does not allow deleting below the minimum number of values', () => {
    render(
      <PuzzleAnswerEditor
        onChange={vi.fn()}
        validation={makeValidation()}
        value={['First', 'Second', 'Third']}
      />,
    )

    const deleteButton = document.getElementById('puzzle-value-0-delete-button')

    expect(deleteButton).toBeInTheDocument()
    expect(deleteButton).toBeDisabled()
  })

  it('shows permanent minimum/order guidance and reveals all invalid required rows', () => {
    render(
      <PuzzleAnswerEditor
        onChange={vi.fn()}
        validation={makeValidation([
          { path: 'values[0]', message: 'First value is invalid.' },
          { path: 'values[1]', message: 'Second value is invalid.' },
        ])}
        validationRevealed
        value={[]}
      />,
    )

    expect(
      screen.getByText('Add at least 3 items in the correct order.'),
    ).toBeInTheDocument()
    expect(screen.getByText('First value is invalid.')).toBeInTheDocument()
    expect(screen.getByText('Second value is invalid.')).toBeInTheDocument()
  })

  it('requires every visible puzzle value', async () => {
    const user = userEvent.setup()

    render(
      <PuzzleAnswerEditor
        onChange={vi.fn()}
        validation={makeValidation()}
        validationRevealed
        value={[]}
      />,
    )

    expect(screen.getAllByText('Enter a puzzle item.')).toHaveLength(
      QUIZ_PUZZLE_VALUES_MIN,
    )

    await user.click(screen.getByRole('button', { name: 'Add another item' }))

    expect(screen.getAllByText('Enter a puzzle item.')).toHaveLength(
      QUIZ_PUZZLE_VALUES_MIN + 1,
    )
  })

  it('keeps every visible puzzle value in the emitted model', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(
      <PuzzleAnswerEditor
        onChange={onChange}
        validation={makeValidation()}
        value={[]}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Add another item' }))

    await user.type(screen.getByPlaceholderText('Item 1'), 'First')

    expect(onChange).toHaveBeenLastCalledWith(['First', '', '', ''])
  })

  it('does not render collection-level validation', () => {
    render(
      <PuzzleAnswerEditor
        onChange={vi.fn()}
        validation={makeValidation([
          {
            path: 'values',
            message: 'The value collection is invalid.',
          },
        ])}
        validationRevealed
        value={[]}
      />,
    )

    expect(
      screen.queryByText('The value collection is invalid.'),
    ).not.toBeInTheDocument()
  })
})
