import { GameMode, GameParticipantType, QuestionType } from '@klurigo/common'
import { v4 as uuidv4 } from 'uuid'

import {
  BaseTask,
  GameDocument,
  LeaderboardTaskItem,
  LobbyTask,
  ParticipantBase,
  ParticipantHost,
  ParticipantPlayer,
  QuestionResultTask,
  QuestionResultTaskItem,
  TaskType,
} from '../../game-core/repositories/models/schemas'
import { IllegalTaskTypeException } from '../exceptions'

import {
  buildLeaderboardTask,
  updateParticipantsAndBuildLeaderboard,
} from './task-leaderboard.utils'

describe('Task Leaderboard Utils', () => {
  describe('updateParticipantsAndBuildLeaderboard', () => {
    it('throws IllegalTaskTypeException when current task is not QuestionResult', () => {
      const invalidTask: BaseTask & LobbyTask = {
        _id: uuidv4(),
        type: TaskType.Lobby,
        status: 'pending',
        created: new Date(),
      }

      const game = buildGameDocument({
        currentTask: invalidTask,
      })

      expect(() => updateParticipantsAndBuildLeaderboard(game)).toThrow(
        IllegalTaskTypeException,
      )
    })

    it('returns an empty array when there are no player participants', () => {
      const nonPlayer = buildParticipantHost()

      const unrelatedResult = buildQuestionResultTaskItem({
        playerId: uuidv4(),
        nickname: 'Ghost',
      })

      const game = buildGameDocument({
        participants: [nonPlayer] as GameDocument['participants'],
        currentTask: buildQuestionResultTask({
          results: [unrelatedResult],
        }),
      })

      const result = updateParticipantsAndBuildLeaderboard(game)

      expect(result).toEqual<LeaderboardTaskItem[]>([])
    })

    it('updates a player with a matching result entry and exposes previousPosition when rank > 0', () => {
      const playerId = uuidv4()

      const participant = buildPlayerParticipant({
        participantId: playerId,
        nickname: 'Alice',
        rank: 3,
        totalScore: 50,
        currentStreak: 1,
      })

      const resultItem = buildQuestionResultTaskItem({
        playerId,
        nickname: 'Alice',
        totalScore: 120,
        position: 1,
        streak: 4,
      })

      const game = buildGameDocument({
        mode: GameMode.Classic,
        participants: [participant] as GameDocument['participants'],
        currentTask: buildQuestionResultTask({
          results: [resultItem],
        }),
      })

      const leaderboard = updateParticipantsAndBuildLeaderboard(game)

      expect(leaderboard).toHaveLength(1)
      const entry = leaderboard[0]

      expect(entry.playerId).toBe(playerId)
      expect(entry.nickname).toBe('Alice')
      expect(entry.position).toBe(1)
      expect(entry.previousPosition).toBe(3)
      expect(entry.score).toBe(120)
      expect(entry.streaks).toBe(4)

      const updatedParticipant = game.participants[0] as typeof participant
      expect(updatedParticipant.rank).toBe(1)
      expect(updatedParticipant.totalScore).toBe(120)
      expect(updatedParticipant.currentStreak).toBe(4)
    })

    it('does not set previousPosition when previous rank is 0 or missing', () => {
      const playerZeroRankId = uuidv4()
      const playerNoRankId = uuidv4()

      const zeroRankParticipant = buildPlayerParticipant({
        participantId: playerZeroRankId,
        nickname: 'ZeroRank',
        rank: 0,
      })

      const noRankParticipant = buildPlayerParticipant({
        participantId: playerNoRankId,
        nickname: 'NoRank',
      })
      delete (noRankParticipant as { rank?: number }).rank

      const zeroRankResult = buildQuestionResultTaskItem({
        playerId: playerZeroRankId,
        nickname: 'ZeroRank',
        totalScore: 10,
        position: 1,
        streak: 1,
      })

      const noRankResult = buildQuestionResultTaskItem({
        playerId: playerNoRankId,
        nickname: 'NoRank',
        totalScore: 20,
        position: 2,
        streak: 2,
      })

      const game = buildGameDocument({
        participants: [
          zeroRankParticipant,
          noRankParticipant,
        ] as GameDocument['participants'],
        currentTask: buildQuestionResultTask({
          results: [zeroRankResult, noRankResult],
        }),
      })

      const leaderboard = updateParticipantsAndBuildLeaderboard(game)

      const zeroRankEntry = leaderboard.find(
        (e) => e.playerId === playerZeroRankId,
      )
      const noRankEntry = leaderboard.find((e) => e.playerId === playerNoRankId)

      expect(zeroRankEntry?.previousPosition).toBeUndefined()
      expect(noRankEntry?.previousPosition).toBeUndefined()
    })

    it('includes late players without result entries and recalculates their position', () => {
      const withResultId = uuidv4()
      const withoutResultId = uuidv4()

      const withResult = buildPlayerParticipant({
        participantId: withResultId,
        nickname: 'WithResult',
        rank: 2,
        totalScore: 50,
        currentStreak: 1,
      })

      const withoutResult = buildPlayerParticipant({
        participantId: withoutResultId,
        nickname: 'WithoutResult',
        rank: 5,
        totalScore: 30,
        currentStreak: 3,
      })

      const resultItem = buildQuestionResultTaskItem({
        playerId: withResultId,
        nickname: 'WithResult',
        totalScore: 100,
        position: 1,
        streak: 4,
      })

      const game = buildGameDocument({
        participants: [
          withResult,
          withoutResult,
        ] as GameDocument['participants'],
        currentTask: buildQuestionResultTask({
          results: [resultItem],
        }),
      })

      const leaderboard = updateParticipantsAndBuildLeaderboard(game)

      expect(leaderboard).toHaveLength(2)

      const withResultEntry = leaderboard.find(
        (e) => e.playerId === withResultId,
      )
      const withoutResultEntry = leaderboard.find(
        (e) => e.playerId === withoutResultId,
      )

      expect(withResultEntry).toMatchObject({
        playerId: withResultId,
        nickname: 'WithResult',
        position: 1,
        previousPosition: 2,
        score: 100,
        streaks: 4,
      })

      expect(withoutResultEntry).toMatchObject({
        playerId: withoutResultId,
        nickname: 'WithoutResult',
        position: 2,
        previousPosition: 5,
        score: 30,
        streaks: 3,
      })

      const persistedWithoutResult = game.participants.find(
        (p) => p.participantId === withoutResultId,
      ) as typeof withoutResult

      expect(persistedWithoutResult.rank).toBe(2)
      expect(persistedWithoutResult.totalScore).toBe(30)
      expect(persistedWithoutResult.currentStreak).toBe(3)
    })

    it('recalculates all ranks when a late zero-score player was assigned rank one', () => {
      const highScoreId = uuidv4()
      const lowScoreId = uuidv4()
      const latePlayerId = uuidv4()

      const highScore = buildPlayerParticipant({
        participantId: highScoreId,
        rank: 0,
        totalScore: 0,
      })
      const lowScore = buildPlayerParticipant({
        participantId: lowScoreId,
        rank: 0,
        totalScore: 0,
      })
      const latePlayer = buildPlayerParticipant({
        participantId: latePlayerId,
        rank: 1,
        totalScore: 0,
      })

      const game = buildGameDocument({
        mode: GameMode.Classic,
        participants: [highScore, lowScore, latePlayer],
        currentTask: buildQuestionResultTask({
          results: [
            buildQuestionResultTaskItem({
              playerId: highScoreId,
              totalScore: 100,
              position: 1,
            }),
            buildQuestionResultTaskItem({
              playerId: lowScoreId,
              totalScore: 50,
              position: 2,
            }),
          ],
        }),
      })

      const leaderboard = updateParticipantsAndBuildLeaderboard(game)

      expect(
        leaderboard.map(({ playerId, position }) => [playerId, position]),
      ).toEqual([
        [highScoreId, 1],
        [lowScoreId, 2],
        [latePlayerId, 3],
      ])
      expect(highScore.rank).toBe(1)
      expect(lowScore.rank).toBe(2)
      expect(latePlayer.rank).toBe(3)
    })

    it('places a late ZeroToOneHundred player using the initialized score', () => {
      const firstPlayerId = uuidv4()
      const secondPlayerId = uuidv4()
      const latePlayerId = uuidv4()

      const firstPlayer = buildPlayerParticipant({
        participantId: firstPlayerId,
        rank: 1,
        totalScore: 10,
      })
      const secondPlayer = buildPlayerParticipant({
        participantId: secondPlayerId,
        rank: 2,
        totalScore: 60,
      })
      const latePlayer = buildPlayerParticipant({
        participantId: latePlayerId,
        rank: 3,
        totalScore: 35,
      })

      const game = buildGameDocument({
        mode: GameMode.ZeroToOneHundred,
        participants: [firstPlayer, secondPlayer, latePlayer],
        currentTask: buildQuestionResultTask({
          results: [
            buildQuestionResultTaskItem({
              playerId: firstPlayerId,
              totalScore: 20,
              position: 1,
              totalResponseTime: 1000,
            }),
            buildQuestionResultTaskItem({
              playerId: secondPlayerId,
              totalScore: 80,
              position: 2,
              totalResponseTime: 2000,
            }),
          ],
        }),
      })

      const leaderboard = updateParticipantsAndBuildLeaderboard(game)

      expect(
        leaderboard.map(({ playerId, position }) => [playerId, position]),
      ).toEqual([
        [firstPlayerId, 1],
        [latePlayerId, 2],
        [secondPlayerId, 3],
      ])
      expect(latePlayer.rank).toBe(2)
    })

    it('sorts players using Classic mode comparator when mode is Classic', () => {
      const lowScoreId = uuidv4()
      const highScoreId = uuidv4()

      const lowScore = buildPlayerParticipant({
        participantId: lowScoreId,
        nickname: 'LowScore',
        totalScore: 50,
        rank: 2,
      })

      const highScore = buildPlayerParticipant({
        participantId: highScoreId,
        nickname: 'HighScore',
        totalScore: 200,
        rank: 1,
      })

      const game = buildGameDocument({
        mode: GameMode.Classic,
        participants: [lowScore, highScore] as GameDocument['participants'],
        currentTask: buildQuestionResultTask({
          results: [],
        }),
      })

      const leaderboard = updateParticipantsAndBuildLeaderboard(game)

      expect(leaderboard.map((e) => e.playerId)).toEqual([
        highScoreId,
        lowScoreId,
      ])
    })

    it('sorts players in ZeroToOneHundred mode using its comparator', () => {
      const lowScoreId = uuidv4()
      const highScoreId = uuidv4()

      const lowScore = buildPlayerParticipant({
        participantId: lowScoreId,
        nickname: 'LowScore',
        totalScore: 10,
        rank: 1,
      })

      const highScore = buildPlayerParticipant({
        participantId: highScoreId,
        nickname: 'HighScore',
        totalScore: 90,
        rank: 2,
      })

      const game = buildGameDocument({
        mode: GameMode.ZeroToOneHundred,
        participants: [lowScore, highScore],
        currentTask: buildQuestionResultTask({ results: [] }),
      })

      const leaderboard = updateParticipantsAndBuildLeaderboard(game)

      expect(leaderboard.map((e) => e.playerId)).toEqual([
        lowScoreId,
        highScoreId,
      ])
    })

    it('excludes players with no rank and no result entry from the leaderboard', () => {
      const rankedPlayerId = uuidv4()
      const unrankedPlayerId = uuidv4()

      const rankedPlayer = buildPlayerParticipant({
        participantId: rankedPlayerId,
        nickname: 'Ranked',
        rank: 2,
        totalScore: 50,
        currentStreak: 1,
      })

      const unrankedPlayer = buildPlayerParticipant({
        participantId: unrankedPlayerId,
        nickname: 'Unranked',
      })
      delete (unrankedPlayer as { rank?: number }).rank

      const resultItem = buildQuestionResultTaskItem({
        playerId: rankedPlayerId,
        nickname: 'Ranked',
        totalScore: 100,
        position: 1,
        streak: 3,
      })

      const game = buildGameDocument({
        participants: [
          rankedPlayer,
          unrankedPlayer,
        ] as GameDocument['participants'],
        currentTask: buildQuestionResultTask({
          results: [resultItem],
        }),
      })

      const leaderboard = updateParticipantsAndBuildLeaderboard(game)

      expect(leaderboard).toHaveLength(1)
      expect(leaderboard[0].playerId).toBe(rankedPlayerId)
      expect(leaderboard[0].nickname).toBe('Ranked')

      // Sanity check: the unranked player still exists in participants but is not on the leaderboard
      const persistedUnranked = game.participants.find(
        (p) => p.participantId === unrankedPlayerId,
      ) as typeof unrankedPlayer

      expect(persistedUnranked).toBeDefined()
      expect(
        leaderboard.some((entry) => entry.playerId === unrankedPlayerId),
      ).toBe(false)
    })
  })

  describe('buildLeaderboardTask', () => {
    it('throws IllegalTaskTypeException when current task is not QuestionResult', () => {
      const invalidTask: BaseTask & LobbyTask = {
        _id: uuidv4(),
        type: TaskType.Lobby,
        status: 'pending',
        created: new Date(),
      }

      const game = buildGameDocument({
        currentTask: invalidTask,
      })

      expect(() => buildLeaderboardTask(game, [])).toThrow(
        IllegalTaskTypeException,
      )
    })

    it('creates a pending leaderboard task with computed questionIndex and provided leaderboard', () => {
      const playerId1 = uuidv4()
      const playerId2 = uuidv4()

      const leaderboard: LeaderboardTaskItem[] = [
        {
          playerId: playerId1,
          nickname: 'Alice',
          position: 1,
          previousPosition: 2,
          score: 120,
          streaks: 4,
        },
        {
          playerId: playerId2,
          nickname: 'Bob',
          position: 2,
          previousPosition: 1,
          score: 100,
          streaks: 3,
        },
      ]

      const game = buildGameDocument({
        nextQuestion: 3,
      })

      const task = buildLeaderboardTask(game, leaderboard)

      expect(task.type).toBe(TaskType.Leaderboard)
      expect(task.status).toBe('pending')
      expect(task.questionIndex).toBe(2)
      expect(task.leaderboard).toEqual(leaderboard)

      expect(task._id).toBeDefined()
      expect(typeof task._id).toBe('string')
      expect(task._id.length).toBeGreaterThan(0)

      expect(task.created).toBeInstanceOf(Date)
    })
  })
})

const buildQuestionResultTask = (
  overrides: Partial<QuestionResultTask> = {},
): BaseTask & QuestionResultTask => {
  return {
    _id: uuidv4(),
    type: TaskType.QuestionResult,
    status: 'pending',
    questionIndex: 0,
    correctAnswers: [{ type: QuestionType.Range, value: 0 }],
    results: [],
    created: new Date(),
    ...overrides,
  } as BaseTask & QuestionResultTask
}

const buildQuestionResultTaskItem = (
  overrides: Partial<QuestionResultTaskItem> = {},
): QuestionResultTaskItem => {
  const playerId = overrides.playerId ?? uuidv4()

  return {
    type: QuestionType.Range,
    playerId,
    nickname: overrides.nickname ?? 'Player',
    answer: {
      type: QuestionType.Range,
      playerId,
      answer: 0,
      created: new Date(),
    },
    correct: overrides.correct ?? true,
    lastScore: overrides.lastScore ?? 0,
    totalScore: overrides.totalScore ?? 0,
    position: overrides.position ?? 1,
    streak: overrides.streak ?? 0,
    lastResponseTime: overrides.lastResponseTime ?? 0,
    totalResponseTime: overrides.totalResponseTime ?? 0,
    responseCount: overrides.responseCount ?? 0,
    ...overrides,
  }
}

const buildPlayerParticipant = (
  overrides: Partial<ParticipantBase & ParticipantPlayer> = {},
): ParticipantBase & ParticipantPlayer => {
  return {
    participantId: uuidv4(),
    type: GameParticipantType.PLAYER,
    created: new Date(),
    updated: new Date(),
    nickname: 'Player',
    rank: 0,
    worstRank: 0,
    totalScore: 0,
    currentStreak: 0,
    totalResponseTime: 0,
    responseCount: 0,
    ...overrides,
  }
}

const buildParticipantHost = (
  overrides: Partial<ParticipantBase & ParticipantHost> = {},
): ParticipantBase & ParticipantHost => {
  return {
    participantId: uuidv4(),
    type: GameParticipantType.HOST,
    created: new Date(),
    updated: new Date(),
    ...overrides,
  }
}

const buildGameDocument = (
  overrides: Partial<GameDocument> = {},
): GameDocument => {
  return {
    _id: uuidv4(),
    mode: GameMode.Classic,
    participants: [],
    currentTask: buildQuestionResultTask(),
    previousTasks: [],
    created: new Date(),
    updated: new Date(),
    ...overrides,
  } as GameDocument
}
