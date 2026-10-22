import { GameMode, GameStatus } from '@klurigo/common'
import { INestApplication } from '@nestjs/common'
import { getModelToken } from '@nestjs/mongoose'
import { v4 as uuidv4 } from 'uuid'

import { cleanupTestApp, createTestApp } from '../../../../test-utils/utils'
import { Quiz } from '../../quiz-core/repositories/models/schemas'

import { GameRepository } from './game.repository'
import {
  BaseTask,
  Game,
  GameModel,
  LeaderboardTask,
  LobbyTask,
  PodiumTask,
  QuestionResultTask,
  QuestionTask,
  TaskType,
} from './models/schemas'

const ONE_HOUR = 60 * 60 * 1000
const ONE_SECOND = 1000

function calculateDateOneHourFiveSecondAgo(): Date {
  return new Date(Date.now() - ONE_HOUR - ONE_SECOND * 5)
}

function calculateDateOneHourMinusFiveSecondAgo(): Date {
  return new Date(Date.now() - ONE_HOUR + ONE_SECOND * 5)
}

describe('GameRepository (e2e)', () => {
  let app: INestApplication
  let gameRepository: GameRepository
  let gameModel: GameModel

  beforeEach(async () => {
    app = await createTestApp()
    gameRepository = app.get(GameRepository)
    gameModel = app.get<GameModel>(getModelToken(Game.name))
  })

  afterEach(async () => {
    await cleanupTestApp(app)
  })

  describe('updateCompletedGames', () => {
    it('should mark active podium games older than 1 hour as completed', async () => {
      const gameID = uuidv4()

      await gameModel.create(
        buildMockGame(
          gameID,
          buildMockPodiumTask(),
          calculateDateOneHourFiveSecondAgo(),
        ),
      )

      const actual = await gameRepository.updateCompletedGames()
      expect(actual).toEqual(1)

      const expected = await gameModel.findById(gameID)
      expect(expected).toBeDefined()
      expect(expected!.status).toEqual(GameStatus.Completed)
      expect(expected!.currentTask.type).toEqual(TaskType.Podium)
      expect(expected!.completedAt).toBeInstanceOf(Date)
      expect(expected!.updated.getTime()).toBeGreaterThan(
        expected!.created.getTime(),
      )
      expect(expected!.version).toBe(1)
    })

    it('should not mark active podium games not older than 1 hour as completed', async () => {
      const gameID = uuidv4()

      await gameModel.create(
        buildMockGame(
          gameID,
          buildMockPodiumTask(),
          calculateDateOneHourMinusFiveSecondAgo(),
        ),
      )

      const actual = await gameRepository.updateCompletedGames()
      expect(actual).toEqual(0)

      const expected = await gameModel.findById(gameID)
      expect(expected).toBeDefined()
      expect(expected!.status).toEqual(GameStatus.Active)
    })

    it('should not mark active leaderboard games older than 1 hour as completed', async () => {
      const gameID = uuidv4()

      await gameModel.create(
        buildMockGame(
          gameID,
          buildMockLeaderboardTask(),
          calculateDateOneHourFiveSecondAgo(),
        ),
      )

      const actual = await gameRepository.updateCompletedGames()
      expect(actual).toEqual(0)

      const expected = await gameModel.findById(gameID)
      expect(expected).toBeDefined()
      expect(expected!.status).toEqual(GameStatus.Active)
    })
  })

  describe('updateExpiredGames', () => {
    it('should update active games older than 1 hour', async () => {
      const gameID = uuidv4()

      await gameModel.create(
        buildMockGame(
          gameID,
          buildMockLeaderboardTask(),
          calculateDateOneHourFiveSecondAgo(),
        ),
      )

      const expiredCount = await gameRepository.updateExpiredGames()
      expect(expiredCount).toEqual(1)

      const expected = await gameModel.findById(gameID)
      expect(expected).toBeDefined()
      expect(expected!.status).toEqual(GameStatus.Expired)
      expect(expected!.currentTask.type).toEqual(TaskType.Leaderboard)
      expect(expected!.updated.getTime()).toBeGreaterThan(
        expected!.created.getTime(),
      )
      expect(expected!.version).toBe(1)

      const repeatedExpiredCount = await gameRepository.updateExpiredGames()
      expect(repeatedExpiredCount).toEqual(0)
    })

    it('should not update active games not older than 1 hour', async () => {
      const gameID = uuidv4()

      await gameModel.create(
        buildMockGame(
          gameID,
          buildMockLeaderboardTask(),
          calculateDateOneHourMinusFiveSecondAgo(),
        ),
      )

      const expiredCount = await gameRepository.updateExpiredGames()
      expect(expiredCount).toEqual(0)

      const expected = await gameModel.findById(gameID)
      expect(expected).toBeDefined()
      expect(expected!.status).toEqual(GameStatus.Active)
    })
  })

  describe('transition recovery pagination', () => {
    it('pages pending-operation games in stable order', async () => {
      const date = new Date()
      const operation = {
        id: 'schedule-task-LOBBY-pending',
        operation: 'schedule' as const,
        taskId: 'task-1',
        taskType: TaskType.Lobby,
        taskStatus: 'pending' as const,
      }
      await gameModel.create([
        {
          ...buildMockGame('pending-a', buildMockLobbyTask(), date),
          pendingTransitionOperations: [operation],
        },
        {
          ...buildMockGame('pending-b', buildMockLobbyTask(), date),
          pendingTransitionOperations: [{ ...operation, id: 'operation-b' }],
        },
        buildMockGame('pending-inactive', buildMockLobbyTask(), date),
      ])

      const firstPage =
        await gameRepository.findGamesWithPendingTransitionOperations(
          undefined,
          1,
        )
      const secondPage =
        await gameRepository.findGamesWithPendingTransitionOperations(
          firstPage[0]._id,
          1,
        )

      expect(firstPage.map(({ _id }) => _id)).toEqual(['pending-a'])
      expect(secondPage.map(({ _id }) => _id)).toEqual(['pending-b'])
    })

    it('pages only overdue active games without pending recovery operations', async () => {
      const date = new Date()
      const expiredAt = new Date(Date.now() - ONE_SECOND)
      const game = (gameId: string, pending = false) => {
        const document = buildMockGame(gameId, buildMockLobbyTask(), date)
        document.currentTask.currentTransitionExpires = expiredAt
        if (pending) {
          document.pendingTransitionOperations = [
            {
              id: `schedule-${gameId}`,
              operation: 'schedule',
              taskId: document.currentTask._id,
              taskType: document.currentTask.type,
              taskStatus: document.currentTask.status,
            },
          ]
        }
        return document
      }
      await gameModel.create([
        game('overdue-a'),
        game('overdue-b'),
        game('overdue-pending', true),
      ])

      const firstPage =
        await gameRepository.findGamesWithOverdueTaskTransitions(
          new Date(),
          undefined,
          1,
        )
      const secondPage =
        await gameRepository.findGamesWithOverdueTaskTransitions(
          new Date(),
          firstPage[0]._id,
          1,
        )

      expect(firstPage.map(({ _id }) => _id)).toEqual(['overdue-a'])
      expect(secondPage.map(({ _id }) => _id)).toEqual(['overdue-b'])
    })
  })

  describe('terminal answer cleanup', () => {
    it('selects legacy and incomplete terminal games in stable bounded pages', async () => {
      const date = new Date()
      await gameModel.create([
        {
          ...buildMockGame('cleanup-1', buildMockPodiumTask(), date),
          status: GameStatus.Expired,
        },
        {
          ...buildMockGame('cleanup-2', buildMockPodiumTask(), date),
          status: GameStatus.Terminated,
          transientAnswerStateCleared: false,
        },
        {
          ...buildMockGame('cleanup-3', buildMockPodiumTask(), date),
          status: GameStatus.Completed,
          transientAnswerStateCleared: true,
        },
        buildMockGame('cleanup-active', buildMockPodiumTask(), date),
      ])

      const firstPage =
        await gameRepository.findTerminalGamesPendingAnswerCleanup(undefined, 1)
      const nextPage =
        await gameRepository.findTerminalGamesPendingAnswerCleanup(
          firstPage[0]._id,
          2,
        )

      expect(firstPage.map(({ _id }) => _id)).toEqual(['cleanup-1'])
      expect(nextPage.map(({ _id }) => _id)).toEqual(['cleanup-2'])
      expect(firstPage[0].currentTask._id).toBeDefined()
    })

    it('marks only still-terminal games after cleanup and preserves their gameplay state', async () => {
      const date = new Date()
      await gameModel.create([
        {
          ...buildMockGame('cleanup-terminal', buildMockPodiumTask(), date),
          status: GameStatus.Expired,
        },
        buildMockGame('cleanup-active', buildMockPodiumTask(), date),
      ])

      await expect(
        gameRepository.markTerminalGameAnswerStateCleared('cleanup-terminal'),
      ).resolves.toBe(true)
      await expect(
        gameRepository.markTerminalGameAnswerStateCleared('cleanup-active'),
      ).resolves.toBe(false)

      const terminal = await gameModel.findById('cleanup-terminal').exec()
      const active = await gameModel.findById('cleanup-active').exec()
      expect(terminal?.transientAnswerStateCleared).toBe(true)
      expect(terminal?.status).toBe(GameStatus.Expired)
      expect(terminal?.currentTask.type).toBe(TaskType.Podium)
      expect(active?.transientAnswerStateCleared).toBeUndefined()
      expect(active?.status).toBe(GameStatus.Active)
    })
  })
})

const buildMockLeaderboardTask = (): BaseTask & LeaderboardTask => ({
  _id: uuidv4(),
  type: TaskType.Leaderboard,
  status: 'active',
  questionIndex: 0,
  leaderboard: [],
  created: new Date(),
})

const buildMockLobbyTask = (): BaseTask & LobbyTask => ({
  _id: uuidv4(),
  type: TaskType.Lobby,
  status: 'pending',
  created: new Date(),
})

const buildMockPodiumTask = (): BaseTask & PodiumTask => ({
  _id: uuidv4(),
  type: TaskType.Podium,
  status: 'active',
  leaderboard: [],
  created: new Date(),
})

const buildMockGame = (
  gameID: string,
  currentTask: BaseTask &
    (
      | LobbyTask
      | QuestionTask
      | QuestionResultTask
      | LeaderboardTask
      | PodiumTask
    ),
  date: Date,
): Game => ({
  _id: gameID,
  name: 'quiz.title',
  mode: GameMode.Classic,
  status: GameStatus.Active,
  pin: '000000',
  quiz: { _id: uuidv4() } as Quiz,
  settings: {
    shouldAutoCompleteQuestionResultTask: false,
    shouldAutoCompleteLeaderboardTask: false,
    shouldAutoCompletePodiumTask: false,
    randomizeQuestionOrder: false,
    randomizeAnswerOrder: false,
  },
  questions: [],
  nextQuestion: 0,
  participants: [],
  currentTask: currentTask,
  previousTasks: [],
  updated: date,
  created: date,
})
