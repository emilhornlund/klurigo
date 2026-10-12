import {
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  symlink,
  utimes,
  writeFile,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { ConfigService } from '@nestjs/config'
import { v4 as uuidv4 } from 'uuid'

import { EnvironmentVariables } from '../../../app/config'
import { QuizRepository } from '../../quiz-core/repositories/quiz.repository'

import { OrphanedImageCleanupService } from './orphaned-image-cleanup.service'

jest.mock('node:fs/promises', () => {
  const actual = jest.requireActual('node:fs/promises')
  return {
    ...actual,
    readdir: jest.fn(actual.readdir),
    rm: jest.fn(actual.rm),
  }
})

jest.mock('murlock', () => ({
  MurLock:
    () =>
    (_target: unknown, _propertyKey: string, descriptor: PropertyDescriptor) =>
      descriptor,
}))

describe('OrphanedImageCleanupService', () => {
  let root: string
  let references: Set<string>
  let repository: jest.Mocked<
    Pick<
      QuizRepository,
      'findReferencedUploadedImages' | 'isUploadedImageReferenced'
    >
  >
  let service: OrphanedImageCleanupService
  const userId = '507f1f77bcf86cd799439011'
  const fixedNow = new Date('2026-10-12T12:00:00Z')

  const imagePath = (id: string) => `${userId}/${id}.webp`
  const diskPath = (id: string) => join(root, userId, `${id}.webp`)
  const createConfig = (dryRun: boolean) => ({
    get: jest.fn((key: string) => {
      if (key === 'UPLOAD_DIRECTORY') return root
      if (key === 'ORPHANED_IMAGE_RETENTION_DAYS') return 7
      if (key === 'ORPHANED_IMAGE_CLEANUP_DRY_RUN') return dryRun
      return undefined
    }),
  })
  const createImage = async (id = uuidv4(), ageDays = 10) => {
    await mkdir(join(root, userId), { recursive: true })
    const path = diskPath(id)
    await writeFile(path, 'webp-image')
    const timestamp = new Date(
      fixedNow.getTime() - ageDays * 24 * 60 * 60 * 1000,
    )
    await utimes(path, timestamp, timestamp)
    jest.setSystemTime(
      new Date(fixedNow.getTime() + (ageDays + 2) * 24 * 60 * 60 * 1000),
    )
    return { id, path }
  }

  beforeEach(async () => {
    jest.useFakeTimers().setSystemTime(fixedNow)
    root = await mkdtemp(join(tmpdir(), 'klurigo-image-cleanup-'))
    references = new Set()
    repository = {
      findReferencedUploadedImages: jest
        .fn()
        .mockImplementation(async () => new Set(references)),
      isUploadedImageReferenced: jest.fn().mockResolvedValue(false),
    }
    const config = createConfig(false)
    service = new OrphanedImageCleanupService(
      config as unknown as ConfigService<EnvironmentVariables>,
      repository as unknown as QuizRepository,
    )
  })

  afterEach(async () => {
    jest.useRealTimers()
    await rm(root, { recursive: true, force: true })
  })

  it('deletes old unreferenced uploads and removes their empty user directory', async () => {
    const image = await createImage()

    const result = await service.cleanOrphanedImages()

    expect(result).toMatchObject({
      scannedFiles: 1,
      orphanedCandidates: 1,
      deletedFiles: 1,
    })
    await expect(readFile(image.path)).rejects.toMatchObject({ code: 'ENOENT' })
    await expect(readdir(root)).resolves.toEqual([])
  })

  it('preserves referenced images, including shared references from quizzes', async () => {
    const image = await createImage()
    references.add(imagePath(image.id))

    const result = await service.cleanOrphanedImages()

    expect(result?.deletedFiles).toBe(0)
    expect(result?.referencedFiles).toBe(1)
    await expect(readFile(image.path)).resolves.toBeTruthy()
  })

  it('counts only referenced files actually found on disk', async () => {
    const image = await createImage()
    references.add(imagePath(image.id))
    references.add(imagePath(uuidv4()))

    const result = await service.cleanOrphanedImages()

    expect(result).toMatchObject({ scannedFiles: 1, referencedFiles: 1 })
  })

  it.each(['quiz deletion', 'question deletion', 'question image replacement'])(
    'cleans up an image orphaned by %s',
    async () => {
      const image = await createImage()
      references.add(imagePath(image.id))
      references.clear()

      const result = await service.cleanOrphanedImages()

      expect(result?.deletedFiles).toBe(1)
      await expect(readFile(image.path)).rejects.toMatchObject({
        code: 'ENOENT',
      })
    },
  )

  it('preserves unreferenced uploads younger than the retention period', async () => {
    const image = await createImage(uuidv4(), 2)

    const result = await service.cleanOrphanedImages()

    expect(result).toMatchObject({
      scannedFiles: 1,
      orphanedCandidates: 0,
      skippedFiles: 1,
    })
    await expect(readFile(image.path)).resolves.toBeTruthy()
  })

  it('preserves files exactly on the retention cutoff', async () => {
    const image = await createImage(uuidv4(), 2.5)

    const result = await service.cleanOrphanedImages()

    expect(result).toMatchObject({ orphanedCandidates: 0, deletedFiles: 0 })
    await expect(readFile(image.path)).resolves.toBeTruthy()
  })

  it('does not delete files in dry-run mode and reports potential reclaimed bytes', async () => {
    const image = await createImage()
    const config = createConfig(true)
    service = new OrphanedImageCleanupService(
      config as unknown as ConfigService<EnvironmentVariables>,
      repository as unknown as QuizRepository,
    )

    const result = await service.cleanOrphanedImages()

    expect(result).toMatchObject({
      dryRun: true,
      orphanedCandidates: 1,
      deletedFiles: 0,
    })
    expect(result?.bytesPotentiallyReclaimable).toBeGreaterThan(0)
    await expect(readFile(image.path)).resolves.toBeTruthy()
  })

  it('ignores unexpected filenames and external image references', async () => {
    const directory = join(root, userId)
    await mkdir(directory)
    const unrelated = join(directory, 'not-an-upload.jpg')
    await writeFile(unrelated, 'external')
    references.add('https://images.pexels.com/photos/123/photo.jpeg')

    const result = await service.cleanOrphanedImages()

    expect(result).toMatchObject({ scannedFiles: 0, orphanedCandidates: 0 })
    await expect(readFile(unrelated)).resolves.toBeTruthy()
  })

  it('skips symlinked uploads and continues cleaning regular files', async () => {
    await createImage()
    const directory = join(root, userId)
    const symlinkPath = diskPath(uuidv4())
    const externalFile = join(root, 'unrelated.txt')
    await writeFile(externalFile, 'outside managed user directory')
    await symlink(externalFile, symlinkPath)

    const result = await service.cleanOrphanedImages()

    expect(result).toMatchObject({ deletedFiles: 1, skippedFiles: 1 })
    await expect(readFile(symlinkPath, 'utf8')).resolves.toBe(
      'outside managed user directory',
    )
    await expect(readdir(directory)).resolves.toHaveLength(1)
  })

  it('aborts without deleting if reference discovery fails', async () => {
    const image = await createImage()
    repository.findReferencedUploadedImages.mockRejectedValueOnce(
      new Error('Mongo unavailable'),
    )

    const result = await service.cleanOrphanedImages()

    expect(result).toBeUndefined()
    await expect(readFile(image.path)).resolves.toBeTruthy()
  })

  it('aborts the entire run on an incomplete user-directory scan', async () => {
    const image = await createImage()
    const readdirMock = readdir as jest.Mock
    readdirMock
      .mockImplementationOnce(jest.requireActual('node:fs/promises').readdir)
      .mockRejectedValueOnce(new Error('permission denied'))

    const result = await service.cleanOrphanedImages()

    expect(result).toBeUndefined()
    await expect(readFile(image.path)).resolves.toBeTruthy()
    readdirMock.mockReset()
    readdirMock.mockImplementation(
      jest.requireActual('node:fs/promises').readdir,
    )
  })

  it('reports a failed remove without claiming reclaimed bytes', async () => {
    const image = await createImage()
    const removeMock = rm as jest.Mock
    removeMock.mockRejectedValueOnce(new Error('disk is read-only'))

    const result = await service.cleanOrphanedImages()

    expect(result).toMatchObject({
      deletionFailures: 1,
      deletedFiles: 0,
      bytesReclaimed: 0,
    })
    await expect(readFile(image.path)).resolves.toBeTruthy()
    removeMock.mockReset()
    removeMock.mockImplementation(jest.requireActual('node:fs/promises').rm)
  })

  it('preserves a candidate if it becomes referenced at the final recheck', async () => {
    const image = await createImage()
    repository.isUploadedImageReferenced.mockResolvedValueOnce(true)

    const result = await service.cleanOrphanedImages()

    expect(result).toMatchObject({
      orphanedCandidates: 1,
      deletedFiles: 0,
      skippedFiles: 1,
    })
    await expect(readFile(image.path)).resolves.toBeTruthy()
  })

  it('stops before deleting when the maximum lock lease window is reached', async () => {
    const image = await createImage()
    repository.isUploadedImageReferenced.mockImplementationOnce(async () => {
      jest.setSystemTime(new Date(Date.now() + 9 * 60 * 1000))
      return false
    })

    const result = await service.cleanOrphanedImages()

    expect(result).toBeUndefined()
    await expect(readFile(image.path)).resolves.toBeTruthy()
  })

  it('handles a missing upload directory without throwing', async () => {
    await rm(root, { recursive: true, force: true })

    await expect(service.cleanOrphanedImages()).resolves.toBeUndefined()
  })
})
