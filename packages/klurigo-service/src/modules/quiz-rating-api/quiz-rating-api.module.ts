import { Logger, Module } from '@nestjs/common'
import { EventEmitterModule } from '@nestjs/event-emitter'

import { GameCoreModule } from '../game-core'
import { QuizCoreModule } from '../quiz-core'

import { ProfileQuizRatingController } from './controllers/profile-quiz-rating.controller'
import { QuizRatingController } from './controllers/quiz-rating.controller'
import { QuizRatingService } from './services'

/**
 * Module that provides the quiz rating API surface and related use-cases.
 */
@Module({
  imports: [EventEmitterModule, GameCoreModule, QuizCoreModule],
  controllers: [QuizRatingController, ProfileQuizRatingController],
  providers: [Logger, QuizRatingService],
  exports: [QuizRatingService],
})
export class QuizRatingApiModule {}
