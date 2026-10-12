import {
  mkdir,
  mkdtemp,
  rename,
  rm,
  stat,
  symlink,
  utimes,
  writeFile,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { ConfigService } from '@nestjs/config'

import { EnvironmentVariables } from '../../../app/config'
import { QuizRepository } from '../../quiz-core/repositories'

import { OrphanedImageCleanupService } from './orphaned-image-cleanup.service'

jest.mock('murlock', () => ({
  MurLock:
    () =>
    (
      _target: unknown,
      _propertyKey: string | symbol,
      descriptor: PropertyDescriptor,
    ) =>
      descriptor,
}))

const userId = '11111111-1111-4111-8111-111111111111'
const imageId = '22222222-2222-4222-8222-222222222222'
const imageUrl = (host = 'images.example.com', id = imageId) =>
  `https://${host}/uploads/images/${userId}/${id}.webp`

describe(OrphanedImageCleanupService.name, () => {
  let directory: string
  let filePath: string
  let service: OrphanedImageCleanupService
  let config: { get: jest.Mock }
  let quizRepository: { findImageReferences: jest.Mock }

  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'klurigo-orphan-cleanup-'))
    filePath = join(directory, userId, `${imageId}.webp`)
    await mkdir(join(directory, userId))
    await writeFile(filePath, 'orphan image data')
    const old = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000)
    await utimes(filePath, old, old)
    config = {
      get: jest.fn((key: string) => {
        if (key === 'UPLOAD_DIRECTORY') return directory
        if (key === 'ORPHANED_IMAGE_RETENTION_DAYS') return 7
        if (key === 'ORPHANED_IMAGE_CLEANUP_DRY_RUN') return true
        return undefined
      }),
    }
    quizRepository = { findImageReferences: jest.fn().mockResolvedValue([]) }
    service = new OrphanedImageCleanupService(
      config as unknown as ConfigService<EnvironmentVariables>,
      quizRepository as unknown as QuizRepository,
    )
  })

  afterEach(async () => {
    jest.restoreAllMocks()
    await rm(directory, { recursive: true, force: true })
  })

  it('keeps an old image referenced regardless of URL hostname', async () => {
    quizRepository.findImageReferences.mockResolvedValue([
      imageUrl('other.host'),
    ])

    await service.clean()

    await expect(stat(filePath)).resolves.toBeDefined()
    expect(quizRepository.findImageReferences).toHaveBeenCalledTimes(1)
  })

  it('normalizes references from covers, media, and pin-image fields', async () => {
    const otherId = '33333333-3333-4333-8333-333333333333'
    const secondFile = join(directory, userId, `${otherId}.webp`)
    await writeFile(secondFile, 'referenced')
    const old = new Date(Date.now() - 9 * 86_400_000)
    await utimes(secondFile, old, old)
    quizRepository.findImageReferences.mockResolvedValue([
      imageUrl('cover-host'),
      imageUrl('media-host', otherId),
    ])

    await service.clean()

    await expect(stat(filePath)).resolves.toBeDefined()
    await expect(stat(secondFile)).resolves.toBeDefined()
  })

  it('logs dry-run candidates without deleting them', async () => {
    const log = jest.spyOn((service as any).logger, 'log')

    await service.clean()

    await expect(stat(filePath)).resolves.toBeDefined()
    expect(log).toHaveBeenCalledWith(
      expect.stringContaining('dry-run candidate'),
    )
    expect(log).toHaveBeenCalledWith(expect.stringContaining('"scanned":1'))
  })

  it('retains unreferenced images younger than the configured retention period', async () => {
    config.get.mockImplementation((key: string) =>
      key === 'UPLOAD_DIRECTORY'
        ? directory
        : key === 'ORPHANED_IMAGE_CLEANUP_DRY_RUN'
          ? false
          : key === 'ORPHANED_IMAGE_RETENTION_DAYS'
            ? 7
            : undefined,
    )
    const recent = new Date(Date.now() - 24 * 60 * 60 * 1000)
    await utimes(filePath, recent, recent)

    await service.clean()

    await expect(stat(filePath)).resolves.toBeDefined()
    expect(quizRepository.findImageReferences).toHaveBeenCalledTimes(1)
  })

  it('deletes an old unreferenced image when dry-run is disabled and reports bytes', async () => {
    config.get.mockImplementation((key: string) => {
      if (key === 'UPLOAD_DIRECTORY') return directory
      if (key === 'ORPHANED_IMAGE_RETENTION_DAYS') return 7
      if (key === 'ORPHANED_IMAGE_CLEANUP_DRY_RUN') return false
      return undefined
    })
    const log = jest.spyOn((service as any).logger, 'log')

    await service.clean()

    await expect(stat(filePath)).rejects.toThrow()
    expect(quizRepository.findImageReferences).toHaveBeenCalledTimes(2)
    expect(log).toHaveBeenCalledWith(expect.stringContaining('"deleted":1'))
    expect(log).toHaveBeenCalledWith(
      expect.stringContaining('"reclaimedBytes":17'),
    )
  })

  it('rechecks Mongo references immediately before deleting', async () => {
    config.get.mockImplementation((key: string) =>
      key === 'UPLOAD_DIRECTORY'
        ? directory
        : key === 'ORPHANED_IMAGE_CLEANUP_DRY_RUN'
          ? false
          : key === 'ORPHANED_IMAGE_RETENTION_DAYS'
            ? 7
            : undefined,
    )
    quizRepository.findImageReferences
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([imageUrl('new-host')])

    await service.clean()

    await expect(stat(filePath)).resolves.toBeDefined()
    expect(quizRepository.findImageReferences).toHaveBeenCalledTimes(2)
  })

  it('skips a replaced file rather than deleting a different inode', async () => {
    config.get.mockImplementation((key: string) =>
      key === 'UPLOAD_DIRECTORY'
        ? directory
        : key === 'ORPHANED_IMAGE_CLEANUP_DRY_RUN'
          ? false
          : 7,
    )
    quizRepository.findImageReferences.mockImplementation(async () => {
      if (quizRepository.findImageReferences.mock.calls.length === 2) {
        const replacement = join(directory, userId, 'replacement.webp')
        await writeFile(replacement, 'new file')
        const old = new Date(Date.now() - 9 * 86_400_000)
        await utimes(replacement, old, old)
        await rename(replacement, filePath)
      }
      return []
    })

    await service.clean()

    await expect(stat(filePath)).resolves.toBeDefined()
    expect(quizRepository.findImageReferences).toHaveBeenCalledTimes(2)
  })

  it('fails closed when the candidate disappears during the deletion check', async () => {
    config.get.mockImplementation((key: string) =>
      key === 'UPLOAD_DIRECTORY'
        ? directory
        : key === 'ORPHANED_IMAGE_CLEANUP_DRY_RUN'
          ? false
          : 7,
    )
    quizRepository.findImageReferences.mockImplementation(async () => {
      if (quizRepository.findImageReferences.mock.calls.length === 2) {
        await rm(filePath)
      }
      return []
    })
    const error = jest.spyOn((service as any).logger, 'error')

    await service.clean()

    expect(error).toHaveBeenCalledWith(expect.stringContaining('ENOENT'))
  })

  it('skips a symlink substituted during the final reference check', async () => {
    config.get.mockImplementation((key: string) =>
      key === 'UPLOAD_DIRECTORY'
        ? directory
        : key === 'ORPHANED_IMAGE_CLEANUP_DRY_RUN'
          ? false
          : 7,
    )
    quizRepository.findImageReferences.mockImplementation(async () => {
      if (quizRepository.findImageReferences.mock.calls.length === 2) {
        await rm(filePath)
        await symlink(join(directory, 'outside.webp'), filePath)
      }
      return []
    })

    await service.clean()

    expect(quizRepository.findImageReferences).toHaveBeenCalledTimes(2)
    await expect(stat(filePath)).rejects.toThrow()
  })

  it('skips a file whose modification time changes before deletion', async () => {
    config.get.mockImplementation((key: string) =>
      key === 'UPLOAD_DIRECTORY'
        ? directory
        : key === 'ORPHANED_IMAGE_CLEANUP_DRY_RUN'
          ? false
          : 7,
    )
    quizRepository.findImageReferences.mockImplementation(async () => {
      if (quizRepository.findImageReferences.mock.calls.length === 2) {
        const recent = new Date()
        await utimes(filePath, recent, recent)
      }
      return []
    })

    await service.clean()

    await expect(stat(filePath)).resolves.toBeDefined()
  })

  it('fails closed when Mongo reference discovery fails', async () => {
    config.get.mockImplementation((key: string) =>
      key === 'UPLOAD_DIRECTORY'
        ? directory
        : key === 'ORPHANED_IMAGE_CLEANUP_DRY_RUN'
          ? false
          : 7,
    )
    quizRepository.findImageReferences.mockRejectedValue(
      new Error('Mongo unavailable'),
    )
    const error = jest.spyOn((service as any).logger, 'error')

    await service.clean()

    await expect(stat(filePath)).resolves.toBeDefined()
    expect(error).toHaveBeenCalledWith(
      expect.stringContaining('Mongo unavailable'),
    )
  })

  it('skips unsafe symlinks and unrelated files', async () => {
    const outside = join(directory, 'outside.webp')
    await writeFile(outside, 'do not touch')
    await symlink(
      outside,
      join(directory, userId, '44444444-4444-4444-8444-444444444444.webp'),
    )
    await writeFile(join(directory, userId, 'notes.txt'), 'unrelated')

    await service.clean()

    await expect(stat(outside)).resolves.toBeDefined()
    await expect(stat(filePath)).resolves.toBeDefined()
  })

  it('fails closed when the upload directory cannot be scanned', async () => {
    config.get.mockImplementation((key: string) =>
      key === 'UPLOAD_DIRECTORY' ? join(directory, 'missing') : true,
    )
    const error = jest.spyOn((service as any).logger, 'error')

    await service.clean()

    expect(quizRepository.findImageReferences).not.toHaveBeenCalled()
    expect(error).toHaveBeenCalled()
  })

  it('does not scan when the upload directory is not configured', async () => {
    config.get.mockReturnValue(undefined)
    const error = jest.spyOn((service as any).logger, 'error')

    await service.clean()

    expect(quizRepository.findImageReferences).not.toHaveBeenCalled()
    expect(error).toHaveBeenCalledWith(
      'Orphaned image cleanup failed: upload directory is not configured.',
    )
  })

  it('rejects a symlink upload root', async () => {
    const linkedDirectory = join(directory, 'linked-root')
    await symlink(join(directory, userId), linkedDirectory)
    config.get.mockImplementation((key: string) =>
      key === 'UPLOAD_DIRECTORY' ? linkedDirectory : true,
    )
    const error = jest.spyOn((service as any).logger, 'error')

    await service.clean()

    expect(quizRepository.findImageReferences).not.toHaveBeenCalled()
    expect(error).toHaveBeenCalledWith(
      expect.stringContaining('Upload directory is not a real directory.'),
    )
  })

  it('ignores malformed URLs and external images', async () => {
    quizRepository.findImageReferences.mockResolvedValue([
      'https://external.example/images/photo.webp',
      'https://[invalid-url',
      `/uploads/images/not-a-uuid/${imageId}.webp`,
    ])

    await service.clean()

    await expect(stat(filePath)).resolves.toBeDefined()
  })
})
