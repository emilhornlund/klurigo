import { Injectable, Logger } from '@nestjs/common'
import { OnEvent } from '@nestjs/event-emitter'

import { getErrorStack, structuredLog } from '../../../app/utils'
import { DiscoverySnapshotRepository } from '../repositories'

/**
 * Performs discovery-owned cleanup when a quiz is deleted.
 */
@Injectable()
export class QuizDeletedListener {
  private readonly logger = new Logger(QuizDeletedListener.name)

  constructor(
    private readonly discoverySnapshotRepository: DiscoverySnapshotRepository,
  ) {}

  /**
   * Removes the deleted quiz from all persisted discovery sections.
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
      await this.discoverySnapshotRepository.removeQuizFromSnapshot(quizId)
    } catch (error) {
      this.logger.error(
        structuredLog('Failed to clean up discovery after quiz deletion.', {
          operation: 'handleQuizDeleted',
          quizId,
        }),
        getErrorStack(error),
      )
    }
  }
}
