import { randomUUID } from 'node:crypto'

import {
  GameEventType,
  GameMode,
  type GameQuestionPlayerEvent,
  QuestionType,
  type SubmitQuestionAnswerRequestDto,
} from '@klurigo/common'
import {
  E2E_FIXTURE_MANIFEST,
  type GameSessionQuestionFixture,
} from '@klurigo/e2e-fixtures'
import { expect, type Page, test } from '@playwright/test'

import { GamePlayerClient } from '../support/api/game-player-client'
import { authenticatePageThroughApi } from '../support/browser/authenticate-page-through-api'
import { startHostGame } from '../support/browser/start-host-game'
import { E2E_API_BASE_URL } from '../support/e2e-runtime'
import { getGameSessionFixture } from '../support/fixtures/game-session-fixtures'

test.describe.configure({ mode: 'serial' })

test.describe('Game session: mixed Classic question types', () => {
  const MIXED_QUIZ_TITLE =
    E2E_FIXTURE_MANIFEST.users.tester02.quizzes.classicMixed.title
  const MIXED_QUESTIONS = [
    E2E_FIXTURE_MANIFEST.questions.clearDaytimeSky,
    E2E_FIXTURE_MANIFEST.questions.halfwayToOneHundred,
    E2E_FIXTURE_MANIFEST.questions.moonIsLargerThanEarth,
    E2E_FIXTURE_MANIFEST.questions.capitalOfFrance,
    E2E_FIXTURE_MANIFEST.questions.coordinatesOfEiffelTower,
    E2E_FIXTURE_MANIFEST.questions.europeanCapitals,
  ] as const

  test('completes one deterministic question of every Classic type', async ({
    page,
  }, testInfo) => {
    const e2eHost = getGameSessionFixture(testInfo)
    const playerNickname = `ApiMixed${randomUUID().slice(0, 8)}`

    await test.step('Authenticate the seeded E2E user', async () => {
      await authenticatePageThroughApi(page, e2eHost.email)
      await expect(page).toHaveURL('/')
    })

    await test.step('Open the seeded mixed Classic quiz', async () => {
      await page.goto(`/quiz/details/${e2eHost.quizzes.classicMixed.id}`)
      await expect(page).toHaveURL(
        `/quiz/details/${e2eHost.quizzes.classicMixed.id}`,
      )
      await expect(
        page.getByText(MIXED_QUIZ_TITLE, { exact: true }),
      ).toBeVisible()
    })

    const gamePIN = await test.step('Create and open the host game', () =>
      startHostGame(page))
    const gamePlayer = new GamePlayerClient(E2E_API_BASE_URL)

    try {
      await test.step('Join and connect the simulated player', async () => {
        const identity = await gamePlayer.authenticateAndJoin(
          { gamePIN },
          playerNickname,
        )
        expect(identity.gameId).toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
        )

        await gamePlayer.connect()
        await expect(
          page.getByText(playerNickname, { exact: true }),
        ).toBeVisible()
      })

      let playerQuestionPromise = gamePlayer.waitForEvent(
        GameEventType.GameQuestionPlayer,
        (event) => event.pagination.current === 1,
      )
      await page.locator('#start-game-button').click()
      let playerQuestion = await playerQuestionPromise

      for (const [index, expectedQuestion] of MIXED_QUESTIONS.entries()) {
        const paginationPosition = index + 1

        await test.step(`Verify question ${paginationPosition} and submit its answer`, async () => {
          await expect(
            page.getByText(expectedQuestion.text, { exact: true }),
          ).toBeVisible()
          expect(playerQuestion.pagination).toEqual({
            current: paginationPosition,
            total: MIXED_QUESTIONS.length,
          })
          expect(playerQuestion.player.nickname).toBe(playerNickname)

          assertQuestionPayload(playerQuestion, expectedQuestion)

          const playerResultPromise = gamePlayer.waitForEvent(
            GameEventType.GameResultPlayer,
            (event) =>
              event.pagination.current === paginationPosition &&
              event.player.nickname === playerNickname,
          )

          await gamePlayer.submitAnswer(getCorrectAnswer(expectedQuestion))
          const playerResult = await playerResultPromise

          expect(playerResult.pagination).toEqual({
            current: paginationPosition,
            total: MIXED_QUESTIONS.length,
          })
          expect(playerResult.game.mode).toBe(GameMode.Classic)
          expect(playerResult.player.score.correct).toBe(true)
        })

        if (paginationPosition < MIXED_QUESTIONS.length) {
          await expectResultState(page, expectedQuestion)

          await page.locator('#next-button').click()
          await expect(
            page.getByText('Leaderboard', { exact: true }),
          ).toBeVisible()

          playerQuestionPromise = gamePlayer.waitForEvent(
            GameEventType.GameQuestionPlayer,
            (event) => event.pagination.current === paginationPosition + 1,
          )
          await page.locator('#next-button').click()
          playerQuestion = await playerQuestionPromise
        } else {
          await expectResultState(page, expectedQuestion)

          const gameOverPromise = gamePlayer.waitForEvent(
            GameEventType.GameOverPlayer,
            (event) => event.player.nickname === playerNickname,
          )
          await page.locator('#next-button').click()
          const gameOver = await gameOverPromise

          expect(gameOver.game.mode).toBe(GameMode.Classic)
          expect(gameOver.quiz).toEqual({
            id: e2eHost.quizzes.classicMixed.id,
            title: MIXED_QUIZ_TITLE,
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
            page.getByText(MIXED_QUIZ_TITLE, { exact: true }),
          ).toBeVisible()
          await expect(
            page.getByText(playerNickname, { exact: true }),
          ).toBeVisible()
        }
      }
    } finally {
      gamePlayer.close()
    }
  })
})

function assertQuestionPayload(
  event: GameQuestionPlayerEvent,
  expected: GameSessionQuestionFixture,
): void {
  expect(event.question).toEqual(
    expect.objectContaining({
      type: expected.type,
      question: expected.text,
      duration: expected.duration,
    }),
  )

  if (expected.type === QuestionType.MultiChoice) {
    if (event.question.type !== QuestionType.MultiChoice) {
      throw new Error('Expected a multi-choice question')
    }
    expect(event.question.answers).toEqual(
      expected.options.map(({ value }) => ({ value })),
    )
    return
  }

  if (expected.type === QuestionType.Range) {
    if (event.question.type !== QuestionType.Range) {
      throw new Error('Expected a range question')
    }
    expect(event.question).toEqual(
      expect.objectContaining({
        min: expected.min,
        max: expected.max,
        step: expected.step,
      }),
    )
    return
  }

  if (expected.type === QuestionType.Pin) {
    if (event.question.type !== QuestionType.Pin) {
      throw new Error('Expected a Pin question')
    }
    expect(event.question.imageURL).toBe(expected.imageURL)
    return
  }

  if (expected.type === QuestionType.Puzzle) {
    if (event.question.type !== QuestionType.Puzzle) {
      throw new Error('Expected a Puzzle question')
    }
    expect([...event.question.values].sort()).toEqual(
      [...expected.values].sort(),
    )
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

async function expectResultState(
  page: Page,
  question: GameSessionQuestionFixture,
): Promise<void> {
  await expect(page.getByText(question.text, { exact: true })).toBeVisible()

  if (question.type === QuestionType.Pin) {
    await expect(page.getByTestId('pin-question-results')).toBeVisible()
    return
  }

  if (question.type === QuestionType.Puzzle) {
    await expect(page.locator('[class*="puzzleQuestionResults"]')).toBeVisible()
    return
  }

  await expect(page.getByTestId('question-results')).toBeVisible()
}
