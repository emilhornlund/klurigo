import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import HostGameFooter from './HostGameFooter'

vi.mock('../GameFooterShell/GameFooterShell.module.scss', () => ({
  default: {
    main: 'main',
    leading: 'leading',
    center: 'center',
    trailing: 'trailing',
  },
}))

vi.mock('react-router-dom', async () => {
  const actual =
    await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => vi.fn() }
})

vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
  callback(0)
  return 0
})

const toggleFullscreenMock = vi.fn()
const quitGameMock = vi.fn()
const useGameContextMock = vi.fn()

vi.mock('../../../context/game', () => ({
  useGameContext: () => useGameContextMock(),
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

    expect(screen.getByRole('button', { name: 'Settings' })).toHaveAttribute(
      'id',
      'settings-button',
    )
  })

  it('initially hides the settings menu', () => {
    render(
      <HostGameFooter
        gamePIN="123456"
        currentQuestion={1}
        totalQuestions={1}
      />,
    )

    expect(
      screen.queryByRole('button', { name: 'Players' }),
    ).not.toBeInTheDocument()
  })

  it('opens the settings menu when clicking the settings button', () => {
    render(
      <HostGameFooter
        gamePIN="123456"
        currentQuestion={1}
        totalQuestions={1}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Settings' }))

    expect(screen.getByRole('button', { name: 'Players' })).toBeEnabled()

    expect(screen.getByRole('button', { name: 'Maximize' })).toBeEnabled()
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

    const settingsButton = screen.getByRole('button', { name: 'Settings' })

    fireEvent.click(settingsButton)
    expect(screen.getByRole('button', { name: 'Players' })).toBeInTheDocument()

    fireEvent.click(settingsButton)
    expect(
      screen.queryByRole('button', { name: 'Players' }),
    ).not.toBeInTheDocument()
  })

  it('closes the menu via Menu onClose (simulating click outside)', () => {
    render(
      <HostGameFooter
        gamePIN="123456"
        currentQuestion={1}
        totalQuestions={1}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Settings' }))
    expect(screen.getByRole('button', { name: 'Players' })).toBeInTheDocument()

    fireEvent.mouseDown(document.body)
    expect(
      screen.queryByRole('button', { name: 'Players' }),
    ).not.toBeInTheDocument()
  })

  it('calls toggleFullscreen and keeps menu state unchanged when clicking fullscreen item', () => {
    render(
      <HostGameFooter
        gamePIN="123456"
        currentQuestion={1}
        totalQuestions={1}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Settings' }))
    expect(screen.getByRole('button', { name: 'Players' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Maximize' }))

    expect(toggleFullscreenMock).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: 'Players' })).toBeInTheDocument()
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

    fireEvent.click(screen.getByRole('button', { name: 'Settings' }))

    expect(screen.getByRole('button', { name: 'Minimize' })).toBeEnabled()
    expect(
      screen.queryByRole('button', { name: 'Maximize' }),
    ).not.toBeInTheDocument()
  })

  it('Players item is enabled and opens PlayerManagementModal when clicked', () => {
    render(
      <HostGameFooter
        gamePIN="123456"
        currentQuestion={1}
        totalQuestions={1}
      />,
    )

    expect(
      screen.queryByRole('dialog', { name: 'Who’s Playing?' }),
    ).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Settings' }))
    fireEvent.click(screen.getByRole('button', { name: 'Players' }))

    expect(
      screen.getByRole('dialog', { name: 'Who’s Playing?' }),
    ).toBeInTheDocument()
  })

  it('closes PlayerManagementModal when its onClose is triggered', () => {
    render(
      <HostGameFooter
        gamePIN="123456"
        currentQuestion={1}
        totalQuestions={1}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Settings' }))
    fireEvent.click(screen.getByRole('button', { name: 'Players' }))

    const playerDialog = screen.getByRole('dialog', { name: 'Who’s Playing?' })

    fireEvent.click(
      within(playerDialog).getByRole('button', { name: 'Close dialog' }),
    )
    expect(
      screen.queryByRole('dialog', { name: 'Who’s Playing?' }),
    ).not.toBeInTheDocument()
  })

  it('renders the expected menu item order: Players, Maximize/Minimize, separator, Quit', () => {
    render(
      <HostGameFooter
        gamePIN="123456"
        currentQuestion={1}
        totalQuestions={1}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Settings' }))

    expect(screen.getByRole('button', { name: 'Players' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Maximize' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Quit' })).toBeInTheDocument()
  })

  it('opens the quit confirmation dialog when clicking Quit', () => {
    render(
      <HostGameFooter
        gamePIN="123456"
        currentQuestion={1}
        totalQuestions={1}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Settings' }))
    fireEvent.click(screen.getByRole('button', { name: 'Quit' }))

    expect(
      screen.getByRole('dialog', {
        name: 'Are you sure you want to quit the game?',
      }),
    ).toBeInTheDocument()
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

    fireEvent.click(screen.getByRole('button', { name: 'Settings' }))
    fireEvent.click(screen.getByRole('button', { name: 'Quit' }))

    fireEvent.click(screen.getByRole('button', { name: 'Quit Game' }))

    expect(quitGameMock).toHaveBeenCalledTimes(1)
    expect(
      screen.queryByRole('dialog', {
        name: 'Are you sure you want to quit the game?',
      }),
    ).not.toBeInTheDocument()
  })

  it('cancels quit: does not call quitGame and closes the dialog', () => {
    render(
      <HostGameFooter
        gamePIN="123456"
        currentQuestion={1}
        totalQuestions={1}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Settings' }))
    fireEvent.click(screen.getByRole('button', { name: 'Quit' }))

    fireEvent.click(screen.getByRole('button', { name: 'Close' }))

    expect(quitGameMock).toHaveBeenCalledTimes(0)
    expect(
      screen.queryByRole('dialog', {
        name: 'Are you sure you want to quit the game?',
      }),
    ).not.toBeInTheDocument()
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

    fireEvent.click(screen.getByRole('button', { name: 'Settings' }))
    fireEvent.click(screen.getByRole('button', { name: 'Quit' }))

    fireEvent.click(screen.getByRole('button', { name: 'Quit Game' }))

    expect(
      screen.queryByRole('dialog', {
        name: 'Are you sure you want to quit the game?',
      }),
    ).not.toBeInTheDocument()
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

    fireEvent.click(screen.getByRole('button', { name: 'Settings' }))
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

    fireEvent.click(screen.getByRole('button', { name: 'Settings' }))
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

    fireEvent.click(screen.getByRole('button', { name: 'Settings' }))
    fireEvent.click(screen.getByRole('button', { name: 'Quit' }))

    expect(container.firstChild).toMatchSnapshot()
  })
})
