import { MediaType, QuestionPinTolerance } from '@klurigo/common'
import { fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import type { ValidationResult } from '../../../../../../../../../validation'

import PinImageEditor from './PinImageEditor'

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
  InputError: ({ message }: { message: string }) => (
    <div data-testid="input-error">{message}</div>
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
    title,
    type,
    url,
    onChange,
    onClose,
  }: {
    title: string
    type: MediaType
    url?: string
    onChange: (value?: { url: string }) => void
    onClose: () => void
  }) => (
    <div
      data-testid="media-modal"
      data-title={title}
      data-type={type}
      data-url={url ?? ''}>
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
    imageURL,
    value,
    onChange,
  }: {
    children?: ReactNode
    imageURL: string
    value: { x: number; y: number; tolerance?: QuestionPinTolerance }
    onChange?: (position: { x: number; y: number }) => void
  }) => (
    <div
      data-testid="pin-image"
      data-image-url={imageURL}
      data-position-x={value.x}
      data-position-y={value.y}
      data-tolerance={value.tolerance}>
      {children}
      <button type="button" onClick={() => onChange?.({ x: 0.25, y: 0.75 })}>
        move-pin
      </button>
    </div>
  ),
}))

type AnyValidation = ValidationResult<Record<string, unknown>>

function makeValidation(
  errors: Array<{ path: string; message: string }> = [],
): AnyValidation {
  return {
    valid: errors.length === 0,
    errors: errors.map((error) => ({
      path: error.path,
      message: error.message,
      code: 'test',
    })),
  } as unknown as AnyValidation
}

describe('PinImageEditor', () => {
  it('adds an image and forwards the selected URL', () => {
    const onImageUrlChange = vi.fn()

    render(
      <PinImageEditor
        validation={makeValidation()}
        onImageUrlChange={onImageUrlChange}
        onPositionChange={vi.fn()}
      />,
    )

    fireEvent.click(
      screen.getByRole('button', {
        name: /add image to pin question/i,
      }),
    )

    expect(screen.getByTestId('media-modal')).toHaveAttribute(
      'data-title',
      'Add Pin Image',
    )

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
      <PinImageEditor
        imageURL="https://example.com/current.jpg"
        position={{ x: 0.1, y: 0.2 }}
        tolerance={QuestionPinTolerance.Medium}
        validation={makeValidation()}
        onImageUrlChange={onImageUrlChange}
        onPositionChange={onPositionChange}
      />,
    )

    expect(screen.getByTestId('pin-image')).toHaveAttribute(
      'data-image-url',
      'https://example.com/current.jpg',
    )
    expect(screen.getByTestId('pin-image')).toHaveAttribute(
      'data-position-x',
      '0.1',
    )
    expect(screen.getByTestId('pin-image')).toHaveAttribute(
      'data-position-y',
      '0.2',
    )
    expect(screen.getByTestId('pin-image')).toHaveAttribute(
      'data-tolerance',
      QuestionPinTolerance.Medium,
    )

    fireEvent.click(
      screen.getByRole('button', { name: 'replace-image-button' }),
    )

    expect(screen.getByTestId('media-modal')).toHaveAttribute(
      'data-title',
      'Replace Pin Image',
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

  it('shows the shared image picker without the media action button', () => {
    render(
      <PinImageEditor
        validation={makeValidation()}
        onImageUrlChange={vi.fn()}
        onPositionChange={vi.fn()}
      />,
    )

    expect(
      screen.queryByRole('button', {
        name: 'Add image',
      }),
    ).not.toBeInTheDocument()

    expect(
      screen.getByRole('button', {
        name: /add image to pin question/i,
      }),
    ).toBeInTheDocument()

    expect(screen.getByText('Add image to pin question')).toBeInTheDocument()

    expect(screen.getByText('Click to choose an image')).toBeInTheDocument()
  })

  it('shows an image validation error when the missing image is revealed', () => {
    render(
      <PinImageEditor
        validation={makeValidation([
          {
            path: 'imageURL',
            message: 'Required.',
          },
        ])}
        validationRevealed
        onImageUrlChange={vi.fn()}
        onPositionChange={vi.fn()}
      />,
    )

    expect(screen.getByTestId('input-error')).toHaveTextContent(
      'An image is required for Pin questions.',
    )

    expect(screen.queryByText('Required.')).not.toBeInTheDocument()
  })

  it('does not show an image validation error when the pin image is valid', () => {
    render(
      <PinImageEditor
        imageURL="https://example.com/current.jpg"
        position={{ x: 0.5, y: 0.5 }}
        tolerance={QuestionPinTolerance.Medium}
        validation={makeValidation()}
        onImageUrlChange={vi.fn()}
        onPositionChange={vi.fn()}
      />,
    )

    expect(
      screen.queryByText('An image is required for Pin questions.'),
    ).not.toBeInTheDocument()
  })

  it('shows missing-image validation after opening Add Image and cancelling', () => {
    render(
      <PinImageEditor
        validation={makeValidation()}
        onImageUrlChange={vi.fn()}
        onPositionChange={vi.fn()}
      />,
    )

    expect(screen.queryByTestId('input-error')).not.toBeInTheDocument()
    fireEvent.click(
      screen.getByRole('button', { name: /add image to pin question/i }),
    )
    fireEvent.click(screen.getByRole('button', { name: 'close-media' }))
    expect(screen.getByTestId('input-error')).toHaveTextContent(
      'An image is required for Pin questions.',
    )
  })

  it('shows missing-image validation after deletion and clears it once an image exists', () => {
    const onImageUrlChange = vi.fn()
    const props = {
      imageURL: 'https://example.com/current.jpg',
      position: { x: 0.5, y: 0.5 },
      tolerance: QuestionPinTolerance.Medium,
      validation: makeValidation(),
      onImageUrlChange,
      onPositionChange: vi.fn(),
    }
    const { rerender } = render(<PinImageEditor {...props} />)

    fireEvent.click(screen.getByRole('button', { name: 'delete-image-button' }))
    fireEvent.click(screen.getByRole('button', { name: 'Yes' }))
    expect(onImageUrlChange).toHaveBeenCalledWith(undefined)

    rerender(<PinImageEditor {...props} imageURL={undefined} />)
    expect(screen.getByTestId('input-error')).toHaveTextContent(
      'An image is required for Pin questions.',
    )

    rerender(<PinImageEditor {...props} />)
    expect(screen.queryByTestId('input-error')).not.toBeInTheDocument()
  })

  it('shows one useful image-area error for invalid coordinates only when revealed', () => {
    const { rerender } = render(
      <PinImageEditor
        imageURL="https://example.com/current.jpg"
        position={{ x: 2, y: 0.5 }}
        validation={makeValidation([
          { path: 'positionX', message: 'Must be 0 to 1.' },
        ])}
        onImageUrlChange={vi.fn()}
        onPositionChange={vi.fn()}
      />,
    )

    expect(screen.queryByTestId('input-error')).not.toBeInTheDocument()
    rerender(
      <PinImageEditor
        imageURL="https://example.com/current.jpg"
        position={{ x: 2, y: 0.5 }}
        validation={makeValidation([
          { path: 'positionX', message: 'Must be 0 to 1.' },
        ])}
        validationRevealed
        onImageUrlChange={vi.fn()}
        onPositionChange={vi.fn()}
      />,
    )

    expect(screen.getAllByTestId('input-error')).toHaveLength(1)
    expect(screen.getByTestId('input-error')).toHaveTextContent(
      'The pin position is invalid. Place the pin on the image again.',
    )
    expect(screen.queryByText('Must be 0 to 1.')).not.toBeInTheDocument()
  })

  it('shows pin placement guidance when an image is selected', () => {
    render(
      <PinImageEditor
        imageURL="https://example.com/current.jpg"
        position={{ x: 0.5, y: 0.5 }}
        tolerance={QuestionPinTolerance.Medium}
        validation={makeValidation()}
        onImageUrlChange={vi.fn()}
        onPositionChange={vi.fn()}
      />,
    )

    expect(
      screen.getByText('Place the pin on the correct location.'),
    ).toBeInTheDocument()
  })

  it('keeps image actions interactive inside the pin image', () => {
    render(
      <PinImageEditor
        imageURL="https://example.com/current.jpg"
        position={{ x: 0.5, y: 0.5 }}
        tolerance={QuestionPinTolerance.Medium}
        validation={makeValidation()}
        onImageUrlChange={vi.fn()}
        onPositionChange={vi.fn()}
      />,
    )

    const replaceButton = screen.getByRole('button', {
      name: 'replace-image-button',
    })

    fireEvent.pointerDown(replaceButton)
    fireEvent.click(replaceButton)

    expect(screen.getByTestId('media-modal')).toBeInTheDocument()
  })
})
