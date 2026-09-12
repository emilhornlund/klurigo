import { type FC } from 'react'

import Button from '../../../../components/Button'
import Typography from '../../../../components/Typography'
import {
  type ConnectionFailure,
  ConnectionFailureReason,
  ConnectionStatus,
} from '../../../../utils/event-source.types'

import styles from './ConnectionNotice.module.scss'

export type ConnectionNoticeProps = {
  status: ConnectionStatus
  failure?: ConnectionFailure
  initialConnectionTimedOut?: boolean
  onRetry?: () => void
  onLeave: () => void
}

const ConnectionNotice: FC<ConnectionNoticeProps> = ({
  status,
  failure,
  initialConnectionTimedOut = false,
  onRetry,
  onLeave,
}) => {
  if (
    initialConnectionTimedOut &&
    status !== ConnectionStatus.RECONNECTING &&
    status !== ConnectionStatus.RECONNECTING_FAILED
  ) {
    return (
      <div
        className={styles.connectionNotice}
        data-testid="game-connection-notice"
        role="status">
        <Typography variant="title3" align="center" color="inverse">
          Connection problem
        </Typography>
        <Typography variant="body" align="center" color="inverseSubtle">
          The game is taking longer than expected to load.
        </Typography>
        {onRetry && (
          <Button
            id="retry-game-connection"
            type="button"
            kind="call-to-action"
            size="small"
            value="Try again"
            onClick={onRetry}
          />
        )}
      </div>
    )
  }

  if (status === ConnectionStatus.RECONNECTING) {
    return (
      <div
        className={styles.connectionNotice}
        data-testid="game-connection-notice"
        role="status">
        <Typography variant="title3" align="center" color="inverse">
          Connection lost
        </Typography>
        <Typography variant="body" align="center" color="inverseSubtle">
          Reconnecting to the game...
        </Typography>
      </div>
    )
  }

  if (status !== ConnectionStatus.RECONNECTING_FAILED) return null

  const reason = failure?.reason ?? ConnectionFailureReason.UNKNOWN
  const isSessionUnavailable =
    reason === ConnectionFailureReason.GAME_NOT_FOUND ||
    reason === ConnectionFailureReason.GAME_ENDED ||
    reason === ConnectionFailureReason.SESSION_EXPIRED

  const copy = {
    [ConnectionFailureReason.GAME_NOT_FOUND]: {
      title: 'Game not found',
      message: 'This game is no longer available.',
    },
    [ConnectionFailureReason.GAME_ENDED]: {
      title: 'Game already ended',
      message: 'This game has already ended.',
    },
    [ConnectionFailureReason.SESSION_EXPIRED]: {
      title: 'Game session expired',
      message: 'Your game session expired. Return home to join again.',
    },
    [ConnectionFailureReason.SERVER_ERROR]: {
      title: 'Connection problem',
      message: "The game server isn't responding. Try again in a moment.",
    },
    [ConnectionFailureReason.UNKNOWN]: {
      title: 'Connection problem',
      message: "We couldn't reconnect to the game.",
    },
  }[reason]

  return (
    <div
      className={styles.connectionNotice}
      data-testid="game-connection-notice"
      role="alert">
      <Typography variant="title3" align="center" color="inverse">
        {copy.title}
      </Typography>
      <Typography variant="body" align="center" color="inverseSubtle">
        {copy.message}
      </Typography>
      <div className={styles.connectionNoticeActions}>
        {!isSessionUnavailable && onRetry && (
          <Button
            id="retry-game-connection"
            type="button"
            kind="call-to-action"
            size="small"
            value="Try again"
            onClick={onRetry}
          />
        )}
        <Button
          id="leave-game-connection"
          type="button"
          kind="secondary"
          size="small"
          value="Return home"
          onClick={onLeave}
        />
      </div>
    </div>
  )
}

export default ConnectionNotice
