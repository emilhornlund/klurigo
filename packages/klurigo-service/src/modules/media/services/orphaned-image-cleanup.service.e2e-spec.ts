import { mkdir, mkdtemp, rm, stat, utimes, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { INestApplication } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { getConnectionToken, getModelToken } from '@nestjs/mongoose'
import { Connection, Model } from 'mongoose'
import { v4 as uuidv4 } from 'uuid'

import { createMockClassicQuiz } from '../../../../test-utils/data/quiz/quiz.data'
import { cleanupTestApp, createTestApp } from '../../../../test-utils/utils'
import { QuizRepository } from '../../quiz-core/repositories'
import { Quiz } from '../../quiz-core/repositories/models/schemas'

import { OrphanedImageCleanupService } from './orphaned-image-cleanup.service'

type ImageFixture = {
  key: string
  path: string
  url: string
}

describe('OrphanedImageCleanupService (e2e)', () => {
  let app: INestApplication
  let directory: string
  let quizRepository: QuizRepository
  let cleanupService: OrphanedImageCleanupService
  let configService: ConfigService
  let dryRun: boolean
  let retentionDays: number

  beforeEach(async () => {
    app = await createTestApp()
    directory = await mkdtemp(join(tmpdir(), 'klurigo-image-cleanup-e2e-'))
    quizRepository = app.get(QuizRepository)
    cleanupService = app.get(OrphanedImageCleanupService)
    configService = app.get(ConfigService)
    dryRun = false
    retentionDays = 7
    const readConfig = configService.get.bind(configService)
    jest.spyOn(configService, 'get').mockImplementation(((key: string) => {
      if (key === 'UPLOAD_DIRECTORY') return directory
      if (key === 'ORPHANED_IMAGE_RETENTION_DAYS') return retentionDays
      if (key === 'ORPHANED_IMAGE_CLEANUP_DRY_RUN') return dryRun
      return readConfig(key)
    }) as ConfigService['get'])
  })

  afterEach(async () => {
    try {
      await cleanupTestApp(app)
    } finally {
      jest.restoreAllMocks()
      await rm(directory, { recursive: true, force: true })
    }
  })

  it('preserves a referenced quiz cover image', async () => {
    const image = await createImage(8)
    await createQuizWithImage(image.url, 'cover')

    await cleanupService.clean()

    await expect(stat(image.path)).resolves.toBeDefined()
  })

  it('preserves referenced question media', async () => {
    const image = await createImage(8)
    await createQuizWithImage(image.url, 'media')

    await cleanupService.clean()

    await expect(stat(image.path)).resolves.toBeDefined()
  })

  it('preserves a referenced Pin question image', async () => {
    const image = await createImage(8)
    await createQuizWithImage(image.url, 'pin')

    await cleanupService.clean()

    await expect(stat(image.path)).resolves.toBeDefined()
  })

  it('retains a shared image until both quiz references are deleted', async () => {
    const image = await createImage(8)
    const firstQuizId = await createQuizWithImage(image.url, 'cover')
    const secondQuizId = await createQuizWithImage(image.url, 'media')

    await cleanupService.clean()
    await expect(stat(image.path)).resolves.toBeDefined()

    await quizRepository.deleteQuiz(firstQuizId)
    await cleanupService.clean()
    await expect(stat(image.path)).resolves.toBeDefined()

    await quizRepository.deleteQuiz(secondQuizId)
    await cleanupService.clean()
    await expect(stat(image.path)).rejects.toThrow()
  })

  it('physically deletes an old unreferenced image when dry-run is disabled', async () => {
    const image = await createImage(8)

    await cleanupService.clean()

    await expect(stat(image.path)).rejects.toThrow()
  })

  it('preserves a recent unreferenced image', async () => {
    const image = await createImage()

    await cleanupService.clean()

    await expect(stat(image.path)).resolves.toBeDefined()
  })

  it('eventually deletes an abandoned upload after its retention age expires', async () => {
    const image = await createImage()

    await cleanupService.clean()
    await expect(stat(image.path)).resolves.toBeDefined()

    await setFileAge(image.path, retentionDays + 1)
    await cleanupService.clean()

    await expect(stat(image.path)).rejects.toThrow()
  })

  it('deletes replaced and removed quiz images once they are no longer referenced', async () => {
    const original = await createImage(8)
    const replacement = await createImage(8)
    const quizId = await createQuizWithImage(original.url, 'cover')

    await quizRepository.updateQuiz(quizId, { imageCoverURL: replacement.url })
    await cleanupService.clean()

    await expect(stat(original.path)).rejects.toThrow()
    await expect(stat(replacement.path)).resolves.toBeDefined()

    await quizRepository.updateQuiz(quizId, { imageCoverURL: undefined })
    await cleanupService.clean()

    await expect(stat(replacement.path)).rejects.toThrow()
  })

  it('reports dry-run candidates without deleting their files', async () => {
    const image = await createImage(8)
    dryRun = true
    const logger = (cleanupService as unknown as { logger: { log: jest.Mock } })
      .logger
    const log = jest.spyOn(logger, 'log')

    await cleanupService.clean()

    await expect(stat(image.path)).resolves.toBeDefined()
    expect(log).toHaveBeenCalledWith(
      expect.stringContaining(`dry-run candidate: ${image.key}`),
    )
    expect(log).toHaveBeenCalledWith(
      expect.stringContaining(
        `"reclaimedBytes":${(await stat(image.path)).size}`,
      ),
    )
    expect(log).toHaveBeenCalledWith(expect.stringContaining('"deleted":0'))
  })

  it('fails closed when MongoDB reference discovery fails', async () => {
    const image = await createImage(8)
    const connection = app.get<Connection>(getConnectionToken())
    const quizModel = app.get<Model<Quiz>>(getModelToken(Quiz.name))
    const modelCollection = quizModel.collection as unknown as {
      buffer: boolean
    }
    const wasBuffering = modelCollection.buffer
    modelCollection.buffer = false
    const mongoHost = configService.get<string>('MONGODB_HOST')
    const mongoPort = configService.get<number>('MONGODB_PORT')
    const mongoDatabase = configService.get<string>('MONGODB_DB')
    const mongoUri = `mongodb://${mongoHost}:${mongoPort}/${mongoDatabase}`
    const error = jest.spyOn(
      (cleanupService as unknown as { logger: { error: jest.Mock } }).logger,
      'error',
    )

    await connection.close()
    try {
      await cleanupService.clean()
    } finally {
      await connection.openUri(mongoUri)
      modelCollection.buffer = wasBuffering
    }

    await expect(stat(image.path)).resolves.toBeDefined()
    expect(error).toHaveBeenCalledWith(
      expect.stringContaining('Orphaned image cleanup failed'),
    )
  })

  async function createImage(ageDays?: number): Promise<ImageFixture> {
    const userId = uuidv4()
    const imageId = uuidv4()
    const key = `${userId}/${imageId}.webp`
    const userDirectory = join(directory, userId)
    const path = join(userDirectory, `${imageId}.webp`)
    await mkdir(userDirectory)
    await writeFile(path, `image ${imageId}`)
    if (ageDays !== undefined) await setFileAge(path, ageDays)
    return {
      key,
      path,
      url: `https://different-host.example/uploads/images/${key}`,
    }
  }

  async function setFileAge(path: string, ageDays: number): Promise<void> {
    const old = new Date(Date.now() - ageDays * 24 * 60 * 60 * 1000)
    await utimes(path, old, old)
  }

  async function createQuizWithImage(
    url: string,
    location: 'cover' | 'media' | 'pin',
  ): Promise<string> {
    const id = uuidv4()
    const quiz = createMockClassicQuiz({
      _id: id,
      imageCoverURL: location === 'cover' ? url : undefined,
    })
    if (location === 'media') {
      ;(quiz.questions[0]! as { media: { url: string } }).media.url = url
    }
    if (location === 'pin') {
      ;(quiz.questions[4]! as { imageURL: string }).imageURL = url
    }
    await quizRepository.createQuiz(quiz)
    return id
  }
})
