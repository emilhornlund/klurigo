import {
  GameEventType,
  GameLeaderboardHostEvent,
  GameMode,
  generateNickname,
} from '@klurigo/common'

import {
  createMockGameDocument,
  createMockLeaderboardTaskDocument,
  createMockLeaderboardTaskItem,
  createMockMultiChoiceQuestionDocument,
} from '../../../../test-utils/data'
import { LeaderboardTaskItem } from '../../game-core/repositories/models/schemas'

import { buildGameLeaderboardHostEvent } from './game-leaderboard-event.utils'

describe('Game Leaderboard Event Utils', () => {
  describe('buildGameLeaderboardHostEvent', () => {
    it('should not include more than 5 players in the leaderboard', () => {
      const gameDocument = createMockGameDocument({
        currentTask: createMockLeaderboardTaskDocument({
          status: 'active',
          questionIndex: 0,
          leaderboard: buildLeaderboard(6),
        }),
      })

      const actual = buildGameLeaderboardHostEvent(gameDocument as never)

      expect(actual.type).toEqual(GameEventType.GameLeaderboardHost)
      expectLeaderboard(actual, 5)
    })

    it('should include exactly 5 players as-is without trimming', () => {
      const gameDocument = createMockGameDocument({
        currentTask: createMockLeaderboardTaskDocument({
          status: 'active',
          questionIndex: 0,
          leaderboard: buildLeaderboard(5),
        }),
      })

      const actual = buildGameLeaderboardHostEvent(gameDocument as never)

      expect(actual.type).toEqual(GameEventType.GameLeaderboardHost)
      expectLeaderboard(actual, 5)
    })

    it('should return an empty leaderboard if none is provided', () => {
      const gameDocument = createMockGameDocument({
        currentTask: createMockLeaderboardTaskDocument({
          status: 'active',
          questionIndex: 0,
          leaderboard: [],
        }),
      })

      const actual = buildGameLeaderboardHostEvent(gameDocument as never)
      expectLeaderboard(actual, 0)
    })

    it('should include fewer than 5 players when leaderboard has less than 5 players', () => {
      const gameDocument = createMockGameDocument({
        currentTask: createMockLeaderboardTaskDocument({
          status: 'active',
          questionIndex: 0,
          leaderboard: buildLeaderboard(3),
        }),
      })

      const actual = buildGameLeaderboardHostEvent(gameDocument as never)

      expect(actual.type).toEqual(GameEventType.GameLeaderboardHost)
      expectLeaderboard(actual, 3)
    })

    it('should include only 1 player when leaderboard has exactly 1 player', () => {
      const gameDocument = createMockGameDocument({
        currentTask: createMockLeaderboardTaskDocument({
          status: 'active',
          questionIndex: 0,
          leaderboard: buildLeaderboard(1),
        }),
      })

      const actual = buildGameLeaderboardHostEvent(gameDocument as never)

      expect(actual.type).toEqual(GameEventType.GameLeaderboardHost)
      expectLeaderboard(actual, 1)
    })

    it('should preserve correct order of players from leaderboard', () => {
      const leaderboard = [
        createMockLeaderboardTaskItem({
          position: 1,
          nickname: 'Player1',
          score: 1000,
          streaks: 5,
          previousPosition: 2,
        }),
        createMockLeaderboardTaskItem({
          position: 2,
          nickname: 'Player2',
          score: 900,
          streaks: 3,
          previousPosition: 1,
        }),
        createMockLeaderboardTaskItem({
          position: 3,
          nickname: 'Player3',
          score: 800,
          streaks: 0,
          previousPosition: 4,
        }),
      ]

      const gameDocument = createMockGameDocument({
        currentTask: createMockLeaderboardTaskDocument({
          status: 'active',
          questionIndex: 0,
          leaderboard,
        }),
      })

      const actual = buildGameLeaderboardHostEvent(gameDocument as never)

      expect(actual.type).toEqual(GameEventType.GameLeaderboardHost)
      expect(actual.leaderboard).toHaveLength(3)
      expect(actual.leaderboard[0]).toEqual({
        position: 1,
        previousPosition: 2,
        nickname: 'Player1',
        score: 1000,
        streaks: 5,
      })
      expect(actual.leaderboard[1]).toEqual({
        position: 2,
        previousPosition: 1,
        nickname: 'Player2',
        score: 900,
        streaks: 3,
      })
      expect(actual.leaderboard[2]).toEqual({
        position: 3,
        previousPosition: 4,
        nickname: 'Player3',
        score: 800,
        streaks: 0,
      })
    })

    it('should include game pin in event', () => {
      const gameDocument = createMockGameDocument({
        pin: 'TEST123',
        currentTask: createMockLeaderboardTaskDocument({
          status: 'active',
          questionIndex: 0,
          leaderboard: buildLeaderboard(2),
        }),
      })

      const actual = buildGameLeaderboardHostEvent(gameDocument as never)

      expect(actual.type).toEqual(GameEventType.GameLeaderboardHost)
      expect(actual.game.pin).toEqual('TEST123')
    })

    it('should include pagination information in event', () => {
      const gameDocument = createMockGameDocument({
        questions: [
          createMockMultiChoiceQuestionDocument(),
          createMockMultiChoiceQuestionDocument(),
          createMockMultiChoiceQuestionDocument(),
          createMockMultiChoiceQuestionDocument(),
          createMockMultiChoiceQuestionDocument(),
        ],
        currentTask: createMockLeaderboardTaskDocument({
          status: 'active',
          questionIndex: 2,
          leaderboard: buildLeaderboard(2),
        }),
      })

      const actual = buildGameLeaderboardHostEvent(gameDocument as never)

      expect(actual.type).toEqual(GameEventType.GameLeaderboardHost)
      expect(actual.pagination).toBeDefined()
      expect(actual.pagination.current).toEqual(3)
      expect(actual.pagination.total).toEqual(5)
    })

    it('should handle players with zero streaks correctly', () => {
      const leaderboard = [
        createMockLeaderboardTaskItem({
          position: 1,
          nickname: 'Player1',
          score: 1000,
          streaks: 0,
          previousPosition: 1,
        }),
      ]

      const gameDocument = createMockGameDocument({
        currentTask: createMockLeaderboardTaskDocument({
          status: 'active',
          questionIndex: 0,
          leaderboard,
        }),
      })

      const actual = buildGameLeaderboardHostEvent(gameDocument as never)

      expect(actual.type).toEqual(GameEventType.GameLeaderboardHost)
      if ('streaks' in actual.leaderboard[0]) {
        expect(actual.leaderboard[0].streaks).toEqual(0)
      }
    })

    it('should handle players with no previous position (new players)', () => {
      const leaderboard = [
        createMockLeaderboardTaskItem({
          position: 1,
          nickname: 'NewPlayer',
          score: 100,
          streaks: 1,
          previousPosition: undefined,
        }),
      ]

      const gameDocument = createMockGameDocument({
        currentTask: createMockLeaderboardTaskDocument({
          status: 'active',
          questionIndex: 0,
          leaderboard,
        }),
      })

      const actual = buildGameLeaderboardHostEvent(gameDocument as never)

      expect(actual.type).toEqual(GameEventType.GameLeaderboardHost)
      expect(actual.leaderboard[0].previousPosition).toBeUndefined()
    })

    it('should omit streaks for ZeroToOneHundred leaderboards', () => {
      const gameDocument = createMockGameDocument({
        mode: GameMode.ZeroToOneHundred,
        currentTask: createMockLeaderboardTaskDocument({
          status: 'active',
          questionIndex: 0,
          leaderboard: [
            createMockLeaderboardTaskItem({
              position: 1,
              nickname: 'PrecisePlayer',
              score: 100,
              streaks: 9,
            }),
          ],
        }),
      })

      const actual = buildGameLeaderboardHostEvent(gameDocument as never)

      expect(actual.game.mode).toBe(GameMode.ZeroToOneHundred)
      expect(actual.leaderboard[0]).toEqual({
        position: 1,
        previousPosition: 1,
        nickname: 'PrecisePlayer',
        score: 100,
      })
      expect(actual.leaderboard[0]).not.toHaveProperty('streaks')
    })
  })
})

function buildLeaderboard(count: number): LeaderboardTaskItem[] {
  return Array.from({ length: count }, (_, i) =>
    createMockLeaderboardTaskItem({
      position: i + 1,
      nickname: generateNickname(),
      score: Math.round((10000 / (i + 1)) * 10) / 10,
      streaks: i % 2 === 0 ? 3 : 0,
    }),
  )
}

function expectLeaderboard(
  event: GameLeaderboardHostEvent,
  expectedLength: number,
) {
  expect(event.leaderboard).toHaveLength(expectedLength)
  expect(event.leaderboard.every((p) => p.position <= 5)).toBe(true)
}
