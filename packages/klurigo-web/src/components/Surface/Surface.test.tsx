import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import Surface from './Surface'

describe('Surface', () => {
  test('renders a non-interactive surface by default', () => {
    render(<Surface>Content</Surface>)

    const surface = screen.getByText('Content')
    expect(surface).toHaveClass('surface')
    expect(surface).not.toHaveClass('interactive')
  })

  test('supports an explicitly interactive button surface', () => {
    render(
      <Surface as="button" type="button" interactive>
        Content
      </Surface>,
    )

    const surface = screen.getByRole('button', { name: 'Content' })
    expect(surface).toHaveClass('surface', 'interactive')
  })
})
