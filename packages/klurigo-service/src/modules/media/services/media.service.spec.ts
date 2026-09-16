import { mkdir, mkdtemp, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import type { Cache } from '@nestjs/cache-manager'
import { ConfigService } from '@nestjs/config'

import { EnvironmentVariables } from '../../../app/config'
import { UploadedPhotoNotFoundException } from '../exceptions'

import { MediaService } from './media.service'
import { PexelsMediaSearchService } from './pexels-media-search.service'

describe(MediaService.name, () => {
  let service: MediaService
  let uploadDirectory: string
  let cacheManager: { get: jest.Mock; set: jest.Mock }
  let configService: { get: jest.Mock }
  let pexelsMediaSearchService: { searchPhotos: jest.Mock }
  let logger: { log: jest.Mock }

  beforeEach(async () => {
    uploadDirectory = await mkdtemp(join(tmpdir(), 'klurigo-media-service-'))
    cacheManager = {
      get: jest.fn().mockResolvedValue(undefined),
      set: jest.fn(),
    }
    configService = { get: jest.fn().mockReturnValue(uploadDirectory) }
    pexelsMediaSearchService = { searchPhotos: jest.fn() }
    logger = { log: jest.fn() }
    service = new MediaService(
      cacheManager as unknown as Cache,
      configService as unknown as ConfigService<EnvironmentVariables>,
      pexelsMediaSearchService as unknown as PexelsMediaSearchService,
      logger as any,
    )
  })

  afterEach(async () => {
    await rm(uploadDirectory, { recursive: true, force: true })
  })

  it('delegates photo searches with default pagination and caches the result', async () => {
    const response = { photos: [], total: 0, limit: 10, offset: 0 }
    pexelsMediaSearchService.searchPhotos.mockResolvedValue(response)

    await expect(service.searchPhotos('cats')).resolves.toEqual(response)

    expect(pexelsMediaSearchService.searchPhotos).toHaveBeenCalledWith(
      'cats',
      10,
      0,
    )
    expect(cacheManager.set).toHaveBeenCalledWith(
      expect.stringMatching(/^MediaService:searchPhotos:/),
      response,
      3_600_000,
    )
  })

  it('propagates photo search errors without caching a failed result', async () => {
    const error = new Error('Pexels unavailable')
    pexelsMediaSearchService.searchPhotos.mockRejectedValue(error)

    await expect(service.searchPhotos('cats', 5, 10)).rejects.toBe(error)
    expect(cacheManager.set).not.toHaveBeenCalled()
  })

  it('deletes an existing uploaded photo for its owner', async () => {
    const userId = 'user-1'
    const photoId = 'photo-1'
    const photoPath = join(uploadDirectory, userId, `${photoId}.webp`)
    await mkdir(join(uploadDirectory, userId))
    await writeFile(photoPath, 'photo')

    await service.deleteUploadPhoto(photoId, userId)

    await expect(stat(photoPath)).rejects.toThrow()
  })

  it('throws when an uploaded photo does not exist', async () => {
    await expect(
      service.deleteUploadPhoto('missing-photo', 'user-1'),
    ).rejects.toBeInstanceOf(UploadedPhotoNotFoundException)
  })

  it('throws when the upload directory is not configured', async () => {
    configService.get.mockReturnValue(undefined)

    await expect(
      service.deleteUploadPhoto('photo-1', 'user-1'),
    ).rejects.toThrow('Upload directory not found.')
  })
})
