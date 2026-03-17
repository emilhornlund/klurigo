import { GameStatus } from '@klurigo/common'

import {
  createMockGameDocument,
  createMockGameHostParticipantDocument,
  createMockGamePlayerParticipantDocument,
  createMockLeaderboardTaskDocument,
  createMockLobbyTaskDocument,
  createMockMultiChoiceQuestionDocument,
  createMockPodiumTaskDocument,
  createMockQuestionResultTaskDocument,
  createMockQuestionTaskDocument,
  createMockRangeQuestionDocument,
  createMockTrueFalseQuestionDocument,
} from '../../../../test-utils/data'
import { GameAnswerRepository } from '../../game-core/repositories'
import { isParticipantPlayer } from '../../game-core/utils'
import { GameResultService } from '../../game-result/services'
import { IllegalTaskTypeException } from '../exceptions'

import { GameTaskTransitionService } from './game-task-transition.service'

jest.mock('@klurigo/common', () => ({
  ...jest.requireActual('@klurigo/common'),
  shuffleArray: jest.fn(),
}))

jest.mock('../../game-core/utils')

jest.mock('../utils', () => ({
  buildQuestionTask: jest.fn(),
  buildQuestionResultTask: jest.fn(),
  buildLeaderboardTask: jest.fn(),
  buildPodiumTask: jest.fn(),
  updateParticipantsAndBuildLeaderboard: jest.fn(),
}))

// eslint-disable-next-line import/order
import {
  buildLeaderboardTask,
  buildPodiumTask,
  buildQuestionResultTask,
  buildQuestionTask,
  updateParticipantsAndBuildLeaderboard,
} from '../utils'

// eslint-disable-next-line import/order
import { shuffleArray } from '@klurigo/common'

const mockIsParticipantPlayer = isParticipantPlayer as jest.MockedFunction<
  typeof isParticipantPlayer
>

const mockShuffleArray = shuffleArray as jest.MockedFunction<
  typeof shuffleArray
>

describe('GameTaskTransitionService', () => {
  let service: GameTaskTransitionService
  let gameAnswerRepository: jest.Mocked<GameAnswerRepository>
  let gameResultService: jest.Mocked<GameResultService>
  let logger: { log: jest.Mock; warn: jest.Mock; error: jest.Mock }

  beforeEach(() => {
    logger = { log: jest.fn(), warn: jest.fn(), error: jest.fn() }

    gameAnswerRepository = {
      findAllAnswersByGameId: jest.fn().mockResolvedValue([]),
      clear: jest.fn().mockResolvedValue(undefined),
      submitOnce: jest.fn(),
    } as unknown as jest.Mocked<GameAnswerRepository>

    gameResultService = {
      createGameResult: jest.fn().mockResolvedValue({} as never),
    } as unknown as jest.Mocked<GameResultService>

    service = new GameTaskTransitionService(
      gameAnswerRepository,
      gameResultService,
    )
    ;(service as any).logger = logger

    mockIsParticipantPlayer.mockReset()
    mockIsParticipantPlayer.mockReturnValue(true)

    mockShuffleArray.mockReset()
    mockShuffleArray.mockImplementation((arr) => [...arr].reverse())
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('getTaskTransitionCallback', () => {
    it('returns undefined for lobby pending', () => {
      const gameDoc = createMockGameDocument({
        currentTask: createMockLobbyTaskDocument({ status: 'pending' }),
      })

      expect(
        service.getTaskTransitionCallback(gameDoc as never),
      ).toBeUndefined()
    })

    it('lobby completed transitions to question task and increments nextQuestion', async () => {
      const lobbyTask = createMockLobbyTaskDocument({ status: 'completed' })
      const gameDoc = createMockGameDocument({
        currentTask: lobbyTask,
        nextQuestion: 0,
      })

      const nextTask = createMockQuestionTaskDocument({
        status: 'pending',
        questionIndex: 0,
      })
      ;(buildQuestionTask as jest.Mock)
        .mockReset()
        .mockReturnValue(nextTask as never)

      const callback = service.getTaskTransitionCallback(gameDoc as never)
      expect(callback).toBeDefined()

      await callback!(gameDoc as never)

      expect(gameDoc.previousTasks).toContain(lobbyTask)
      expect(gameDoc.currentTask).toBe(nextTask)
      expect(gameDoc.nextQuestion).toBe(1)
      expect(buildQuestionTask).toHaveBeenCalledWith(gameDoc as never)
    })

    it('lobby completed sets all auto-complete settings to true when no player participants exist', async () => {
      const host = createMockGameHostParticipantDocument()
      const lobbyTask = createMockLobbyTaskDocument({ status: 'completed' })
      const gameDoc = createMockGameDocument({
        currentTask: lobbyTask,
        participants: [host],
        nextQuestion: 0,
      })

      const nextTask = createMockQuestionTaskDocument({
        status: 'pending',
        questionIndex: 0,
      })
      ;(buildQuestionTask as jest.Mock)
        .mockReset()
        .mockReturnValue(nextTask as never)

      mockIsParticipantPlayer.mockReturnValue(false)

      const callback = service.getTaskTransitionCallback(gameDoc as never)
      expect(callback).toBeDefined()

      await callback!(gameDoc as never)

      expect(gameDoc.settings.shouldAutoCompleteQuestionResultTask).toBe(true)
      expect(gameDoc.settings.shouldAutoCompleteLeaderboardTask).toBe(true)
      expect(gameDoc.settings.shouldAutoCompletePodiumTask).toBe(true)
    })

    it('lobby completed sets all auto-complete settings to false when player participants exist', async () => {
      const host = createMockGameHostParticipantDocument()
      const player = createMockGamePlayerParticipantDocument()
      const lobbyTask = createMockLobbyTaskDocument({ status: 'completed' })
      const gameDoc = createMockGameDocument({
        currentTask: lobbyTask,
        participants: [host, player],
        nextQuestion: 0,
      })

      const nextTask = createMockQuestionTaskDocument({
        status: 'pending',
        questionIndex: 0,
      })
      ;(buildQuestionTask as jest.Mock)
        .mockReset()
        .mockReturnValue(nextTask as never)

      mockIsParticipantPlayer.mockImplementation((p: any) => p !== host)

      const callback = service.getTaskTransitionCallback(gameDoc as never)
      expect(callback).toBeDefined()

      await callback!(gameDoc as never)

      expect(gameDoc.settings.shouldAutoCompleteQuestionResultTask).toBe(false)
      expect(gameDoc.settings.shouldAutoCompleteLeaderboardTask).toBe(false)
      expect(gameDoc.settings.shouldAutoCompletePodiumTask).toBe(false)
    })

    describe('lobby completed with randomization', () => {
      it('does not shuffle when both randomization flags are false', async () => {
        const multiChoiceQ = createMockMultiChoiceQuestionDocument({
          text: 'MultiChoice question',
          options: [
            { value: 'A', correct: true },
            { value: 'B', correct: false },
            { value: 'C', correct: false },
          ],
        })
        const trueFalseQ = createMockTrueFalseQuestionDocument({
          text: 'TrueFalse question',
        })
        const lobbyTask = createMockLobbyTaskDocument({ status: 'completed' })
        const gameDoc = createMockGameDocument({
          currentTask: lobbyTask,
          nextQuestion: 0,
          questions: [multiChoiceQ, trueFalseQ],
        })
        gameDoc.settings.randomizeQuestionOrder = false
        gameDoc.settings.randomizeAnswerOrder = false

        const nextTask = createMockQuestionTaskDocument({
          status: 'pending',
          questionIndex: 0,
        })
        ;(buildQuestionTask as jest.Mock)
          .mockReset()
          .mockReturnValue(nextTask as never)

        const callback = service.getTaskTransitionCallback(gameDoc as never)
        expect(callback).toBeDefined()

        await callback!(gameDoc as never)

        expect(mockShuffleArray).not.toHaveBeenCalled()
        expect(gameDoc.questions).toEqual([multiChoiceQ, trueFalseQ])
        expect(gameDoc.questions[0]).toBe(multiChoiceQ)
        expect((gameDoc.questions[0] as any).options).toEqual([
          { value: 'A', correct: true },
          { value: 'B', correct: false },
          { value: 'C', correct: false },
        ])
      })

      it('shuffles question order when randomizeQuestionOrder is true', async () => {
        const q1 = createMockMultiChoiceQuestionDocument({
          text: 'Question 1',
        })
        const q2 = createMockTrueFalseQuestionDocument({
          text: 'Question 2',
        })
        const q3 = createMockRangeQuestionDocument({
          text: 'Question 3',
        })
        const lobbyTask = createMockLobbyTaskDocument({ status: 'completed' })
        const gameDoc = createMockGameDocument({
          currentTask: lobbyTask,
          nextQuestion: 0,
          questions: [q1, q2, q3],
        })
        gameDoc.settings.randomizeQuestionOrder = true
        gameDoc.settings.randomizeAnswerOrder = false

        const nextTask = createMockQuestionTaskDocument({
          status: 'pending',
          questionIndex: 0,
        })
        ;(buildQuestionTask as jest.Mock)
          .mockReset()
          .mockReturnValue(nextTask as never)

        const callback = service.getTaskTransitionCallback(gameDoc as never)
        expect(callback).toBeDefined()

        await callback!(gameDoc as never)

        expect(mockShuffleArray).toHaveBeenCalledTimes(1)
        expect(mockShuffleArray).toHaveBeenCalledWith([q1, q2, q3])
        expect(gameDoc.questions).toEqual([q3, q2, q1])
        expect((gameDoc.questions[0] as any).options).toBeUndefined()
      })

      it('shuffles MultiChoice options only when randomizeAnswerOrder is true', async () => {
        const multiChoiceQ = createMockMultiChoiceQuestionDocument({
          text: 'MultiChoice question',
          options: [
            { value: 'A', correct: true },
            { value: 'B', correct: false },
            { value: 'C', correct: false },
          ],
        })
        const trueFalseQ = createMockTrueFalseQuestionDocument({
          text: 'TrueFalse question',
        })
        const rangeQ = createMockRangeQuestionDocument({
          text: 'Range question',
        })
        const lobbyTask = createMockLobbyTaskDocument({ status: 'completed' })
        const gameDoc = createMockGameDocument({
          currentTask: lobbyTask,
          nextQuestion: 0,
          questions: [multiChoiceQ, trueFalseQ, rangeQ],
        })
        gameDoc.settings.randomizeQuestionOrder = false
        gameDoc.settings.randomizeAnswerOrder = true

        const nextTask = createMockQuestionTaskDocument({
          status: 'pending',
          questionIndex: 0,
        })
        ;(buildQuestionTask as jest.Mock)
          .mockReset()
          .mockReturnValue(nextTask as never)

        const callback = service.getTaskTransitionCallback(gameDoc as never)
        expect(callback).toBeDefined()

        await callback!(gameDoc as never)

        expect(mockShuffleArray).toHaveBeenCalledTimes(1)
        expect(mockShuffleArray).toHaveBeenCalledWith([
          { value: 'A', correct: true },
          { value: 'B', correct: false },
          { value: 'C', correct: false },
        ])
        expect(gameDoc.questions).toEqual([multiChoiceQ, trueFalseQ, rangeQ])
        expect((gameDoc.questions[0] as any).options).toEqual([
          { value: 'C', correct: false },
          { value: 'B', correct: false },
          { value: 'A', correct: true },
        ])
      })

      it('shuffles both questions and MultiChoice options when both flags are true', async () => {
        const multiChoiceQ = createMockMultiChoiceQuestionDocument({
          text: 'MultiChoice question',
          options: [
            { value: 'A', correct: true },
            { value: 'B', correct: false },
          ],
        })
        const trueFalseQ = createMockTrueFalseQuestionDocument({
          text: 'TrueFalse question',
        })
        const lobbyTask = createMockLobbyTaskDocument({ status: 'completed' })
        const gameDoc = createMockGameDocument({
          currentTask: lobbyTask,
          nextQuestion: 0,
          questions: [multiChoiceQ, trueFalseQ],
        })
        gameDoc.settings.randomizeQuestionOrder = true
        gameDoc.settings.randomizeAnswerOrder = true

        const nextTask = createMockQuestionTaskDocument({
          status: 'pending',
          questionIndex: 0,
        })
        ;(buildQuestionTask as jest.Mock)
          .mockReset()
          .mockReturnValue(nextTask as never)

        const callback = service.getTaskTransitionCallback(gameDoc as never)
        expect(callback).toBeDefined()

        await callback!(gameDoc as never)

        expect(mockShuffleArray).toHaveBeenCalledTimes(2)
        const calls = mockShuffleArray.mock.calls
        expect(calls[0][0]).toEqual([multiChoiceQ, trueFalseQ])
        expect(calls[1][0]).toEqual([
          { value: 'A', correct: true },
          { value: 'B', correct: false },
        ])
        expect(gameDoc.questions).toHaveLength(2)
        expect(gameDoc.questions[0].text).toBe('TrueFalse question')
        expect(gameDoc.questions[1].text).toBe('MultiChoice question')
        expect((gameDoc.questions[1] as any).options).toEqual([
          { value: 'B', correct: false },
          { value: 'A', correct: true },
        ])
      })

      it('preserves question properties after randomization', async () => {
        const multiChoiceQ = createMockMultiChoiceQuestionDocument({
          text: 'Original text',
          points: 1000,
          duration: 30,
          options: [
            { value: 'A', correct: true },
            { value: 'B', correct: false },
          ],
        })
        const lobbyTask = createMockLobbyTaskDocument({ status: 'completed' })
        const gameDoc = createMockGameDocument({
          currentTask: lobbyTask,
          nextQuestion: 0,
          questions: [multiChoiceQ],
        })
        gameDoc.settings.randomizeQuestionOrder = false
        gameDoc.settings.randomizeAnswerOrder = true

        const nextTask = createMockQuestionTaskDocument({
          status: 'pending',
          questionIndex: 0,
        })
        ;(buildQuestionTask as jest.Mock)
          .mockReset()
          .mockReturnValue(nextTask as never)

        const callback = service.getTaskTransitionCallback(gameDoc as never)
        expect(callback).toBeDefined()

        await callback!(gameDoc as never)

        const resultQuestion = gameDoc.questions[0]
        expect(resultQuestion.text).toBe('Original text')
        expect(resultQuestion.points).toBe(1000)
        expect(resultQuestion.duration).toBe(30)
        expect((resultQuestion as any).type).toBeDefined()
      })
    })

    it('question pending sets presented timestamp', async () => {
      const task = createMockQuestionTaskDocument({
        status: 'pending',
        questionIndex: 0,
        presented: undefined,
      })
      const gameDoc = createMockGameDocument({
        currentTask: task,
        questions: [createMockMultiChoiceQuestionDocument()],
      })

      const callback = service.getTaskTransitionCallback(gameDoc as never)
      expect(callback).toBeDefined()

      expect((gameDoc.currentTask as any).presented).toBeUndefined()

      await callback!(gameDoc as never)

      expect((gameDoc.currentTask as any).presented).toBeInstanceOf(Date)
    })

    it('returns undefined for question active', () => {
      const gameDoc = createMockGameDocument({
        currentTask: createMockQuestionTaskDocument({
          status: 'active',
          questionIndex: 0,
        }),
      })

      expect(
        service.getTaskTransitionCallback(gameDoc as never),
      ).toBeUndefined()
    })

    it('question completed reads answers from repository, clears answers, stores them, and transitions to question result task', async () => {
      const task = createMockQuestionTaskDocument({
        status: 'completed',
        questionIndex: 0,
      })
      const gameDoc = createMockGameDocument({
        currentTask: task,
        _id: 'game-1',
        questions: [createMockMultiChoiceQuestionDocument()],
      })

      const parsedAnswers = [
        { participantId: 'p1' },
        { participantId: 'p2' },
      ] as any[]

      gameAnswerRepository.findAllAnswersByGameId.mockResolvedValue(
        parsedAnswers,
      )

      const nextTask = createMockQuestionResultTaskDocument({
        status: 'pending',
      })
      ;(buildQuestionResultTask as jest.Mock)
        .mockReset()
        .mockReturnValue(nextTask as never)

      const callback = service.getTaskTransitionCallback(gameDoc as never)
      expect(callback).toBeDefined()

      await callback!(gameDoc as never)

      expect(gameAnswerRepository.findAllAnswersByGameId).toHaveBeenCalledWith(
        'game-1',
      )
      expect(gameAnswerRepository.clear).toHaveBeenCalledWith('game-1')

      expect((task as any).answers).toEqual(parsedAnswers)
      expect(gameDoc.previousTasks).toContain(task)
      expect(gameDoc.currentTask).toBe(nextTask)
      expect(buildQuestionResultTask).toHaveBeenCalledWith(gameDoc as never)
    })

    it('question result completed builds leaderboard when there are questions remaining', async () => {
      const task = createMockQuestionResultTaskDocument({ status: 'completed' })
      const gameDoc = createMockGameDocument({
        currentTask: task,
        questions: [
          createMockMultiChoiceQuestionDocument(),
          createMockMultiChoiceQuestionDocument(),
        ],
        nextQuestion: 0,
      })

      const leaderboardItems = [
        { participantId: 'p1', score: 10, rank: 1 },
      ] as any[]
      ;(updateParticipantsAndBuildLeaderboard as jest.Mock)
        .mockReset()
        .mockReturnValue(leaderboardItems as never)

      const leaderboardTask = createMockLeaderboardTaskDocument({
        status: 'pending',
      })
      ;(buildLeaderboardTask as jest.Mock)
        .mockReset()
        .mockReturnValue(leaderboardTask as never)

      const callback = service.getTaskTransitionCallback(gameDoc as never)
      expect(callback).toBeDefined()

      await callback!(gameDoc as never)

      expect(gameDoc.previousTasks).toContain(task)
      expect(updateParticipantsAndBuildLeaderboard).toHaveBeenCalledWith(
        gameDoc as never,
      )
      expect(buildLeaderboardTask).toHaveBeenCalledWith(
        gameDoc as never,
        leaderboardItems as never,
      )
      expect(buildPodiumTask).not.toHaveBeenCalled()
      expect(gameResultService.createGameResult).not.toHaveBeenCalled()
      expect(gameDoc.currentTask).toBe(leaderboardTask)
    })

    it('question result completed builds podium and creates game result when last question and players exist', async () => {
      const task = createMockQuestionResultTaskDocument({ status: 'completed' })
      const host = createMockGameHostParticipantDocument()
      const player = createMockGamePlayerParticipantDocument()

      const gameDoc = createMockGameDocument({
        currentTask: task,
        participants: [host, player],
        questions: [createMockMultiChoiceQuestionDocument()],
        nextQuestion: 1,
      })

      const leaderboardItems = [
        { participantId: 'p1', score: 10, rank: 1 },
      ] as any[]
      ;(updateParticipantsAndBuildLeaderboard as jest.Mock)
        .mockReset()
        .mockReturnValue(leaderboardItems as never)

      const podiumTask = createMockPodiumTaskDocument({ status: 'pending' })
      ;(buildPodiumTask as jest.Mock)
        .mockReset()
        .mockReturnValue(podiumTask as never)

      mockIsParticipantPlayer.mockImplementation((p: any) => p !== host)

      const callback = service.getTaskTransitionCallback(gameDoc as never)
      expect(callback).toBeDefined()

      await callback!(gameDoc as never)

      expect(gameDoc.previousTasks).toContain(task)
      expect(buildPodiumTask).toHaveBeenCalledWith(
        gameDoc as never,
        leaderboardItems as never,
      )
      expect(buildLeaderboardTask).not.toHaveBeenCalled()
      expect(gameResultService.createGameResult).toHaveBeenCalledWith(
        gameDoc as never,
      )
      expect(gameDoc.currentTask).toBe(podiumTask)
    })

    it('question result completed builds podium and creates game result when last question and no players exist', async () => {
      const task = createMockQuestionResultTaskDocument({ status: 'completed' })
      const host = createMockGameHostParticipantDocument()

      const gameDoc = createMockGameDocument({
        currentTask: task,
        participants: [host],
        questions: [createMockMultiChoiceQuestionDocument()],
        nextQuestion: 1,
      })

      const leaderboardItems = [
        { participantId: 'p1', score: 10, rank: 1 },
      ] as any[]
      ;(updateParticipantsAndBuildLeaderboard as jest.Mock)
        .mockReset()
        .mockReturnValue(leaderboardItems as never)

      const podiumTask = createMockPodiumTaskDocument({ status: 'pending' })
      ;(buildPodiumTask as jest.Mock)
        .mockReset()
        .mockReturnValue(podiumTask as never)

      mockIsParticipantPlayer.mockReturnValue(false)

      const callback = service.getTaskTransitionCallback(gameDoc as never)
      expect(callback).toBeDefined()

      await callback!(gameDoc as never)

      expect(gameDoc.previousTasks).toContain(task)
      expect(buildPodiumTask).toHaveBeenCalledWith(
        gameDoc as never,
        leaderboardItems as never,
      )
      expect(buildLeaderboardTask).not.toHaveBeenCalled()
      expect(gameResultService.createGameResult).toHaveBeenCalledWith(
        gameDoc as never,
      )
      expect(gameDoc.currentTask).toBe(podiumTask)
    })

    it('leaderboard completed transitions to question task and increments nextQuestion', async () => {
      const leaderboard = createMockLeaderboardTaskDocument({
        status: 'completed',
      })
      const gameDoc = createMockGameDocument({
        currentTask: leaderboard,
        nextQuestion: 1,
      })

      const nextTask = createMockQuestionTaskDocument({
        status: 'pending',
        questionIndex: 1,
      })
      ;(buildQuestionTask as jest.Mock)
        .mockReset()
        .mockReturnValue(nextTask as never)

      const callback = service.getTaskTransitionCallback(gameDoc as never)
      expect(callback).toBeDefined()

      await callback!(gameDoc as never)

      expect(gameDoc.previousTasks).toContain(leaderboard)
      expect(gameDoc.currentTask).toBe(nextTask)
      expect(gameDoc.nextQuestion).toBe(2)
      expect(buildQuestionTask).toHaveBeenCalledWith(gameDoc as never)
    })

    it('podium completed keeps podium as current task and sets status Completed when players exist', async () => {
      const podium = createMockPodiumTaskDocument({ status: 'completed' })
      const host = createMockGameHostParticipantDocument()
      const player = createMockGamePlayerParticipantDocument()

      const gameDoc = createMockGameDocument({
        currentTask: podium,
        participants: [host, player],
      })

      mockIsParticipantPlayer.mockImplementation((p: any) => p !== host)

      const callback = service.getTaskTransitionCallback(gameDoc as never)
      expect(callback).toBeDefined()

      await callback!(gameDoc as never)

      expect(gameDoc.previousTasks).not.toContain(podium)
      expect(gameDoc.currentTask).toBe(podium)
      expect(gameDoc.status).toBe(GameStatus.Completed)
      expect(gameDoc.completedAt).toBeInstanceOf(Date)
    })

    it('podium completed keeps podium as current task and sets status Completed when no players exist', async () => {
      const podium = createMockPodiumTaskDocument({ status: 'completed' })
      const host = createMockGameHostParticipantDocument()

      const gameDoc = createMockGameDocument({
        currentTask: podium,
        participants: [host],
      })

      mockIsParticipantPlayer.mockReturnValue(false)

      const callback = service.getTaskTransitionCallback(gameDoc as never)
      expect(callback).toBeDefined()

      await callback!(gameDoc as never)

      expect(gameDoc.previousTasks).not.toContain(podium)
      expect(gameDoc.currentTask).toBe(podium)
      expect(gameDoc.status).toBe(GameStatus.Completed)
      expect(gameDoc.completedAt).toBeInstanceOf(Date)
    })

    it('returns undefined for unsupported task type/status combinations', () => {
      const gameDoc = createMockGameDocument({
        currentTask: createMockLobbyTaskDocument({ status: 'active' }),
      })

      expect(
        service.getTaskTransitionCallback(gameDoc as never),
      ).toBeUndefined()
    })
  })

  describe('getTaskTransitionDelay', () => {
    it('returns 3000ms for lobby pending task', () => {
      const gameDoc = createMockGameDocument({
        currentTask: createMockLobbyTaskDocument({ status: 'pending' }),
      })

      expect(service.getTaskTransitionDelay(gameDoc as never)).toBe(3000)
    })

    it('returns 3000ms for lobby completed task', () => {
      const gameDoc = createMockGameDocument({
        currentTask: createMockLobbyTaskDocument({ status: 'completed' }),
      })

      expect(service.getTaskTransitionDelay(gameDoc as never)).toBe(3000)
    })

    it('returns exact pending duration for question pending task', () => {
      const text = 'Short question?'
      const question = createMockMultiChoiceQuestionDocument({ text })

      const gameDoc = createMockGameDocument({
        currentTask: createMockQuestionTaskDocument({
          status: 'pending',
          questionIndex: 0,
        }),
        questions: [question],
      })

      const wordCount = text.trim().split(/\s+/).length
      const readingDuration = (wordCount / 220) * 60000
      const characterDuration = Math.min(text.length * 100, 15000)
      const expected = Math.max(readingDuration, characterDuration)

      expect(service.getTaskTransitionDelay(gameDoc as never)).toBe(expected)
    })

    it('returns durationInSeconds * 1000 for question active task', () => {
      const question = createMockMultiChoiceQuestionDocument({
        text: 'Test question?',
        duration: 5,
      })

      const gameDoc = createMockGameDocument({
        currentTask: createMockQuestionTaskDocument({
          status: 'active',
          questionIndex: 0,
        }),
        questions: [question],
      })

      expect(service.getTaskTransitionDelay(gameDoc as never)).toBe(5000)
    })

    it('returns 0 for unsupported task type/status combinations', () => {
      const gameDoc = createMockGameDocument({
        currentTask: createMockQuestionResultTaskDocument({
          status: 'completed',
        }),
      })

      expect(service.getTaskTransitionDelay(gameDoc as never)).toBe(0)
    })
  })

  describe('getQuestionTaskPendingDuration', () => {
    it('returns max(readingDuration, characterDuration) for short text', () => {
      const text = 'Short question?'
      const gameDoc = createMockGameDocument({
        currentTask: createMockQuestionTaskDocument({
          status: 'pending',
          questionIndex: 0,
        }),
        questions: [createMockMultiChoiceQuestionDocument({ text })],
      })

      const wordCount = text.trim().split(/\s+/).length
      const readingDuration = (wordCount / 220) * 60000
      const characterDuration = Math.min(text.length * 100, 15000)
      const expected = Math.max(readingDuration, characterDuration)

      const duration = (service as any).getQuestionTaskPendingDuration(
        gameDoc as never,
      )
      expect(duration).toBe(expected)
    })

    it('caps character-based fallback at 15000ms', () => {
      const text = 'x'.repeat(1000)
      const gameDoc = createMockGameDocument({
        currentTask: createMockQuestionTaskDocument({
          status: 'pending',
          questionIndex: 0,
        }),
        questions: [createMockMultiChoiceQuestionDocument({ text })],
      })

      const duration = (service as any).getQuestionTaskPendingDuration(
        gameDoc as never,
      )
      expect(duration).toBeGreaterThanOrEqual(15000)
      expect(duration).toBe(15000)
    })

    it('throws IllegalTaskTypeException for non-question task', () => {
      const gameDoc = createMockGameDocument({
        currentTask: createMockLobbyTaskDocument({ status: 'pending' }),
      })

      expect(() =>
        (service as any).getQuestionTaskPendingDuration(gameDoc as never),
      ).toThrow(IllegalTaskTypeException)
    })

    it('throws Error for invalid question index (too high)', () => {
      const gameDoc = createMockGameDocument({
        currentTask: createMockQuestionTaskDocument({
          status: 'pending',
          questionIndex: 5,
        }),
        questions: [createMockMultiChoiceQuestionDocument()],
      })

      expect(() =>
        (service as any).getQuestionTaskPendingDuration(gameDoc as never),
      ).toThrow('Invalid question index')
    })

    it('throws Error for invalid question index (negative)', () => {
      const gameDoc = createMockGameDocument({
        currentTask: createMockQuestionTaskDocument({
          status: 'pending',
          questionIndex: -1,
        }),
        questions: [createMockMultiChoiceQuestionDocument()],
      })

      expect(() =>
        (service as any).getQuestionTaskPendingDuration(gameDoc as never),
      ).toThrow('Invalid question index')
    })
  })

  describe('getQuestionTaskActiveDuration', () => {
    it('returns duration in milliseconds from question duration in seconds', () => {
      const gameDoc = createMockGameDocument({
        currentTask: createMockQuestionTaskDocument({
          status: 'active',
          questionIndex: 0,
        }),
        questions: [
          createMockMultiChoiceQuestionDocument({
            text: 'Test question?',
            duration: 5,
          }),
        ],
      })

      const duration = (service as any).getQuestionTaskActiveDuration(
        gameDoc as never,
      )
      expect(duration).toBe(5000)
    })

    it('throws IllegalTaskTypeException for non-question task', () => {
      const gameDoc = createMockGameDocument({
        currentTask: createMockLobbyTaskDocument({ status: 'active' }),
      })

      expect(() =>
        (service as any).getQuestionTaskActiveDuration(gameDoc as never),
      ).toThrow(IllegalTaskTypeException)
    })

    it('throws Error for invalid question index (too high)', () => {
      const gameDoc = createMockGameDocument({
        currentTask: createMockQuestionTaskDocument({
          status: 'active',
          questionIndex: 5,
        }),
        questions: [createMockMultiChoiceQuestionDocument()],
      })

      expect(() =>
        (service as any).getQuestionTaskActiveDuration(gameDoc as never),
      ).toThrow('Invalid question index')
    })

    it('throws Error for invalid question index (negative)', () => {
      const gameDoc = createMockGameDocument({
        currentTask: createMockQuestionTaskDocument({
          status: 'active',
          questionIndex: -1,
        }),
        questions: [createMockMultiChoiceQuestionDocument()],
      })

      expect(() =>
        (service as any).getQuestionTaskActiveDuration(gameDoc as never),
      ).toThrow('Invalid question index')
    })
  })

  describe('Repository integration and error handling', () => {
    it('question completed: propagates repository findAllAnswersByGameId failure and does not clear or transition', async () => {
      const task = createMockQuestionTaskDocument({
        status: 'completed',
        questionIndex: 0,
      })
      const gameDoc = createMockGameDocument({
        currentTask: task,
        _id: 'game-1',
        questions: [createMockMultiChoiceQuestionDocument()],
      })

      gameAnswerRepository.findAllAnswersByGameId.mockRejectedValue(
        new Error('Repository connection failed'),
      )

      const callback = service.getTaskTransitionCallback(gameDoc as never)
      expect(callback).toBeDefined()

      await expect(callback!(gameDoc as never)).rejects.toThrow(
        'Repository connection failed',
      )

      expect(gameAnswerRepository.clear).not.toHaveBeenCalled()
      expect(buildQuestionResultTask).not.toHaveBeenCalled()
      expect(gameDoc.previousTasks).not.toContain(task)
    })

    it('question completed: propagates repository clear failure and does not transition task', async () => {
      const task = createMockQuestionTaskDocument({
        status: 'completed',
        questionIndex: 0,
      })
      const gameDoc = createMockGameDocument({
        currentTask: task,
        _id: 'game-1',
        questions: [createMockMultiChoiceQuestionDocument()],
      })

      gameAnswerRepository.findAllAnswersByGameId.mockResolvedValue([
        { participantId: 'p1' } as any,
      ])
      gameAnswerRepository.clear.mockRejectedValue(
        new Error('Repository clear failed'),
      )

      const callback = service.getTaskTransitionCallback(gameDoc as never)
      expect(callback).toBeDefined()

      await expect(callback!(gameDoc as never)).rejects.toThrow(
        'Repository clear failed',
      )

      expect(buildQuestionResultTask).not.toHaveBeenCalled()
      expect(gameDoc.previousTasks).not.toContain(task)
    })

    it('question completed: propagates deserialization failure from repository and does not clear or transition', async () => {
      const task = createMockQuestionTaskDocument({
        status: 'completed',
        questionIndex: 0,
      })
      const gameDoc = createMockGameDocument({
        currentTask: task,
        _id: 'game-1',
        questions: [createMockMultiChoiceQuestionDocument()],
      })

      gameAnswerRepository.findAllAnswersByGameId.mockRejectedValue(
        new Error('Invalid JSON stored for game game-1 answers'),
      )

      const callback = service.getTaskTransitionCallback(gameDoc as never)
      expect(callback).toBeDefined()

      await expect(callback!(gameDoc as never)).rejects.toThrow(
        'Invalid JSON stored for game game-1 answers',
      )

      expect(gameAnswerRepository.clear).not.toHaveBeenCalled()
      expect(buildQuestionResultTask).not.toHaveBeenCalled()
      expect(gameDoc.previousTasks).not.toContain(task)
    })

    it('question result completed: propagates game result service failure when last question and players exist', async () => {
      const task = createMockQuestionResultTaskDocument({ status: 'completed' })
      const host = createMockGameHostParticipantDocument()
      const player = createMockGamePlayerParticipantDocument()

      const gameDoc = createMockGameDocument({
        currentTask: task,
        participants: [host, player],
        questions: [createMockMultiChoiceQuestionDocument()],
        nextQuestion: 1,
      })

      const leaderboardItems = [
        { participantId: 'p1', score: 10, rank: 1 },
      ] as any[]
      ;(updateParticipantsAndBuildLeaderboard as jest.Mock)
        .mockReset()
        .mockReturnValue(leaderboardItems as never)

      const podiumTask = createMockPodiumTaskDocument({ status: 'pending' })
      ;(buildPodiumTask as jest.Mock)
        .mockReset()
        .mockReturnValue(podiumTask as never)

      mockIsParticipantPlayer.mockImplementation((p: any) => p !== host)

      gameResultService.createGameResult.mockRejectedValue(
        new Error('Database error'),
      )

      const callback = service.getTaskTransitionCallback(gameDoc as never)
      expect(callback).toBeDefined()

      await expect(callback!(gameDoc as never)).rejects.toThrow(
        'Database error',
      )
    })
  })
})
