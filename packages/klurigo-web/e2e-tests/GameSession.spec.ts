import { randomUUID } from 'node:crypto'

import { GameEventType, QuestionType } from '@klurigo/common'
import { expect, test } from '@playwright/test'

import { authenticatePage } from './support/authenticate-page'
import { GamePlayerClient } from './support/game-player-client'

const E2E_USER_PASSWORD = 'Super$ecretPassw0rd123#'
const API_BASE_URL =
  process.env.KLURIGO_SERVICE_PROXY || 'http://localhost:8080/api'

const E2E_HOSTS_BY_PROJECT: Record<
  string,
  { email: string; quizId: string }[]
> = {
  chromium: [
    {
      email: 'tester02@klurigo.com',
      quizId: 'e2e00002-0000-4000-8000-000000000002',
    },
    {
      email: 'tester05@klurigo.com',
      quizId: 'e2e00005-0000-4000-8000-000000000005',
    },
    {
      email: 'tester08@klurigo.com',
      quizId: 'e2e00008-0000-4000-8000-000000000008',
    },
  ],
  firefox: [
    {
      email: 'tester03@klurigo.com',
      quizId: 'e2e00003-0000-4000-8000-000000000003',
    },
    {
      email: 'tester06@klurigo.com',
      quizId: 'e2e00006-0000-4000-8000-000000000006',
    },
    {
      email: 'tester09@klurigo.com',
      quizId: 'e2e00009-0000-4000-8000-000000000009',
    },
  ],
  webkit: [
    {
      email: 'tester04@klurigo.com',
      quizId: 'e2e00004-0000-4000-8000-000000000004',
    },
    {
      email: 'tester07@klurigo.com',
      quizId: 'e2e00007-0000-4000-8000-000000000007',
    },
    {
      email: 'tester10@klurigo.com',
      quizId: 'e2e00010-0000-4000-8000-000000000010',
    },
  ],
}

const QUIZ_TITLE = 'E2E Game Session Quiz'
const QUESTION = 'Which color is associated with a clear daytime sky?'
const CORRECT_ANSWER = 'Blue'
const INCORRECT_ANSWER = 'Green'

test.describe('Game session: host UI with API player', () => {
  test('completes one Classic game with one simulated player', async ({
    page,
  }, testInfo) => {
    const e2eHost =
      E2E_HOSTS_BY_PROJECT[testInfo.project.name]?.[testInfo.repeatEachIndex]
    if (!e2eHost) {
      throw new Error(
        `No seeded E2E user configured for Playwright project ${testInfo.project.name} and repeat ${testInfo.repeatEachIndex}`,
      )
    }

    const playerNickname = `ApiPlayer${randomUUID().slice(0, 8)}`

    await test.step('Authenticate the seeded E2E user', async () => {
      await authenticatePage(
        page,
        API_BASE_URL,
        e2eHost.email,
        E2E_USER_PASSWORD,
      )
      await expect(page).toHaveURL('/')
    })

    await test.step('Open the seeded private Classic quiz', async () => {
      await page.goto(`/quiz/details/${e2eHost.quizId}`)
      await expect(page).toHaveURL(`/quiz/details/${e2eHost.quizId}`)
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

    const gamePlayer = new GamePlayerClient(API_BASE_URL)
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
        await gamePlayer.submitAnswer({
          type: QuestionType.MultiChoice,
          optionIndex: 0,
        })

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
})
