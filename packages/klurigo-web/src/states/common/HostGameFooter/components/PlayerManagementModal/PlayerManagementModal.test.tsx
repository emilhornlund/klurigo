import type { GameParticipantPlayerDto } from '@klurigo/common'
import { act, fireEvent, render, screen } from '@testing-library/react'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useGameContext } from '../../../../../context/game'

import PlayerManagementModal from './PlayerManagementModal'

vi.mock('./PlayerManagementModal.module.scss', () => ({
  default: {
    playerManagementModal: 'playerManagementModal',
    message: 'message',
    flow: 'flow',
  },
}))

vi.mock('../../../../../context/game', () => ({
  useGameContext: vi.fn(),
}))

/**
 * These are intentionally thin test doubles. The goal is to:
 * - Verify PlayerManagementModal behavior and state transitions.
 * - Avoid coupling to Modal/ConfirmDialog/NicknameChip internal markup.
 */
vi.mock('../../../../../components', () => ({
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
  Modal: ({
    title,
    open,
    onClose,
    children,
  }: {
    title: string
    open?: boolean
    onClose?: () => void
    children: React.ReactNode
  }) =>
    open ? (
      <div data-testid="modal">
        <h1>{title}</h1>
        <button data-testid="modal-close" onClick={onClose}>
          close
        </button>
        {children}
      </div>
    ) : null,

  ConfirmDialog: ({
    title,
    message,
    open,
    confirmTitle,
    loading,
    onConfirm,
    onClose,
    destructive,
  }: {
    title: string
    message: string
    open?: boolean
    confirmTitle: string
    loading?: boolean
    onConfirm?: () => void
    onClose?: () => void
    destructive?: boolean
  }) =>
    open ? (
      <div
        data-testid="confirm-dialog"
        data-loading={loading ? 'true' : 'false'}
        data-destructive={destructive ? 'true' : 'false'}>
        <div data-testid="confirm-title">{title}</div>
        <div data-testid="confirm-message">{message}</div>
        <button data-testid="confirm" onClick={onConfirm}>
          {confirmTitle}
        </button>
        <button data-testid="confirm-close" onClick={onClose}>
          close
        </button>
      </div>
    ) : null,

  NicknameChip: ({
    value,
    variant,
    animationState,
    staggerDelay,
    onDelete,
  }: {
    value: string
    variant?: 'subtle' | 'accent'
    animationState?: 'entrance' | 'exit' | 'shake' | 'none'
    staggerDelay?: number
    onDelete?: () => void
  }) => (
    <div
      data-testid={`chip-${value}`}
      data-variant={variant}
      data-animation={animationState}
      data-delay={String(staggerDelay ?? 0)}>
      <span>{value}</span>
      {onDelete && (
        <button data-testid={`chip-delete-${value}`} onClick={onDelete}>
          delete
        </button>
      )}
    </div>
  ),
}))

const mockedUseGameContext = vi.mocked(useGameContext)

const flushMicrotasks = async () => {
  // Ensures pending promise continuations (e.g., `.then(setPlayers)`) run.
  await Promise.resolve()
  await Promise.resolve()
}

const makePlayer = (id: string, nickname: string): GameParticipantPlayerDto =>
  // This matches the typical shape used in the app (id/nickname).
  ({ id, nickname })

const never = () => new Promise<never>(() => {})

describe('PlayerManagementModal', () => {
  beforeEach(() => {
    vi.useRealTimers()
    mockedUseGameContext.mockReset()
  })

  it('does not render the Modal content when open is false/undefined', () => {
    mockedUseGameContext.mockReturnValue({
      getPlayers: vi.fn().mockResolvedValue([]),
      leaveGame: vi.fn(),
    } as unknown as ReturnType<typeof useGameContext>)

    render(<PlayerManagementModal />)

    expect(screen.queryByTestId('modal')).toBeNull()
  })

  it('renders the Modal title and static message when open=true', () => {
    mockedUseGameContext.mockReturnValue({
      getPlayers: vi.fn().mockReturnValue(never()),
      leaveGame: vi.fn(),
    } as unknown as ReturnType<typeof useGameContext>)

    render(<PlayerManagementModal open />)

    expect(screen.getByTestId('modal')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Who’s Playing?' }),
    ).toBeInTheDocument()

    expect(
      screen.getByText(
        /Here’s everyone in the game\. If someone shouldn’t be here, you can politely show them the exit\./,
      ),
    ).toBeInTheDocument()
  })

  it('calls getPlayers on mount and renders NicknameChips when players resolve', async () => {
    const players = [makePlayer('p1', 'Alice'), makePlayer('p2', 'Bob')]
    const getPlayers = vi.fn().mockResolvedValue(players)

    mockedUseGameContext.mockReturnValue({
      getPlayers,
      leaveGame: vi.fn(),
    } as unknown as ReturnType<typeof useGameContext>)

    render(<PlayerManagementModal open />)

    expect(getPlayers).toHaveBeenCalledTimes(1)

    await act(async () => {
      await flushMicrotasks()
    })

    expect(screen.getByTestId('chip-Alice')).toBeInTheDocument()
    expect(screen.getByTestId('chip-Bob')).toBeInTheDocument()

    expect(screen.getByTestId('chip-Alice')).toHaveAttribute(
      'data-variant',
      'accent',
    )
    expect(screen.getByTestId('chip-Bob')).toHaveAttribute(
      'data-variant',
      'accent',
    )

    expect(screen.getByTestId('chip-Alice')).toHaveAttribute(
      'data-animation',
      'none',
    )
    expect(screen.getByTestId('chip-Alice')).toHaveAttribute('data-delay', '0')
  })

  it('does not call getPlayers when open is false/undefined', () => {
    const getPlayers = vi.fn().mockResolvedValue([])
    mockedUseGameContext.mockReturnValue({
      getPlayers,
      leaveGame: vi.fn(),
    } as unknown as ReturnType<typeof useGameContext>)

    render(<PlayerManagementModal />)

    expect(getPlayers).not.toHaveBeenCalled()
  })

  it('calls getPlayers when open becomes true', async () => {
    const getPlayers = vi.fn().mockResolvedValue([makePlayer('p1', 'Alice')])

    mockedUseGameContext.mockReturnValue({
      getPlayers,
      leaveGame: vi.fn(),
    } as unknown as ReturnType<typeof useGameContext>)

    const { rerender } = render(<PlayerManagementModal open={false} />)
    expect(getPlayers).not.toHaveBeenCalled()

    rerender(<PlayerManagementModal open />)
    expect(getPlayers).toHaveBeenCalledTimes(1)

    await act(async () => {
      await flushMicrotasks()
    })

    expect(screen.getByTestId('chip-Alice')).toBeInTheDocument()
  })

  it('removes the player from the list after successful leaveGame', async () => {
    vi.useFakeTimers()

    const initialPlayers = [makePlayer('p1', 'Alice'), makePlayer('p2', 'Bob')]
    const refreshedPlayers = [makePlayer('p2', 'Bob')]

    const getPlayers = vi
      .fn()
      .mockResolvedValueOnce(initialPlayers) // initial fetch when modal opens
      .mockResolvedValueOnce(refreshedPlayers) // refresh after leaveGame succeeds

    const leaveGameDeferred = (() => {
      let resolve!: () => void
      const promise = new Promise<void>((r) => {
        resolve = r
      })
      return { promise, resolve }
    })()

    const leaveGame = vi.fn().mockReturnValue(leaveGameDeferred.promise)

    mockedUseGameContext.mockReturnValue({
      getPlayers,
      leaveGame,
    } as unknown as ReturnType<typeof useGameContext>)

    render(<PlayerManagementModal open />)

    await act(async () => {
      await flushMicrotasks()
    })

    fireEvent.click(screen.getByTestId('chip-delete-Alice'))
    fireEvent.click(screen.getByTestId('confirm'))

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500)
      await flushMicrotasks()
    })

    expect(leaveGame).toHaveBeenCalledWith('p1')

    await act(async () => {
      leaveGameDeferred.resolve()
      await flushMicrotasks()
    })

    expect(screen.queryByTestId('chip-Alice')).toBeNull()
    expect(screen.getByTestId('chip-Bob')).toBeInTheDocument()
  })

  it('opens the ConfirmDialog when a chip delete button is clicked and interpolates nickname in the message', async () => {
    const players = [makePlayer('p1', 'Alice')]
    mockedUseGameContext.mockReturnValue({
      getPlayers: vi.fn().mockResolvedValue(players),
      leaveGame: vi.fn(),
    } as unknown as ReturnType<typeof useGameContext>)

    render(<PlayerManagementModal open />)

    await act(async () => {
      await flushMicrotasks()
    })

    fireEvent.click(screen.getByTestId('chip-delete-Alice'))

    expect(screen.getByTestId('confirm-dialog')).toBeInTheDocument()
    expect(screen.getByTestId('confirm-title')).toHaveTextContent(
      'Kick from the Game?',
    )
    expect(screen.getByTestId('confirm-message')).toHaveTextContent(
      'This will remove Alice from the game. They’ll need to rejoin if they want back in.',
    )
  })

  it('closes the ConfirmDialog when onClose is triggered', async () => {
    const players = [makePlayer('p1', 'Alice')]
    mockedUseGameContext.mockReturnValue({
      getPlayers: vi.fn().mockResolvedValue(players),
      leaveGame: vi.fn(),
    } as unknown as ReturnType<typeof useGameContext>)

    render(<PlayerManagementModal open />)

    await act(async () => {
      await flushMicrotasks()
    })

    fireEvent.click(screen.getByTestId('chip-delete-Alice'))
    expect(screen.getByTestId('confirm-dialog')).toBeInTheDocument()

    fireEvent.click(screen.getByTestId('confirm-close'))
    expect(screen.queryByTestId('confirm-dialog')).toBeNull()
  })

  it('on confirm: sets chip animation to "shake" immediately, then after 500ms calls leaveGame with id and toggles loading while pending', async () => {
    vi.useFakeTimers()

    const players = [makePlayer('p1', 'Alice')]
    const leaveGameDeferred = (() => {
      let resolve!: () => void
      const promise = new Promise<void>((r) => {
        resolve = r
      })
      return { promise, resolve }
    })()

    const leaveGame = vi.fn().mockReturnValue(leaveGameDeferred.promise)

    mockedUseGameContext.mockReturnValue({
      getPlayers: vi.fn().mockResolvedValue(players),
      leaveGame,
    } as unknown as ReturnType<typeof useGameContext>)

    render(<PlayerManagementModal open />)

    await act(async () => {
      await flushMicrotasks()
    })

    fireEvent.click(screen.getByTestId('chip-delete-Alice'))
    fireEvent.click(screen.getByTestId('confirm'))

    // Immediate effect: chip should receive "shake" animation state.
    expect(screen.getByTestId('chip-Alice')).toHaveAttribute(
      'data-animation',
      'shake',
    )

    // Confirm dialog is still open until the timeout elapses (playerToRemove not cleared yet).
    expect(screen.getByTestId('confirm-dialog')).toBeInTheDocument()
    expect(screen.getByTestId('confirm-dialog')).toHaveAttribute(
      'data-loading',
      'false',
    )
    expect(leaveGame).not.toHaveBeenCalled()

    // After 500ms: dialog closes, loading becomes true (internally), leaveGame is invoked.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500)
      await flushMicrotasks()
    })

    expect(leaveGame).toHaveBeenCalledTimes(1)
    expect(leaveGame).toHaveBeenCalledWith('p1')

    // Dialog should be closed because playerToRemove is cleared in the timeout.
    expect(screen.queryByTestId('confirm-dialog')).toBeNull()

    // Resolve leaveGame and ensure removing flag is cleared without throwing.
    await act(async () => {
      leaveGameDeferred.resolve()
      await flushMicrotasks()
    })
  })

  it('wires Modal onClose through to the provided onClose prop', () => {
    const onClose = vi.fn()

    mockedUseGameContext.mockReturnValue({
      getPlayers: vi.fn().mockReturnValue(never()),
      leaveGame: vi.fn(),
    } as unknown as ReturnType<typeof useGameContext>)

    render(<PlayerManagementModal open onClose={onClose} />)

    act(() => {
      fireEvent.click(screen.getByTestId('modal-close'))
    })

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('matches snapshot (modal open, before players load)', () => {
    mockedUseGameContext.mockReturnValue({
      getPlayers: vi.fn().mockReturnValue(never()),
      leaveGame: vi.fn(),
    } as unknown as ReturnType<typeof useGameContext>)

    const { container } = render(<PlayerManagementModal open />)
    expect(container.firstChild).toMatchSnapshot()
  })

  it('matches snapshot (after players load)', async () => {
    mockedUseGameContext.mockReturnValue({
      getPlayers: vi
        .fn()
        .mockResolvedValue([
          makePlayer('p1', 'Alice'),
          makePlayer('p2', 'Bob'),
        ]),
      leaveGame: vi.fn(),
    } as unknown as ReturnType<typeof useGameContext>)

    const { container } = render(<PlayerManagementModal open />)

    await act(async () => {
      await flushMicrotasks()
    })

    expect(container.firstChild).toMatchSnapshot()
  })

  it('matches snapshot (confirm dialog open for selected player)', async () => {
    mockedUseGameContext.mockReturnValue({
      getPlayers: vi.fn().mockResolvedValue([makePlayer('p1', 'Alice')]),
      leaveGame: vi.fn(),
    } as unknown as ReturnType<typeof useGameContext>)

    const { container } = render(<PlayerManagementModal open />)

    await act(async () => {
      await flushMicrotasks()
    })

    fireEvent.click(screen.getByTestId('chip-delete-Alice'))

    expect(container.firstChild).toMatchSnapshot()
  })
})
