import {
  DEFAULT_CRITTERS_AVATAR_V1,
  GameEventType,
  GamePodiumHostEvent,
  generateNickname,
} from '@klurigo/common'

import {
  createMockGameDocument,
  createMockLeaderboardTaskItem,
  createMockPodiumTaskDocument,
  MOCK_DEFAULT_GAME_NAME,
} from '../../../../test-utils/data'
import { LeaderboardTaskItem } from '../../game-core/repositories/models/schemas'

import { buildGamePodiumHostEvent } from './game-podium-event.utils'

describe('Game Podium Event Utils', () => {
  describe('buildGamePodiumHostEvent', () => {
    it('retains the task snapshot even after the player has left the participant list', () => {
      const avatar = {
        ...DEFAULT_CRITTERS_AVATAR_V1,
        top: null,
        body: 'block' as const,
      }
      const game = createMockGameDocument({
        participants: [],
        currentTask: createMockPodiumTaskDocument({
          leaderboard: [createMockLeaderboardTaskItem({ avatar })],
        }),
      })
      expect(
        buildGamePodiumHostEvent(game as never).leaderboard[0].avatar,
      ).toEqual(avatar)
    })

    it('should not include more than 5 players in the leaderboard', () => {
      const gameDocument = createMockGameDocument({
        currentTask: createMockPodiumTaskDocument({
          status: 'active',
          leaderboard: buildLeaderboard(6),
        }),
      })

      const actual = buildGamePodiumHostEvent(gameDocument as never)

      expect(actual.type).toEqual(GameEventType.GamePodiumHost)
      expect(actual.game.name).toEqual(MOCK_DEFAULT_GAME_NAME)
      expectLeaderboard(actual as GamePodiumHostEvent, 5)
    })

    it('should include exactly 5 players as-is without trimming', () => {
      const gameDocument = createMockGameDocument({
        currentTask: createMockPodiumTaskDocument({
          status: 'active',
          leaderboard: buildLeaderboard(5),
        }),
      })

      const actual = buildGamePodiumHostEvent(gameDocument as never)

      expect(actual.type).toEqual(GameEventType.GamePodiumHost)
      expect(actual.game.name).toEqual(MOCK_DEFAULT_GAME_NAME)
      expectLeaderboard(actual as GamePodiumHostEvent, 5)
    })

    it('should return an empty leaderboard if none is provided', () => {
      const gameDocument = createMockGameDocument({
        currentTask: createMockPodiumTaskDocument({
          status: 'active',
          leaderboard: [],
        }),
      })

      const actual = buildGamePodiumHostEvent(gameDocument as never)
      expect(actual.type).toEqual(GameEventType.GamePodiumHost)
      expect(actual.game.name).toEqual(MOCK_DEFAULT_GAME_NAME)
      expectLeaderboard(actual as GamePodiumHostEvent, 0)
    })

    it('should include fewer than 5 players when leaderboard has less than 5 players', () => {
      const gameDocument = createMockGameDocument({
        currentTask: createMockPodiumTaskDocument({
          status: 'active',
          leaderboard: buildLeaderboard(3),
        }),
      })

      const actual = buildGamePodiumHostEvent(gameDocument as never)

      expect(actual.type).toEqual(GameEventType.GamePodiumHost)
      expect(actual.game.name).toEqual(MOCK_DEFAULT_GAME_NAME)
      expectLeaderboard(actual as GamePodiumHostEvent, 3)
    })

    it('should include only 1 player when leaderboard has exactly 1 player', () => {
      const gameDocument = createMockGameDocument({
        currentTask: createMockPodiumTaskDocument({
          status: 'active',
          leaderboard: buildLeaderboard(1),
        }),
      })

      const actual = buildGamePodiumHostEvent(gameDocument as never)

      expect(actual.type).toEqual(GameEventType.GamePodiumHost)
      expect(actual.game.name).toEqual(MOCK_DEFAULT_GAME_NAME)
      expectLeaderboard(actual as GamePodiumHostEvent, 1)
    })

    it('should preserve correct order of players from leaderboard', () => {
      const leaderboard = [
        createMockLeaderboardTaskItem({
          position: 1,
          nickname: 'Player1',
          score: 1000,
          streaks: 5,
        }),
        createMockLeaderboardTaskItem({
          position: 2,
          nickname: 'Player2',
          score: 900,
          streaks: 3,
        }),
        createMockLeaderboardTaskItem({
          position: 3,
          nickname: 'Player3',
          score: 800,
          streaks: 0,
        }),
      ]

      const gameDocument = createMockGameDocument({
        currentTask: createMockPodiumTaskDocument({
          status: 'active',
          leaderboard,
        }),
      })

      const actual = buildGamePodiumHostEvent(gameDocument as never)

      expect(actual.type).toEqual(GameEventType.GamePodiumHost)
      expect(actual.game.name).toEqual(MOCK_DEFAULT_GAME_NAME)
      expect(actual.leaderboard).toHaveLength(3)
      expect(actual.leaderboard[0]).toEqual({
        avatar: DEFAULT_CRITTERS_AVATAR_V1,
        position: 1,
        nickname: 'Player1',
        score: 1000,
      })
      expect(actual.leaderboard[1]).toEqual({
        avatar: DEFAULT_CRITTERS_AVATAR_V1,
        position: 2,
        nickname: 'Player2',
        score: 900,
      })
      expect(actual.leaderboard[2]).toEqual({
        avatar: DEFAULT_CRITTERS_AVATAR_V1,
        position: 3,
        nickname: 'Player3',
        score: 800,
      })
    })

    it('should include the game name in the event', () => {
      const gameDocument = createMockGameDocument({
        name: 'Custom Trivia Night',
        currentTask: createMockPodiumTaskDocument({
          status: 'active',
          leaderboard: buildLeaderboard(3),
        }),
      })

      const actual = buildGamePodiumHostEvent(gameDocument as never)

      expect(actual.type).toEqual(GameEventType.GamePodiumHost)
      expect(actual.game.name).toEqual('Custom Trivia Night')
      expectLeaderboard(actual as GamePodiumHostEvent, 3)
    })

    it('should include game name with leaderboard of 5 players', () => {
      const gameDocument = createMockGameDocument({
        currentTask: createMockPodiumTaskDocument({
          status: 'active',
          leaderboard: buildLeaderboard(5),
        }),
      })

      const actual = buildGamePodiumHostEvent(gameDocument as never)

      expect(actual.type).toEqual(GameEventType.GamePodiumHost)
      expect(actual.game.name).toEqual(MOCK_DEFAULT_GAME_NAME)
      expectLeaderboard(actual as GamePodiumHostEvent, 5)
    })

    it('should handle players with zero streaks correctly', () => {
      const leaderboard = [
        createMockLeaderboardTaskItem({
          position: 1,
          nickname: 'Player1',
          score: 1000,
          streaks: 0,
        }),
      ]

      const gameDocument = createMockGameDocument({
        currentTask: createMockPodiumTaskDocument({
          status: 'active',
          leaderboard,
        }),
      })

      const actual = buildGamePodiumHostEvent(gameDocument as never)

      expect(actual.type).toEqual(GameEventType.GamePodiumHost)
      expect(actual.game.name).toEqual(MOCK_DEFAULT_GAME_NAME)
      expect(actual.leaderboard[0].score).toEqual(1000)
    })

    it('should handle players with maximum streaks correctly', () => {
      const leaderboard = [
        createMockLeaderboardTaskItem({
          position: 1,
          nickname: 'Player1',
          score: 1500,
          streaks: 10,
        }),
      ]

      const gameDocument = createMockGameDocument({
        currentTask: createMockPodiumTaskDocument({
          status: 'active',
          leaderboard,
        }),
      })

      const actual = buildGamePodiumHostEvent(gameDocument as never)

      expect(actual.type).toEqual(GameEventType.GamePodiumHost)
      expect(actual.game.name).toEqual(MOCK_DEFAULT_GAME_NAME)
      expect(actual.leaderboard[0].score).toEqual(1500)
    })

    it('should handle decimal scores correctly', () => {
      const leaderboard = [
        createMockLeaderboardTaskItem({
          position: 1,
          nickname: 'Player1',
          score: 1234.5,
          streaks: 2,
        }),
        createMockLeaderboardTaskItem({
          position: 2,
          nickname: 'Player2',
          score: 987.3,
          streaks: 1,
        }),
      ]

      const gameDocument = createMockGameDocument({
        currentTask: createMockPodiumTaskDocument({
          status: 'active',
          leaderboard,
        }),
      })

      const actual = buildGamePodiumHostEvent(gameDocument as never)

      expect(actual.type).toEqual(GameEventType.GamePodiumHost)
      expect(actual.game.name).toEqual(MOCK_DEFAULT_GAME_NAME)
      expect(actual.leaderboard[0].score).toEqual(1234.5)
      expect(actual.leaderboard[1].score).toEqual(987.3)
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

function expectLeaderboard(event: GamePodiumHostEvent, expectedLength: number) {
  expect(event.leaderboard).toHaveLength(expectedLength)
  expect(event.leaderboard.every((p) => p.position <= 5)).toBe(true)
}
