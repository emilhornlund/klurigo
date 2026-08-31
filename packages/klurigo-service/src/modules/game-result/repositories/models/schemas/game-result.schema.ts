import { QuestionType } from '@klurigo/common'
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument, Model } from 'mongoose'

import { Game } from '../../../../game-core/repositories/models/schemas'

/**
 * Represents a player's final performance metrics in the game.
 */
@Schema({ _id: false })
export class PlayerMetric {
  /**
   * The player participant's unique identifier.
   */
  @Prop({ type: String, required: true })
  participantId: string

  /**
   * The player participant's nickname.
   */
  @Prop({ type: String, required: true })
  nickname: string

  /**
   * The player's final rank in the game (1 = first place, etc.).
   */
  @Prop({ type: Number, required: true })
  rank: number

  /**
   * The net number of positions the player recovered by the end of the game,
   * calculated as the difference between the worst rank reached during the game
   * and the final rank.
   *
   * A higher value indicates a larger comeback.
   *
   * This value is never negative; players who did not improve their position
   * have a rank gain of 0.
   */
  @Prop({ type: Number, required: true })
  comebackRankGain: number

  /**
   * The total number of questions the player answered correctly.
   */
  @Prop({ type: Number, required: false })
  correct?: number

  /**
   * The total number of questions the player answered incorrectly.
   */
  @Prop({ type: Number, required: false })
  incorrect?: number

  /**
   * The player's average precision for range-based answers (0 = worst, 1 = best).
   */
  @Prop({ type: Number, required: false })
  averagePrecision?: number

  /**
   * The total number of questions the player left unanswered.
   */
  @Prop({ type: Number, required: true })
  unanswered: number

  /**
   * The average time (in milliseconds) the player took to answer questions.
   */
  @Prop({ type: Number, required: true })
  averageResponseTime: number

  /**
   * The longest streak of consecutive correct answers by the player in Classic
   * mode. This remains optional so legacy and newly persisted
   * ZeroToOneHundred results remain readable.
   */
  @Prop({ type: Number, required: false })
  longestCorrectStreak?: number

  /**
   * The player's total score at the end of the game.
   */
  @Prop({ type: Number, required: true })
  score: number
}

/**
 * Schema factory for the PlayerMetric class.
 */
export const PlayerMetricSchema = SchemaFactory.createForClass(PlayerMetric)

/**
 * Represents the aggregated performance metrics for a single question in the game.
 */
@Schema({ _id: false })
export class QuestionMetric {
  /**
   * The text of the question.
   */
  @Prop({ type: String, required: true })
  text: string

  /**
   * The type of the question (e.g., multiple choice, slider, true/false).
   */
  @Prop({
    type: String,
    enum: QuestionType,
    required: true,
  })
  type: QuestionType

  /**
   * The number of players who answered the question correctly.
   */
  @Prop({ type: Number, required: false })
  correct?: number

  /**
   * The number of players who answered the question incorrectly.
   */
  @Prop({ type: Number, required: false })
  incorrect?: number

  /**
   * The average precision score across all player answers for this question.
   */
  @Prop({ type: Number, required: false })
  averagePrecision?: number

  /**
   * The number of players who left the question unanswered.
   */
  @Prop({ type: Number, required: true })
  unanswered: number

  /**
   * The average time (in milliseconds) that players took to answer the question.
   */
  @Prop({ type: Number, required: true })
  averageResponseTime: number
}

/**
 * Schema factory for the QuestionMetric class.
 */
export const QuestionMetricSchema = SchemaFactory.createForClass(QuestionMetric)

/**
 * Represents the final results of a completed game, including player performance and question statistics.
 */
@Schema({ _id: true, collection: 'game_results' })
export class GameResult {
  /**
   * The unique identifier for the game result document.
   */
  @Prop({ type: String, required: true })
  _id: string

  /**
   * The name or title of the game session or quiz.
   */
  @Prop({ type: String, required: true })
  name: string

  /**
   * The game document associated with these results.
   */
  @Prop({ type: String, ref: 'Game' })
  game: Game

  /**
   * The participant's unique identifier who hosted the game.
   */
  @Prop({ type: String, required: true })
  hostParticipantId: string

  /**
   * A list of players and their final performance metrics.
   */
  @Prop({ type: [PlayerMetricSchema], required: true })
  players: PlayerMetric[]

  /**
   * A list of questions and their aggregated response metrics.
   */
  @Prop({ type: [QuestionMetricSchema], required: true })
  questions: QuestionMetric[]

  /**
   * The date and time when the game was hosted or started.
   */
  @Prop({ type: Date, required: true })
  hosted: Date

  /**
   * The date and time when the game was completed.
   */
  @Prop({ type: Date, required: true })
  completed: Date
}

/**
 * Schema factory for the GameResult class.
 */
export const GameResultSchema = SchemaFactory.createForClass(GameResult)

/**
 * Mongoose model type for the GameResult schema.
 */
export type GameResultModel = Model<GameResult>

/**
 * Mongoose hydrated document type for the GameResult schema.
 */
export type GameResultDocument = HydratedDocument<GameResult>
