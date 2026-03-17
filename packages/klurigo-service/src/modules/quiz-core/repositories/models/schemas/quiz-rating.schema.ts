import { QuizRatingAuthorType } from '@klurigo/common'
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Model, Schema as MongooseSchema } from 'mongoose'

import {
  QuizRatingAnonymousAuthorSchema,
  type QuizRatingAuthor,
  QuizRatingAuthorBaseSchema,
  QuizRatingUserAuthorSchema,
} from './quiz-rating-author.schema'

/**
 * Mongoose schema for quiz ratings and feedback comments.
 *
 * Each document represents a single rating for a specific quiz. The author
 * is stored as a discriminated subdocument — either a logged-in user
 * ({@link QuizRatingUserAuthor}) or an anonymous game participant
 * ({@link QuizRatingAnonymousAuthor}). Partial unique indexes enforce one
 * rating per author per quiz for each author type independently.
 */
@Schema({ _id: true, collection: 'quiz_ratings' })
export class QuizRating {
  /**
   * The unique identifier of the rating document.
   * Acts as the primary key in the database.
   */
  @Prop({ type: String, required: true })
  _id: string

  /**
   * The quiz being rated.
   *
   * Stores a reference to a Quiz document and is used for efficient lookups
   * when retrieving ratings and feedback for a specific quiz.
   */
  @Prop({ type: String, ref: 'Quiz', required: true, index: true })
  quizId: string

  /**
   * The author of the rating, stored as a discriminated subdocument.
   *
   * The subtype is determined by the author.type discriminator field.
   * Use the QuizRatingAuthorType enum values to distinguish between
   * authenticated users and anonymous participants.
   */
  @Prop({ type: QuizRatingAuthorBaseSchema, required: true })
  author: QuizRatingAuthor

  /**
   * Star rating for the quiz.
   *
   * Must be an integer value between 1 and 5 (inclusive).
   */
  @Prop({ type: Number, required: true, min: 1, max: 5 })
  stars: number

  /**
   * Optional free-text feedback comment for the quiz.
   *
   * Intended to capture qualitative feedback from the user.
   */
  @Prop({ type: String, required: false, maxlength: 2000 })
  comment?: string

  /**
   * The date and time when the rating was created.
   */
  @Prop({ type: Date, required: true })
  created: Date

  /**
   * The date and time when the rating was last updated.
   *
   * Updated whenever the user edits their rating or feedback comment.
   */
  @Prop({ type: Date, required: true })
  updated: Date
}

/**
 * Mongoose model type for the QuizRating schema.
 */
export type QuizRatingModel = Model<QuizRating>

/**
 * Schema factory for the QuizRating class.
 */
export const QuizRatingSchema = SchemaFactory.createForClass(QuizRating)

const authorSchema =
  QuizRatingSchema.path<MongooseSchema.Types.Subdocument>('author')
authorSchema.discriminator(
  QuizRatingAuthorType.User,
  QuizRatingUserAuthorSchema,
)
authorSchema.discriminator(
  QuizRatingAuthorType.Anonymous,
  QuizRatingAnonymousAuthorSchema,
)

/**
 * Ensures a logged-in user can only submit one rating per quiz.
 */
QuizRatingSchema.index(
  { quizId: 1, 'author.user': 1 },
  {
    unique: true,
    partialFilterExpression: { 'author.type': QuizRatingAuthorType.User },
  },
)

/**
 * Ensures an anonymous participant can only submit one rating per quiz.
 */
QuizRatingSchema.index(
  { quizId: 1, 'author.participantId': 1 },
  {
    unique: true,
    partialFilterExpression: { 'author.type': QuizRatingAuthorType.Anonymous },
  },
)

/**
 * Supports efficient retrieval of the latest ratings and feedback for a quiz.
 */
QuizRatingSchema.index({ quizId: 1, created: -1 })

/**
 * Supports efficient retrieval of a user's rating history.
 */
QuizRatingSchema.index({ 'author.user': 1, created: -1 })
