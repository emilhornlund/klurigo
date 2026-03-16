import {
  type CreateGameResponseDto,
  type CreateQuizRatingDto,
  type GameParticipantPlayerDto,
  type GameResultDto,
  type GameSettingsDto,
  type PaginatedGameHistoryDto,
  type QuestionCorrectAnswerDto,
  type QuizRatingDto,
  type SubmitQuestionAnswerRequestDto,
  TokenScope,
} from '@klurigo/common'

import type { ApiClientCore } from '../api-client-core'
import { parseQueryParams } from '../api.utils'

/**
 * Side-effect hooks used by `createGameResource`.
 *
 * The game resource performs API calls only and delegates user feedback (e.g. toast notifications)
 * to injected callbacks.
 */
export type GameResourceDeps = {
  /**
   * Emits a success notification to the user.
   *
   * @param message - The user-facing message to display.
   */
  notifySuccess: (message: string) => void

  /**
   * Emits an error notification to the user.
   *
   * @param message - The user-facing message to display.
   */
  notifyError: (message: string) => void
}

/**
 * Game API wrapper.
 *
 * @param api - Shared API client core used for request execution.
 * @param deps - Side-effect callbacks for user notifications.
 * @returns An object containing game-related API functions.
 */
export const createGameResource = (
  api: ApiClientCore,
  deps: GameResourceDeps,
) => {
  /**
   * Creates a new game using the provided quizId.
   *
   * @param quizId - The ID of the quiz to create a game from.
   *
   * @returns A promise resolving to the created game details as a `CreateGameResponseDto`.
   */
  const createGame = (quizId: string): Promise<CreateGameResponseDto> =>
    api
      .apiPost<CreateGameResponseDto>(`/quizzes/${quizId}/games`, {})
      .catch((error) => {
        deps.notifyError(
          'We couldn’t spin up your game right now. Please try again.',
        )
        throw error
      })

  /**
   * Joins an existing game using the provided game ID and player nickname.
   *
   * @param gameId - The ID of the game to join.
   * @param nickname - The nickname of the player joining the game.
   *
   * @returns A promise that resolves when the player has successfully joined the game.
   */
  const joinGame = (gameId: string, nickname: string): Promise<void> =>
    api
      .apiPost<void>(
        `/games/${gameId}/players`,
        { nickname },
        { scope: TokenScope.Game },
      )
      .catch((error) => {
        deps.notifyError(
          'Couldn’t join the game. Check the code and try again.',
        )
        throw error
      })

  /**
   * Leaves an existing game by removing the specified player participant.
   *
   * @param gameId - The ID of the game to leave.
   * @param playerID - The ID of the player to remove.
   * @returns A promise that resolves when the player has been removed from the game.
   */
  const leaveGame = (gameId: string, playerID: string): Promise<void> =>
    api
      .apiDelete<void>(`/games/${gameId}/players/${playerID}`, undefined, {
        scope: TokenScope.Game,
      })
      .catch((error) => {
        deps.notifyError(
          'We couldn’t remove that player right now. Please try again.',
        )
        throw error
      })

  /**
   * Retrieves the list of player participants for a given game.
   *
   * @param gameId - The unique identifier of the game.
   * @returns A promise that resolves to an array of player participants.
   */
  const getPlayers = (gameId: string): Promise<GameParticipantPlayerDto[]> =>
    api
      .apiGet<GameParticipantPlayerDto[]>(`/games/${gameId}/players`, {
        scope: TokenScope.Game,
      })
      .catch((error) => {
        deps.notifyError(
          "Couldn't load players for this game. Please try again.",
        )
        throw error
      })

  /**
   * Updates the runtime settings for a specific game instance.
   *
   * Modifies game behavior settings such as question and answer randomization.
   * Uses Game token scope for authorization.
   *
   * @param gameId - The unique identifier of the game to update.
   * @param settings - The game settings payload containing the updated configuration.
   * @returns A promise that resolves to the updated game settings as returned by the backend.
   */
  const updateGameSettings = (
    gameId: string,
    settings: GameSettingsDto,
  ): Promise<GameSettingsDto> =>
    api
      .apiPut<GameSettingsDto>(`/games/${gameId}/settings`, settings, {
        scope: TokenScope.Game,
      })
      .catch((error) => {
        deps.notifyError(
          "Couldn't update game settings right now. Please try again.",
        )
        throw error
      })

  /**
   * Marks the current task in the game as completed.
   *
   * @param gameId - The ID of the game whose current task should be completed.
   * @returns A promise that resolves when the task has been marked as completed.
   */
  const completeTask = (gameId: string): Promise<void> =>
    api
      .apiPost<void>(
        `/games/${gameId}/tasks/current/complete`,
        {},
        { scope: TokenScope.Game },
      )
      .catch((error) => {
        deps.notifyError('We couldn’t move to the next step. Please try again.')
        throw error
      })

  /**
   * Submits an answer to a question in the specified game.
   *
   * @param gameId - The ID of the game where the answer is being submitted.
   * @param submitQuestionAnswerRequest - The request containing the answer details.
   *
   * @returns A promise that resolves when the answer has been successfully submitted.
   */
  const submitQuestionAnswer = async (
    gameId: string,
    submitQuestionAnswerRequest: SubmitQuestionAnswerRequestDto,
  ): Promise<void> =>
    api
      .apiPost<void>(`/games/${gameId}/answers`, submitQuestionAnswerRequest, {
        scope: TokenScope.Game,
      })
      .catch((error) => {
        deps.notifyError(
          'Your answer didn’t make it through. Please try submitting again.',
        )
        throw error
      })

  /**
   * Adds a correct answer to the current task in the specified game.
   *
   * @param gameId - The ID of the game where the correct answer should be added.
   * @param answer - The correct answer data to add to the current task.
   * @returns A promise that resolves when the correct answer has been successfully added.
   */
  const addCorrectAnswer = (
    gameId: string,
    answer: QuestionCorrectAnswerDto,
  ): Promise<void> =>
    api
      .apiPost<void>(`/games/${gameId}/tasks/current/correct_answers`, answer, {
        scope: TokenScope.Game,
      })
      .catch((error) => {
        deps.notifyError('Couldn’t save the correct answer. Please try again.')
        throw error
      })

  /**
   * Deletes a correct answer from the current task in the specified game.
   *
   * @param gameId - The ID of the game where the correct answer should be deleted.
   * @param answer - The correct answer data to delete from the current task.
   * @returns A promise that resolves when the correct answer has been successfully deleted.
   */
  const deleteCorrectAnswer = (
    gameId: string,
    answer: QuestionCorrectAnswerDto,
  ): Promise<void> =>
    api
      .apiDelete<void>(
        `/games/${gameId}/tasks/current/correct_answers`,
        answer,
        {
          scope: TokenScope.Game,
        },
      )
      .catch((error) => {
        deps.notifyError(
          'Couldn’t remove that correct answer. Please try again.',
        )
        throw error
      })

  /**
   * Quits the current game for the authenticated client.
   *
   * Ends the game session and removes the client from the game.
   *
   * @param gameId - The unique identifier of the game.
   * @returns A promise that resolves when the game has been successfully quit.
   */
  const quitGame = (gameId: string): Promise<void> =>
    api
      .apiPost<void>(
        `/games/${gameId}/quit`,
        {},
        {
          scope: TokenScope.Game,
        },
      )
      .catch((error) => {
        deps.notifyError('We couldn’t quit the game cleanly. Please try again.')
        throw error
      })

  /**
   * Fetches the results for a completed game by its ID.
   *
   * Uses the default request scope (User) unless the API core is configured otherwise.
   *
   * @param gameId - The unique identifier of the game to retrieve results for.
   * @returns A promise that resolves with the game's result data.
   */
  const getGameResults = (gameId: string) =>
    api.apiGet<GameResultDto>(`/games/${gameId}/results`).catch((error) => {
      deps.notifyError('Results are playing hide-and-seek. Please try again.')
      throw error
    })

  /**
   * Retrieves the game history associated with the current player.
   *
   * @param options.limit - The maximum number of games to retrieve per page.
   * @param options.offset - The number of games to skip before starting retrieval.
   *
   * @returns A promise that resolves to a paginated list of past games.
   */
  const getProfileGames = (options: {
    limit: number
    offset: number
  }): Promise<PaginatedGameHistoryDto> =>
    api
      .apiGet<PaginatedGameHistoryDto>(
        `/profile/games${parseQueryParams(options)}`,
      )
      .catch((error) => {
        deps.notifyError(
          'We couldn’t load your game history. Please try again.',
        )
        throw error
      })

  /**
   * Creates or updates the authenticated player’s rating for a specific game’s quiz.
   *
   * Sends a PUT request to `/games/:gameId/ratings` using the Game token scope,
   * allowing both anonymous and authenticated players to rate the quiz they just played.
   *
   * @param gameId - The unique identifier of the game being rated.
   * @param rating - The rating payload containing the star value and optional comment.
   *
   * @returns A promise that resolves to the created or updated quiz rating.
   */
  const createOrUpdateGameRating = (
    gameId: string,
    rating: CreateQuizRatingDto,
  ): Promise<QuizRatingDto> =>
    api
      .apiPut<QuizRatingDto>(`/games/${gameId}/ratings`, rating, {
        scope: TokenScope.Game,
      })
      .catch((error) => {
        deps.notifyError('We couldn’t save your rating. Please try again.')
        throw error
      })

  return {
    createGame,
    joinGame,
    leaveGame,
    getPlayers,
    updateGameSettings,
    completeTask,
    submitQuestionAnswer,
    addCorrectAnswer,
    deleteCorrectAnswer,
    quitGame,
    getGameResults,
    getProfileGames,
    createOrUpdateGameRating,
  }
}
