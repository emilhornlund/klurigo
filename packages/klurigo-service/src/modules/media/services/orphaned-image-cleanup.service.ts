import { lstat, readdir, unlink } from 'node:fs/promises'
import { basename, join, resolve } from 'node:path'

import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Cron } from '@nestjs/schedule'
import { MurLock } from 'murlock'

import { EnvironmentVariables } from '../../../app/config'
import { QuizRepository } from '../../quiz-core/repositories'

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const MANAGED_UPLOAD_PATH =
  /^\/uploads\/images\/([0-9a-f-]+)\/([0-9a-f-]+\.webp)$/i

type ImageFile = {
  path: string
  relativePath: string
  modifiedAt: Date
  size: number
  inode: number
}

@Injectable()
export class OrphanedImageCleanupService {
  private readonly logger = new Logger(OrphanedImageCleanupService.name)

  constructor(
    private readonly configService: ConfigService<EnvironmentVariables>,
    private readonly quizRepository: QuizRepository,
  ) {}

  /** Runs daily at 03:30 UTC, coordinated across instances through Redis. */
  @Cron('0 30 3 * * *', { timeZone: 'UTC' })
  @MurLock(48 * 60 * 60 * 1000, 'scheduled_orphaned_image_cleanup_lock')
  public async clean(): Promise<void> {
    const startedAt = Date.now()
    const uploadDirectory = this.configService.get<string>('UPLOAD_DIRECTORY')
    const dryRun =
      this.configService.get<boolean>('ORPHANED_IMAGE_CLEANUP_DRY_RUN', {
        infer: true,
      }) ?? true
    const retentionDays =
      this.configService.get<number>('ORPHANED_IMAGE_RETENTION_DAYS', {
        infer: true,
      }) ?? 7
    const counts = {
      scanned: 0,
      skipped: 0,
      deleted: 0,
      failures: 0,
      reclaimedBytes: 0,
    }

    if (!uploadDirectory) {
      this.logger.error(
        'Orphaned image cleanup failed: upload directory is not configured.',
      )
      return
    }

    try {
      const root = resolve(uploadDirectory)
      const rootInfo = await lstat(root)
      if (!rootInfo.isDirectory() || rootInfo.isSymbolicLink()) {
        throw new Error('Upload directory is not a real directory.')
      }

      const candidates = await this.scan(root, counts)
      // Reference discovery must succeed before any deletion is attempted.
      let references = await this.quizRepository.findImageReferences()
      const referenced = new Set(
        references.flatMap(OrphanedImageCleanupService.managedKeys),
      )
      const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000

      for (const candidate of candidates) {
        if (candidate.modifiedAt.getTime() >= cutoff) {
          counts.skipped++
          continue
        }
        if (referenced.has(candidate.relativePath)) {
          counts.skipped++
          continue
        }

        if (dryRun) {
          counts.reclaimedBytes += candidate.size
          this.logger.log(
            `Orphaned image cleanup dry-run candidate: ${candidate.relativePath}`,
          )
          continue
        }

        // Re-query immediately before unlinking so a reference committed after
        // the initial discovery pass prevents deletion, including shared refs.
        references = await this.quizRepository.findImageReferences()
        if (
          new Set(
            references.flatMap(OrphanedImageCleanupService.managedKeys),
          ).has(candidate.relativePath)
        ) {
          counts.skipped++
          continue
        }

        const current = await lstat(candidate.path)
        if (!current.isFile() || current.isSymbolicLink()) {
          counts.skipped++
          continue
        }
        if (current.mtimeMs >= cutoff || current.ino !== candidate.inode) {
          counts.skipped++
          continue
        }
        try {
          await unlink(candidate.path)
          counts.deleted++
          counts.reclaimedBytes += current.size
          this.logger.log(
            `Deleted orphaned image: ${candidate.relativePath} (${current.size} bytes)`,
          )
        } catch (error) {
          counts.failures++
          this.logger.error(
            `Failed to delete orphaned image ${candidate.relativePath}: ${String(error)}`,
          )
        }
      }
    } catch (error) {
      counts.failures++
      this.logger.error(`Orphaned image cleanup failed: ${String(error)}`)
    } finally {
      this.logger.log(
        `Orphaned image cleanup finished: ${JSON.stringify({ ...counts, dryRun, durationMs: Date.now() - startedAt })}`,
      )
    }
  }

  private async scan(
    root: string,
    counts: { scanned: number; skipped: number },
  ): Promise<ImageFile[]> {
    const candidates: ImageFile[] = []
    const users = await readdir(root, { withFileTypes: true })
    for (const user of users) {
      if (
        !UUID_PATTERN.test(user.name) ||
        !user.isDirectory() ||
        user.isSymbolicLink()
      ) {
        counts.skipped++
        continue
      }
      const userPath = join(root, user.name)
      const userInfo = await lstat(userPath)
      if (!userInfo.isDirectory() || userInfo.isSymbolicLink()) {
        counts.skipped++
        continue
      }
      for (const file of await readdir(userPath, { withFileTypes: true })) {
        counts.scanned++
        if (
          !UUID_PATTERN.test(file.name.replace(/\.webp$/i, '')) ||
          !file.name.endsWith('.webp') ||
          !file.isFile() ||
          file.isSymbolicLink()
        ) {
          counts.skipped++
          continue
        }
        const filePath = join(userPath, file.name)
        const fileInfo = await lstat(filePath)
        if (
          !fileInfo.isFile() ||
          fileInfo.isSymbolicLink() ||
          basename(filePath) !== file.name
        ) {
          counts.skipped++
          continue
        }
        candidates.push({
          path: filePath,
          relativePath: `${user.name}/${file.name}`,
          modifiedAt: fileInfo.mtime,
          size: fileInfo.size,
          inode: fileInfo.ino,
        })
      }
    }
    return candidates
  }

  private static managedKeys(url: string): string[] {
    try {
      const pathname = new URL(url, 'http://managed-upload.local').pathname
      const match = MANAGED_UPLOAD_PATH.exec(decodeURIComponent(pathname))
      if (
        !match ||
        !UUID_PATTERN.test(match[1]) ||
        !UUID_PATTERN.test(match[2].slice(0, -5))
      ) {
        return []
      }
      return [`${match[1]}/${match[2]}`]
    } catch {
      return []
    }
  }
}
