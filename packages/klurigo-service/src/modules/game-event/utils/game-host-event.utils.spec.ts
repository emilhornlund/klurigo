import { GameEventType, GameStatus } from '@klurigo/common'

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
  createMockQuitTaskDocument,
} from '../../../../test-utils/data'

import { buildHostGameEvent } from './game-host-event.utils'

describe('buildHostGameEvent', () => {
  describe('Lobby Task', () => {
    it('should return loading event when lobby task status is pending', () => {
      const game = createMockGameDocument({
        currentTask: createMockLobbyTaskDocument(),
      })

      const result = buildHostGameEvent(game as never)

      expect(result.type).toBe(GameEventType.GameLoading)
    })

    it('should return lobby host event when lobby task status is active', () => {
      const player = createMockGamePlayerParticipantDocument()
      const game = createMockGameDocument({
        currentTask: { ...createMockLobbyTaskDocument(), status: 'active' },
        participants: [player],
      })

      const result = buildHostGameEvent(game as never)

      expect(result.type).toBe(GameEventType.GameLobbyHost)
      if (result.type === GameEventType.GameLobbyHost) {
        expect(result.game.id).toBe(game._id)
        expect(result.game.pin).toBe(game.pin)
        expect(result.players).toHaveLength(1)
        expect(result.players[0]).toEqual({
          id: player.participantId,
          nickname: player.nickname,
        })
      }
    })

    it('should return begin host event when lobby task status is completed', () => {
      const game = createMockGameDocument({
        currentTask: {
          ...createMockLobbyTaskDocument(),
          status: 'completed',
        },
      })

      const result = buildHostGameEvent(game as never)

      expect(result.type).toBe(GameEventType.GameBeginHost)
    })

    it('should filter out non-player participants in lobby host event', () => {
      const player = createMockGamePlayerParticipantDocument()
      const host = createMockGameHostParticipantDocument()
      const game = createMockGameDocument({
        currentTask: { ...createMockLobbyTaskDocument(), status: 'active' },
        participants: [player, host],
      })

      const result = buildHostGameEvent(game as never)

      expect(result.type).toBe(GameEventType.GameLobbyHost)
      if (result.type === GameEventType.GameLobbyHost) {
        expect(result.players).toHaveLength(1)
        expect(result.players[0].id).toBe(player.participantId)
      }
    })
  })

  describe('Question Task', () => {
    it('should return question preview host event when question task status is pending', () => {
      const game = createMockGameDocument({
        questions: [createMockMultiChoiceQuestionDocument()],
        currentTask: createMockQuestionTaskDocument({ status: 'pending' }),
      })

      const result = buildHostGameEvent(game as never)

      expect(result.type).toBe(GameEventType.GameQuestionPreviewHost)
    })

    it('should return question host event when question task status is active', () => {
      const game = createMockGameDocument({
        questions: [createMockMultiChoiceQuestionDocument()],
        currentTask: createMockQuestionTaskDocument({ status: 'active' }),
      })

      const result = buildHostGameEvent(game as never, {
        currentAnswerSubmissions: 3,
        totalAnswerSubmissions: 5,
      })

      expect(result.type).toBe(GameEventType.GameQuestionHost)
    })

    it('should use default metadata values when not provided', () => {
      const game = createMockGameDocument({
        questions: [createMockMultiChoiceQuestionDocument()],
        currentTask: createMockQuestionTaskDocument({ status: 'active' }),
      })

      const result = buildHostGameEvent(game as never)

      expect(result.type).toBe(GameEventType.GameQuestionHost)
    })

    it('should return loading event when question task status is completed', () => {
      const game = createMockGameDocument({
        currentTask: createMockQuestionTaskDocument({ status: 'completed' }),
      })

      const result = buildHostGameEvent(game as never)

      expect(result.type).toBe(GameEventType.GameLoading)
    })
  })

  describe('Question Result Task', () => {
    it('should return loading event when question result task status is pending', () => {
      const game = createMockGameDocument({
        currentTask: createMockQuestionResultTaskDocument({
          status: 'pending',
        }),
      })

      const result = buildHostGameEvent(game as never)

      expect(result.type).toBe(GameEventType.GameLoading)
    })

    it('should return result host event when question result task status is active', () => {
      const game = createMockGameDocument({
        questions: [createMockMultiChoiceQuestionDocument()],
        currentTask: createMockQuestionResultTaskDocument({
          status: 'active',
        }),
      })

      const result = buildHostGameEvent(game as never)

      expect(result.type).toBe(GameEventType.GameResultHost)
    })

    it('should return loading event when question result task status is completed', () => {
      const game = createMockGameDocument({
        currentTask: createMockQuestionResultTaskDocument({
          status: 'completed',
        }),
      })

      const result = buildHostGameEvent(game as never)

      expect(result.type).toBe(GameEventType.GameLoading)
    })
  })

  describe('Leaderboard Task', () => {
    it('should return loading event when leaderboard task status is pending', () => {
      const game = createMockGameDocument({
        currentTask: createMockLeaderboardTaskDocument({ status: 'pending' }),
      })

      const result = buildHostGameEvent(game as never)

      expect(result.type).toBe(GameEventType.GameLoading)
    })

    it('should return leaderboard host event when leaderboard task status is active', () => {
      const game = createMockGameDocument({
        currentTask: createMockLeaderboardTaskDocument({ status: 'active' }),
      })

      const result = buildHostGameEvent(game as never)

      expect(result.type).toBe(GameEventType.GameLeaderboardHost)
    })

    it('should return loading event when leaderboard task status is completed', () => {
      const game = createMockGameDocument({
        currentTask: createMockLeaderboardTaskDocument({
          status: 'completed',
        }),
      })

      const result = buildHostGameEvent(game as never)

      expect(result.type).toBe(GameEventType.GameLoading)
    })
  })

  describe('Podium Task', () => {
    it('should return loading event when podium task status is pending', () => {
      const game = createMockGameDocument({
        currentTask: createMockPodiumTaskDocument({ status: 'pending' }),
      })

      const result = buildHostGameEvent(game as never)

      expect(result.type).toBe(GameEventType.GameLoading)
    })

    it('should return podium host event when podium task status is active and game is active', () => {
      const game = createMockGameDocument({
        status: GameStatus.Active,
        currentTask: createMockPodiumTaskDocument({ status: 'active' }),
      })

      const result = buildHostGameEvent(game as never)

      expect(result.type).toBe(GameEventType.GamePodiumHost)
    })

    it('should return quit event when podium task status is active and game is completed', () => {
      const game = createMockGameDocument({
        status: GameStatus.Completed,
        currentTask: createMockPodiumTaskDocument({ status: 'active' }),
      })

      const result = buildHostGameEvent(game as never)

      expect(result.type).toBe(GameEventType.GameQuitEvent)
      if (result.type === GameEventType.GameQuitEvent) {
        expect(result.status).toBe(GameStatus.Completed)
      }
    })

    it('should return quit event when podium task status is pending and game is completed', () => {
      const game = createMockGameDocument({
        status: GameStatus.Completed,
        currentTask: createMockPodiumTaskDocument({ status: 'pending' }),
      })

      const result = buildHostGameEvent(game as never)

      expect(result.type).toBe(GameEventType.GameQuitEvent)
      if (result.type === GameEventType.GameQuitEvent) {
        expect(result.status).toBe(GameStatus.Completed)
      }
    })

    it('should return loading event when podium task status is completed', () => {
      const game = createMockGameDocument({
        currentTask: createMockPodiumTaskDocument({ status: 'completed' }),
      })

      const result = buildHostGameEvent(game as never)

      expect(result.type).toBe(GameEventType.GameLoading)
    })
  })

  describe('Quit Status', () => {
    it('should return quit event when game status is expired', () => {
      const game = createMockGameDocument({
        status: GameStatus.Expired,
        currentTask: createMockLobbyTaskDocument({ status: 'active' }),
      })

      const result = buildHostGameEvent(game as never)

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

      const result = buildHostGameEvent(game as never)

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

      expect(() => buildHostGameEvent(game as never)).toThrow('Unknown task')
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

      expect(() => buildHostGameEvent(game as never)).toThrow('Unknown task')
    })
  })

  describe('Edge Cases', () => {
    it('should handle metadata with only currentAnswerSubmissions', () => {
      const game = createMockGameDocument({
        questions: [createMockMultiChoiceQuestionDocument()],
        currentTask: createMockQuestionTaskDocument({ status: 'active' }),
      })

      const result = buildHostGameEvent(game as never, {
        currentAnswerSubmissions: 3,
      })

      expect(result.type).toBe(GameEventType.GameQuestionHost)
    })

    it('should handle metadata with only totalAnswerSubmissions', () => {
      const game = createMockGameDocument({
        questions: [createMockMultiChoiceQuestionDocument()],
        currentTask: createMockQuestionTaskDocument({ status: 'active' }),
      })

      const result = buildHostGameEvent(game as never, {
        totalAnswerSubmissions: 5,
      })

      expect(result.type).toBe(GameEventType.GameQuestionHost)
    })

    it('should handle metadata with null values', () => {
      const game = createMockGameDocument({
        questions: [createMockMultiChoiceQuestionDocument()],
        currentTask: createMockQuestionTaskDocument({ status: 'active' }),
      })

      const result = buildHostGameEvent(game as never, {
        currentAnswerSubmissions: null as never,
        totalAnswerSubmissions: null as never,
      })

      expect(result.type).toBe(GameEventType.GameQuestionHost)
    })

    it('should handle empty participants array in lobby host event', () => {
      const game = createMockGameDocument({
        currentTask: { ...createMockLobbyTaskDocument(), status: 'active' },
        participants: [],
      })

      const result = buildHostGameEvent(game as never)

      expect(result.type).toBe(GameEventType.GameLobbyHost)
      if (result.type === GameEventType.GameLobbyHost) {
        expect(result.players).toHaveLength(0)
      }
    })

    it('should handle game with valid questions for question task', () => {
      const game = createMockGameDocument({
        questions: [createMockMultiChoiceQuestionDocument()],
        currentTask: createMockQuestionTaskDocument({ status: 'pending' }),
      })

      const result = buildHostGameEvent(game as never)

      expect(result.type).toBe(GameEventType.GameQuestionPreviewHost)
    })
  })

  describe('Edge Cases', () => {
    it('should handle metadata with only currentAnswerSubmissions', () => {
      const game = createMockGameDocument({
        questions: [createMockMultiChoiceQuestionDocument()],
        currentTask: createMockQuestionTaskDocument({ status: 'active' }),
      })

      const result = buildHostGameEvent(game as never, {
        currentAnswerSubmissions: 3,
      })

      expect(result.type).toBe(GameEventType.GameQuestionHost)
    })

    it('should handle metadata with only totalAnswerSubmissions', () => {
      const game = createMockGameDocument({
        questions: [createMockMultiChoiceQuestionDocument()],
        currentTask: createMockQuestionTaskDocument({ status: 'active' }),
      })

      const result = buildHostGameEvent(game as never, {
        totalAnswerSubmissions: 5,
      })

      expect(result.type).toBe(GameEventType.GameQuestionHost)
    })

    it('should handle metadata with null values', () => {
      const game = createMockGameDocument({
        questions: [createMockMultiChoiceQuestionDocument()],
        currentTask: createMockQuestionTaskDocument({ status: 'active' }),
      })

      const result = buildHostGameEvent(game as never, {
        currentAnswerSubmissions: null as never,
        totalAnswerSubmissions: null as never,
      })

      expect(result.type).toBe(GameEventType.GameQuestionHost)
    })

    it('should handle empty participants array in lobby host event', () => {
      const game = createMockGameDocument({
        currentTask: { ...createMockLobbyTaskDocument(), status: 'active' },
        participants: [],
      })

      const result = buildHostGameEvent(game as never)

      expect(result.type).toBe(GameEventType.GameLobbyHost)
      if (result.type === GameEventType.GameLobbyHost) {
        expect(result.players).toHaveLength(0)
      }
    })

    it('should handle game with valid questions for question task', () => {
      const game = createMockGameDocument({
        questions: [createMockMultiChoiceQuestionDocument()],
        currentTask: createMockQuestionTaskDocument({ status: 'pending' }),
      })

      const result = buildHostGameEvent(game as never)

      expect(result.type).toBe(GameEventType.GameQuestionPreviewHost)
    })
  })
})
