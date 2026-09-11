import { GameParticipantType, GameStatus } from '@klurigo/common'
import { User } from '@sentry/nestjs'
import { v4 as uuidv4 } from 'uuid'

import { Quiz } from '../../quiz-core/repositories/models/schemas'
import { Game, LobbyTaskWithBase } from '../repositories/models/schemas'

/**
 * Builds a complete game document from the provided partial game model and other details.
 *
 * @param quiz - The quiz document.
 * @param gamePIN - The unique 6-digit game PIN of the game to create.
 * @param user - The user object representing the host creating the game.
 * @param lobbyTask - The initial Lobby task to use as `currentTask` for the newly created game.
 *
 * @returns A fully constructed Game document.
 */
export function buildGameModel(
  quiz: Quiz,
  gamePIN: string,
  user: User,
  lobbyTask: LobbyTaskWithBase,
): Game {
  const now = Date.now()

  return {
    _id: uuidv4(),
    name: quiz.title,
    mode: quiz.mode,
    status: GameStatus.Active,
    pin: gamePIN,
    quiz,
    settings: {
      shouldAutoCompleteQuestionResultTask: false,
      shouldAutoCompleteLeaderboardTask: false,
      shouldAutoCompletePodiumTask: false,
      randomizeQuestionOrder: false,
      randomizeAnswerOrder: false,
    },
    questions: quiz.questions,
    nextQuestion: 0,
    participants: [
      {
        participantId: user._id,
        type: GameParticipantType.HOST,
        created: new Date(now),
        updated: new Date(now),
      },
    ],
    currentTask: lobbyTask,
    previousTasks: [],
    updated: new Date(now),
    version: 0,
    created: new Date(now),
  }
}
