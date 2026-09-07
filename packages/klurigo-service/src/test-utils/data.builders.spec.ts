import { GameMode, QuestionType } from '@klurigo/common'

import {
  buildMockPrimaryGoogleUser,
  buildMockPrimaryUser,
  buildMockQuizRating,
  createMockClassicQuiz,
  createMockClassicQuizRequestDto,
  createMockGameDocument,
  createMockGameResultDocument,
  createMockLeaderboardTaskDocument,
  createMockLobbyTaskDocument,
  createMockMultiChoiceQuestionDocument,
  createMockPodiumTaskDocument,
  createMockQuestionResultTaskDocument,
  createMockQuestionTaskDocument,
  createMockQuizGameplaySummary,
  createMockUniqueId,
  createMockZeroToOneHundredQuiz,
  createMockZeroToOneHundredQuizRequestDto,
  offsetSeconds,
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

  it('repeats deterministic IDs and dates across equivalent builder calls', () => {
    expect(buildMockPrimaryUser()).toEqual(buildMockPrimaryUser())
    expect(buildMockPrimaryGoogleUser()).toEqual(buildMockPrimaryGoogleUser())
    expect(createMockClassicQuiz()).toEqual(createMockClassicQuiz())
    expect(createMockZeroToOneHundredQuiz()).toEqual(
      createMockZeroToOneHundredQuiz(),
    )
    expect(createMockGameDocument()).toEqual(createMockGameDocument())
    expect(createMockGameResultDocument()).toEqual(
      createMockGameResultDocument(),
    )
    expect(createMockQuestionTaskDocument()).toEqual(
      createMockQuestionTaskDocument(),
    )
    expect(createMockLobbyTaskDocument()).toEqual(createMockLobbyTaskDocument())
    expect(createMockQuestionResultTaskDocument()).toEqual(
      createMockQuestionResultTaskDocument(),
    )
    expect(createMockLeaderboardTaskDocument()).toEqual(
      createMockLeaderboardTaskDocument(),
    )
    expect(createMockPodiumTaskDocument()).toEqual(
      createMockPodiumTaskDocument(),
    )
    expect(buildMockQuizRating()).toEqual(buildMockQuizRating())
    expect(createMockQuizGameplaySummary()).toEqual(
      createMockQuizGameplaySummary(),
    )
  })

  it('supports explicit distinct IDs and dates for scenario-specific fixtures', () => {
    const firstId = createMockUniqueId(100)
    const secondId = createMockUniqueId(101)
    const firstDate = offsetSeconds(0)
    const secondDate = offsetSeconds(30)

    const firstTask = createMockQuestionTaskDocument({ _id: firstId })
    const secondTask = createMockQuestionTaskDocument({ _id: secondId })
    const quiz = createMockClassicQuiz({
      created: firstDate,
      updated: secondDate,
    })

    expect(firstTask._id).not.toBe(secondTask._id)
    expect(quiz.created).toEqual(firstDate)
    expect(quiz.updated).toEqual(secondDate)
    expect(quiz.updated.getTime()).toBeGreaterThan(quiz.created.getTime())
  })
})
