import {
  GameEventType,
  GameParticipantType,
  GameStatus,
  HEARTBEAT_INTERVAL,
} from '@klurigo/common'
import { MessageEvent } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import type { Redis } from 'ioredis'
import { firstValueFrom, take, toArray } from 'rxjs'

import { PlayerNotFoundException } from '../../game-core/exceptions'
import { GameAnswerRepository } from '../../game-core/repositories'
import { TaskType } from '../../game-core/repositories/models/schemas'
import {
  QuizRatingRepository,
  QuizRepository,
} from '../../quiz-core/repositories'
import { Quiz, QuizRating } from '../../quiz-core/repositories/models/schemas'
import { User, UserRepository } from '../../user/repositories'
import {
  buildHostGameEvent,
  buildPlayerGameEvent,
  toGameEventMetaData,
  toPlayerQuestionPlayerEventMetaData,
} from '../utils'

import { GameEventSubscriber } from './game-event.subscriber'
import { GameParticipantEventBuilder } from './game-participant-event.builder'

// ---- Mocks ----
jest.mock('../utils', () => ({
  buildHostGameEvent: jest.fn(),
  buildPlayerGameEvent: jest.fn(),
  toGameEventMetaData: jest.fn(),
  toPlayerQuestionPlayerEventMetaData: jest.fn(),
}))

describe('GameEventSubscriber', () => {
  let redis: jest.Mocked<Redis>
  let redisSubscriber: jest.Mocked<Redis>
  let gameRepository: any
  let gameAnswerRepository: jest.Mocked<GameAnswerRepository>
  let quizRepository: jest.Mocked<QuizRepository>
  let quizRatingRepository: jest.Mocked<QuizRatingRepository>
  let userRepository: jest.Mocked<UserRepository>
  let gameParticipantEventBuilder: GameParticipantEventBuilder
  let eventEmitter: EventEmitter2
  let service: GameEventSubscriber
  let logger: { log: jest.Mock; warn: jest.Mock; error: jest.Mock }

  beforeEach(() => {
    logger = { log: jest.fn(), warn: jest.fn(), error: jest.fn() }

    jest.useFakeTimers()

    // Base redis mock + a dedicated subscriber connection
    redisSubscriber = {
      subscribe: jest.fn().mockResolvedValue(1),
      on: jest.fn(),
      off: jest.fn(),
      unsubscribe: jest.fn().mockResolvedValue(1),
      quit: jest.fn().mockResolvedValue('OK'),
      disconnect: jest.fn(),
    } as any

    redis = {
      duplicate: jest.fn(() => redisSubscriber as unknown as Redis),
      lrange: jest.fn().mockResolvedValue([]),
    } as any

    // Minimal gameRepository mock
    gameRepository = {
      findGameByIDWithStatusesOrThrow: jest.fn(),
    }

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

    eventEmitter = new EventEmitter2()

    // Reset util mocks per test
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

    service = new GameEventSubscriber(
      redis as unknown as Redis,
      gameRepository,
      gameParticipantEventBuilder,
      eventEmitter,
    )

    // Override the internal logger so we can spy on .error()
    ;(service as any).logger = logger
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
    jest.clearAllMocks()
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

  it('wires Redis subscription on init and handles messages/errors', async () => {
    await service.onModuleInit()

    expect(redis.duplicate).toHaveBeenCalledTimes(1)
    expect(redisSubscriber.subscribe).toHaveBeenCalledWith('events')

    // Extract message handler registered via on('message')
    const onMessage = redisSubscriber.on.mock.calls.find(
      (c) => c[0] === 'message',
      // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    )?.[1] as Function
    expect(onMessage).toBeDefined()

    const onError = redisSubscriber.on.mock.calls.find(
      (c) => c[0] === 'error',
      // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    )?.[1] as Function
    expect(onError).toBeDefined()

    const emitSpy = jest.spyOn(eventEmitter, 'emit')

    const distributed = {
      gameId: 'game-1',
      playerId: 'p1',
      event: { type: 'ANY' },
    }
    onMessage('events', JSON.stringify(distributed))
    expect(emitSpy).toHaveBeenCalledWith('event', distributed)

    onError(new Error('boom'))
    expect(logger.error).toHaveBeenCalled()
  })

  it('onModuleInit ignores invalid JSON messages and logs warn', async () => {
    await service.onModuleInit()

    const onMessage = redisSubscriber.on.mock.calls.find(
      (c) => c[0] === 'message',
      // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    )?.[1] as Function
    expect(onMessage).toBeDefined()

    onMessage('events', '{not valid json')

    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining(
        'Ignoring invalid JSON on Redis Pub/Sub channel:',
      ),
      expect.any(String),
    )
  })

  it('onModuleInit ignores malformed messages missing event and logs warn', async () => {
    await service.onModuleInit()

    const onMessage = redisSubscriber.on.mock.calls.find(
      (c) => c[0] === 'message',
      // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    )?.[1] as Function
    expect(onMessage).toBeDefined()

    onMessage('events', JSON.stringify({ gameId: 'game-1' }))

    expect(logger.warn).toHaveBeenCalledWith(
      'Ignoring malformed distributed event (missing gameId or event property).',
    )
  })

  it('onModuleInit logs error and rethrows when Redis subscribe fails', async () => {
    redisSubscriber.subscribe.mockRejectedValueOnce(new Error('subscribe down'))

    await expect(service.onModuleInit()).rejects.toThrow('subscribe down')

    expect(logger.error).toHaveBeenCalledWith(
      'Failed to subscribe to Redis channel "events": subscribe down',
      expect.any(String),
    )
  })

  it('emits heartbeats while a subscription is active and stops after unsubscribe', async () => {
    const doc = buildGameDoc()
    gameRepository.findGameByIDWithStatusesOrThrow.mockResolvedValue(doc)
    ;(buildPlayerGameEvent as jest.Mock).mockReturnValue({ initial: true })

    const emitSpy = jest.spyOn(eventEmitter, 'emit')

    const stream$ = await service.subscribe('game-1', 'p1')
    const sub = stream$.subscribe()

    jest.advanceTimersByTime(HEARTBEAT_INTERVAL)
    expect(emitSpy).toHaveBeenCalledWith('event', {
      event: { type: GameEventType.GameHeartbeat },
    })

    sub.unsubscribe()

    emitSpy.mockClear()
    jest.advanceTimersByTime(HEARTBEAT_INTERVAL)
    expect(emitSpy).not.toHaveBeenCalled()
  })

  it('keeps heartbeat running until the last concurrent connection unsubscribes', async () => {
    const doc = buildGameDoc()
    gameRepository.findGameByIDWithStatusesOrThrow.mockResolvedValue(doc)
    ;(buildPlayerGameEvent as jest.Mock).mockReturnValue({ initial: true })

    const emitSpy = jest.spyOn(eventEmitter, 'emit')

    const stream1$ = await service.subscribe('game-1', 'p1')
    const sub1 = stream1$.subscribe()

    const stream2$ = await service.subscribe('game-1', 'p1')
    const sub2 = stream2$.subscribe()

    jest.advanceTimersByTime(HEARTBEAT_INTERVAL)
    expect(
      emitSpy.mock.calls.filter(
        (c) =>
          c[0] === 'event' && c[1]?.event?.type === GameEventType.GameHeartbeat,
      ),
    ).toHaveLength(1)

    sub1.unsubscribe()

    emitSpy.mockClear()
    jest.advanceTimersByTime(HEARTBEAT_INTERVAL)
    expect(
      emitSpy.mock.calls.filter(
        (c) =>
          c[0] === 'event' && c[1]?.event?.type === GameEventType.GameHeartbeat,
      ),
    ).toHaveLength(1)

    sub2.unsubscribe()

    emitSpy.mockClear()
    jest.advanceTimersByTime(HEARTBEAT_INTERVAL)
    expect(emitSpy).not.toHaveBeenCalled()
  })

  it('onModuleDestroy unsubscribes, quits, and removes Redis listeners', async () => {
    await service.onModuleInit()

    await service.onModuleDestroy()

    expect(redisSubscriber.off).toHaveBeenCalledWith(
      'message',
      expect.any(Function),
    )
    expect(redisSubscriber.off).toHaveBeenCalledWith(
      'error',
      expect.any(Function),
    )
    expect(redisSubscriber.unsubscribe).toHaveBeenCalledWith('events')
    expect(redisSubscriber.quit).toHaveBeenCalled()
    expect(redisSubscriber.disconnect).not.toHaveBeenCalled()
  })

  it('onModuleDestroy logs warn and disconnects if Redis shutdown throws', async () => {
    await service.onModuleInit()

    redisSubscriber.unsubscribe.mockRejectedValueOnce(new Error('unsub fail'))

    await service.onModuleDestroy()

    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining(
        'Error while shutting down Redis subscriber: unsub fail',
      ),
      expect.any(String),
    )
    expect(redisSubscriber.disconnect).toHaveBeenCalled()
  })

  it('subscribe throws when participant not found', async () => {
    gameRepository.findGameByIDWithStatusesOrThrow.mockResolvedValue(
      buildGameDoc(),
    )
    await expect(service.subscribe('game-1', 'missing')).rejects.toBeInstanceOf(
      PlayerNotFoundException,
    )
    expect(gameRepository.findGameByIDWithStatusesOrThrow).toHaveBeenCalledWith(
      'game-1',
      [GameStatus.Active, GameStatus.Completed],
    )
  })

  it('subscribe (PLAYER) returns initial event and filters subsequent events by game and player', async () => {
    const doc = buildGameDoc({
      currentTask: { type: TaskType.Question }, // so player metadata is merged
    })
    gameRepository.findGameByIDWithStatusesOrThrow.mockResolvedValue(doc)
    ;(buildPlayerGameEvent as jest.Mock).mockReturnValue({
      initial: 'player',
    })

    const stream$ = await service.subscribe('game-1', 'p1')

    const received: MessageEvent[] = []
    const sub = stream$.subscribe((e) => received.push(e))

    // Initial emission comes from concat(from([initialEvent]), source)
    expect(received[0]?.data).toBe(JSON.stringify({ initial: 'player' }))

    // Emit a matching event for p1 -> should pass
    eventEmitter.emit('event', {
      gameId: 'game-1',
      playerId: 'p1',
      event: { type: 'MATCH' },
    })

    // Emit a non-matching event for host -> should be filtered
    eventEmitter.emit('event', {
      gameId: 'game-1',
      playerId: 'host',
      event: { type: 'NOPE' },
    })

    // Emit a game-scoped broadcast event (no playerId) -> passes to everyone in game-1
    eventEmitter.emit('event', {
      gameId: 'game-1',
      event: { type: 'BROADCAST' },
    })

    // Unsubscribe -> finalize should remove active player
    sub.unsubscribe()

    // We should have 3 emissions total (initial + MATCH + BROADCAST)
    expect(received.map((e) => JSON.parse(e.data as any))).toEqual([
      { initial: 'player' },
      { type: 'MATCH' },
      { type: 'BROADCAST' },
    ])

    const counts: Map<string, number> = (service as any)
      .connectionCountsByParticipantId
    expect(counts.has('p1')).toBe(false)

    // Ensure metadata builders were used
    expect(gameAnswerRepository.findAllAnswersByGameId).toHaveBeenCalledWith(
      'game-1',
    )
    expect(gameRepository.findGameByIDWithStatusesOrThrow).toHaveBeenCalledWith(
      'game-1',
      [GameStatus.Active, GameStatus.Completed],
    )
    expect(toGameEventMetaData).toHaveBeenCalled()
    expect(toPlayerQuestionPlayerEventMetaData).toHaveBeenCalled()
    expect(buildPlayerGameEvent).toHaveBeenCalledWith(
      doc,
      doc.participants[0], // p1
      expect.objectContaining({ meta: true, pmeta: true }),
    )
  })

  it('does not relay another game event for the same participant', async () => {
    const doc = buildGameDoc()
    gameRepository.findGameByIDWithStatusesOrThrow.mockResolvedValue(doc)
    ;(buildPlayerGameEvent as jest.Mock).mockReturnValue({ initial: 'player' })

    const stream$ = await service.subscribe('game-1', 'p1')
    const received: MessageEvent[] = []
    const sub = stream$.subscribe((event) => received.push(event))

    eventEmitter.emit('event', {
      gameId: 'game-2',
      playerId: 'p1',
      event: { type: 'WRONG_GAME' },
    })
    eventEmitter.emit('event', {
      gameId: 'game-1',
      playerId: 'p1',
      event: { type: 'MATCHING_GAME' },
    })

    sub.unsubscribe()

    expect(received.map((event) => JSON.parse(event.data as string))).toEqual([
      { initial: 'player' },
      { type: 'MATCHING_GAME' },
    ])
  })

  it('subscribe filters out undefined events emitted on the local channel', async () => {
    const doc = buildGameDoc()
    gameRepository.findGameByIDWithStatusesOrThrow.mockResolvedValue(doc)
    ;(buildPlayerGameEvent as jest.Mock).mockReturnValue({ initial: 'player' })

    const stream$ = await service.subscribe('game-1', 'p1')
    const resultsPromise = firstValueFrom(stream$.pipe(take(2), toArray()))

    eventEmitter.emit('event', undefined)
    eventEmitter.emit('event', {
      gameId: 'game-1',
      playerId: 'p1',
      event: { type: 'OK' },
    })

    const results = await resultsPromise
    expect(results.map((e) => JSON.parse(e.data as any))).toEqual([
      { initial: 'player' },
      { type: 'OK' },
    ])
  })

  it('subscribe (HOST) uses buildHostGameEvent and still filters by playerId', async () => {
    const doc = buildGameDoc()
    gameRepository.findGameByIDWithStatusesOrThrow.mockResolvedValue(doc)
    ;(buildHostGameEvent as jest.Mock).mockReturnValue({
      initial: 'host',
    })

    const stream$ = await service.subscribe('game-1', 'host')
    const out = firstValueFrom(stream$.pipe(take(1)))

    const first = await out
    expect(JSON.parse(first.data as any)).toEqual({ initial: 'host' })
    expect(buildHostGameEvent).toHaveBeenCalledWith(
      doc,
      expect.objectContaining({ meta: true }),
    )
    expect(gameRepository.findGameByIDWithStatusesOrThrow).toHaveBeenCalledWith(
      'game-1',
      [GameStatus.Active, GameStatus.Completed],
    )
    expect(buildPlayerGameEvent).not.toHaveBeenCalled()
  })

  it('subscribe allows completed games to open an initial SSE snapshot', async () => {
    const doc = buildGameDoc({
      status: GameStatus.Completed,
      currentTask: { type: TaskType.Podium, status: 'active' },
    })
    gameRepository.findGameByIDWithStatusesOrThrow.mockResolvedValue(doc)
    quizRepository.findQuizByIdOrThrow.mockResolvedValue({
      _id: 'quiz-1',
      owner: { _id: 'owner-1' } as User,
    } as Quiz)
    ;(buildPlayerGameEvent as jest.Mock).mockReturnValue({
      initial: 'completed-game-player',
    })

    const stream$ = await service.subscribe('game-1', 'p1')
    const first = await firstValueFrom(stream$.pipe(take(1)))

    expect(JSON.parse(first.data as string)).toEqual({
      initial: 'completed-game-player',
    })
    expect(gameRepository.findGameByIDWithStatusesOrThrow).toHaveBeenCalledWith(
      'game-1',
      [GameStatus.Active, GameStatus.Completed],
    )
    expect(buildPlayerGameEvent).toHaveBeenCalledWith(
      doc,
      doc.participants[0],
      expect.objectContaining({ meta: true }),
    )
  })

  it('subscribe rejects games outside active and completed statuses', async () => {
    gameRepository.findGameByIDWithStatusesOrThrow.mockRejectedValue(
      new Error('not found'),
    )

    await expect(service.subscribe('game-1', 'p1')).rejects.toThrow('not found')

    expect(gameRepository.findGameByIDWithStatusesOrThrow).toHaveBeenCalledWith(
      'game-1',
      [GameStatus.Active, GameStatus.Completed],
    )
  })

  it('subscribe tolerates build* error and still relays future events', async () => {
    const doc = buildGameDoc()
    gameRepository.findGameByIDWithStatusesOrThrow.mockResolvedValue(doc)
    ;(buildHostGameEvent as jest.Mock).mockImplementation(() => {
      throw new Error('boom in builder')
    })

    const stream$ = await service.subscribe('game-1', 'host')

    // Collect next two events we emit ourselves (no initial because builder throws)
    const resultsPromise = firstValueFrom(stream$.pipe(take(3), toArray()))

    eventEmitter.emit('event', {
      gameId: 'game-1',
      playerId: 'host',
      event: { type: 'A' },
    })
    eventEmitter.emit('event', {
      gameId: 'game-1',
      event: { type: 'B' },
    })

    const results = await resultsPromise
    expect(results.map((e) => JSON.parse(e.data as any))).toEqual([
      { type: GameEventType.GameHeartbeat },
      { type: 'A' },
      { type: 'B' },
    ])
    expect(logger.warn).toHaveBeenCalled()
  })

  it('subscribe falls back to heartbeat when gameAnswerRepository.findAllAnswersByGameId fails during initial snapshot', async () => {
    const doc = buildGameDoc()
    gameRepository.findGameByIDWithStatusesOrThrow.mockResolvedValue(doc)
    gameAnswerRepository.findAllAnswersByGameId.mockRejectedValue(
      new Error('Repository failed'),
    )

    const stream$ = await service.subscribe('game-1', 'host')
    const resultsPromise = firstValueFrom(stream$.pipe(take(1)))

    const result = await resultsPromise
    expect(JSON.parse(result.data as any)).toEqual({
      type: GameEventType.GameHeartbeat,
    })

    expect(gameAnswerRepository.findAllAnswersByGameId).toHaveBeenCalledWith(
      'game-1',
    )
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Error building initial event for participant'),
      expect.any(String),
    )
  })

  describe('podium enrichment', () => {
    const buildPodiumGameDoc = (overrides: Partial<any> = {}) =>
      buildGameDoc({
        currentTask: { type: TaskType.Podium },
        quiz: { _id: 'quiz-1' },
        ...overrides,
      })

    const buildQuizDoc = (ownerOverride: Partial<User> = {}) =>
      ({
        _id: 'quiz-1',
        owner: { _id: 'owner-user-1', ...ownerOverride } as User,
      }) as Quiz

    it('passes podiumCanRateQuiz=true for an anonymous player with no prior rating', async () => {
      const doc = buildPodiumGameDoc()
      gameRepository.findGameByIDWithStatusesOrThrow.mockResolvedValue(doc)
      quizRepository.findQuizByIdOrThrow.mockResolvedValue(buildQuizDoc())
      userRepository.findUserById.mockResolvedValue(null)
      quizRatingRepository.findQuizRatingByAnonymousAuthor.mockResolvedValue(
        null,
      )
      ;(buildPlayerGameEvent as jest.Mock).mockReturnValue({
        type: 'GAME_OVER_PLAYER',
      })

      await service.subscribe('game-1', 'p1')

      expect(quizRepository.findQuizByIdOrThrow).toHaveBeenCalledWith('quiz-1')
      expect(userRepository.findUserById).toHaveBeenCalledWith('p1')
      expect(
        quizRatingRepository.findQuizRatingByAnonymousAuthor,
      ).toHaveBeenCalledWith('quiz-1', 'p1')
      expect(buildPlayerGameEvent).toHaveBeenCalledWith(
        doc,
        doc.participants[0],
        expect.objectContaining({ podiumCanRateQuiz: true }),
      )
    })

    it('passes podiumCanRateQuiz=true for a logged-in player who is not the quiz owner', async () => {
      const doc = buildPodiumGameDoc()
      gameRepository.findGameByIDWithStatusesOrThrow.mockResolvedValue(doc)
      quizRepository.findQuizByIdOrThrow.mockResolvedValue(buildQuizDoc())
      userRepository.findUserById.mockResolvedValue({
        _id: 'p1',
        defaultNickname: 'Alice',
      } as User)
      quizRatingRepository.findQuizRatingByUserAuthor.mockResolvedValue(null)
      ;(buildPlayerGameEvent as jest.Mock).mockReturnValue({
        type: 'GAME_OVER_PLAYER',
      })

      await service.subscribe('game-1', 'p1')

      expect(
        quizRatingRepository.findQuizRatingByUserAuthor,
      ).toHaveBeenCalledWith('quiz-1', 'p1')
      expect(buildPlayerGameEvent).toHaveBeenCalledWith(
        doc,
        doc.participants[0],
        expect.objectContaining({ podiumCanRateQuiz: true }),
      )
    })

    it('passes podiumCanRateQuiz=false for a logged-in player who is the quiz owner', async () => {
      const doc = buildPodiumGameDoc()
      gameRepository.findGameByIDWithStatusesOrThrow.mockResolvedValue(doc)
      quizRepository.findQuizByIdOrThrow.mockResolvedValue(
        buildQuizDoc({ _id: 'p1' }),
      )
      userRepository.findUserById.mockResolvedValue({
        _id: 'p1',
        defaultNickname: 'Alice',
      } as User)
      quizRatingRepository.findQuizRatingByUserAuthor.mockResolvedValue(null)
      ;(buildPlayerGameEvent as jest.Mock).mockReturnValue({
        type: 'GAME_OVER_PLAYER',
      })

      await service.subscribe('game-1', 'p1')

      expect(buildPlayerGameEvent).toHaveBeenCalledWith(
        doc,
        doc.participants[0],
        expect.objectContaining({ podiumCanRateQuiz: false }),
      )
    })

    it('includes podiumRatingStars and podiumRatingComment when an existing rating is found for an anonymous player', async () => {
      const doc = buildPodiumGameDoc()
      gameRepository.findGameByIDWithStatusesOrThrow.mockResolvedValue(doc)
      quizRepository.findQuizByIdOrThrow.mockResolvedValue(buildQuizDoc())
      userRepository.findUserById.mockResolvedValue(null)
      quizRatingRepository.findQuizRatingByAnonymousAuthor.mockResolvedValue({
        stars: 4,
        comment: 'Great quiz!',
      } as QuizRating)
      ;(buildPlayerGameEvent as jest.Mock).mockReturnValue({
        type: 'GAME_OVER_PLAYER',
      })

      await service.subscribe('game-1', 'p1')

      expect(buildPlayerGameEvent).toHaveBeenCalledWith(
        doc,
        doc.participants[0],
        expect.objectContaining({
          podiumCanRateQuiz: true,
          podiumRatingStars: 4,
          podiumRatingComment: 'Great quiz!',
        }),
      )
    })

    it('includes podiumRatingStars and podiumRatingComment when an existing rating is found for a logged-in player', async () => {
      const doc = buildPodiumGameDoc()
      gameRepository.findGameByIDWithStatusesOrThrow.mockResolvedValue(doc)
      quizRepository.findQuizByIdOrThrow.mockResolvedValue(buildQuizDoc())
      userRepository.findUserById.mockResolvedValue({
        _id: 'p1',
        defaultNickname: 'Alice',
      } as User)
      quizRatingRepository.findQuizRatingByUserAuthor.mockResolvedValue({
        stars: 5,
        comment: 'Amazing!',
      } as QuizRating)
      ;(buildPlayerGameEvent as jest.Mock).mockReturnValue({
        type: 'GAME_OVER_PLAYER',
      })

      await service.subscribe('game-1', 'p1')

      expect(buildPlayerGameEvent).toHaveBeenCalledWith(
        doc,
        doc.participants[0],
        expect.objectContaining({
          podiumCanRateQuiz: true,
          podiumRatingStars: 5,
          podiumRatingComment: 'Amazing!',
        }),
      )
    })

    it('omits rating fields when no prior rating exists', async () => {
      const doc = buildPodiumGameDoc()
      gameRepository.findGameByIDWithStatusesOrThrow.mockResolvedValue(doc)
      quizRepository.findQuizByIdOrThrow.mockResolvedValue(buildQuizDoc())
      userRepository.findUserById.mockResolvedValue(null)
      quizRatingRepository.findQuizRatingByAnonymousAuthor.mockResolvedValue(
        null,
      )
      ;(buildPlayerGameEvent as jest.Mock).mockReturnValue({
        type: 'GAME_OVER_PLAYER',
      })

      await service.subscribe('game-1', 'p1')

      const callArg = (buildPlayerGameEvent as jest.Mock).mock
        .calls[0][2] as any
      expect(callArg).not.toHaveProperty('podiumRatingStars')
      expect(callArg).not.toHaveProperty('podiumRatingComment')
    })

    it('does not call enrichment repositories when task is not Podium', async () => {
      const doc = buildGameDoc({ currentTask: { type: TaskType.Lobby } })
      gameRepository.findGameByIDWithStatusesOrThrow.mockResolvedValue(doc)
      ;(buildPlayerGameEvent as jest.Mock).mockReturnValue({
        type: 'GAME_LOBBY',
      })

      await service.subscribe('game-1', 'p1')

      expect(quizRepository.findQuizByIdOrThrow).not.toHaveBeenCalled()
      expect(userRepository.findUserById).not.toHaveBeenCalled()
      expect(
        quizRatingRepository.findQuizRatingByUserAuthor,
      ).not.toHaveBeenCalled()
      expect(
        quizRatingRepository.findQuizRatingByAnonymousAuthor,
      ).not.toHaveBeenCalled()
    })

    it('does not call enrichment repositories when participant is the HOST', async () => {
      const doc = buildPodiumGameDoc()
      gameRepository.findGameByIDWithStatusesOrThrow.mockResolvedValue(doc)
      ;(buildHostGameEvent as jest.Mock).mockReturnValue({
        type: 'GAME_PODIUM_HOST',
      })

      await service.subscribe('game-1', 'host')

      expect(quizRepository.findQuizByIdOrThrow).not.toHaveBeenCalled()
      expect(userRepository.findUserById).not.toHaveBeenCalled()
    })
  })
})
