import { randomUUID } from 'node:crypto'

import { GameEventType, GameMode, QuestionType } from '@klurigo/common'
import { E2E_FIXTURE_MANIFEST } from '@klurigo/e2e-fixtures'
import { expect, test } from '@playwright/test'

import { GamePlayerClient } from '../support/api/game-player-client'
import { authenticatePageThroughApi } from '../support/browser/authenticate-page-through-api'
import { startHostGame } from '../support/browser/start-host-game'
import { E2E_API_BASE_URL } from '../support/e2e-runtime'
import { getGameSessionFixture } from '../support/fixtures/game-session-fixtures'

test.describe.configure({ mode: 'serial' })

test.describe('Game session: Classic True/False', () => {
  const QUIZ_TITLE =
    E2E_FIXTURE_MANIFEST.users.tester02.quizzes.classicTrueFalse.title
  const QUESTION = E2E_FIXTURE_MANIFEST.questions.moonIsLargerThanEarth

  test('completes a Classic True/False game with one simulated player', async ({
    page,
  }, testInfo) => {
    const e2eHost = getGameSessionFixture(testInfo)
    const playerNickname = `ApiTrueFalse${randomUUID().slice(0, 8)}`

    await test.step('Authenticate the seeded E2E user', async () => {
      await authenticatePageThroughApi(page, e2eHost.email)
      await expect(page).toHaveURL('/')
    })

    await test.step('Open the seeded True/False Classic quiz', async () => {
      await page.goto(`/quiz/details/${e2eHost.quizzes.classicTrueFalse.id}`)
      await expect(page).toHaveURL(
        `/quiz/details/${e2eHost.quizzes.classicTrueFalse.id}`,
      )
      await expect(page.getByText(QUIZ_TITLE, { exact: true })).toBeVisible()
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

      await test.step('Start the game and verify the typed player question', async () => {
        const playerQuestionPromise = gamePlayer.waitForEvent(
          GameEventType.GameQuestionPlayer,
          (event) => event.pagination.current === 1,
        )

        await page.locator('#start-game-button').click()
        const playerQuestion = await playerQuestionPromise

        await expect(
          page.getByText(QUESTION.text, { exact: true }),
        ).toBeVisible()
        expect(playerQuestion.pagination.total).toBe(1)
        expect(playerQuestion.question).toEqual(
          expect.objectContaining({
            type: QuestionType.TrueFalse,
            question: QUESTION.text,
            duration: QUESTION.duration,
          }),
        )
      })

      await test.step('Submit False and verify the typed player result', async () => {
        const playerResultPromise = gamePlayer.waitForEvent(
          GameEventType.GameResultPlayer,
          (event) =>
            event.pagination.current === 1 &&
            event.player.nickname === playerNickname,
        )

        await gamePlayer.submitAnswer({
          type: QuestionType.TrueFalse,
          value: QUESTION.correct,
        })
        const playerResult = await playerResultPromise

        expect(playerResult.game.mode).toBe(GameMode.Classic)
        expect(playerResult.player.score.correct).toBe(true)
        await expect(page.getByText('False', { exact: true })).toBeVisible()
      })

      await test.step('Verify the host result count for False', async () => {
        const questionResults = page.getByTestId('question-results')
        await expect(questionResults).toBeVisible()
        await expect(questionResults.locator(':scope > div')).toHaveCount(1)
        await expect(questionResults).toContainText('False')
        await expect(questionResults).toContainText('1')
      })

      await test.step('Progress to and verify the final podium', async () => {
        const gameOverPromise = gamePlayer.waitForEvent(
          GameEventType.GameOverPlayer,
        )

        await page.locator('#next-button').click()
        const gameOver = await gameOverPromise

        expect(gameOver.game.mode).toBe(GameMode.Classic)
        expect(gameOver.quiz).toEqual({
          id: e2eHost.quizzes.classicTrueFalse.id,
          title: QUIZ_TITLE,
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
        await expect(page.getByText(QUIZ_TITLE, { exact: true })).toBeVisible()
        await expect(
          page.getByText(playerNickname, { exact: true }),
        ).toBeVisible()
      })
    } finally {
      gamePlayer.close()
    }
  })
})
