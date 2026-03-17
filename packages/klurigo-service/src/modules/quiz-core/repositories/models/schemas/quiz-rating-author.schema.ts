import { QuizRatingAuthorType } from '@klurigo/common'
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'

import { User } from '../../../../user/repositories'

/**
 * Base schema for a quiz rating author.
 *
 * Acts as the discriminator root for the two author subtypes: a logged-in
 * user ({@link QuizRatingUserAuthor}) and an anonymous game participant
 * ({@link QuizRatingAnonymousAuthor}).
 */
@Schema({ _id: false, discriminatorKey: 'type' })
export class QuizRatingAuthorBase {
  /**
   * The discriminator field identifying the author subtype.
   */
  @Prop({
    type: String,
    enum: QuizRatingAuthorType,
    required: true,
  })
  type!: QuizRatingAuthorType
}

/**
 * Schema factory for the QuizRatingAuthorBase class.
 */
export const QuizRatingAuthorBaseSchema =
  SchemaFactory.createForClass(QuizRatingAuthorBase)

/**
 * Schema for a quiz rating left by an authenticated user.
 *
 * Stores only a reference to the User document. The display nickname is
 * resolved at query time via populate so it always reflects the user's
 * current {@code defaultNickname}.
 */
@Schema({ _id: false })
export class QuizRatingUserAuthor {
  /**
   * The discriminator field, always {@link QuizRatingAuthorType.User} for
   * this subtype.
   */
  type!: QuizRatingAuthorType.User

  /**
   * Reference to the User document that authored the rating.
   */
  @Prop({ type: String, ref: 'User', required: true })
  user: User
}

/**
 * Schema factory for the QuizRatingUserAuthor class.
 */
export const QuizRatingUserAuthorSchema =
  SchemaFactory.createForClass(QuizRatingUserAuthor)

/**
 * Schema for a quiz rating left by an anonymous game participant.
 *
 * Stores both the participant identifier (the game-session UUID) and the
 * nickname captured at rating time. The nickname must be persisted because
 * there is no User document to resolve it from later.
 */
@Schema({ _id: false })
export class QuizRatingAnonymousAuthor {
  /**
   * The discriminator field, always {@link QuizRatingAuthorType.Anonymous}
   * for this subtype.
   */
  type!: QuizRatingAuthorType.Anonymous

  /**
   * The game-session participant UUID, used to enforce one-rating-per-anonymous-participant-per-quiz.
   */
  @Prop({ type: String, required: true })
  participantId: string

  /**
   * The display nickname of the anonymous participant, captured at rating time.
   */
  @Prop({ type: String, required: true })
  nickname: string
}

/**
 * Schema factory for the QuizRatingAnonymousAuthor class.
 */
export const QuizRatingAnonymousAuthorSchema = SchemaFactory.createForClass(
  QuizRatingAnonymousAuthor,
)

/**
 * Convenience type for a user-authored rating, combining the base author
 * fields with user-specific properties.
 */
export type QuizRatingUserAuthorWithBase = QuizRatingAuthorBase &
  QuizRatingUserAuthor

/**
 * Convenience type for an anonymous-authored rating, combining the base
 * author fields with anonymous-specific properties.
 */
export type QuizRatingAnonymousAuthorWithBase = QuizRatingAuthorBase &
  QuizRatingAnonymousAuthor

/**
 * Discriminated union of all supported quiz rating author types.
 */
export type QuizRatingAuthor =
  | QuizRatingUserAuthorWithBase
  | QuizRatingAnonymousAuthorWithBase
