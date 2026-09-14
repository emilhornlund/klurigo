import { Logger } from '@nestjs/common'
import { Test } from '@nestjs/testing'

import { DiscoverySnapshotRepository } from '../repositories'

import { QuizDeletedListener } from './quiz-deleted.listener'

describe('Discovery QuizDeletedListener', () => {
  let listener: QuizDeletedListener
  let repository: { removeQuizFromSnapshot: jest.Mock }
  let loggerErrorSpy: jest.SpyInstance

  beforeEach(async () => {
    repository = { removeQuizFromSnapshot: jest.fn() }

    const moduleRef = await Test.createTestingModule({
      providers: [
        QuizDeletedListener,
        { provide: DiscoverySnapshotRepository, useValue: repository },
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

  it('removes the quiz from the persisted snapshot', async () => {
    await listener.handleQuizDeleted({ quizId: 'quiz-1' })

    expect(repository.removeQuizFromSnapshot).toHaveBeenCalledWith('quiz-1')
    expect(loggerErrorSpy).not.toHaveBeenCalled()
  })

  it('does not fail when snapshot cleanup has already been completed', async () => {
    repository.removeQuizFromSnapshot.mockResolvedValue(undefined)

    await expect(
      listener.handleQuizDeleted({ quizId: 'quiz-1' }),
    ).resolves.toBeUndefined()
  })

  it('logs cleanup failures without rethrowing them', async () => {
    const error = new Error('database unavailable')
    repository.removeQuizFromSnapshot.mockRejectedValue(error)

    await expect(
      listener.handleQuizDeleted({ quizId: 'quiz-1' }),
    ).resolves.toBeUndefined()

    expect(loggerErrorSpy).toHaveBeenCalledWith(
      {
        message: 'Failed to clean up discovery after quiz deletion.',
        operation: 'handleQuizDeleted',
        quizId: 'quiz-1',
      },
      error.stack,
    )
  })
})
