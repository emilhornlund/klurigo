import { randomUUID } from 'node:crypto'

import { GameEventType, GameMode, QuestionType } from '@klurigo/common'
import { E2E_FIXTURE_MANIFEST } from '@klurigo/e2e-fixtures'
import { expect, test } from '@playwright/test'

import { GameHostClient } from '../support/api/game-host-client'
import { GamePlayerClient } from '../support/api/game-player-client'
import { authenticatePageThroughApi } from '../support/browser/authenticate-page-through-api'
import { startHostGame } from '../support/browser/start-host-game'
import { E2E_API_BASE_URL, E2E_USER_PASSWORD } from '../support/e2e-runtime'
import { getGameSessionFixture } from '../support/fixtures/game-session-fixtures'

test.describe.configure({ mode: 'serial' })

test.describe('Game session: Classic Pin', () => {
  const QUIZ_TITLE =
    E2E_FIXTURE_MANIFEST.users.tester02.quizzes.classicPin.title
  const QUESTION = E2E_FIXTURE_MANIFEST.questions.coordinatesOfEiffelTower

  test('completes a Classic Pin game with one simulated player', async ({
    page,
  }, testInfo) => {
    const e2eHost = getGameSessionFixture(testInfo)
    const playerNickname = `ApiPin${randomUUID().slice(0, 8)}`
    const gamePlayer = new GamePlayerClient(E2E_API_BASE_URL)

    await test.step('Authenticate the seeded E2E user', async () => {
      await authenticatePageThroughApi(page, e2eHost.email)
      await expect(page).toHaveURL('/')
    })

    await test.step('Open the seeded Pin Classic quiz', async () => {
      await page.goto(`/quiz/details/${e2eHost.quizzes.classicPin.id}`)
      await expect(page).toHaveURL(
        `/quiz/details/${e2eHost.quizzes.classicPin.id}`,
      )
      await expect(page.getByText(QUIZ_TITLE, { exact: true })).toBeVisible()
    })

    const gamePIN = await test.step('Create and open the host game', () =>
      startHostGame(page))

    const gameHost = new GameHostClient(E2E_API_BASE_URL)
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

      await test.step('Start the game and verify the typed Pin question', async () => {
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
          (event) => event.pagination.current === 1,
        )

        await page.locator('#start-game-button').click()
        await hostBeginPromise
        const hostPreview = await hostPreviewPromise
        const hostQuestion = await hostQuestionPromise
        const playerQuestion = await playerQuestionPromise

        expect(hostPreview).toEqual(
          expect.objectContaining({
            game: { mode: GameMode.Classic, pin: gamePIN },
            pagination: { current: 1, total: 1 },
          }),
        )
        expect(hostPreview.question).toEqual({
          type: QuestionType.Pin,
          question: QUESTION.text,
          points: QUESTION.points,
        })
        expect(hostQuestion.question).toEqual({
          type: QuestionType.Pin,
          question: QUESTION.text,
          imageURL: QUESTION.imageURL,
          duration: QUESTION.duration,
        })
        expect(hostQuestion.submissions).toEqual({ current: 0, total: 1 })
        await expect(
          page.getByText(QUESTION.text, { exact: true }),
        ).toBeVisible()
        expect(playerQuestion.pagination).toEqual({ current: 1, total: 1 })
        expect(playerQuestion.player).toEqual({
          nickname: playerNickname,
          score: { total: 0 },
        })
        expect(playerQuestion.question).toEqual({
          type: QuestionType.Pin,
          question: QUESTION.text,
          imageURL: QUESTION.imageURL,
          duration: QUESTION.duration,
        })
      })

      await test.step('Submit the correct normalized coordinates and verify the player result', async () => {
        const playerResultPromise = gamePlayer.waitForEvent(
          GameEventType.GameResultPlayer,
          (event) =>
            event.pagination.current === 1 &&
            event.player.nickname === playerNickname,
        )
        const hostResultPromise = gameHost.waitForEvent(
          GameEventType.GameResultHost,
          (event) => event.pagination.current === 1,
        )

        await gamePlayer.submitAnswer({
          type: QuestionType.Pin,
          positionX: QUESTION.positionX,
          positionY: QUESTION.positionY,
        })
        const [playerResult, hostResult] = await Promise.all([
          playerResultPromise,
          hostResultPromise,
        ])

        expect(hostResult).toEqual(
          expect.objectContaining({
            game: { pin: gamePIN },
            question: expect.objectContaining({
              type: QuestionType.Pin,
              question: QUESTION.text,
            }),
            pagination: { current: 1, total: 1 },
          }),
        )
        if (hostResult.results.type !== QuestionType.Pin) {
          throw new Error('Expected Pin result payload')
        }
        expect(hostResult.results).toEqual(
          expect.objectContaining({
            type: QuestionType.Pin,
            imageURL: QUESTION.imageURL,
            positionX: QUESTION.positionX,
            positionY: QUESTION.positionY,
            tolerance: QUESTION.tolerance,
          }),
        )
        expect(hostResult.results.distribution).toEqual([
          expect.objectContaining({ count: 1, correct: true }),
        ])
        expect(playerResult.game.mode).toBe(GameMode.Classic)
        expect(playerResult.player.score).toEqual(
          expect.objectContaining({
            correct: true,
            last: expect.any(Number),
            total: expect.any(Number),
            position: 1,
            streak: 1,
          }),
        )
      })

      await test.step('Verify the host Pin result visualization and distribution', async () => {
        const pinResults = page.getByTestId('pin-question-results')
        await expect(pinResults).toBeVisible()
        await expect(pinResults.locator('img')).toHaveAttribute(
          'src',
          QUESTION.imageURL,
        )
        await expect(pinResults.locator('svg')).toHaveCount(2)
        await expect(pinResults.locator('[class*="tolerance"]')).toHaveCount(1)
      })

      await test.step('Progress to and verify the final podium', async () => {
        const gameOverPromise = gamePlayer.waitForEvent(
          GameEventType.GameOverPlayer,
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
        expect(gameOver.game.mode).toBe(GameMode.Classic)
        expect(gameOver.quiz).toEqual({
          id: e2eHost.quizzes.classicPin.id,
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
      gameHost.close()
      gamePlayer.close()
    }
  })
})
