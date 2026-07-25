import { MediaType } from './media-type.enum'
import { QuestionImageRevealEffectType } from './question-image-reveal-effect-type.enum'
import { QuestionPinTolerance } from './question-pin-tolerance.enum'
import { QuestionRangeAnswerMargin } from './question-range-answer-margin.enum'
import { QuestionType } from './question-type.enum'

/**
 * Base DTO representing shared properties for question media.
 *
 * Applies to all media types (image, audio, video).
 */
export type QuestionCommonMediaDto = {
  /**
   * The type of media (e.g., image, audio, video).
   */
  type: MediaType

  /**
   * The URL of the media.
   */
  url: string
}

/**
 * DTO representing image-based question media.
 */
export type QuestionImageMediaDto = QuestionCommonMediaDto & {
  /**
   * The type of media, always `MediaType.Image`.
   */
  type: MediaType.Image

  /**
   * Optional visual reveal effect applied to the image.
   */
  effect?: QuestionImageRevealEffectType
}

/**
 * DTO representing audio-based question media.
 */
export type QuestionAudioMediaDto = QuestionCommonMediaDto & {
  /**
   * The type of media, always `MediaType.Audio`.
   */
  type: MediaType.Audio
}

/**
 * DTO representing video-based question media.
 */
export type QuestionVideoMediaDto = QuestionCommonMediaDto & {
  /**
   * The type of media, always `MediaType.Video`.
   */
  type: MediaType.Video
}

/**
 * Union type representing all supported media types
 * that can be associated with a question.
 */
export type QuestionMediaDto =
  QuestionImageMediaDto | QuestionAudioMediaDto | QuestionVideoMediaDto

/**
 * Common properties shared across all question types.
 */
export interface QuestionCommonDto {
  /**
   * The text of the question.
   */
  question: string

  /**
   * Optional media associated with the question (e.g., image or video).
   */
  media?: QuestionMediaDto

  /**
   * The number of points awarded for correctly answering the question.
   */
  points: number

  /**
   * The duration in seconds allowed for answering the question.
   */
  duration: number

  /**
   * Optional info text shown together with the question’s result/review.
   * Use it for explanations, fun facts, or sources related to the question.
   * Length: 1–256 characters; allowed: letters, numbers, punctuation, and spaces.
   */
  info?: string
}

/**
 * Represents an option for multiple-choice or type-answer questions.
 */
export interface QuestionMultiChoiceOptionDto {
  /**
   * The value or text of the option.
   */
  value: string

  /**
   * Indicates whether the option is correct.
   */
  correct: boolean
}

/**
 * Represents a multiple-choice question.
 */
export interface QuestionMultiChoiceDto extends QuestionCommonDto {
  /**
   * The type of the question, set to `MultiChoice`.
   */
  type: QuestionType.MultiChoice

  /**
   * The list of options for the question.
   */
  options: QuestionMultiChoiceOptionDto[]
}

/**
 * Represents a range-based question where the answer lies within a range.
 */
export interface QuestionRangeDto extends QuestionCommonDto {
  /**
   * The type of the question, set to `Range`.
   */
  type: QuestionType.Range

  /**
   * The minimum value of the range.
   */
  min: number

  /**
   * The maximum value of the range.
   */
  max: number

  /**
   * The margin of error allowed for the answer.
   */
  margin: QuestionRangeAnswerMargin

  /**
   * The correct answer value.
   */
  correct: number
}

/**
 * Represents a range-based question where the answer lies within 0 to 100.
 */
export type QuestionZeroToOneHundredRangeDto = Omit<
  QuestionRangeDto,
  'min' | 'max' | 'points' | 'margin'
>

/**
 * Represents a true-or-false question.
 */
export interface QuestionTrueFalseDto extends QuestionCommonDto {
  /**
   * The type of the question, set to `TrueFalse`.
   */
  type: QuestionType.TrueFalse

  /**
   * The correct answer for the question (true or false).
   */
  correct: boolean
}

/**
 * Represents a question where the user types an answer.
 */
export interface QuestionTypeAnswerDto extends QuestionCommonDto {
  /**
   * The type of the question, set to `TypeAnswer`.
   */
  type: QuestionType.TypeAnswer

  /**
   * The list of acceptable answers for the question.
   */
  options: string[]
}

/**
 * Describes a “Pin” question where players place a single marker on an image.
 * The correct location is defined by normalized coordinates and a tolerance preset.
 */
export interface QuestionPinDto extends Omit<QuestionCommonDto, 'media'> {
  /**
   * The type of the question, set to `Pin`.
   */
  readonly type: QuestionType.Pin

  /**
   * Public URL of the background image on which the player places the pin.
   * Must be reachable over HTTP(S).
   */
  readonly imageURL: string

  /**
   * Correct X coordinate for the pin, normalized to the image width.
   * Range: 0 (left) … 1 (right).
   */
  readonly positionX: number

  /**
   * Correct Y coordinate for the pin, normalized to the image height.
   * Range: 0 (top) … 1 (bottom).
   */
  readonly positionY: number

  /**
   * Allowed distance preset around the correct spot that counts as correct.
   * Higher tolerance values accept pins farther from the exact position.
   */
  readonly tolerance: QuestionPinTolerance
}

/**
 * Describes a “Puzzle” question where players sort a small list of values
 * into the correct order.
 */
export interface QuestionPuzzleDto extends QuestionCommonDto {
  /**
   * The type of the question, set to `Puzzle`.
   */
  readonly type: QuestionType.Puzzle

  /**
   * Values to be ordered by the player. Client submits an ordered array as the answer.
   * Length constraints and character rules are enforced elsewhere via constants.
   */
  readonly values: string[]
}

/**
 * Represents any question type supported in the system.
 */
export type QuestionDto =
  | QuestionMultiChoiceDto
  | QuestionRangeDto
  | QuestionTrueFalseDto
  | QuestionTypeAnswerDto
  | QuestionPinDto
  | QuestionPuzzleDto
  | QuestionZeroToOneHundredRangeDto

/**
 * Represents any classic mode question type supported in the system.
 *
 * Used where a single type is needed for Classic-mode question validation,
 * parsing, and discriminated rule selection.
 */
export type ClassicQuestionDto =
  | QuestionMultiChoiceDto
  | QuestionRangeDto
  | QuestionTrueFalseDto
  | QuestionTypeAnswerDto
  | QuestionPinDto
  | QuestionPuzzleDto

/**
 * Represents any zero to one hundred mode question type supported in the system.
 *
 * Used where a single type is needed for ZeroToOneHundred-mode question validation,
 * parsing, and discriminated rule selection.
 */
export type ZeroToOneHundredQuestionDto = QuestionZeroToOneHundredRangeDto

/**
 * Represents the correct answer for a quiz question.
 */
export type QuestionCorrectAnswerDto = {
  type: QuestionType
} & (
  | { type: QuestionType.MultiChoice; index: number }
  | { type: QuestionType.Range; value: number }
  | { type: QuestionType.TrueFalse; value: boolean }
  | { type: QuestionType.TypeAnswer; value: string }
  | { type: QuestionType.Pin; positionX: number; positionY: number }
  | { type: QuestionType.Puzzle; values: string[] }
)

/**
 * Data transfer object for a multi-choice correct answer.
 */
export type MultiChoiceQuestionCorrectAnswerDto = Extract<
  QuestionCorrectAnswerDto,
  { type: QuestionType.MultiChoice }
>

/**
 * Data transfer object for a range correct answer.
 */
export type RangeQuestionCorrectAnswerDto = Extract<
  QuestionCorrectAnswerDto,
  { type: QuestionType.Range }
>

/**
 * Data transfer object for a true-false correct answer.
 */
export type TrueFalseQuestionCorrectAnswerDto = Extract<
  QuestionCorrectAnswerDto,
  { type: QuestionType.TrueFalse }
>

/**
 * Data transfer object for a type-answer correct answer.
 */
export type TypeAnswerQuestionCorrectAnswerDto = Extract<
  QuestionCorrectAnswerDto,
  { type: QuestionType.TypeAnswer }
>

/**
 * Data transfer object for a pin correct answer.
 *
 * Contains the normalized X/Y coordinates of the correct location.
 */
export type PinQuestionCorrectAnswerDto = Extract<
  QuestionCorrectAnswerDto,
  { type: QuestionType.Pin }
>

/**
 * Data transfer object for a puzzle correct answer.
 *
 * Contains the target ordering of the values.
 */
export type PuzzleQuestionCorrectAnswerDto = Extract<
  QuestionCorrectAnswerDto,
  { type: QuestionType.Puzzle }
>
