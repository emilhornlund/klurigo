import { Logger } from '@nestjs/common'

import { GameService } from '../services'

import { GameListener } from './game.listener'

describe(GameListener.name, () => {
  it('logs quiz cleanup failures with the quiz id', async () => {
    const error = new Error('cleanup failed')
    const gameService = {
      deleteQuiz: jest.fn().mockRejectedValue(error),
    }
    const loggerErrorSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined)

    try {
      await new GameListener(
        gameService as unknown as GameService,
      ).handleQuizDeleted({ quizId: 'quiz-1' })

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        {
          message: 'Failed to clean up games after quiz deletion.',
          operation: 'handleQuizDeleted',
          quizId: 'quiz-1',
        },
        error.stack,
      )
    } finally {
      loggerErrorSpy.mockRestore()
    }
  })
})
