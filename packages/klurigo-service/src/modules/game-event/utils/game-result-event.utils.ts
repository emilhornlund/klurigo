import {
  GameEventQuestionResults,
  GameEventType,
  GameMode,
  GameResultHostEvent,
  GameResultPlayerEvent,
  GameResultPlayerEventBehind,
  GameResultPlayerEventScore,
  MediaType,
  PaginationEvent,
} from '@klurigo/common'

import {
  GameDocument,
  ParticipantPlayerWithBase,
  QuestionResultTaskWithBase,
  TaskType,
} from '../../game-core/repositories/models/schemas'
import { isParticipantPlayer } from '../../game-core/utils'
import { IllegalTaskTypeException } from '../../game-task/exceptions'
import {
  isLeaderboardTask,
  isPodiumTask,
  isQuestionResultTask,
} from '../../game-task/utils/task-type-guards'
import {
  isMultiChoiceQuestion,
  isPinQuestion,
  isPuzzleQuestion,
  isRangeQuestion,
  isTrueFalseQuestion,
  isTypeAnswerQuestion,
} from '../../quiz-core/utils'

import {
  createMultiChoiceQuestionResultDistribution,
  createPinQuestionResultDistribution,
  createPuzzleQuestionResultDistribution,
  createRangeQuestionResultDistribution,
  createTrueFalseQuestionResultDistribution,
  createTypeAnswerQuestionResultDistribution,
} from './distribution.utils'
import {
  buildPaginationEventFromGameDocument,
  buildPaginationEventFromQuestionResultTask,
} from './pagination-event.utils'
import {
  findLastQuestionResultTask,
  findPreviousQuestionResultForPlayer,
  findQuestionResultForPlayer,
} from './question-result.utils'
import {
  validateAndGetQuestion,
  validateGameDocument,
} from './validation.utils'

/**
 * Builds a question result event for the host.
 *
 * @param game - The game document containing the current question result task.
 */
export function buildGameResultHostEvent(
  game: GameDocument & { currentTask: { type: TaskType.QuestionResult } },
): GameResultHostEvent {
  validateGameDocument(game)
  const currentQuestion = validateAndGetQuestion(game)
  const { type, text: question, media, info } = currentQuestion

  return {
    type: GameEventType.GameResultHost,
    game: {
      pin: game.pin,
    },
    question: {
      type,
      question,
      media: media
        ? {
            type: media.type,
            url: media.url,
            ...(media.type === MediaType.Image ? { effect: media.effect } : {}),
          }
        : undefined,
      info,
    },
    results: buildGameEventQuestionResults(game),
    pagination: buildPaginationEventFromGameDocument(game),
  }
}

/**
 * Constructs the question results event based on the current question type and aggregates the answer distribution.
 *
 * @param game - The game document containing the current question result task.
 *
 * @returns An object representing the results of the question, including the answer distribution.
 *
 * @throws {Error} Throws an error if the question type is not recognized.
 */
function buildGameEventQuestionResults(
  game: GameDocument & { currentTask: { type: TaskType.QuestionResult } },
): GameEventQuestionResults {
  validateGameDocument(game)
  const question = validateAndGetQuestion(game)

  if (isMultiChoiceQuestion(question)) {
    return createMultiChoiceQuestionResultDistribution(
      question,
      game.currentTask.results,
      game.currentTask.correctAnswers,
    )
  }

  if (isRangeQuestion(question)) {
    return createRangeQuestionResultDistribution(
      question,
      game.currentTask.results,
      game.currentTask.correctAnswers,
    )
  }

  if (isTrueFalseQuestion(question)) {
    return createTrueFalseQuestionResultDistribution(
      game.currentTask.results,
      game.currentTask.correctAnswers,
    )
  }

  if (isTypeAnswerQuestion(question)) {
    return createTypeAnswerQuestionResultDistribution(
      game.currentTask.results,
      game.currentTask.correctAnswers,
    )
  }

  if (isPinQuestion(question)) {
    return createPinQuestionResultDistribution(
      question,
      game.currentTask.results,
      game.currentTask.correctAnswers,
    )
  }

  if (isPuzzleQuestion(question)) {
    return createPuzzleQuestionResultDistribution(
      question,
      game.currentTask.results,
      game.currentTask.correctAnswers,
    )
  }

  throw new Error('Question type is undefined or invalid.')
}

/**
 * Builds a `GameResultPlayerEvent` for the given player based on the current game task.
 *
 * Resolves the correct builder depending on the current task type:
 * - `TaskType.QuestionResult` uses the current question result task.
 * - `TaskType.Leaderboard` and `TaskType.Podium` use the last question result task.
 *
 * @param game - Game document whose current task is QuestionResult, Leaderboard, or Podium.
 * @param player - Player participant to build the result event for.
 * @returns A player game result event for the current task.
 */
export function buildGameResultPlayerEvent(
  game: GameDocument & {
    currentTask: {
      type: TaskType.QuestionResult | TaskType.Leaderboard | TaskType.Podium
    }
  },
  player: ParticipantPlayerWithBase,
): GameResultPlayerEvent {
  if (isQuestionResultTask(game)) {
    return buildGameResultPlayerEventFromCurrentQuestionResultTask(game, player)
  }

  if (isLeaderboardTask(game) || isPodiumTask(game)) {
    return buildGameResultPlayerEventFromLeaderboardOrPodiumTask(game, player)
  }

  throw new IllegalTaskTypeException(
    game.currentTask.type,
    TaskType.QuestionResult,
    TaskType.Leaderboard,
    TaskType.Podium,
  )
}

/**
 * Builds a `GameResultPlayerEvent` for the given player when the current task is a question result.
 *
 * Delegates to `buildGameResultPlayerEventFromQuestionResultTask` using the current task
 * as the active `QuestionResultTask`.
 *
 * @param game - Game document whose current task is a QuestionResult task.
 * @param player - Player participant to build the result event for.
 * @returns A player game result event for the current question result task.
 */
function buildGameResultPlayerEventFromCurrentQuestionResultTask(
  game: GameDocument & {
    currentTask: { type: TaskType.QuestionResult }
  },
  player: ParticipantPlayerWithBase,
): GameResultPlayerEvent {
  return buildGameResultPlayerEventFromQuestionResultTask(
    game,
    game.currentTask,
    player,
  )
}

/**
 * Builds a `GameResultPlayerEvent` for the given player from a specific question result task.
 *
 * If the player has a result entry in the task, the event is built from that result.
 * If not, a fallback event is created based on the player's aggregate scores.
 *
 * @param game - Game document containing the full question set for pagination.
 * @param questionResultTask - Question result task to extract the player's result and pagination from.
 * @param player - Player participant to build the result event for.
 * @returns A player game result event for the given question result task.
 */
function buildGameResultPlayerEventFromQuestionResultTask(
  game: GameDocument,
  questionResultTask: QuestionResultTaskWithBase,
  player: ParticipantPlayerWithBase,
): GameResultPlayerEvent {
  const currentQuestionResult = findQuestionResultForPlayer(
    questionResultTask,
    player,
  )

  if (!currentQuestionResult) {
    return buildFallbackGameResultPlayerEventForQuestionResultTask(
      game,
      questionResultTask,
      player,
    )
  }

  const { nickname } = player

  const {
    correct,
    lastScore: last,
    totalScore: total,
    position,
    streak,
  } = currentQuestionResult

  const score: GameResultPlayerEventScore = {
    correct,
    last,
    total,
    position,
  }

  const previousQuestionResult = findPreviousQuestionResultForPlayer(
    questionResultTask,
    player,
  )

  const pagination = buildPaginationEventFromQuestionResultTask(
    game,
    questionResultTask,
  )

  const behind: GameResultPlayerEventBehind | undefined = previousQuestionResult
    ? {
        points: Math.abs(previousQuestionResult.totalScore - total),
        nickname: previousQuestionResult.nickname,
      }
    : undefined

  return createGameResultPlayerEvent(
    game.mode,
    nickname,
    score,
    pagination,
    behind,
    streak,
  )
}

/**
 * Builds a fallback `GameResultPlayerEvent` when the player has no entry
 * in the given question result task.
 *
 * Uses the player's aggregate scores (total score and rank) and marks the
 * question as incorrect with a last score of `0`.
 *
 * @param game - Game document containing the full question set for pagination.
 * @param questionResultTask - Question result task used for pagination context.
 * @param player - Player participant to build the fallback result event for.
 * @returns A fallback player game result event for the given question result task.
 */
function buildFallbackGameResultPlayerEventForQuestionResultTask(
  game: GameDocument,
  questionResultTask: QuestionResultTaskWithBase,
  player: ParticipantPlayerWithBase,
): GameResultPlayerEvent {
  const { nickname, totalScore: total, rank } = player

  const position =
    typeof rank === 'number' && player.rank > 0
      ? rank
      : game.participants.filter(isParticipantPlayer).length

  const score: GameResultPlayerEventScore = {
    correct: false,
    last: 0,
    total,
    position,
  }

  const pagination = buildPaginationEventFromQuestionResultTask(
    game,
    questionResultTask,
  )

  return createGameResultPlayerEvent(game.mode, nickname, score, pagination)
}

/**
 * Builds a `GameResultPlayerEvent` for Leaderboard or Podium tasks.
 *
 * Uses the last available QuestionResult task in the game to derive the player's
 * score and pagination context. Throws if no QuestionResult task exists, since
 * Leaderboard/Podium states are expected to follow at least one question.
 *
 * @param game - Game document whose current task is a Leaderboard or Podium task.
 * @param player - Player participant to build the result event for.
 * @returns A player game result event based on the last question result task.
 */
function buildGameResultPlayerEventFromLeaderboardOrPodiumTask(
  game: GameDocument & {
    currentTask: { type: TaskType.Leaderboard | TaskType.Podium }
  },
  player: ParticipantPlayerWithBase,
): GameResultPlayerEvent {
  const lastQuestionResultTask = findLastQuestionResultTask(game)

  if (!lastQuestionResultTask) {
    throw new Error(
      'Expected at least one QuestionResultTask when building GameResultPlayerEvent for Leaderboard/Podium task',
    )
  }

  return buildGameResultPlayerEventFromQuestionResultTask(
    game,
    lastQuestionResultTask,
    player,
  )
}

/**
 * Creates a `GameResultPlayerEvent` from the provided values.
 *
 * This is a low-level factory used by higher-level builders to format the
 * final event payload consistently.
 *
 * @param mode - The mode the game is played in.
 * @param nickname - Player nickname to include in the event.
 * @param score - Player score details for the current question and overall game.
 * @param pagination - Pagination metadata for the current question index.
 * @param behind - Optional information about the player directly ahead in score.
 * @param streak - The Classic-only answer streak for the current result.
 * @returns A fully constructed player game result event.
 */
function createGameResultPlayerEvent(
  mode: GameMode,
  nickname: string,
  score: GameResultPlayerEventScore,
  pagination: PaginationEvent,
  behind?: GameResultPlayerEventBehind,
  streak?: number,
): GameResultPlayerEvent {
  if (mode === GameMode.Classic) {
    return {
      type: GameEventType.GameResultPlayer,
      game: { mode },
      player: {
        nickname,
        score: { ...score, streak: streak ?? 0 },
        behind,
      },
      pagination,
    }
  }

  return {
    type: GameEventType.GameResultPlayer,
    game: { mode },
    player: { nickname, score, behind },
    pagination,
  }
}
