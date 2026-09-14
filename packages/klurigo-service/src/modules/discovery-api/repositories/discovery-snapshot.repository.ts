import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'

import { BaseRepository } from '../../../app/shared/repository'
import { DISCOVERY_SNAPSHOT_SINGLETON_ID } from '../constants'

import {
  DiscoverySnapshot,
  DiscoverySnapshotDocument,
  type DiscoverySnapshotModel,
  DiscoverySnapshotSection,
} from './models/schemas'

/**
 * Repository for the singleton discovery snapshot document.
 *
 * The `discovery_snapshots` collection contains exactly one document at all
 * times, identified by {@link DISCOVERY_SNAPSHOT_SINGLETON_ID}. This
 * repository provides three operations:
 *
 * - {@link findLatest} — reads the current snapshot without populating quiz
 *   references (or returns `null` if none has been computed yet).
 * - {@link findLatestWithQuizzes} — reads the current snapshot and populates
 *   the quiz references in each section's entries.
 * - {@link upsertLatest} — atomically replaces the singleton document,
 *   preserving the sentinel id.
 *
 * No sorting is performed at read time; entries within each section are
 * expected to be stored in the desired display order (descending score) at
 * write time.
 */
@Injectable()
export class DiscoverySnapshotRepository extends BaseRepository<DiscoverySnapshot> {
  /**
   * Creates a `DiscoverySnapshotRepository`.
   *
   * @param discoverySnapshotModel - The Mongoose model for the DiscoverySnapshot schema.
   */
  constructor(
    @InjectModel(DiscoverySnapshot.name)
    protected readonly discoverySnapshotModel: DiscoverySnapshotModel,
  ) {
    super(discoverySnapshotModel, 'DiscoverySnapshot')
  }

  /**
   * Returns the latest discovery snapshot without populating quiz references,
   * or `null` if none exists.
   *
   * Entries contain raw `quizId` UUID strings. Use {@link findLatestWithQuizzes}
   * when full quiz document data is required.
   *
   * @returns The current snapshot document, or `null`.
   */
  public async findLatest(): Promise<DiscoverySnapshotDocument | null> {
    return this.model.findById(DISCOVERY_SNAPSHOT_SINGLETON_ID).exec()
  }

  /**
   * Returns the latest discovery snapshot with each entry's quiz reference
   * populated, or `null` if none exists.
   *
   * Populates the nested path `sections.entries.quizId` so callers receive
   * full quiz documents in place of the stored UUID strings.
   *
   * @returns The current snapshot document with quizzes populated, or `null`.
   */
  public async findLatestWithQuizzes(): Promise<DiscoverySnapshotDocument | null> {
    return this.model
      .findById(DISCOVERY_SNAPSHOT_SINGLETON_ID)
      .populate({ path: 'sections.entries.quizId' })
      .exec()
  }

  /**
   * Atomically replaces the singleton snapshot document.
   *
   * Uses `findOneAndReplace` with `{ upsert: true }` so that the very first
   * write creates the document and subsequent writes replace it in one
   * round-trip. The sentinel id {@link DISCOVERY_SNAPSHOT_SINGLETON_ID} is
   * always preserved because it is used as the filter key.
   *
   * @param snapshot - The new snapshot data to persist.
   */
  public async upsertLatest(snapshot: {
    generatedAt: Date
    sections: DiscoverySnapshotSection[]
  }): Promise<void> {
    await this.model
      .findOneAndReplace(
        { _id: DISCOVERY_SNAPSHOT_SINGLETON_ID },
        { _id: DISCOVERY_SNAPSHOT_SINGLETON_ID, ...snapshot },
        { upsert: true },
      )
      .exec()
  }

  /**
   * Removes a quiz from every section in the current snapshot.
   *
   * The update is intentionally limited to the matching nested entries. It
   * preserves section and entry order, does not change the snapshot timestamp,
   * and is a no-op when the snapshot or quiz does not exist.
   *
   * @param quizId - The identifier of the deleted quiz.
   */
  public async removeQuizFromSnapshot(quizId: string): Promise<void> {
    await this.model
      .updateOne(
        { _id: DISCOVERY_SNAPSHOT_SINGLETON_ID },
        { $pull: { 'sections.$[].entries': { quizId } } },
      )
      .exec()
  }
}
