import { QuizVisibility } from '@klurigo/common'
import { getQueueToken } from '@nestjs/bullmq'
import { INestApplication, Logger } from '@nestjs/common'
import { getModelToken } from '@nestjs/mongoose'
import { Queue } from 'bullmq'
import supertest from 'supertest'
import { v4 as uuidv4 } from 'uuid'

import {
  buildMockSecondaryUser,
  createMockClassicQuizRequestDto,
  createMockZeroToOneHundredQuizRequestDto,
} from '../../../../test-utils/data'
import {
  cleanupTestApp,
  createBearerAuthHeader,
  createDefaultUserAndAuthenticate,
  createTestApp,
} from '../../../../test-utils/utils'
import { GameRepository } from '../../game-core/repositories'
import {
  Game,
  GameModel,
  TaskType,
} from '../../game-core/repositories/models/schemas'
import type { GameDocument } from '../../game-core/repositories/models/schemas'
import {
  GameTaskTransitionScheduler,
  TASK_QUEUE_NAME,
} from '../../game-task/services'
import { QuizService } from '../../quiz-api/services'
import { User, UserModel } from '../../user/repositories'
import { GameService } from '../services'

describe('QuizGameController (e2e)', () => {
  let app: INestApplication
  let quizService: QuizService
  let gameService: GameService
  let userModel: UserModel
  let gameModel: GameModel
  let gameRepository: GameRepository
  let taskQueue: Queue

  beforeEach(async () => {
    app = await createTestApp()
    quizService = app.get(QuizService)
    gameService = app.get(GameService)
    userModel = app.get<UserModel>(getModelToken(User.name))
    gameModel = app.get<GameModel>(getModelToken(Game.name))
    gameRepository = app.get(GameRepository)
    taskQueue = app.get<Queue>(getQueueToken(TASK_QUEUE_NAME))
  })

  afterEach(async () => {
    await cleanupTestApp(app)
  })

  describe('/api/quizzes/:quizId/games (POST)', () => {
    it('should succeed in creating a new game from an existing classic mode quiz', async () => {
      const { accessToken, user } = await createDefaultUserAndAuthenticate(app)

      const originalQuiz = await quizService.createQuiz(
        createMockClassicQuizRequestDto(),
        user,
      )

      return supertest(app.getHttpServer())
        .post(`/api/quizzes/${originalQuiz.id}/games`)
        .set(createBearerAuthHeader(accessToken))
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id')
        })
    })

    it('keeps a created game recoverable when queue inspection fails before its first schedule is persisted', async () => {
      const { accessToken, user } = await createDefaultUserAndAuthenticate(app)
      const originalQuiz = await quizService.createQuiz(
        createMockClassicQuizRequestDto(),
        user,
      )
      const queueInspection = jest
        .spyOn(taskQueue, 'getJob')
        .mockRejectedValueOnce(new Error('simulated queue inspection failure'))
      const gameLogger = (gameService as unknown as { logger: Logger }).logger
      const log = jest.spyOn(gameLogger, 'log')
      const error = jest.spyOn(gameLogger, 'error')

      try {
        await supertest(app.getHttpServer())
          .post(`/api/quizzes/${originalQuiz.id}/games`)
          .set(createBearerAuthHeader(accessToken))
          .expect(503)
      } finally {
        queueInspection.mockRestore()
      }

      const persistedGames = await gameModel
        .find({ quiz: originalQuiz.id as never })
        .exec()
      const persistedGame = persistedGames[0] as GameDocument | undefined
      expect(persistedGame).toBeDefined()
      expect(persistedGame?.currentTask).toMatchObject({
        type: TaskType.Lobby,
        status: 'pending',
      })
      expect(persistedGame?.pendingTransitionOperations).toEqual([
        expect.objectContaining({
          operation: 'schedule',
          taskId: persistedGame?.currentTask._id,
          taskType: persistedGame?.currentTask.type,
          taskStatus: persistedGame?.currentTask.status,
        }),
      ])
      expect(log).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Game persisted during creation.',
          gameId: persistedGame?._id,
          persistenceSucceeded: true,
        }),
      )
      expect(error).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Game persisted but initial task scheduling failed.',
          gameId: persistedGame?._id,
          persistenceSucceeded: true,
          pendingTransitionOperationIds: [
            `schedule-${persistedGame?._id}-${persistedGame?.currentTask._id}-${persistedGame?.currentTask.type}-${persistedGame?.currentTask.status}`,
          ],
        }),
      )

      await app
        .get(GameTaskTransitionScheduler)
        .recoverPendingTransitionOperations()

      const recovered = await gameModel.findById(persistedGame?._id).exec()
      expect(recovered?.currentTask.currentTransitionExpires).toBeInstanceOf(
        Date,
      )
      expect(recovered?.pendingTransitionOperations ?? []).toEqual([])
      await expect(
        taskQueue.getJob(
          `transition-${recovered?.currentTask._id}_${recovered?.currentTask.type}_${recovered?.currentTask.status}`,
        ),
      ).resolves.toBeDefined()
      log.mockRestore()
      error.mockRestore()
    })

    it('continues game creation after a response timeout and preserves the existing duplicate-on-retry contract', async () => {
      const { accessToken, user } = await createDefaultUserAndAuthenticate(app)
      const quiz = await quizService.createQuiz(
        createMockClassicQuizRequestDto(),
        user,
      )
      const scheduler = app.get(GameTaskTransitionScheduler)
      const createGame = gameRepository.createGame.bind(gameRepository)
      const scheduleTaskTransition =
        scheduler.scheduleTaskTransition.bind(scheduler)
      let persistedGame: GameDocument | undefined
      let signalPersisted!: () => void
      const persisted = new Promise<void>((resolve) => {
        signalPersisted = resolve
      })
      let releaseCreate!: () => void
      const createGate = new Promise<void>((resolve) => {
        releaseCreate = resolve
      })
      let signalSchedulingCompleted!: () => void
      const schedulingCompleted = new Promise<void>((resolve) => {
        signalSchedulingCompleted = resolve
      })
      const delayedCreate = jest
        .spyOn(gameRepository, 'createGame')
        .mockImplementationOnce(async (quizDocument, host) => {
          const created = await createGame(quizDocument, host)
          persistedGame = created
          signalPersisted()
          await createGate
          return created
        })
      const observedSchedule = jest
        .spyOn(scheduler, 'scheduleTaskTransition')
        .mockImplementation(async (document) => {
          try {
            await scheduleTaskTransition(document)
          } finally {
            if (document === persistedGame) signalSchedulingCompleted()
          }
        })
      const responsePromise = (async () =>
        await supertest(app.getHttpServer())
          .post(`/api/quizzes/${quiz.id}/games`)
          .set(createBearerAuthHeader(accessToken))
          .expect(408))()

      try {
        await persisted
        if (!persistedGame) throw new Error('Expected the created game')
        const firstGameId = persistedGame._id
        await expect(
          gameModel.findById(firstGameId).exec(),
        ).resolves.toBeDefined()
        expect(persistedGame.pendingTransitionOperations).toEqual([
          expect.objectContaining({
            operation: 'schedule',
            taskId: persistedGame.currentTask._id,
          }),
        ])

        await responsePromise
        releaseCreate()
        await schedulingCompleted

        const retryResponse = await supertest(app.getHttpServer())
          .post(`/api/quizzes/${quiz.id}/games`)
          .set(createBearerAuthHeader(accessToken))
          .expect(201)
        expect(retryResponse.body.id).not.toBe(firstGameId)
        const games = await gameModel.find({ quiz: quiz.id as never }).exec()
        expect(games).toHaveLength(2)
        await expect(
          gameModel.findById(firstGameId).exec(),
        ).resolves.toBeDefined()
        await expect(
          gameModel.findById(retryResponse.body.id).exec(),
        ).resolves.toBeDefined()
      } finally {
        releaseCreate()
        delayedCreate.mockRestore()
        observedSchedule.mockRestore()
        await Promise.allSettled([responsePromise, schedulingCompleted])
      }
    }, 15_000)

    it('should succeed in creating a new game from an existing zero-to-one-hundred mode quiz', async () => {
      const { accessToken, user } = await createDefaultUserAndAuthenticate(app)

      const originalQuiz = await quizService.createQuiz(
        createMockZeroToOneHundredQuizRequestDto(),
        user,
      )

      return supertest(app.getHttpServer())
        .post(`/api/quizzes/${originalQuiz.id}/games`)
        .set(createBearerAuthHeader(accessToken))
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id')
        })
    })

    it('should fail in creating a new game from a non existing quiz', async () => {
      const quizId = uuidv4()

      const { accessToken } = await createDefaultUserAndAuthenticate(app)

      return supertest(app.getHttpServer())
        .post(`/api/quizzes/${quizId}/games`)
        .set(createBearerAuthHeader(accessToken))
        .expect(404)
        .expect((res) => {
          expect(res.body).toHaveProperty(
            'message',
            `Quiz was not found by id '${quizId}'`,
          )
          expect(res.body).toHaveProperty('status', 404)
          expect(res.body).toHaveProperty('timestamp')
        })
    })

    it('should succeed in creating a new game from public quiz', async () => {
      const anotherUser = await userModel.create(buildMockSecondaryUser())

      const { id } = await quizService.createQuiz(
        createMockClassicQuizRequestDto({ visibility: QuizVisibility.Public }),
        anotherUser,
      )

      const { accessToken } = await createDefaultUserAndAuthenticate(app)

      return supertest(app.getHttpServer())
        .post(`/api/quizzes/${id}/games`)
        .set(createBearerAuthHeader(accessToken))
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id')
        })
    })

    it('should fail in creating a new game from a non authorized quiz', async () => {
      const anotherUser = await userModel.create(buildMockSecondaryUser())

      const { id } = await quizService.createQuiz(
        createMockZeroToOneHundredQuizRequestDto({
          visibility: QuizVisibility.Private,
        }),
        anotherUser,
      )

      const { accessToken } = await createDefaultUserAndAuthenticate(app)

      return supertest(app.getHttpServer())
        .post(`/api/quizzes/${id}/games`)
        .set(createBearerAuthHeader(accessToken))
        .expect(403)
        .expect((res) => {
          expect(res.body).toHaveProperty('message', 'Forbidden')
          expect(res.body).toHaveProperty('status', 403)
          expect(res.body).toHaveProperty('timestamp')
        })
    })
  })
})
