import { randomUUID } from 'node:crypto'

import {
  GameEventType,
  GameMode,
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

test.describe('Game session: Zero to One Hundred', () => {
  const ZERO_TO_ONE_HUNDRED_QUIZ_TITLE =
    E2E_FIXTURE_MANIFEST.users.tester02.quizzes.zeroToOneHundred.title
  const ZERO_TO_ONE_HUNDRED_QUESTION =
    E2E_FIXTURE_MANIFEST.questions.halfwayToOneHundred.text
  const ZERO_TO_ONE_HUNDRED_EXACT_ANSWER =
    E2E_FIXTURE_MANIFEST.questions.halfwayToOneHundred.correct
  const ZERO_TO_ONE_HUNDRED_APPROXIMATE_ANSWER = 75
  const ZERO_TO_ONE_HUNDRED_LATE_JOIN_QUIZ_TITLE =
    E2E_FIXTURE_MANIFEST.users.tester02.quizzes.zeroToOneHundredLateJoin.title
  const ZERO_TO_ONE_HUNDRED_LATE_JOIN_SECOND_QUESTION =
    E2E_FIXTURE_MANIFEST.questions.quarterOfOneHundred.text
  const ZERO_TO_ONE_HUNDRED_LATE_JOIN_FIRST_CORRECT_ANSWER =
    E2E_FIXTURE_MANIFEST.questions.halfwayToOneHundred.correct
  const ZERO_TO_ONE_HUNDRED_LATE_JOIN_FRACTIONAL_ANSWER = 83.33333333333333
  const ZERO_TO_ONE_HUNDRED_LATE_JOIN_SECOND_EXACT_ANSWER =
    E2E_FIXTURE_MANIFEST.questions.quarterOfOneHundred.correct

  test('completes a Zero to One Hundred game with two simulated players', async ({
    page,
  }, testInfo) => {
    const e2eHost = getGameSessionFixture(testInfo)
    const precisePlayerNickname = `ApiPrecise${randomUUID().slice(0, 8)}`
    const approximatePlayerNickname = `ApiApprox${randomUUID().slice(0, 8)}`

    await test.step('Authenticate the seeded E2E user', async () => {
      await authenticatePageThroughApi(page, e2eHost.email)
      await expect(page).toHaveURL('/')
    })

    await test.step('Open the seeded Zero to One Hundred quiz', async () => {
      await page.goto(`/quiz/details/${e2eHost.quizzes.zeroToOneHundred.id}`)
      await expect(page).toHaveURL(
        `/quiz/details/${e2eHost.quizzes.zeroToOneHundred.id}`,
      )
      await expect(
        page.getByText(ZERO_TO_ONE_HUNDRED_QUIZ_TITLE, { exact: true }),
      ).toBeVisible()
    })

    const gamePIN = await test.step('Create and open the host game', () =>
      startHostGame(page))

    const precisePlayer = new GamePlayerClient(E2E_API_BASE_URL)
    const approximatePlayer = new GamePlayerClient(E2E_API_BASE_URL)

    try {
      await test.step('Join and connect both simulated players', async () => {
        const [preciseIdentity, approximateIdentity] = await Promise.all([
          precisePlayer.authenticateAndJoin({ gamePIN }, precisePlayerNickname),
          approximatePlayer.authenticateAndJoin(
            { gamePIN },
            approximatePlayerNickname,
          ),
        ])

        expect(preciseIdentity.gameId).toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
        )
        expect(approximateIdentity.gameId).toBe(preciseIdentity.gameId)

        await Promise.all([
          precisePlayer.connect(),
          approximatePlayer.connect(),
        ])
        await expect(
          page.getByText(precisePlayerNickname, { exact: true }),
        ).toBeVisible()
        await expect(
          page.getByText(approximatePlayerNickname, { exact: true }),
        ).toBeVisible()
      })

      await test.step('Start the game and receive both player questions', async () => {
        const preciseQuestionPromise = precisePlayer.waitForEvent(
          GameEventType.GameQuestionPlayer,
          (event) => event.pagination.current === 1,
        )
        const approximateQuestionPromise = approximatePlayer.waitForEvent(
          GameEventType.GameQuestionPlayer,
          (event) => event.pagination.current === 1,
        )

        await page.locator('#start-game-button').click()
        const [preciseQuestion, approximateQuestion] = await Promise.all([
          preciseQuestionPromise,
          approximateQuestionPromise,
        ])

        await expect(
          page.getByText(ZERO_TO_ONE_HUNDRED_QUESTION, { exact: true }),
        ).toBeVisible()
        for (const question of [preciseQuestion, approximateQuestion]) {
          expect(question.question.type).toBe(QuestionType.Range)
          if (question.question.type !== QuestionType.Range) {
            throw new Error(
              'Expected both simulated players to receive a range question',
            )
          }
          expect(question.question.min).toBe(0)
          expect(question.question.max).toBe(100)
          expect(question.question.step).toBe(1)
        }
      })

      await test.step('Submit different-precision answers and verify both results', async () => {
        const preciseResultPromise = precisePlayer.waitForEvent(
          GameEventType.GameResultPlayer,
          (event) =>
            event.pagination.current === 1 &&
            event.player.nickname === precisePlayerNickname,
        )
        const approximateResultPromise = approximatePlayer.waitForEvent(
          GameEventType.GameResultPlayer,
          (event) =>
            event.pagination.current === 1 &&
            event.player.nickname === approximatePlayerNickname,
        )

        await Promise.all([
          precisePlayer.submitAnswer({
            type: QuestionType.Range,
            value: ZERO_TO_ONE_HUNDRED_EXACT_ANSWER,
          }),
          approximatePlayer.submitAnswer({
            type: QuestionType.Range,
            value: ZERO_TO_ONE_HUNDRED_APPROXIMATE_ANSWER,
          }),
        ])

        const [preciseResult, approximateResult] = await Promise.all([
          preciseResultPromise,
          approximateResultPromise,
        ])

        expect(preciseResult.game.mode).toBe(GameMode.ZeroToOneHundred)
        expect(preciseResult.player.score).toEqual({
          correct: true,
          last: -10,
          total: -10,
          position: 1,
        })
        expect(approximateResult.game.mode).toBe(GameMode.ZeroToOneHundred)
        expect(approximateResult.player.score).toEqual({
          correct: true,
          last: 25,
          total: 25,
          position: 2,
        })
        expect(preciseResult.player.score.position).toBeLessThan(
          approximateResult.player.score.position,
        )
      })

      await test.step('Verify the host result state reflects both answers', async () => {
        const questionResults = page.getByTestId('question-results')
        await expect(questionResults).toBeVisible()
        await expect(questionResults.locator(':scope > div')).toHaveCount(1)
        await expect(questionResults.locator(':scope > div > div')).toHaveCount(
          2,
        )
        await expect(questionResults).toContainText(
          `${ZERO_TO_ONE_HUNDRED_EXACT_ANSWER}`,
        )
        await expect(questionResults).toContainText(
          `${ZERO_TO_ONE_HUNDRED_APPROXIMATE_ANSWER}`,
        )
      })

      await test.step('Progress to and verify the final podium ordering', async () => {
        await page.locator('#next-button').click()
        await expect(
          page.getByRole('button', { name: 'View Full Results' }),
        ).toBeVisible()
        await expect(
          page.getByText(ZERO_TO_ONE_HUNDRED_QUIZ_TITLE, { exact: true }),
        ).toBeVisible()

        const precisePlayerColumn = page
          .getByText(precisePlayerNickname, { exact: true })
          .locator('..')
          .locator('..')
        const approximatePlayerColumn = page
          .getByText(approximatePlayerNickname, { exact: true })
          .locator('..')
          .locator('..')

        await expect(
          precisePlayerColumn.getByText('1', { exact: true }),
        ).toBeVisible()
        await expect(
          precisePlayerColumn.getByTestId('score-chip'),
        ).toContainText('-10')
        await expect(
          approximatePlayerColumn.getByText('2', { exact: true }),
        ).toBeVisible()
        await expect(
          approximatePlayerColumn.getByTestId('score-chip'),
        ).toContainText('25')
      })
    } finally {
      precisePlayer.close()
      approximatePlayer.close()
    }
  })

  test('rounds a late Zero to One Hundred joiner score and ranks it correctly', async ({
    page,
  }, testInfo) => {
    const e2eHost = getGameSessionFixture(testInfo)
    const playerANickname = `ApiEarly${randomUUID().slice(0, 8)}`
    const playerBNickname = `ApiLate${randomUUID().slice(0, 8)}`

    await test.step('Authenticate the seeded E2E user', async () => {
      await authenticatePageThroughApi(page, e2eHost.email)
      await expect(page).toHaveURL('/')
    })

    await test.step('Open the seeded late-join Zero to One Hundred quiz', async () => {
      await page.goto(
        `/quiz/details/${e2eHost.quizzes.zeroToOneHundredLateJoin.id}`,
      )
      await expect(page).toHaveURL(
        `/quiz/details/${e2eHost.quizzes.zeroToOneHundredLateJoin.id}`,
      )
      await expect(
        page.getByText(ZERO_TO_ONE_HUNDRED_LATE_JOIN_QUIZ_TITLE, {
          exact: true,
        }),
      ).toBeVisible()
    })

    const gamePIN = await test.step('Create and open the host game', () =>
      startHostGame(page))

    const playerA = new GamePlayerClient(E2E_API_BASE_URL)
    const playerB = new GamePlayerClient(E2E_API_BASE_URL)
    const playerACompletedQuestionScores: number[] = []
    let playerAGameId: string | undefined
    let lateJoinResultPromise: Promise<GameResultPlayerEvent> | undefined

    try {
      await test.step('Join and connect Player A before the game starts', async () => {
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

        await expect(
          page.getByText(ZERO_TO_ONE_HUNDRED_QUESTION, { exact: true }),
        ).toBeVisible()
        expect(question.pagination.total).toBe(2)
        expect(question.question.type).toBe(QuestionType.Range)
        if (question.question.type !== QuestionType.Range) {
          throw new Error('Expected question 1 to be a range question')
        }
        expect(question.question.min).toBe(0)
        expect(question.question.max).toBe(100)
        expect(question.question.step).toBe(1)
      })

      await test.step('Complete question 1 with a fractional deterministic score', async () => {
        const resultPromise = playerA.waitForEvent(
          GameEventType.GameResultPlayer,
          (event) =>
            event.pagination.current === 1 &&
            event.player.nickname === playerANickname,
        )

        await playerA.submitAnswer({
          type: QuestionType.Range,
          value: ZERO_TO_ONE_HUNDRED_LATE_JOIN_FRACTIONAL_ANSWER,
        })
        const result = await resultPromise
        const expectedQuestionScore = Math.abs(
          ZERO_TO_ONE_HUNDRED_LATE_JOIN_FRACTIONAL_ANSWER -
            ZERO_TO_ONE_HUNDRED_LATE_JOIN_FIRST_CORRECT_ANSWER,
        )

        expect(result.game.mode).toBe(GameMode.ZeroToOneHundred)
        expect(result.player.score.correct).toBe(true)
        expect(result.player.score.last).toBe(expectedQuestionScore)
        expect(result.player.score.total).toBe(expectedQuestionScore)
        playerACompletedQuestionScores.push(result.player.score.last)
        await expect(page.getByTestId('question-results')).toBeVisible()
      })

      await test.step('Advance to the active leaderboard after question 1', async () => {
        await page.locator('#next-button').click()
        await expect(
          page.getByText('Leaderboard', { exact: true }),
        ).toBeVisible()
      })

      await test.step('Join and connect Player B from the active leaderboard', async () => {
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

      await test.step('Assert the rounded late-join score and rank', async () => {
        if (!lateJoinResultPromise) {
          throw new Error('Player B result event was not registered')
        }

        const rawLateJoinAverage =
          playerACompletedQuestionScores.reduce(
            (sum, score) => sum + score,
            0,
          ) / playerACompletedQuestionScores.length
        const expectedLateJoinScore = Math.round(rawLateJoinAverage)
        expect(Number.isInteger(rawLateJoinAverage)).toBe(false)

        const lateJoinResult = await lateJoinResultPromise
        expect(lateJoinResult.game.mode).toBe(GameMode.ZeroToOneHundred)
        expect(lateJoinResult.player.score).toEqual({
          correct: false,
          last: 0,
          total: expectedLateJoinScore,
          position: 1,
        })
        expect(lateJoinResult.player.behind).toBeUndefined()
        expect(expectedLateJoinScore).toBeLessThan(rawLateJoinAverage)
      })

      await test.step('Complete question 2 and preserve the final podium ordering', async () => {
        const playerAQuestionPromise = playerA.waitForEvent(
          GameEventType.GameQuestionPlayer,
          (event) => event.pagination.current === 2,
        )
        const playerBQuestionPromise = playerB.waitForEvent(
          GameEventType.GameQuestionPlayer,
          (event) => event.pagination.current === 2,
        )

        await page.locator('#next-button').click()
        const [playerAQuestion, playerBQuestion] = await Promise.all([
          playerAQuestionPromise,
          playerBQuestionPromise,
        ])

        await expect(
          page.getByText(ZERO_TO_ONE_HUNDRED_LATE_JOIN_SECOND_QUESTION, {
            exact: true,
          }),
        ).toBeVisible()
        for (const question of [playerAQuestion, playerBQuestion]) {
          expect(question.question.type).toBe(QuestionType.Range)
        }

        const playerAResultPromise = playerA.waitForEvent(
          GameEventType.GameResultPlayer,
          (event) =>
            event.pagination.current === 2 &&
            event.player.nickname === playerANickname,
        )
        const playerBResultPromise = playerB.waitForEvent(
          GameEventType.GameResultPlayer,
          (event) =>
            event.pagination.current === 2 &&
            event.player.nickname === playerBNickname,
        )

        await playerA.submitAnswer({
          type: QuestionType.Range,
          value: ZERO_TO_ONE_HUNDRED_LATE_JOIN_SECOND_EXACT_ANSWER,
        })
        await expect(page.locator('#skip-button')).toBeVisible()
        await page.locator('#skip-button').click()

        const [playerAResult, playerBResult] = await Promise.all([
          playerAResultPromise,
          playerBResultPromise,
        ])
        const playerAFinalScore = playerACompletedQuestionScores[0] - 10

        expect(playerAResult.player.score.last).toBe(-10)
        expect(playerAResult.player.score.total).toBe(playerAFinalScore)
        expect(playerBResult.player.score.last).toBe(100)
        expect(playerBResult.player.score.total).toBe(
          Math.round(playerACompletedQuestionScores[0]) + 100,
        )
        playerACompletedQuestionScores.push(playerAResult.player.score.last)
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
