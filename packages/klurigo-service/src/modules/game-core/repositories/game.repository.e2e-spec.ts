import { GameMode, GameStatus } from '@klurigo/common'
import { INestApplication } from '@nestjs/common'
import { getModelToken } from '@nestjs/mongoose'
import { v4 as uuidv4 } from 'uuid'

import { closeTestApp, createTestApp } from '../../../../test-utils/utils'
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
    await closeTestApp(app)
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
})

const buildMockLeaderboardTask = (): BaseTask & LeaderboardTask => ({
  _id: uuidv4(),
  type: TaskType.Leaderboard,
  status: 'active',
  questionIndex: 0,
  leaderboard: [],
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
