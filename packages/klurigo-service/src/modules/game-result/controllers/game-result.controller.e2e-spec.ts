import {
  GameMode,
  GameParticipantType,
  GameStatus,
  MediaType,
  QuestionRangeAnswerMargin,
  QuestionType,
} from '@klurigo/common'
import { INestApplication } from '@nestjs/common'
import { getModelToken } from '@nestjs/mongoose'
import supertest from 'supertest'
import { v4 as uuidv4 } from 'uuid'

import {
  buildMockQuizRating,
  buildMockSecondaryUser,
  buildMockTertiaryUser,
  createMockClassicQuiz,
  createMockZeroToOneHundredQuiz,
} from '../../../../test-utils/data'
import {
  closeTestApp,
  createDefaultUserAndAuthenticate,
  createTestApp,
} from '../../../../test-utils/utils'
import {
  Game,
  GameModel,
  TaskType,
} from '../../game-core/repositories/models/schemas'
import {
  Quiz,
  QuizModel,
  QuizRating,
  QuizRatingModel,
} from '../../quiz-core/repositories/models/schemas'
import { User, UserModel } from '../../user/repositories'
import { GameResult, GameResultModel } from '../repositories/models/schemas'

describe('GameResultController (e2e)', () => {
  let app: INestApplication
  let gameModel: GameModel
  let gameResultModel: GameResultModel
  let userModel: UserModel
  let quizModel: QuizModel
  let quizRatingModel: QuizRatingModel
  let playerUser: User

  beforeEach(async () => {
    app = await createTestApp()
    gameModel = app.get<GameModel>(getModelToken(Game.name))
    gameResultModel = app.get<GameResultModel>(getModelToken(GameResult.name))
    userModel = app.get<UserModel>(getModelToken(User.name))
    quizModel = app.get<QuizModel>(getModelToken(Quiz.name))
    quizRatingModel = app.get<QuizRatingModel>(getModelToken(QuizRating.name))
    playerUser = await userModel.create(buildMockSecondaryUser())
  })

  afterEach(async () => {
    await closeTestApp(app)
  })

  describe('/api/games/:gameID/results (GET)', () => {
    it('should succeed in retrieving game results for a classic mode game as a host participant', async () => {
      const gameId = uuidv4()

      const { accessToken, user: hostUser } =
        await createDefaultUserAndAuthenticate(app)

      const quiz = await quizModel.create(
        createMockClassicQuiz({ owner: hostUser }),
      )

      const game = await gameModel.create({
        ...buildMockClassicModeGame(hostUser, playerUser),
        _id: gameId,
        quiz,
      })

      const gameResult = await gameResultModel.create(
        buildMockClassicModeGameResult(game, hostUser, playerUser),
      )

      return supertest(app.getHttpServer())
        .get(`/api/games/${game._id}/results`)
        .set({ Authorization: `Bearer ${accessToken}` })
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual({
            id: gameResult.game._id,
            name: 'Classic Quiz Debug',
            mode: GameMode.Classic,
            quiz: {
              id: quiz._id,
              canRateQuiz: false,
              canHostLiveGame: true,
            },
            host: {
              id: hostUser._id,
              nickname: 'FrostyBear',
            },
            numberOfPlayers: 10,
            numberOfQuestions: 4,
            playerMetrics: [
              {
                player: {
                  id: expect.any(String),
                  nickname: 'GuessMachine',
                },
                rank: 1,
                comebackRankGain: 3,
                correct: 4,
                incorrect: 0,
                unanswered: 0,
                averageResponseTime: 2924,
                longestCorrectStreak: 4,
                score: 3846,
              },
              {
                player: {
                  id: expect.any(String),
                  nickname: 'QuizWhiz',
                },
                rank: 2,
                comebackRankGain: 5,
                correct: 4,
                incorrect: 0,
                unanswered: 0,
                averageResponseTime: 3310,
                longestCorrectStreak: 4,
                score: 3721,
              },
              {
                player: {
                  id: expect.any(String),
                  nickname: 'BrainiacBert',
                },
                rank: 3,
                comebackRankGain: 0,
                correct: 3,
                incorrect: 1,
                unanswered: 0,
                averageResponseTime: 3582,
                longestCorrectStreak: 3,
                score: 3458,
              },
              {
                player: {
                  id: expect.any(String),
                  nickname: 'TriviaTitan',
                },
                rank: 4,
                comebackRankGain: 4,
                correct: 3,
                incorrect: 1,
                unanswered: 0,
                averageResponseTime: 4120,
                longestCorrectStreak: 2,
                score: 3264,
              },
              {
                player: {
                  id: expect.any(String),
                  nickname: 'SmartyPants',
                },
                rank: 5,
                comebackRankGain: 1,
                correct: 3,
                incorrect: 1,
                unanswered: 0,
                averageResponseTime: 4682,
                longestCorrectStreak: 2,
                score: 3097,
              },
            ],
            questionMetrics: [
              {
                text: 'What is the capital of Sweden?',
                type: QuestionType.MultiChoice,
                correct: 1,
                incorrect: 0,
                unanswered: 0,
                averageResponseTime: 1284,
              },
              {
                text: 'Guess the temperature of the hottest day ever recorded.',
                type: QuestionType.Range,
                correct: 1,
                incorrect: 0,
                unanswered: 0,
                averageResponseTime: 3035,
              },
              {
                text: 'The earth is flat.',
                type: QuestionType.TrueFalse,
                correct: 1,
                incorrect: 0,
                unanswered: 0,
                averageResponseTime: 811,
              },
              {
                text: 'What is the capital of Denmark?',
                type: QuestionType.TypeAnswer,
                correct: 1,
                incorrect: 0,
                unanswered: 0,
                averageResponseTime: 6566,
              },
            ],
            duration: 36.035,
            created: gameResult.hosted.toISOString(),
          })
        })
    })

    it('should succeed in retrieving game results for a classic mode game as a player participant', async () => {
      const gameId = uuidv4()

      const { accessToken, user: playerUser } =
        await createDefaultUserAndAuthenticate(app)

      const hostUser = await userModel.create(buildMockTertiaryUser())

      const quiz = await quizModel.create(
        createMockClassicQuiz({ owner: hostUser }),
      )

      const game = await gameModel.create({
        ...buildMockClassicModeGame(hostUser, playerUser),
        _id: gameId,
        quiz,
      })

      const gameResult = await gameResultModel.create(
        buildMockClassicModeGameResult(game, hostUser, playerUser),
      )

      return supertest(app.getHttpServer())
        .get(`/api/games/${game._id}/results`)
        .set({ Authorization: `Bearer ${accessToken}` })
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual({
            id: gameResult.game._id,
            name: 'Classic Quiz Debug',
            mode: GameMode.Classic,
            quiz: {
              id: quiz._id,
              canRateQuiz: true,
              canHostLiveGame: true,
            },
            host: {
              id: hostUser._id,
              nickname: 'ShadowWhirlwind',
            },
            numberOfPlayers: 10,
            numberOfQuestions: 4,
            playerMetrics: [
              {
                player: {
                  id: expect.any(String),
                  nickname: 'GuessMachine',
                },
                rank: 1,
                comebackRankGain: 3,
                correct: 4,
                incorrect: 0,
                unanswered: 0,
                averageResponseTime: 2924,
                longestCorrectStreak: 4,
                score: 3846,
              },
              {
                player: {
                  id: expect.any(String),
                  nickname: 'QuizWhiz',
                },
                rank: 2,
                comebackRankGain: 5,
                correct: 4,
                incorrect: 0,
                unanswered: 0,
                averageResponseTime: 3310,
                longestCorrectStreak: 4,
                score: 3721,
              },
              {
                player: {
                  id: expect.any(String),
                  nickname: 'BrainiacBert',
                },
                rank: 3,
                comebackRankGain: 0,
                correct: 3,
                incorrect: 1,
                unanswered: 0,
                averageResponseTime: 3582,
                longestCorrectStreak: 3,
                score: 3458,
              },
              {
                player: {
                  id: expect.any(String),
                  nickname: 'TriviaTitan',
                },
                rank: 4,
                comebackRankGain: 4,
                correct: 3,
                incorrect: 1,
                unanswered: 0,
                averageResponseTime: 4120,
                longestCorrectStreak: 2,
                score: 3264,
              },
              {
                player: {
                  id: expect.any(String),
                  nickname: 'SmartyPants',
                },
                rank: 5,
                comebackRankGain: 1,
                correct: 3,
                incorrect: 1,
                unanswered: 0,
                averageResponseTime: 4682,
                longestCorrectStreak: 2,
                score: 3097,
              },
              {
                player: {
                  id: playerUser._id,
                  nickname: playerUser.defaultNickname,
                },
                rank: 7,
                comebackRankGain: 2,
                correct: 2,
                incorrect: 1,
                unanswered: 1,
                averageResponseTime: 4853,
                longestCorrectStreak: 1,
                score: 2542,
              },
            ],
            questionMetrics: [
              {
                text: 'What is the capital of Sweden?',
                type: QuestionType.MultiChoice,
                correct: 1,
                incorrect: 0,
                unanswered: 0,
                averageResponseTime: 1284,
              },
              {
                text: 'Guess the temperature of the hottest day ever recorded.',
                type: QuestionType.Range,
                correct: 1,
                incorrect: 0,
                unanswered: 0,
                averageResponseTime: 3035,
              },
              {
                text: 'The earth is flat.',
                type: QuestionType.TrueFalse,
                correct: 1,
                incorrect: 0,
                unanswered: 0,
                averageResponseTime: 811,
              },
              {
                text: 'What is the capital of Denmark?',
                type: QuestionType.TypeAnswer,
                correct: 1,
                incorrect: 0,
                unanswered: 0,
                averageResponseTime: 6566,
              },
            ],
            duration: 36.035,
            created: gameResult.hosted.toISOString(),
          })
        })
    })

    it('should succeed in retrieving game results for a zero to one hundred mode game as a host participant', async () => {
      const { accessToken, user: hostUser } =
        await createDefaultUserAndAuthenticate(app)

      const quiz = await quizModel.create(
        createMockZeroToOneHundredQuiz({ owner: hostUser }),
      )

      const game = await gameModel.create({
        ...buildMockZeroToOneHundredModeGame(hostUser, playerUser),
        quiz,
      })

      const gameResult = await gameResultModel.create(
        buildMockZeroToOneHundredModeGameResult(game, hostUser, playerUser),
      )

      return supertest(app.getHttpServer())
        .get(`/api/games/${game._id}/results`)
        .set({ Authorization: `Bearer ${accessToken}` })
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual({
            id: gameResult.game._id,
            name: '0-100 Quiz Debug',
            mode: GameMode.ZeroToOneHundred,
            quiz: {
              id: quiz._id,
              canRateQuiz: false,
              canHostLiveGame: true,
            },
            host: {
              id: hostUser._id,
              nickname: 'FrostyBear',
            },
            numberOfPlayers: 10,
            numberOfQuestions: 4,
            playerMetrics: [
              {
                player: {
                  id: expect.any(String),
                  nickname: 'GuessLord',
                },
                rank: 1,
                comebackRankGain: 3,
                averagePrecision: 0.89,
                unanswered: 0,
                averageResponseTime: 2915,
                longestCorrectStreak: 2,
                score: 13,
              },
              {
                player: {
                  id: expect.any(String),
                  nickname: 'QuickThinker',
                },
                rank: 2,
                comebackRankGain: 5,
                averagePrecision: 0.87,
                unanswered: 0,
                averageResponseTime: 3082,
                longestCorrectStreak: 2,
                score: 15,
              },
              {
                player: {
                  id: expect.any(String),
                  nickname: 'SharpShooter',
                },
                rank: 3,
                comebackRankGain: 0,
                averagePrecision: 0.84,
                unanswered: 0,
                averageResponseTime: 3275,
                longestCorrectStreak: 2,
                score: 17,
              },
              {
                player: {
                  id: expect.any(String),
                  nickname: 'ThinkFast',
                },
                rank: 4,
                comebackRankGain: 4,
                averagePrecision: 0.82,
                unanswered: 0,
                averageResponseTime: 3492,
                longestCorrectStreak: 2,
                score: 18,
              },
              {
                player: {
                  id: expect.any(String),
                  nickname: 'PrecisionPete',
                },
                rank: 5,
                comebackRankGain: 1,
                averagePrecision: 0.79,
                unanswered: 1,
                averageResponseTime: 3768,
                longestCorrectStreak: 1,
                score: 19,
              },
            ],
            questionMetrics: [
              {
                text: '2002 levererades den första Koenigseggbilen av modell CC8S. Hur många tillverkades totalt?',
                type: QuestionType.Range,
                averagePrecision: 0.98,
                averageResponseTime: 2890,
                unanswered: 0,
              },
              {
                text: 'Hur många år blev Kubas förre president Fidel Castro?',
                type: QuestionType.Range,
                averagePrecision: 1,
                averageResponseTime: 3274,
                unanswered: 0,
              },
              {
                text: 'Vilka är de två första decimalerna i talet pi?',
                type: QuestionType.Range,
                averagePrecision: 1,
                averageResponseTime: 2426,
                unanswered: 0,
              },
              {
                text: 'Hur många klädda kort finns det i en kortlek?',
                type: QuestionType.Range,
                averagePrecision: 0.56,
                averageResponseTime: 3071,
                unanswered: 0,
              },
            ],
            duration: 57.077,
            created: gameResult.hosted.toISOString(),
          })
        })
    })

    it('should succeed in retrieving game results for a zero to one hundred mode game as a player participant', async () => {
      const { accessToken, user: playerUser } =
        await createDefaultUserAndAuthenticate(app)

      const hostUser = await userModel.create(buildMockTertiaryUser())

      const quiz = await quizModel.create(
        createMockZeroToOneHundredQuiz({ owner: hostUser }),
      )

      const game = await gameModel.create({
        ...buildMockZeroToOneHundredModeGame(hostUser, playerUser),
        quiz,
      })

      const gameResult = await gameResultModel.create(
        buildMockZeroToOneHundredModeGameResult(game, hostUser, playerUser),
      )

      return supertest(app.getHttpServer())
        .get(`/api/games/${game._id}/results`)
        .set({ Authorization: `Bearer ${accessToken}` })
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual({
            id: gameResult.game._id,
            name: '0-100 Quiz Debug',
            mode: GameMode.ZeroToOneHundred,
            quiz: {
              id: quiz._id,
              canRateQuiz: true,
              canHostLiveGame: true,
            },
            host: {
              id: hostUser._id,
              nickname: 'ShadowWhirlwind',
            },
            numberOfPlayers: 10,
            numberOfQuestions: 4,
            playerMetrics: [
              {
                player: {
                  id: expect.any(String),
                  nickname: 'GuessLord',
                },
                rank: 1,
                comebackRankGain: 3,
                averagePrecision: 0.89,
                unanswered: 0,
                averageResponseTime: 2915,
                longestCorrectStreak: 2,
                score: 13,
              },
              {
                player: {
                  id: expect.any(String),
                  nickname: 'QuickThinker',
                },
                rank: 2,
                comebackRankGain: 5,
                averagePrecision: 0.87,
                unanswered: 0,
                averageResponseTime: 3082,
                longestCorrectStreak: 2,
                score: 15,
              },
              {
                player: {
                  id: expect.any(String),
                  nickname: 'SharpShooter',
                },
                rank: 3,
                comebackRankGain: 0,
                averagePrecision: 0.84,
                unanswered: 0,
                averageResponseTime: 3275,
                longestCorrectStreak: 2,
                score: 17,
              },
              {
                player: {
                  id: expect.any(String),
                  nickname: 'ThinkFast',
                },
                rank: 4,
                comebackRankGain: 4,
                averagePrecision: 0.82,
                unanswered: 0,
                averageResponseTime: 3492,
                longestCorrectStreak: 2,
                score: 18,
              },
              {
                player: {
                  id: expect.any(String),
                  nickname: 'PrecisionPete',
                },
                rank: 5,
                comebackRankGain: 1,
                averagePrecision: 0.79,
                unanswered: 1,
                averageResponseTime: 3768,
                longestCorrectStreak: 1,
                score: 19,
              },
              {
                player: {
                  id: playerUser._id,
                  nickname: playerUser.defaultNickname,
                },
                rank: 7,
                comebackRankGain: 2,
                averagePrecision: 0.71,
                unanswered: 1,
                averageResponseTime: 4210,
                longestCorrectStreak: 1,
                score: 21,
              },
            ],
            questionMetrics: [
              {
                text: '2002 levererades den första Koenigseggbilen av modell CC8S. Hur många tillverkades totalt?',
                type: QuestionType.Range,
                averagePrecision: 0.98,
                averageResponseTime: 2890,
                unanswered: 0,
              },
              {
                text: 'Hur många år blev Kubas förre president Fidel Castro?',
                type: QuestionType.Range,
                averagePrecision: 1,
                averageResponseTime: 3274,
                unanswered: 0,
              },
              {
                text: 'Vilka är de två första decimalerna i talet pi?',
                type: QuestionType.Range,
                averagePrecision: 1,
                averageResponseTime: 2426,
                unanswered: 0,
              },
              {
                text: 'Hur många klädda kort finns det i en kortlek?',
                type: QuestionType.Range,
                averagePrecision: 0.56,
                averageResponseTime: 3071,
                unanswered: 0,
              },
            ],
            duration: 57.077,
            created: gameResult.hosted.toISOString(),
          })
        })
    })

    it('should succeed in retrieving game results including rating when participant has rated the quiz', async () => {
      const gameId = uuidv4()

      const { accessToken, user: playerUser } =
        await createDefaultUserAndAuthenticate(app)

      const hostUser = await userModel.create(buildMockTertiaryUser())

      const quiz = await quizModel.create(
        createMockClassicQuiz({ owner: hostUser }),
      )

      await quizRatingModel.create(
        buildMockQuizRating({
          quizId: quiz._id,
          author: playerUser,
          stars: 5,
          comment: 'Nice quiz',
          created: new Date(),
          updated: new Date(),
        }),
      )

      const game = await gameModel.create({
        ...buildMockClassicModeGame(hostUser, playerUser),
        _id: gameId,
        quiz,
      })

      await gameResultModel.create(
        buildMockClassicModeGameResult(game, hostUser, playerUser),
      )

      return supertest(app.getHttpServer())
        .get(`/api/games/${game._id}/results`)
        .set({ Authorization: `Bearer ${accessToken}` })
        .expect(200)
        .expect((res) => {
          expect(res.body.rating).toBeDefined()
          expect(res.body.rating).toEqual({
            stars: 5,
            comment: 'Nice quiz',
          })
        })
    })

    it('should succeed return N/A default nickname for host when user not found', async () => {
      const { accessToken, user: playerUser } =
        await createDefaultUserAndAuthenticate(app)

      const hostUser = { _id: uuidv4() } as User

      const quiz = await quizModel.create(
        createMockZeroToOneHundredQuiz({ owner: hostUser }),
      )

      const game = await gameModel.create({
        ...buildMockZeroToOneHundredModeGame(hostUser, playerUser),
        quiz,
      })

      await gameResultModel.create(
        buildMockZeroToOneHundredModeGameResult(game, hostUser, playerUser),
      )

      return supertest(app.getHttpServer())
        .get(`/api/games/${game._id}/results`)
        .set({ Authorization: `Bearer ${accessToken}` })
        .expect(200)
        .expect((res) => {
          expect(res.body.host.nickname).toEqual('N/A')
        })
    })

    it('should return a 404 error when a game result was not found', async () => {
      const { accessToken, user: hostUser } =
        await createDefaultUserAndAuthenticate(app)

      const game = await gameModel.create(
        buildMockClassicModeGame(hostUser, playerUser),
      )

      return supertest(app.getHttpServer())
        .get(`/api/games/${game._id}/results`)
        .set({ Authorization: `Bearer ${accessToken}` })
        .expect(404)
        .expect((res) => {
          expect(res.body).toEqual({
            message: `Game results not found by game id '${game._id}'`,
            status: 404,
            timestamp: expect.anything(),
          })
        })
    })

    it('should return a 404 error when a game was not found', async () => {
      const { accessToken } = await createDefaultUserAndAuthenticate(app)

      const gameID = uuidv4()

      return supertest(app.getHttpServer())
        .get(`/api/games/${gameID}/results`)
        .set({ Authorization: `Bearer ${accessToken}` })
        .expect(404)
        .expect((res) => {
          expect(res.body).toEqual({
            message: `Game not found by id '${gameID}'`,
            status: 404,
            timestamp: expect.anything(),
          })
        })
    })

    it('should return a 403 forbidden error when player is not a participant of an existing game', async () => {
      const anotherHostUser = await userModel.create(buildMockTertiaryUser())

      const { accessToken } = await createDefaultUserAndAuthenticate(app)

      const game = await gameModel.create(
        buildMockClassicModeGame(anotherHostUser, playerUser),
      )

      await gameResultModel.create(
        buildMockClassicModeGameResult(game, anotherHostUser, playerUser),
      )

      return supertest(app.getHttpServer())
        .get(`/api/games/${game._id}/results`)
        .set({ Authorization: `Bearer ${accessToken}` })
        .expect(403)
        .expect((res) => {
          expect(res.body).toEqual({
            message: 'Forbidden',
            status: 403,
            timestamp: expect.anything(),
          })
        })
    })

    it('should return a 401 error when the request is unauthorized', () => {
      const gameID = uuidv4()

      return supertest(app.getHttpServer())
        .get(`/api/games/${gameID}/results`)
        .expect(401)
        .expect((res) => {
          expect(res.body).toEqual({
            message: 'Missing Authorization header',
            status: 401,
            timestamp: expect.anything(),
          })
        })
    })
  })
})

function buildMockClassicModeGame(hostUser: User, playerUser: User): Game {
  const date = new Date(Date.now() - 60 * 60 * 24 * 1000) // 1 day ago
  const offset = (seconds: number) => new Date(date.getTime() + seconds * 1000)

  return {
    _id: uuidv4(),
    quiz: { _id: uuidv4() } as Quiz,
    status: GameStatus.Completed,
    name: 'Classic Quiz Debug',
    mode: GameMode.Classic,
    nextQuestion: 4,
    pin: '520612',
    settings: {
      shouldAutoCompleteQuestionResultTask: false,
      shouldAutoCompleteLeaderboardTask: false,
      shouldAutoCompletePodiumTask: false,
      randomizeQuestionOrder: false,
      randomizeAnswerOrder: false,
    },
    participants: [
      {
        type: GameParticipantType.HOST,
        participantId: hostUser._id,
        created: offset(0),
        updated: offset(0),
      },
      {
        type: GameParticipantType.PLAYER,
        participantId: playerUser._id,
        nickname: playerUser.defaultNickname,
        created: offset(10.921),
        updated: offset(10.921),
        rank: 1,
        worstRank: 0,
        totalScore: 3846,
        currentStreak: 4,
        totalResponseTime: 0,
        responseCount: 1,
      },
    ],
    currentTask: {
      _id: uuidv4(),
      type: TaskType.Podium,
      status: 'completed',
      currentTransitionInitiated: offset(56.514),
      created: offset(53.346),
      leaderboard: [
        {
          playerId: playerUser._id,
          position: 1,
          nickname: 'EchoRaptor',
          score: 3846,
          streaks: 4,
        },
      ],
    },
    previousTasks: [
      {
        _id: uuidv4(),
        type: TaskType.Lobby,
        status: 'completed',
        currentTransitionInitiated: offset(14.249),
        currentTransitionExpires: offset(17.249),
        created: offset(0),
      },
      {
        _id: uuidv4(),
        type: TaskType.Question,
        status: 'completed',
        currentTransitionInitiated: offset(21.785),
        created: offset(17.311),
        questionIndex: 0,
        metadata: { type: QuestionType.MultiChoice },
        answers: [
          {
            type: QuestionType.MultiChoice,
            playerId: playerUser._id,
            created: offset(21.753),
            answer: 0,
          },
        ],
        presented: offset(20.469),
      },
      {
        _id: uuidv4(),
        type: TaskType.QuestionResult,
        status: 'completed',
        currentTransitionInitiated: offset(23.648),
        created: offset(21.797),
        questionIndex: 0,
        correctAnswers: [{ type: QuestionType.MultiChoice, index: 0 }],
        results: [
          {
            type: QuestionType.MultiChoice,
            playerId: playerUser._id,
            nickname: playerUser.defaultNickname,
            answer: {
              type: QuestionType.MultiChoice,
              playerId: playerUser._id,
              created: offset(21.753),
              answer: 0,
            },
            correct: true,
            lastScore: 979,
            totalScore: 979,
            position: 1,
            streak: 1,
            lastResponseTime: 0,
            totalResponseTime: 0,
            responseCount: 1,
          },
        ],
      },
      {
        _id: uuidv4(),
        type: TaskType.Leaderboard,
        status: 'completed',
        currentTransitionInitiated: offset(24.526),
        created: offset(23.659),
        questionIndex: 0,
        leaderboard: [
          {
            playerId: playerUser._id,
            position: 1,
            nickname: 'EchoRaptor',
            score: 979,
            streaks: 1,
          },
        ],
      },
      {
        _id: uuidv4(),
        type: TaskType.Question,
        status: 'completed',
        currentTransitionInitiated: offset(33.223),
        created: offset(24.67),
        questionIndex: 1,
        metadata: { type: QuestionType.Range },
        answers: [
          {
            type: QuestionType.Range,
            playerId: playerUser._id,
            created: offset(33.19),
            answer: 50,
          },
        ],
        presented: offset(30.155),
      },
      {
        _id: uuidv4(),
        type: TaskType.QuestionResult,
        status: 'completed',
        currentTransitionInitiated: offset(35.531),
        created: offset(33.236),
        questionIndex: 1,
        correctAnswers: [{ type: QuestionType.Range, value: 50 }],
        results: [
          {
            type: QuestionType.Range,
            playerId: playerUser._id,
            nickname: playerUser.defaultNickname,
            answer: {
              type: QuestionType.Range,
              playerId: playerUser._id,
              created: offset(33.19),
              answer: 50,
            },
            correct: true,
            lastScore: 990,
            totalScore: 1969,
            position: 1,
            streak: 2,
            lastResponseTime: 0,
            totalResponseTime: 0,
            responseCount: 1,
          },
        ],
      },
      {
        _id: uuidv4(),
        type: TaskType.Leaderboard,
        status: 'completed',
        currentTransitionInitiated: offset(36.614),
        created: offset(35.542),
        questionIndex: 1,
        leaderboard: [
          {
            playerId: playerUser._id,
            position: 1,
            nickname: 'EchoRaptor',
            score: 1969,
            streaks: 2,
          },
        ],
      },
      {
        _id: uuidv4(),
        type: TaskType.Question,
        status: 'completed',
        currentTransitionInitiated: offset(39.433),
        created: offset(36.626),
        questionIndex: 2,
        metadata: { type: QuestionType.TrueFalse },
        answers: [
          {
            type: QuestionType.TrueFalse,
            playerId: playerUser._id,
            created: offset(39.408),
            answer: false,
          },
        ],
        presented: offset(38.597),
      },
      {
        _id: uuidv4(),
        type: TaskType.QuestionResult,
        status: 'completed',
        currentTransitionInitiated: offset(41.115),
        created: offset(39.451),
        questionIndex: 2,
        correctAnswers: [{ type: QuestionType.TrueFalse, value: false }],
        results: [
          {
            type: QuestionType.TrueFalse,
            playerId: playerUser._id,
            nickname: playerUser.defaultNickname,
            answer: {
              type: QuestionType.TrueFalse,
              playerId: playerUser._id,
              created: offset(39.408),
              answer: false,
            },
            correct: true,
            lastScore: 986,
            totalScore: 2955,
            position: 1,
            streak: 3,
            lastResponseTime: 0,
            totalResponseTime: 0,
            responseCount: 1,
          },
        ],
      },
      {
        _id: uuidv4(),
        type: TaskType.Leaderboard,
        status: 'completed',
        currentTransitionInitiated: offset(42.242),
        created: offset(41.127),
        questionIndex: 2,
        leaderboard: [
          {
            playerId: playerUser._id,
            position: 1,
            nickname: 'EchoRaptor',
            score: 2955,
            streaks: 3,
          },
        ],
      },
      {
        _id: uuidv4(),
        type: TaskType.Question,
        status: 'completed',
        currentTransitionInitiated: offset(52.119),
        created: offset(42.254),
        questionIndex: 3,
        metadata: { type: QuestionType.TypeAnswer },
        answers: [
          {
            type: QuestionType.TypeAnswer,
            playerId: playerUser._id,
            created: offset(52.074),
            answer: 'copenhagen',
          },
        ],
        presented: offset(45.508),
      },
      {
        _id: uuidv4(),
        type: TaskType.QuestionResult,
        status: 'completed',
        currentTransitionInitiated: offset(53.334),
        created: offset(52.133),
        questionIndex: 3,
        correctAnswers: [
          { type: QuestionType.TypeAnswer, value: 'Copenhagen' },
          { type: QuestionType.TypeAnswer, value: 'Köpenhamn' },
        ],
        results: [
          {
            type: QuestionType.TypeAnswer,
            playerId: playerUser._id,
            nickname: playerUser.defaultNickname,
            answer: {
              type: QuestionType.TypeAnswer,
              playerId: playerUser._id,
              created: offset(52.074),
              answer: 'copenhagen',
            },
            correct: true,
            lastScore: 891,
            totalScore: 3846,
            position: 1,
            streak: 4,
            lastResponseTime: 0,
            totalResponseTime: 0,
            responseCount: 1,
          },
        ],
      },
    ],
    questions: [
      {
        type: QuestionType.MultiChoice,
        text: 'What is the capital of Sweden?',
        media: {
          type: MediaType.Image,
          url: 'https://d3hne3c382ip58.cloudfront.net/files/uploads/bookmundi/resized/cmsfeatured/stockholm-old-town-gamla-stan-1680860369-785X440.jpg',
        },
        points: 1000,
        duration: 30,
        options: [
          {
            value: 'Stockholm',
            correct: true,
          },
          {
            value: 'Paris',
            correct: false,
          },
          {
            value: 'London',
            correct: false,
          },
          {
            value: 'Berlin',
            correct: false,
          },
        ],
      },
      {
        type: QuestionType.Range,
        text: 'Guess the temperature of the hottest day ever recorded.',
        media: {
          type: MediaType.Image,
          url: 'https://nineplanets.org/wp-content/uploads/2019/09/Color-Temperature.jpg',
        },
        points: 1000,
        duration: 30,
        min: 0,
        max: 100,
        step: 2,
        margin: QuestionRangeAnswerMargin.Medium,
        correct: 50,
      },
      {
        type: QuestionType.TrueFalse,
        text: 'The earth is flat.',
        media: {
          type: MediaType.Image,
          url: 'https://cdn.sciencesensei.com/wp-content/uploads/2019/07/flat-earth-cover.jpg',
        },
        points: 1000,
        duration: 30,
        correct: false,
      },
      {
        type: QuestionType.TypeAnswer,
        text: 'What is the capital of Denmark?',
        media: {
          type: MediaType.Image,
          url: 'http://fayyaztravels.com/uploads/images/place/Copenhagen.jpg',
        },
        points: 1000,
        duration: 30,
        options: ['Copenhagen', 'Köpenhamn'],
      },
    ],
    updated: offset(56.52),
    created: offset(0),
  }
}

function buildMockZeroToOneHundredModeGame(
  hostUser: User,
  playerUser: User,
): Game {
  const date = new Date(Date.now() - 60 * 60 * 24 * 1000) // 1 day ago
  const offset = (seconds: number) => new Date(date.getTime() + seconds * 1000)

  return {
    _id: uuidv4(),
    quiz: { _id: uuidv4() } as Quiz,
    status: GameStatus.Completed,
    mode: GameMode.ZeroToOneHundred,
    name: '0-100 Quiz Debug',
    nextQuestion: 4,
    pin: '520612',
    settings: {
      shouldAutoCompleteQuestionResultTask: false,
      shouldAutoCompleteLeaderboardTask: false,
      shouldAutoCompletePodiumTask: false,
      randomizeQuestionOrder: false,
      randomizeAnswerOrder: false,
    },
    participants: [
      {
        type: GameParticipantType.HOST,
        participantId: hostUser._id,
        created: offset(0),
        updated: offset(0),
      },
      {
        type: GameParticipantType.PLAYER,
        participantId: playerUser._id,
        nickname: playerUser.defaultNickname,
        created: offset(10.463),
        updated: offset(10.463),
        rank: 1,
        worstRank: 0,
        totalScore: 26,
        currentStreak: 0,
        totalResponseTime: 0,
        responseCount: 1,
      },
    ],
    currentTask: {
      _id: uuidv4(),
      type: TaskType.Podium,
      status: 'completed',
      currentTransitionInitiated: offset(98.774),
      created: offset(72.289),
      leaderboard: [
        {
          playerId: playerUser._id,
          position: 1,
          nickname: 'ElectricJackal',
          score: 26,
          streaks: 0,
        },
      ],
    },
    previousTasks: [
      {
        _id: uuidv4(),
        type: TaskType.Lobby,
        status: 'completed',
        currentTransitionInitiated: offset(12.137),
        currentTransitionExpires: offset(15.137),
        created: offset(0.001),
      },
      {
        _id: uuidv4(),
        type: TaskType.Question,
        status: 'completed',
        currentTransitionInitiated: offset(27.296),
        created: offset(15.212),
        questionIndex: 0,
        metadata: { type: QuestionType.Range },
        answers: [
          {
            type: QuestionType.Range,
            playerId: playerUser._id,
            created: offset(27.267),
            answer: 8,
          },
        ],
        presented: offset(24.377),
      },
      {
        _id: uuidv4(),
        type: TaskType.QuestionResult,
        status: 'completed',
        currentTransitionInitiated: offset(30.141),
        created: offset(27.308),
        questionIndex: 0,
        correctAnswers: [{ type: QuestionType.Range, value: 6 }],
        results: [
          {
            type: QuestionType.Range,
            playerId: playerUser._id,
            nickname: playerUser.defaultNickname,
            answer: {
              type: QuestionType.Range,
              playerId: playerUser._id,
              created: offset(27.267),
              answer: 8,
            },
            correct: false,
            lastScore: 2,
            totalScore: 2,
            position: 1,
            streak: 0,
            lastResponseTime: 0,
            totalResponseTime: 0,
            responseCount: 1,
          },
        ],
      },
      {
        _id: uuidv4(),
        type: TaskType.Leaderboard,
        status: 'completed',
        currentTransitionInitiated: offset(31.564),
        created: offset(30.151),
        questionIndex: 0,
        leaderboard: [
          {
            playerId: playerUser._id,
            position: 1,
            nickname: 'ElectricJackal',
            score: 2,
            streaks: 0,
          },
        ],
      },
      {
        _id: uuidv4(),
        type: TaskType.Question,
        status: 'completed',
        currentTransitionInitiated: offset(40.298),
        created: offset(31.574),
        questionIndex: 1,
        metadata: { type: QuestionType.Range },
        answers: [
          {
            type: QuestionType.Range,
            playerId: playerUser._id,
            created: offset(40.256),
            answer: 90,
          },
        ],
        presented: offset(37.982),
      },
      {
        _id: uuidv4(),
        type: TaskType.QuestionResult,
        status: 'completed',
        currentTransitionInitiated: offset(42.38),
        created: offset(40.318),
        questionIndex: 1,
        correctAnswers: [{ type: QuestionType.Range, value: 90 }],
        results: [
          {
            type: QuestionType.Range,
            playerId: playerUser._id,
            nickname: playerUser.defaultNickname,
            answer: {
              type: QuestionType.Range,
              playerId: playerUser._id,
              created: offset(40.256),
              answer: 90,
            },
            correct: true,
            lastScore: -10,
            totalScore: -8,
            position: 1,
            streak: 1,
            lastResponseTime: 0,
            totalResponseTime: 0,
            responseCount: 1,
          },
        ],
      },
      {
        _id: uuidv4(),
        type: TaskType.Leaderboard,
        status: 'completed',
        currentTransitionInitiated: offset(44.11),
        created: offset(42.391),
        questionIndex: 1,
        leaderboard: [
          {
            playerId: playerUser._id,
            position: 1,
            nickname: 'ElectricJackal',
            score: -8,
            streaks: 1,
          },
        ],
      },
      {
        _id: uuidv4(),
        type: TaskType.Question,
        status: 'completed',
        currentTransitionInitiated: offset(51.257),
        created: offset(44.124),
        questionIndex: 2,
        metadata: { type: QuestionType.Range },
        answers: [
          {
            type: QuestionType.Range,
            playerId: playerUser._id,
            created: offset(51.223),
            answer: 14,
          },
        ],
        presented: offset(48.797),
      },
      {
        _id: uuidv4(),
        type: TaskType.QuestionResult,
        status: 'completed',
        currentTransitionInitiated: offset(52.797),
        created: offset(51.276),
        questionIndex: 2,
        correctAnswers: [{ type: QuestionType.Range, value: 14 }],
        results: [
          {
            type: QuestionType.Range,
            playerId: playerUser._id,
            nickname: playerUser.defaultNickname,
            answer: {
              type: QuestionType.Range,
              playerId: playerUser._id,
              created: offset(51.223),
              answer: 14,
            },
            correct: true,
            lastScore: -10,
            totalScore: -18,
            position: 1,
            streak: 2,
            lastResponseTime: 0,
            totalResponseTime: 0,
            responseCount: 1,
          },
        ],
      },
      {
        _id: uuidv4(),
        type: TaskType.Leaderboard,
        status: 'completed',
        currentTransitionInitiated: offset(55.34),
        created: offset(52.808),
        questionIndex: 2,
        leaderboard: [
          {
            playerId: playerUser._id,
            position: 1,
            nickname: 'ElectricJackal',
            score: -18,
            streaks: 2,
          },
        ],
      },
      {
        _id: uuidv4(),
        type: TaskType.Question,
        status: 'completed',
        currentTransitionInitiated: offset(63.098),
        created: offset(55.353),
        questionIndex: 3,
        metadata: { type: QuestionType.Range },
        answers: [
          {
            type: QuestionType.Range,
            playerId: playerUser._id,
            created: offset(63.043),
            answer: 56,
          },
        ],
        presented: offset(59.972),
      },
      {
        _id: uuidv4(),
        type: TaskType.QuestionResult,
        status: 'completed',
        currentTransitionInitiated: offset(72.279),
        created: offset(63.112),
        questionIndex: 3,
        correctAnswers: [{ type: QuestionType.Range, value: 12 }],
        results: [
          {
            type: QuestionType.Range,
            playerId: playerUser._id,
            nickname: playerUser.defaultNickname,
            answer: {
              type: QuestionType.Range,
              playerId: playerUser._id,
              created: offset(63.043),
              answer: 56,
            },
            correct: false,
            lastScore: 44,
            totalScore: 26,
            position: 1,
            streak: 0,
            lastResponseTime: 0,
            totalResponseTime: 0,
            responseCount: 1,
          },
        ],
      },
    ],
    questions: [
      {
        type: QuestionType.Range,
        text: '2002 levererades den första Koenigseggbilen av modell CC8S. Hur många tillverkades totalt?',
        media: {
          type: MediaType.Image,
          url: 'https://s1.cdn.autoevolution.com/images/gallery/KOENIGSEGG-CC8S-4049_7.jpg',
        },
        points: 0,
        duration: 60,
        min: 0,
        max: 100,
        step: 1,
        margin: QuestionRangeAnswerMargin.None,
        correct: 6,
      },
      {
        type: QuestionType.Range,
        text: 'Hur många år blev Kubas förre president Fidel Castro?',
        media: {
          type: MediaType.Image,
          url: 'http://www.turizmtatilseyahat.com/en/wp-content/uploads/2014/08/fidel-castro-kuba.jpg',
        },
        points: 0,
        duration: 60,
        min: 0,
        max: 100,
        step: 1,
        margin: QuestionRangeAnswerMargin.None,
        correct: 90,
      },
      {
        type: QuestionType.Range,
        text: 'Vilka är de två första decimalerna i talet pi?',
        media: {
          type: MediaType.Image,
          url: 'https://www.nationalgeographic.com.es/medio/2023/02/23/numero-pi_902def82_230223124056_1200x630.jpg',
        },
        points: 0,
        duration: 60,
        min: 0,
        max: 100,
        step: 1,
        margin: QuestionRangeAnswerMargin.None,
        correct: 14,
      },
      {
        type: QuestionType.Range,
        text: 'Hur många klädda kort finns det i en kortlek?',
        media: {
          type: MediaType.Image,
          url: 'https://hallmiba.com/thumb/2826/1024x0/d2b999d1709edbedeb911ad28ec8e6ab.jpg',
        },
        points: 0,
        duration: 60,
        min: 0,
        max: 100,
        step: 1,
        margin: QuestionRangeAnswerMargin.None,
        correct: 12,
      },
    ],
    created: offset(0),
    updated: offset(98.788),
  }
}

function buildMockClassicModeGameResult(
  game: Game,
  hostUser: User,
  playerUser: User,
): GameResult {
  return {
    _id: uuidv4(),
    game,
    name: game.name,
    hostParticipantId: hostUser._id,
    players: [
      {
        participantId: uuidv4(),
        nickname: 'GuessMachine',
        rank: 1,
        comebackRankGain: 3,
        correct: 4,
        incorrect: 0,
        unanswered: 0,
        averageResponseTime: 2924,
        longestCorrectStreak: 4,
        score: 3846,
      },
      {
        participantId: uuidv4(),
        nickname: 'QuizWhiz',
        rank: 2,
        comebackRankGain: 5,
        correct: 4,
        incorrect: 0,
        unanswered: 0,
        averageResponseTime: 3310,
        longestCorrectStreak: 4,
        score: 3721,
      },
      {
        participantId: uuidv4(),
        nickname: 'BrainiacBert',
        rank: 3,
        comebackRankGain: 0,
        correct: 3,
        incorrect: 1,
        unanswered: 0,
        averageResponseTime: 3582,
        longestCorrectStreak: 3,
        score: 3458,
      },
      {
        participantId: uuidv4(),
        nickname: 'TriviaTitan',
        rank: 4,
        comebackRankGain: 4,
        correct: 3,
        incorrect: 1,
        unanswered: 0,
        averageResponseTime: 4120,
        longestCorrectStreak: 2,
        score: 3264,
      },
      {
        participantId: uuidv4(),
        nickname: 'SmartyPants',
        rank: 5,
        comebackRankGain: 1,
        correct: 3,
        incorrect: 1,
        unanswered: 0,
        averageResponseTime: 4682,
        longestCorrectStreak: 2,
        score: 3097,
      },
      {
        participantId: uuidv4(),
        nickname: 'MindMarauder',
        rank: 6,
        comebackRankGain: 0,
        correct: 2,
        incorrect: 2,
        unanswered: 0,
        averageResponseTime: 4215,
        longestCorrectStreak: 2,
        score: 2776,
      },
      {
        participantId: playerUser._id,
        nickname: playerUser.defaultNickname,
        rank: 7,
        comebackRankGain: 2,
        correct: 2,
        incorrect: 1,
        unanswered: 1,
        averageResponseTime: 4853,
        longestCorrectStreak: 1,
        score: 2542,
      },
      {
        participantId: uuidv4(),
        nickname: 'QuizzyMcQuizface',
        rank: 8,
        comebackRankGain: 0,
        correct: 1,
        incorrect: 2,
        unanswered: 1,
        averageResponseTime: 5128,
        longestCorrectStreak: 1,
        score: 1927,
      },
      {
        participantId: uuidv4(),
        nickname: 'AlmostRight',
        rank: 9,
        comebackRankGain: 1,
        correct: 1,
        incorrect: 3,
        unanswered: 0,
        averageResponseTime: 5834,
        longestCorrectStreak: 1,
        score: 1684,
      },
      {
        participantId: uuidv4(),
        nickname: 'IDontKnow',
        rank: 10,
        comebackRankGain: 0,
        correct: 0,
        incorrect: 2,
        unanswered: 2,
        averageResponseTime: 0,
        longestCorrectStreak: 0,
        score: 975,
      },
    ],
    questions: [
      {
        text: 'What is the capital of Sweden?',
        type: QuestionType.MultiChoice,
        correct: 1,
        incorrect: 0,
        unanswered: 0,
        averageResponseTime: 1284,
      },
      {
        text: 'Guess the temperature of the hottest day ever recorded.',
        type: QuestionType.Range,
        correct: 1,
        incorrect: 0,
        unanswered: 0,
        averageResponseTime: 3035,
      },
      {
        text: 'The earth is flat.',
        type: QuestionType.TrueFalse,
        correct: 1,
        incorrect: 0,
        unanswered: 0,
        averageResponseTime: 811,
      },
      {
        text: 'What is the capital of Denmark?',
        type: QuestionType.TypeAnswer,
        correct: 1,
        incorrect: 0,
        unanswered: 0,
        averageResponseTime: 6566,
      },
    ],
    hosted: game.previousTasks[1].created,
    completed: game.currentTask.created,
  }
}

function buildMockZeroToOneHundredModeGameResult(
  game: Game,
  hostUser: User,
  playerUser: User,
): GameResult {
  return {
    _id: uuidv4(),
    game,
    hostParticipantId: hostUser._id,
    name: game.name,
    players: [
      {
        participantId: uuidv4(),
        nickname: 'GuessLord',
        rank: 1,
        comebackRankGain: 3,
        averagePrecision: 0.89,
        unanswered: 0,
        averageResponseTime: 2915,
        longestCorrectStreak: 2,
        score: 13,
      },
      {
        participantId: uuidv4(),
        nickname: 'QuickThinker',
        rank: 2,
        comebackRankGain: 5,
        averagePrecision: 0.87,
        unanswered: 0,
        averageResponseTime: 3082,
        longestCorrectStreak: 2,
        score: 15,
      },
      {
        participantId: uuidv4(),
        nickname: 'SharpShooter',
        rank: 3,
        comebackRankGain: 0,
        averagePrecision: 0.84,
        unanswered: 0,
        averageResponseTime: 3275,
        longestCorrectStreak: 2,
        score: 17,
      },
      {
        participantId: uuidv4(),
        nickname: 'ThinkFast',
        rank: 4,
        comebackRankGain: 4,
        averagePrecision: 0.82,
        unanswered: 0,
        averageResponseTime: 3492,
        longestCorrectStreak: 2,
        score: 18,
      },
      {
        participantId: uuidv4(),
        nickname: 'PrecisionPete',
        rank: 5,
        comebackRankGain: 1,
        averagePrecision: 0.79,
        unanswered: 1,
        averageResponseTime: 3768,
        longestCorrectStreak: 1,
        score: 19,
      },
      {
        participantId: uuidv4(),
        nickname: 'BrainStormer',
        rank: 6,
        comebackRankGain: 0,
        averagePrecision: 0.75,
        unanswered: 0,
        averageResponseTime: 3984,
        longestCorrectStreak: 1,
        score: 20,
      },
      {
        participantId: playerUser._id,
        nickname: playerUser.defaultNickname,
        rank: 7,
        comebackRankGain: 2,
        averagePrecision: 0.71,
        unanswered: 1,
        averageResponseTime: 4210,
        longestCorrectStreak: 1,
        score: 21,
      },
      {
        participantId: uuidv4(),
        nickname: 'QuizRanger',
        rank: 8,
        comebackRankGain: 0,
        averagePrecision: 0.68,
        unanswered: 1,
        averageResponseTime: 4438,
        longestCorrectStreak: 1,
        score: 23,
      },
      {
        participantId: uuidv4(),
        nickname: 'CloseCall',
        rank: 9,
        comebackRankGain: 1,
        averagePrecision: 0.63,
        unanswered: 2,
        averageResponseTime: 4721,
        longestCorrectStreak: 1,
        score: 25,
      },
      {
        participantId: uuidv4(),
        nickname: 'IDontKnow',
        rank: 10,
        comebackRankGain: 0,
        averagePrecision: 0.58,
        unanswered: 3,
        averageResponseTime: 4985,
        longestCorrectStreak: 0,
        score: 26,
      },
    ],
    questions: [
      {
        text: '2002 levererades den första Koenigseggbilen av modell CC8S. Hur många tillverkades totalt?',
        type: QuestionType.Range,
        averagePrecision: 0.98,
        averageResponseTime: 2890,
        unanswered: 0,
      },
      {
        text: 'Hur många år blev Kubas förre president Fidel Castro?',
        type: QuestionType.Range,
        averagePrecision: 1,
        averageResponseTime: 3274,
        unanswered: 0,
      },
      {
        text: 'Vilka är de två första decimalerna i talet pi?',
        type: QuestionType.Range,
        averagePrecision: 1,
        averageResponseTime: 2426,
        unanswered: 0,
      },
      {
        text: 'Hur många klädda kort finns det i en kortlek?',
        type: QuestionType.Range,
        averagePrecision: 0.56,
        averageResponseTime: 3071,
        unanswered: 0,
      },
    ],
    hosted: game.previousTasks[1].created,
    completed: game.currentTask.created,
  }
}
