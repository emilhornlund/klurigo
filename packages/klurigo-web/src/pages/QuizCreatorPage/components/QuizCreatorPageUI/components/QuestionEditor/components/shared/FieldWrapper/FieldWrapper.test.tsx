import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import FieldWrapper from './FieldWrapper'

describe('FieldWrapper', () => {
  it('renders a required marker with the field label', () => {
    render(
      <FieldWrapper label="Question" required>
        <input aria-label="Question" />
      </FieldWrapper>,
    )

    expect(screen.getByText('Question *')).toBeInTheDocument()
    expect(
      screen.getByRole('textbox', { name: 'Question' }),
    ).toBeInTheDocument()
  })

  it('does not render a required marker for optional fields', () => {
    render(
      <FieldWrapper label="Description">
        <input aria-label="Description" />
      </FieldWrapper>,
    )

    expect(screen.getByText('Description')).toBeInTheDocument()
    expect(screen.queryByText('Description *')).not.toBeInTheDocument()
  })
})
