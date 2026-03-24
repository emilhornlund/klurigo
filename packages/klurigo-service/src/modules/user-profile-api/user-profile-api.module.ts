import { Module } from '@nestjs/common'

import { GameResultModule } from '../game-result'
import { QuizCoreModule } from '../quiz-core'
import { UserModule } from '../user'

import { UserProfileService } from './services'

/**
 * Module for cross-domain user profile aggregation use-cases.
 */
@Module({
  imports: [UserModule, QuizCoreModule, GameResultModule],
  providers: [UserProfileService],
  exports: [UserProfileService],
})
export class UserProfileApiModule {}
