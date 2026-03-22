import { QuestionType } from '@klurigo/common'
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Schema as MongooseSchema } from 'mongoose'

export enum TaskType {
  Lobby = 'LOBBY',
  Question = 'QUESTION',
  QuestionResult = 'QUESTION_RESULT',
  Leaderboard = 'LEADERBOARD',
  Podium = 'PODIUM',
}

/**
 * BaseTask
 */

@Schema({ _id: true, discriminatorKey: 'type' })
export class BaseTask {
  @Prop({ type: String, required: true })
  _id: string

  @Prop({
    type: String,
    enum: Object.keys(TaskType),
    required: true,
  })
  type!:
    | TaskType.Lobby
    | TaskType.Question
    | TaskType.QuestionResult
    | TaskType.Leaderboard
    | TaskType.Podium

  @Prop({ type: String, default: 'pending' })
  status: 'pending' | 'active' | 'completed'

  @Prop({ type: Date, required: false })
  currentTransitionInitiated?: Date

  @Prop({ type: Date, required: false })
  currentTransitionExpires?: Date

  @Prop({ type: Date, default: () => new Date() })
  created: Date
}

export const BaseTaskSchema = SchemaFactory.createForClass(BaseTask)

/**
 * LobbyTask
 */

@Schema({ _id: false })
export class LobbyTask {
  type!: TaskType.Lobby
}

export const LobbyTaskSchema = SchemaFactory.createForClass(LobbyTask)

/**
 * Narrowed type representing a Lobby task with base task fields.
 *
 * Combines the common BaseTask properties with LobbyTask-specific fields.
 */
export type LobbyTaskWithBase = BaseTask & LobbyTask

/**
 * QuestionTaskBaseMetadata
 */
@Schema({ _id: false, discriminatorKey: 'type' })
export class QuestionTaskBaseMetadata {
  @Prop({
    type: String,
    enum: [
      QuestionType.MultiChoice,
      QuestionType.Range,
      QuestionType.TrueFalse,
      QuestionType.TypeAnswer,
      QuestionType.Pin,
      QuestionType.Puzzle,
    ],
    required: true,
  })
  type!:
    | QuestionType.MultiChoice
    | QuestionType.Range
    | QuestionType.TrueFalse
    | QuestionType.TypeAnswer
    | QuestionType.Pin
    | QuestionType.Puzzle
}

export const QuestionTaskBaseMetadataSchema = SchemaFactory.createForClass(
  QuestionTaskBaseMetadata,
)

/**
 * QuestionTaskMultiChoiceMetadata
 */
@Schema({ _id: false })
export class QuestionTaskMultiChoiceMetadata {
  type!: QuestionType.MultiChoice
}

export const QuestionTaskMultiChoiceMetadataSchema =
  SchemaFactory.createForClass(QuestionTaskMultiChoiceMetadata)

/**
 * QuestionTaskRangeMetadata
 */
@Schema({ _id: false })
export class QuestionTaskRangeMetadata {
  type!: QuestionType.Range
}

export const QuestionTaskRangeMetadataSchema = SchemaFactory.createForClass(
  QuestionTaskRangeMetadata,
)

/**
 * QuestionTaskTrueFalseMetadata
 */
@Schema({ _id: false })
export class QuestionTaskTrueFalseMetadata {
  type!: QuestionType.TrueFalse
}

export const QuestionTaskTrueFalseMetadataSchema = SchemaFactory.createForClass(
  QuestionTaskTrueFalseMetadata,
)

/**
 * QuestionTaskTypeAnswerMetadata
 */
@Schema({ _id: false })
export class QuestionTaskTypeAnswerMetadata {
  type!: QuestionType.TypeAnswer
}

export const QuestionTaskTypeAnswerMetadataSchema =
  SchemaFactory.createForClass(QuestionTaskTypeAnswerMetadata)

/**
 * QuestionTaskPinMetadata
 */
@Schema({ _id: false })
export class QuestionTaskPinMetadata {
  type!: QuestionType.Pin
}

export const QuestionTaskPinMetadataSchema = SchemaFactory.createForClass(
  QuestionTaskPinMetadata,
)

/**
 * QuestionTaskPuzzleMetadata
 */
@Schema({ _id: false })
export class QuestionTaskPuzzleMetadata {
  type!: QuestionType.Puzzle

  @Prop({ type: [String], required: true })
  randomizedValues: string[]
}

export const QuestionTaskPuzzleMetadataSchema = SchemaFactory.createForClass(
  QuestionTaskPuzzleMetadata,
)

/**
 * Represents question task metadata with its specific discriminator type.
 */
export type QuestionTaskMetadata = QuestionTaskBaseMetadata &
  (
    | QuestionTaskMultiChoiceMetadata
    | QuestionTaskRangeMetadata
    | QuestionTaskTrueFalseMetadata
    | QuestionTaskTypeAnswerMetadata
    | QuestionTaskPinMetadata
    | QuestionTaskPuzzleMetadata
  )

/**
 * QuestionTaskBaseAnswer
 */

@Schema({ _id: false, discriminatorKey: 'type' })
export class QuestionTaskBaseAnswer {
  @Prop({
    type: String,
    enum: [
      QuestionType.MultiChoice,
      QuestionType.Range,
      QuestionType.TrueFalse,
      QuestionType.TypeAnswer,
      QuestionType.Pin,
      QuestionType.Puzzle,
    ],
    required: true,
  })
  type!:
    | QuestionType.MultiChoice
    | QuestionType.Range
    | QuestionType.TrueFalse
    | QuestionType.TypeAnswer
    | QuestionType.Pin
    | QuestionType.Puzzle

  @Prop({ type: String, required: true })
  playerId: string

  @Prop({ type: Date, required: true })
  created: Date
}

export const QuestionTaskBaseAnswerSchema = SchemaFactory.createForClass(
  QuestionTaskBaseAnswer,
)

/**
 * QuestionTaskMultiChoiceAnswer
 */

@Schema({ _id: false })
export class QuestionTaskMultiChoiceAnswer {
  @Prop({ type: Number, required: true })
  answer: number
}

export const QuestionTaskMultiChoiceAnswerSchema = SchemaFactory.createForClass(
  QuestionTaskMultiChoiceAnswer,
)

/**
 * QuestionTaskRangeAnswer
 */

@Schema({ _id: false })
export class QuestionTaskRangeAnswer {
  @Prop({ type: Number, required: true })
  answer: number
}

export const QuestionTaskRangeAnswerSchema = SchemaFactory.createForClass(
  QuestionTaskRangeAnswer,
)

/**
 * QuestionTaskTrueFalseAnswer
 */

@Schema({ _id: false })
export class QuestionTaskTrueFalseAnswer {
  @Prop({ type: Boolean, required: true })
  answer: boolean
}

export const QuestionTaskTrueFalseAnswerSchema = SchemaFactory.createForClass(
  QuestionTaskTrueFalseAnswer,
)

/**
 * QuestionTaskTypeAnswerAnswer
 */

@Schema({ _id: false })
export class QuestionTaskTypeAnswerAnswer {
  @Prop({ type: String, required: true })
  answer: string
}

export const QuestionTaskTypeAnswerAnswerSchema = SchemaFactory.createForClass(
  QuestionTaskTypeAnswerAnswer,
)

/**
 * QuestionTaskPinAnswer
 *
 * The player’s submitted pin location encoded as a normalized CSV string `"x,y"`,
 * where both coordinates are in the range 0..1 relative to the image.
 * Example: `"0.25,0.25"`.
 */
@Schema({ _id: false })
export class QuestionTaskPinAnswer {
  /**
   * Normalized coordinates encoded as `"x,y"`, e.g. `"0.50,0.50"`.
   */
  @Prop({ type: String, required: true })
  answer: string
}

export const QuestionTaskPinAnswerSchema = SchemaFactory.createForClass(
  QuestionTaskPinAnswer,
)

/**
 * QuestionTaskPuzzleAnswer
 *
 * The player’s submitted ordering of the puzzle’s values.
 * Must contain the same set of values as presented in the question.
 */
@Schema({ _id: false })
export class QuestionTaskPuzzleAnswer {
  /**
   * Ordered list representing the player’s final arrangement.
   */
  @Prop({ type: [String], required: true })
  answer: string[]
}

export const QuestionTaskPuzzleAnswerSchema = SchemaFactory.createForClass(
  QuestionTaskPuzzleAnswer,
)

/**
 * Represents a question task answer with its specific discriminator type.
 */
export type QuestionTaskAnswer = QuestionTaskBaseAnswer &
  (
    | QuestionTaskMultiChoiceAnswer
    | QuestionTaskRangeAnswer
    | QuestionTaskTrueFalseAnswer
    | QuestionTaskTypeAnswerAnswer
    | QuestionTaskPinAnswer
    | QuestionTaskPuzzleAnswer
  )

/**
 * QuestionTask
 */

@Schema({ _id: false })
export class QuestionTask {
  type!: TaskType.Question

  @Prop({ type: Number, required: true })
  questionIndex: number

  @Prop({ type: QuestionTaskBaseMetadataSchema, required: true })
  metadata: QuestionTaskMetadata

  @Prop({ type: [QuestionTaskBaseAnswerSchema], required: true })
  answers: QuestionTaskAnswer[]

  @Prop({ type: Date, default: () => new Date() })
  presented?: Date
}

export const QuestionTaskSchema = SchemaFactory.createForClass(QuestionTask)

/**
 * Narrowed type representing a Question task with base task fields.
 *
 * Combines the common BaseTask properties with QuestionTask-specific fields.
 */
export type QuestionTaskWithBase = BaseTask & QuestionTask

const questionTaskMetadataSchema =
  QuestionTaskSchema.path<MongooseSchema.Types.Array>('metadata')
questionTaskMetadataSchema.discriminator(
  QuestionType.MultiChoice,
  QuestionTaskMultiChoiceMetadataSchema,
)
questionTaskMetadataSchema.discriminator(
  QuestionType.Range,
  QuestionTaskRangeMetadataSchema,
)
questionTaskMetadataSchema.discriminator(
  QuestionType.TrueFalse,
  QuestionTaskTrueFalseMetadataSchema,
)
questionTaskMetadataSchema.discriminator(
  QuestionType.TypeAnswer,
  QuestionTaskTypeAnswerMetadataSchema,
)
questionTaskMetadataSchema.discriminator(
  QuestionType.Pin,
  QuestionTaskPinMetadataSchema,
)
questionTaskMetadataSchema.discriminator(
  QuestionType.Puzzle,
  QuestionTaskPuzzleMetadataSchema,
)

const questionTaskAnswerSchema =
  QuestionTaskSchema.path<MongooseSchema.Types.Array>('answers')
questionTaskAnswerSchema.discriminator(
  QuestionType.MultiChoice,
  QuestionTaskMultiChoiceAnswerSchema,
)
questionTaskAnswerSchema.discriminator(
  QuestionType.Range,
  QuestionTaskRangeAnswerSchema,
)
questionTaskAnswerSchema.discriminator(
  QuestionType.TrueFalse,
  QuestionTaskTrueFalseAnswerSchema,
)
questionTaskAnswerSchema.discriminator(
  QuestionType.TypeAnswer,
  QuestionTaskTypeAnswerAnswerSchema,
)
questionTaskAnswerSchema.discriminator(
  QuestionType.Pin,
  QuestionTaskPinAnswerSchema,
)
questionTaskAnswerSchema.discriminator(
  QuestionType.Puzzle,
  QuestionTaskPuzzleAnswerSchema,
)

/**
 * QuestionResultTaskItem
 */

@Schema({ _id: false, discriminatorKey: 'type' })
export class QuestionResultTaskItem {
  @Prop({
    type: String,
    enum: [
      QuestionType.MultiChoice,
      QuestionType.Range,
      QuestionType.TrueFalse,
      QuestionType.TypeAnswer,
      QuestionType.Pin,
      QuestionType.Puzzle,
    ],
    required: true,
  })
  type!:
    | QuestionType.MultiChoice
    | QuestionType.Range
    | QuestionType.TrueFalse
    | QuestionType.TypeAnswer
    | QuestionType.Pin
    | QuestionType.Puzzle

  @Prop({ type: String, required: true })
  playerId: string

  @Prop({ type: String, required: true })
  nickname: string

  @Prop({ type: QuestionTaskBaseAnswerSchema, required: false })
  answer?: QuestionTaskAnswer

  @Prop({ type: Boolean, required: true })
  correct: boolean

  @Prop({ type: Number, required: true })
  lastScore: number

  @Prop({ type: Number, required: true })
  totalScore: number

  @Prop({ type: Number, required: true })
  position: number

  @Prop({ type: Number, required: true })
  streak: number

  /**
   * The player’s response time for this question, in milliseconds. If the player
   * did not submit an answer, this value equals the full question duration.
   */
  @Prop({ type: Number, required: true, default: 0 })
  lastResponseTime: number

  /**
   * The cumulative response time, in milliseconds, across all questions included for this player up to this result.
   *
   * This value is the sum of lastResponseTime over responseCount questions
   */
  @Prop({ type: Number, required: true, default: 0 })
  totalResponseTime: number

  /**
   * The number of questions included in totalResponseTime up to this result (answered or timed out).
   */
  @Prop({ type: Number, required: true, default: 0 })
  responseCount: number
}

export const QuestionResultTaskItemSchema = SchemaFactory.createForClass(
  QuestionResultTaskItem,
)

const questionResultTaskItemSchema =
  QuestionResultTaskItemSchema.path<MongooseSchema.Types.Subdocument>('answer')
questionResultTaskItemSchema.discriminator(
  QuestionType.MultiChoice,
  QuestionTaskMultiChoiceAnswerSchema,
)
questionResultTaskItemSchema.discriminator(
  QuestionType.Range,
  QuestionTaskRangeAnswerSchema,
)
questionResultTaskItemSchema.discriminator(
  QuestionType.TrueFalse,
  QuestionTaskTrueFalseAnswerSchema,
)
questionResultTaskItemSchema.discriminator(
  QuestionType.TypeAnswer,
  QuestionTaskTypeAnswerAnswerSchema,
)
questionResultTaskItemSchema.discriminator(
  QuestionType.Pin,
  QuestionTaskPinAnswerSchema,
)
questionResultTaskItemSchema.discriminator(
  QuestionType.Puzzle,
  QuestionTaskPuzzleAnswerSchema,
)

/**
 * QuestionResultTaskBaseCorrectAnswer
 */

@Schema({ _id: false, discriminatorKey: 'type' })
export class QuestionResultTaskBaseCorrectAnswer {
  @Prop({
    type: String,
    enum: [
      QuestionType.MultiChoice,
      QuestionType.Range,
      QuestionType.TrueFalse,
      QuestionType.TypeAnswer,
      QuestionType.Pin,
      QuestionType.Puzzle,
    ],
    required: true,
  })
  type!:
    | QuestionType.MultiChoice
    | QuestionType.Range
    | QuestionType.TrueFalse
    | QuestionType.TypeAnswer
    | QuestionType.Pin
    | QuestionType.Puzzle
}

export const QuestionResultTaskBaseCorrectAnswerSchema =
  SchemaFactory.createForClass(QuestionResultTaskBaseCorrectAnswer)

/**
 * QuestionResultTaskCorrectMultiChoiceAnswer
 */

@Schema({ _id: false })
export class QuestionResultTaskCorrectMultiChoiceAnswer {
  @Prop({ type: Number, required: true })
  index: number
}

export const QuestionResultTaskCorrectMultiChoiceAnswerSchema =
  SchemaFactory.createForClass(QuestionResultTaskCorrectMultiChoiceAnswer)

/**
 * Narrowed type representing a MultiChoice correct answer with base correct answer fields.
 *
 * Combines the common QuestionResultTaskBaseCorrectAnswer properties with
 * MultiChoice-specific correct answer fields.
 */
export type QuestionResultTaskCorrectMultiChoiceAnswerWithBase =
  QuestionResultTaskBaseCorrectAnswer &
    QuestionResultTaskCorrectMultiChoiceAnswer

/**
 * QuestionResultTaskCorrectRangeAnswer
 */

@Schema({ _id: false })
export class QuestionResultTaskCorrectRangeAnswer {
  @Prop({ type: Number, required: true })
  value: number
}

export const QuestionResultTaskCorrectRangeAnswerSchema =
  SchemaFactory.createForClass(QuestionResultTaskCorrectRangeAnswer)

/**
 * Narrowed type representing a Range correct answer with base correct answer fields.
 *
 * Combines the common QuestionResultTaskBaseCorrectAnswer properties with
 * Range-specific correct answer fields.
 */
export type QuestionResultTaskCorrectRangeAnswerWithBase =
  QuestionResultTaskBaseCorrectAnswer & QuestionResultTaskCorrectRangeAnswer

/**
 * QuestionResultTaskCorrectTrueFalseAnswer
 */

@Schema({ _id: false })
export class QuestionResultTaskCorrectTrueFalseAnswer {
  @Prop({ type: Boolean, required: true })
  value: boolean
}

export const QuestionResultTaskCorrectTrueFalseAnswerSchema =
  SchemaFactory.createForClass(QuestionResultTaskCorrectTrueFalseAnswer)

/**
 * Narrowed type representing a True/False correct answer with base correct answer fields.
 *
 * Combines the common QuestionResultTaskBaseCorrectAnswer properties with
 * True/False-specific correct answer fields.
 */
export type QuestionResultTaskCorrectTrueFalseAnswerWithBase =
  QuestionResultTaskBaseCorrectAnswer & QuestionResultTaskCorrectTrueFalseAnswer

/**
 * QuestionResultTaskCorrectTypeAnswer
 */

@Schema({ _id: false })
export class QuestionResultTaskCorrectTypeAnswer {
  @Prop({ type: String, required: true })
  value: string
}

export const QuestionResultTaskCorrectTypeAnswerSchema =
  SchemaFactory.createForClass(QuestionResultTaskCorrectTypeAnswer)

/**
 * Narrowed type representing a TypeAnswer correct answer with base correct answer fields.
 *
 * Combines the common QuestionResultTaskBaseCorrectAnswer properties with
 * TypeAnswer-specific correct answer fields.
 */
export type QuestionResultTaskCorrectTypeAnswerWithBase =
  QuestionResultTaskBaseCorrectAnswer & QuestionResultTaskCorrectTypeAnswer

/**
 * QuestionResultTaskCorrectPinAnswer
 *
 * The correct normalized coordinates for a pin question.
 */
@Schema({ _id: false })
export class QuestionResultTaskCorrectPinAnswer {
  /**
   * Normalized coordinates encoded as `"x,y"`, e.g. `"0.50,0.50"`.
   */
  @Prop({ type: String, required: true })
  value: string
}

export const QuestionResultTaskCorrectPinAnswerSchema =
  SchemaFactory.createForClass(QuestionResultTaskCorrectPinAnswer)

/**
 * Narrowed type representing a Pin correct answer with base correct answer fields.
 *
 * Combines the common QuestionResultTaskBaseCorrectAnswer properties with
 * Pin-specific correct answer fields.
 */
export type QuestionResultTaskCorrectPinAnswerWithBase =
  QuestionResultTaskBaseCorrectAnswer & QuestionResultTaskCorrectPinAnswer

/**
 * QuestionResultTaskCorrectPuzzleAnswer
 *
 * The target ordering for a puzzle question.
 */
@Schema({ _id: false })
export class QuestionResultTaskCorrectPuzzleAnswer {
  /**
   * Correct sequence of values.
   */
  @Prop({ type: [String], required: true })
  value: string[]
}

export const QuestionResultTaskCorrectPuzzleAnswerSchema =
  SchemaFactory.createForClass(QuestionResultTaskCorrectPuzzleAnswer)

/**
 * Narrowed type representing a Puzzle correct answer with base correct answer fields.
 *
 * Combines the common QuestionResultTaskBaseCorrectAnswer properties with
 * Puzzle-specific correct answer fields.
 */
export type QuestionResultTaskCorrectPuzzleAnswerWithBase =
  QuestionResultTaskBaseCorrectAnswer & QuestionResultTaskCorrectPuzzleAnswer

/**
 * Represents a question result task correct answer with its specific discriminator type.
 */
export type QuestionResultTaskCorrectAnswer =
  QuestionResultTaskBaseCorrectAnswer &
    (
      | QuestionResultTaskCorrectMultiChoiceAnswer
      | QuestionResultTaskCorrectRangeAnswer
      | QuestionResultTaskCorrectTrueFalseAnswer
      | QuestionResultTaskCorrectTypeAnswer
      | QuestionResultTaskCorrectPinAnswer
      | QuestionResultTaskCorrectPuzzleAnswer
    )

/**
 * QuestionResultTask
 */

@Schema({ _id: false })
export class QuestionResultTask {
  type!: TaskType.QuestionResult

  @Prop({ type: Number, required: true })
  questionIndex: number

  @Prop({
    type: [QuestionResultTaskBaseCorrectAnswerSchema],
    required: true,
  })
  correctAnswers: QuestionResultTaskCorrectAnswer[]

  @Prop({ type: [QuestionResultTaskItemSchema], required: true })
  results: QuestionResultTaskItem[]
}

export const QuestionResultTaskSchema =
  SchemaFactory.createForClass(QuestionResultTask)

const questionResultTaskSchema =
  QuestionResultTaskSchema.path<MongooseSchema.Types.Array>('correctAnswers')
questionResultTaskSchema.discriminator(
  QuestionType.MultiChoice,
  QuestionResultTaskCorrectMultiChoiceAnswerSchema,
)
questionResultTaskSchema.discriminator(
  QuestionType.Range,
  QuestionResultTaskCorrectRangeAnswerSchema,
)
questionResultTaskSchema.discriminator(
  QuestionType.TrueFalse,
  QuestionResultTaskCorrectTrueFalseAnswerSchema,
)
questionResultTaskSchema.discriminator(
  QuestionType.TypeAnswer,
  QuestionResultTaskCorrectTypeAnswerSchema,
)
questionResultTaskSchema.discriminator(
  QuestionType.Pin,
  QuestionResultTaskCorrectPinAnswerSchema,
)
questionResultTaskSchema.discriminator(
  QuestionType.Puzzle,
  QuestionResultTaskCorrectPuzzleAnswerSchema,
)

/**
 * Narrowed type representing a QuestionResult task with base task fields.
 *
 * Combines the common BaseTask properties with QuestionResultTask-specific fields.
 */
export type QuestionResultTaskWithBase = BaseTask & QuestionResultTask

/**
 * LeaderboardTaskItem
 */

@Schema({ _id: false })
export class LeaderboardTaskItem {
  @Prop({ type: String, required: true })
  playerId: string

  @Prop({ type: Number, required: true })
  position: number

  @Prop({ type: Number, required: false })
  previousPosition?: number

  @Prop({ type: String, required: true })
  nickname: string

  @Prop({ type: Number, required: true })
  score: number

  @Prop({ type: Number, required: true })
  streaks: number
}

export const LeaderboardTaskItemSchema =
  SchemaFactory.createForClass(LeaderboardTaskItem)

/**
 * LeaderboardTask
 */

@Schema({ _id: false })
export class LeaderboardTask {
  type!: TaskType.Leaderboard

  @Prop({ type: Number, required: true })
  questionIndex: number

  @Prop({ type: [LeaderboardTaskItemSchema], required: true })
  leaderboard: LeaderboardTaskItem[]
}

export const LeaderboardTaskSchema =
  SchemaFactory.createForClass(LeaderboardTask)

/**
 * Narrowed type representing a Leaderboard task with base task fields.
 *
 * Combines the common BaseTask properties with LeaderboardTask-specific fields.
 */
export type LeaderboardTaskWithBase = BaseTask & LeaderboardTask

/**
 * PodiumTask
 */

@Schema({ _id: false })
export class PodiumTask {
  type!: TaskType.Podium

  @Prop({ type: [LeaderboardTaskItemSchema], required: true })
  leaderboard: LeaderboardTaskItem[]
}

export const PodiumTaskSchema = SchemaFactory.createForClass(PodiumTask)

/**
 * Narrowed type representing a Podium task with base task fields.
 *
 * Combines the common BaseTask properties with PodiumTask-specific fields.
 */
export type PodiumTaskWithBase = BaseTask & PodiumTask
