/**
 * Discriminator type for a quiz rating author, distinguishing between
 * authenticated users and anonymous game participants.
 */
export enum QuizRatingAuthorType {
  /**
   * The rating was submitted by an authenticated user.
   * The author identity is resolved at query time from the User document.
   */
  User = 'USER',

  /**
   * The rating was submitted by an anonymous game participant.
   * The author nickname is captured at rating time and stored with the rating.
   */
  Anonymous = 'ANONYMOUS',
}
