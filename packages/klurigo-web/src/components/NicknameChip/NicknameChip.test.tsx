import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import NicknameChip from './NicknameChip'
import styles from './NicknameChip.module.scss'

vi.mock('@fortawesome/react-fontawesome', () => ({
  FontAwesomeIcon: ({ icon }: { icon: unknown }) => (
    <span data-testid="fa-icon" data-icon={String(icon)} />
  ),
}))

vi.mock('@fortawesome/free-solid-svg-icons', () => ({
  faXmark: 'faXmark',
}))

describe('NicknameChip', () => {
  it('renders the nickname value', () => {
    render(<NicknameChip value="Emil" />)
    expect(screen.getByText('Emil')).toBeInTheDocument()
  })

  it('applies base + default variant + default animation classes', () => {
    const { container } = render(<NicknameChip value="Player 1" />)

    const root = container.firstElementChild as HTMLElement
    expect(root).toBeTruthy()

    expect(root).toHaveClass(styles.main)
    expect(root).toHaveClass(styles.subtle)

    expect(root).not.toHaveClass(styles.accent)
    expect(root).not.toHaveClass(styles.entrance)
    expect(root).not.toHaveClass(styles.exit)
    expect(root).not.toHaveClass(styles.shake)
  })

  it('applies the "accent" variant class when variant="accent"', () => {
    const { container } = render(
      <NicknameChip value="Player 2" variant="accent" />,
    )

    const root = container.firstElementChild as HTMLElement
    expect(root).toHaveClass(styles.main)
    expect(root).toHaveClass(styles.accent)

    expect(root).not.toHaveClass(styles.subtle)
  })

  it('applies the "entrance" animation class when animationState="entrance"', () => {
    const { container } = render(
      <NicknameChip value="Player 3" animationState="entrance" />,
    )

    const root = container.firstElementChild as HTMLElement
    expect(root).toHaveClass(styles.entrance)

    expect(root).not.toHaveClass(styles.exit)
    expect(root).not.toHaveClass(styles.shake)
  })

  it('applies the "exit" animation class when animationState="exit"', () => {
    const { container } = render(
      <NicknameChip value="Player 4" animationState="exit" />,
    )

    const root = container.firstElementChild as HTMLElement
    expect(root).toHaveClass(styles.exit)

    expect(root).not.toHaveClass(styles.entrance)
    expect(root).not.toHaveClass(styles.shake)
  })

  it('applies the "shake" animation class when animationState="shake"', () => {
    const { container } = render(
      <NicknameChip value="Player 5" animationState="shake" />,
    )

    const root = container.firstElementChild as HTMLElement
    expect(root).toHaveClass(styles.shake)

    expect(root).not.toHaveClass(styles.entrance)
    expect(root).not.toHaveClass(styles.exit)
  })

  it('does not apply any animation class when animationState="none"', () => {
    const { container } = render(
      <NicknameChip value="Player 6" animationState="none" />,
    )

    const root = container.firstElementChild as HTMLElement
    expect(root).not.toHaveClass(styles.entrance)
    expect(root).not.toHaveClass(styles.exit)
    expect(root).not.toHaveClass(styles.shake)
  })

  it('does not render the delete button when onDelete is not provided', () => {
    const { container } = render(<NicknameChip value="No delete" />)

    expect(container.querySelector('button')).toBeNull()
    expect(screen.queryByTestId('fa-icon')).toBeNull()
  })

  it('renders the delete button and icon when onDelete is provided', () => {
    const onDelete = vi.fn()
    const { container } = render(
      <NicknameChip value="Deletable" onDelete={onDelete} />,
    )

    const button = container.querySelector('button')
    expect(button).toBeTruthy()
    expect(button).toHaveClass(styles.deleteButton)

    expect(screen.getByTestId('fa-icon')).toBeInTheDocument()
  })

  it('calls onDelete once when the delete button is clicked', () => {
    const onDelete = vi.fn()
    const { container } = render(
      <NicknameChip value="Click me" onDelete={onDelete} />,
    )

    const button = container.querySelector('button') as HTMLButtonElement
    fireEvent.click(button)

    expect(onDelete).toHaveBeenCalledTimes(1)
  })

  it('does not set inline animationDelay style when staggerDelay is 0 (default)', () => {
    const { container } = render(<NicknameChip value="No delay" />)
    const root = container.firstElementChild as HTMLElement

    expect(root.style.animationDelay).toBe('')
  })

  it('does not set inline animationDelay style when staggerDelay is negative', () => {
    const { container } = render(
      <NicknameChip value="Negative delay" staggerDelay={-50} />,
    )
    const root = container.firstElementChild as HTMLElement

    expect(root.style.animationDelay).toBe('')
  })

  it('sets inline animationDelay style when staggerDelay is positive', () => {
    const { container } = render(
      <NicknameChip value="Delayed" staggerDelay={120} />,
    )
    const root = container.firstElementChild as HTMLElement

    expect(root.style.animationDelay).toBe('120ms')
  })

  it('matches snapshot (default subtle, no delete, no animation, no delay)', () => {
    const { container } = render(<NicknameChip value="Snapshot default" />)
    expect(container.firstChild).toMatchSnapshot()
  })

  it('matches snapshot (accent + entrance + delete + staggerDelay)', () => {
    const onDelete = vi.fn()
    const { container } = render(
      <NicknameChip
        value="Snapshot complex"
        variant="accent"
        animationState="entrance"
        staggerDelay={250}
        onDelete={onDelete}
      />,
    )
    expect(container.firstChild).toMatchSnapshot()
  })

  it('matches snapshot (exit without delete)', () => {
    const { container } = render(
      <NicknameChip value="Snapshot exit" animationState="exit" />,
    )
    expect(container.firstChild).toMatchSnapshot()
  })
})
