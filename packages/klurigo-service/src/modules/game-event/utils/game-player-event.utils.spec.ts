import { GameEventType, GameStatus } from '@klurigo/common'

import {
  createMockGameDocument,
  createMockGamePlayerParticipantDocument,
  createMockLeaderboardTaskDocument,
  createMockLobbyTaskDocument,
  createMockMultiChoiceQuestionDocument,
  createMockPodiumTaskDocument,
  createMockQuestionResultTaskDocument,
  createMockQuestionTaskDocument,
  createMockQuestionTaskMultiChoiceAnswer,
  createMockQuitTaskDocument,
} from '../../../../test-utils/data'

import { buildPlayerGameEvent } from './game-player-event.utils'

describe('buildPlayerGameEvent', () => {
  const mockPlayer = createMockGamePlayerParticipantDocument()

  describe('Lobby Task', () => {
    it('should return loading event when lobby task status is pending', () => {
      const game = createMockGameDocument({
        currentTask: createMockLobbyTaskDocument(),
      })

      const result = buildPlayerGameEvent(game as never, mockPlayer)

      expect(result.type).toBe(GameEventType.GameLoading)
    })

    it('should return lobby player event when lobby task status is active', () => {
      const game = createMockGameDocument({
        currentTask: { ...createMockLobbyTaskDocument(), status: 'active' },
      })

      const result = buildPlayerGameEvent(game as never, mockPlayer)

      expect(result.type).toBe(GameEventType.GameLobbyPlayer)
      if (result.type === GameEventType.GameLobbyPlayer) {
        expect(result.player.nickname).toBe(mockPlayer.nickname)
      }
    })

    it('should return begin player event when lobby task status is completed', () => {
      const game = createMockGameDocument({
        currentTask: {
          ...createMockLobbyTaskDocument(),
          status: 'completed',
        },
      })

      const result = buildPlayerGameEvent(game as never, mockPlayer)

      expect(result.type).toBe(GameEventType.GameBeginPlayer)
      if (result.type === GameEventType.GameBeginPlayer) {
        expect(result.player.nickname).toBe(mockPlayer.nickname)
      }
    })
  })

  describe('Question Task', () => {
    it('should return question preview player event when question task status is pending', () => {
      const game = createMockGameDocument({
        questions: [createMockMultiChoiceQuestionDocument()],
        currentTask: createMockQuestionTaskDocument({ status: 'pending' }),
      })

      const result = buildPlayerGameEvent(game as never, mockPlayer)

      expect(result.type).toBe(GameEventType.GameQuestionPreviewPlayer)
    })

    it('should return question player event when question task status is active', () => {
      const game = createMockGameDocument({
        questions: [createMockMultiChoiceQuestionDocument()],
        currentTask: createMockQuestionTaskDocument({ status: 'active' }),
      })

      const result = buildPlayerGameEvent(game as never, mockPlayer)

      expect(result.type).toBe(GameEventType.GameQuestionPlayer)
    })

    it('should return question player event when question task status is completed', () => {
      const game = createMockGameDocument({
        questions: [createMockMultiChoiceQuestionDocument()],
        currentTask: createMockQuestionTaskDocument({ status: 'completed' }),
      })

      const result = buildPlayerGameEvent(game as never, mockPlayer)

      expect(result.type).toBe(GameEventType.GameQuestionPlayer)
    })

    it('should include player answer submission in metadata when provided', () => {
      const game = createMockGameDocument({
        questions: [createMockMultiChoiceQuestionDocument()],
        currentTask: createMockQuestionTaskDocument({ status: 'active' }),
      })
      const playerAnswer = createMockQuestionTaskMultiChoiceAnswer()

      const result = buildPlayerGameEvent(game as never, mockPlayer, {
        playerAnswerSubmission: playerAnswer,
      })

      expect(result.type).toBe(GameEventType.GameQuestionPlayer)
    })
  })

  describe('Question Result Task', () => {
    it('should return loading event when question result task status is pending', () => {
      const game = createMockGameDocument({
        currentTask: createMockQuestionResultTaskDocument({
          status: 'pending',
        }),
      })

      const result = buildPlayerGameEvent(game as never, mockPlayer)

      expect(result.type).toBe(GameEventType.GameLoading)
    })

    it('should return result player event when question result task status is active', () => {
      const game = createMockGameDocument({
        currentTask: createMockQuestionResultTaskDocument({
          status: 'active',
        }),
      })

      const result = buildPlayerGameEvent(game as never, mockPlayer)

      expect(result.type).toBe(GameEventType.GameResultPlayer)
    })

    it('should return loading event when question result task status is completed', () => {
      const game = createMockGameDocument({
        currentTask: createMockQuestionResultTaskDocument({
          status: 'completed',
        }),
      })

      const result = buildPlayerGameEvent(game as never, mockPlayer)

      expect(result.type).toBe(GameEventType.GameLoading)
    })
  })

  describe('Leaderboard Task', () => {
    it('should return loading event when leaderboard task status is pending', () => {
      const game = createMockGameDocument({
        currentTask: createMockLeaderboardTaskDocument({ status: 'pending' }),
      })

      const result = buildPlayerGameEvent(game as never, mockPlayer)

      expect(result.type).toBe(GameEventType.GameLoading)
    })

    it('should return result player event when leaderboard task status is active', () => {
      const game = createMockGameDocument({
        currentTask: createMockLeaderboardTaskDocument({ status: 'active' }),
        previousTasks: [createMockQuestionResultTaskDocument()],
      })

      const result = buildPlayerGameEvent(game as never, mockPlayer)

      expect(result.type).toBe(GameEventType.GameResultPlayer)
    })

    it('should return loading event when leaderboard task status is completed', () => {
      const game = createMockGameDocument({
        currentTask: createMockLeaderboardTaskDocument({
          status: 'completed',
        }),
      })

      const result = buildPlayerGameEvent(game as never, mockPlayer)

      expect(result.type).toBe(GameEventType.GameLoading)
    })
  })

  describe('Podium Task', () => {
    it('should return loading event when podium task status is pending', () => {
      const game = createMockGameDocument({
        currentTask: createMockPodiumTaskDocument({ status: 'pending' }),
      })

      const result = buildPlayerGameEvent(game as never, mockPlayer)

      expect(result.type).toBe(GameEventType.GameLoading)
    })

    it('should return game over player event when podium task status is active', () => {
      const game = createMockGameDocument({
        currentTask: createMockPodiumTaskDocument({ status: 'active' }),
        participants: [mockPlayer],
      })

      const result = buildPlayerGameEvent(game as never, mockPlayer)

      expect(result.type).toBe(GameEventType.GameOverPlayer)
    })

    it('should return game over player event when podium task status is completed', () => {
      const game = createMockGameDocument({
        currentTask: createMockPodiumTaskDocument({ status: 'completed' }),
        participants: [mockPlayer],
      })

      const result = buildPlayerGameEvent(game as never, mockPlayer)

      expect(result.type).toBe(GameEventType.GameOverPlayer)
    })
  })

  describe('Quit Status', () => {
    it('should return quit event when game status is expired', () => {
      const game = createMockGameDocument({
        status: GameStatus.Expired,
        currentTask: createMockLobbyTaskDocument({ status: 'active' }),
      })

      const result = buildPlayerGameEvent(game as never, mockPlayer)

      expect(result.type).toBe(GameEventType.GameQuitEvent)
      if (result.type === GameEventType.GameQuitEvent) {
        expect(result.status).toBe(GameStatus.Expired)
      }
    })

    it('should return quit event when game status is terminated', () => {
      const game = createMockGameDocument({
        status: GameStatus.Terminated,
        currentTask: createMockQuestionTaskDocument({ status: 'active' }),
      })

      const result = buildPlayerGameEvent(game as never, mockPlayer)

      expect(result.type).toBe(GameEventType.GameQuitEvent)
      if (result.type === GameEventType.GameQuitEvent) {
        expect(result.status).toBe(GameStatus.Terminated)
      }
    })

    it('should throw error when task is quit task but game status is still active', () => {
      const game = createMockGameDocument({
        status: GameStatus.Active,
        currentTask: createMockQuitTaskDocument(),
      })

      expect(() => buildPlayerGameEvent(game as never, mockPlayer)).toThrow(
        'Unknown task',
      )
    })
  })

  describe('Error Cases', () => {
    it('should throw error for unknown task type', () => {
      const game = createMockGameDocument({
        currentTask: {
          _id: 'unknown-task-id',
          type: 'unknown' as never,
          status: 'active',
          created: new Date(),
        },
      })

      expect(() => buildPlayerGameEvent(game as never, mockPlayer)).toThrow(
        'Unknown task',
      )
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty metadata object', () => {
      const game = createMockGameDocument({
        questions: [createMockMultiChoiceQuestionDocument()],
        currentTask: createMockQuestionTaskDocument({ status: 'active' }),
      })

      const result = buildPlayerGameEvent(game as never, mockPlayer, {})

      expect(result.type).toBe(GameEventType.GameQuestionPlayer)
    })

    it('should handle undefined metadata', () => {
      const game = createMockGameDocument({
        questions: [createMockMultiChoiceQuestionDocument()],
        currentTask: createMockQuestionTaskDocument({ status: 'active' }),
      })

      const result = buildPlayerGameEvent(game as never, mockPlayer)

      expect(result.type).toBe(GameEventType.GameQuestionPlayer)
    })

    it('should handle player with minimal required properties', () => {
      const game = createMockGameDocument({
        currentTask: { ...createMockLobbyTaskDocument(), status: 'active' },
      })
      const minimalPlayer = {
        participantId: 'minimal-player-id',
        nickname: 'MinimalPlayer',
        type: 'player' as const,
      }

      const result = buildPlayerGameEvent(game as never, minimalPlayer as never)

      expect(result.type).toBe(GameEventType.GameLobbyPlayer)
      if (result.type === GameEventType.GameLobbyPlayer) {
        expect(result.player.nickname).toBe('MinimalPlayer')
      }
    })

    it('should handle game with valid questions for question task', () => {
      const game = createMockGameDocument({
        questions: [createMockMultiChoiceQuestionDocument()],
        currentTask: createMockQuestionTaskDocument({ status: 'pending' }),
      })

      const result = buildPlayerGameEvent(game as never, mockPlayer)

      expect(result.type).toBe(GameEventType.GameQuestionPreviewPlayer)
    })

    it('should handle metadata with null playerAnswerSubmission', () => {
      const game = createMockGameDocument({
        questions: [createMockMultiChoiceQuestionDocument()],
        currentTask: createMockQuestionTaskDocument({ status: 'active' }),
      })

      const result = buildPlayerGameEvent(game as never, mockPlayer, {
        playerAnswerSubmission: null as never,
      })

      expect(result.type).toBe(GameEventType.GameQuestionPlayer)
    })
  })
})
