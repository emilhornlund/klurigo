import { MediaType, QuestionPinTolerance } from '@klurigo/common'
import { fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import PinQuestionField from './PinQuestionField'

vi.mock('../../../../../../../../../components', () => ({
  Button: ({
    id,
    value,
    onClick,
  }: {
    id: string
    value?: string
    onClick?: () => void
  }) => (
    <button type="button" id={id} onClick={onClick}>
      {value ?? id}
    </button>
  ),
  ConfirmDialog: ({
    open,
    confirmTitle,
    closeTitle,
    onConfirm,
    onClose,
  }: {
    open: boolean
    confirmTitle?: string
    closeTitle?: string
    onConfirm?: () => void
    onClose?: () => void
  }) =>
    open ? (
      <div data-testid="confirm-dialog">
        <button type="button" onClick={onConfirm}>
          {confirmTitle}
        </button>
        <button type="button" onClick={onClose}>
          {closeTitle}
        </button>
      </div>
    ) : null,
  MediaModal: ({
    type,
    url,
    onChange,
    onClose,
  }: {
    type: MediaType
    url?: string
    onChange: (value?: { url: string }) => void
    onClose: () => void
  }) => (
    <div data-testid="media-modal" data-type={type} data-url={url ?? ''}>
      <button
        type="button"
        onClick={() => onChange({ url: 'https://example.com/new.jpg' })}>
        choose-media
      </button>
      <button type="button" onClick={() => onChange(undefined)}>
        clear-media
      </button>
      <button type="button" onClick={onClose}>
        close-media
      </button>
    </div>
  ),
  PinImage: ({
    children,
    onChange,
  }: {
    children?: ReactNode
    onChange?: (position: { x: number; y: number }) => void
  }) => (
    <div data-testid="pin-image">
      {children}
      <button type="button" onClick={() => onChange?.({ x: 0.25, y: 0.75 })}>
        move-pin
      </button>
    </div>
  ),
}))

describe('PinQuestionField', () => {
  it('adds an image and forwards the selected URL', () => {
    const onImageUrlChange = vi.fn()

    render(
      <PinQuestionField
        onImageUrlChange={onImageUrlChange}
        onPositionChange={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Add Pin Image' }))
    expect(screen.getByTestId('media-modal')).toHaveAttribute(
      'data-type',
      MediaType.Image,
    )

    fireEvent.click(screen.getByRole('button', { name: 'choose-media' }))
    expect(onImageUrlChange).toHaveBeenCalledWith('https://example.com/new.jpg')
  })

  it('replaces or clears an existing image after confirmation', () => {
    const onImageUrlChange = vi.fn()
    const onPositionChange = vi.fn()

    render(
      <PinQuestionField
        imageURL="https://example.com/current.jpg"
        position={{ x: 0.1, y: 0.2 }}
        tolerance={QuestionPinTolerance.Medium}
        onImageUrlChange={onImageUrlChange}
        onPositionChange={onPositionChange}
      />,
    )

    fireEvent.click(
      screen.getByRole('button', { name: 'replace-image-button' }),
    )
    expect(screen.getByTestId('media-modal')).toHaveAttribute(
      'data-url',
      'https://example.com/current.jpg',
    )
    fireEvent.click(screen.getByRole('button', { name: 'clear-media' }))
    expect(onImageUrlChange).toHaveBeenCalledWith(undefined)

    fireEvent.click(screen.getByRole('button', { name: 'close-media' }))
    fireEvent.click(screen.getByRole('button', { name: 'delete-image-button' }))
    fireEvent.click(screen.getByRole('button', { name: 'No' }))
    expect(onImageUrlChange).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: 'delete-image-button' }))
    fireEvent.click(screen.getByRole('button', { name: 'Yes' }))
    expect(onImageUrlChange).toHaveBeenLastCalledWith(undefined)

    fireEvent.click(screen.getByRole('button', { name: 'move-pin' }))
    expect(onPositionChange).toHaveBeenCalledWith({ x: 0.25, y: 0.75 })
  })
})
