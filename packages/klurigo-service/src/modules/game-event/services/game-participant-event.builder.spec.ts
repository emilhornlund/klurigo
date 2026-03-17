import { GameParticipantType, QuestionType } from '@klurigo/common'

import { GameAnswerRepository } from '../../game-core/repositories'
import { TaskType } from '../../game-core/repositories/models/schemas'
import {
  QuizRatingRepository,
  QuizRepository,
} from '../../quiz-core/repositories'
import { UserRepository } from '../../user/repositories'

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

describe('GameParticipantEventBuilder', () => {
  let gameAnswerRepository: jest.Mocked<GameAnswerRepository>
  let quizRepository: jest.Mocked<QuizRepository>
  let quizRatingRepository: jest.Mocked<QuizRatingRepository>
  let userRepository: jest.Mocked<UserRepository>
  let service: GameParticipantEventBuilder

  beforeEach(() => {
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
    ;(buildHostGameEvent as jest.Mock).mockReset()
    ;(buildPlayerGameEvent as jest.Mock).mockReset()
    ;(toGameEventMetaData as jest.Mock)
      .mockReset()
      .mockReturnValue({ meta: true })
    ;(toPlayerQuestionPlayerEventMetaData as jest.Mock)
      .mockReset()
      .mockReturnValue({ pmeta: true })

    service = new GameParticipantEventBuilder(
      gameAnswerRepository,
      quizRepository,
      quizRatingRepository,
      userRepository,
    )
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  const buildGameDoc = (overrides: Partial<any> = {}) => ({
    _id: 'game-1',
    currentTask: { type: TaskType.Lobby },
    quiz: { _id: 'quiz-1' },
    participants: [
      {
        participantId: 'player-1',
        type: GameParticipantType.PLAYER,
        nickname: 'Alice',
      },
      {
        participantId: 'host-1',
        type: GameParticipantType.HOST,
        nickname: 'Host',
      },
    ],
    ...overrides,
  })

  it('createContext loads answers and computes shared metadata once', async () => {
    const answers = [{ playerId: 'player-1' }]
    const doc = buildGameDoc()

    gameAnswerRepository.findAllAnswersByGameId.mockResolvedValue(
      answers as any,
    )

    const result = await service.createContext(doc as any)

    expect(gameAnswerRepository.findAllAnswersByGameId).toHaveBeenCalledWith(
      'game-1',
    )
    expect(toGameEventMetaData).toHaveBeenCalledWith(
      answers,
      {},
      doc.participants,
    )
    expect(result).toEqual({
      answers,
      metaData: { meta: true },
    })
  })

  it('buildParticipantEvent uses the shared context for host events', async () => {
    const doc = buildGameDoc()
    const context = {
      answers: [],
      metaData: {
        currentAnswerSubmissions: 0,
        totalAnswerSubmissions: 1,
      },
    }
    ;(buildHostGameEvent as jest.Mock).mockReturnValue({ host: true })

    const result = await service.buildParticipantEvent(
      doc as any,
      doc.participants[1] as any,
      context,
    )

    expect(buildHostGameEvent).toHaveBeenCalledWith(doc, context.metaData)
    expect(gameAnswerRepository.findAllAnswersByGameId).not.toHaveBeenCalled()
    expect(result).toEqual({ host: true })
  })

  it('buildParticipantEvent merges question metadata for player question events', async () => {
    const doc = buildGameDoc({ currentTask: { type: TaskType.Question } })
    const context = {
      answers: [
        {
          type: QuestionType.TypeAnswer,
          playerId: 'player-1',
          answer: 'A',
          created: new Date(),
        },
      ],
      metaData: {
        currentAnswerSubmissions: 1,
        totalAnswerSubmissions: 1,
      },
    }
    ;(buildPlayerGameEvent as jest.Mock).mockReturnValue({ player: true })

    const result = await service.buildParticipantEvent(
      doc as any,
      doc.participants[0] as any,
      context,
    )

    expect(toPlayerQuestionPlayerEventMetaData).toHaveBeenCalledWith(
      context.answers,
      doc.participants[0],
    )
    expect(buildPlayerGameEvent).toHaveBeenCalledWith(
      doc,
      doc.participants[0],
      expect.objectContaining({
        currentAnswerSubmissions: 1,
        totalAnswerSubmissions: 1,
        pmeta: true,
      }),
    )
    expect(result).toEqual({ player: true })
  })

  it('buildParticipantEvent enriches anonymous podium player events', async () => {
    const doc = buildGameDoc({ currentTask: { type: TaskType.Podium } })
    const context = {
      answers: [],
      metaData: {
        currentAnswerSubmissions: 0,
        totalAnswerSubmissions: 1,
      },
    }
    ;(buildPlayerGameEvent as jest.Mock).mockReturnValue({ player: true })
    quizRepository.findQuizByIdOrThrow.mockResolvedValue({
      _id: 'quiz-1',
      owner: { _id: 'owner-1' },
    } as any)
    quizRatingRepository.findQuizRatingByAnonymousAuthor.mockResolvedValue({
      stars: 5,
      comment: 'Amazing!',
    } as any)

    await service.buildParticipantEvent(
      doc as any,
      doc.participants[0] as any,
      context,
    )

    expect(userRepository.findUserById).toHaveBeenCalledWith('player-1')
    expect(
      quizRatingRepository.findQuizRatingByAnonymousAuthor,
    ).toHaveBeenCalledWith('quiz-1', 'player-1')
    expect(buildPlayerGameEvent).toHaveBeenCalledWith(
      doc,
      doc.participants[0],
      expect.objectContaining({
        currentAnswerSubmissions: 0,
        totalAnswerSubmissions: 1,
        podiumCanRateQuiz: true,
        podiumRatingStars: 5,
        podiumRatingComment: 'Amazing!',
      }),
    )
  })

  it('buildParticipantEvent prevents logged-in quiz owners from rating on podium', async () => {
    const doc = buildGameDoc({ currentTask: { type: TaskType.Podium } })
    const context = {
      answers: [],
      metaData: {
        currentAnswerSubmissions: 0,
        totalAnswerSubmissions: 1,
      },
    }
    ;(buildPlayerGameEvent as jest.Mock).mockReturnValue({ player: true })
    quizRepository.findQuizByIdOrThrow.mockResolvedValue({
      _id: 'quiz-1',
      owner: { _id: 'player-1' },
    } as any)
    userRepository.findUserById.mockResolvedValue({
      _id: 'player-1',
    } as any)

    await service.buildParticipantEvent(
      doc as any,
      doc.participants[0] as any,
      context,
    )

    expect(
      quizRatingRepository.findQuizRatingByUserAuthor,
    ).toHaveBeenCalledWith('quiz-1', 'player-1')
    expect(buildPlayerGameEvent).toHaveBeenCalledWith(
      doc,
      doc.participants[0],
      expect.objectContaining({
        currentAnswerSubmissions: 0,
        totalAnswerSubmissions: 1,
        podiumCanRateQuiz: false,
      }),
    )
  })
})
