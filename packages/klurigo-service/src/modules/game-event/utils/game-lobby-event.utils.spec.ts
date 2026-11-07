import { GameEventType } from '@klurigo/common'

import {
  createMockGameDocument,
  createMockGameHostParticipantDocument,
  createMockGamePlayerParticipantDocument,
  createMockLobbyTaskDocument,
} from '../../../../test-utils/data'

import {
  buildGameBeginHostEvent,
  buildGameBeginPlayerEvent,
  buildGameLobbyHostEvent,
  buildGameLobbyPlayerEvent,
} from './game-lobby-event.utils'

describe('Game Lobby Event Utils', () => {
  describe('buildGameLobbyHostEvent', () => {
    it('should return lobby host event with game info and players', () => {
      const player1 = createMockGamePlayerParticipantDocument({
        participantId: 'player-1',
        nickname: 'PlayerOne',
      })
      const player2 = createMockGamePlayerParticipantDocument({
        participantId: 'player-2',
        nickname: 'PlayerTwo',
      })
      const host = createMockGameHostParticipantDocument()
      const game = createMockGameDocument({
        _id: 'game-123',
        pin: '123456',
        participants: [player1, player2, host],
        currentTask: createMockLobbyTaskDocument(),
        settings: {
          shouldAutoCompleteQuestionResultTask: false,
          shouldAutoCompleteLeaderboardTask: false,
          shouldAutoCompletePodiumTask: false,
          randomizeQuestionOrder: false,
          randomizeAnswerOrder: false,
        },
      })

      const result = buildGameLobbyHostEvent(game as never)

      expect(result.type).toBe(GameEventType.GameLobbyHost)
      expect(result.game.id).toBe('game-123')
      expect(result.game.pin).toBe('123456')
      expect(result.game.settings).toEqual({
        randomizeQuestionOrder: false,
        randomizeAnswerOrder: false,
      })
      expect(result.players).toHaveLength(2)
      expect(result.players).toEqual([
        { id: 'player-1', nickname: 'PlayerOne' },
        { id: 'player-2', nickname: 'PlayerTwo' },
      ])
    })

    it('should return empty players array when no players are present', () => {
      const host = createMockGameHostParticipantDocument()
      const game = createMockGameDocument({
        _id: 'game-456',
        pin: '654321',
        participants: [host],
        currentTask: createMockLobbyTaskDocument(),
        settings: {
          shouldAutoCompleteQuestionResultTask: false,
          shouldAutoCompleteLeaderboardTask: false,
          shouldAutoCompletePodiumTask: false,
          randomizeQuestionOrder: true,
          randomizeAnswerOrder: true,
        },
      })

      const result = buildGameLobbyHostEvent(game as never)

      expect(result.type).toBe(GameEventType.GameLobbyHost)
      expect(result.game.id).toBe('game-456')
      expect(result.game.pin).toBe('654321')
      expect(result.game.settings).toEqual({
        randomizeQuestionOrder: true,
        randomizeAnswerOrder: true,
      })
      expect(result.players).toHaveLength(0)
      expect(result.players).toEqual([])
    })

    it('should handle multiple players correctly', () => {
      const players = Array.from({ length: 10 }, (_, i) =>
        createMockGamePlayerParticipantDocument({
          participantId: `player-${i}`,
          nickname: `Player${i}`,
        }),
      )
      const game = createMockGameDocument({
        _id: 'game-many',
        pin: '999999',
        participants: players,
        currentTask: createMockLobbyTaskDocument(),
        settings: {
          shouldAutoCompleteQuestionResultTask: false,
          shouldAutoCompleteLeaderboardTask: false,
          shouldAutoCompletePodiumTask: false,
          randomizeQuestionOrder: false,
          randomizeAnswerOrder: false,
        },
      })

      const result = buildGameLobbyHostEvent(game as never)

      expect(result.type).toBe(GameEventType.GameLobbyHost)
      expect(result.game.settings).toEqual({
        randomizeQuestionOrder: false,
        randomizeAnswerOrder: false,
      })
      expect(result.players).toHaveLength(10)
      expect(result.players[0]).toEqual({
        id: 'player-0',
        nickname: 'Player0',
      })
      expect(result.players[9]).toEqual({
        id: 'player-9',
        nickname: 'Player9',
      })
    })

    it('should copy settings verbatim with true/false combinations', () => {
      const game1 = createMockGameDocument({
        _id: 'game-settings-1',
        pin: '111111',
        currentTask: createMockLobbyTaskDocument(),
        settings: {
          shouldAutoCompleteQuestionResultTask: false,
          shouldAutoCompleteLeaderboardTask: false,
          shouldAutoCompletePodiumTask: false,
          randomizeQuestionOrder: true,
          randomizeAnswerOrder: false,
        },
      })

      const result1 = buildGameLobbyHostEvent(game1 as never)

      expect(result1.game.settings).toEqual({
        randomizeQuestionOrder: true,
        randomizeAnswerOrder: false,
      })

      const game2 = createMockGameDocument({
        _id: 'game-settings-2',
        pin: '222222',
        currentTask: createMockLobbyTaskDocument(),
        settings: {
          shouldAutoCompleteQuestionResultTask: false,
          shouldAutoCompleteLeaderboardTask: false,
          shouldAutoCompletePodiumTask: false,
          randomizeQuestionOrder: false,
          randomizeAnswerOrder: true,
        },
      })

      const result2 = buildGameLobbyHostEvent(game2 as never)

      expect(result2.game.settings).toEqual({
        randomizeQuestionOrder: false,
        randomizeAnswerOrder: true,
      })

      const game3 = createMockGameDocument({
        _id: 'game-settings-3',
        pin: '333333',
        currentTask: createMockLobbyTaskDocument(),
        settings: {
          shouldAutoCompleteQuestionResultTask: false,
          shouldAutoCompleteLeaderboardTask: false,
          shouldAutoCompletePodiumTask: false,
          randomizeQuestionOrder: true,
          randomizeAnswerOrder: true,
        },
      })

      const result3 = buildGameLobbyHostEvent(game3 as never)

      expect(result3.game.settings).toEqual({
        randomizeQuestionOrder: true,
        randomizeAnswerOrder: true,
      })
    })

    it('should include only randomizeQuestionOrder and randomizeAnswerOrder in settings', () => {
      const game = createMockGameDocument({
        _id: 'game-strict',
        pin: '444444',
        currentTask: createMockLobbyTaskDocument(),
        settings: {
          shouldAutoCompleteQuestionResultTask: true,
          shouldAutoCompleteLeaderboardTask: true,
          shouldAutoCompletePodiumTask: true,
          randomizeQuestionOrder: true,
          randomizeAnswerOrder: false,
        },
      })

      const result = buildGameLobbyHostEvent(game as never)

      expect(result.game.settings).toEqual({
        randomizeQuestionOrder: true,
        randomizeAnswerOrder: false,
      })
      expect(Object.keys(result.game.settings)).toEqual([
        'randomizeQuestionOrder',
        'randomizeAnswerOrder',
      ])
    })

    it('should map only player participants and not include host in players array', () => {
      const player1 = createMockGamePlayerParticipantDocument({
        participantId: 'player-1',
        nickname: 'Alice',
      })
      const player2 = createMockGamePlayerParticipantDocument({
        participantId: 'player-2',
        nickname: 'Bob',
      })
      const host = createMockGameHostParticipantDocument({
        participantId: 'host-123',
      })
      const game = createMockGameDocument({
        _id: 'game-mapping',
        pin: '555555',
        participants: [host, player1, player2],
        currentTask: createMockLobbyTaskDocument(),
        settings: {
          shouldAutoCompleteQuestionResultTask: false,
          shouldAutoCompleteLeaderboardTask: false,
          shouldAutoCompletePodiumTask: false,
          randomizeQuestionOrder: false,
          randomizeAnswerOrder: false,
        },
      })

      const result = buildGameLobbyHostEvent(game as never)

      expect(result.players).toHaveLength(2)
      expect(result.players).toEqual([
        { id: 'player-1', nickname: 'Alice' },
        { id: 'player-2', nickname: 'Bob' },
      ])
      expect(result.players.some((p) => p.id === 'host-123')).toBe(false)
    })
  })

  describe('buildGameLobbyPlayerEvent', () => {
    it('should return lobby player event with player nickname', () => {
      const game = createMockGameDocument({
        name: 'A Great Quiz',
        participants: [
          createMockGamePlayerParticipantDocument({ nickname: 'TestPlayer' }),
          createMockGamePlayerParticipantDocument({
            nickname: 'AnotherPlayer',
          }),
          createMockGameHostParticipantDocument(),
        ],
      })
      const player = createMockGamePlayerParticipantDocument({
        participantId: 'player-123',
        nickname: 'TestPlayer',
      })

      const result = buildGameLobbyPlayerEvent(game, player)

      expect(result.type).toBe(GameEventType.GameLobbyPlayer)
      expect(result.player.nickname).toBe('TestPlayer')
      expect(result.game.name).toBe('A Great Quiz')
      expect(result.players).toEqual([
        { nickname: 'TestPlayer' },
        { nickname: 'AnotherPlayer' },
      ])
    })

    it('should handle different player nicknames', () => {
      const testCases = [
        { nickname: 'Alice', expected: 'Alice' },
        { nickname: 'Bob123', expected: 'Bob123' },
        {
          nickname: 'Player_With_Underscores',
          expected: 'Player_With_Underscores',
        },
        { nickname: '', expected: '' },
        { nickname: '🎮', expected: '🎮' },
      ]

      testCases.forEach(({ nickname, expected }) => {
        const player = createMockGamePlayerParticipantDocument({ nickname })
        const result = buildGameLobbyPlayerEvent(
          createMockGameDocument(),
          player,
        )

        expect(result.type).toBe(GameEventType.GameLobbyPlayer)
        expect(result.player.nickname).toBe(expected)
      })
    })
  })

  describe('buildGameBeginHostEvent', () => {
    it('should return begin host event', () => {
      const result = buildGameBeginHostEvent()

      expect(result.type).toBe(GameEventType.GameBeginHost)
    })

    it('should return consistent event structure', () => {
      const result1 = buildGameBeginHostEvent()
      const result2 = buildGameBeginHostEvent()

      expect(result1).toEqual(result2)
      expect(result1.type).toBe(GameEventType.GameBeginHost)
      expect(Object.keys(result1)).toEqual(['type'])
    })
  })

  describe('buildGameBeginPlayerEvent', () => {
    it('should return begin player event with player nickname', () => {
      const player = createMockGamePlayerParticipantDocument({
        participantId: 'player-456',
        nickname: 'GameStarter',
      })

      const result = buildGameBeginPlayerEvent(player)

      expect(result.type).toBe(GameEventType.GameBeginPlayer)
      expect(result.player.nickname).toBe('GameStarter')
    })

    it('should handle various player nicknames', () => {
      const nicknames = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon']

      nicknames.forEach((nickname) => {
        const player = createMockGamePlayerParticipantDocument({ nickname })
        const result = buildGameBeginPlayerEvent(player)

        expect(result.type).toBe(GameEventType.GameBeginPlayer)
        expect(result.player.nickname).toBe(nickname)
      })
    })

    it('should handle empty nickname', () => {
      const player = createMockGamePlayerParticipantDocument({ nickname: '' })

      const result = buildGameBeginPlayerEvent(player)

      expect(result.type).toBe(GameEventType.GameBeginPlayer)
      expect(result.player.nickname).toBe('')
    })
  })
})
