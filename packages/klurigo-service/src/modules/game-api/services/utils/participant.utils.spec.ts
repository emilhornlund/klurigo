import { GameMode, GameParticipantType } from '@klurigo/common'

import {
  createMockGameDocument,
  createMockGamePlayerParticipantDocument,
  createMockLeaderboardTaskDocument,
  createMockLeaderboardTaskItem,
  createMockLobbyTaskDocument,
  createMockQuestionResultTaskDocument,
  createMockQuestionResultTaskItemDocument,
  createMockQuestionTaskDocument,
} from '../../../../../test-utils/data'

import { addPlayerParticipantToGame } from './participant.utils'

describe('Participant Utils', () => {
  describe('addPlayerParticipantToGame', () => {
    it('appends a new PLAYER participant and returns the same game instance', () => {
      const game = createMockGameDocument({
        mode: GameMode.Classic,
        currentTask: createMockLobbyTaskDocument(),
        participants: [
          createMockGamePlayerParticipantDocument({
            participantId: 'player-1',
            nickname: 'Existing',
            rank: 0,
            totalScore: 0,
          }),
        ],
      })

      const beforeRef = game
      const beforeLength = game.participants.length

      const result = addPlayerParticipantToGame(
        game as never,
        'player-2',
        'New Player',
      )

      expect(result).toBe(beforeRef)
      expect(result.participants.length).toBe(beforeLength + 1)

      const added = result.participants[result.participants.length - 1] as any
      expect(added).toMatchObject({
        participantId: 'player-2',
        type: GameParticipantType.PLAYER,
        nickname: 'New Player',
        currentStreak: 0,
        totalResponseTime: 0,
        responseCount: 0,
      })
      expect(typeof added.created).toBe('object')
      expect(typeof added.updated).toBe('object')
      expect(added.created).toBeInstanceOf(Date)
      expect(added.updated).toBeInstanceOf(Date)
      expect(added.updated.getTime()).toBe(added.created.getTime())
    })

    it('sets rank=0 and worstRank=0 when current task is Lobby (regardless of existing ranks)', () => {
      const game = createMockGameDocument({
        mode: GameMode.Classic,
        currentTask: createMockLobbyTaskDocument(),
        participants: [
          createMockGamePlayerParticipantDocument({
            participantId: 'player-1',
            rank: 7,
            worstRank: 7,
          }),
          createMockGamePlayerParticipantDocument({
            participantId: 'player-2',
            rank: 3,
            worstRank: 3,
          }),
        ],
      })

      const result = addPlayerParticipantToGame(
        game as never,
        'player-3',
        'Lobby Joiner',
      )

      const added = result.participants[result.participants.length - 1] as any
      expect(added.rank).toBe(0)
      expect(added.worstRank).toBe(0)
      expect(added.totalScore).toBe(0)
    })

    it('sets rank to max(existing player ranks)+1 and worstRank equal to rank when not Lobby', () => {
      const game = createMockGameDocument({
        mode: GameMode.Classic,
        currentTask: createMockQuestionTaskDocument(),
        participants: [
          createMockGamePlayerParticipantDocument({
            participantId: 'player-1',
            rank: 0,
          }),
          createMockGamePlayerParticipantDocument({
            participantId: 'player-2',
            rank: 2,
          }),
          createMockGamePlayerParticipantDocument({
            participantId: 'player-3',
            rank: 5,
          }),
        ],
      })

      const result = addPlayerParticipantToGame(
        game as never,
        'player-4',
        'Late Joiner',
      )

      const added = result.participants[result.participants.length - 1] as any
      expect(added.rank).toBe(6)
      expect(added.worstRank).toBe(6)
      expect(added.totalScore).toBe(0)
    })

    it('ranks a joiner below the current question result when participant ranks are stale', () => {
      const firstPlayerId = 'player-1'
      const secondPlayerId = 'player-2'
      const game = createMockGameDocument({
        mode: GameMode.Classic,
        currentTask: createMockQuestionResultTaskDocument({
          results: [
            createMockQuestionResultTaskItemDocument({
              playerId: firstPlayerId,
              totalScore: 100,
              position: 1,
              totalResponseTime: 1000,
            }),
            createMockQuestionResultTaskItemDocument({
              playerId: secondPlayerId,
              totalScore: 50,
              position: 2,
              totalResponseTime: 2000,
            }),
          ],
        }),
        participants: [
          createMockGamePlayerParticipantDocument({
            participantId: firstPlayerId,
            rank: 0,
            totalScore: 0,
          }),
          createMockGamePlayerParticipantDocument({
            participantId: secondPlayerId,
            rank: 0,
            totalScore: 0,
          }),
        ],
      })

      const result = addPlayerParticipantToGame(
        game as never,
        'player-3',
        'Late Joiner',
      )

      const added = result.participants[result.participants.length - 1] as any
      expect(added.rank).toBe(3)
      expect(added.totalScore).toBe(0)
    })

    it('ranks a ZeroToOneHundred joiner using the rounded initialized score', () => {
      const firstPlayerId = 'player-1'
      const secondPlayerId = 'player-2'
      const game = createMockGameDocument({
        mode: GameMode.ZeroToOneHundred,
        currentTask: createMockQuestionResultTaskDocument({
          results: [
            createMockQuestionResultTaskItemDocument({
              playerId: firstPlayerId,
              totalScore: 20,
              position: 1,
              totalResponseTime: 1000,
            }),
            createMockQuestionResultTaskItemDocument({
              playerId: secondPlayerId,
              totalScore: 80,
              position: 2,
              totalResponseTime: 2000,
            }),
          ],
        }),
        participants: [
          createMockGamePlayerParticipantDocument({
            participantId: firstPlayerId,
            rank: 1,
            totalScore: 10,
          }),
          createMockGamePlayerParticipantDocument({
            participantId: secondPlayerId,
            rank: 2,
            totalScore: 60,
          }),
        ],
      })

      const result = addPlayerParticipantToGame(
        game as never,
        'player-3',
        'Average Starter',
      )

      const added = result.participants[result.participants.length - 1] as any
      expect(added.totalScore).toBe(35)
      expect(added.rank).toBe(2)
    })

    it('uses established participant scores while the next question is active', () => {
      const game = createMockGameDocument({
        mode: GameMode.ZeroToOneHundred,
        currentTask: createMockQuestionTaskDocument(),
        participants: [
          createMockGamePlayerParticipantDocument({
            participantId: 'player-1',
            rank: 1,
            totalScore: 10,
          }),
          createMockGamePlayerParticipantDocument({
            participantId: 'player-2',
            rank: 2,
            totalScore: 60,
          }),
        ],
      })

      const result = addPlayerParticipantToGame(
        game as never,
        'player-3',
        'Average Starter',
      )

      const added = result.participants[result.participants.length - 1] as any
      expect(added.totalScore).toBe(35)
      expect(added.rank).toBe(2)
    })

    it('uses the current leaderboard snapshot when assigning a late-join rank', () => {
      const game = createMockGameDocument({
        mode: GameMode.Classic,
        currentTask: createMockLeaderboardTaskDocument({
          leaderboard: [
            createMockLeaderboardTaskItem({
              playerId: 'player-1',
              score: 100,
              position: 1,
            }),
            createMockLeaderboardTaskItem({
              playerId: 'player-2',
              score: 50,
              position: 2,
            }),
          ],
        }),
        participants: [
          createMockGamePlayerParticipantDocument({
            participantId: 'player-1',
            rank: 0,
          }),
          createMockGamePlayerParticipantDocument({
            participantId: 'player-2',
            rank: 0,
          }),
        ],
      })

      const result = addPlayerParticipantToGame(
        game as never,
        'player-3',
        'Late Joiner',
      )

      const added = result.participants[result.participants.length - 1] as any
      expect(added.rank).toBe(3)
    })

    it('when not Lobby and there are no existing PLAYER participants, sets rank=1 (first non-lobby rank)', () => {
      const game = createMockGameDocument({
        mode: GameMode.Classic,
        currentTask: createMockQuestionTaskDocument(),
        participants: [],
      })

      const result = addPlayerParticipantToGame(
        game as never,
        'player-1',
        'First Player',
      )

      const added = result.participants[result.participants.length - 1] as any
      expect(added.rank).toBe(1)
      expect(added.worstRank).toBe(1)
      expect(added.totalScore).toBe(0)
    })

    it('in ZeroToOneHundred mode when joining after Lobby, sets totalScore to the average totalScore of existing players', () => {
      const game = createMockGameDocument({
        mode: GameMode.ZeroToOneHundred,
        currentTask: createMockQuestionTaskDocument(),
        participants: [
          createMockGamePlayerParticipantDocument({
            participantId: 'player-1',
            rank: 0,
            totalScore: 10,
          }),
          createMockGamePlayerParticipantDocument({
            participantId: 'player-2',
            rank: 1,
            totalScore: 30,
          }),
          createMockGamePlayerParticipantDocument({
            participantId: 'player-3',
            rank: 2,
            totalScore: 60,
          }),
        ],
      })

      const result = addPlayerParticipantToGame(
        game as never,
        'player-4',
        'Average Starter',
      )

      const added = result.participants[result.participants.length - 1] as any
      expect(added.totalScore).toBe(33)
      expect(added.rank).toBe(3)
      expect(added.worstRank).toBe(3)
    })

    it('in ZeroToOneHundred mode when joining in Lobby, totalScore still defaults to 0', () => {
      const game = createMockGameDocument({
        mode: GameMode.ZeroToOneHundred,
        currentTask: createMockLobbyTaskDocument(),
        participants: [
          createMockGamePlayerParticipantDocument({
            participantId: 'player-1',
            rank: 0,
            totalScore: 42,
          }),
        ],
      })

      const result = addPlayerParticipantToGame(
        game as never,
        'player-2',
        'Lobby Joiner',
      )

      const added = result.participants[result.participants.length - 1] as any
      expect(added.rank).toBe(0)
      expect(added.worstRank).toBe(0)
      expect(added.totalScore).toBe(0)
    })

    it('sets created/updated using the current time (stable via fake timers)', () => {
      jest.useFakeTimers()
      jest.setSystemTime(new Date('2026-01-07T20:00:00.000Z'))

      const game = createMockGameDocument({
        mode: GameMode.Classic,
        currentTask: createMockQuestionTaskDocument(),
        participants: [
          createMockGamePlayerParticipantDocument({
            participantId: 'player-1',
            rank: 0,
          }),
        ],
      })

      const result = addPlayerParticipantToGame(
        game as never,
        'player-2',
        'Timed Player',
      )

      const added = result.participants[result.participants.length - 1] as any
      expect(added.created.toISOString()).toBe('2026-01-07T20:00:00.000Z')
      expect(added.updated.toISOString()).toBe('2026-01-07T20:00:00.000Z')

      jest.useRealTimers()
    })
  })
})
