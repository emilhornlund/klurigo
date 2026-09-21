import {
  GameMode,
  LanguageCode,
  QuestionType,
  QuizCategory,
  QuizVisibility,
} from '@klurigo/common'
import { E2E_FIXTURE_MANIFEST } from '@klurigo/e2e-fixtures'

import {
  createE2eQuizDoc,
  createE2eQuizQuestionDoc,
  createE2eSeedDocuments,
} from './seed-data'

describe('E2E seed data', () => {
  it('creates a user document for every manifest user', () => {
    const { users } = createE2eSeedDocuments(E2E_FIXTURE_MANIFEST)

    expect(users).toEqual([
      {
        _id: '81b661d2-9b92-4011-b744-8ca7d14b71df',
        authProvider: 'LOCAL',
        defaultNickname: 'tester01',
        email: 'tester01@klurigo.com',
        hashedPassword:
          '$2a$10$.0oD9nYtp3OuDONp9Xfx7OP2cl1m22V1ALOpTlfRODbsHpHtQqUhu',
        createdAt: new Date('2025-08-11T14:52:16.031Z'),
        updatedAt: new Date('2025-12-17T08:18:50.228Z'),
      },
      {
        _id: '8b8f99d8-91c9-4e0e-83d0-4d8b72b8fda2',
        authProvider: 'LOCAL',
        defaultNickname: 'tester02',
        email: 'tester02@klurigo.com',
        hashedPassword:
          '$2a$10$.0oD9nYtp3OuDONp9Xfx7OP2cl1m22V1ALOpTlfRODbsHpHtQqUhu',
        createdAt: new Date('2025-08-11T14:52:16.031Z'),
        updatedAt: new Date('2025-12-17T08:18:50.228Z'),
      },
      {
        _id: '6e2e1b12-1a48-47a9-9a95-11b8b3c2e7fd',
        authProvider: 'LOCAL',
        defaultNickname: 'tester05',
        email: 'tester05@klurigo.com',
        hashedPassword:
          '$2a$10$.0oD9nYtp3OuDONp9Xfx7OP2cl1m22V1ALOpTlfRODbsHpHtQqUhu',
        createdAt: new Date('2025-08-11T14:52:16.031Z'),
        updatedAt: new Date('2025-12-17T08:18:50.228Z'),
      },
      {
        _id: 'b7c8d9e0-35f6-4a78-c9d2-46f708b91a23',
        authProvider: 'LOCAL',
        defaultNickname: 'tester08',
        email: 'tester08@klurigo.com',
        hashedPassword:
          '$2a$10$.0oD9nYtp3OuDONp9Xfx7OP2cl1m22V1ALOpTlfRODbsHpHtQqUhu',
        createdAt: new Date('2025-08-11T14:52:16.031Z'),
        updatedAt: new Date('2025-12-17T08:18:50.228Z'),
      },
    ])
  })

  it('transforms every supported manifest question type', () => {
    const questions = Object.values(E2E_FIXTURE_MANIFEST.questions)

    expect(new Set(questions.map(({ type }) => type))).toEqual(
      new Set(Object.values(QuestionType)),
    )

    for (const question of questions) {
      expect(createE2eQuizQuestionDoc(question)).toEqual(question)
    }
  })

  it('creates quiz documents with manifest questions and backend defaults', () => {
    const quiz = E2E_FIXTURE_MANIFEST.users.tester02.quizzes.classicMixed
    const actual = createE2eQuizDoc(
      quiz,
      E2E_FIXTURE_MANIFEST.users.tester02.id,
    )

    expect(actual).toEqual({
      _id: quiz.id,
      title: quiz.title,
      mode: GameMode.Classic,
      visibility: QuizVisibility.Private,
      category: QuizCategory.GeneralKnowledge,
      languageCode: LanguageCode.English,
      questions: quiz.questions,
      owner: E2E_FIXTURE_MANIFEST.users.tester02.id,
      gameplaySummary: {
        count: 0,
        totalPlayerCount: 0,
        totalClassicCorrectCount: 0,
        totalClassicIncorrectCount: 0,
        totalClassicUnansweredCount: 0,
        totalZeroToOneHundredPrecisionSum: 0,
        totalZeroToOneHundredAnsweredCount: 0,
        totalZeroToOneHundredUnansweredCount: 0,
        updated: new Date('2025-12-17T08:18:50.228Z'),
      },
      ratingSummary: {
        count: 0,
        avg: 0,
        stars: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 },
        commentCount: 0,
      },
      created: new Date('2025-08-11T14:52:16.031Z'),
      updated: new Date('2025-12-17T08:18:50.228Z'),
    })
  })

  it('creates quizzes for every manifest user quiz', () => {
    const { quizzes } = createE2eSeedDocuments(E2E_FIXTURE_MANIFEST)
    const expectedQuizzes = Object.values(E2E_FIXTURE_MANIFEST.users).flatMap(
      ({ quizzes: userQuizzes }) => Object.values(userQuizzes),
    )

    expect(quizzes).toHaveLength(expectedQuizzes.length)
    expect(quizzes.map(({ _id }) => _id)).toEqual(
      expectedQuizzes.map(({ id }) => id),
    )
    expect(new Set(quizzes.map(({ owner }) => owner))).toEqual(
      new Set(
        Object.values(E2E_FIXTURE_MANIFEST.users)
          .filter(({ quizzes: userQuizzes }) => Object.keys(userQuizzes).length)
          .map(({ id }) => id),
      ),
    )
  })
})
