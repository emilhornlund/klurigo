import { Logger, Module } from '@nestjs/common'
import { EventEmitterModule } from '@nestjs/event-emitter'
import { MongooseModule } from '@nestjs/mongoose'

import { GameCoreModule } from '../game-core'
import { QuizCoreModule } from '../quiz-core'
import { UserModule } from '../user'

import { GameResultController } from './controllers'
import { GameResultListener } from './handlers'
import { GameResultRepository } from './repositories'
import { GameResult, GameResultSchema } from './repositories/models/schemas'
import { GameResultService } from './services'

/**
 * GameResultModule sets up the controllers, providers, and Mongoose schemas
 * required for retrieving and persisting game results.
 */
@Module({
  imports: [
    EventEmitterModule,
    GameCoreModule,
    MongooseModule.forFeature([
      {
        name: GameResult.name,
        schema: GameResultSchema,
      },
    ]),
    QuizCoreModule,
    UserModule,
  ],
  controllers: [GameResultController],
  providers: [
    GameResultListener,
    GameResultRepository,
    GameResultService,
    Logger,
  ],
  exports: [GameResultRepository, GameResultService],
})
export class GameResultModule {}
