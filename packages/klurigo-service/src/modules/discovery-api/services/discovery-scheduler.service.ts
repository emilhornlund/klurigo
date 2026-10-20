import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Cron } from '@nestjs/schedule'
import { MurLock } from 'murlock'

import { EnvironmentVariables } from '../../../app/config'
import { structuredLog } from '../../../app/utils'

import { DiscoveryComputeService } from './discovery-compute.service'

export const DISCOVERY_SNAPSHOT_LOCK_LEASE_MS = 11 * 60 * 60 * 1000

const getComputeErrorCategory = (error: unknown): 'mongodb' | 'unexpected' => {
  if (
    error instanceof Error &&
    [
      'MongoError',
      'MongoServerError',
      'MongoNetworkError',
      'MongooseError',
    ].includes(error.name)
  ) {
    return 'mongodb'
  }

  return 'unexpected'
}

/**
 * Scheduled service that refreshes the discovery snapshot twice daily.
 *
 * Fires at 06:00 and 18:00 UTC via `@Cron('0 0 6,18 * * *')`. Each
 * invocation delegates to {@link DiscoveryComputeService.compute}, which
 * scores all eligible quizzes, applies the per-rail dedupe policy, and
 * atomically replaces the singleton snapshot document.
 *
 * A distributed lock (`discovery_snapshot_lock`) ensures that only one
 * instance across the cluster executes the compute pipeline per trigger. Its
 * 11-hour lease is shorter than the 12-hour schedule interval, so an abandoned
 * lock expires before the next scheduled run while allowing long computations
 * to complete without overlapping another scheduled invocation.
 *
 * When the `DISCOVERY_SEED_ON_INIT` environment variable is set to `true`,
 * the service also runs a one-time compute pass during application startup
 * (via `OnModuleInit`). This is useful for seeding an initial snapshot after
 * deploying a new environment before the first scheduled cron tick fires.
 */
@Injectable()
export class DiscoverySchedulerService implements OnModuleInit {
  private readonly logger = new Logger(DiscoverySchedulerService.name)

  /**
   * Creates a DiscoverySchedulerService.
   *
   * @param configService - NestJS config service used to read `DISCOVERY_SEED_ON_INIT`.
   * @param discoveryComputeService - Service that computes and persists the discovery snapshot.
   */
  constructor(
    private readonly configService: ConfigService<EnvironmentVariables>,
    private readonly discoveryComputeService: DiscoveryComputeService,
  ) {}

  /**
   * Runs a one-time discovery snapshot computation on application startup when
   * the `DISCOVERY_SEED_ON_INIT` environment variable is `true`.
   *
   * This allows operators to seed an initial snapshot immediately after deploying
   * a new environment, without waiting for the next scheduled cron tick.
   */
  async onModuleInit(): Promise<void> {
    if (this.configService.get('DISCOVERY_SEED_ON_INIT')) {
      this.logger.log(
        'DISCOVERY_SEED_ON_INIT is enabled — running initial discovery snapshot computation.',
      )
      await this.discoveryComputeService.compute()
      this.logger.log('Initial discovery snapshot computation completed.')
    }
  }

  /**
   * Recomputes and persists the discovery snapshot.
   *
   * Runs at 06:00 and 18:00 UTC. The lease is shorter than the interval
   * between scheduled executions so a crashed process cannot block the next
   * scheduled refresh.
   */
  @Cron('0 0 6,18 * * *')
  @MurLock(DISCOVERY_SNAPSHOT_LOCK_LEASE_MS, 'discovery_snapshot_lock')
  public async refreshSnapshot(): Promise<void> {
    this.logger.log('Starting discovery snapshot computation.')
    try {
      await this.discoveryComputeService.compute()
      this.logger.log('Discovery snapshot computation completed.')
    } catch (error) {
      this.logger.error(
        structuredLog('Discovery snapshot computation failed.', {
          operation: 'refreshSnapshot',
          errorCategory: getComputeErrorCategory(error),
        }),
      )
      throw error
    }
  }
}
