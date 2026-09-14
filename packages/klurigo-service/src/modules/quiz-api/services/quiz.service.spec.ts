import { EventEmitter2 } from '@nestjs/event-emitter'

import { QuizRepository } from '../../quiz-core/repositories'

import { QuizService } from './quiz.service'

describe(QuizService.name, () => {
  it('emits quiz.deleted after deleting the quiz', async () => {
    const quizRepository = {
      deleteQuiz: jest.fn().mockResolvedValue(undefined),
    }
    const eventEmitter = { emit: jest.fn() }
    const service = new QuizService(
      quizRepository as unknown as QuizRepository,
      eventEmitter as unknown as EventEmitter2,
    )

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
    const quizRepository = {
      deleteQuiz: jest.fn().mockRejectedValue(error),
    }
    const eventEmitter = { emit: jest.fn() }
    const service = new QuizService(
      quizRepository as unknown as QuizRepository,
      eventEmitter as unknown as EventEmitter2,
    )

    await expect(service.deleteQuiz('quiz-1')).rejects.toBe(error)

    expect(eventEmitter.emit).not.toHaveBeenCalled()
  })
})
