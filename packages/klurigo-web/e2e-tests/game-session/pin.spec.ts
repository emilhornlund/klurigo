import { randomUUID } from 'node:crypto'

import { GameEventType, GameMode, QuestionType } from '@klurigo/common'
import { expect } from '@playwright/test'

import { createGameThroughPublicApi } from '../support/api/create-game-through-public-api'
import { authenticatePageThroughApi } from '../support/browser/authenticate-page-through-api'
import { startHostGame } from '../support/browser/start-host-game'
import { E2E_API_BASE_URL, E2E_USER_PASSWORD } from '../support/e2e-runtime'
import { test } from '../support/fixtures/game-session-fixtures'

test.describe.configure({ mode: 'serial' })

test.describe('Game session: Classic Pin', () => {
  test('completes a Classic Pin game with one simulated player', async ({
    page,
    gameSessionFixture,
    gameHost,
    createGamePlayer,
  }) => {
    const e2eHost = gameSessionFixture
    const quiz = e2eHost.quizzes.classicPin
    const question = quiz.questions[0]
    if (question?.type !== QuestionType.Pin) {
      throw new Error('Expected the seeded question to be Pin')
    }
    const playerNickname = `ApiPin${randomUUID().slice(0, 8)}`
    const gamePlayer = createGamePlayer()

    await test.step('Authenticate the seeded E2E user', async () => {
      await authenticatePageThroughApi(page, e2eHost.email)
      await expect(page).toHaveURL('/')
    })

    await test.step('Open the seeded Pin Classic quiz', async () => {
      await page.goto(`/quiz/details/${quiz.id}`)
      await expect(page).toHaveURL(`/quiz/details/${quiz.id}`)
      await expect(page.getByText(quiz.title, { exact: true })).toBeVisible()
    })

    const gamePIN = await test.step('Create and open the host game', () =>
      startHostGame(page))

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
        question: question.text,
        points: question.points,
      })
      expect(hostQuestion.question).toEqual({
        type: QuestionType.Pin,
        question: question.text,
        imageURL: question.imageURL,
        duration: question.duration,
      })
      expect(hostQuestion.submissions).toEqual({ current: 0, total: 1 })
      await expect(page.getByText(question.text, { exact: true })).toBeVisible()
      expect(playerQuestion.pagination).toEqual({ current: 1, total: 1 })
      expect(playerQuestion.player).toEqual({
        nickname: playerNickname,
        score: { total: 0 },
      })
      expect(playerQuestion.question).toEqual({
        type: QuestionType.Pin,
        question: question.text,
        imageURL: question.imageURL,
        duration: question.duration,
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
        positionX: question.positionX,
        positionY: question.positionY,
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
            question: question.text,
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
          imageURL: question.imageURL,
          positionX: question.positionX,
          positionY: question.positionY,
          tolerance: question.tolerance,
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
        question.imageURL,
      )
      await expect(pinResults.locator('svg')).toHaveCount(2)
      await expect(pinResults.getByTestId('pin-tolerance')).toHaveCount(1)
    })

    await test.step('Progress to and verify the final podium', async () => {
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
        expect.objectContaining({ position: 1, nickname: playerNickname }),
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
      await expect(page.getByText(quiz.title, { exact: true })).toBeVisible()
      await expect(
        page.getByText(playerNickname, { exact: true }),
      ).toBeVisible()
    })
  })

  test('completes a Classic Pin game through the real player UI on a constrained viewport', async ({
    page,
    gameSessionFixture,
    gameHost,
  }) => {
    const e2eHost = gameSessionFixture
    const quiz = e2eHost.quizzes.classicPin
    const question = quiz.questions[0]
    if (question?.type !== QuestionType.Pin) {
      throw new Error('Expected the seeded question to be Pin')
    }
    const playerNickname = `UiPin${randomUUID().slice(0, 8)}`
    await page.setViewportSize({ width: 667, height: 375 })

    const createdGame =
      await test.step('Create the game through the public quiz game API', () =>
        createGameThroughPublicApi({
          apiBaseUrl: E2E_API_BASE_URL,
          email: e2eHost.email,
          password: E2E_USER_PASSWORD,
          quizId: quiz.id,
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
      await test.step('Read the real game PIN from the host lobby event', () =>
        gameHost.waitForEvent(
          GameEventType.GameLobbyHost,
          (event) => event.game.id === createdGame.id,
        ))
    const gamePIN = lobbyEvent.game.pin

    await test.step('Join through the real player UI', async () => {
      const joinedPlayerPromise = gameHost.waitForEvent(
        GameEventType.GameLobbyHost,
        (event) =>
          event.players.some(({ nickname }) => nickname === playerNickname),
      )

      await page.goto(`/auth/game?pin=${encodeURIComponent(gamePIN)}`)
      await expect(page).toHaveURL('/join')
      await page.locator('#default-nickname-textfield').fill(playerNickname)
      await page.locator('#join').click()
      await expect(page).toHaveURL('/game')
      await expect(
        page.getByText('You’re in the waiting room', { exact: true }),
      ).toBeVisible()
      await joinedPlayerPromise
    })

    await test.step('Start and reach the Pin question', async () => {
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

      await gameHost.completeCurrentTask()
      await Promise.all([
        hostBeginPromise,
        hostPreviewPromise,
        hostQuestionPromise,
      ])
      await expect(page.getByText(question.text, { exact: true })).toBeVisible()
    })

    const pinImage = page.locator(`img[src="${question.imageURL}"]`)
    const submitButton = page.getByRole('button', { name: 'Submit My Pin' })
    await test.step('Verify the Pin interaction is reachable', async () => {
      await expect(pinImage).toBeVisible()
      await expect(submitButton).toBeVisible()

      const geometry = await submitButton.evaluate((element) => {
        const answer = element.closest('[data-testid="pin-answer"]')
        if (!answer) {
          throw new Error('Submit button is outside the Pin answer')
        }

        const buttonRect = element.getBoundingClientRect()
        const answerRect = answer.getBoundingClientRect()
        return {
          button: {
            top: buttonRect.top,
            bottom: buttonRect.bottom,
            height: buttonRect.height,
          },
          answer: {
            top: answerRect.top,
            bottom: answerRect.bottom,
          },
          answerOverflow: getComputedStyle(answer).overflow,
        }
      })

      expect(geometry.button.height).toBeGreaterThan(0)
      expect(geometry.button.top).toBeGreaterThanOrEqual(geometry.answer.top)
      expect(geometry.button.bottom).toBeLessThanOrEqual(
        geometry.answer.bottom + 1,
      )
      expect(geometry.answerOverflow).not.toBe('hidden')

      await submitButton.scrollIntoViewIfNeeded()
      await expect(submitButton).toBeInViewport({ ratio: 1 })
    })

    await test.step('Move the Pin and submit through the player UI', async () => {
      const pinOverlay = page.getByTestId('pin-overlay')
      const overlayBox = await pinOverlay.boundingBox()
      if (!overlayBox) {
        throw new Error('Pin overlay has no usable geometry')
      }

      await page.mouse.move(
        overlayBox.x + overlayBox.width * 0.5,
        overlayBox.y + overlayBox.height * 0.5,
      )
      await page.mouse.down()
      await page.mouse.move(
        overlayBox.x + overlayBox.width * question.positionX,
        overlayBox.y + overlayBox.height * question.positionY,
      )
      await page.mouse.up()

      const hostResultPromise = gameHost.waitForEvent(
        GameEventType.GameResultHost,
        (event) => event.pagination.current === 1,
      )
      await submitButton.click()
      const hostResult = await hostResultPromise
      expect(hostResult.results).toEqual(
        expect.objectContaining({
          type: QuestionType.Pin,
          positionX: question.positionX,
          positionY: question.positionY,
        }),
      )
      await expect(page.getByText('Correct', { exact: true })).toBeVisible()
    })

    await test.step('Progress to the player game-over state', async () => {
      const podiumPromise = gameHost.waitForEvent(
        GameEventType.GamePodiumHost,
        (event) => event.game.name === quiz.title,
      )
      await gameHost.completeCurrentTask()
      await podiumPromise
      await expect(page.getByText(quiz.title, { exact: true })).toBeVisible()
    })
  })
})
