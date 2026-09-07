import { GameMode, QuestionType } from '@klurigo/common'

import {
  buildMockQuizRating,
  createMockClassicQuiz,
  createMockClassicQuizRequestDto,
  createMockGameDocument,
  createMockGameResultDocument,
  createMockMultiChoiceQuestionDocument,
  createMockQuestionTaskDocument,
  createMockZeroToOneHundredQuiz,
  createMockZeroToOneHundredQuizRequestDto,
} from '../../test-utils/data'

describe('backend test data builders', () => {
  it('creates complete nested quiz and game defaults', () => {
    const quiz = createMockClassicQuiz()
    const game = createMockGameDocument()
    const gameResult = createMockGameResultDocument()

    expect(quiz.owner._id).toBeDefined()
    expect(quiz.questions).toHaveLength(6)
    expect(game.quiz.questions).toHaveLength(6)
    expect(gameResult.game.quiz.questions).toHaveLength(6)
  })

  it('applies typed overrides while retaining concrete fixture shapes', () => {
    const question = createMockMultiChoiceQuestionDocument({
      text: 'Overridden question',
    })
    const task = createMockQuestionTaskDocument({
      questionIndex: 2,
    })
    const classicQuiz = createMockClassicQuiz({
      title: 'Overridden quiz',
    })
    const zeroToOneHundredQuiz = createMockZeroToOneHundredQuiz({
      mode: GameMode.ZeroToOneHundred,
    })
    const classicRequest = createMockClassicQuizRequestDto({
      title: 'Overridden request',
    })
    const zeroToOneHundredRequest = createMockZeroToOneHundredQuizRequestDto({
      title: 'Overridden request',
    })
    const rating = buildMockQuizRating({ stars: 4 })

    expect(question.type).toBe(QuestionType.MultiChoice)
    expect(question.text).toBe('Overridden question')
    expect(task.questionIndex).toBe(2)
    expect(classicQuiz.title).toBe('Overridden quiz')
    expect(zeroToOneHundredQuiz.mode).toBe(GameMode.ZeroToOneHundred)
    expect(classicRequest.mode).toBe(GameMode.Classic)
    expect(zeroToOneHundredRequest.mode).toBe(GameMode.ZeroToOneHundred)
    expect(rating.author.type).toBeDefined()
  })
})
