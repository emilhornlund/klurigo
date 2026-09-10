import { randomUUID } from 'node:crypto'

import { GameEventType, QuestionType } from '@klurigo/common'
import { E2E_FIXTURE_MANIFEST } from '@klurigo/e2e-fixtures'
import { expect, test } from '@playwright/test'

import { GameHostClient } from '../support/api/game-host-client'
import { GamePlayerClient } from '../support/api/game-player-client'
import { authenticatePageThroughApi } from '../support/browser/authenticate-page-through-api'
import { startHostGame } from '../support/browser/start-host-game'
import { E2E_API_BASE_URL, E2E_USER_PASSWORD } from '../support/e2e-runtime'
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

    const gameHost = new GameHostClient(E2E_API_BASE_URL)
    const gamePlayer = new GamePlayerClient(E2E_API_BASE_URL)
    try {
      await test.step('Join and connect the simulated player', async () => {
        const hostIdentity = await gameHost.authenticate(
          { email: e2eHost.email, password: E2E_USER_PASSWORD },
          { gamePIN },
        )
        await gameHost.connect()
        await gameHost.waitForEvent(
          GameEventType.GameLobbyHost,
          (event) => event.game.pin === gamePIN && event.players.length === 0,
        )
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
        await joinedLobbyPromise
        await expect(
          page.getByText(playerNickname, { exact: true }),
        ).toBeVisible()
      })

      await test.step('Start the game and receive the player question', async () => {
        const hostBeginPromise = gameHost.waitForEvent(
          GameEventType.GameBeginHost,
        )
        const hostPreviewPromise = gameHost.waitForEvent(
          GameEventType.GameQuestionPreviewHost,
          (event) => event.pagination.current === 1,
        )
        const hostQuestionPromise = gameHost.waitForEvent(
          GameEventType.GameQuestionHost,
          (event) => event.pagination.current === 1,
        )
        const playerQuestionPromise = gamePlayer.waitForEvent(
          GameEventType.GameQuestionPlayer,
        )

        await page.locator('#start-game-button').click()
        await hostBeginPromise
        const hostPreview = await hostPreviewPromise
        const hostQuestion = await hostQuestionPromise
        const playerQuestion = await playerQuestionPromise

        expect(playerQuestion.pagination).toEqual({ current: 1, total: 1 })
        expect(playerQuestion.player).toEqual({
          nickname: playerNickname,
          score: { total: 0 },
        })
        expect(hostPreview.question).toEqual({
          type: QuestionType.MultiChoice,
          question: QUESTION,
          points: 1000,
        })
        expect(hostPreview.pagination).toEqual({ current: 1, total: 1 })
        expect(hostQuestion.question).toEqual({
          type: QuestionType.MultiChoice,
          question: QUESTION,
          answers: [{ value: CORRECT_ANSWER }, { value: INCORRECT_ANSWER }],
          duration: 30,
        })
        expect(hostQuestion.submissions).toEqual({ current: 0, total: 1 })
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
        const hostResultPromise = gameHost.waitForEvent(
          GameEventType.GameResultHost,
          (event) => event.pagination.current === 1,
        )

        await gamePlayer.submitAnswer({
          type: QuestionType.MultiChoice,
          optionIndex: 0,
        })
        const [playerResult, hostResult] = await Promise.all([
          playerResultPromise,
          hostResultPromise,
        ])
        expect(playerResult.player.score).toEqual(
          expect.objectContaining({ correct: true, last: expect.any(Number) }),
        )
        expect(hostResult.results).toEqual({
          type: QuestionType.MultiChoice,
          distribution: [
            { index: 0, value: CORRECT_ANSWER, count: 1, correct: true },
          ],
        })

        const questionResults = page.getByTestId('question-results')
        await expect(questionResults).toBeVisible()
        await expect(questionResults).toContainText(CORRECT_ANSWER)
      })

      await test.step('Progress to and verify the final podium', async () => {
        const gameOverPromise = gamePlayer.waitForEvent(
          GameEventType.GameOverPlayer,
          (event) => event.player.nickname === playerNickname,
        )
        const podiumPromise = gameHost.waitForEvent(
          GameEventType.GamePodiumHost,
        )
        await page.locator('#next-button').click()
        const [gameOver, podium] = await Promise.all([
          gameOverPromise,
          podiumPromise,
        ])
        expect(podium.game.name).toBe(QUIZ_TITLE)
        expect(podium.leaderboard).toEqual([
          expect.objectContaining({ position: 1, nickname: playerNickname }),
        ])
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
      gameHost.close()
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

    const gameHost = new GameHostClient(E2E_API_BASE_URL)
    const correctPlayer = new GamePlayerClient(E2E_API_BASE_URL)
    const incorrectPlayer = new GamePlayerClient(E2E_API_BASE_URL)

    try {
      await test.step('Join and connect both simulated players', async () => {
        const hostIdentity = await gameHost.authenticate(
          { email: e2eHost.email, password: E2E_USER_PASSWORD },
          { gamePIN },
        )
        await gameHost.connect()
        await gameHost.waitForEvent(
          GameEventType.GameLobbyHost,
          (event) => event.game.pin === gamePIN && event.players.length === 0,
        )
        const joinedLobbyPromise = gameHost.waitForEvent(
          GameEventType.GameLobbyHost,
          (event) => event.players.length === 2,
        )
        const [correctIdentity, incorrectIdentity] = await Promise.all([
          correctPlayer.authenticateAndJoin({ gamePIN }, correctPlayerNickname),
          incorrectPlayer.authenticateAndJoin(
            { gamePIN },
            incorrectPlayerNickname,
          ),
        ])
        expect(correctIdentity.gameId).toBe(hostIdentity.gameId)

        expect(correctIdentity.gameId).toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
        )
        expect(incorrectIdentity.gameId).toBe(correctIdentity.gameId)

        await Promise.all([correctPlayer.connect(), incorrectPlayer.connect()])
        const joinedLobby = await joinedLobbyPromise
        expect(
          joinedLobby.players.map(({ nickname }) => nickname).sort(),
        ).toEqual([correctPlayerNickname, incorrectPlayerNickname].sort())
        await expect(
          page.getByText(correctPlayerNickname, { exact: true }),
        ).toBeVisible()
        await expect(
          page.getByText(incorrectPlayerNickname, { exact: true }),
        ).toBeVisible()
      })

      await test.step('Start the game and receive both player questions', async () => {
        const hostBeginPromise = gameHost.waitForEvent(
          GameEventType.GameBeginHost,
        )
        const hostPreviewPromise = gameHost.waitForEvent(
          GameEventType.GameQuestionPreviewHost,
          (event) => event.pagination.current === 1,
        )
        const hostQuestionPromise = gameHost.waitForEvent(
          GameEventType.GameQuestionHost,
          (event) => event.pagination.current === 1,
        )
        const correctQuestionPromise = correctPlayer.waitForEvent(
          GameEventType.GameQuestionPlayer,
          (event) => event.pagination.current === 1,
        )
        const incorrectQuestionPromise = incorrectPlayer.waitForEvent(
          GameEventType.GameQuestionPlayer,
          (event) => event.pagination.current === 1,
        )

        await page.locator('#start-game-button').click()
        await hostBeginPromise
        const hostPreview = await hostPreviewPromise
        const hostQuestion = await hostQuestionPromise
        const [correctQuestion, incorrectQuestion] = await Promise.all([
          correctQuestionPromise,
          incorrectQuestionPromise,
        ])

        expect(correctQuestion.pagination).toEqual({ current: 1, total: 1 })
        expect(incorrectQuestion.pagination).toEqual({ current: 1, total: 1 })
        expect(correctQuestion.player).toEqual({
          nickname: correctPlayerNickname,
          score: { total: 0 },
        })
        expect(incorrectQuestion.player).toEqual({
          nickname: incorrectPlayerNickname,
          score: { total: 0 },
        })
        expect(hostPreview.question).toEqual({
          type: QuestionType.MultiChoice,
          question: QUESTION,
          points: 1000,
        })
        expect(hostQuestion.question).toEqual({
          type: QuestionType.MultiChoice,
          question: QUESTION,
          answers: [{ value: CORRECT_ANSWER }, { value: INCORRECT_ANSWER }],
          duration: 30,
        })
        expect(hostQuestion.submissions).toEqual({ current: 0, total: 2 })
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
        const hostResultPromise = gameHost.waitForEvent(
          GameEventType.GameResultHost,
          (event) => event.pagination.current === 1,
        )
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
        const hostResult = await hostResultPromise
        expect(correctResult.player.score.correct).toBe(true)
        expect(incorrectResult.player.score.correct).toBe(false)
        expect(hostResult.results).toEqual({
          type: QuestionType.MultiChoice,
          distribution: [
            {
              index: 0,
              value: CORRECT_ANSWER,
              count: 1,
              correct: true,
            },
            {
              index: 1,
              value: INCORRECT_ANSWER,
              count: 1,
              correct: false,
            },
          ],
        })
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
        const correctGameOverPromise = correctPlayer.waitForEvent(
          GameEventType.GameOverPlayer,
          (event) => event.player.nickname === correctPlayerNickname,
        )
        const incorrectGameOverPromise = incorrectPlayer.waitForEvent(
          GameEventType.GameOverPlayer,
          (event) => event.player.nickname === incorrectPlayerNickname,
        )
        const podiumPromise = gameHost.waitForEvent(
          GameEventType.GamePodiumHost,
        )
        await page.locator('#next-button').click()
        const [correctGameOver, incorrectGameOver, podium] = await Promise.all([
          correctGameOverPromise,
          incorrectGameOverPromise,
          podiumPromise,
        ])
        expect(podium.game.name).toBe(QUIZ_TITLE)
        expect(
          podium.leaderboard.map(({ nickname, position }) => ({
            nickname,
            position,
          })),
        ).toEqual([
          { nickname: correctPlayerNickname, position: 1 },
          { nickname: incorrectPlayerNickname, position: 2 },
        ])
        expect(correctGameOver.player).toEqual(
          expect.objectContaining({
            nickname: correctPlayerNickname,
            rank: 1,
            totalPlayers: 2,
          }),
        )
        expect(incorrectGameOver.player).toEqual(
          expect.objectContaining({
            nickname: incorrectPlayerNickname,
            rank: 2,
            totalPlayers: 2,
          }),
        )
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
      gameHost.close()
      correctPlayer.close()
      incorrectPlayer.close()
    }
  })
})
