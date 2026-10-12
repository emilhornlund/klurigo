import { lstat, readdir, realpath, rm, rmdir } from 'node:fs/promises'
import { isAbsolute, join, relative, resolve, sep } from 'node:path'

import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Cron } from '@nestjs/schedule'
import { MurLock } from 'murlock'

import { EnvironmentVariables } from '../../../app/config'
import { QuizRepository } from '../../quiz-core/repositories/quiz.repository'

const CLEANUP_LOCK = 'orphaned_image_cleanup_lock'
const MANAGED_IMAGE_FILENAME =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.webp$/i
const SAFE_USER_DIRECTORY = /^[A-Za-z0-9_-]+$/

interface Candidate {
  relativePath: string
  fullPath: string
  size: number
}

export interface OrphanedImageCleanupResult {
  scannedFiles: number
  referencedFiles: number
  orphanedCandidates: number
  deletedFiles: number
  skippedFiles: number
  deletionFailures: number
  bytesReclaimed: number
  bytesPotentiallyReclaimable: number
  dryRun: boolean
  durationMs: number
}

/** Reconciles managed image uploads against quiz image references. */
@Injectable()
export class OrphanedImageCleanupService {
  private readonly logger = new Logger(OrphanedImageCleanupService.name)

  constructor(
    private readonly configService: ConfigService<EnvironmentVariables>,
    private readonly quizRepository: QuizRepository,
  ) {}

  /** Runs daily at 03:30 UTC; the Redis mutex coordinates all service instances. */
  @Cron('0 30 3 * * *', { timeZone: 'UTC' })
  @MurLock(60 * 60 * 1000, CLEANUP_LOCK)
  public async cleanOrphanedImages(): Promise<
    OrphanedImageCleanupResult | undefined
  > {
    const startedAt = Date.now()
    const directory = this.configService.get<string>('UPLOAD_DIRECTORY')
    const dryRun =
      this.configService.get<boolean>('ORPHANED_IMAGE_CLEANUP_DRY_RUN', {
        infer: true,
      }) ?? true
    const retentionDays =
      this.configService.get<number>('ORPHANED_IMAGE_RETENTION_DAYS', {
        infer: true,
      }) ?? 7
    const retentionCutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000
    const result: OrphanedImageCleanupResult = {
      scannedFiles: 0,
      referencedFiles: 0,
      orphanedCandidates: 0,
      deletedFiles: 0,
      skippedFiles: 0,
      deletionFailures: 0,
      bytesReclaimed: 0,
      bytesPotentiallyReclaimable: 0,
      dryRun,
      durationMs: 0,
    }

    try {
      if (!directory || !isAbsolute(resolve(directory))) {
        throw new Error('UPLOAD_DIRECTORY must resolve to a directory path')
      }
      const root = resolve(directory)
      const rootStat = await lstat(root)
      if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) {
        throw new Error('Upload root is not a regular directory')
      }
      const rootRealPath = await realpath(root)

      // Any error here aborts before the filesystem can be modified.
      const referenced =
        await this.quizRepository.findReferencedUploadedImages()
      result.referencedFiles = referenced.size
      const candidates = await this.findCandidates(
        root,
        rootRealPath,
        referenced,
        retentionDays,
        result,
      )
      result.orphanedCandidates = candidates.length
      result.bytesPotentiallyReclaimable = candidates.reduce(
        (sum, file) => sum + file.size,
        0,
      )

      for (const candidate of candidates) {
        // A failed revalidation invalidates confidence for every subsequent
        // deletion, so let it abort the entire run rather than handling it as
        // an individual filesystem failure.
        if (
          await this.quizRepository.isUploadedImageReferenced(
            candidate.relativePath,
          )
        ) {
          result.skippedFiles += 1
          continue
        }
        if (dryRun) continue
        try {
          // Re-discover references immediately before deletion. Quiz writes share
          // CLEANUP_LOCK, so no persisted reference can be introduced in this gap.
          const fileStat = await lstat(candidate.fullPath)
          if (!fileStat.isFile() || fileStat.isSymbolicLink()) {
            result.skippedFiles += 1
            continue
          }
          if (
            Math.max(
              fileStat.mtimeMs,
              fileStat.ctimeMs,
              fileStat.birthtimeMs || 0,
            ) >= retentionCutoff
          ) {
            result.skippedFiles += 1
            continue
          }
          const realFile = await realpath(candidate.fullPath)
          if (
            !this.isContained(rootRealPath, realFile) ||
            fileStat.size !== candidate.size
          ) {
            result.skippedFiles += 1
            continue
          }
          await rm(candidate.fullPath)
          result.deletedFiles += 1
          result.bytesReclaimed += fileStat.size
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
            result.skippedFiles += 1
            continue
          }
          result.deletionFailures += 1
          this.logger.error(
            `Failed to remove orphaned upload ${candidate.relativePath}`,
            error,
          )
        }
      }

      if (!dryRun) await this.removeEmptyUserDirectories(root)
      result.durationMs = Date.now() - startedAt
      this.logger.log(
        JSON.stringify({
          event: 'orphaned_image_cleanup_complete',
          ...result,
        }),
      )
      return result
    } catch (error) {
      result.durationMs = Date.now() - startedAt
      this.logger.error(
        JSON.stringify({
          event: 'orphaned_image_cleanup_failed',
          ...result,
          error: error instanceof Error ? error.message : String(error),
        }),
        error instanceof Error ? error.stack : undefined,
      )
      return undefined
    }
  }

  private async findCandidates(
    root: string,
    rootRealPath: string,
    references: Set<string>,
    retentionDays: number,
    result: OrphanedImageCleanupResult,
  ): Promise<Candidate[]> {
    const candidates: Candidate[] = []
    const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000
    for (const user of await readdir(root, { withFileTypes: true })) {
      if (
        !user.isDirectory() ||
        user.isSymbolicLink() ||
        !SAFE_USER_DIRECTORY.test(user.name)
      )
        continue
      const userDirectory = join(root, user.name)
      let userEntries
      try {
        const userStat = await lstat(userDirectory)
        if (!userStat.isDirectory() || userStat.isSymbolicLink()) continue
        userEntries = await readdir(userDirectory, { withFileTypes: true })
      } catch (error) {
        result.skippedFiles += 1
        this.logger.warn(
          `Unable to scan upload directory ${user.name}: ${String(error)}`,
        )
        continue
      }
      for (const entry of userEntries) {
        if (!MANAGED_IMAGE_FILENAME.test(entry.name)) continue
        const relativePath = `${user.name}/${entry.name}`
        const fullPath = join(userDirectory, entry.name)
        if (entry.isSymbolicLink() || !entry.isFile()) {
          result.skippedFiles += 1
          continue
        }
        try {
          const stat = await lstat(fullPath)
          if (!stat.isFile() || stat.isSymbolicLink()) {
            result.skippedFiles += 1
            continue
          }
          const realFile = await realpath(fullPath)
          if (!this.isContained(rootRealPath, realFile)) {
            result.skippedFiles += 1
            continue
          }
          result.scannedFiles += 1
          if (references.has(relativePath)) {
            result.skippedFiles += 1
            continue
          }
          const conservativeMtime = Math.max(
            stat.mtimeMs,
            stat.ctimeMs,
            stat.birthtimeMs || 0,
          )
          if (conservativeMtime >= cutoff) {
            result.skippedFiles += 1
            continue
          }
          candidates.push({ relativePath, fullPath, size: stat.size })
        } catch (error) {
          result.skippedFiles += 1
          this.logger.warn(
            `Unable to inspect upload ${relativePath}: ${String(error)}`,
          )
        }
      }
    }
    return candidates
  }

  private isContained(root: string, file: string): boolean {
    const pathFromRoot = relative(root, file)
    return (
      pathFromRoot !== '' &&
      pathFromRoot !== '..' &&
      !pathFromRoot.startsWith(`..${sep}`) &&
      !isAbsolute(pathFromRoot)
    )
  }

  private async removeEmptyUserDirectories(root: string): Promise<void> {
    for (const user of await readdir(root, { withFileTypes: true })) {
      if (
        !user.isDirectory() ||
        user.isSymbolicLink() ||
        !SAFE_USER_DIRECTORY.test(user.name)
      )
        continue
      try {
        const directory = join(root, user.name)
        const stat = await lstat(directory)
        if (stat.isDirectory() && !stat.isSymbolicLink()) await rmdir(directory)
      } catch (error) {
        if (
          (error as NodeJS.ErrnoException).code !== 'ENOTEMPTY' &&
          (error as NodeJS.ErrnoException).code !== 'ENOENT'
        ) {
          this.logger.warn(
            `Unable to remove empty upload directory ${user.name}: ${String(error)}`,
          )
        }
      }
    }
  }
}
