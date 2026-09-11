import { randomUUID } from 'node:crypto'

import { GameEventType, GameMode, QuestionType } from '@klurigo/common'
import { expect, test } from '@playwright/test'

import { createGameThroughPublicApi } from '../support/api/create-game-through-public-api'
import { GameHostClient } from '../support/api/game-host-client'
import { interruptActiveGameEventStream } from '../support/browser/interrupt-active-game-event-stream'
import { E2E_API_BASE_URL, E2E_USER_PASSWORD } from '../support/e2e-runtime'
import { getGameSessionFixture } from '../support/fixtures/game-session-fixtures'

test.describe.configure({ mode: 'serial' })

test.describe('Game session: player UI with simulated host', () => {
  test('completes a Classic game with one real player using a simulated host', async ({
    page,
  }, testInfo) => {
    const e2eHost = getGameSessionFixture(testInfo)
    const quiz = e2eHost.quizzes.classic
    const question = quiz.questions[0]
    if (question?.type !== QuestionType.MultiChoice) {
      throw new Error('Expected the seeded question to be multi-choice')
    }
    const correctAnswer = question.options[0]?.value
    const incorrectAnswer = question.options[1]?.value
    if (!correctAnswer || !incorrectAnswer) {
      throw new Error('Expected two seeded multi-choice answers')
    }
    const playerNickname = `ApiPlayer${randomUUID().slice(0, 8)}`
    const gameHost = new GameHostClient(E2E_API_BASE_URL)

    try {
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
        await test.step('Read the real game PIN from the typed host lobby event', () =>
          gameHost.waitForEvent(
            GameEventType.GameLobbyHost,
            (event) => event.game.id === createdGame.id,
          ))
      const gamePIN = lobbyEvent.game.pin
      expect(gamePIN).toMatch(/^[1-9]\d{5}$/)
      expect(lobbyEvent.players).toEqual([])

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
        await hostBeginPromise
        const hostPreview = await hostPreviewPromise
        const hostQuestion = await hostQuestionPromise

        expect(hostPreview).toEqual(
          expect.objectContaining({
            game: { mode: GameMode.Classic, pin: gamePIN },
            question: {
              type: QuestionType.MultiChoice,
              question: question.text,
              points: question.points,
            },
            pagination: { current: 1, total: 1 },
          }),
        )
        expect(hostQuestion.game.pin).toBe(gamePIN)
        expect(hostQuestion.pagination).toEqual({ current: 1, total: 1 })
        expect(hostQuestion.submissions).toEqual({ current: 0, total: 1 })
        expect(hostQuestion.question).toEqual({
          type: QuestionType.MultiChoice,
          question: question.text,
          answers: [{ value: correctAnswer }, { value: incorrectAnswer }],
          duration: question.duration,
        })
        if (hostQuestion.question.type !== QuestionType.MultiChoice) {
          throw new Error('Expected the seeded question to be multi-choice')
        }
        expect(hostQuestion.question.answers).toEqual([
          { value: correctAnswer },
          { value: incorrectAnswer },
        ])

        await expect(
          page.getByText(question.text, { exact: true }),
        ).toBeVisible()
        await expect(page.locator(`[id="0_${correctAnswer}"]`)).toBeVisible()

        await test.step('Recover the player question after a connection interruption', async () => {
          const replacementStreamResponse = page.waitForResponse(
            (response) =>
              response.request().method() === 'GET' &&
              new URL(response.url()).pathname.endsWith('/events') &&
              response.status() === 200,
          )
          await interruptActiveGameEventStream(page)
          await expect(
            page.getByText('Reconnecting', { exact: true }),
          ).toBeVisible()
          await replacementStreamResponse
          await expect(
            page.getByText('Connected', { exact: true }),
          ).toBeVisible()
          await expect(
            page.getByText(question.text, { exact: true }),
          ).toBeVisible()
          await expect(page.locator(`[id="0_${correctAnswer}"]`)).toBeVisible()
        })
      })

      await test.step('Submit the correct answer through the real player UI', async () => {
        const correctAnswerButton = page.locator(`[id="0_${correctAnswer}"]`)
        const hostResultPromise = gameHost.waitForEvent(
          GameEventType.GameResultHost,
          (event) => event.pagination.current === 1,
        )

        await correctAnswerButton.click()
        await expect(correctAnswerButton).toBeDisabled()
        const hostResult = await hostResultPromise
        expect(hostResult).toEqual(
          expect.objectContaining({
            game: { pin: gamePIN },
            question: expect.objectContaining({
              type: QuestionType.MultiChoice,
              question: question.text,
            }),
            pagination: { current: 1, total: 1 },
            results: {
              type: QuestionType.MultiChoice,
              distribution: [
                {
                  index: 0,
                  value: correctAnswer,
                  count: 1,
                  correct: true,
                },
              ],
            },
          }),
        )
      })

      await test.step('Verify the player result and ranking state', async () => {
        await expect(page.getByText('Correct', { exact: true })).toBeVisible()
        await expect(page.getByTestId('score-chip')).toBeVisible()
        await expect(page.getByText('1', { exact: true })).toHaveCSS(
          'opacity',
          '1',
        )

        await page.reload()
        await expect(page.getByText('Correct', { exact: true })).toBeVisible()
        await expect(page.getByTestId('score-chip')).toBeVisible()
      })

      await test.step('Progress to and verify the final game-over state', async () => {
        const podiumPromise = gameHost.waitForEvent(
          GameEventType.GamePodiumHost,
          (event) => event.game.name === quiz.title,
        )

        await gameHost.completeCurrentTask()
        const podium = await podiumPromise

        expect(podium.game.name).toBe(quiz.title)
        expect(podium.leaderboard).toEqual([
          expect.objectContaining({
            position: 1,
            nickname: playerNickname,
          }),
        ])

        await expect(page.getByText(quiz.title, { exact: true })).toBeVisible()
        await expect(
          page.getByText('out of 1 players', { exact: true }),
        ).toBeVisible()
        await expect(page.locator('#home-button')).toBeVisible()

        await page.reload()
        await expect(page.getByText(quiz.title, { exact: true })).toBeVisible()
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
