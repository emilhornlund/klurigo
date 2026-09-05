import { GameMode } from './game-mode.enum'
import { QuestionType } from './question-type.enum'

/**
 * Describes the quiz metadata included in a game result response.
 *
 * This payload is intentionally minimal and includes only what is required to:
 * - identify the quiz, and
 * - determine whether the caller can create a new live game based on that quiz.
 */
export type GameResultQuizDto = {
  /**
   * The unique identifier of the quiz associated with the completed game.
   */
  readonly id: string

  /**
   * Indicates whether the caller is allowed to submit a rating for this quiz.
   *
   * This flag is evaluated in the context of the requesting participant and is typically `false`
   * for the quiz owner (owners cannot rate their own quizzes).
   */
  readonly canRateQuiz: boolean

  /**
   * Indicates whether the caller can host a new live game based on this quiz.
   *
   * This is typically `true` when:
   * - the caller is the quiz owner, or
   * - the quiz is publicly visible.
   */
  readonly canHostLiveGame: boolean
}

/**
 * Represents a participant's rating for the quiz used in the completed game.
 *
 * Included when the requesting participant has submitted a rating for the quiz.
 */
export type GameResultRatingDto = {
  /**
   * The star rating value for the quiz (1–5).
   */
  readonly stars: number

  /**
   * Optional free-text feedback about the quiz.
   */
  readonly comment?: string
}

/**
 * Represents the final results of a completed quiz game.
 *
 * This object includes metadata about the game session as well as detailed
 * performance metrics for each player and question, based on the game mode.
 */
export type GameResultDto = {
  /**
   * The unique identifier for the game.
   */
  readonly id: string

  /**
   * The name or title of the quiz.
   */
  readonly name: string

  /**
   * The quiz associated with the completed game.
   *
   * Contains the quiz identifier and information about whether the caller can
   * create a new live game based on the quiz.
   */
  readonly quiz: GameResultQuizDto

  /**
   * The participant who created and hosted the game.
   */
  readonly host: GameResultParticipantDto

  /**
   * Total number of players who participated in the game (excludes the host).
   * Matches the length of `playerMetrics`.
   */
  readonly numberOfPlayers: number

  /**
   * Total number of questions included in this game session.
   */
  readonly numberOfQuestions: number

  /**
   * The duration in seconds the game session was active.
   */
  readonly duration: number

  /**
   * The participant's rating for the quiz, if the participant has rated it.
   */
  readonly rating?: GameResultRatingDto

  /**
   * The date and time when the game session was created.
   */
  readonly created: Date
} & (
  | {
      /**
       * The classic game mode of the quiz.
       */
      readonly mode: GameMode.Classic

      /**
       * A list of players and their final performance metrics for a classic mode game.
       */
      readonly playerMetrics: GameResultClassicModePlayerMetricDto[]

      /**
       * A list of questions and their aggregated response metrics for a classic mode game.
       */
      readonly questionMetrics: GameResultClassicModeQuestionMetricDto[]
    }
  | {
      /**
       * The zero to one hundred game mode of the quiz.
       */
      readonly mode: GameMode.ZeroToOneHundred

      /**
       * A list of players and their final performance metrics for a zero to one hundred mode game.
       */
      readonly playerMetrics: GameResultZeroToOneHundredModePlayerMetricDto[]

      /**
       * A list of questions and their aggregated response metrics for a zero to one hundred mode game.
       */
      readonly questionMetrics: GameResultZeroToOneHundredModeQuestionMetricDto[]
    }
)

/**
 * Data transfer object for a classic mode game result.
 */
export type GameResultClassicModeDto = Extract<
  GameResultDto,
  { mode: GameMode.Classic }
>

/**
 * Data transfer object for a zero to one hundred mode game result.
 */
export type GameResultZeroToOneHundredModeDto = Extract<
  GameResultDto,
  { mode: GameMode.ZeroToOneHundred }
>

/**
 * Represents a participant in a game, such as the host or a player.
 */
export interface GameResultParticipantDto {
  /**
   * The unique identifier of the participant.
   */
  readonly id: string

  /**
   * The nickname of the participant.
   */
  readonly nickname: string
}

/**
 * Represents the final performance metrics shared by all players.
 *
 * Streak metrics are intentionally not part of this base contract because
 * ZeroToOneHundred does not support them.
 */
export interface GameResultPlayerMetricDto {
  /**
   * The player who participated in the game.
   */
  readonly player: GameResultParticipantDto

  /**
   * The player's final rank in the game (1 = first place, etc.).
   */
  readonly rank: number

  /**
   * The net number of positions the player recovered by the end of the game,
   * calculated as the difference between the worst rank reached during the game
   * and the final rank.
   *
   * This value is never negative.
   */
  readonly comebackRankGain: number

  /**
   * The total number of questions the player left unanswered.
   */
  readonly unanswered: number

  /**
   * The average time (in milliseconds) the player took to answer questions.
   */
  readonly averageResponseTime: number

  /**
   * The player's total score at the end of the game.
   */
  readonly score: number
}

/**
 * Represents a player's final performance metrics in the game for a classic mode game.
 */
export interface GameResultClassicModePlayerMetricDto extends GameResultPlayerMetricDto {
  /**
   * The total number of questions the player answered correctly.
   */
  readonly correct: number

  /**
   * The total number of questions the player answered incorrectly.
   */
  readonly incorrect: number

  /**
   * The longest streak of consecutive correct answers by the player.
   * This metric is available only in Classic mode.
   */
  readonly longestCorrectStreak: number
}

/**
 * Represents a player's final performance metrics in the game for a zero to one hundred mode game.
 */
export interface GameResultZeroToOneHundredModePlayerMetricDto extends GameResultPlayerMetricDto {
  /**
   * The player's average precision for range-based answers (0 = worst, 1 = best).
   */
  readonly averagePrecision: number
}

/**
 * Represents the aggregated performance metrics for a single question in the game.
 */
export interface GameResultQuestionMetricDto {
  /**
   * The text of the question.
   */
  readonly text: string

  /**
   * The type of the question (e.g., multiple choice, range, true/false).
   */
  readonly type: QuestionType

  /**
   * The number of players who left the question unanswered.
   */
  readonly unanswered: number

  /**
   * The average time (in milliseconds) that players took to answer the question.
   */
  readonly averageResponseTime: number
}

/**
 * Represents the aggregated performance metrics for a single question in a classic mode game.
 */
export interface GameResultClassicModeQuestionMetricDto extends GameResultQuestionMetricDto {
  /**
   * The number of players who answered the question correctly.
   */
  readonly correct: number

  /**
   * The number of players who answered the question incorrectly.
   */
  readonly incorrect: number
}

/**
 * Represents the aggregated performance metrics for a single question in a zero to one hundred mode game.
 */
export interface GameResultZeroToOneHundredModeQuestionMetricDto extends GameResultQuestionMetricDto {
  /**
   * The average precision score across all player answers for this question.
   */
  readonly averagePrecision: number
}
