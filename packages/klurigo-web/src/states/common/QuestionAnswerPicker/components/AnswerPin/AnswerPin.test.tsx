import { QuestionType } from '@klurigo/common'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import AnswerPin from './AnswerPin'

type MockPinImageProps = {
  value: { x: number; y: number }
  onChange?: (position: { x: number; y: number }) => void
  imageURL: string
  fit?: string
  accessibleLabel?: string
  disabled?: boolean
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
vi.mock('../../../../../components', async (orig: any) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const actual: any = await orig()
  const PinImage = ({
    value,
    onChange,
    imageURL,
    fit,
    accessibleLabel,
    disabled,
  }: MockPinImageProps) => (
    <div
      data-fit={fit}
      role={accessibleLabel ? 'group' : undefined}
      aria-label={accessibleLabel}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(event) => {
        if (event.key === 'ArrowRight' && !disabled) {
          onChange?.({ x: value.x + 0.01, y: value.y })
        }
      }}>
      <div data-testid="pin-value">{JSON.stringify(value)}</div>
      <button
        type="button"
        data-testid="move-pin"
        onClick={() => onChange?.({ x: 0.12, y: 0.34 })}>
        Move Pin
      </button>
      <img alt="pin-image" src={imageURL} />
    </div>
  )
  return { ...actual, PinImage }
})

describe('AnswerPin', () => {
  it('renders interactive mode', () => {
    const { container } = render(
      <AnswerPin
        imageURL="/img.png"
        interactive
        loading={false}
        onSubmit={vi.fn()}
      />,
    )
    expect(screen.getByTestId('pin-value')).toHaveTextContent(
      JSON.stringify({ x: 0.5, y: 0.5 }),
    )
    expect(screen.getByTestId('pin-image-area')).toContainElement(
      screen.getByTestId('pin-value'),
    )
    expect(
      screen.getByTestId('pin-image-area').firstElementChild,
    ).toHaveAttribute('data-fit', 'contain')
    expect(screen.getByRole('button', { name: /submit my pin/i })).toBeVisible()
    expect(container).toMatchSnapshot()
  })

  it('submits initial position when no movement', () => {
    const onSubmit = vi.fn()
    render(
      <AnswerPin
        imageURL="/img.png"
        interactive
        loading={false}
        onSubmit={onSubmit}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /submit my pin/i }))

    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit).toHaveBeenCalledWith({ x: 0.5, y: 0.5 })
  })

  it('updates position via PinImage and submits new value', () => {
    const onSubmit = vi.fn()
    render(
      <AnswerPin
        imageURL="/img.png"
        interactive
        loading={false}
        onSubmit={onSubmit}
      />,
    )

    fireEvent.click(screen.getByTestId('move-pin'))
    expect(screen.getByTestId('pin-value')).toHaveTextContent(
      JSON.stringify({ x: 0.12, y: 0.34 }),
    )

    fireEvent.click(screen.getByRole('button', { name: /submit my pin/i }))
    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit).toHaveBeenLastCalledWith({ x: 0.12, y: 0.34 })
  })

  it('announces a keyboard-selected position and submits it without accidental submission', () => {
    const onSubmit = vi.fn()
    render(
      <AnswerPin
        imageURL="/img.png"
        interactive
        loading={false}
        onSubmit={onSubmit}
      />,
    )

    const control = screen.getByRole('group', {
      name: /choose a pin location/i,
    })
    fireEvent.keyDown(control, { key: 'ArrowRight' })

    expect(screen.getByRole('status')).toHaveTextContent(
      'Pin position: 51% from left, 50% from top.',
    )
    expect(onSubmit).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: /submit my pin/i }))
    expect(onSubmit).toHaveBeenCalledWith({ x: 0.51, y: 0.5 })
  })

  it('restores the submitted pin location from the answer event', () => {
    const { rerender } = render(
      <AnswerPin
        imageURL="/img.png"
        interactive
        loading={false}
        onSubmit={vi.fn()}
      />,
    )

    rerender(
      <AnswerPin
        imageURL="/img.png"
        interactive
        loading={false}
        onSubmit={vi.fn()}
        submittedAnswer={{ type: QuestionType.Pin, value: '0.12,0.34' }}
      />,
    )

    expect(screen.getByTestId('pin-value')).toHaveTextContent(
      JSON.stringify({ x: 0.12, y: 0.34 }),
    )
    expect(
      screen.queryByRole('button', { name: /submit my pin/i }),
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('group', { name: /choose a pin location/i }),
    ).toHaveAttribute('tabindex', '-1')
  })

  it('keeps the default map location for an invalid submitted coordinate', () => {
    render(
      <AnswerPin
        imageURL="/img.png"
        interactive
        loading={false}
        onSubmit={vi.fn()}
        submittedAnswer={{ type: QuestionType.Pin, value: 'invalid,3' }}
      />,
    )

    expect(screen.getByTestId('pin-value')).toHaveTextContent(
      JSON.stringify({ x: 0.5, y: 0.5 }),
    )
  })

  it('renders non-interactive mode without submit button', () => {
    const { container } = render(
      <AnswerPin
        imageURL="/img.png"
        interactive={false}
        loading={false}
        onSubmit={vi.fn()}
      />,
    )
    expect(
      screen.queryByRole('button', { name: /submit my pin/i }),
    ).not.toBeInTheDocument()
    expect(screen.getByTestId('pin-image-area')).toBeInTheDocument()
    expect(container).toMatchSnapshot()
  })
})
