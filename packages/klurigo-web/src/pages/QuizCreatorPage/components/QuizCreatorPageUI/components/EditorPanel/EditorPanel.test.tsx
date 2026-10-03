import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { describe, expect, it } from 'vitest'

import EditorPanel from './EditorPanel'

describe('EditorPanel', () => {
  it('renders a titled semantic panel with content styling and forwarded attributes', () => {
    render(
      <EditorPanel as="nav" title="Questions" aria-label="Question list">
        <button type="button">First question</button>
      </EditorPanel>,
    )

    expect(
      screen.getByRole('navigation', { name: 'Question list' }),
    ).toHaveTextContent('Questions')
    expect(
      screen.getByRole('button', { name: 'First question' }),
    ).toBeInTheDocument()
  })

  it('supports an untitled panel and a custom content class', () => {
    const { container } = render(
      <EditorPanel contentClassName="custom-content">Panel body</EditorPanel>,
    )

    expect(screen.queryByRole('heading')).not.toBeInTheDocument()
    expect(container.querySelector('.custom-content')).toHaveTextContent(
      'Panel body',
    )
  })
})
