import { GameMode, type GameResultDto, QuizVisibility } from '@klurigo/common'
import { Logger } from '@nestjs/common'
import { Test } from '@nestjs/testing'

import {
  QuizRatingRepository,
  QuizRepository,
} from '../../quiz-core/repositories'
import { UserRepository } from '../../user/repositories'
import { GameResultsNotFoundException } from '../exceptions'
import { GameResultRepository } from '../repositories'
import type {
  GameResult,
  PlayerMetric,
  QuestionMetric,
} from '../repositories/models/schemas'

import { GameResultService } from './game-result.service'
import { buildGameResultModel } from './utils/game-result.converter'
import { aggregateQuizGameplaySummary } from './utils/quiz-gameplay-summary.utils'

jest.mock('./utils/game-result.converter', () => ({
  buildGameResultModel: jest.fn(),
}))

jest.mock('./utils/quiz-gameplay-summary.utils', () => ({
  aggregateQuizGameplaySummary: jest.fn(),
}))

type FindUserReturn = Awaited<ReturnType<UserRepository['findUserById']>>

describe(GameResultService.name, () => {
  let service: GameResultService
  let gameResultRepository: jest.Mocked<GameResultRepository>
  let quizRatingRepository: jest.Mocked<QuizRatingRepository>
  let quizRepository: jest.Mocked<QuizRepository>
  let userRepository: jest.Mocked<UserRepository>

  const asPlayerMetric = (overrides: Partial<PlayerMetric>): PlayerMetric =>
    ({
      participantId: 'p-default',
      nickname: 'Default',
      rank: 0,
      unanswered: 0,
      averageResponseTime: 0,
      longestCorrectStreak: 0,
      score: 0,
      correct: undefined,
      incorrect: undefined,
      averagePrecision: undefined,
      ...overrides,
    }) as unknown as PlayerMetric

  const asQuestionMetric = (
    overrides: Partial<QuestionMetric>,
  ): QuestionMetric =>
    ({
      text: 'Q',
      type: 'MultiChoice' as unknown as QuestionMetric['type'],
      unanswered: 0,
      averageResponseTime: 0,
      correct: undefined,
      incorrect: undefined,
      averagePrecision: undefined,
      ...overrides,
    }) as unknown as QuestionMetric

  const asGameResultDocument = (params: {
    gameID?: string
    name?: string
    mode?: GameMode
    quizId?: string
    quizVisibility?: QuizVisibility
    quizOwnerParticipantId?: string | undefined
    hostParticipantId?: string
    players?: PlayerMetric[]
    questions?: QuestionMetric[]
    hosted?: Date
    completed?: Date
  }) => {
    const hosted = params.hosted ?? new Date('2026-01-02T09:00:00.000Z')
    const completed = params.completed ?? new Date('2026-01-02T09:01:40.000Z') // +100s

    return {
      game: {
        _id: params.gameID ?? 'g-1',
        name: params.name ?? 'Game Name',
        mode: params.mode ?? GameMode.Classic,
        quiz: {
          _id: params.quizId ?? 'q-1',
          visibility: params.quizVisibility ?? QuizVisibility.Private,
          owner: params.quizOwnerParticipantId
            ? { _id: params.quizOwnerParticipantId }
            : undefined,
        },
      },
      hostParticipantId: params.hostParticipantId ?? 'host-1',
      players: params.players ?? [],
      questions: params.questions ?? [],
      hosted,
      completed,
    }
  }

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        GameResultService,
        {
          provide: GameResultRepository,
          useValue: {
            findGameResult: jest.fn(),
            createGameResult: jest.fn(),
            deleteMany: jest.fn(),
          },
        },
        {
          provide: QuizRatingRepository,
          useValue: {
            findQuizRatingByUserAuthor: jest.fn(),
          },
        },
        {
          provide: QuizRepository,
          useValue: {
            findQuizByIdOrThrow: jest.fn(),
            replaceQuiz: jest.fn(),
          },
        },
        {
          provide: UserRepository,
          useValue: {
            findUserById: jest.fn(),
          },
        },
      ],
    }).compile()

    service = moduleRef.get(GameResultService)

    gameResultRepository = moduleRef.get(
      GameResultRepository,
    ) as jest.Mocked<GameResultRepository>

    quizRatingRepository = moduleRef.get(
      QuizRatingRepository,
    ) as jest.Mocked<QuizRatingRepository>

    quizRepository = moduleRef.get(
      QuizRepository,
    ) as jest.Mocked<QuizRepository>

    userRepository = moduleRef.get(
      UserRepository,
    ) as jest.Mocked<UserRepository>

    jest.clearAllMocks()
  })

  describe('getGameResult', () => {
    it('throws GameResultsNotFoundException when the repository returns null', async () => {
      gameResultRepository.findGameResult.mockResolvedValueOnce(
        null as unknown as GameResult,
      )

      await expect(
        service.getGameResult('game-404', 'p-1'),
      ).rejects.toBeInstanceOf(GameResultsNotFoundException)

      expect(gameResultRepository.findGameResult).toHaveBeenCalledWith(
        'game-404',
      )
      expect(userRepository.findUserById).not.toHaveBeenCalled()
    })

    it('throws GameResultsNotFoundException when the game result document is missing quiz', async () => {
      const doc = asGameResultDocument({
        mode: GameMode.Classic,
        players: [
          asPlayerMetric({ participantId: 'p-1', rank: 1, nickname: 'A' }),
        ],
        questions: [asQuestionMetric({ text: 'Q1' })],
      })

      ;(doc.game as unknown as { quiz?: unknown }).quiz = undefined

      gameResultRepository.findGameResult.mockResolvedValueOnce(
        doc as unknown as GameResult,
      )

      await expect(
        service.getGameResult(doc.game._id, 'p-xyz'),
      ).rejects.toBeInstanceOf(GameResultsNotFoundException)

      expect(gameResultRepository.findGameResult).toHaveBeenCalledWith(
        doc.game._id,
      )
      expect(userRepository.findUserById).not.toHaveBeenCalled()
    })

    it('throws GameResultsNotFoundException using the requested gameID when quiz is missing', async () => {
      const requestedGameId = 'game-requested'

      const doc = asGameResultDocument({ gameID: 'game-from-doc' })
      ;(doc.game as unknown as { quiz?: unknown }).quiz = undefined

      gameResultRepository.findGameResult.mockResolvedValueOnce(
        doc as unknown as GameResult,
      )

      await expect(
        service.getGameResult(requestedGameId, 'p-1'),
      ).rejects.toBeInstanceOf(GameResultsNotFoundException)

      expect(gameResultRepository.findGameResult).toHaveBeenCalledWith(
        requestedGameId,
      )
    })

    it('maps base fields and uses host nickname fallback when user not found', async () => {
      const doc = asGameResultDocument({
        mode: GameMode.Classic,
        players: [
          asPlayerMetric({ participantId: 'p-1', rank: 1, nickname: 'A' }),
        ],
        questions: [asQuestionMetric({ text: 'Q1' })],
      })

      gameResultRepository.findGameResult.mockResolvedValueOnce(
        doc as unknown as GameResult,
      )
      userRepository.findUserById
        .mockResolvedValueOnce(undefined as unknown as FindUserReturn) // host user
        .mockResolvedValueOnce(undefined as unknown as FindUserReturn) // participant user

      const result = await service.getGameResult(doc.game._id, 'p-xyz')

      expect(userRepository.findUserById).toHaveBeenNthCalledWith(
        1,
        doc.hostParticipantId,
      )
      expect(userRepository.findUserById).toHaveBeenNthCalledWith(2, 'p-xyz')

      expect(
        quizRatingRepository.findQuizRatingByUserAuthor,
      ).not.toHaveBeenCalled()

      expect(result).toMatchObject({
        id: doc.game._id,
        name: doc.game.name,
        host: { id: doc.hostParticipantId, nickname: 'N/A' },
        numberOfPlayers: 1,
        numberOfQuestions: 1,
        created: doc.hosted,
      } satisfies Partial<GameResultDto>)

      expect(result.duration).toBe(100)
      expect(result.rating).toBeUndefined()
    })

    describe('quiz canHostLiveGame flag', () => {
      it('sets canHostLiveGame=true when participant is quiz owner', async () => {
        const doc = asGameResultDocument({
          quizVisibility: QuizVisibility.Private,
          quizOwnerParticipantId: 'owner-1',
          mode: GameMode.Classic,
          players: [
            asPlayerMetric({
              participantId: 'owner-1',
              rank: 1,
              nickname: 'Owner',
            }),
          ],
          questions: [asQuestionMetric({ text: 'Q1' })],
        })

        gameResultRepository.findGameResult.mockResolvedValueOnce(
          doc as unknown as GameResult,
        )
        userRepository.findUserById
          .mockResolvedValueOnce({
            defaultNickname: 'Host',
          } as unknown as FindUserReturn)
          .mockResolvedValueOnce({ _id: 'u-1' } as unknown as FindUserReturn) // participant
        quizRatingRepository.findQuizRatingByUserAuthor.mockResolvedValueOnce(
          null as unknown as never,
        )

        const result = await service.getGameResult(doc.game._id, 'owner-1')

        expect(result.quiz).toEqual({
          id: doc.game.quiz._id,
          canRateQuiz: false,
          canHostLiveGame: true,
        })
      })

      it('sets canHostLiveGame=true when quiz is public even if not owner', async () => {
        const doc = asGameResultDocument({
          quizVisibility: QuizVisibility.Public,
          quizOwnerParticipantId: 'owner-1',
          mode: GameMode.Classic,
          players: [
            asPlayerMetric({ participantId: 'p-1', rank: 1, nickname: 'A' }),
          ],
          questions: [asQuestionMetric({ text: 'Q1' })],
        })

        gameResultRepository.findGameResult.mockResolvedValueOnce(
          doc as unknown as GameResult,
        )
        userRepository.findUserById
          .mockResolvedValueOnce({
            defaultNickname: 'Host',
          } as unknown as FindUserReturn) // host
          .mockResolvedValueOnce({ _id: 'u-1' } as unknown as FindUserReturn) // participant
        quizRatingRepository.findQuizRatingByUserAuthor.mockResolvedValueOnce(
          null as unknown as never,
        )

        const result = await service.getGameResult(doc.game._id, 'not-owner')

        expect(result.quiz).toEqual({
          id: doc.game.quiz._id,
          canRateQuiz: true,
          canHostLiveGame: true,
        })
      })

      it('sets canHostLiveGame=false when quiz is private and participant is not owner', async () => {
        const doc = asGameResultDocument({
          quizVisibility: QuizVisibility.Private,
          quizOwnerParticipantId: 'owner-1',
          mode: GameMode.Classic,
          players: [
            asPlayerMetric({ participantId: 'p-1', rank: 1, nickname: 'A' }),
          ],
          questions: [asQuestionMetric({ text: 'Q1' })],
        })

        gameResultRepository.findGameResult.mockResolvedValueOnce(
          doc as unknown as GameResult,
        )
        userRepository.findUserById
          .mockResolvedValueOnce({
            defaultNickname: 'Host',
          } as unknown as FindUserReturn) // host
          .mockResolvedValueOnce({ _id: 'u-1' } as unknown as FindUserReturn) // participant
        quizRatingRepository.findQuizRatingByUserAuthor.mockResolvedValueOnce(
          null as unknown as never,
        )

        const result = await service.getGameResult(doc.game._id, 'not-owner')

        expect(result.quiz).toEqual({
          id: doc.game.quiz._id,
          canRateQuiz: true,
          canHostLiveGame: false,
        })
      })

      it('sets canHostLiveGame=true for public quiz even if quiz.owner is missing', async () => {
        const doc = asGameResultDocument({
          quizVisibility: QuizVisibility.Public,
          quizOwnerParticipantId: undefined,
          mode: GameMode.Classic,
          players: [
            asPlayerMetric({ participantId: 'p-1', rank: 1, nickname: 'A' }),
          ],
          questions: [asQuestionMetric({ text: 'Q1' })],
        })

        gameResultRepository.findGameResult.mockResolvedValueOnce(
          doc as unknown as GameResult,
        )
        userRepository.findUserById
          .mockResolvedValueOnce({
            defaultNickname: 'Host',
          } as unknown as FindUserReturn) // host
          .mockResolvedValueOnce({ _id: 'u-1' } as unknown as FindUserReturn) // participant
        quizRatingRepository.findQuizRatingByUserAuthor.mockResolvedValueOnce(
          null as unknown as never,
        )

        const result = await service.getGameResult(doc.game._id, 'anyone')

        expect(result.quiz).toEqual({
          id: doc.game.quiz._id,
          canRateQuiz: true,
          canHostLiveGame: true,
        })
      })
    })

    describe('Classic mode mapping', () => {
      it('filters player metrics to top 5 plus requesting participant, and sorts by rank', async () => {
        const participantId = 'p-8'

        const players: PlayerMetric[] = [
          asPlayerMetric({
            participantId: 'p-7',
            nickname: 'P7',
            rank: 7,
            score: 70,
            correct: 1,
            incorrect: 2,
          }),
          asPlayerMetric({
            participantId: 'p-2',
            nickname: 'P2',
            rank: 2,
            score: 20,
            correct: 2,
            incorrect: 0,
          }),
          asPlayerMetric({
            participantId: 'p-6',
            nickname: 'P6',
            rank: 6,
            score: 60,
            correct: 3,
            incorrect: 1,
          }),
          asPlayerMetric({
            participantId: 'p-1',
            nickname: 'P1',
            rank: 1,
            score: 10,
            correct: 4,
            incorrect: 0,
          }),
          asPlayerMetric({
            participantId: participantId,
            nickname: 'Me',
            rank: 8,
            score: 80,
            correct: 5,
            incorrect: 5,
          }),
          asPlayerMetric({
            participantId: 'p-5',
            nickname: 'P5',
            rank: 5,
            score: 50,
            correct: 0,
            incorrect: 0,
          }),
          asPlayerMetric({
            participantId: 'p-4',
            nickname: 'P4',
            rank: 4,
            score: 40,
            correct: 0,
            incorrect: 0,
          }),
          asPlayerMetric({
            participantId: 'p-3',
            nickname: 'P3',
            rank: 3,
            score: 30,
            correct: 0,
            incorrect: 0,
          }),
        ]

        const questions: QuestionMetric[] = [
          asQuestionMetric({ text: 'Q1', correct: 3, incorrect: 2 }),
          asQuestionMetric({
            text: 'Q2',
            correct: undefined,
            incorrect: undefined,
          }),
        ]

        const doc = asGameResultDocument({
          mode: GameMode.Classic,
          players,
          questions,
        })

        gameResultRepository.findGameResult.mockResolvedValueOnce(
          doc as unknown as GameResult,
        )
        userRepository.findUserById
          .mockResolvedValueOnce({
            defaultNickname: 'HostNick',
          } as unknown as FindUserReturn) // host
          .mockResolvedValueOnce({ _id: 'u-1' } as unknown as FindUserReturn) // participant
        quizRatingRepository.findQuizRatingByUserAuthor.mockResolvedValueOnce(
          null as unknown as never,
        )

        const result = await service.getGameResult(doc.game._id, participantId)

        expect(result.mode).toBe(GameMode.Classic)

        // Included ranks: 1..5 plus participant rank 8; excluded rank 6 and 7.
        expect(result.playerMetrics.map((m) => m.player.id)).toEqual([
          'p-1',
          'p-2',
          'p-3',
          'p-4',
          'p-5',
          participantId,
        ])

        // Sorted by ascending rank.
        expect(result.playerMetrics.map((m) => m.rank)).toEqual([
          1, 2, 3, 4, 5, 8,
        ])

        // Classic-only fields present with safe defaults.
        const me = result.playerMetrics.find(
          (m) => m.player.id === participantId,
        )
        expect(me).toBeDefined()
        expect(me && 'correct' in me ? me.correct : undefined).toBe(5)
        expect(me && 'incorrect' in me ? me.incorrect : undefined).toBe(5)

        expect(result.questionMetrics).toHaveLength(2)

        const q1 = result.questionMetrics[0]
        expect(q1).toMatchObject({ text: 'Q1', correct: 3, incorrect: 2 })

        // Defaults: undefined -> 0
        const q2 = result.questionMetrics[1]
        expect(q2).toMatchObject({ text: 'Q2', correct: 0, incorrect: 0 })
      })

      it('does not include rank 0 unless it belongs to requesting participant', async () => {
        const participantId = 'p-me'

        const doc = asGameResultDocument({
          mode: GameMode.Classic,
          players: [
            asPlayerMetric({
              participantId: 'p-0',
              nickname: 'NoRank',
              rank: 0,
            }),
            asPlayerMetric({ participantId, nickname: 'Me', rank: 0 }),
            asPlayerMetric({
              participantId: 'p-1',
              nickname: 'Rank1',
              rank: 1,
            }),
          ],
          questions: [asQuestionMetric({ text: 'Q1' })],
        })

        gameResultRepository.findGameResult.mockResolvedValueOnce(
          doc as unknown as GameResult,
        )
        userRepository.findUserById
          .mockResolvedValueOnce({
            defaultNickname: 'HostNick',
          } as unknown as FindUserReturn) // host
          .mockResolvedValueOnce({ _id: 'u-1' } as unknown as FindUserReturn) // participant
        quizRatingRepository.findQuizRatingByUserAuthor.mockResolvedValueOnce(
          null as unknown as never,
        )

        const result = await service.getGameResult(doc.game._id, participantId)

        const ids = result.playerMetrics.map((m) => m.player.id)

        expect(ids).toHaveLength(2)
        expect(ids).toContain(participantId)
        expect(ids).toContain('p-1')
        expect(ids).not.toContain('p-0')
      })

      it('uses 0 defaults for correct/incorrect when player metric values are undefined', async () => {
        const doc = asGameResultDocument({
          mode: GameMode.Classic,
          players: [
            asPlayerMetric({
              participantId: 'p-1',
              nickname: 'P1',
              rank: 1,
              correct: undefined,
              incorrect: undefined,
            }),
          ],
          questions: [asQuestionMetric({ text: 'Q1' })],
        })

        gameResultRepository.findGameResult.mockResolvedValueOnce(
          doc as unknown as GameResult,
        )
        userRepository.findUserById
          .mockResolvedValueOnce({
            defaultNickname: 'HostNick',
          } as unknown as FindUserReturn) // host
          .mockResolvedValueOnce({ _id: 'u-1' } as unknown as FindUserReturn) // participant
        quizRatingRepository.findQuizRatingByUserAuthor.mockResolvedValueOnce(
          null as unknown as never,
        )

        const result = await service.getGameResult(doc.game._id, 'p-any')

        expect(result.playerMetrics).toHaveLength(1)
        expect(result.playerMetrics[0]).toMatchObject({
          player: { id: 'p-1', nickname: 'P1' },
          rank: 1,
          correct: 0,
          incorrect: 0,
        })
      })
    })

    describe('Zero-to-One-Hundred mode mapping', () => {
      it('maps averagePrecision with default 0 and applies the same filter/sort rules', async () => {
        const participantId = 'p-9'

        const doc = asGameResultDocument({
          mode: GameMode.ZeroToOneHundred,
          players: [
            asPlayerMetric({
              participantId: 'p-1',
              nickname: 'P1',
              rank: 1,
              averagePrecision: 88,
            }),
            asPlayerMetric({
              participantId: 'p-2',
              nickname: 'P2',
              rank: 2,
              averagePrecision: undefined,
            }),
            asPlayerMetric({
              participantId: 'p-6',
              nickname: 'P6',
              rank: 6,
              averagePrecision: 10,
            }),
            asPlayerMetric({
              participantId,
              nickname: 'Me',
              rank: 9,
              averagePrecision: 42,
            }),
          ],
          questions: [
            asQuestionMetric({ text: 'Q1', averagePrecision: 50 }),
            asQuestionMetric({ text: 'Q2', averagePrecision: undefined }),
          ],
        })

        gameResultRepository.findGameResult.mockResolvedValueOnce(
          doc as unknown as GameResult,
        )
        userRepository.findUserById
          .mockResolvedValueOnce({
            defaultNickname: 'HostNick',
          } as unknown as FindUserReturn) // host
          .mockResolvedValueOnce({ _id: 'u-1' } as unknown as FindUserReturn) // participant
        quizRatingRepository.findQuizRatingByUserAuthor.mockResolvedValueOnce(
          null as unknown as never,
        )

        const result = await service.getGameResult(doc.game._id, participantId)

        expect(result.mode).toBe(GameMode.ZeroToOneHundred)

        // Included: rank 1..5 (so 1 and 2) plus participant rank 9; excluded rank 6.
        expect(result.playerMetrics.map((m) => m.player.id)).toEqual([
          'p-1',
          'p-2',
          participantId,
        ])
        expect(result.playerMetrics.map((m) => m.rank)).toEqual([1, 2, 9])

        const p2 = result.playerMetrics.find((m) => m.player.id === 'p-2')
        expect(p2).toBeDefined()
        expect(
          p2 && 'averagePrecision' in p2 ? p2.averagePrecision : undefined,
        ).toBe(0)

        expect(result.questionMetrics).toHaveLength(2)
        expect(result.questionMetrics[0]).toMatchObject({
          text: 'Q1',
          averagePrecision: 50,
        })
        expect(result.questionMetrics[1]).toMatchObject({
          text: 'Q2',
          averagePrecision: 0,
        })
      })
    })

    it('does not query rating when participant user is not found', async () => {
      const doc = asGameResultDocument({
        mode: GameMode.Classic,
        players: [
          asPlayerMetric({ participantId: 'p-1', rank: 1, nickname: 'A' }),
        ],
        questions: [asQuestionMetric({ text: 'Q1' })],
      })

      gameResultRepository.findGameResult.mockResolvedValueOnce(
        doc as unknown as GameResult,
      )

      userRepository.findUserById
        .mockResolvedValueOnce({
          defaultNickname: 'HostNick',
        } as unknown as FindUserReturn) // host
        .mockResolvedValueOnce(undefined as unknown as FindUserReturn) // participant

      const result = await service.getGameResult(doc.game._id, 'p-missing')

      expect(
        quizRatingRepository.findQuizRatingByUserAuthor,
      ).not.toHaveBeenCalled()
      expect(result.rating).toBeUndefined()
    })

    it('includes rating when participant has rated the quiz', async () => {
      const participantId = 'p-1'

      const doc = asGameResultDocument({
        mode: GameMode.Classic,
        players: [asPlayerMetric({ participantId, rank: 1, nickname: 'A' })],
        questions: [asQuestionMetric({ text: 'Q1' })],
      })

      gameResultRepository.findGameResult.mockResolvedValueOnce(
        doc as unknown as GameResult,
      )

      const participantUser = { _id: 'u-1' } as unknown as FindUserReturn

      userRepository.findUserById
        .mockResolvedValueOnce({
          defaultNickname: 'HostNick',
        } as unknown as FindUserReturn) // host
        .mockResolvedValueOnce(participantUser) // participant

      quizRatingRepository.findQuizRatingByUserAuthor.mockResolvedValueOnce({
        stars: 4,
        comment: 'Nice quiz',
      } as unknown as never)

      const result = await service.getGameResult(doc.game._id, participantId)

      expect(
        quizRatingRepository.findQuizRatingByUserAuthor,
      ).toHaveBeenCalledTimes(1)
      expect(
        quizRatingRepository.findQuizRatingByUserAuthor,
      ).toHaveBeenCalledWith(doc.game.quiz._id, participantUser!._id)

      expect(result.rating).toEqual({ stars: 4, comment: 'Nice quiz' })
    })
  })

  describe('createGameResult', () => {
    it('builds a result model from the game document, persists it, aggregates gameplay summary, and updates the quiz', async () => {
      const completed = new Date('2026-01-26T09:00:00.000Z')

      const gameDocument = {
        _id: 'game-1',
        mode: GameMode.Classic,
        quiz: { _id: 'quiz-1' },
      } as unknown as import('../../game-core/repositories/models/schemas').GameDocument

      const built = { gameId: 'game-1' } as unknown as GameResult
      const persisted = { _id: 'result-1', completed } as unknown as GameResult

      const quiz = {
        _id: 'quiz-1',
        gameplaySummary: { count: 1 },
        name: 'My quiz',
      } as unknown as { _id: string; gameplaySummary: unknown; name: string }

      const updatedGameplaySummary = { count: 2 }

      ;(
        buildGameResultModel as jest.MockedFunction<typeof buildGameResultModel>
      ).mockReturnValueOnce(
        built as unknown as ReturnType<typeof buildGameResultModel>,
      )

      gameResultRepository.createGameResult.mockResolvedValueOnce(persisted)

      quizRepository.findQuizByIdOrThrow.mockResolvedValueOnce(quiz as never)
      ;(
        aggregateQuizGameplaySummary as jest.MockedFunction<
          typeof aggregateQuizGameplaySummary
        >
      ).mockReturnValueOnce(updatedGameplaySummary as never)

      quizRepository.replaceQuiz.mockResolvedValueOnce(undefined as never)

      const result = await service.createGameResult(gameDocument)

      expect(buildGameResultModel).toHaveBeenCalledTimes(1)
      expect(buildGameResultModel).toHaveBeenCalledWith(gameDocument)

      expect(gameResultRepository.createGameResult).toHaveBeenCalledTimes(1)
      expect(gameResultRepository.createGameResult).toHaveBeenCalledWith(built)

      expect(quizRepository.findQuizByIdOrThrow).toHaveBeenCalledTimes(1)
      expect(quizRepository.findQuizByIdOrThrow).toHaveBeenCalledWith('quiz-1')

      expect(aggregateQuizGameplaySummary).toHaveBeenCalledTimes(1)
      expect(aggregateQuizGameplaySummary).toHaveBeenCalledWith(
        quiz.gameplaySummary,
        persisted,
        GameMode.Classic,
        completed,
      )

      expect(quizRepository.replaceQuiz).toHaveBeenCalledTimes(1)
      expect(quizRepository.replaceQuiz).toHaveBeenCalledWith('quiz-1', {
        ...quiz,
        gameplaySummary: updatedGameplaySummary,
      })

      expect(result).toBe(persisted)
    })

    it('uses the persisted gameResult.completed (not the game document) when aggregating', async () => {
      const completedFromResult = new Date('2026-01-26T09:00:00.000Z')

      const gameDocument = {
        _id: 'game-1',
        mode: GameMode.Classic,
        quiz: { _id: 'quiz-1' },
        completed: new Date('1999-01-01T00:00:00.000Z'),
      } as unknown as import('../../game-core/repositories/models/schemas').GameDocument

      const built = { gameId: 'game-1' } as unknown as GameResult
      const persisted = {
        _id: 'result-1',
        completed: completedFromResult,
      } as unknown as GameResult

      const quiz = {
        _id: 'quiz-1',
        gameplaySummary: { count: 1 },
      } as unknown as { _id: string; gameplaySummary: unknown }

      ;(
        buildGameResultModel as jest.MockedFunction<typeof buildGameResultModel>
      ).mockReturnValueOnce(
        built as unknown as ReturnType<typeof buildGameResultModel>,
      )
      gameResultRepository.createGameResult.mockResolvedValueOnce(persisted)
      quizRepository.findQuizByIdOrThrow.mockResolvedValueOnce(quiz as never)
      ;(
        aggregateQuizGameplaySummary as jest.MockedFunction<
          typeof aggregateQuizGameplaySummary
        >
      ).mockReturnValueOnce({ count: 2 } as never)
      quizRepository.replaceQuiz.mockResolvedValueOnce(undefined as never)

      await service.createGameResult(gameDocument)

      expect(aggregateQuizGameplaySummary).toHaveBeenCalledWith(
        quiz.gameplaySummary,
        persisted,
        GameMode.Classic,
        completedFromResult,
      )
    })

    it('propagates errors from createGameResult and does not attempt quiz updates', async () => {
      const gameDocument = {
        _id: 'game-1',
        mode: GameMode.Classic,
        quiz: { _id: 'quiz-1' },
      } as unknown as import('../../game-core/repositories/models/schemas').GameDocument

      const built = { gameId: 'game-1' } as unknown as GameResult

      ;(
        buildGameResultModel as jest.MockedFunction<typeof buildGameResultModel>
      ).mockReturnValueOnce(
        built as unknown as ReturnType<typeof buildGameResultModel>,
      )

      const err = new Error('db down')
      gameResultRepository.createGameResult.mockRejectedValueOnce(err)

      await expect(service.createGameResult(gameDocument)).rejects.toThrow(
        'db down',
      )

      expect(quizRepository.findQuizByIdOrThrow).not.toHaveBeenCalled()
      expect(aggregateQuizGameplaySummary).not.toHaveBeenCalled()
      expect(quizRepository.replaceQuiz).not.toHaveBeenCalled()
    })

    it('propagates errors from findQuizByIdOrThrow and does not call aggregate or replace', async () => {
      const completed = new Date('2026-01-26T09:00:00.000Z')

      const gameDocument = {
        _id: 'game-1',
        mode: GameMode.Classic,
        quiz: { _id: 'quiz-1' },
      } as unknown as import('../../game-core/repositories/models/schemas').GameDocument

      const built = { gameId: 'game-1' } as unknown as GameResult
      const persisted = { _id: 'result-1', completed } as unknown as GameResult

      ;(
        buildGameResultModel as jest.MockedFunction<typeof buildGameResultModel>
      ).mockReturnValueOnce(
        built as unknown as ReturnType<typeof buildGameResultModel>,
      )
      gameResultRepository.createGameResult.mockResolvedValueOnce(persisted)

      const err = new Error('quiz not found')
      quizRepository.findQuizByIdOrThrow.mockRejectedValueOnce(err)

      await expect(service.createGameResult(gameDocument)).rejects.toThrow(
        'quiz not found',
      )

      expect(aggregateQuizGameplaySummary).not.toHaveBeenCalled()
      expect(quizRepository.replaceQuiz).not.toHaveBeenCalled()
    })

    it('propagates errors from replaceQuiz after aggregating', async () => {
      const completed = new Date('2026-01-26T09:00:00.000Z')

      const gameDocument = {
        _id: 'game-1',
        mode: GameMode.Classic,
        quiz: { _id: 'quiz-1' },
      } as unknown as import('../../game-core/repositories/models/schemas').GameDocument

      const built = { gameId: 'game-1' } as unknown as GameResult
      const persisted = { _id: 'result-1', completed } as unknown as GameResult

      const quiz = {
        _id: 'quiz-1',
        gameplaySummary: { count: 1 },
      } as unknown as { _id: string; gameplaySummary: unknown }

      ;(
        buildGameResultModel as jest.MockedFunction<typeof buildGameResultModel>
      ).mockReturnValueOnce(
        built as unknown as ReturnType<typeof buildGameResultModel>,
      )
      gameResultRepository.createGameResult.mockResolvedValueOnce(persisted)
      quizRepository.findQuizByIdOrThrow.mockResolvedValueOnce(quiz as never)
      ;(
        aggregateQuizGameplaySummary as jest.MockedFunction<
          typeof aggregateQuizGameplaySummary
        >
      ).mockReturnValueOnce({ count: 2 } as never)

      const err = new Error('write failed')
      quizRepository.replaceQuiz.mockRejectedValueOnce(err)

      await expect(service.createGameResult(gameDocument)).rejects.toThrow(
        'write failed',
      )

      expect(aggregateQuizGameplaySummary).toHaveBeenCalledTimes(1)
      expect(quizRepository.replaceQuiz).toHaveBeenCalledTimes(1)
    })
  })

  describe('deleteByGameId', () => {
    let logSpy: jest.SpyInstance | undefined

    beforeEach(() => {
      logSpy = jest
        .spyOn(Logger.prototype, 'log')
        .mockImplementation(() => undefined)
    })

    afterEach(() => {
      logSpy?.mockRestore()
    })

    it('deletes game results by gameId and logs deleted count', async () => {
      const gameId = 'game-123'
      gameResultRepository.deleteMany.mockResolvedValueOnce(
        3 as unknown as never,
      )

      await service.deleteByGameId(gameId)

      expect(gameResultRepository.deleteMany).toHaveBeenCalledTimes(1)
      expect(gameResultRepository.deleteMany).toHaveBeenCalledWith({
        game: { _id: gameId },
      })

      expect(logSpy).toHaveBeenCalledWith(
        `Deleted '3' game results by their gameId '${gameId}'.`,
      )
    })

    it('logs count 0 when nothing is deleted', async () => {
      const gameId = 'game-0'
      gameResultRepository.deleteMany.mockResolvedValueOnce(
        0 as unknown as never,
      )

      await service.deleteByGameId(gameId)

      expect(gameResultRepository.deleteMany).toHaveBeenCalledWith({
        game: { _id: gameId },
      })

      expect(logSpy).toHaveBeenCalledWith(
        `Deleted '0' game results by their gameId '${gameId}'.`,
      )
    })

    it('bubbles repository errors and does not log success message', async () => {
      const gameId = 'game-fail'
      gameResultRepository.deleteMany.mockRejectedValueOnce(
        new Error('db down'),
      )

      await expect(service.deleteByGameId(gameId)).rejects.toThrow('db down')

      expect(gameResultRepository.deleteMany).toHaveBeenCalledWith({
        game: { _id: gameId },
      })

      expect(logSpy).not.toHaveBeenCalled()
    })
  })
})
