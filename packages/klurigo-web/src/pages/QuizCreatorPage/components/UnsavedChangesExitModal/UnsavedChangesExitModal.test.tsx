import { fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { describe, expect, it, vi } from 'vitest'

import UnsavedChangesExitModal from './UnsavedChangesExitModal'

vi.mock('../../../../components', () => ({
  ConfirmDialog: ({
    title,
    message,
    open,
    confirmTitle,
    closeTitle,
    onConfirm,
    onClose,
  }: {
    title: string
    message: string
    open: boolean
    confirmTitle: string
    closeTitle: string
    onConfirm: () => void
    onClose: () => void
  }) =>
    open ? (
      <div role="dialog" aria-label={title}>
        <div>{message}</div>
        <button type="button" onClick={onClose}>
          {closeTitle}
        </button>
        <button type="button" onClick={onConfirm}>
          {confirmTitle}
        </button>
      </div>
    ) : null,
}))

describe('UnsavedChangesExitModal', () => {
  it('renders the exit confirmation copy and actions', () => {
    render(<UnsavedChangesExitModal onReset={vi.fn()} onConfirm={vi.fn()} />)

    expect(
      screen.getByRole('dialog', { name: 'Leave your quiz?' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        'You have unsaved changes. If you leave now, your changes will be lost.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Stay' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Leave' })).toBeInTheDocument()
  })

  it('calls onReset when Stay is clicked', () => {
    const onReset = vi.fn()

    render(<UnsavedChangesExitModal onReset={onReset} onConfirm={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Stay' }))

    expect(onReset).toHaveBeenCalledTimes(1)
  })

  it('calls onConfirm when Leave is clicked', () => {
    const onConfirm = vi.fn()

    render(<UnsavedChangesExitModal onReset={vi.fn()} onConfirm={onConfirm} />)

    fireEvent.click(screen.getByRole('button', { name: 'Leave' }))

    expect(onConfirm).toHaveBeenCalledTimes(1)
  })
})
