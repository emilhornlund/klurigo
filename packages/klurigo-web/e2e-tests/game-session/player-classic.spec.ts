import { randomUUID } from 'node:crypto'

import { GameEventType, QuestionType } from '@klurigo/common'
import { E2E_FIXTURE_MANIFEST } from '@klurigo/e2e-fixtures'
import { expect, test } from '@playwright/test'

import { createGameThroughPublicApi } from '../support/api/create-game-through-public-api'
import { GameHostClient } from '../support/api/game-host-client'
import { E2E_API_BASE_URL, E2E_USER_PASSWORD } from '../support/e2e-runtime'
import { getGameSessionFixture } from '../support/fixtures/game-session-fixtures'

test.describe.configure({ mode: 'serial' })

test.describe('Game session: player UI with simulated host', () => {
  const QUIZ_TITLE = E2E_FIXTURE_MANIFEST.users.tester02.quizzes.classic.title
  const QUESTION = E2E_FIXTURE_MANIFEST.questions.clearDaytimeSky.text
  const CORRECT_ANSWER =
    E2E_FIXTURE_MANIFEST.questions.clearDaytimeSky.options[0].value
  const INCORRECT_ANSWER =
    E2E_FIXTURE_MANIFEST.questions.clearDaytimeSky.options[1].value

  test('completes a Classic game with one real player using a simulated host', async ({
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
