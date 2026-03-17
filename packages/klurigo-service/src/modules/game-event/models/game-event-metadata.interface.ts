import { QuestionTaskAnswer } from '../../game-core/repositories/models/schemas'

/**
 * Metadata associated with game utils, used to track answer submissions and player-specific information.
 *
 * Podium-specific fields (`podiumRating*` and `podiumCanRateQuiz`) are populated by the
 * subscriber when the current task is a Podium task and are consumed by
 * `buildGameOverPlayerEvent` to assemble the player game-over event.
 */
export interface GameEventMetaData {
  currentAnswerSubmissions: number
  totalAnswerSubmissions: number
  playerAnswerSubmission?: QuestionTaskAnswer
  podiumCanRateQuiz?: boolean
  podiumRatingStars?: number
  podiumRatingComment?: string
}
