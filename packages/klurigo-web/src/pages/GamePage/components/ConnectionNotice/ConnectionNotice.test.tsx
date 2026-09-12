import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  ConnectionFailureReason,
  ConnectionStatus,
} from '../../../../utils/event-source.types'

import ConnectionNotice from './ConnectionNotice'

vi.mock('./ConnectionNotice.module.scss', () => ({
  default: {
    connectionNotice: 'connection-notice',
    connectionNoticeActions: 'connection-notice-actions',
  },
}))

const onLeave = vi.fn()

describe('ConnectionNotice', () => {
  beforeEach(() => {
    onLeave.mockReset()
  })

  it('renders nothing when there is no connection issue to display', () => {
    const { container } = render(
      <ConnectionNotice
        status={ConnectionStatus.INITIALIZED}
        onLeave={onLeave}
      />,
    )

    expect(container).toBeEmptyDOMElement()
  })

  it('renders a retry action for an initial connection timeout', () => {
    const onRetry = vi.fn()

    render(
      <ConnectionNotice
        status={ConnectionStatus.INITIALIZED}
        initialConnectionTimedOut
        onRetry={onRetry}
        onLeave={onLeave}
      />,
    )

    expect(screen.getByRole('status')).toHaveTextContent(
      'The game is taking longer than expected to load.',
    )
    fireEvent.click(screen.getByTestId('test-retry-game-connection-button'))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('renders a reconnecting notice without actions', () => {
    render(
      <ConnectionNotice
        status={ConnectionStatus.RECONNECTING}
        onLeave={onLeave}
      />,
    )

    expect(screen.getByRole('status')).toHaveTextContent(
      'Reconnecting to the game...',
    )
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('renders retry and return-home actions for a server failure', () => {
    const onRetry = vi.fn()

    render(
      <ConnectionNotice
        status={ConnectionStatus.RECONNECTING_FAILED}
        failure={{ reason: ConnectionFailureReason.SERVER_ERROR, status: 500 }}
        onRetry={onRetry}
        onLeave={onLeave}
      />,
    )

    expect(screen.getByRole('alert')).toHaveTextContent('Connection problem')
    fireEvent.click(screen.getByTestId('test-retry-game-connection-button'))
    fireEvent.click(screen.getByTestId('test-leave-game-connection-button'))
    expect(onRetry).toHaveBeenCalledTimes(1)
    expect(onLeave).toHaveBeenCalledTimes(1)
  })

  it('renders only return-home for an unavailable session', () => {
    render(
      <ConnectionNotice
        status={ConnectionStatus.RECONNECTING_FAILED}
        failure={{
          reason: ConnectionFailureReason.GAME_NOT_FOUND,
          status: 404,
        }}
        onRetry={vi.fn()}
        onLeave={onLeave}
      />,
    )

    expect(screen.getByRole('alert')).toHaveTextContent('Game not found')
    expect(
      screen.queryByTestId('test-retry-game-connection-button'),
    ).not.toBeInTheDocument()
    fireEvent.click(screen.getByTestId('test-leave-game-connection-button'))
    expect(onLeave).toHaveBeenCalledTimes(1)
  })
})
