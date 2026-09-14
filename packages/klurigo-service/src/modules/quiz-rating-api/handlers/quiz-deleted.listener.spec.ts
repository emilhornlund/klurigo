import { Logger } from '@nestjs/common'
import { Test } from '@nestjs/testing'

import { QuizRatingService } from '../services'

import { QuizDeletedListener } from './quiz-deleted.listener'

describe('Quiz Rating QuizDeletedListener', () => {
  let listener: QuizDeletedListener
  let quizRatingService: { deleteByQuizId: jest.Mock }
  let loggerErrorSpy: jest.SpyInstance

  beforeEach(async () => {
    quizRatingService = { deleteByQuizId: jest.fn() }

    const moduleRef = await Test.createTestingModule({
      providers: [
        QuizDeletedListener,
        { provide: QuizRatingService, useValue: quizRatingService },
      ],
    }).compile()

    listener = moduleRef.get(QuizDeletedListener)
    loggerErrorSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined)
  })

  afterEach(() => {
    loggerErrorSpy.mockRestore()
  })

  it('deletes all ratings for the quiz', async () => {
    await listener.handleQuizDeleted({ quizId: 'quiz-1' })

    expect(quizRatingService.deleteByQuizId).toHaveBeenCalledWith('quiz-1')
    expect(loggerErrorSpy).not.toHaveBeenCalled()
  })

  it('does not fail when no ratings exist', async () => {
    quizRatingService.deleteByQuizId.mockResolvedValue(undefined)

    await expect(
      listener.handleQuizDeleted({ quizId: 'missing-quiz' }),
    ).resolves.toBeUndefined()
  })

  it('logs cleanup failures without rethrowing them', async () => {
    const error = new Error('database unavailable')
    quizRatingService.deleteByQuizId.mockRejectedValue(error)

    await expect(
      listener.handleQuizDeleted({ quizId: 'quiz-1' }),
    ).resolves.toBeUndefined()

    expect(loggerErrorSpy).toHaveBeenCalledWith(
      {
        message: 'Failed to clean up quiz ratings after quiz deletion.',
        operation: 'handleQuizDeleted',
        quizId: 'quiz-1',
      },
      error.stack,
    )
  })
})
