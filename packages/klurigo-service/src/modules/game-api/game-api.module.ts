import { Logger, Module } from '@nestjs/common'
import { EventEmitterModule } from '@nestjs/event-emitter'

import { GameCoreModule } from '../game-core'
import { GameEventModule } from '../game-event/game-event.module'
import { GameTaskModule } from '../game-task'
import { QuizApiModule } from '../quiz-api'
import { QuizCoreModule } from '../quiz-core'
import { QuizRatingApiModule } from '../quiz-rating-api'
import { UserModule } from '../user'

import {
  GameController,
  GameRatingController,
  GameSettingsController,
  ProfileGameController,
  QuizGameController,
} from './controllers'
import { GameListener } from './handlers'
import { GameRatingService, GameService, GameSettingsService } from './services'

/**
 * GameModule sets up the necessary controllers, providers, and Mongoose schemas
 * for handling game-related operations.
 */
@Module({
  imports: [
    EventEmitterModule,
    GameCoreModule,
    GameEventModule,
    GameTaskModule,
    QuizApiModule,
    QuizCoreModule,
    QuizRatingApiModule,
    UserModule,
  ],
  controllers: [
    GameController,
    GameRatingController,
    GameSettingsController,
    QuizGameController,
    ProfileGameController,
  ],
  providers: [
    Logger,
    GameRatingService,
    GameService,
    GameSettingsService,
    GameListener,
  ],
  exports: [],
})
export class GameApiModule {}
