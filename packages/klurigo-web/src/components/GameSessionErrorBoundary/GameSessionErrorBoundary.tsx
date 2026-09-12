import { ErrorBoundary } from '@sentry/react'
import type { FC, ReactNode } from 'react'

import { useAuthContext } from '../../context/auth'
import Button from '../Button'
import Page from '../Page'
import Typography from '../Typography'

import styles from './GameSessionErrorBoundary.module.scss'

type GameSessionErrorFallbackProps = {
  onReload: () => void
  onReturnHome: () => void
}

const GameSessionErrorFallback: FC<GameSessionErrorFallbackProps> = ({
  onReload,
  onReturnHome,
}) => (
  <Page hideLogin>
    <div
      className={styles.fallback}
      data-testid="game-session-error-fallback"
      role="alert">
      <Typography variant="title" align="center" color="inverse">
        Game view unavailable
      </Typography>
      <Typography variant="body" align="center" color="inverseSubtle">
        We could not display this part of the game. Reload the game or return
        home and re-enter it.
      </Typography>
      <div className={styles.actions}>
        <Button
          id="reload-game"
          type="button"
          kind="call-to-action"
          value="Reload game"
          onClick={onReload}
        />
        <Button
          id="return-home"
          type="button"
          kind="secondary"
          value="Return home"
          onClick={onReturnHome}
        />
      </div>
    </div>
  </Page>
)

type GameSessionErrorBoundaryProps = {
  children: ReactNode
}

const GameSessionErrorBoundary: FC<GameSessionErrorBoundaryProps> = ({
  children,
}) => {
  const { revokeGame } = useAuthContext()

  return (
    <ErrorBoundary
      fallback={() => (
        <GameSessionErrorFallback
          onReload={() => window.location.reload()}
          onReturnHome={() => void revokeGame({ redirectTo: '/' })}
        />
      )}>
      {children}
    </ErrorBoundary>
  )
}

export default GameSessionErrorBoundary
