import { randomUUID } from 'node:crypto'

import { GameEventType, QuestionType } from '@klurigo/common'
import { E2E_FIXTURE_MANIFEST } from '@klurigo/e2e-fixtures'
import { expect, test } from '@playwright/test'

import { GamePlayerClient } from '../support/api/game-player-client'
import { authenticatePageThroughApi } from '../support/browser/authenticate-page-through-api'
import { startHostGame } from '../support/browser/start-host-game'
import { E2E_API_BASE_URL } from '../support/e2e-runtime'
import { getGameSessionFixture } from '../support/fixtures/game-session-fixtures'

test.describe.configure({ mode: 'serial' })

test.describe('Game session: host UI with simulated players', () => {
  const QUIZ_TITLE = E2E_FIXTURE_MANIFEST.users.tester02.quizzes.classic.title
  const QUESTION = E2E_FIXTURE_MANIFEST.questions.clearDaytimeSky.text
  const CORRECT_ANSWER =
    E2E_FIXTURE_MANIFEST.questions.clearDaytimeSky.options[0].value
  const INCORRECT_ANSWER =
    E2E_FIXTURE_MANIFEST.questions.clearDaytimeSky.options[1].value

  test('completes a Classic game with one simulated player', async ({
    page,
  }, testInfo) => {
    const e2eHost = getGameSessionFixture(testInfo)
    const playerNickname = `ApiPlayer${randomUUID().slice(0, 8)}`

    await test.step('Authenticate the seeded E2E user', async () => {
      await authenticatePageThroughApi(page, e2eHost.email)
      await expect(page).toHaveURL('/')
    })

    await test.step('Open the seeded private Classic quiz', async () => {
      await page.goto(`/quiz/details/${e2eHost.quizzes.classic.id}`)
      await expect(page).toHaveURL(
        `/quiz/details/${e2eHost.quizzes.classic.id}`,
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

      await test.step('Start the game and receive the player question', async () => {
        const playerQuestionPromise = gamePlayer.waitForEvent(
          GameEventType.GameQuestionPlayer,
        )

        await page.locator('#start-game-button').click()
        const playerQuestion = await playerQuestionPromise

        await expect(page.getByText(QUESTION, { exact: true })).toBeVisible()
        if (playerQuestion.question.type !== QuestionType.MultiChoice) {
          throw new Error(
            'Expected the simulated player to receive multi-choice',
          )
        }
        expect(playerQuestion.question.answers).toEqual([
          { value: CORRECT_ANSWER },
          { value: INCORRECT_ANSWER },
        ])
      })

      await test.step('Submit the deterministic answer and verify the result', async () => {
        const playerResultPromise = gamePlayer.waitForEvent(
          GameEventType.GameResultPlayer,
          (event) => event.pagination.current === 1,
        )

        await gamePlayer.submitAnswer({
          type: QuestionType.MultiChoice,
          optionIndex: 0,
        })
        await playerResultPromise

        const questionResults = page.getByTestId('question-results')
        await expect(questionResults).toBeVisible()
        await expect(questionResults).toContainText(CORRECT_ANSWER)
      })

      await test.step('Progress to and verify the final podium', async () => {
        await page.locator('#next-button').click()
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

  test('completes a Classic game with two simulated players', async ({
    page,
  }, testInfo) => {
    const e2eHost = getGameSessionFixture(testInfo)
    const correctPlayerNickname = `ApiCorrect${randomUUID().slice(0, 8)}`
    const incorrectPlayerNickname = `ApiIncorrect${randomUUID().slice(0, 8)}`

    await test.step('Authenticate the seeded E2E user', async () => {
      await authenticatePageThroughApi(page, e2eHost.email)
      await expect(page).toHaveURL('/')
    })

    await test.step('Open the seeded private Classic quiz', async () => {
      await page.goto(`/quiz/details/${e2eHost.quizzes.classic.id}`)
      await expect(page).toHaveURL(
        `/quiz/details/${e2eHost.quizzes.classic.id}`,
      )
      await expect(page.getByText(QUIZ_TITLE, { exact: true })).toBeVisible()
    })

    const gamePIN = await test.step('Create and open the host game', () =>
      startHostGame(page))

    const correctPlayer = new GamePlayerClient(E2E_API_BASE_URL)
    const incorrectPlayer = new GamePlayerClient(E2E_API_BASE_URL)

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

      await test.step('Start the game and receive both player questions', async () => {
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

        await expect(page.getByText(QUESTION, { exact: true })).toBeVisible()
        for (const question of [correctQuestion, incorrectQuestion]) {
          if (question.question.type !== QuestionType.MultiChoice) {
            throw new Error(
              'Expected both simulated players to receive multi-choice',
            )
          }
          expect(question.question.answers).toEqual([
            { value: CORRECT_ANSWER },
            { value: INCORRECT_ANSWER },
          ])
        }
      })

      await test.step('Submit different answers and wait for both results', async () => {
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
            type: QuestionType.MultiChoice,
            optionIndex: 0,
          }),
          incorrectPlayer.submitAnswer({
            type: QuestionType.MultiChoice,
            optionIndex: 1,
          }),
        ])

        const [correctResult, incorrectResult] = await Promise.all([
          correctResultPromise,
          incorrectResultPromise,
        ])
        expect(correctResult.player.score.correct).toBe(true)
        expect(incorrectResult.player.score.correct).toBe(false)
      })

      await test.step('Verify the host result state reflects both answers', async () => {
        const questionResults = page.getByTestId('question-results')
        await expect(questionResults).toBeVisible()

        const resultGroups = questionResults.locator(':scope > div')
        await expect(resultGroups).toHaveCount(2)
        await expect(resultGroups.nth(0)).toContainText(CORRECT_ANSWER)
        await expect(resultGroups.nth(0)).toContainText('1')
        await expect(resultGroups.nth(1)).toContainText(INCORRECT_ANSWER)
        await expect(resultGroups.nth(1)).toContainText('1')
      })

      await test.step('Progress to and verify the final podium ordering', async () => {
        await page.locator('#next-button').click()
        await expect(
          page.getByRole('button', { name: 'View Full Results' }),
        ).toBeVisible()
        await expect(page.getByText(QUIZ_TITLE, { exact: true })).toBeVisible()

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
