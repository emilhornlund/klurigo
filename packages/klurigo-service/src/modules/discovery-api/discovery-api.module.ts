import { Module } from '@nestjs/common'
import { EventEmitterModule } from '@nestjs/event-emitter'
import { MongooseModule } from '@nestjs/mongoose'

import { GameCoreModule } from '../game-core'
import { QuizCoreModule } from '../quiz-core'

import { DiscoveryController } from './controllers'
import { QuizDeletedListener } from './handlers'
import { DiscoverySnapshotRepository } from './repositories'
import {
  DiscoverySnapshot,
  DiscoverySnapshotSchema,
} from './repositories/models/schemas'
import { DiscoveryComputeService, DiscoverySchedulerService } from './services'

/**
 * NestJS module for the discovery API surface.
 *
 * Provides:
 * - `DiscoveryController` for the `GET /discover` endpoint.
 * - `DiscoverySnapshotRepository` for reading and writing the discovery snapshot
 * - `DiscoveryComputeService` for computing discovery snapshots
 * - `DiscoverySchedulerService` for scheduling periodic snapshot refreshes
 *
 * Imports:
 * - `MongooseModule` registering the `discovery_snapshots` collection schema.
 * - `QuizCoreModule` for quiz repository access.
 * - `GameCoreModule` for game repository access.
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: DiscoverySnapshot.name,
        schema: DiscoverySnapshotSchema,
      },
    ]),
    EventEmitterModule,
    QuizCoreModule,
    GameCoreModule,
  ],
  controllers: [DiscoveryController],
  providers: [
    DiscoverySnapshotRepository,
    DiscoveryComputeService,
    DiscoverySchedulerService,
    QuizDeletedListener,
  ],
  exports: [
    DiscoverySnapshotRepository,
    DiscoveryComputeService,
    DiscoverySchedulerService,
  ],
})
export class DiscoveryApiModule {}
