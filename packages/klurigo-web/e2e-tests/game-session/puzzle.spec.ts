import { GameEventType, GameMode, QuestionType } from '@klurigo/common'
import { E2E_FIXTURE_MANIFEST } from '@klurigo/e2e-fixtures'
import { expect, test } from '@playwright/test'

import { GamePlayerClient } from '../support/api/game-player-client'
import { authenticatePageThroughApi } from '../support/browser/authenticate-page-through-api'
import { startHostGame } from '../support/browser/start-host-game'
import { E2E_API_BASE_URL } from '../support/e2e-runtime'
import { getGameSessionFixture } from '../support/fixtures/game-session-fixtures'

test.describe.configure({ mode: 'serial' })

test.describe('Game session: Classic Puzzle', () => {
  const QUIZ_TITLE =
    E2E_FIXTURE_MANIFEST.users.tester02.quizzes.classicPuzzle.title
  const QUESTION = E2E_FIXTURE_MANIFEST.questions.europeanCapitals

  test('completes a Classic Puzzle game with correct and incorrect simulated players', async ({
    page,
  }, testInfo) => {
    const e2eHost = getGameSessionFixture(testInfo)
    const correctPlayerNickname = 'PuzzleCorrect'
    const incorrectPlayerNickname = 'PuzzleIncorrect'
    const correctPlayer = new GamePlayerClient(E2E_API_BASE_URL)
    const incorrectPlayer = new GamePlayerClient(E2E_API_BASE_URL)

    await test.step('Authenticate the seeded E2E user', async () => {
      await authenticatePageThroughApi(page, e2eHost.email)
      await expect(page).toHaveURL('/')
    })

    await test.step('Open the seeded Puzzle Classic quiz', async () => {
      await page.goto(`/quiz/details/${e2eHost.quizzes.classicPuzzle.id}`)
      await expect(page).toHaveURL(
        `/quiz/details/${e2eHost.quizzes.classicPuzzle.id}`,
      )
      await expect(page.getByText(QUIZ_TITLE, { exact: true })).toBeVisible()
    })

    const gamePIN = await test.step('Create and open the host game', () =>
      startHostGame(page))

    try {
      await test.step('Join and connect both simulated players', async () => {
        const [correctIdentity, incorrectIdentity] = await Promise.all([
          correctPlayer.authenticateAndJoin({ gamePIN }, correctPlayerNickname),
          incorrectPlayer.authenticateAndJoin(
            { gamePIN },
            incorrectPlayerNickname,
          ),
        ])
        expect(correctIdentity.gameId).toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
        )
        expect(incorrectIdentity.gameId).toBe(correctIdentity.gameId)

        await Promise.all([correctPlayer.connect(), incorrectPlayer.connect()])
        await expect(
          page.getByText(correctPlayerNickname, { exact: true }),
        ).toBeVisible()
        await expect(
          page.getByText(incorrectPlayerNickname, { exact: true }),
        ).toBeVisible()
      })

      await test.step('Start the game and verify the randomized player question', async () => {
        const correctQuestionPromise = correctPlayer.waitForEvent(
          GameEventType.GameQuestionPlayer,
          (event) => event.pagination.current === 1,
        )
        const incorrectQuestionPromise = incorrectPlayer.waitForEvent(
          GameEventType.GameQuestionPlayer,
          (event) => event.pagination.current === 1,
        )

        await page.locator('#start-game-button').click()
        const [correctQuestion, incorrectQuestion] = await Promise.all([
          correctQuestionPromise,
          incorrectQuestionPromise,
        ])

        await expect(
          page.getByText(QUESTION.text, { exact: true }),
        ).toBeVisible()
        for (const question of [correctQuestion, incorrectQuestion]) {
          expect(question.pagination).toEqual({ current: 1, total: 1 })
          if (question.question.type !== QuestionType.Puzzle) {
            throw new Error('Expected the simulated player to receive a Puzzle')
          }

          expect(question.question).toEqual(
            expect.objectContaining({
              type: QuestionType.Puzzle,
              question: QUESTION.text,
              duration: QUESTION.duration,
            }),
          )
          expect([...question.question.values].sort()).toEqual(
            [...QUESTION.values].sort(),
          )
          expect(question.question.values).not.toEqual(QUESTION.values)
        }
      })

      await test.step('Submit correct and incorrect orderings and verify both results', async () => {
        const correctResultPromise = correctPlayer.waitForEvent(
          GameEventType.GameResultPlayer,
          (event) =>
            event.pagination.current === 1 &&
            event.player.nickname === correctPlayerNickname,
        )
        const incorrectResultPromise = incorrectPlayer.waitForEvent(
          GameEventType.GameResultPlayer,
          (event) =>
            event.pagination.current === 1 &&
            event.player.nickname === incorrectPlayerNickname,
        )

        await Promise.all([
          correctPlayer.submitAnswer({
            type: QuestionType.Puzzle,
            values: [...QUESTION.values],
          }),
          incorrectPlayer.submitAnswer({
            type: QuestionType.Puzzle,
            values: [...QUESTION.values].reverse(),
          }),
        ])
        const [correctResult, incorrectResult] = await Promise.all([
          correctResultPromise,
          incorrectResultPromise,
        ])

        expect(correctResult.game.mode).toBe(GameMode.Classic)
        expect(correctResult.player.score).toEqual(
          expect.objectContaining({
            correct: true,
            position: 1,
          }),
        )
        expect(correctResult.player.score.total).toBeGreaterThan(0)
        expect(incorrectResult.game.mode).toBe(GameMode.Classic)
        expect(incorrectResult.player.score).toEqual(
          expect.objectContaining({ correct: false, total: 0 }),
        )
      })

      await test.step('Verify the host Puzzle result count and target ordering', async () => {
        const puzzleResults = page.locator('[class*="puzzleQuestionResults"]')
        await expect(puzzleResults).toBeVisible()
        await expect(puzzleResults.locator('[class*="green"]')).toContainText(
          '1',
        )
        await expect(puzzleResults.locator('[class*="red"]')).toContainText('1')

        const resultValues = puzzleResults.locator(
          '[class*="sortableTable"] [class*="item"]',
        )
        await expect(resultValues).toHaveCount(QUESTION.values.length)
        expect(
          (await resultValues.allTextContents()).map((value) => value.trim()),
        ).toEqual(QUESTION.values)
      })

      await test.step('Progress to and verify the final podium', async () => {
        const gameOverPromise = correctPlayer.waitForEvent(
          GameEventType.GameOverPlayer,
        )

        await page.locator('#next-button').click()
        const gameOver = await gameOverPromise

        expect(gameOver.game.mode).toBe(GameMode.Classic)
        expect(gameOver.quiz).toEqual({
          id: e2eHost.quizzes.classicPuzzle.id,
          title: QUIZ_TITLE,
        })
        expect(gameOver.player).toEqual(
          expect.objectContaining({
            nickname: correctPlayerNickname,
            rank: 1,
            totalPlayers: 2,
          }),
        )
        await expect(
          page.getByRole('button', { name: 'View Full Results' }),
        ).toBeVisible()
        await expect(page.getByText(QUIZ_TITLE, { exact: true })).toBeVisible()
        await expect(
          page.getByText(correctPlayerNickname, { exact: true }),
        ).toBeVisible()
        await expect(
          page.getByText(incorrectPlayerNickname, { exact: true }),
        ).toBeVisible()
        const correctPlayerColumn = page
          .getByText(correctPlayerNickname, { exact: true })
          .locator('..')
          .locator('..')
        const incorrectPlayerColumn = page
          .getByText(incorrectPlayerNickname, { exact: true })
          .locator('..')
          .locator('..')
        await expect(
          correctPlayerColumn.getByText('1', { exact: true }),
        ).toBeVisible()
        await expect(
          incorrectPlayerColumn.getByText('2', { exact: true }),
        ).toBeVisible()
      })
    } finally {
      correctPlayer.close()
      incorrectPlayer.close()
    }
  })
})
