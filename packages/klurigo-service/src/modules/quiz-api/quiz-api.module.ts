import { Logger, Module } from '@nestjs/common'
import { EventEmitterModule } from '@nestjs/event-emitter'

import { GameCoreModule } from '../game-core'
import { QuizCoreModule } from '../quiz-core'

import { ProfileQuizController, QuizController } from './controllers'
import { QuizService } from './services'

/**
 * NestJS module for the quiz API surface (excluding ratings).
 *
 * Provides:
 * - `QuizController` for quiz operations.
 * - `ProfileQuizController` for profile-scoped quiz operations.
 * - `QuizService` for quiz use-cases and orchestration.
 *
 * Imports:
 * - `QuizCoreModule` for quiz persistence and repositories.
 * - `GameCoreModule` for recent game activity.
 * - `EventEmitterModule` for emitting domain/application events from quiz use-cases.
 *
 * Notes:
 * - Quiz persistence (schemas + repositories) is owned by `QuizCoreModule`.
 * - Quiz rating APIs and orchestration are owned by `QuizRatingApiModule`.
 */
@Module({
  imports: [EventEmitterModule, GameCoreModule, QuizCoreModule],
  controllers: [QuizController, ProfileQuizController],
  providers: [Logger, QuizService],
  exports: [QuizService],
})
export class QuizApiModule {}
