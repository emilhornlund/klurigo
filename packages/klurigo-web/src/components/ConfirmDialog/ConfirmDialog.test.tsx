import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import ConfirmDialog, { type ConfirmDialogProps } from './ConfirmDialog'

describe('ConfirmDialog', () => {
  const defaultProps: ConfirmDialogProps = {
    title: 'Confirm Deletion',
    message: 'Are you sure you want to delete this item?',
    open: true,
    onConfirm: vi.fn(),
    onClose: vi.fn(),
  }

  it('renders correctly when open', () => {
    render(<ConfirmDialog {...defaultProps} />)

    expect(screen.getByText('Confirm Deletion')).toBeInTheDocument()
    expect(
      screen.getByText('Are you sure you want to delete this item?'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /confirm/i })).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Close dialog' }),
    ).toBeInTheDocument()
  })

  it('does not render when not open', () => {
    render(<ConfirmDialog {...defaultProps} open={false} />)

    expect(screen.queryByText('Confirm Deletion')).not.toBeInTheDocument()
    expect(
      screen.queryByText('Are you sure you want to delete this item?'),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /confirm/i }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Close dialog' }),
    ).not.toBeInTheDocument()
  })

  it('calls onConfirm when the Confirm button is clicked', () => {
    const onConfirm = vi.fn()
    render(<ConfirmDialog {...defaultProps} onConfirm={onConfirm} />)

    fireEvent.click(screen.getByRole('button', { name: /confirm/i }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when the Close button is clicked', () => {
    const onClose = vi.fn()
    render(<ConfirmDialog {...defaultProps} onClose={onClose} />)

    fireEvent.click(screen.getByRole('button', { name: 'Close dialog' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('renders title and message with the correct IDs', () => {
    render(<ConfirmDialog {...defaultProps} />)

    const titleElement = screen.getByText('Confirm Deletion')
    const messageElement = screen.getByText(
      'Are you sure you want to delete this item?',
    )

    expect(titleElement).toHaveAttribute('id')
    expect(messageElement).toBeInTheDocument()
  })
})
