import { fireEvent, render, screen } from '@testing-library/react'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import HostGameFooter from './HostGameFooter'

vi.mock('./HostGameFooter.module.scss', () => ({
  default: {
    main: 'main',
    questions: 'questions',
    gamePIN: 'gamePIN',
    actions: 'actions',
    menuButtonWrapper: 'menuButtonWrapper',
  },
}))

vi.mock('@fortawesome/react-fontawesome', () => ({
  FontAwesomeIcon: (props: { icon: unknown }) => (
    <span data-testid="fa-icon">{String(Boolean(props.icon))}</span>
  ),
}))

const toggleFullscreenMock = vi.fn()
const quitGameMock = vi.fn()
const useGameContextMock = vi.fn()

vi.mock('../../../context/game', () => ({
  useGameContext: () => useGameContextMock(),
}))

type ButtonProps = {
  id?: string
  onClick?: () => void
  type?: string
  kind?: string
  icon?: unknown
}

const buttonMock = vi.fn(({ id, onClick }: ButtonProps) => (
  <button type="button" id={id} onClick={onClick}>
    Button
  </button>
))

type MenuProps = {
  anchorRef: React.RefObject<HTMLElement | null>
  position: 'above' | 'below'
  align: 'start' | 'end'
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
}

const menuMock = vi.fn(({ isOpen, children, onClose }: MenuProps) => (
  <div data-testid="menu">
    <div data-testid="menu-open">{String(isOpen)}</div>
    <button type="button" data-testid="menu-close" onClick={onClose}>
      close
    </button>
    {isOpen ? <div data-testid="menu-content">{children}</div> : null}
  </div>
))

type MenuItemProps = {
  icon?: unknown
  disabled?: boolean
  onClick?: () => void
  children: React.ReactNode
}

const menuItemMock = vi.fn(({ children, onClick, disabled }: MenuItemProps) => (
  <button type="button" disabled={disabled} onClick={onClick}>
    {children}
  </button>
))

const menuSeparatorMock = vi.fn(() => <div data-testid="menu-separator" />)

type ConfirmDialogProps = {
  title: string
  message: string
  open: boolean
  confirmTitle: string
  onConfirm: () => void
  onClose: () => void
  destructive?: boolean
}

const confirmDialogMock = vi.fn(
  ({
    title,
    message,
    open,
    confirmTitle,
    onConfirm,
    onClose,
  }: ConfirmDialogProps) =>
    open ? (
      <div data-testid="confirm-dialog">
        <div>{title}</div>
        <div>{message}</div>
        <button type="button" onClick={onConfirm}>
          {confirmTitle}
        </button>
        <button type="button" onClick={onClose}>
          Cancel
        </button>
      </div>
    ) : null,
)

/**
 * PlayerManagementModal is rendered outside the Menu tree and is controlled
 * via local state inside HostGameFooter. We mock it as a minimal component
 * that lets us assert `open` and trigger `onClose`.
 */
type PlayerManagementModalProps = {
  open?: boolean
  onClose?: () => void
}

const playerManagementModalMock = vi.fn(
  ({ open, onClose }: PlayerManagementModalProps) =>
    open ? (
      <div data-testid="player-management-modal">
        <div data-testid="player-management-modal-open">
          {String(Boolean(open))}
        </div>
        <button
          type="button"
          data-testid="player-management-modal-close"
          onClick={onClose}>
          close
        </button>
      </div>
    ) : null,
)

vi.mock('../../../components', () => ({
  Button: (props: ButtonProps) => buttonMock(props),
  Menu: (props: MenuProps) => menuMock(props),
  MenuItem: (props: MenuItemProps) => menuItemMock(props),
  MenuSeparator: () => menuSeparatorMock(),
  ConfirmDialog: (props: ConfirmDialogProps) => confirmDialogMock(props),
  Typography: ({
    children,
    variant = 'body',
    className,
  }: {
    children?: React.ReactNode
    variant?: string
    className?: string
  }) => {
    const Tag = ['title', 'title2', 'title3', 'title4', 'title5'].includes(
      variant,
    )
      ? 'h2'
      : 'p'

    return (
      <Tag className={[variant, className].filter(Boolean).join(' ')}>
        {children}
      </Tag>
    )
  },
}))

vi.mock('./components', () => ({
  PlayerManagementModal: (props: PlayerManagementModalProps) =>
    playerManagementModalMock(props),
}))

describe('HostGameFooter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    toggleFullscreenMock.mockReset()
    quitGameMock.mockReset()
    useGameContextMock.mockReset()
    useGameContextMock.mockReturnValue({
      isFullscreenActive: false,
      toggleFullscreen: toggleFullscreenMock,
      quitGame: quitGameMock,
    })
  })

  it('renders current question and total questions', () => {
    render(
      <HostGameFooter
        gamePIN="123456"
        currentQuestion={3}
        totalQuestions={10}
      />,
    )

    expect(screen.getByText('3 / 10')).toBeInTheDocument()
  })

  it('renders game PIN', () => {
    render(
      <HostGameFooter
        gamePIN="654321"
        currentQuestion={1}
        totalQuestions={5}
      />,
    )

    expect(screen.getByText('654321')).toBeInTheDocument()
  })

  it('renders settings button with expected id', () => {
    render(
      <HostGameFooter
        gamePIN="111111"
        currentQuestion={1}
        totalQuestions={1}
      />,
    )

    expect(screen.getByRole('button', { name: 'Button' })).toHaveAttribute(
      'id',
      'settings-button',
    )
  })

  it('initially renders Menu with isOpen=false', () => {
    render(
      <HostGameFooter
        gamePIN="123456"
        currentQuestion={1}
        totalQuestions={1}
      />,
    )

    expect(screen.getByTestId('menu-open')).toHaveTextContent('false')
    expect(screen.queryByTestId('menu-content')).not.toBeInTheDocument()
  })

  it('opens the settings menu when clicking the settings button', () => {
    render(
      <HostGameFooter
        gamePIN="123456"
        currentQuestion={1}
        totalQuestions={1}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Button' }))

    expect(screen.getByTestId('menu-open')).toHaveTextContent('true')
    expect(screen.getByTestId('menu-content')).toBeInTheDocument()

    // Players is no longer disabled.
    expect(screen.getByRole('button', { name: 'Players' })).toBeEnabled()

    expect(screen.getByRole('button', { name: 'Maximize' })).toBeEnabled()
    expect(screen.getByTestId('menu-separator')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Quit' })).toBeEnabled()
  })

  it('closes the settings menu when clicking the settings button again', () => {
    render(
      <HostGameFooter
        gamePIN="123456"
        currentQuestion={1}
        totalQuestions={1}
      />,
    )

    const settingsButton = screen.getByRole('button', { name: 'Button' })

    fireEvent.click(settingsButton)
    expect(screen.getByTestId('menu-open')).toHaveTextContent('true')

    fireEvent.click(settingsButton)
    expect(screen.getByTestId('menu-open')).toHaveTextContent('false')
  })

  it('closes the menu via Menu onClose (simulating click outside)', () => {
    render(
      <HostGameFooter
        gamePIN="123456"
        currentQuestion={1}
        totalQuestions={1}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Button' }))
    expect(screen.getByTestId('menu-open')).toHaveTextContent('true')

    fireEvent.click(screen.getByTestId('menu-close'))
    expect(screen.getByTestId('menu-open')).toHaveTextContent('false')
  })

  it('calls toggleFullscreen and keeps menu state unchanged when clicking fullscreen item', () => {
    render(
      <HostGameFooter
        gamePIN="123456"
        currentQuestion={1}
        totalQuestions={1}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Button' }))
    expect(screen.getByTestId('menu-open')).toHaveTextContent('true')

    fireEvent.click(screen.getByRole('button', { name: 'Maximize' }))

    expect(toggleFullscreenMock).toHaveBeenCalledTimes(1)
    expect(screen.getByTestId('menu-open')).toHaveTextContent('true')
  })

  it('renders Minimize and uses minimize icon when fullscreen is active', () => {
    useGameContextMock.mockReturnValue({
      isFullscreenActive: true,
      toggleFullscreen: toggleFullscreenMock,
      quitGame: quitGameMock,
    })

    render(
      <HostGameFooter
        gamePIN="123456"
        currentQuestion={1}
        totalQuestions={1}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Button' }))

    expect(screen.getByRole('button', { name: 'Minimize' })).toBeEnabled()
    expect(
      screen.queryByRole('button', { name: 'Maximize' }),
    ).not.toBeInTheDocument()
  })

  it('wires Menu props: position="above" and align="end"', () => {
    render(
      <HostGameFooter
        gamePIN="123456"
        currentQuestion={1}
        totalQuestions={1}
      />,
    )

    expect(menuMock).toHaveBeenCalled()
    const call = menuMock.mock.calls[0][0] as MenuProps

    expect(call.position).toBe('above')
    expect(call.align).toBe('end')
  })

  it('passes an anchorRef to Menu (settingsMenuButtonRef)', () => {
    render(
      <HostGameFooter
        gamePIN="123456"
        currentQuestion={1}
        totalQuestions={1}
      />,
    )

    const call = menuMock.mock.calls[0][0] as MenuProps
    expect(call.anchorRef).toBeTruthy()
    expect(typeof call.anchorRef).toBe('object')
    expect('current' in call.anchorRef).toBe(true)
  })

  it('Players item is enabled and opens PlayerManagementModal when clicked', () => {
    render(
      <HostGameFooter
        gamePIN="123456"
        currentQuestion={1}
        totalQuestions={1}
      />,
    )

    expect(screen.queryByTestId('player-management-modal')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Button' }))
    fireEvent.click(screen.getByRole('button', { name: 'Players' }))

    expect(screen.getByTestId('player-management-modal')).toBeInTheDocument()
    expect(
      screen.getByTestId('player-management-modal-open'),
    ).toHaveTextContent('true')
  })

  it('closes PlayerManagementModal when its onClose is triggered', () => {
    render(
      <HostGameFooter
        gamePIN="123456"
        currentQuestion={1}
        totalQuestions={1}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Button' }))
    fireEvent.click(screen.getByRole('button', { name: 'Players' }))

    expect(screen.getByTestId('player-management-modal')).toBeInTheDocument()

    fireEvent.click(screen.getByTestId('player-management-modal-close'))
    expect(screen.queryByTestId('player-management-modal')).toBeNull()
  })

  it('renders the expected menu item order: Players, Maximize/Minimize, separator, Quit', () => {
    render(
      <HostGameFooter
        gamePIN="123456"
        currentQuestion={1}
        totalQuestions={1}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Button' }))

    const menuContent = screen.getByTestId('menu-content')
    const items = Array.from(menuContent.querySelectorAll('button')).map(
      (b) => b.textContent,
    )

    // Note: MenuSeparator is not a button, so it won't appear in this list.
    expect(items).toEqual(['Players', 'Maximize', 'Quit'])
    expect(screen.getByTestId('menu-separator')).toBeInTheDocument()
  })

  it('opens the quit confirmation dialog when clicking Quit', () => {
    render(
      <HostGameFooter
        gamePIN="123456"
        currentQuestion={1}
        totalQuestions={1}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Button' }))
    fireEvent.click(screen.getByRole('button', { name: 'Quit' }))

    expect(screen.getByTestId('confirm-dialog')).toBeInTheDocument()
    expect(
      screen.getByText('Are you sure you want to quit the game?'),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        'This will immediately end the game for all participants, and it cannot be resumed.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Quit Game' })).toBeEnabled()
  })

  it('confirms quit: calls quitGame and closes the dialog', () => {
    render(
      <HostGameFooter
        gamePIN="123456"
        currentQuestion={1}
        totalQuestions={1}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Button' }))
    fireEvent.click(screen.getByRole('button', { name: 'Quit' }))

    fireEvent.click(screen.getByRole('button', { name: 'Quit Game' }))

    expect(quitGameMock).toHaveBeenCalledTimes(1)
    expect(screen.queryByTestId('confirm-dialog')).not.toBeInTheDocument()
  })

  it('cancels quit: does not call quitGame and closes the dialog', () => {
    render(
      <HostGameFooter
        gamePIN="123456"
        currentQuestion={1}
        totalQuestions={1}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Button' }))
    fireEvent.click(screen.getByRole('button', { name: 'Quit' }))

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(quitGameMock).toHaveBeenCalledTimes(0)
    expect(screen.queryByTestId('confirm-dialog')).not.toBeInTheDocument()
  })

  it('handles missing quitGame handler gracefully (optional chaining)', () => {
    useGameContextMock.mockReturnValue({
      isFullscreenActive: false,
      toggleFullscreen: toggleFullscreenMock,
      quitGame: undefined,
    })

    render(
      <HostGameFooter
        gamePIN="123456"
        currentQuestion={1}
        totalQuestions={1}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Button' }))
    fireEvent.click(screen.getByRole('button', { name: 'Quit' }))

    fireEvent.click(screen.getByRole('button', { name: 'Quit Game' }))

    expect(screen.queryByTestId('confirm-dialog')).not.toBeInTheDocument()
  })

  it('matches snapshot (menu closed)', () => {
    const { container } = render(
      <HostGameFooter
        gamePIN="123456"
        currentQuestion={1}
        totalQuestions={1}
      />,
    )

    expect(container.firstChild).toMatchSnapshot()
  })

  it('matches snapshot (menu open)', () => {
    const { container } = render(
      <HostGameFooter
        gamePIN="123456"
        currentQuestion={1}
        totalQuestions={1}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Button' }))
    expect(container.firstChild).toMatchSnapshot()
  })

  it('matches snapshot (player management modal open)', () => {
    const { container } = render(
      <HostGameFooter
        gamePIN="123456"
        currentQuestion={1}
        totalQuestions={1}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Button' }))
    fireEvent.click(screen.getByRole('button', { name: 'Players' }))

    expect(container.firstChild).toMatchSnapshot()
  })

  it('matches snapshot (quit confirm dialog open)', () => {
    const { container } = render(
      <HostGameFooter
        gamePIN="123456"
        currentQuestion={1}
        totalQuestions={1}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Button' }))
    fireEvent.click(screen.getByRole('button', { name: 'Quit' }))

    expect(container.firstChild).toMatchSnapshot()
  })
})
