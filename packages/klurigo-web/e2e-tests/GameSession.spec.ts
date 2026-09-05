import { randomUUID } from 'node:crypto'

import {
  GameEventType,
  GameMode,
  type GameResultPlayerEvent,
  QuestionType,
} from '@klurigo/common'
import { E2E_FIXTURE_MANIFEST } from '@klurigo/e2e-fixtures'
import { expect, test } from '@playwright/test'

import { createGameThroughPublicApi } from './support/api/create-game-through-public-api'
import { GameHostClient } from './support/api/game-host-client'
import { GamePlayerClient } from './support/api/game-player-client'
import { authenticatePageThroughApi } from './support/browser/authenticate-page-through-api'
import { E2E_API_BASE_URL, E2E_USER_PASSWORD } from './support/e2e-runtime'
import { getGameSessionFixture } from './support/fixtures/game-session-fixtures'

const QUIZ_TITLE = E2E_FIXTURE_MANIFEST.users.tester02.quizzes.classic.title
const LATE_JOIN_QUIZ_TITLE =
  E2E_FIXTURE_MANIFEST.users.tester02.quizzes.classicLateJoin.title
const QUESTION = E2E_FIXTURE_MANIFEST.questions.clearDaytimeSky.text
const CORRECT_ANSWER =
  E2E_FIXTURE_MANIFEST.questions.clearDaytimeSky.options[0].value
const INCORRECT_ANSWER =
  E2E_FIXTURE_MANIFEST.questions.clearDaytimeSky.options[1].value
const SECOND_QUESTION = E2E_FIXTURE_MANIFEST.questions.redPlanet.text
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

test.describe.configure({ mode: 'serial' })

test.describe('Game session: host UI with API player', () => {
  test('completes one Classic game with one simulated player', async ({
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

    await test.step('Create and open the host game', async () => {
      await page.locator('#host-game-button').click()
      await page.getByRole('button', { name: 'Confirm', exact: true }).click()
      await expect(page).toHaveURL('/game')
      await expect(page.getByText('Game PIN', { exact: true })).toBeVisible()
    })

    const gamePINElement = page
      .getByText('Game PIN', { exact: true })
      .locator('..')
      .getByText(/^[1-9]\d{5}$/)
    await expect(gamePINElement).toBeVisible()
    const gamePIN = (await gamePINElement.textContent())?.trim()
    if (!gamePIN) {
      throw new Error('Host lobby did not expose a game PIN')
    }

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

  test('completes one Classic game with two simulated players', async ({
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

    await test.step('Create and open the host game', async () => {
      await page.locator('#host-game-button').click()
      await page.getByRole('button', { name: 'Confirm', exact: true }).click()
      await expect(page).toHaveURL('/game')
      await expect(page.getByText('Game PIN', { exact: true })).toBeVisible()
    })

    const gamePINElement = page
      .getByText('Game PIN', { exact: true })
      .locator('..')
      .getByText(/^[1-9]\d{5}$/)
    await expect(gamePINElement).toBeVisible()
    const gamePIN = (await gamePINElement.textContent())?.trim()
    if (!gamePIN) {
      throw new Error('Host lobby did not expose a game PIN')
    }

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

  test('completes one Zero to One Hundred game with two simulated players', async ({
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

    await test.step('Create and open the host game', async () => {
      await page.locator('#host-game-button').click()
      await page.getByRole('button', { name: 'Confirm', exact: true }).click()
      await expect(page).toHaveURL('/game')
      await expect(page.getByText('Game PIN', { exact: true })).toBeVisible()
    })

    const gamePINElement = page
      .getByText('Game PIN', { exact: true })
      .locator('..')
      .getByText(/^[1-9]\d{5}$/)
    await expect(gamePINElement).toBeVisible()
    const gamePIN = (await gamePINElement.textContent())?.trim()
    if (!gamePIN) {
      throw new Error('Host lobby did not expose a game PIN')
    }

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

    await test.step('Create and open the host game', async () => {
      await page.locator('#host-game-button').click()
      await page.getByRole('button', { name: 'Confirm', exact: true }).click()
      await expect(page).toHaveURL('/game')
      await expect(page.getByText('Game PIN', { exact: true })).toBeVisible()
    })

    const gamePINElement = page
      .getByText('Game PIN', { exact: true })
      .locator('..')
      .getByText(/^[1-9]\d{5}$/)
    await expect(gamePINElement).toBeVisible()
    const gamePIN = (await gamePINElement.textContent())?.trim()
    if (!gamePIN) {
      throw new Error('Host lobby did not expose a game PIN')
    }

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

    await test.step('Create and open the host game', async () => {
      await page.locator('#host-game-button').click()
      await page.getByRole('button', { name: 'Confirm', exact: true }).click()
      await expect(page).toHaveURL('/game')
      await expect(page.getByText('Game PIN', { exact: true })).toBeVisible()
    })

    const gamePINElement = page
      .getByText('Game PIN', { exact: true })
      .locator('..')
      .getByText(/^[1-9]\d{5}$/)
    await expect(gamePINElement).toBeVisible()
    const gamePIN = (await gamePINElement.textContent())?.trim()
    if (!gamePIN) {
      throw new Error('Host lobby did not expose a game PIN')
    }

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

test.describe('Game session: player UI with API host', () => {
  test('completes one Classic game with one real player', async ({
    page,
  }, testInfo) => {
    const e2eHost = getGameSessionFixture(testInfo)
    const playerNickname = `ApiPlayer${randomUUID().slice(0, 8)}`
    const gameHost = new GameHostClient(E2E_API_BASE_URL)

    try {
      const createdGame =
        await test.step('Create the game through the public quiz game API', () =>
          createGameThroughPublicApi({
            apiBaseUrl: E2E_API_BASE_URL,
            email: e2eHost.email,
            password: E2E_USER_PASSWORD,
            quizId: e2eHost.quizzes.classic.id,
          }))

      await test.step('Authenticate and connect the simulated host', async () => {
        const identity = await gameHost.authenticate(
          { email: e2eHost.email, password: E2E_USER_PASSWORD },
          { gameId: createdGame.id },
        )
        expect(identity.gameId).toBe(createdGame.id)
        await gameHost.connect()
      })

      const lobbyEvent =
        await test.step('Read the real game PIN from the typed host lobby event', () =>
          gameHost.waitForEvent(
            GameEventType.GameLobbyHost,
            (event) => event.game.id === createdGame.id,
          ))
      const gamePIN = lobbyEvent.game.pin
      expect(gamePIN).toMatch(/^[1-9]\d{5}$/)

      await test.step('Join the game through the real player UI', async () => {
        const joinedPlayerPromise = gameHost.waitForEvent(
          GameEventType.GameLobbyHost,
          (event) =>
            event.players.some(({ nickname }) => nickname === playerNickname),
        )

        await page.goto(`/auth/game?pin=${encodeURIComponent(gamePIN)}`)
        await expect(page).toHaveURL('/join')
        await expect(page.locator('#default-nickname-textfield')).toBeVisible()
        await page.locator('#default-nickname-textfield').fill(playerNickname)
        await expect(page.locator('#join')).toBeEnabled()
        await page.locator('#join').click()

        await expect(page).toHaveURL('/game')
        await expect(
          page.getByText('You’re in the waiting room', { exact: true }),
        ).toBeVisible()
        await joinedPlayerPromise
      })

      await test.step('Start the game through the public host progression endpoint', async () => {
        const hostQuestionPromise = gameHost.waitForEvent(
          GameEventType.GameQuestionHost,
          (event) => event.pagination.current === 1,
        )

        await gameHost.completeCurrentTask()
        const hostQuestion = await hostQuestionPromise

        if (hostQuestion.question.type !== QuestionType.MultiChoice) {
          throw new Error('Expected the seeded question to be multi-choice')
        }
        expect(hostQuestion.question.answers).toEqual([
          { value: CORRECT_ANSWER },
          { value: INCORRECT_ANSWER },
        ])

        await expect(page.getByText(QUESTION, { exact: true })).toBeVisible()
        await expect(page.locator(`[id="0_${CORRECT_ANSWER}"]`)).toBeVisible()
      })

      await test.step('Submit the correct answer through the real player UI', async () => {
        const correctAnswer = page.locator(`[id="0_${CORRECT_ANSWER}"]`)
        const hostResultPromise = gameHost.waitForEvent(
          GameEventType.GameResultHost,
          (event) => event.pagination.current === 1,
        )

        await correctAnswer.click()
        await expect(correctAnswer).toBeDisabled()
        await hostResultPromise
      })

      await test.step('Verify the player result and ranking state', async () => {
        await expect(page.getByText('Correct', { exact: true })).toBeVisible()
        await expect(page.getByTestId('score-chip')).toBeVisible()
        await expect(page.getByText('1', { exact: true })).toHaveCSS(
          'opacity',
          '1',
        )
      })

      await test.step('Progress to and verify the final game-over state', async () => {
        const podiumPromise = gameHost.waitForEvent(
          GameEventType.GamePodiumHost,
        )

        await gameHost.completeCurrentTask()
        const podium = await podiumPromise

        expect(podium.game.name).toBe(QUIZ_TITLE)
        expect(podium.leaderboard).toEqual([
          expect.objectContaining({
            position: 1,
            nickname: playerNickname,
          }),
        ])

        await expect(page.getByText(QUIZ_TITLE, { exact: true })).toBeVisible()
        await expect(
          page.getByText('out of 1 players', { exact: true }),
        ).toBeVisible()
        await expect(page.locator('#home-button')).toBeVisible()
      })
    } finally {
      gameHost.close()
    }
  })
})
