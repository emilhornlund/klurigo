import { GameMode, GameParticipantType, isDefined } from '@klurigo/common'
import { v4 as uuidv4 } from 'uuid'

import {
  BaseTask,
  GameDocument,
  LeaderboardTaskItem,
  ParticipantPlayerWithBase,
  QuestionResultTaskWithBase,
  QuestionTaskAnswer,
  QuestionTaskWithBase,
  TaskType,
} from '../../../game-core/repositories/models/schemas'
import { IllegalTaskTypeException } from '../../../game-task/exceptions'
import { QuestionDao } from '../../../quiz-core/repositories/models/schemas'
import {
  GameResult,
  PlayerMetric,
  QuestionMetric,
} from '../../repositories/models/schemas'

/**
 * Builds the final GameResult model based on the provided game document.
 * This is only allowed when the game has reached the Podium task stage.
 *
 * @param gameDocument - The full game document including all tasks, questions, and participants.
 * @returns A structured GameResult object containing performance data.
 * @throws {IllegalTaskTypeException} If the current task type is not `Podium`.
 */
export function buildGameResultModel(gameDocument: GameDocument): GameResult {
  if (gameDocument.currentTask.type !== TaskType.Podium) {
    throw new IllegalTaskTypeException(
      gameDocument.currentTask.type,
      TaskType.Podium,
    )
  }

  const { mode, name, participants, currentTask, previousTasks, questions } =
    gameDocument

  const hostParticipantId = participants.find(
    (p) => p.type === GameParticipantType.HOST,
  )?.participantId

  if (!hostParticipantId) {
    throw new Error('No host participantId found.')
  }

  const playerParticipants: ParticipantPlayerWithBase[] = participants
    .filter(({ type }) => type === GameParticipantType.PLAYER)
    .map((player) => player as ParticipantPlayerWithBase)

  const questionTasks = getTasksOfType<QuestionTaskWithBase>(
    previousTasks,
    TaskType.Question,
  )

  const questionResultTasks = getTasksOfType<QuestionResultTaskWithBase>(
    previousTasks,
    TaskType.QuestionResult,
  )

  const hosted =
    previousTasks.find(({ type }) => type === TaskType.Question)?.created ??
    null

  if (!hosted) {
    throw new Error('No hosted date was found.')
  }

  const { created: completed } = currentTask

  return {
    _id: uuidv4(),
    name,
    game: gameDocument,
    hostParticipantId,
    players: buildPlayerMetrics(
      mode,
      currentTask.leaderboard,
      questionResultTasks,
      playerParticipants,
    ),
    questions: buildQuestionMetrics(
      mode,
      questions,
      questionResultTasks,
      questionTasks,
      playerParticipants,
    ),
    hosted,
    completed,
  }
}

/**
 * Builds player-specific metrics (e.g., correct answers, score, response times) for the final GameResult.
 *
 * @param mode - The game mode to determine which metrics to calculate.
 * @param leaderboard - Final leaderboard data from the Podium task.
 * @param questionResultTasks - Tasks containing player answers and correctness for each question.
 * @param playerParticipants - All participants in the game with type PLAYER.
 * @returns An array of PlayerMetric objects containing stats for each player.
 */
function buildPlayerMetrics(
  mode: GameMode,
  leaderboard: LeaderboardTaskItem[],
  questionResultTasks: QuestionResultTaskWithBase[],
  playerParticipants: ParticipantPlayerWithBase[],
): PlayerMetric[] {
  return playerParticipants
    .map((participantPlayer) => {
      const { position: rank = 0, score = 0 } =
        leaderboard.find(
          ({ playerId }) => playerId === participantPlayer.participantId,
        ) || {}
      const metric = questionResultTasks.reduce(
        (accumulator, { results }) => {
          const { correct, answer, streak, lastScore } = results?.find(
            ({ playerId }) => playerId === participantPlayer.participantId,
          ) || { correct: false, answer: undefined, streak: 0, lastScore: 0 }
          return {
            ...accumulator,
            correct: calculateCorrectCount(mode, accumulator, correct, answer),
            incorrect: calculateIncorrectCount(
              mode,
              accumulator,
              correct,
              answer,
            ),
            averagePrecision: calculateAveragePrecision(
              mode,
              accumulator,
              lastScore,
            ),
            unanswered: accumulator.unanswered + (answer ? 0 : 1),
            ...(mode === GameMode.Classic
              ? {
                  longestCorrectStreak:
                    streak > (accumulator.longestCorrectStreak ?? 0)
                      ? streak
                      : (accumulator.longestCorrectStreak ?? 0),
                }
              : {}),
          }
        },
        {
          participantId: participantPlayer.participantId,
          nickname: participantPlayer.nickname,
          rank,
          comebackRankGain: Math.max(0, participantPlayer.worstRank - rank),
          correct: mode === GameMode.Classic ? 0 : undefined,
          incorrect: mode === GameMode.Classic ? 0 : undefined,
          averagePrecision: mode === GameMode.ZeroToOneHundred ? 0 : undefined,
          unanswered: 0,
          averageResponseTime: calculateAverageResponseTimeByPlayer(
            participantPlayer.totalResponseTime,
            participantPlayer.responseCount,
          ),
          longestCorrectStreak: mode === GameMode.Classic ? 0 : undefined,
          score,
        },
      )

      const { longestCorrectStreak, ...metricWithoutStreak } = metric

      return {
        ...metricWithoutStreak,
        ...(mode === GameMode.Classic
          ? { longestCorrectStreak: longestCorrectStreak ?? 0 }
          : {}),
      }
    })
    .map((metric) => ({
      ...metric,
      averagePrecision: normalizeAveragePrecision(
        mode,
        metric,
        questionResultTasks.length,
      ),
    }))
    .sort((lhs, rhs) => lhs.rank - rhs.rank)
}

/**
 * Builds question-specific metrics (e.g., correct/incorrect counts, average response time) for the final GameResult.
 *
 * @param mode - The game mode to determine which metrics to calculate.
 * @param questions - The list of all questions in the game.
 * @param questionResultTasks - Tasks containing answers and results for each question.
 * @param questionTasks - Tasks that define when each question was presented.
 * @param playerParticipants - All participants in the game with type PLAYER.
 * @returns An array of QuestionMetric objects representing question performance.
 */
function buildQuestionMetrics(
  mode: GameMode,
  questions: QuestionDao[],
  questionResultTasks: QuestionResultTaskWithBase[],
  questionTasks: QuestionTaskWithBase[],
  playerParticipants: ParticipantPlayerWithBase[],
): QuestionMetric[] {
  return questionResultTasks
    .map(({ results, questionIndex }) => {
      const { text, type } = questions[questionIndex]
      return results.reduce(
        (accumulator, { correct, answer, lastScore }) => ({
          ...accumulator,
          correct: calculateCorrectCount(mode, accumulator, correct, answer),
          incorrect: calculateIncorrectCount(
            mode,
            accumulator,
            correct,
            answer,
          ),
          averagePrecision: calculateAveragePrecision(
            mode,
            accumulator,
            lastScore,
          ),
          unanswered:
            accumulator.unanswered + (typeof answer === 'undefined' ? 1 : 0),
        }),
        {
          text,
          type,
          correct: mode === GameMode.Classic ? 0 : undefined,
          incorrect: mode === GameMode.Classic ? 0 : undefined,
          averagePrecision: mode === GameMode.ZeroToOneHundred ? 0 : undefined,
          unanswered: 0,
          averageResponseTime: questionTasks[questionIndex]
            ? calculateAverageResponseTimeByQuestion(
                questionTasks[questionIndex],
                questions,
                playerParticipants,
              )
            : 0,
        },
      )
    })
    .map((metric) => ({
      ...metric,
      averagePrecision: normalizeAveragePrecision(
        mode,
        metric,
        playerParticipants.length,
      ),
    }))
}

/**
 * Increments the running correct-answer count for Classic mode.
 *
 * In Classic mode, an answer only counts as correct if:
 * - The result is marked as `correct`, and
 * - The player actually submitted an `answer` (i.e., not unanswered).
 *
 * In ZeroToOneHundred mode, this metric is not tracked and `undefined` is returned.
 *
 * @param mode - The current game mode.
 * @param accumulator - The partially built metric object containing the current correct count.
 * @param correct - Whether the submitted answer was correct for the question.
 * @param answer - The player's submitted answer payload; `undefined` indicates unanswered.
 * @returns The updated correct count for Classic mode, otherwise `undefined`.
 */
function calculateCorrectCount(
  mode: GameMode,
  accumulator: { correct?: number },
  correct: boolean,
  answer?: QuestionTaskAnswer | undefined,
): number | undefined {
  if (mode === GameMode.Classic && isDefined(accumulator.correct)) {
    return accumulator.correct + (correct && answer ? 1 : 0)
  }
  return undefined
}

/**
 * Increments the running incorrect-answer count for Classic mode.
 *
 * In Classic mode, an answer only counts as incorrect if:
 * - The result is marked as not `correct`, and
 * - The player actually submitted an `answer` (i.e., not unanswered).
 *
 * In ZeroToOneHundred mode, this metric is not tracked and `undefined` is returned.
 *
 * @param mode - The current game mode.
 * @param accumulator - The partially built metric object containing the current incorrect count.
 * @param correct - Whether the submitted answer was correct for the question.
 * @param answer - The player's submitted answer payload; `undefined` indicates unanswered.
 * @returns The updated incorrect count for Classic mode, otherwise `undefined`.
 */
function calculateIncorrectCount(
  mode: GameMode,
  accumulator: { incorrect?: number },
  correct: boolean,
  answer?: QuestionTaskAnswer | undefined,
): number | undefined {
  if (mode === GameMode.Classic && isDefined(accumulator.incorrect)) {
    return accumulator.incorrect + (!correct && answer ? 1 : 0)
  }
  return undefined
}

/**
 * Accumulates the raw precision total for ZeroToOneHundred mode.
 *
 * In ZeroToOneHundred mode, each answered question contributes a precision value based on `lastScore`,
 * where 100 is perfect and 0 is worst:
 * - Precision contribution is `(100 - max(lastScore, 0)) / 100`.
 *
 * This function is designed to be used inside a `reduce` to build a running total. The final average
 * is computed by dividing by the number of items (players or questions) in `calculateAveragePrecisionFinal`.
 *
 * In Classic mode, this metric is not tracked and `undefined` is returned.
 *
 * @param mode - The current game mode.
 * @param accumulator - The partially built metric object containing the running precision total.
 * @param lastScore - The last scored value for the answer (0..100 typical); negative values are clamped to 0.
 * @returns The updated running precision total for ZeroToOneHundred mode, otherwise `undefined`.
 */
function calculateAveragePrecision(
  mode: GameMode,
  accumulator: { averagePrecision?: number },
  lastScore: number,
) {
  if (
    mode === GameMode.ZeroToOneHundred &&
    isDefined(accumulator.averagePrecision)
  ) {
    return accumulator.averagePrecision + (100 - Math.max(lastScore, 0)) / 100
  }
  return undefined
}

/**
 * Converts the accumulated ZeroToOneHundred precision total into a final average.
 *
 * The accumulator built by `calculateAveragePrecision` represents a running total. This function:
 * - Divides that total by `length` (number of players or number of answers aggregated),
 * - Rounds to 2 decimals,
 * - Returns `0` when no precision was accumulated.
 *
 * In Classic mode, this metric is not tracked and `undefined` is returned.
 *
 * @param mode - The current game mode.
 * @param metric - The metric object containing the accumulated `averagePrecision` total.
 * @param length - The divisor used to compute the average (e.g., number of players or number of questions).
 * @returns The final average precision (0..1) rounded to 2 decimals for ZeroToOneHundred mode, otherwise `undefined`.
 */
function normalizeAveragePrecision(
  mode: GameMode,
  metric: { averagePrecision?: number },
  length: number,
): number | undefined {
  if (mode === GameMode.ZeroToOneHundred) {
    if (metric.averagePrecision) {
      return Number((metric.averagePrecision / length).toFixed(2))
    }
    return 0
  }
  return undefined
}

/**
 * Calculates a player’s average response time, in seconds, across all counted questions.
 *
 * @param totalResponseTime - The cumulative response time, in seconds, across all counted questions (including timeouts).
 * @param responseCount - The number of questions included in `totalResponseTime` (answered or timed out).
 * @returns The average response time in seconds, or `0` when `responseCount` is `0`.
 */
function calculateAverageResponseTimeByPlayer(
  totalResponseTime: number,
  responseCount: number,
): number {
  if (responseCount <= 0) {
    return 0
  }

  return Math.floor(totalResponseTime / responseCount)
}

/**
 * Calculates the average response time for a specific question across all players.
 * For players who did not answer, the question's full duration is used as their response time.
 *
 * @param questionTask - The task representing when the question was shown and who answered it.
 * @param questions - The list of all questions in the game.
 * @param playerParticipants - All participants in the game with type PLAYER.
 * @returns The average response time in milliseconds for the given question.
 */
function calculateAverageResponseTimeByQuestion(
  questionTask: QuestionTaskWithBase,
  questions: QuestionDao[],
  playerParticipants: ParticipantPlayerWithBase[],
): number {
  const { presented, answers, questionIndex } = questionTask

  if (!presented) {
    throw new Error('Missing presented time')
  }

  const totalAnsweredResponseTime = answers.reduce(
    (accumulator, { created }) =>
      accumulator + (created.getTime() - presented.getTime()),
    0,
  )

  const totalUnanswered = playerParticipants.length - answers.length
  const totalUnansweredResponseTime =
    totalUnanswered * questions[questionIndex].duration * 1000

  return answers.length + totalUnanswered
    ? Math.floor(
        (totalAnsweredResponseTime + totalUnansweredResponseTime) /
          (answers.length + totalUnanswered),
      )
    : 0
}

/**
 * Filters the list of tasks by the given task type and returns them cast to the appropriate subtype.
 *
 * @param tasks - The full list of previous game tasks.
 * @param type - The specific TaskType to filter by.
 * @returns An array of tasks of the given type, cast to type T.
 */
function getTasksOfType<T>(tasks: BaseTask[], type: TaskType): T[] {
  return tasks.filter((t) => t.type === type).map((t) => t as T)
}
