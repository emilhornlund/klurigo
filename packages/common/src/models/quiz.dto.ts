import { GameMode } from './game-mode.enum'
import { LanguageCode } from './language-code.enum'
import {
  QuestionMultiChoiceDto,
  QuestionPinDto,
  QuestionPuzzleDto,
  QuestionRangeDto,
  QuestionTrueFalseDto,
  QuestionTypeAnswerDto,
  QuestionZeroToOneHundredRangeDto,
} from './question.dto'

/**
 * Quiz visibility
 */
export enum QuizVisibility {
  Public = 'PUBLIC',
  Private = 'PRIVATE',
}

/**
 * Quiz Category
 */
export enum QuizCategory {
  GeneralKnowledge = 'GENERAL_KNOWLEDGE',
  Science = 'SCIENCE',
  History = 'HISTORY',
  Geography = 'GEOGRAPHY',
  Entertainment = 'ENTERTAINMENT',
  Sports = 'SPORTS',
  Literature = 'LITERATURE',
  Technology = 'TECHNOLOGY',
  Art = 'ART',
  Music = 'MUSIC',
  Film = 'FILM',
  FoodAndDrink = 'FOOD_AND_DRINK',
  Politics = 'POLITICS',
  Mythology = 'MYTHOLOGY',
  Nature = 'NATURE',
  Business = 'BUSINESS',
  Health = 'HEALTH',
  Religion = 'RELIGION',
  Space = 'SPACE',
  Mathematics = 'MATHEMATICS',
  Other = 'OTHER',
}

/**
 * Base data transfer object for quiz creation and updating requests.
 */
export type QuizRequestBaseDto = {
  /**
   * The title of the quiz.
   */
  title: string

  /**
   * A description of the quiz.
   */
  description?: string

  /**
   * Whether the quiz's visibility is public or private.
   */
  visibility: QuizVisibility

  /**
   * description here.
   */
  category: QuizCategory

  /**
   * The URL of the cover image for the quiz.
   */
  imageCoverURL?: string

  /**
   * The language code of the quiz.
   */
  languageCode: LanguageCode
}

/**
 * Data transfer object for quiz creation and updating requests.
 */
export type QuizRequestDto = QuizRequestBaseDto &
  (
    | {
        mode: GameMode.Classic
        questions: (
          | QuestionMultiChoiceDto
          | QuestionRangeDto
          | QuestionTrueFalseDto
          | QuestionTypeAnswerDto
          | QuestionPinDto
          | QuestionPuzzleDto
        )[]
      }
    | {
        mode: GameMode.ZeroToOneHundred
        questions: QuestionZeroToOneHundredRangeDto[]
      }
  )

/**
 * Data transfer object for a classic mode quiz creation and updating requests.
 */
export type QuizClassicModeRequestDto = Extract<
  QuizRequestDto,
  { mode: GameMode.Classic }
>

/**
 * Data transfer object for a zero to one hundred mode quiz creation and updating requests.
 */
export type QuizZeroToOneHundredModeRequestDto = Extract<
  QuizRequestDto,
  { mode: GameMode.ZeroToOneHundred }
>

/**
 * Represents the response object for a quiz author.
 */
export interface QuizAuthorResponseDto {
  /**
   * The unique identifier of the author.
   */
  id: string

  /**
   * The name of the author.
   */
  name: string
}

/**
 * Aggregated gameplay statistics for a quiz across all completed games.
 *
 * The backend maintains these aggregates when games are completed to avoid
 * expensive re-aggregation on read.
 */
export type QuizGameplaySummaryDto = {
  /**
   * Number of completed games played using this quiz.
   */
  readonly count: number

  /**
   * Sum of player counts across all completed games for this quiz.
   */
  readonly totalPlayerCount: number

  /**
   * Optional difficulty estimate derived from gameplay statistics.
   *
   * Scale:
   * - 0 = very easy
   * - 1 = very difficult
   */
  readonly difficultyPercentage?: number

  /**
   * Timestamp of the most recently completed game using this quiz.
   *
   * Undefined when the quiz has not yet been played.
   */
  readonly lastPlayed?: Date
}

/**
 * DTO representing aggregated rating information for a quiz.
 *
 * Contains the current average star rating and the total number of comments submitted.
 */
export type QuizRatingSummaryDto = {
  /**
   * The average star rating for the quiz.
   *
   * Value is between 1 and 5 (inclusive) when at least one rating exists.
   *
   * @example 4.6
   */
  readonly stars: number

  /**
   * The total number of ratings that include a comment.
   *
   * @example 12
   */
  readonly comments: number

  /**
   * The total number of submitted ratings for the quiz.
   *
   * Includes both ratings with and without comments.
   *
   * @example 42
   */
  readonly total: number
}

/**
 * Data transfer object for quiz responses.
 */
export interface QuizResponseDto {
  /**
   * The unique identifier of the quiz.
   */
  id: string

  /**
   * The title of the quiz.
   */
  title: string

  /**
   * A description of the quiz.
   */
  description?: string

  /**
   * The game mode of the quiz.
   */
  mode: GameMode

  /**
   * Whether the quiz's visibility is public or private.
   */
  visibility: QuizVisibility

  /**
   * description here.
   */
  category: QuizCategory

  /**
   * The URL of the cover image for the quiz.
   */
  imageCoverURL?: string

  /**
   * The language code of the quiz.
   */
  languageCode: LanguageCode

  /**
   * The total number of questions in the quiz.
   */
  numberOfQuestions: number

  /**
   * The author of the quiz.
   */
  author: QuizAuthorResponseDto

  /**
   * Aggregated gameplay statistics for the quiz.
   */
  readonly gameplaySummary: QuizGameplaySummaryDto

  /**
   * Aggregated rating information for the quiz.
   *
   * Includes the average star rating and the total number of comments.
   */
  readonly ratingSummary: QuizRatingSummaryDto

  /**
   * The date and time when the quiz was created.
   */
  created: Date

  /**
   * The date and time when the quiz was last updated.
   */
  updated: Date
}

/**
 * Represents a paginated response for quizzes.
 */
export interface PaginatedQuizResponseDto {
  /**
   * The list of quiz results for the current page.
   */
  results: QuizResponseDto[]

  /**
   * The total number of quizzes available.
   */
  total: number

  /**
   * The maximum number of quizzes returned per page.
   */
  limit: number

  /**
   * The offset from the start of the total quizzes.
   */
  offset: number
}

/**
 * Represents the pagination and sorting filters for a user's public quizzes page.
 */
export interface UserQuizzesPageFilterDto {
  /**
   * The field by which to sort the results.
   *
   * @default 'title'
   */
  readonly sort?: 'title' | 'created' | 'updated'

  /**
   * The sort order for the results.
   *
   * @default 'asc'
   */
  readonly order?: 'asc' | 'desc'

  /**
   * The maximum number of quizzes returned per page.
   */
  readonly limit: number

  /**
   * The number of quizzes skipped before the current page.
   */
  readonly offset: number
}
