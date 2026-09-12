import { Injectable, Logger } from '@nestjs/common'
import { OnEvent } from '@nestjs/event-emitter'

import { getErrorStack, structuredLog } from '../../../app/utils'
import { GameService } from '../services'

/**
 * Listens to events and triggers appropriate game-related logic.
 */
@Injectable()
export class GameListener {
  private readonly logger = new Logger(GameListener.name)

  /**
   * Initializes the GameListener.
   *
   * @param gameService - Service responsible for managing related game entities.
   */
  constructor(private readonly gameService: GameService) {}

  /**
   * Handles the deletion of a quiz.
   * When a quiz is deleted, this listener receives the `quiz.deleted` event
   * and deletes all associated game entities.
   *
   * @param payload - The event payload containing the quiz ID.
   */
  @OnEvent('quiz.deleted')
  public async handleQuizDeleted({
    quizId,
  }: {
    quizId: string
  }): Promise<void> {
    try {
      await this.gameService.deleteQuiz(quizId)
    } catch (error) {
      this.logger.error(
        structuredLog('Failed to clean up games after quiz deletion.', {
          operation: 'handleQuizDeleted',
          quizId,
        }),
        getErrorStack(error),
      )
    }
  }
}
