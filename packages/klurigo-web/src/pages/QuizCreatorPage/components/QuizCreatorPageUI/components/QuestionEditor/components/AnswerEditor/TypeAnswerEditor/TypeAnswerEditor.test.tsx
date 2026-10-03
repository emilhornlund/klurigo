import {
  QUIZ_TYPE_ANSWER_OPTIONS_MAX,
  QUIZ_TYPE_ANSWER_OPTIONS_MIN,
} from '@klurigo/common'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import type { ValidationResult } from '../../../../../../../../../validation'

import TypeAnswerEditor from './TypeAnswerEditor'

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

function optionInput(index: number): HTMLElement {
  return screen.getByPlaceholderText(`Answer ${index + 1}`)
}

describe('TypeAnswerEditor', () => {
  it('starts with the minimum number of answer fields', () => {
    render(
      <TypeAnswerEditor
        onChange={vi.fn()}
        validation={makeValidation()}
        values={[]}
      />,
    )

    expect(screen.getByPlaceholderText('Answer 1')).toBeInTheDocument()

    expect(
      screen.queryByPlaceholderText(
        `Answer ${QUIZ_TYPE_ANSWER_OPTIONS_MIN + 1}`,
      ),
    ).not.toBeInTheDocument()
  })

  it('initializes inputs from values and updates when values change', () => {
    const onChange = vi.fn()

    const { rerender } = render(
      <TypeAnswerEditor
        onChange={onChange}
        validation={makeValidation()}
        values={['One', 'Two']}
      />,
    )

    expect(optionInput(0)).toHaveValue('One')
    expect(optionInput(1)).toHaveValue('Two')

    rerender(
      <TypeAnswerEditor
        onChange={onChange}
        validation={makeValidation()}
        values={['A', 'B', 'C']}
      />,
    )

    expect(optionInput(0)).toHaveValue('A')
    expect(optionInput(1)).toHaveValue('B')
    expect(optionInput(2)).toHaveValue('C')
  })

  it('emits every visible accepted answer when editing', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(
      <TypeAnswerEditor
        onChange={onChange}
        validation={makeValidation()}
        values={[]}
      />,
    )

    await user.type(optionInput(0), 'Alpha')

    expect(lastCallArg<string[]>(onChange.mock)).toEqual(['Alpha'])

    await user.clear(optionInput(0))

    expect(lastCallArg<string[]>(onChange.mock)).toEqual([''])
  })

  it('emits all visible accepted answer values', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(
      <TypeAnswerEditor
        onChange={onChange}
        validation={makeValidation()}
        values={[]}
      />,
    )

    await user.click(
      screen.getByRole('button', {
        name: 'Add another answer',
      }),
    )

    await user.type(optionInput(1), 'Second answer')

    expect(lastCallArg<string[]>(onChange.mock)).toEqual(['', 'Second answer'])

    await user.clear(optionInput(1))

    expect(lastCallArg<string[]>(onChange.mock)).toEqual(['', ''])
  })

  it('keeps option-specific validation attached to its answer field', () => {
    render(
      <TypeAnswerEditor
        onChange={vi.fn()}
        validation={makeValidation([
          {
            path: 'options[0]',
            message: 'Answer is invalid',
          },
        ])}
        validationRevealed
        values={['Invalid']}
      />,
    )

    expect(screen.getByText('Answer is invalid')).toBeInTheDocument()
  })

  it('adds another answer field', async () => {
    const user = userEvent.setup()

    render(
      <TypeAnswerEditor
        onChange={vi.fn()}
        validation={makeValidation()}
        values={[]}
      />,
    )

    expect(screen.queryByPlaceholderText('Answer 2')).not.toBeInTheDocument()

    await user.click(
      screen.getByRole('button', {
        name: 'Add another answer',
      }),
    )

    expect(screen.getByPlaceholderText('Answer 2')).toBeInTheDocument()
  })

  it('allows adding answers up to the maximum', async () => {
    const user = userEvent.setup()

    render(
      <TypeAnswerEditor
        onChange={vi.fn()}
        validation={makeValidation()}
        values={[]}
      />,
    )

    for (
      let count = QUIZ_TYPE_ANSWER_OPTIONS_MIN;
      count < QUIZ_TYPE_ANSWER_OPTIONS_MAX;
      count += 1
    ) {
      await user.click(
        screen.getByRole('button', {
          name: 'Add another answer',
        }),
      )
    }

    expect(
      screen.getByPlaceholderText(`Answer ${QUIZ_TYPE_ANSWER_OPTIONS_MAX}`),
    ).toBeInTheDocument()

    expect(
      screen.queryByRole('button', {
        name: 'Add another answer',
      }),
    ).not.toBeInTheDocument()
  })

  it('deletes an answer above the minimum', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(
      <TypeAnswerEditor
        onChange={onChange}
        validation={makeValidation()}
        values={['First', 'Second']}
      />,
    )

    expect(screen.getByDisplayValue('Second')).toBeInTheDocument()

    const deleteButton = document.getElementById(
      'type-answer-option-1-delete-button',
    )

    expect(deleteButton).toBeInTheDocument()
    expect(deleteButton).toBeEnabled()

    await user.click(deleteButton!)

    expect(screen.queryByDisplayValue('Second')).not.toBeInTheDocument()

    expect(lastCallArg<string[]>(onChange.mock)).toEqual(['First'])
  })

  it('does not allow deleting below the minimum number of answers', () => {
    render(
      <TypeAnswerEditor
        onChange={vi.fn()}
        validation={makeValidation()}
        values={[]}
      />,
    )

    const deleteButton = document.getElementById(
      'type-answer-option-0-delete-button',
    )

    expect(deleteButton).toBeInTheDocument()
    expect(deleteButton).toBeDisabled()
  })

  it('shows a required error after clearing the required answer', async () => {
    const user = userEvent.setup()

    render(
      <TypeAnswerEditor
        onChange={vi.fn()}
        validation={makeValidation()}
        values={['Answer']}
      />,
    )

    expect(
      screen.queryByText('Enter an accepted answer.'),
    ).not.toBeInTheDocument()

    await user.clear(optionInput(0))

    expect(screen.getByText('Enter an accepted answer.')).toBeInTheDocument()

    expect(
      screen.queryByText('Enter at least one accepted answer.'),
    ).not.toBeInTheDocument()
  })

  it('renders accepted answer fields without choice identifiers', () => {
    render(
      <TypeAnswerEditor
        onChange={vi.fn()}
        validation={makeValidation()}
        values={['First', 'Second']}
      />,
    )

    expect(optionInput(0)).toHaveValue('First')
    expect(optionInput(1)).toHaveValue('Second')

    expect(screen.queryByText('A')).not.toBeInTheDocument()
    expect(screen.queryByText('B')).not.toBeInTheDocument()
  })

  it('requires every visible accepted answer', async () => {
    const user = userEvent.setup()

    render(
      <TypeAnswerEditor
        onChange={vi.fn()}
        validation={makeValidation()}
        validationRevealed
        values={[]}
      />,
    )

    expect(screen.getAllByText('Enter an accepted answer.')).toHaveLength(
      QUIZ_TYPE_ANSWER_OPTIONS_MIN,
    )

    await user.click(screen.getByRole('button', { name: 'Add another answer' }))

    expect(screen.getAllByText('Enter an accepted answer.')).toHaveLength(
      QUIZ_TYPE_ANSWER_OPTIONS_MIN + 1,
    )
  })

  it('keeps every visible accepted answer in the emitted model', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(
      <TypeAnswerEditor
        onChange={onChange}
        validation={makeValidation()}
        values={[]}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Add another answer' }))

    await user.type(screen.getByPlaceholderText('Answer 1'), 'First')

    expect(onChange).toHaveBeenLastCalledWith(['First', ''])
  })

  it('does not render collection-level validation', () => {
    render(
      <TypeAnswerEditor
        onChange={vi.fn()}
        validation={makeValidation([
          {
            path: 'options',
            message: 'The answer collection is invalid.',
          },
        ])}
        validationRevealed
        values={[]}
      />,
    )

    expect(
      screen.queryByText('The answer collection is invalid.'),
    ).not.toBeInTheDocument()
  })
})
