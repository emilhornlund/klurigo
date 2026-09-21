import type { GameQuestionPlayerAnswerEvent } from '@klurigo/common'
import {
  CountdownEvent,
  GameEventQuestion,
  GameEventType,
  GameQuestionHostEvent,
  GameQuestionPlayerEvent,
  GameQuestionPreviewHostEvent,
  GameQuestionPreviewPlayerEvent,
  MediaType,
  QuestionType,
} from '@klurigo/common'

import {
  Game,
  ParticipantPlayerWithBase,
  QuestionTaskAnswer,
  QuestionTaskBaseMetadata,
  QuestionTaskMetadata,
  QuestionTaskPuzzleMetadata,
  TaskType,
} from '../../game-core/repositories/models/schemas'
import {
  isMultiChoiceAnswer,
  isPinAnswer,
  isPuzzleAnswer,
  isRangeAnswer,
  isTrueFalseAnswer,
  isTypeAnswerAnswer,
} from '../../game-task/utils/question-answer-type-guards'
import { QuestionDao } from '../../quiz-core/repositories/models/schemas'
import {
  isMultiChoiceQuestion,
  isPinQuestion,
  isPuzzleQuestion,
  isRangeQuestion,
  isTrueFalseQuestion,
  isTypeAnswerQuestion,
} from '../../quiz-core/utils'

import { buildPaginationEventFromGameDocument } from './pagination-event.utils'
import {
  validateAndGetQuestion,
  validateGameDocument,
} from './validation.utils'

/**
 * Builds a question preview event for the host.
 *
 * @param game - The game document containing the current question task.
 *
 * @returns An event showing a preview of the current question for the host.
 */
export function buildGameQuestionPreviewHostEvent(
  game: Game & { currentTask: { type: TaskType.Question } },
): GameQuestionPreviewHostEvent {
  validateGameDocument(game)
  const currentQuestion = validateAndGetQuestion(game)
  const { type, text: question, points } = currentQuestion
  return {
    type: GameEventType.GameQuestionPreviewHost,
    game: {
      mode: game.mode,
      pin: game.pin,
    },
    question: {
      type,
      question,
      points,
    },
    countdown: buildGameQuestionCountdownEvent(game),
    pagination: buildPaginationEventFromGameDocument(game),
  }
}

/**
 * Builds a question preview event for a player.
 *
 * @param game - The game document containing the current question task.
 * @param player - The player participant object for whom the event is being built.
 *
 * @returns An event showing a preview of the current question for the player.
 */
export function buildGameQuestionPreviewPlayerEvent(
  game: Game & { currentTask: { type: TaskType.Question } },
  player: ParticipantPlayerWithBase,
): GameQuestionPreviewPlayerEvent {
  validateGameDocument(game)
  const currentQuestion = validateAndGetQuestion(game)
  const { type, text: question, points } = currentQuestion

  const { nickname, totalScore: score } = player

  return {
    type: GameEventType.GameQuestionPreviewPlayer,
    game: { mode: game.mode },
    player: {
      nickname,
      score,
    },
    question: {
      type,
      question,
      points,
    },
    countdown: buildGameQuestionCountdownEvent(game),
    pagination: buildPaginationEventFromGameDocument(game),
  }
}

/**
 * Builds a question event for the host, including countdown and submission details.
 *
 * @param game - The game document containing the current question task.
 * @param currentAnswerSubmissions - The current count of answers submitted for the question.
 * @param totalAnswerSubmissions - The total number of answers expected to be submitted for the question.
 *
 * @returns {GameQuestionHostEvent} A question event for the host.
 */
export function buildGameQuestionHostEvent(
  game: Game & { currentTask: { type: TaskType.Question } },
  currentAnswerSubmissions: number,
  totalAnswerSubmissions: number,
): GameQuestionHostEvent {
  validateGameDocument(game)
  const currentQuestion = validateAndGetQuestion(game)
  const currentQuestionTask = game.currentTask

  return {
    type: GameEventType.GameQuestionHost,
    game: {
      pin: game.pin,
    },
    question: buildGameEventQuestion(
      currentQuestion,
      currentQuestionTask.metadata,
    ),
    countdown: buildGameQuestionCountdownEvent(game),
    submissions: {
      current: currentAnswerSubmissions,
      total: totalAnswerSubmissions,
    },
    pagination: buildPaginationEventFromGameDocument(game),
  }
}

/**
 * Builds a question event for a player, including countdown, score details,
 * and the player's submitted answer when available.
 *
 * @param game - The game document containing the current question task.
 * @param player - The player participant object for whom the event is being built.
 * @param answer - The player's stored answer for the current question, if they have submitted one.
 *
 * @returns A question event for the player.
 */
export function buildGameQuestionPlayerEvent(
  game: Game & { currentTask: { type: TaskType.Question } },
  player: ParticipantPlayerWithBase,
  answer?: QuestionTaskAnswer,
): GameQuestionPlayerEvent {
  validateGameDocument(game)
  const currentQuestion = validateAndGetQuestion(game)
  const currentQuestionTask = game.currentTask

  const { nickname, totalScore: total } = player

  return {
    type: GameEventType.GameQuestionPlayer,
    player: {
      nickname,
      score: {
        total,
      },
    },
    question: buildGameEventQuestion(
      currentQuestion,
      currentQuestionTask.metadata,
    ),
    answer: buildGameQuestionPlayerAnswerEvent(answer),
    countdown: buildGameQuestionCountdownEvent(game),
    pagination: buildPaginationEventFromGameDocument(game),
  }
}

/**
 * Builds a countdown event for question tasks.
 *
 * @param game - The game document containing the current question task.
 *
 * @returns A countdown event with expiry time and server time.
 */
function buildGameQuestionCountdownEvent(
  game: Game & {
    currentTask: { type: TaskType.Question }
  },
): CountdownEvent {
  const {
    currentTask: { currentTransitionInitiated, currentTransitionExpires } = {},
  } = game

  if (!currentTransitionInitiated || !currentTransitionExpires) {
    throw new Error(
      `Missing transition initiated or expired for game '${game._id}'`,
    )
  }

  return {
    initiatedTime: currentTransitionInitiated.toISOString(),
    expiryTime: currentTransitionExpires.toISOString(),
    serverTime: new Date().toISOString(),
  }
}

/**
 * Builds a game event question object based on the question type.
 *
 * @param question - The question object from the game document.
 * @param metadata - The metadata object of the current question task.
 *
 * @returns A formatted question object depending on the question type.
 */
function buildGameEventQuestion(
  question: QuestionDao,
  metadata: QuestionTaskMetadata,
): GameEventQuestion {
  const common = {
    question: question.text,
    media: question.media
      ? {
          type: question.media.type,
          url: question.media.url,
          ...(question.media.type === MediaType.Image
            ? { effect: question.media.effect }
            : {}),
        }
      : undefined,
    duration: question.duration,
  }

  if (isMultiChoiceQuestion(question)) {
    return {
      type: QuestionType.MultiChoice,
      answers: question.options.map(({ value }) => ({ value })),
      ...common,
    }
  }
  if (isRangeQuestion(question)) {
    return {
      type: QuestionType.Range,
      min: question.min,
      max: question.max,
      step: question.step,
      ...common,
    }
  }
  if (isTrueFalseQuestion(question)) {
    return {
      type: QuestionType.TrueFalse,
      ...common,
    }
  }
  if (isTypeAnswerQuestion(question)) {
    return {
      type: QuestionType.TypeAnswer,
      ...common,
    }
  }
  if (isPinQuestion(question)) {
    return { type: QuestionType.Pin, imageURL: question.imageURL, ...common }
  }
  if (isPuzzleQuestion(question) && isPuzzleMetadata(metadata)) {
    return {
      type: QuestionType.Puzzle,
      values: metadata.randomizedValues,
      ...common,
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  throw new Error(`Unsupported question type '${(question as any).type}'`)
}

/**
 * Builds a `GameQuestionPlayerAnswerEvent` from a stored player answer.
 *
 * Maps the persisted `QuestionTaskAnswer` to the wire-format used in
 * game events, preserving both the `QuestionType` and the answer value
 * in the appropriate shape.
 *
 * If the player has not submitted an answer, `undefined` is returned.
 *
 * @param answer - The stored answer for the current player and question, if any.
 *
 * @returns The normalized player answer event, or `undefined` if no answer exists.
 */
function buildGameQuestionPlayerAnswerEvent(
  answer?: QuestionTaskAnswer,
): GameQuestionPlayerAnswerEvent | undefined {
  if (isMultiChoiceAnswer(answer)) {
    return {
      type: QuestionType.MultiChoice,
      value: answer.answer,
    }
  }

  if (isTrueFalseAnswer(answer)) {
    return {
      type: QuestionType.TrueFalse,
      value: answer.answer,
    }
  }

  if (isRangeAnswer(answer)) {
    return {
      type: QuestionType.Range,
      value: answer.answer,
    }
  }

  if (isTypeAnswerAnswer(answer)) {
    return {
      type: QuestionType.TypeAnswer,
      value: answer.answer,
    }
  }

  if (isPinAnswer(answer)) {
    return {
      type: QuestionType.Pin,
      value: answer.answer,
    }
  }

  if (isPuzzleAnswer(answer)) {
    return {
      type: QuestionType.Puzzle,
      value: answer.answer,
    }
  }
}

/**
 * Checks if the given metadata is of type `Puzzle`.
 *
 * @param metadata - The metadata data object of the current question task.
 *
 * @returns Returns `true` if the metadata is of type `Puzzle`, otherwise `false`.
 */
function isPuzzleMetadata(
  metadata?: QuestionTaskMetadata,
): metadata is QuestionTaskBaseMetadata & QuestionTaskPuzzleMetadata {
  return metadata?.type === QuestionType.Puzzle
}
