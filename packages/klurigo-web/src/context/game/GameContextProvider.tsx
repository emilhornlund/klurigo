import type { GameSettingsDto, QuestionCorrectAnswerDto } from '@klurigo/common'
import { type FC, type ReactNode, useCallback } from 'react'
import { useMemo } from 'react'
import { FullScreen, useFullScreenHandle } from 'react-full-screen'

import { useKlurigoServiceClient } from '../../api'
import { useAuthContext } from '../auth'

import type { GameContextType } from './game-context'
import { GameContext } from './game-context'

/**
 * Props for the `GameContextProvider` component.
 *
 * @property children - The child components to be wrapped by the provider.
 */
export interface GameContextProviderProps {
  children: ReactNode | ReactNode[]
}

/**
 * Provides the `GameContext` to its child components.
 *
 * Wraps its children with the `GameContext.Provider` to supply the current game ID,
 * as well as methods for completing tasks and submitting question answers.
 *
 * @param children - The child components to be wrapped by the provider.
 *
 * @returns A React component wrapping its children with the `GameContext` provider.
 */
const GameContextProvider: FC<GameContextProviderProps> = ({ children }) => {
  const { revokeGame } = useAuthContext()
  const { game } = useAuthContext()

  const gameID = useMemo(() => game?.ACCESS.gameId, [game])
  const gameToken = useMemo(() => game?.ACCESS.token, [game])
  const participantId = useMemo(() => game?.ACCESS.sub, [game])
  const participantType = useMemo(() => game?.ACCESS.participantType, [game])

  const {
    completeTask,
    submitQuestionAnswer,
    leaveGame,
    addCorrectAnswer,
    deleteCorrectAnswer,
    getPlayers,
    updateGameSettings,
    quitGame,
    createOrUpdateGameRating,
  } = useKlurigoServiceClient()

  const fullScreenHandle = useFullScreenHandle()

  /**
   * Handles a player leaving the current game.
   *
   * Executes a leave operation for the specified player and revokes the local
   * game session when the leaving player is the current participant.
   *
   * @param playerID - The unique identifier of the player leaving the game.
   * @throws Error when the game identifier is missing.
   * @returns A promise that resolves once the leave operation and any required
   *          cleanup have completed.
   */
  const handleLeaveGame = useCallback(
    async (playerID: string): Promise<void> => {
      if (!gameID) {
        throw new Error('Missing gameID')
      }

      await leaveGame(gameID, playerID)

      if (participantId === playerID) {
        await revokeGame()
      }
    },
    [gameID, participantId, leaveGame, revokeGame],
  )

  /**
   * Memoized value for the `GameContext`, containing the current game ID
   * and methods for completing tasks and submitting question answers.
   */
  const value = useMemo<GameContextType>(
    () => ({
      gameID,
      gameToken,
      participantId,
      participantType,
      isFullscreenActive: fullScreenHandle.active,
      completeTask: () => (gameID ? completeTask(gameID) : Promise.reject()),
      submitQuestionAnswer: (request) =>
        gameID ? submitQuestionAnswer(gameID, request) : Promise.reject(),
      leaveGame: handleLeaveGame,
      addCorrectAnswer: (answer: QuestionCorrectAnswerDto) =>
        gameID ? addCorrectAnswer(gameID, answer) : Promise.reject(),
      deleteCorrectAnswer: (answer: QuestionCorrectAnswerDto) =>
        gameID ? deleteCorrectAnswer(gameID, answer) : Promise.reject(),
      getPlayers: () => (gameID ? getPlayers(gameID) : Promise.reject()),
      updateGameSettings: (settings: GameSettingsDto) =>
        gameID ? updateGameSettings(gameID, settings) : Promise.reject(),
      toggleFullscreen: fullScreenHandle.active
        ? fullScreenHandle.exit
        : fullScreenHandle.enter,
      quitGame: () => (gameID ? quitGame(gameID) : Promise.reject()),
      createOrUpdateGameRating: (rating) =>
        gameID ? createOrUpdateGameRating(gameID, rating) : Promise.reject(),
    }),
    [
      gameID,
      gameToken,
      participantId,
      participantType,
      fullScreenHandle,
      completeTask,
      submitQuestionAnswer,
      handleLeaveGame,
      addCorrectAnswer,
      deleteCorrectAnswer,
      getPlayers,
      updateGameSettings,
      quitGame,
      createOrUpdateGameRating,
    ],
  )

  return (
    <GameContext.Provider value={value}>
      <FullScreen handle={fullScreenHandle}>{children}</FullScreen>
    </GameContext.Provider>
  )
}

export default GameContextProvider
