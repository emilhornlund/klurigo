import { fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { describe, expect, it, vi } from 'vitest'

import type { ValidationResult } from '../../../../../../../../../validation'

import ZeroToOneHundredRangeAnswerEditor from './ZeroToOneHundredRangeAnswerEditor'

type AnyValidation = ValidationResult<Record<string, unknown>>

function makeValidation(
  errors: Array<{ path: string; message: string }> = [],
): AnyValidation {
  return {
    valid: errors.length === 0,
    errors,
  } as unknown as AnyValidation
}

describe('ZeroToOneHundredRangeAnswerEditor', () => {
  it('shows the allowed range and valid default without an error', () => {
    render(
      <ZeroToOneHundredRangeAnswerEditor
        value={50}
        min={0}
        max={100}
        validation={makeValidation()}
        onChange={vi.fn()}
      />,
    )

    expect(screen.getByText('Correct answer (0–100) *')).toBeInTheDocument()
    expect(
      screen.getByTestId('test-range-correct-textfield-textfield'),
    ).toHaveValue(50)
    expect(
      screen.queryByRole('img', { name: /error/i }),
    ).not.toBeInTheDocument()
  })

  it('uses ordinary interaction and question-revealed behavior for an invalid answer', () => {
    const validation = makeValidation([
      { path: 'correct', message: 'Must be between 0 and 100.' },
    ])
    const { rerender } = render(
      <ZeroToOneHundredRangeAnswerEditor
        value={-10}
        min={0}
        max={100}
        validation={validation}
        onChange={vi.fn()}
        validationRevealed={false}
      />,
    )
    const input = screen.getByTestId('test-range-correct-textfield-textfield')

    expect(
      screen.queryByText('Must be between 0 and 100.'),
    ).not.toBeInTheDocument()
    fireEvent.focus(input)
    fireEvent.blur(input)
    expect(screen.getByText('Must be between 0 and 100.')).toBeInTheDocument()

    rerender(
      <ZeroToOneHundredRangeAnswerEditor
        value={-10}
        min={0}
        max={100}
        validation={validation}
        onChange={vi.fn()}
        validationRevealed
      />,
    )
    expect(screen.getByText('Must be between 0 and 100.')).toBeInTheDocument()
  })
})
