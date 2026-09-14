import { Injectable, Logger } from '@nestjs/common'
import { OnEvent } from '@nestjs/event-emitter'

import { getErrorStack, structuredLog } from '../../../app/utils'
import { QuizRatingService } from '../services'

/**
 * Performs quiz-rating-owned cleanup when a quiz is deleted.
 */
@Injectable()
export class QuizDeletedListener {
  private readonly logger = new Logger(QuizDeletedListener.name)

  constructor(private readonly quizRatingService: QuizRatingService) {}

  /**
   * Deletes all ratings for the deleted quiz.
   *
   * @param payload - Event payload containing the deleted quiz ID.
   */
  @OnEvent('quiz.deleted')
  public async handleQuizDeleted({
    quizId,
  }: {
    quizId: string
  }): Promise<void> {
    try {
      await this.quizRatingService.deleteByQuizId(quizId)
    } catch (error) {
      this.logger.error(
        structuredLog('Failed to clean up quiz ratings after quiz deletion.', {
          operation: 'handleQuizDeleted',
          quizId,
        }),
        getErrorStack(error),
      )
    }
  }
}
