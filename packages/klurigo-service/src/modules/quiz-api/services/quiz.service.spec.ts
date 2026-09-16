import {
  GameMode,
  LanguageCode,
  QuestionMultiChoiceDto,
  QuestionPinDto,
  QuestionPuzzleDto,
  QuestionRangeAnswerMargin,
  QuestionRangeDto,
  QuestionTrueFalseDto,
  QuestionType,
  QuestionTypeAnswerDto,
  QuizCategory,
  QuizVisibility,
} from '@klurigo/common'
import { Logger } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'

import {
  buildMockPrimaryUser,
  createMockClassicQuiz,
  createMockClassicQuizRequestDto,
  createMockMultiChoiceQuestionDocument,
  createMockPinQuestionDocument,
  createMockPuzzleQuestionDocument,
  createMockRangeQuestionDocument,
  createMockTrueFalseQuestionDocument,
  createMockTypeAnswerQuestionDocument,
  createMockZeroToOneHundredQuiz,
  createMockZeroToOneHundredQuizRequestDto,
} from '../../../../test-utils/data'
import { QuizNotFoundException } from '../../quiz-core/exceptions'
import { QuizRepository } from '../../quiz-core/repositories'
import {
  QuestionDao,
  QuestionRangeWithBase,
  Quiz,
} from '../../quiz-core/repositories/models/schemas'

import { QuizService } from './quiz.service'

describe(QuizService.name, () => {
  const fixedNow = new Date('2026-01-10T12:00:00.000Z')

  let service: QuizService
  let quizRepository: {
    createQuiz: jest.Mock
    findQuizByIdOrThrow: jest.Mock
    countQuizzes: jest.Mock
    findQuizzes: jest.Mock
    updateQuiz: jest.Mock
    deleteQuiz: jest.Mock
  }
  let eventEmitter: { emit: jest.Mock }
  let logger: { log: jest.Mock }

  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(fixedNow)

    quizRepository = {
      createQuiz: jest.fn(),
      findQuizByIdOrThrow: jest.fn(),
      countQuizzes: jest.fn(),
      findQuizzes: jest.fn(),
      updateQuiz: jest.fn(),
      deleteQuiz: jest.fn(),
    }
    eventEmitter = { emit: jest.fn() }
    logger = { log: jest.fn() }

    service = new QuizService(
      quizRepository as unknown as QuizRepository,
      eventEmitter as unknown as EventEmitter2,
      logger as unknown as Logger,
    )
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  const toQuizResponse = (quiz: Quiz) => ({
    id: quiz._id,
    title: quiz.title,
    description: quiz.description,
    mode: quiz.mode,
    visibility: quiz.visibility,
    category: quiz.category,
    imageCoverURL: quiz.imageCoverURL,
    languageCode: quiz.languageCode,
    numberOfQuestions: quiz.questions.length,
    author: {
      id: quiz.owner._id,
      name: quiz.owner.defaultNickname,
    },
    gameplaySummary: {
      count: quiz.gameplaySummary.count,
      totalPlayerCount: quiz.gameplaySummary.totalPlayerCount,
      lastPlayed: quiz.gameplaySummary.lastPlayedAt,
      difficultyPercentage: undefined,
    },
    ratingSummary: {
      stars: quiz.ratingSummary.avg,
      comments: quiz.ratingSummary.commentCount,
      total: quiz.ratingSummary.count,
    },
    created: quiz.created,
    updated: quiz.updated,
  })

  describe('createQuiz', () => {
    it('maps every classic question type before creating the quiz', async () => {
      const request = createMockClassicQuizRequestDto()
      const user = buildMockPrimaryUser({ _id: 'creator-1' })
      const createdQuiz = createMockClassicQuiz({
        _id: 'created-classic-quiz',
        owner: user,
        created: fixedNow,
        updated: fixedNow,
      })
      quizRepository.createQuiz.mockResolvedValue(createdQuiz)
      const [multiChoice, range, trueFalse, typeAnswer, pin, puzzle] =
        request.questions as [
          QuestionMultiChoiceDto,
          QuestionRangeDto,
          QuestionTrueFalseDto,
          QuestionTypeAnswerDto,
          QuestionPinDto,
          QuestionPuzzleDto,
        ]

      const result = await service.createQuiz(request, user)

      const [document] = quizRepository.createQuiz.mock.calls[0] as [Quiz]
      expect(document).toMatchObject({
        _id: expect.any(String),
        title: request.title,
        description: request.description,
        mode: GameMode.Classic,
        visibility: request.visibility,
        category: request.category,
        imageCoverURL: request.imageCoverURL,
        languageCode: request.languageCode,
        owner: user,
        gameplaySummary: {
          count: 0,
          totalPlayerCount: 0,
          totalClassicCorrectCount: 0,
          totalClassicIncorrectCount: 0,
          totalClassicUnansweredCount: 0,
          totalZeroToOneHundredPrecisionSum: 0,
          totalZeroToOneHundredAnsweredCount: 0,
          totalZeroToOneHundredUnansweredCount: 0,
          updated: fixedNow,
        },
        ratingSummary: {
          count: 0,
          avg: 0,
          stars: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 },
          commentCount: 0,
        },
        created: fixedNow,
        updated: fixedNow,
      })
      expect(document.questions).toEqual([
        {
          type: QuestionType.MultiChoice,
          text: multiChoice.question,
          media: multiChoice.media,
          options: multiChoice.options,
          points: multiChoice.points,
          duration: multiChoice.duration,
          info: multiChoice.info,
        },
        {
          type: QuestionType.Range,
          text: range.question,
          media: range.media,
          min: range.min,
          max: range.max,
          step: 2,
          correct: range.correct,
          margin: range.margin,
          points: range.points,
          duration: range.duration,
          info: range.info,
        },
        {
          type: QuestionType.TrueFalse,
          text: trueFalse.question,
          media: trueFalse.media,
          correct: trueFalse.correct,
          points: trueFalse.points,
          duration: trueFalse.duration,
          info: trueFalse.info,
        },
        {
          type: QuestionType.TypeAnswer,
          text: typeAnswer.question,
          media: typeAnswer.media,
          options: typeAnswer.options,
          points: typeAnswer.points,
          duration: typeAnswer.duration,
          info: typeAnswer.info,
        },
        {
          type: QuestionType.Pin,
          text: pin.question,
          media: undefined,
          imageURL: pin.imageURL,
          positionX: pin.positionX,
          positionY: pin.positionY,
          tolerance: pin.tolerance,
          points: pin.points,
          duration: pin.duration,
          info: pin.info,
        },
        {
          type: QuestionType.Puzzle,
          text: puzzle.question,
          media: puzzle.media,
          values: puzzle.values,
          points: puzzle.points,
          duration: puzzle.duration,
          info: puzzle.info,
        },
      ])
      expect(result).toEqual(toQuizResponse(createdQuiz))
    })

    it('maps zero-to-one-hundred questions to fixed range documents', async () => {
      const request = createMockZeroToOneHundredQuizRequestDto()
      const user = buildMockPrimaryUser()
      const createdQuiz = createMockZeroToOneHundredQuiz({
        _id: 'created-zero-quiz',
        owner: user,
        created: fixedNow,
        updated: fixedNow,
      })
      quizRepository.createQuiz.mockResolvedValue(createdQuiz)

      await service.createQuiz(request, user)

      const [document] = quizRepository.createQuiz.mock.calls[0] as [Quiz]
      expect(document.questions).toEqual([
        {
          type: QuestionType.Range,
          text: request.questions[0].question,
          media: request.questions[0].media,
          min: 0,
          max: 100,
          step: 1,
          correct: request.questions[0].correct,
          margin: QuestionRangeAnswerMargin.None,
          points: 0,
          duration: request.questions[0].duration,
          info: request.questions[0].info,
        },
      ])
    })
  })

  describe('findQuizById', () => {
    it('maps the repository document to a response DTO', async () => {
      const quiz = createMockClassicQuiz({ _id: 'quiz-1' })
      quizRepository.findQuizByIdOrThrow.mockResolvedValue(quiz)

      await expect(service.findQuizById('quiz-1')).resolves.toEqual(
        toQuizResponse(quiz),
      )
      expect(quizRepository.findQuizByIdOrThrow).toHaveBeenCalledWith('quiz-1')
    })

    it('propagates a quiz-not-found error', async () => {
      const error = new QuizNotFoundException('missing-quiz')
      quizRepository.findQuizByIdOrThrow.mockRejectedValue(error)

      await expect(service.findQuizById('missing-quiz')).rejects.toBe(error)
    })
  })

  describe('quiz pagination', () => {
    it('constructs all public filters and maps paginated results', async () => {
      const quiz = createMockClassicQuiz({ _id: 'public-quiz' })
      quizRepository.countQuizzes.mockResolvedValue(12)
      quizRepository.findQuizzes.mockResolvedValue([quiz])

      await expect(
        service.findPublicQuizzes(
          'science',
          GameMode.Classic,
          QuizCategory.Science,
          LanguageCode.English,
          'updated',
          'asc',
          25,
          10,
        ),
      ).resolves.toEqual({
        results: [toQuizResponse(quiz)],
        total: 12,
        limit: 25,
        offset: 10,
      })

      const filter = {
        title: { $regex: 'science', $options: 'i' },
        mode: GameMode.Classic,
        visibility: QuizVisibility.Public,
        category: QuizCategory.Science,
        languageCode: LanguageCode.English,
      }
      expect(quizRepository.countQuizzes).toHaveBeenCalledWith(filter)
      expect(quizRepository.findQuizzes).toHaveBeenCalledWith(
        filter,
        'updated',
        'asc',
        25,
        10,
      )
    })

    it('constructs the owner filters and uses owner pagination values', async () => {
      const quiz = createMockClassicQuiz({ _id: 'owner-quiz' })
      quizRepository.countQuizzes.mockResolvedValue(1)
      quizRepository.findQuizzes.mockResolvedValue([quiz])

      await service.findQuizzesByOwnerId(
        'owner-1',
        'history',
        GameMode.ZeroToOneHundred,
        QuizVisibility.Private,
        QuizCategory.History,
        LanguageCode.English,
        'title',
        'desc',
        5,
        15,
      )

      const filter = {
        owner: 'owner-1',
        title: { $regex: 'history', $options: 'i' },
        mode: GameMode.ZeroToOneHundred,
        visibility: QuizVisibility.Private,
        category: QuizCategory.History,
        languageCode: LanguageCode.English,
      }
      expect(quizRepository.countQuizzes).toHaveBeenCalledWith(filter)
      expect(quizRepository.findQuizzes).toHaveBeenCalledWith(
        filter,
        'title',
        'desc',
        5,
        15,
      )
    })

    it('omits optional filters and applies public defaults', async () => {
      quizRepository.countQuizzes.mockResolvedValue(0)
      quizRepository.findQuizzes.mockResolvedValue([])

      await expect(service.findPublicQuizzes()).resolves.toEqual({
        results: [],
        total: 0,
        limit: 10,
        offset: 0,
      })

      expect(quizRepository.countQuizzes).toHaveBeenCalledWith({
        visibility: QuizVisibility.Public,
      })
      expect(quizRepository.findQuizzes).toHaveBeenCalledWith(
        { visibility: QuizVisibility.Public },
        'created',
        'desc',
        10,
        0,
      )
    })

    it('propagates count errors and does not fetch public results', async () => {
      const error = new Error('count failed')
      quizRepository.countQuizzes.mockRejectedValue(error)

      await expect(service.findPublicQuizzes()).rejects.toBe(error)
      expect(quizRepository.findQuizzes).not.toHaveBeenCalled()
    })

    it('propagates owner result errors after counting', async () => {
      const error = new Error('find failed')
      quizRepository.countQuizzes.mockResolvedValue(3)
      quizRepository.findQuizzes.mockRejectedValue(error)

      await expect(service.findQuizzesByOwnerId('owner-1')).rejects.toBe(error)
      expect(quizRepository.countQuizzes).toHaveBeenCalledWith({
        owner: 'owner-1',
      })
    })
  })

  describe('updateQuiz', () => {
    it('maps the request, updates the timestamp, and maps the result', async () => {
      const request = createMockClassicQuizRequestDto()
      const updatedQuiz = createMockClassicQuiz({
        _id: 'quiz-1',
        title: 'Updated quiz',
        created: new Date('2026-01-01T00:00:00.000Z'),
        updated: fixedNow,
      })
      quizRepository.updateQuiz.mockResolvedValue(updatedQuiz)

      const result = await service.updateQuiz('quiz-1', request)

      const [quizId, update] = quizRepository.updateQuiz.mock.calls[0] as [
        string,
        Partial<Quiz>,
      ]
      expect(quizId).toBe('quiz-1')
      expect(update).toMatchObject({
        title: request.title,
        description: request.description,
        mode: request.mode,
        visibility: request.visibility,
        category: request.category,
        imageCoverURL: request.imageCoverURL,
        languageCode: request.languageCode,
        updated: fixedNow,
      })
      expect(update.questions).toHaveLength(request.questions.length)
      const multiChoice = request.questions[0] as QuestionMultiChoiceDto
      expect(update.questions?.[0]).toMatchObject({
        type: QuestionType.MultiChoice,
        text: multiChoice.question,
        options: multiChoice.options,
      })
      expect(result).toEqual(toQuizResponse(updatedQuiz))
    })

    it('propagates update errors', async () => {
      const error = new QuizNotFoundException('missing-quiz')
      quizRepository.updateQuiz.mockRejectedValue(error)

      await expect(
        service.updateQuiz('missing-quiz', createMockClassicQuizRequestDto()),
      ).rejects.toBe(error)
    })
  })

  describe('findAllQuestion', () => {
    it('maps every classic discriminator branch', async () => {
      const multiChoice = createMockMultiChoiceQuestionDocument()
      const range = createMockRangeQuestionDocument()
      const trueFalse = createMockTrueFalseQuestionDocument()
      const typeAnswer = createMockTypeAnswerQuestionDocument()
      const pin = createMockPinQuestionDocument()
      const puzzle = createMockPuzzleQuestionDocument()
      const questions = [
        multiChoice,
        range,
        trueFalse,
        typeAnswer,
        pin,
        puzzle,
      ] as QuestionDao[]
      const quiz = createMockClassicQuiz({
        mode: GameMode.Classic,
        questions,
      })
      quizRepository.findQuizByIdOrThrow.mockResolvedValue(quiz)

      await expect(service.findAllQuestion('quiz-1')).resolves.toEqual([
        {
          type: QuestionType.MultiChoice,
          question: multiChoice.text,
          media: multiChoice.media,
          options: multiChoice.options,
          points: multiChoice.points,
          duration: multiChoice.duration,
          info: multiChoice.info,
        },
        {
          type: QuestionType.Range,
          question: range.text,
          media: range.media,
          min: range.min,
          max: range.max,
          correct: range.correct,
          margin: range.margin,
          points: range.points,
          duration: range.duration,
          info: range.info,
        },
        {
          type: QuestionType.TrueFalse,
          question: trueFalse.text,
          media: trueFalse.media,
          correct: trueFalse.correct,
          points: trueFalse.points,
          duration: trueFalse.duration,
          info: trueFalse.info,
        },
        {
          type: QuestionType.TypeAnswer,
          question: typeAnswer.text,
          media: typeAnswer.media,
          options: typeAnswer.options,
          points: typeAnswer.points,
          duration: typeAnswer.duration,
          info: typeAnswer.info,
        },
        {
          type: QuestionType.Pin,
          question: pin.text,
          media: undefined,
          imageURL: pin.imageURL,
          positionX: pin.positionX,
          positionY: pin.positionY,
          tolerance: pin.tolerance,
          points: pin.points,
          duration: pin.duration,
          info: pin.info,
        },
        {
          type: QuestionType.Puzzle,
          question: puzzle.text,
          media: puzzle.media,
          values: puzzle.values,
          points: puzzle.points,
          duration: puzzle.duration,
          info: puzzle.info,
        },
      ])
    })

    it('maps zero-to-one-hundred range questions to their public shape', async () => {
      const question = {
        type: QuestionType.Range,
        text: 'How many?',
        media: undefined,
        min: 0,
        max: 100,
        step: 1,
        correct: 42,
        margin: QuestionRangeAnswerMargin.None,
        points: 0,
        duration: 20,
        info: 'An explanation',
      } as QuestionRangeWithBase
      const quiz = createMockZeroToOneHundredQuiz({ questions: [question] })
      quizRepository.findQuizByIdOrThrow.mockResolvedValue(quiz)

      await expect(service.findAllQuestion('zero-quiz')).resolves.toEqual([
        {
          type: QuestionType.Range,
          question: question.text,
          media: undefined,
          duration: question.duration,
          correct: question.correct,
          info: question.info,
        },
      ])
    })

    it('propagates repository errors', async () => {
      const error = new QuizNotFoundException('missing-quiz')
      quizRepository.findQuizByIdOrThrow.mockRejectedValue(error)

      await expect(service.findAllQuestion('missing-quiz')).rejects.toBe(error)
    })

    it('throws for an unsupported game mode', async () => {
      const quiz = createMockClassicQuiz({ mode: 'UNSUPPORTED' as GameMode })
      quizRepository.findQuizByIdOrThrow.mockResolvedValue(quiz)

      await expect(service.findAllQuestion('quiz-1')).rejects.toThrow(
        "Unsupported game mode 'UNSUPPORTED'",
      )
    })
  })

  it('emits quiz.deleted after deleting the quiz', async () => {
    quizRepository.deleteQuiz.mockResolvedValue(undefined)

    await service.deleteQuiz('quiz-1')

    expect(quizRepository.deleteQuiz).toHaveBeenCalledWith('quiz-1')
    expect(eventEmitter.emit).toHaveBeenCalledWith('quiz.deleted', {
      quizId: 'quiz-1',
    })
    expect(quizRepository.deleteQuiz.mock.invocationCallOrder[0]).toBeLessThan(
      eventEmitter.emit.mock.invocationCallOrder[0],
    )
  })

  it('does not emit quiz.deleted when deleting the quiz fails', async () => {
    const error = new Error('delete failed')
    quizRepository.deleteQuiz.mockRejectedValue(error)

    await expect(service.deleteQuiz('quiz-1')).rejects.toBe(error)

    expect(eventEmitter.emit).not.toHaveBeenCalled()
  })
})
