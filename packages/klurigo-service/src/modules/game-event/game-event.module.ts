import { Logger, Module } from '@nestjs/common'
import { EventEmitterModule } from '@nestjs/event-emitter'

import { GameCoreModule } from '../game-core'
import { QuizCoreModule } from '../quiz-core'
import { UserModule } from '../user'

import {
  GameEventPublisher,
  GameEventSubscriber,
  GameParticipantEventBuilder,
} from './services'

/**
 * GameModule sets up the necessary controllers, providers, and Mongoose schemas
 * for handling game-related operations.
 */
@Module({
  imports: [EventEmitterModule, GameCoreModule, QuizCoreModule, UserModule],
  controllers: [],
  providers: [
    Logger,
    GameEventPublisher,
    GameEventSubscriber,
    GameParticipantEventBuilder,
  ],
  exports: [GameEventPublisher, GameEventSubscriber],
})
export class GameEventModule {}
