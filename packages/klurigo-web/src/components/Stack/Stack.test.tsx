import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import Stack from './Stack'

describe('Stack', () => {
  it('renders its children', () => {
    render(
      <Stack>
        <span>First</span>
        <span>Second</span>
      </Stack>,
    )

    expect(screen.getByText('First')).toBeInTheDocument()
    expect(screen.getByText('Second')).toBeInTheDocument()
  })

  it('uses vertical intrinsic-width layout by default', () => {
    render(<Stack data-testid="stack">Content</Stack>)

    expect(screen.getByTestId('stack')).toHaveClass('vertical')
    expect(screen.getByTestId('stack')).not.toHaveClass(
      'width-content',
      'width-full',
    )
  })

  it('uses stack spacing by default', () => {
    render(<Stack data-testid="stack">Content</Stack>)

    expect(screen.getByTestId('stack')).toHaveClass('spacing-stack')
  })

  it('supports compact spacing', () => {
    render(
      <Stack data-testid="stack" spacing="compact">
        Content
      </Stack>,
    )

    expect(screen.getByTestId('stack')).toHaveClass('spacing-compact')
  })

  it('supports horizontal layout', () => {
    render(
      <Stack data-testid="stack" direction="horizontal">
        Content
      </Stack>,
    )

    expect(screen.getByTestId('stack')).toHaveClass('horizontal')
  })

  it('supports alignment', () => {
    render(
      <Stack data-testid="stack" align="center">
        Content
      </Stack>,
    )

    expect(screen.getByTestId('stack')).toHaveClass('align-center')
  })

  it('supports justification', () => {
    render(
      <Stack data-testid="stack" justify="space-between">
        Content
      </Stack>,
    )

    expect(screen.getByTestId('stack')).toHaveClass('justify-space-between')
  })

  it('supports full width', () => {
    render(
      <Stack data-testid="stack" width="full">
        Content
      </Stack>,
    )

    expect(screen.getByTestId('stack')).toHaveClass('width-full')
  })

  it('supports responsive content width', () => {
    render(
      <Stack data-testid="stack" width="content">
        Content
      </Stack>,
    )

    expect(screen.getByTestId('stack')).toHaveClass('width-content')
  })

  it('preserves form semantics', () => {
    render(
      <Stack as="form" aria-label="Example form">
        <button type="submit">Submit</button>
      </Stack>,
    )

    expect(screen.getByRole('form', { name: 'Example form' })).toHaveClass(
      'vertical',
    )
  })

  it('supports a custom element', () => {
    render(
      <Stack as="section" data-testid="stack">
        Content
      </Stack>,
    )

    expect(screen.getByTestId('stack').tagName).toBe('SECTION')
  })

  it('forwards a custom class name', () => {
    render(
      <Stack data-testid="stack" className="custom-class">
        Content
      </Stack>,
    )

    expect(screen.getByTestId('stack')).toHaveClass('custom-class')
  })
})
