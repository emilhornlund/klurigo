import { mkdir, mkdtemp, rm, stat, utimes, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { INestApplication } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { v4 as uuidv4 } from 'uuid'

import { createMockClassicQuiz } from '../../../../test-utils/data/quiz/quiz.data'
import { cleanupTestApp, createTestApp } from '../../../../test-utils/utils'
import { QuizRepository } from '../../quiz-core/repositories'

import { OrphanedImageCleanupService } from './orphaned-image-cleanup.service'

describe('OrphanedImageCleanupService (e2e)', () => {
  let app: INestApplication
  let directory: string
  let imagePath: string
  let imageKey: string
  let targetUrl: string
  let quizIds: string[]
  let quizRepository: QuizRepository
  let cleanupService: OrphanedImageCleanupService
  let configService: ConfigService

  beforeEach(async () => {
    app = await createTestApp()
    directory = await mkdtemp(join(tmpdir(), 'klurigo-image-cleanup-e2e-'))
    quizRepository = app.get(QuizRepository)
    cleanupService = app.get(OrphanedImageCleanupService)
    configService = app.get(ConfigService)
    jest.spyOn(configService, 'get').mockImplementation(((key: string) => {
      if (key === 'UPLOAD_DIRECTORY') return directory
      if (key === 'ORPHANED_IMAGE_RETENTION_DAYS') return 7
      if (key === 'ORPHANED_IMAGE_CLEANUP_DRY_RUN') return false
      return undefined
    }) as ConfigService['get'])
    const userId = uuidv4()
    const imageId = uuidv4()
    imageKey = `${userId}/${imageId}.webp`
    targetUrl = `https://different-host.example/uploads/images/${imageKey}`
    imagePath = join(directory, userId, `${imageId}.webp`)
    await mkdir(join(directory, userId))
    await writeFile(imagePath, 'shared old image')
    const old = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000)
    await utimes(imagePath, old, old)

    quizIds = [uuidv4(), uuidv4()]
    for (const quizId of quizIds) {
      const quiz = createMockClassicQuiz({
        _id: quizId,
        imageCoverURL: targetUrl,
      })
      ;(quiz.questions[0]! as { media: { url: string } }).media.url = targetUrl
      ;(quiz.questions[4]! as { imageURL: string }).imageURL = targetUrl
      await quizRepository.createQuiz(quiz)
    }
  })

  afterEach(async () => {
    await cleanupTestApp(app)
    await rm(directory, { recursive: true, force: true })
  })

  it('retains shared references, then deletes only after all quizzes are removed', async () => {
    await cleanupService.clean()
    await expect(stat(imagePath)).resolves.toBeDefined()

    const references = await quizRepository.findImageReferences()
    expect(
      references.filter((reference) => reference === targetUrl),
    ).toHaveLength(6)

    await Promise.all(
      quizIds.map((quizId) => quizRepository.deleteQuiz(quizId)),
    )
    await cleanupService.clean()

    await expect(stat(imagePath)).rejects.toThrow()
  })
})
