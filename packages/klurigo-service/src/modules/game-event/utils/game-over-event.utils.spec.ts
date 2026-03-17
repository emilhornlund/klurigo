import { GameEventType, GameMode, GameStatus } from '@klurigo/common'

import {
  createMockGameDocument,
  createMockGamePlayerParticipantDocument,
  createMockPodiumTaskDocument,
} from '../../../../test-utils/data'

import { buildGameOverPlayerEvent } from './game-over-event.utils'

describe('buildGameOverPlayerEvent', () => {
  const mockPlayer = createMockGamePlayerParticipantDocument({
    rank: 2,
    worstRank: 4,
    totalScore: 800,
    currentStreak: 3,
  })

  const mockGame = createMockGameDocument({
    mode: GameMode.Classic,
    status: GameStatus.Active,
    currentTask: createMockPodiumTaskDocument({ status: 'active' }),
    participants: [mockPlayer],
  })

  it('should return an event with type GameOverPlayer', () => {
    const result = buildGameOverPlayerEvent(mockGame as never, mockPlayer)

    expect(result.type).toBe(GameEventType.GameOverPlayer)
  })

  it('should include game id and mode', () => {
    const result = buildGameOverPlayerEvent(mockGame as never, mockPlayer)

    expect(result.game.id).toBe(mockGame._id)
    expect(result.game.mode).toBe(GameMode.Classic)
  })

  it('should use quiz id from game.quiz._id and title from game.name', () => {
    const result = buildGameOverPlayerEvent(mockGame as never, mockPlayer)

    expect(result.quiz.id).toBe((mockGame.quiz as never as { _id: string })._id)
    expect(result.quiz.title).toBe(mockGame.name)
  })

  it('should include player nickname, rank, score, streak, and totalPlayers', () => {
    const result = buildGameOverPlayerEvent(mockGame as never, mockPlayer)

    expect(result.player.nickname).toBe(mockPlayer.nickname)
    expect(result.player.rank).toBe(2)
    expect(result.player.score).toBe(800)
    expect(result.player.currentStreak).toBe(3)
    expect(result.player.totalPlayers).toBe(1)
  })

  it('should compute comebackRankGain as worstRank minus rank', () => {
    const result = buildGameOverPlayerEvent(mockGame as never, mockPlayer)

    expect(result.player.comebackRankGain).toBe(2)
  })

  it('should clamp comebackRankGain to 0 when rank is better than or equal to worstRank', () => {
    const playerWithNoComeback = createMockGamePlayerParticipantDocument({
      rank: 1,
      worstRank: 1,
      totalScore: 1000,
      currentStreak: 5,
    })
    const game = createMockGameDocument({
      currentTask: createMockPodiumTaskDocument({ status: 'active' }),
      participants: [playerWithNoComeback],
    })

    const result = buildGameOverPlayerEvent(game as never, playerWithNoComeback)

    expect(result.player.comebackRankGain).toBe(0)
  })

  it('should return null for behind when player is rank 1', () => {
    const firstPlace = createMockGamePlayerParticipantDocument({
      rank: 1,
      worstRank: 1,
      totalScore: 1000,
      currentStreak: 5,
    })
    const game = createMockGameDocument({
      currentTask: createMockPodiumTaskDocument({ status: 'active' }),
      participants: [firstPlace],
    })

    const result = buildGameOverPlayerEvent(game as never, firstPlace)

    expect(result.player.behind).toBeNull()
  })

  it('should include behind info when a participant with rank - 1 exists', () => {
    const firstPlace = createMockGamePlayerParticipantDocument({
      participantId: 'player-1',
      nickname: 'TopPlayer',
      rank: 1,
      worstRank: 1,
      totalScore: 1200,
      currentStreak: 5,
    })
    const secondPlace = createMockGamePlayerParticipantDocument({
      participantId: 'player-2',
      nickname: 'SecondPlayer',
      rank: 2,
      worstRank: 3,
      totalScore: 900,
      currentStreak: 2,
    })
    const game = createMockGameDocument({
      currentTask: createMockPodiumTaskDocument({ status: 'active' }),
      participants: [firstPlace, secondPlace],
    })

    const result = buildGameOverPlayerEvent(game as never, secondPlace)

    expect(result.player.behind).toEqual({
      points: 300,
      nickname: 'TopPlayer',
    })
  })

  it('should include absolute behind points when player scores are negative', () => {
    const firstPlace = createMockGamePlayerParticipantDocument({
      participantId: 'player-1',
      nickname: 'TopPlayer',
      rank: 1,
      worstRank: 1,
      totalScore: -20,
      currentStreak: 5,
    })
    const secondPlace = createMockGamePlayerParticipantDocument({
      participantId: 'player-2',
      nickname: 'SecondPlayer',
      rank: 2,
      worstRank: 3,
      totalScore: -10,
      currentStreak: 2,
    })
    const game = createMockGameDocument({
      currentTask: createMockPodiumTaskDocument({ status: 'active' }),
      participants: [firstPlace, secondPlace],
    })

    const result = buildGameOverPlayerEvent(game as never, secondPlace)

    expect(result.player.behind).toEqual({
      points: 10,
      nickname: 'TopPlayer',
    })
  })

  it('should return null for behind when no participant at rank - 1 exists', () => {
    const lonePlayer = createMockGamePlayerParticipantDocument({
      rank: 3,
      worstRank: 5,
      totalScore: 500,
      currentStreak: 1,
    })
    const game = createMockGameDocument({
      currentTask: createMockPodiumTaskDocument({ status: 'active' }),
      participants: [lonePlayer],
    })

    const result = buildGameOverPlayerEvent(game as never, lonePlayer)

    expect(result.player.behind).toBeNull()
  })

  it('should default canRateQuiz to false when not provided in metadata', () => {
    const result = buildGameOverPlayerEvent(mockGame as never, mockPlayer)

    expect(result.rating.canRateQuiz).toBe(false)
  })

  it('should use canRateQuiz from metadata when provided', () => {
    const result = buildGameOverPlayerEvent(mockGame as never, mockPlayer, {
      podiumCanRateQuiz: false,
    })

    expect(result.rating.canRateQuiz).toBe(false)
  })

  it('should leave stars and comment undefined when absent from metadata', () => {
    const result = buildGameOverPlayerEvent(mockGame as never, mockPlayer)

    expect(result.rating.stars).toBeUndefined()
    expect(result.rating.comment).toBeUndefined()
  })

  it('should include stars and comment from metadata when provided', () => {
    const result = buildGameOverPlayerEvent(mockGame as never, mockPlayer, {
      podiumRatingStars: 4,
      podiumRatingComment: 'Great quiz!',
    })

    expect(result.rating.stars).toBe(4)
    expect(result.rating.comment).toBe('Great quiz!')
  })

  it('should count only player-type participants in totalPlayers', () => {
    const hostParticipant = {
      participantId: 'host-1',
      type: 'HOST' as never,
      updated: new Date(),
      created: new Date(),
    }
    const playerParticipant = createMockGamePlayerParticipantDocument({
      rank: 1,
      worstRank: 1,
      totalScore: 1000,
      currentStreak: 0,
    })
    const game = createMockGameDocument({
      currentTask: createMockPodiumTaskDocument({ status: 'active' }),
      participants: [hostParticipant as never, playerParticipant],
    })

    const result = buildGameOverPlayerEvent(game as never, playerParticipant)

    expect(result.player.totalPlayers).toBe(1)
  })
})
