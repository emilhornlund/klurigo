import { randomUUID } from 'node:crypto'

import {
  GameEventType,
  type GameResultPlayerEvent,
  QuestionType,
} from '@klurigo/common'
import { E2E_FIXTURE_MANIFEST } from '@klurigo/e2e-fixtures'
import { expect, test } from '@playwright/test'

import { GamePlayerClient } from '../support/api/game-player-client'
import { authenticatePageThroughApi } from '../support/browser/authenticate-page-through-api'
import { startHostGame } from '../support/browser/start-host-game'
import { E2E_API_BASE_URL } from '../support/e2e-runtime'
import { getGameSessionFixture } from '../support/fixtures/game-session-fixtures'

test.describe.configure({ mode: 'serial' })

test.describe('Game session: Classic late joining', () => {
  const LATE_JOIN_QUIZ_TITLE =
    E2E_FIXTURE_MANIFEST.users.tester02.quizzes.classicLateJoin.title
  const QUESTION = E2E_FIXTURE_MANIFEST.questions.clearDaytimeSky.text
  const CORRECT_ANSWER =
    E2E_FIXTURE_MANIFEST.questions.clearDaytimeSky.options[0].value
  const INCORRECT_ANSWER =
    E2E_FIXTURE_MANIFEST.questions.clearDaytimeSky.options[1].value
  const SECOND_QUESTION = E2E_FIXTURE_MANIFEST.questions.redPlanet.text

  test('keeps a late Classic joiner behind a scored player', async ({
    page,
  }, testInfo) => {
    const e2eHost = getGameSessionFixture(testInfo)
    const playerANickname = `ApiEarly${randomUUID().slice(0, 8)}`
    const playerBNickname = `ApiLate${randomUUID().slice(0, 8)}`

    await test.step('Authenticate the seeded E2E user', async () => {
      await authenticatePageThroughApi(page, e2eHost.email)
      await expect(page).toHaveURL('/')
    })

    await test.step('Open the seeded two-question Classic quiz', async () => {
      await page.goto(`/quiz/details/${e2eHost.quizzes.classicLateJoin.id}`)
      await expect(page).toHaveURL(
        `/quiz/details/${e2eHost.quizzes.classicLateJoin.id}`,
      )
      await expect(
        page.getByText(LATE_JOIN_QUIZ_TITLE, { exact: true }),
      ).toBeVisible()
    })

    const gamePIN = await test.step('Create and open the host game', () =>
      startHostGame(page))

    const playerA = new GamePlayerClient(E2E_API_BASE_URL)
    const playerB = new GamePlayerClient(E2E_API_BASE_URL)
    let playerAGameId: string | undefined
    let lateJoinResultPromise: Promise<GameResultPlayerEvent> | undefined

    try {
      await test.step('Join Player A before the game starts', async () => {
        const identity = await playerA.authenticateAndJoin(
          { gamePIN },
          playerANickname,
        )
        expect(identity.gameId).toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
        )
        playerAGameId = identity.gameId

        await playerA.connect()
        await expect(
          page.getByText(playerANickname, { exact: true }),
        ).toBeVisible()
      })

      await test.step('Start the game and receive question 1', async () => {
        const questionPromise = playerA.waitForEvent(
          GameEventType.GameQuestionPlayer,
          (event) => event.pagination.current === 1,
        )

        await page.locator('#start-game-button').click()
        const question = await questionPromise

        await expect(page.getByText(QUESTION, { exact: true })).toBeVisible()
        expect(question.pagination.total).toBe(2)
        if (question.question.type !== QuestionType.MultiChoice) {
          throw new Error('Expected question 1 to be multi-choice')
        }
        expect(question.question.answers).toEqual([
          { value: CORRECT_ANSWER },
          { value: INCORRECT_ANSWER },
        ])
      })

      await test.step('Submit Player A answer and wait for question 1 result', async () => {
        const resultPromise = playerA.waitForEvent(
          GameEventType.GameResultPlayer,
          (event) =>
            event.pagination.current === 1 &&
            event.player.nickname === playerANickname,
        )

        await playerA.submitAnswer({
          type: QuestionType.MultiChoice,
          optionIndex: 0,
        })
        const result = await resultPromise

        expect(result.player.score.correct).toBe(true)
        await expect(page.getByTestId('question-results')).toBeVisible()
      })

      await test.step('Connect Player B after question 1 and verify the late join', async () => {
        const identity = await playerB.authenticateAndJoin(
          { gamePIN },
          playerBNickname,
        )
        expect(identity.gameId).toBe(playerAGameId)

        await playerB.connect()
        lateJoinResultPromise = playerB.waitForEvent(
          GameEventType.GameResultPlayer,
          (event) =>
            event.pagination.current === 1 &&
            event.player.nickname === playerBNickname,
        )
      })

      await test.step('Assert Player B starts with zero points in second place', async () => {
        if (!lateJoinResultPromise) {
          throw new Error('Player B result event was not registered')
        }
        const lateJoinResult = await lateJoinResultPromise

        expect(lateJoinResult.player.score).toEqual({
          correct: false,
          last: 0,
          total: 0,
          position: 2,
          streak: 0,
        })
        expect(lateJoinResult.player.behind).toBeUndefined()
      })

      await test.step('Verify the host recognizes Player B below Player A', async () => {
        await page.locator('#next-button').click()
        await expect(
          page.getByText('Leaderboard', { exact: true }),
        ).toBeVisible()

        const playerAColumn = page
          .getByText(playerANickname, { exact: true })
          .locator('..')
          .locator('..')
        const playerBColumn = page
          .getByText(playerBNickname, { exact: true })
          .locator('..')
          .locator('..')

        await expect(
          playerAColumn.getByText('1', { exact: true }),
        ).toBeVisible()
        await expect(
          playerBColumn.getByText('2', { exact: true }),
        ).toBeVisible()
        await expect(
          playerBColumn.getByText('0', { exact: true }),
        ).toBeVisible()
      })

      await test.step('Progress question 2 to the final podium', async () => {
        await page.locator('#next-button').click()
        await expect(
          page.getByText(SECOND_QUESTION, { exact: true }),
        ).toBeVisible()
        await expect(page.locator('#skip-button')).toBeVisible()
        await page.locator('#skip-button').click()
        await expect(page.getByTestId('question-results')).toBeVisible()

        await page.locator('#next-button').click()
        await expect(
          page.getByRole('button', { name: 'View Full Results' }),
        ).toBeVisible()

        const playerAColumn = page
          .getByText(playerANickname, { exact: true })
          .last()
          .locator('..')
          .locator('..')
        const playerBColumn = page
          .getByText(playerBNickname, { exact: true })
          .last()
          .locator('..')
          .locator('..')

        await expect(
          playerAColumn.getByText('1', { exact: true }),
        ).toBeVisible()
        await expect(
          playerBColumn.getByText('2', { exact: true }),
        ).toBeVisible()
      })
    } finally {
      playerA.close()
      playerB.close()
    }
  })
})
