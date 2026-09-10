import { randomUUID } from 'node:crypto'

import {
  type GameEventQuestionResults,
  GameEventType,
  GameMode,
  type GameQuestionPlayerEvent,
  QuestionType,
  type SubmitQuestionAnswerRequestDto,
} from '@klurigo/common'
import { type GameSessionQuestionFixture } from '@klurigo/e2e-fixtures'
import { expect, type Page, test } from '@playwright/test'

import { GameHostClient } from '../support/api/game-host-client'
import { GamePlayerClient } from '../support/api/game-player-client'
import { authenticatePageThroughApi } from '../support/browser/authenticate-page-through-api'
import { startHostGame } from '../support/browser/start-host-game'
import { E2E_API_BASE_URL, E2E_USER_PASSWORD } from '../support/e2e-runtime'
import { getGameSessionFixture } from '../support/fixtures/game-session-fixtures'

test.describe.configure({ mode: 'serial' })

test.describe('Game session: mixed Classic question types', () => {
  test('completes one deterministic question of every Classic type', async ({
    page,
  }, testInfo) => {
    const e2eHost = getGameSessionFixture(testInfo)
    const quiz = e2eHost.quizzes.classicMixed
    const questions = quiz.questions
    const playerNickname = `ApiMixed${randomUUID().slice(0, 8)}`

    await test.step('Authenticate the seeded E2E user', async () => {
      await authenticatePageThroughApi(page, e2eHost.email)
      await expect(page).toHaveURL('/')
    })

    await test.step('Open the seeded mixed Classic quiz', async () => {
      await page.goto(`/quiz/details/${quiz.id}`)
      await expect(page).toHaveURL(`/quiz/details/${quiz.id}`)
      await expect(page.getByText(quiz.title, { exact: true })).toBeVisible()
    })

    const gamePIN = await test.step('Create and open the host game', () =>
      startHostGame(page))
    const gameHost = new GameHostClient(E2E_API_BASE_URL)
    const gamePlayer = new GamePlayerClient(E2E_API_BASE_URL)

    try {
      await test.step('Join and connect the simulated player', async () => {
        const hostIdentity = await gameHost.authenticate(
          { email: e2eHost.email, password: E2E_USER_PASSWORD },
          { gamePIN },
        )
        await gameHost.connect()
        const lobbyEvent = await gameHost.waitForEvent(
          GameEventType.GameLobbyHost,
          (event) => event.game.pin === gamePIN,
        )
        expect(lobbyEvent.players).toEqual([])
        const joinedLobbyPromise = gameHost.waitForEvent(
          GameEventType.GameLobbyHost,
          (event) =>
            event.players.some(({ nickname }) => nickname === playerNickname),
        )
        const identity = await gamePlayer.authenticateAndJoin(
          { gamePIN },
          playerNickname,
        )
        expect(identity.gameId).toBe(hostIdentity.gameId)
        expect(identity.gameId).toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
        )

        await gamePlayer.connect()
        const joinedLobby = await joinedLobbyPromise
        expect(joinedLobby.players).toEqual([
          expect.objectContaining({ nickname: playerNickname }),
        ])
        await expect(
          page.getByText(playerNickname, { exact: true }),
        ).toBeVisible()
      })

      const hostBeginPromise = gameHost.waitForEvent(
        GameEventType.GameBeginHost,
      )
      const hostPreviewPromise = gameHost.waitForEvent(
        GameEventType.GameQuestionPreviewHost,
        (event) => event.pagination.current === 1,
      )
      let hostQuestionPromise = gameHost.waitForEvent(
        GameEventType.GameQuestionHost,
        (event) => event.pagination.current === 1,
      )
      let playerQuestionPromise = gamePlayer.waitForEvent(
        GameEventType.GameQuestionPlayer,
        (event) => event.pagination.current === 1,
      )
      await page.locator('#start-game-button').click()
      await hostBeginPromise
      const hostPreview = await hostPreviewPromise
      expect(hostPreview.game.mode).toBe(GameMode.Classic)
      expect(hostPreview.question).toEqual(
        expect.objectContaining({
          type: questions[0].type,
          question: questions[0].text,
          points: questions[0].points,
        }),
      )
      expect(hostPreview.pagination).toEqual({ current: 1, total: 6 })
      let hostQuestion = await hostQuestionPromise
      let playerQuestion = await playerQuestionPromise

      for (const [index, expectedQuestion] of questions.entries()) {
        const paginationPosition = index + 1

        await test.step(`Verify question ${paginationPosition} and submit its answer`, async () => {
          await expect(
            page.getByText(expectedQuestion.text, { exact: true }),
          ).toBeVisible()
          expect(hostQuestion.game.pin).toBe(gamePIN)
          expect(hostQuestion.submissions).toEqual({ current: 0, total: 1 })
          expect(hostQuestion.pagination).toEqual({
            current: paginationPosition,
            total: questions.length,
          })
          assertQuestionPayload(hostQuestion.question, expectedQuestion)
          expect(playerQuestion.pagination).toEqual({
            current: paginationPosition,
            total: questions.length,
          })
          expect(playerQuestion.player.nickname).toBe(playerNickname)

          assertQuestionPayload(playerQuestion.question, expectedQuestion)

          const playerResultPromise = gamePlayer.waitForEvent(
            GameEventType.GameResultPlayer,
            (event) =>
              event.pagination.current === paginationPosition &&
              event.player.nickname === playerNickname,
          )
          const hostResultPromise = gameHost.waitForEvent(
            GameEventType.GameResultHost,
            (event) => event.pagination.current === paginationPosition,
          )

          await gamePlayer.submitAnswer(getCorrectAnswer(expectedQuestion))
          const [playerResult, hostResult] = await Promise.all([
            playerResultPromise,
            hostResultPromise,
          ])

          expect(hostResult.game.pin).toBe(gamePIN)
          expect(hostResult.question).toEqual(
            expect.objectContaining({
              type: expectedQuestion.type,
              question: expectedQuestion.text,
            }),
          )
          expect(hostResult.pagination).toEqual({
            current: paginationPosition,
            total: questions.length,
          })
          expect(hostResult.results.type).toBe(expectedQuestion.type)
          assertCorrectAnswerDistribution(hostResult.results, expectedQuestion)
          expect(playerResult.pagination).toEqual({
            current: paginationPosition,
            total: questions.length,
          })
          expect(playerResult.game.mode).toBe(GameMode.Classic)
          expect(playerResult.player.score.correct).toBe(true)
          expect(playerResult.player.score.total).toBeGreaterThan(0)
        })

        if (paginationPosition < questions.length) {
          await expectResultState(page, expectedQuestion)

          const leaderboardPromise = gameHost.waitForEvent(
            GameEventType.GameLeaderboardHost,
            (event) => event.pagination.current === paginationPosition,
          )
          await page.locator('#next-button').click()
          await expect(
            page.getByText('Leaderboard', { exact: true }),
          ).toBeVisible()
          const leaderboard = await leaderboardPromise
          expect(leaderboard.game).toEqual({
            mode: GameMode.Classic,
            pin: gamePIN,
          })
          expect(leaderboard.pagination).toEqual({
            current: paginationPosition,
            total: questions.length,
          })
          expect(leaderboard.leaderboard).toEqual([
            expect.objectContaining({
              nickname: playerNickname,
              position: 1,
            }),
          ])

          hostQuestionPromise = gameHost.waitForEvent(
            GameEventType.GameQuestionHost,
            (event) => event.pagination.current === paginationPosition + 1,
          )
          playerQuestionPromise = gamePlayer.waitForEvent(
            GameEventType.GameQuestionPlayer,
            (event) => event.pagination.current === paginationPosition + 1,
          )
          await page.locator('#next-button').click()
          playerQuestion = await playerQuestionPromise
          hostQuestion = await hostQuestionPromise
        } else {
          await expectResultState(page, expectedQuestion)

          const gameOverPromise = gamePlayer.waitForEvent(
            GameEventType.GameOverPlayer,
            (event) => event.player.nickname === playerNickname,
          )
          const podiumPromise = gameHost.waitForEvent(
            GameEventType.GamePodiumHost,
            (event) => event.game.name === quiz.title,
          )
          await page.locator('#next-button').click()
          const [gameOver, podium] = await Promise.all([
            gameOverPromise,
            podiumPromise,
          ])

          expect(podium.game.name).toBe(quiz.title)
          expect(podium.leaderboard).toEqual([
            expect.objectContaining({
              position: 1,
              nickname: playerNickname,
            }),
          ])
          expect(gameOver.game.mode).toBe(GameMode.Classic)
          expect(gameOver.quiz).toEqual({
            id: quiz.id,
            title: quiz.title,
          })
          expect(gameOver.player).toEqual(
            expect.objectContaining({
              nickname: playerNickname,
              rank: 1,
              totalPlayers: 1,
            }),
          )
          await expect(
            page.getByRole('button', { name: 'View Full Results' }),
          ).toBeVisible()
          await expect(
            page.getByText(quiz.title, { exact: true }),
          ).toBeVisible()
          await expect(
            page.getByText(playerNickname, { exact: true }),
          ).toBeVisible()
        }
      }
    } finally {
      gameHost.close()
      gamePlayer.close()
    }
  })
})

function assertQuestionPayload(
  question: GameQuestionPlayerEvent['question'],
  expected: GameSessionQuestionFixture,
): void {
  expect(question).toEqual(
    expect.objectContaining({
      type: expected.type,
      question: expected.text,
      duration: expected.duration,
    }),
  )

  if (expected.type === QuestionType.MultiChoice) {
    if (question.type !== QuestionType.MultiChoice) {
      throw new Error('Expected a multi-choice question')
    }
    expect(question.answers).toEqual(
      expected.options.map(({ value }) => ({ value })),
    )
    return
  }

  if (expected.type === QuestionType.Range) {
    if (question.type !== QuestionType.Range) {
      throw new Error('Expected a range question')
    }
    expect(question).toEqual(
      expect.objectContaining({
        min: expected.min,
        max: expected.max,
        step: expected.step,
      }),
    )
    return
  }

  if (expected.type === QuestionType.TrueFalse) {
    if (question.type !== QuestionType.TrueFalse) {
      throw new Error('Expected a true/false question')
    }
    expect(question).toEqual({
      type: QuestionType.TrueFalse,
      question: expected.text,
      duration: expected.duration,
    })
    return
  }

  if (expected.type === QuestionType.TypeAnswer) {
    if (question.type !== QuestionType.TypeAnswer) {
      throw new Error('Expected a type-answer question')
    }
    expect(question).toEqual({
      type: QuestionType.TypeAnswer,
      question: expected.text,
      duration: expected.duration,
    })
    return
  }

  if (expected.type === QuestionType.Pin) {
    if (question.type !== QuestionType.Pin) {
      throw new Error('Expected a Pin question')
    }
    expect(question.imageURL).toBe(expected.imageURL)
    return
  }

  if (expected.type === QuestionType.Puzzle) {
    if (question.type !== QuestionType.Puzzle) {
      throw new Error('Expected a Puzzle question')
    }
    expect([...question.values].sort()).toEqual([...expected.values].sort())
    return
  }
}

function getCorrectAnswer(
  question: GameSessionQuestionFixture,
): SubmitQuestionAnswerRequestDto {
  if (question.type === QuestionType.MultiChoice) {
    const optionIndex = question.options.findIndex((option) => option.correct)
    if (optionIndex < 0) {
      throw new Error(
        'Mixed Classic multi-choice fixture has no correct answer',
      )
    }
    return { type: question.type, optionIndex }
  }

  if (question.type === QuestionType.Range) {
    return { type: question.type, value: question.correct }
  }

  if (question.type === QuestionType.TrueFalse) {
    return { type: question.type, value: question.correct }
  }

  if (question.type === QuestionType.TypeAnswer) {
    return { type: question.type, value: question.options[0] }
  }

  if (question.type === QuestionType.Pin) {
    return {
      type: question.type,
      positionX: question.positionX,
      positionY: question.positionY,
    }
  }

  return { type: question.type, values: [...question.values] }
}

function assertCorrectAnswerDistribution(
  results: GameEventQuestionResults,
  question: GameSessionQuestionFixture,
): void {
  if (question.type === QuestionType.MultiChoice) {
    if (results.type !== QuestionType.MultiChoice) {
      throw new Error('Expected a multi-choice result')
    }
    const correctIndex = question.options.findIndex(({ correct }) => correct)
    const correctOption = question.options[correctIndex]
    if (correctIndex < 0 || !correctOption) {
      throw new Error(
        'Mixed Classic multi-choice fixture has no correct answer',
      )
    }
    expect(results.distribution).toEqual([
      {
        index: correctIndex,
        value: correctOption.value,
        count: 1,
        correct: true,
      },
    ])
    return
  }

  if (question.type === QuestionType.Range) {
    if (results.type !== QuestionType.Range) {
      throw new Error('Expected a range result')
    }
    expect(results.distribution).toEqual([
      { value: question.correct, count: 1, correct: true },
    ])
    return
  }

  if (question.type === QuestionType.TrueFalse) {
    if (results.type !== QuestionType.TrueFalse) {
      throw new Error('Expected a true/false result')
    }
    expect(results.distribution).toEqual([
      { value: question.correct, count: 1, correct: true },
    ])
    return
  }

  if (question.type === QuestionType.TypeAnswer) {
    if (results.type !== QuestionType.TypeAnswer) {
      throw new Error('Expected a type-answer result')
    }
    expect(results.distribution).toEqual([
      { value: question.options[0]?.toLowerCase(), count: 1, correct: true },
    ])
    return
  }

  if (question.type === QuestionType.Pin) {
    if (results.type !== QuestionType.Pin) {
      throw new Error('Expected a Pin result')
    }
    expect(results.distribution).toContainEqual(
      expect.objectContaining({ count: 1, correct: true }),
    )
    return
  }

  if (results.type !== QuestionType.Puzzle) {
    throw new Error('Expected a Puzzle result')
  }
  expect(results.distribution).toEqual([
    { value: [...question.values], count: 1, correct: true },
  ])
}

async function expectResultState(
  page: Page,
  question: GameSessionQuestionFixture,
): Promise<void> {
  await expect(page.getByText(question.text, { exact: true })).toBeVisible()

  if (question.type === QuestionType.Pin) {
    const pinResults = page.getByTestId('pin-question-results')
    await expect(pinResults).toBeVisible()
    await expect(pinResults.locator('img')).toHaveAttribute(
      'src',
      question.imageURL,
    )
    await expect(pinResults.locator('svg')).toHaveCount(2)
    await expect(pinResults.locator('[class*="tolerance"]')).toHaveCount(1)
    return
  }

  if (question.type === QuestionType.Puzzle) {
    const puzzleResults = page.locator('[class*="puzzleQuestionResults"]')
    await expect(puzzleResults).toBeVisible()
    await expect(puzzleResults.locator('[class*="green"]')).toContainText('1')
    await expect(puzzleResults.locator('[class*="red"]')).toContainText('0')
    const resultValues = puzzleResults.locator(
      '[class*="sortableTable"] [class*="item"]',
    )
    await expect(resultValues).toHaveCount(question.values.length)
    expect(
      (await resultValues.allTextContents()).map((value) => value.trim()),
    ).toEqual(question.values)
    return
  }

  const questionResults = page.getByTestId('question-results')
  await expect(questionResults).toBeVisible()

  if (question.type === QuestionType.MultiChoice) {
    const correctOption = question.options.find((option) => option.correct)
    if (!correctOption)
      throw new Error('Mixed Classic answer is not configured')
    await expect(questionResults).toContainText(correctOption.value)
  }

  if (question.type === QuestionType.Range) {
    await expect(questionResults).toContainText(`${question.correct}`)
  }

  if (question.type === QuestionType.TrueFalse) {
    await expect(questionResults).toContainText(
      question.correct ? 'True' : 'False',
    )
  }

  if (question.type === QuestionType.TypeAnswer) {
    await expect(questionResults).toContainText(
      question.options[0]?.toLowerCase() ?? '',
    )
  }

  await expect(questionResults).toContainText('1')
}
