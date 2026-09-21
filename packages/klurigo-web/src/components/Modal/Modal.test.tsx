import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import Modal from './Modal'

describe('Modal', () => {
  it('should not render when closed', () => {
    render(<Modal title="Test modal">Content</Modal>)

    expect(screen.queryByText('Test modal')).not.toBeInTheDocument()
  })

  it('should render content when open', () => {
    render(
      <Modal title="Test modal" open>
        Content
      </Modal>,
    )

    expect(screen.getByText('Test modal')).toBeInTheDocument()
    expect(screen.getByText('Content')).toBeInTheDocument()
  })

  it('should not render close controls without a close action', () => {
    render(
      <Modal title="Test modal" open>
        Content
      </Modal>,
    )

    expect(
      screen.queryByTestId('test-close-modal-button-button'),
    ).not.toBeInTheDocument()

    expect(
      screen.queryByTestId('test-modal-close-action-button-button'),
    ).not.toBeInTheDocument()
  })

  it('should render only the header close button when the close action has no label', () => {
    const onClose = vi.fn()

    render(
      <Modal
        title="Test modal"
        open
        closeAction={{
          onClick: onClose,
        }}>
        Content
      </Modal>,
    )

    const closeButton = screen.getByTestId('test-close-modal-button-button')

    expect(closeButton).toBeInTheDocument()
    expect(
      screen.queryByTestId('test-modal-close-action-button-button'),
    ).not.toBeInTheDocument()

    fireEvent.click(closeButton)

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('should render both close buttons when the close action has a label', () => {
    const onClose = vi.fn()

    render(
      <Modal
        title="Test modal"
        open
        closeAction={{
          label: 'Cancel',
          onClick: onClose,
        }}>
        Content
      </Modal>,
    )

    expect(
      screen.getByTestId('test-close-modal-button-button'),
    ).toBeInTheDocument()

    expect(
      screen.getByTestId('test-modal-close-action-button-button'),
    ).toHaveTextContent('Cancel')
  })

  it('should use the same close action for the header and footer buttons', () => {
    const onClose = vi.fn()

    render(
      <Modal
        title="Test modal"
        open
        closeAction={{
          label: 'Cancel',
          onClick: onClose,
        }}>
        Content
      </Modal>,
    )

    fireEvent.click(screen.getByTestId('test-close-modal-button-button'))
    fireEvent.click(screen.getByTestId('test-modal-close-action-button-button'))

    expect(onClose).toHaveBeenCalledTimes(2)
  })

  it('should render a primary action', () => {
    const onClick = vi.fn()

    render(
      <Modal
        title="Test modal"
        open
        primaryAction={{
          label: 'Apply',
          onClick,
        }}>
        Content
      </Modal>,
    )

    const button = screen.getByTestId('test-modal-primary-action-button-button')

    expect(button).toHaveTextContent('Apply')

    fireEvent.click(button)

    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('should render the close action before the primary action', () => {
    render(
      <Modal
        title="Test modal"
        open
        closeAction={{
          label: 'Cancel',
          onClick: vi.fn(),
        }}
        primaryAction={{
          label: 'Apply',
          onClick: vi.fn(),
        }}>
        Content
      </Modal>,
    )

    const closeButton = screen.getByTestId(
      'test-modal-close-action-button-button',
    )
    const primaryButton = screen.getByTestId(
      'test-modal-primary-action-button-button',
    )

    expect(closeButton.compareDocumentPosition(primaryButton)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    )
  })

  it('should disable the primary action when disabled', () => {
    render(
      <Modal
        title="Test modal"
        open
        primaryAction={{
          label: 'Apply',
          disabled: true,
          onClick: vi.fn(),
        }}>
        Content
      </Modal>,
    )

    expect(
      screen.getByTestId('test-modal-primary-action-button-button'),
    ).toBeDisabled()
  })

  it('should disable the primary action while loading', () => {
    render(
      <Modal
        title="Test modal"
        open
        primaryAction={{
          label: 'Apply',
          loading: true,
          onClick: vi.fn(),
        }}>
        Content
      </Modal>,
    )

    expect(
      screen.getByTestId('test-modal-primary-action-button-button'),
    ).toBeDisabled()
  })
})
