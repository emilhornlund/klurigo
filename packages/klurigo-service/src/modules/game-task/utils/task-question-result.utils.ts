import { GameMode, isDefined, QuestionType } from '@klurigo/common'
import { v4 as uuidv4 } from 'uuid'

import {
  GameDocument,
  Participant,
  ParticipantPlayerWithBase,
  QuestionResultTaskCorrectAnswer,
  QuestionResultTaskCorrectMultiChoiceAnswerWithBase,
  QuestionResultTaskItem,
  QuestionResultTaskWithBase,
  QuestionTaskAnswer,
  TaskType,
} from '../../game-core/repositories/models/schemas'
import { isParticipantPlayer } from '../../game-core/utils'
import { QuestionDao } from '../../quiz-core/repositories/models/schemas'
import {
  isMultiChoiceQuestion,
  isPinQuestion,
  isPuzzleQuestion,
  isRangeQuestion,
  isTrueFalseQuestion,
  isTypeAnswerQuestion,
} from '../../quiz-core/utils'
import { IllegalTaskTypeException } from '../exceptions'

import {
  calculateQuestionScoreForParticipant,
  isQuestionAnswerCorrect,
} from './scoring'
import {
  compareClassicModeQuestionResultTaskItemByScoreThenParticipationThenTime,
  compareZeroToOneHundredModeQuestionResultTaskItemByScoreThenParticipationThenTime,
} from './task-sorting.utils'
import { isQuestionResultTask, isQuestionTask } from './task-type-guards'

/**
 * Constructs a new `QuestionResultTask` based on the current active question task.
 *
 * This function is typically used during normal gameplay after a question is completed.
 * It evaluates all player answers, calculates scores and correctness, and assigns positions.
 * The task includes the correct answers and is ready to be emitted or persisted.
 *
 * @param gameDocument - The current game state containing the active question task and answers.
 * @returns A fully populated `QuestionResultTask` with correct answers and scored results.
 *
 * @throws {IllegalTaskTypeException} If the current task is not of type `Question`.
 */
export function buildQuestionResultTask(
  gameDocument: GameDocument,
): QuestionResultTaskWithBase {
  if (!isQuestionTask(gameDocument)) {
    throw new IllegalTaskTypeException(
      gameDocument.currentTask.type,
      TaskType.Question,
    )
  }

  const { mode, questions, participants } = gameDocument
  const { questionIndex, presented, answers } = gameDocument.currentTask
  const question = questions[questionIndex]

  const correctAnswers =
    buildInitialQuestionResultTaskCorrectAnswers(gameDocument)

  const results = buildQuestionResultTaskResults({
    mode,
    participants,
    question,
    presented,
    correctAnswers,
    answers,
  })

  return {
    _id: uuidv4(),
    type: TaskType.QuestionResult,
    status: 'pending',
    questionIndex,
    correctAnswers,
    results,
    created: new Date(),
  }
}

/**
 * Recomputes the `results` of an existing `QuestionResultTask` using data from the preceding `Question` task.
 *
 * This function is useful when needing to restore or recalculate results from a previously created result task.
 * It uses the preserved correct answers and answers from the previous task to regenerate the final result items.
 *
 * @param gameDocument - The game document where the current task is of type `QuestionResult`
 *                       and the previous task is of type `Question`.
 * @returns A `QuestionResultTask` with newly rebuilt results while preserving task metadata.
 *
 * @throws {IllegalTaskTypeException} If the current task is not a `QuestionResult` or the previous task is not a `Question`.
 */
export function rebuildQuestionResultTask(
  gameDocument: GameDocument,
): QuestionResultTaskWithBase {
  if (!isQuestionResultTask(gameDocument)) {
    throw new IllegalTaskTypeException(
      gameDocument.currentTask.type,
      TaskType.QuestionResult,
    )
  }

  const { mode, questions, participants } = gameDocument

  const previousTask =
    gameDocument.previousTasks?.[gameDocument.previousTasks.length - 1]
  if (previousTask?.type !== TaskType.Question) {
    throw new IllegalTaskTypeException(
      gameDocument.currentTask.type,
      TaskType.Question,
    )
  }

  const { questionIndex, presented, answers } = previousTask
  const question = questions[questionIndex]

  const { correctAnswers } = gameDocument.currentTask

  const results = buildQuestionResultTaskResults({
    mode,
    participants,
    question,
    presented,
    correctAnswers,
    answers,
  })

  return {
    ...gameDocument.currentTask,
    results,
  }
}

/**
 * Builds the initial set of “correct answer” payloads for a question,
 * normalized into the scoring/validation shape.
 *
 * - MultiChoice: one entry per correct option.
 * - Range: a single numeric value.
 * - True/False: a single boolean value.
 * - TypeAnswer: one entry per valid string option.
 * - Pin: a single `"x,y"` value from the question’s correct coordinates.
 * - Puzzle: the target ordering array from the question.
 *
 * @param gameDocument - The game document to extract correct answers from.
 * @returns An array of normalized correct-answer entries.
 */
function buildInitialQuestionResultTaskCorrectAnswers(
  gameDocument: GameDocument & { currentTask: { type: TaskType.Question } },
): QuestionResultTaskCorrectAnswer[] {
  const { questionIndex } = gameDocument.currentTask
  const question = gameDocument.questions[questionIndex]

  if (isMultiChoiceQuestion(question)) {
    return question.options
      .map(
        (
          option,
          index,
        ): QuestionResultTaskCorrectMultiChoiceAnswerWithBase | undefined =>
          option.correct
            ? { type: QuestionType.MultiChoice, index }
            : undefined,
      )
      .filter(isDefined)
  }
  if (isRangeQuestion(question)) {
    return [{ type: QuestionType.Range, value: question.correct }]
  }
  if (isTrueFalseQuestion(question)) {
    return [{ type: QuestionType.TrueFalse, value: question.correct }]
  }
  if (isTypeAnswerQuestion(question)) {
    return question.options.map((option) => ({
      type: QuestionType.TypeAnswer,
      value: option,
    }))
  }
  if (isPinQuestion(question)) {
    return [
      {
        type: QuestionType.Pin,
        value: `${question.positionX},${question.positionY}`,
      },
    ]
  }
  if (isPuzzleQuestion(question)) {
    return [{ type: QuestionType.Puzzle, value: question.values }]
  }

  return []
}

/**
 * Builds and ranks the result items for each player in a question round.
 *
 * This function filters out player participants, retrieves their answers,
 * evaluates correctness, computes scores, and assigns positional rankings.
 *
 * @param mode - The game mode (`Classic` or `ZeroToOneHundred`), which determines the scoring strategy.
 * @param participants - All game participants; only players are included in the result.
 * @param question - The current question being evaluated.
 * @param presented - The timestamp when the question was shown.
 * @param correctAnswers - The list of correct answers for the question.
 * @param answers - All submitted player answers for the question.
 * @returns A sorted list of `QuestionResultTaskItem`s with calculated scores and positions.
 */
function buildQuestionResultTaskResults({
  mode,
  participants,
  question,
  presented,
  correctAnswers,
  answers,
}: {
  mode: GameMode
  participants: Participant[]
  question: QuestionDao
  presented: Date | undefined
  correctAnswers: QuestionResultTaskCorrectAnswer[]
  answers: QuestionTaskAnswer[]
}): QuestionResultTaskItem[] {
  return participants
    .filter(isParticipantPlayer)
    .map((participant) => {
      const answer = answers.find(
        ({ playerId }) => playerId === participant.participantId,
      )
      return buildQuestionResultTaskItem(
        mode,
        presented,
        participant,
        question,
        correctAnswers,
        answer,
      )
    })
    .sort((a, b) =>
      mode === GameMode.Classic
        ? compareClassicModeQuestionResultTaskItemByScoreThenParticipationThenTime(
            a,
            b,
          )
        : compareZeroToOneHundredModeQuestionResultTaskItemByScoreThenParticipationThenTime(
            a,
            b,
          ),
    )
    .map((item, index) => ({ ...item, position: index + 1 }))
}

/**
 * Builds a `QuestionResultTaskItem` for a given player and their answer.
 *
 * Evaluates correctness, calculates scores, and includes player-specific stats.
 *
 * @param mode - The game mode (`Classic` or `ZeroToOneHundred`), which determines the scoring strategy.
 * @param presented - The timestamp when the question was presented.
 * @param participantPlayer - The player participant for whom the result is being calculated.
 * @param question - The question associated with the current task.
 * @param correctAnswers - The list of correct answers for the question.
 * @param answer - The answer provided by the player to the current question.
 * @returns A `QuestionResultTaskItem` containing the player's performance on the question.
 */
function buildQuestionResultTaskItem(
  mode: GameMode,
  presented: Date | undefined,
  participantPlayer: ParticipantPlayerWithBase,
  question: QuestionDao,
  correctAnswers: QuestionResultTaskCorrectAnswer[],
  answer?: QuestionTaskAnswer,
): QuestionResultTaskItem {
  const {
    participantId,
    nickname,
    totalScore: previousScore,
    currentStreak,
    totalResponseTime: previousTotalResponseTime,
    responseCount: previousResponseCount,
  } = participantPlayer

  const { type } = question

  const nextScore = calculateQuestionScoreForParticipant(
    mode,
    presented,
    question,
    correctAnswers,
    answer,
  )

  const correct = isQuestionAnswerCorrect(
    mode,
    question,
    correctAnswers,
    answer,
  )

  const totalScore = previousScore + nextScore

  const streak = correct ? currentStreak + 1 : 0

  const lastResponseTime = calculatePlayerResponseTime(
    question,
    presented,
    answer,
  )
  const totalResponseTime = previousTotalResponseTime + lastResponseTime

  const responseCount = previousResponseCount + 1

  return {
    type,
    playerId: participantId,
    nickname,
    answer,
    correct,
    lastScore: nextScore,
    totalScore,
    position: 0,
    streak,
    lastResponseTime,
    totalResponseTime,
    responseCount,
  }
}

/**
 * Calculates the player's response time in milliseconds.
 *
 * If the question was never presented, the full question duration is returned.
 * If the player did not submit an answer, the full question duration is returned.
 *
 * @param question - Question metadata including duration (in seconds)
 * @param presented - Timestamp when the question was presented to the player
 * @param answer - Player's submitted answer
 * @returns Response time in milliseconds
 */
function calculatePlayerResponseTime(
  question: QuestionDao,
  presented?: Date,
  answer?: QuestionTaskAnswer,
): number {
  const durationMs = question.duration * 1000

  if (!presented) {
    return durationMs
  }

  if (!answer?.created) {
    return durationMs
  }

  const responseTimeMs = answer.created.getTime() - presented.getTime()

  return Math.max(0, Math.min(responseTimeMs, durationMs))
}
