import { GameParticipantType } from '@klurigo/common'
import type { Redis } from 'ioredis'

import { GameAnswerRepository } from '../../game-core/repositories'
import {
  GameDocument,
  TaskType,
} from '../../game-core/repositories/models/schemas'
import {
  QuizRatingRepository,
  QuizRepository,
} from '../../quiz-core/repositories'
import { UserRepository } from '../../user/repositories'

import { GameEventPublisher } from './game-event.publisher'
import { GameParticipantEventBuilder } from './game-participant-event.builder'

// ---- Mocks ----
jest.mock('../utils', () => ({
  buildHostGameEvent: jest.fn(),
  buildPlayerGameEvent: jest.fn(),
  toGameEventMetaData: jest.fn(),
  toPlayerQuestionPlayerEventMetaData: jest.fn(),
}))

// eslint-disable-next-line import/order
import {
  buildHostGameEvent,
  buildPlayerGameEvent,
  toGameEventMetaData,
  toPlayerQuestionPlayerEventMetaData,
} from '../utils'

describe('GameEventPublisher', () => {
  let redis: jest.Mocked<Redis>
  let gameAnswerRepository: jest.Mocked<GameAnswerRepository>
  let quizRepository: jest.Mocked<QuizRepository>
  let quizRatingRepository: jest.Mocked<QuizRatingRepository>
  let userRepository: jest.Mocked<UserRepository>
  let gameParticipantEventBuilder: GameParticipantEventBuilder
  let service: GameEventPublisher
  let logger: {
    debug: jest.Mock
    warn: jest.Mock
    error: jest.Mock
  }

  beforeEach(() => {
    logger = {
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    }

    redis = {
      lrange: jest.fn().mockResolvedValue([]),
      publish: jest.fn().mockResolvedValue(1),
    } as any

    gameAnswerRepository = {
      findAllAnswersByGameId: jest.fn().mockResolvedValue([]),
      submitOnce: jest.fn(),
      clear: jest.fn(),
    } as any

    quizRepository = {
      findQuizByIdOrThrow: jest.fn(),
    } as any

    quizRatingRepository = {
      findQuizRatingByUserAuthor: jest.fn().mockResolvedValue(null),
      findQuizRatingByAnonymousAuthor: jest.fn().mockResolvedValue(null),
    } as any

    userRepository = {
      findUserById: jest.fn().mockResolvedValue(null),
    } as any

    // Reset util mocks
    ;(buildHostGameEvent as jest.Mock).mockReset()
    ;(buildPlayerGameEvent as jest.Mock).mockReset()
    ;(toGameEventMetaData as jest.Mock)
      .mockReset()
      .mockReturnValue({ meta: true })
    ;(toPlayerQuestionPlayerEventMetaData as jest.Mock)
      .mockReset()
      .mockReturnValue({ pmeta: true })

    gameParticipantEventBuilder = new GameParticipantEventBuilder(
      gameAnswerRepository,
      quizRepository,
      quizRatingRepository,
      userRepository,
    )

    service = new GameEventPublisher(
      redis as unknown as Redis,
      gameParticipantEventBuilder,
    )
    // Override internal logger for assertions (same trick as previous tests)
    ;(service as any).logger = logger
  })

  afterEach(() => {
    jest.clearAllMocks()
    // Reset repository mocks after clearAllMocks
    gameAnswerRepository.findAllAnswersByGameId.mockResolvedValue([])
    quizRatingRepository.findQuizRatingByUserAuthor.mockResolvedValue(null)
    quizRatingRepository.findQuizRatingByAnonymousAuthor.mockResolvedValue(null)
    userRepository.findUserById.mockResolvedValue(null)
  })

  const buildGameDoc = (overrides: Partial<any> = {}) => ({
    _id: 'game-1',
    currentTask: { type: TaskType.Lobby },
    quiz: { _id: 'quiz-1' },
    participants: [
      {
        participantId: 'p1',
        type: GameParticipantType.PLAYER,
        nickname: 'Alice',
      },
      {
        participantId: 'host',
        type: GameParticipantType.HOST,
        nickname: 'Host',
      },
    ],
    ...overrides,
  })

  const buildQuizDoc = (ownerId = 'owner-user-1') =>
    ({
      _id: 'quiz-1',
      owner: { _id: ownerId },
    }) as any

  it('publish sends events for host and player with base metadata (non-question)', async () => {
    const doc = buildGameDoc()
    ;(buildHostGameEvent as jest.Mock).mockReturnValue({
      hostInit: true,
    })
    ;(buildPlayerGameEvent as jest.Mock).mockReturnValue({
      playerInit: true,
    })

    await service.publish(doc as GameDocument)

    // Collected answers & metadata
    expect(gameAnswerRepository.findAllAnswersByGameId).toHaveBeenCalledWith(
      'game-1',
    )
    expect(toGameEventMetaData).toHaveBeenCalledWith([], {}, doc.participants)
    // No question-specific metadata for Lobby
    expect(toPlayerQuestionPlayerEventMetaData).not.toHaveBeenCalled()

    // Builders used correctly
    expect(buildHostGameEvent).toHaveBeenCalledWith(
      doc,
      expect.objectContaining({ meta: true }),
    )
    expect(buildPlayerGameEvent).toHaveBeenCalledWith(
      doc,
      doc.participants[0],
      expect.objectContaining({ meta: true }),
    )

    // Publish was called once per participant
    expect(redis.publish).toHaveBeenCalledTimes(2)
    const payloads = (redis.publish.mock.calls as unknown[][]).map(
      (c) => JSON.parse(c[1] as string), // channel is c[0], message is c[1]
    )
    expect(payloads).toEqual(
      expect.arrayContaining([
        { gameId: 'game-1', playerId: 'p1', event: { playerInit: true } },
        { gameId: 'game-1', playerId: 'host', event: { hostInit: true } },
      ]),
    )

    // Logger: should log for each publish
    expect(logger.debug).toHaveBeenCalledWith(
      'Published event for playerId: p1',
    )
    expect(logger.debug).toHaveBeenCalledWith(
      'Published event for playerId: host',
    )
  })

  it('publish (Question task) merges player question metadata', async () => {
    const doc = buildGameDoc({ currentTask: { type: TaskType.Question } })
    ;(buildHostGameEvent as jest.Mock).mockReturnValue({
      hostQ: true,
    })
    ;(buildPlayerGameEvent as jest.Mock).mockReturnValue({
      playerQ: true,
    })

    await service.publish(doc as GameDocument)

    // Question-specific metadata should be computed for players
    expect(toPlayerQuestionPlayerEventMetaData).toHaveBeenCalledWith(
      [],
      doc.participants[0],
    )
    expect(buildPlayerGameEvent).toHaveBeenCalledWith(
      doc,
      doc.participants[0],
      expect.objectContaining({ meta: true, pmeta: true }),
    )
    // Host path should not receive pmeta
    expect(buildHostGameEvent).toHaveBeenCalledWith(
      doc,
      expect.objectContaining({ meta: true }),
    )
  })

  it('publish enriches podium player events with rating metadata', async () => {
    const doc = buildGameDoc({ currentTask: { type: TaskType.Podium } })
    quizRepository.findQuizByIdOrThrow.mockResolvedValue(buildQuizDoc())
    quizRatingRepository.findQuizRatingByAnonymousAuthor.mockResolvedValue({
      stars: 4,
      comment: 'Great quiz!',
    } as any)
    ;(buildHostGameEvent as jest.Mock).mockReturnValue({ hostPodium: true })
    ;(buildPlayerGameEvent as jest.Mock).mockReturnValue({ playerPodium: true })

    await service.publish(doc as GameDocument)

    expect(quizRepository.findQuizByIdOrThrow).toHaveBeenCalledWith('quiz-1')
    expect(userRepository.findUserById).toHaveBeenCalledWith('p1')
    expect(
      quizRatingRepository.findQuizRatingByAnonymousAuthor,
    ).toHaveBeenCalledWith('quiz-1', 'p1')
    expect(buildPlayerGameEvent).toHaveBeenCalledWith(
      doc,
      doc.participants[0],
      expect.objectContaining({
        meta: true,
        podiumCanRateQuiz: true,
        podiumRatingStars: 4,
        podiumRatingComment: 'Great quiz!',
      }),
    )
  })

  it('publish continues when a builder throws, logging warn', async () => {
    const doc = buildGameDoc()
    // Fail for host, succeed for player
    ;(buildHostGameEvent as jest.Mock).mockImplementation(() => {
      throw new Error('boom host')
    })
    ;(buildPlayerGameEvent as jest.Mock).mockReturnValue({
      ok: true,
    })

    await service.publish(doc as GameDocument)

    // One warn logged for the host failure
    expect(logger.warn).toHaveBeenCalled()
    // Player still published
    expect(redis.publish).toHaveBeenCalledTimes(1)
    const msg = JSON.parse(redis.publish.mock.calls[0][1] as string)
    expect(msg).toEqual({
      gameId: 'game-1',
      playerId: 'p1',
      event: { ok: true },
    })
  })

  it('publishParticipantEvent is a no-op when event is undefined', async () => {
    const participant = {
      participantId: 'p1',
      type: GameParticipantType.PLAYER,
      nickname: 'Alice',
    }

    await service.publishParticipantEvent(
      'game-1',
      participant as any,
      undefined,
    )

    expect(redis.publish).not.toHaveBeenCalled()
    expect(logger.debug).not.toHaveBeenCalled()
  })

  it('publishParticipantEvent publishes a distributed event and logs', async () => {
    const participant = {
      participantId: 'p1',
      type: GameParticipantType.PLAYER,
      nickname: 'Alice',
    }

    const event = { some: 'event' } as any

    await service.publishParticipantEvent('game-1', participant as any, event)

    expect(redis.publish).toHaveBeenCalledTimes(1)
    const [channel, message] = redis.publish.mock.calls[0] as [string, string]
    expect(channel).toBe('events')
    expect(JSON.parse(message)).toEqual({
      gameId: 'game-1',
      playerId: 'p1',
      event,
    })
    expect(logger.debug).toHaveBeenCalledWith(
      'Published event for playerId: p1',
    )
  })

  it('publish logs error if redis.publish rejects', async () => {
    redis.publish.mockRejectedValueOnce(new Error('redis down'))

    const participant = {
      participantId: 'p1',
      type: GameParticipantType.PLAYER,
      nickname: 'Alice',
    }

    const event = { x: 1 } as any

    await service.publishParticipantEvent('game-1', participant as any, event)

    expect(logger.error).toHaveBeenCalledWith(
      'Error publishing event:',
      expect.any(Error),
    )
  })

  it('publish does not publish when there are no participants', async () => {
    const doc = buildGameDoc({ participants: [] })

    await service.publish(doc as GameDocument)

    expect(gameAnswerRepository.findAllAnswersByGameId).toHaveBeenCalledWith(
      'game-1',
    )
    expect(toGameEventMetaData).toHaveBeenCalledWith([], {}, [])
    expect(redis.publish).not.toHaveBeenCalled()
    expect(logger.debug).not.toHaveBeenCalled()
    expect(logger.warn).not.toHaveBeenCalled()
  })

  it('publish skips publishing when builder returns undefined event', async () => {
    const doc = buildGameDoc()
    ;(buildHostGameEvent as jest.Mock).mockReturnValue(undefined)
    ;(buildPlayerGameEvent as jest.Mock).mockReturnValue({ ok: true })

    await service.publish(doc as GameDocument)

    expect(redis.publish).toHaveBeenCalledTimes(1)
    const msg = JSON.parse(redis.publish.mock.calls[0][1] as string)
    expect(msg).toEqual({
      gameId: 'game-1',
      playerId: 'p1',
      event: { ok: true },
    })
  })

  it('publish rejects if metadata builder throws before per-participant publishing', async () => {
    const doc = buildGameDoc()
    ;(toGameEventMetaData as jest.Mock).mockImplementation(() => {
      throw new Error('metadata boom')
    })

    await expect(service.publish(doc as GameDocument)).rejects.toThrow(
      'metadata boom',
    )

    expect(redis.publish).not.toHaveBeenCalled()
    expect(logger.warn).not.toHaveBeenCalled()
  })

  it('publishDistributedEvent logs "Published event for all players" when playerId is undefined', async () => {
    const event = { gameId: 'game-1', event: { type: 'AnyEventType' } } as any

    await (service as any).publishDistributedEvent(event)

    expect(redis.publish).toHaveBeenCalledTimes(1)
    const [channel, message] = redis.publish.mock.calls[0] as [string, string]
    expect(channel).toBe('events')
    expect(JSON.parse(message)).toEqual(event)
    expect(logger.debug).toHaveBeenCalledWith('Published event for all players')
  })

  it('publish rejects when gameAnswerRepository.findAllAnswersByGameId fails', async () => {
    const doc = buildGameDoc()
    gameAnswerRepository.findAllAnswersByGameId.mockRejectedValue(
      new Error('Repository failed'),
    )

    await expect(service.publish(doc as GameDocument)).rejects.toThrow(
      'Repository failed',
    )

    expect(gameAnswerRepository.findAllAnswersByGameId).toHaveBeenCalledWith(
      'game-1',
    )
    expect(redis.publish).not.toHaveBeenCalled()
  })
})
