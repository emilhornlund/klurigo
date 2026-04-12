import { fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import UnsavedChangesExitModal from './UnsavedChangesExitModal'

vi.mock('../../../../components', () => ({
  Modal: ({
    title,
    open,
    children,
  }: {
    title: string
    open: boolean
    children?: ReactNode
  }) =>
    open ? (
      <div role="dialog" aria-label={title}>
        {children}
      </div>
    ) : null,
}))

vi.mock('../../../../components/Button', () => ({
  default: ({
    id,
    value,
    onClick,
  }: {
    id?: string
    value: string
    onClick: () => void
  }) => (
    <button id={id} type="button" onClick={onClick}>
      {value}
    </button>
  ),
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
