import { type GameEvent, GameParticipantType } from '@klurigo/common'
import { deepEqual, GameEventType, GameStatus } from '@klurigo/common'
import { setContext } from '@sentry/react'
import {
  type FC,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { BlockerFunction } from 'react-router-dom'
import { useBlocker } from 'react-router-dom'

import { LoadingSpinner, Modal, Page } from '../../components'
import Button from '../../components/Button'
import { useAuthContext } from '../../context/auth'
import { useGameContext } from '../../context/game'
import {
  HostGameBeginState,
  HostLeaderboardState,
  HostLobbyState,
  HostPodiumState,
  HostQuestionPreviewState,
  HostQuestionState,
  HostResultState,
  PlayerGameBeginState,
  PlayerGameOverState,
  PlayerLobbyState,
  PlayerQuestionPreviewState,
  PlayerQuestionState,
  PlayerResultState,
} from '../../states'
import { ConnectionStatus } from '../../utils/event-source.types'
import {
  notifyError,
  notifySuccess,
  notifyWarning,
} from '../../utils/notification'
import { useEventSource } from '../../utils/useEventSource'

import styles from './GamePage.module.scss'

const LoadingOverlay: FC = () => (
  <div className={styles.loadingOverlay} data-testid="loading-overlay">
    <LoadingSpinner />
  </div>
)

/**
 * Represents the main game page.
 *
 * Displays the current game state, handles reconnection logic, and renders
 * the appropriate game state component based on the `GameEventType`.
 *
 * @returns A React component rendering the game state.
 */
const GamePage: FC = () => {
  const { isUserAuthenticated, revokeGame } = useAuthContext()

  const {
    gameID,
    gameToken,
    participantId,
    participantType,
    leaveGame,
    quitGame,
  } = useGameContext()

  const [event, connectionStatus] = useEventSource(gameID, gameToken)

  const lastNonLoadingEventRef = useRef<GameEvent | undefined>(undefined)
  const [lastNonLoadingEvent, setLastNonLoadingEvent] = useState<GameEvent>()
  const [isLoading, setIsLoading] = useState(false)

  const loadingTimeoutRef = useRef<number | null>(null)

  useEffect(() => {
    if (!event) return

    if (event.type === GameEventType.GameLoading) {
      if (loadingTimeoutRef.current !== null) {
        clearTimeout(loadingTimeoutRef.current)
        loadingTimeoutRef.current = null
      }

      loadingTimeoutRef.current = window.setTimeout(() => {
        setIsLoading(true)
      }, 500)
      return
    }

    if (loadingTimeoutRef.current !== null) {
      clearTimeout(loadingTimeoutRef.current)
      loadingTimeoutRef.current = null
    }

    setIsLoading(false)

    if (!deepEqual(event, lastNonLoadingEventRef.current)) {
      lastNonLoadingEventRef.current = event
      setLastNonLoadingEvent(event)
    }
  }, [event])

  const statusNotifyTimeoutRef = useRef<number | null>(null)
  const lastNotifiedStatusRef = useRef<ConnectionStatus | null>(null)
  const reconnectNotifiedRef = useRef(false)

  useEffect(() => {
    if (statusNotifyTimeoutRef.current !== null) {
      clearTimeout(statusNotifyTimeoutRef.current)
      statusNotifyTimeoutRef.current = null
    }

    const notifyIfStillSame = (statusToNotify: ConnectionStatus) => {
      if (lastNotifiedStatusRef.current === statusToNotify) return
      lastNotifiedStatusRef.current = statusToNotify

      switch (statusToNotify) {
        case ConnectionStatus.RECONNECTING:
          reconnectNotifiedRef.current = true
          notifyWarning('Reconnecting')
          break

        case ConnectionStatus.RECONNECTING_FAILED:
          reconnectNotifiedRef.current = true
          notifyError('Reconnecting failed')
          break

        case ConnectionStatus.CONNECTED:
          if (reconnectNotifiedRef.current) {
            reconnectNotifiedRef.current = false
            lastNotifiedStatusRef.current = null
            notifySuccess('Connected')
          }
          break

        default:
          break
      }
    }

    const delayMs = connectionStatus === ConnectionStatus.CONNECTED ? 0 : 500

    statusNotifyTimeoutRef.current = window.setTimeout(() => {
      notifyIfStillSame(connectionStatus)
      statusNotifyTimeoutRef.current = null
    }, delayMs)

    return () => {
      if (statusNotifyTimeoutRef.current !== null) {
        clearTimeout(statusNotifyTimeoutRef.current)
        statusNotifyTimeoutRef.current = null
      }
    }
  }, [connectionStatus])

  const shouldBlock = useCallback<BlockerFunction>(() => {
    const isAllowedEventType =
      event?.type &&
      [
        GameEventType.GamePodiumHost,
        GameEventType.GameOverPlayer,
        GameEventType.GameQuitEvent,
      ].includes(event.type)

    const hasGameId = !!gameID

    return !isAllowedEventType && hasGameId
  }, [event, gameID])
  const blocker = useBlocker(shouldBlock)

  useEffect(() => {
    if (event?.type === GameEventType.GameQuitEvent) {
      if (
        event.status === GameStatus.Completed &&
        isUserAuthenticated &&
        gameID
      ) {
        void revokeGame({ redirectTo: `/game/results/${gameID}` })
      } else {
        void revokeGame({ redirectTo: '/' })
      }
    }
  }, [event, gameID, isUserAuthenticated, revokeGame])

  useEffect(() => {
    if (gameID && gameToken) {
      console.debug('Setting up game context for Sentry...')
      setContext('game', { gameId: gameID, participantId, participantType })
    } else {
      console.debug('Cleaning up game context for Sentry...')
      setContext('game', null)
    }
  }, [gameID, gameToken, participantId, participantType])

  useEffect(() => {
    return () => {
      console.debug('Cleaning up game context for Sentry...')
      setContext('game', null)

      // Cleanup loading timeout
      if (loadingTimeoutRef.current !== null) {
        clearTimeout(loadingTimeoutRef.current)
        loadingTimeoutRef.current = null
      }
    }
  }, [])

  /**
   * Dynamically determines the appropriate component to render
   * based on the last non-loading game event type.
   */
  const stateComponent = useMemo(() => {
    const eventToRender = lastNonLoadingEvent

    switch (eventToRender?.type) {
      case GameEventType.GameLobbyHost:
        return <HostLobbyState event={eventToRender} />
      case GameEventType.GameLobbyPlayer:
        return <PlayerLobbyState event={eventToRender} />
      case GameEventType.GameBeginHost:
        return <HostGameBeginState event={eventToRender} />
      case GameEventType.GameBeginPlayer:
        return <PlayerGameBeginState event={eventToRender} />
      case GameEventType.GameQuestionPreviewHost:
        return <HostQuestionPreviewState event={eventToRender} />
      case GameEventType.GameQuestionPreviewPlayer:
        return <PlayerQuestionPreviewState event={eventToRender} />
      case GameEventType.GameQuestionHost:
        return <HostQuestionState event={eventToRender} />
      case GameEventType.GameQuestionPlayer:
        return <PlayerQuestionState event={eventToRender} />
      case GameEventType.GameLeaderboardHost:
        return <HostLeaderboardState event={eventToRender} />
      case GameEventType.GameResultHost:
        return <HostResultState event={eventToRender} />
      case GameEventType.GameResultPlayer:
        return <PlayerResultState event={eventToRender} />
      case GameEventType.GamePodiumHost:
        return <HostPodiumState event={eventToRender} />
      case GameEventType.GameOverPlayer:
        return <PlayerGameOverState event={eventToRender} />
      default:
        return null
    }
  }, [lastNonLoadingEvent])

  const handleLeaveGame = () => {
    if (blocker.state === 'blocked') {
      if (participantType === GameParticipantType.HOST && quitGame) {
        console.log('Quitting game...')
        quitGame().finally(() => {
          blocker.proceed()
        })
      } else if (
        participantType === GameParticipantType.PLAYER &&
        participantId &&
        leaveGame
      ) {
        console.log('Leaving game...')
        leaveGame(participantId).finally(() => {
          blocker.proceed()
        })
      }
    }
  }

  const hasState = !!lastNonLoadingEvent
  const showInitialLoading = !hasState
  const showOverlayLoading = isLoading && hasState
  const isHostLobbyReady =
    connectionStatus === ConnectionStatus.CONNECTED &&
    lastNonLoadingEvent?.type === GameEventType.GameLobbyHost

  if (showInitialLoading) {
    return (
      <Page hideLogin>
        <LoadingSpinner />
      </Page>
    )
  }

  return (
    <>
      {isHostLobbyReady && (
        <span data-testid="game-event-stream-ready" hidden />
      )}
      {stateComponent}
      {showOverlayLoading && <LoadingOverlay />}
      {blocker.state === 'blocked' && (
        <Modal
          title={
            participantType === GameParticipantType.HOST
              ? 'Quit Game'
              : 'Leave Game'
          }
          open>
          {participantType === GameParticipantType.HOST &&
            'This will immediately end the game for all participants, and it cannot be resumed.'}

          {participantType === GameParticipantType.PLAYER &&
            'Leaving now will disconnect you from the game. Are you sure you want to continue?'}

          <div className={styles.leaveModalActionButtons}>
            <Button
              id="cancel-button"
              type="button"
              kind="secondary"
              value="Cancel"
              onClick={() => blocker.reset()}
            />
            <Button
              id="proceed-button"
              type="button"
              kind="destructive"
              value="Proceed"
              onClick={handleLeaveGame}
            />
          </div>
        </Modal>
      )}
    </>
  )
}

export default GamePage
