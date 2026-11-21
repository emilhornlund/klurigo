import { QuizVisibility, type QuizVisibilityRequestDto } from '@klurigo/common'

import { ApiQuizVisibilityProperty } from '../decorators/api'

/**
 * Request body for updating only the visibility of an existing quiz.
 *
 * The visibility field is required. The global validation pipe rejects other
 * properties so the request cannot change quiz settings or questions.
 */
export class QuizVisibilityRequest implements QuizVisibilityRequestDto {
  /**
   * The requested public or private visibility of the quiz.
   */
  @ApiQuizVisibilityProperty()
  readonly visibility: QuizVisibility
}
