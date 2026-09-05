import { randomUUID } from 'node:crypto'

import {
  type AuthResponseDto,
  type CreateGameResponseDto,
  GameEventType,
  type GameResultPlayerEvent,
  QuestionType,
} from '@klurigo/common'
import { expect, test, type TestInfo } from '@playwright/test'

import { authenticatePage } from './support/authenticate-page'
import { GameHostClient } from './support/game-host-client'
import { GamePlayerClient } from './support/game-player-client'

const E2E_USER_PASSWORD = 'Super$ecretPassw0rd123#'
const API_BASE_URL =
  process.env.KLURIGO_SERVICE_PROXY || 'http://localhost:8080/api'

const E2E_HOSTS_BY_PROJECT: Record<
  string,
  { email: string; quizId: string; lateJoinQuizId: string }[]
> = {
  chromium: [
    {
      email: 'tester02@klurigo.com',
      quizId: 'e2e00002-0000-4000-8000-000000000002',
      lateJoinQuizId: 'e2e10002-0000-4000-8000-000000000002',
    },
    {
      email: 'tester05@klurigo.com',
      quizId: 'e2e00005-0000-4000-8000-000000000005',
      lateJoinQuizId: 'e2e10005-0000-4000-8000-000000000005',
    },
    {
      email: 'tester08@klurigo.com',
      quizId: 'e2e00008-0000-4000-8000-000000000008',
      lateJoinQuizId: 'e2e10008-0000-4000-8000-000000000008',
    },
  ],
  firefox: [
    {
      email: 'tester03@klurigo.com',
      quizId: 'e2e00003-0000-4000-8000-000000000003',
      lateJoinQuizId: 'e2e10003-0000-4000-8000-000000000003',
    },
    {
      email: 'tester06@klurigo.com',
      quizId: 'e2e00006-0000-4000-8000-000000000006',
      lateJoinQuizId: 'e2e10006-0000-4000-8000-000000000006',
    },
    {
      email: 'tester09@klurigo.com',
      quizId: 'e2e00009-0000-4000-8000-000000000009',
      lateJoinQuizId: 'e2e10009-0000-4000-8000-000000000009',
    },
  ],
  webkit: [
    {
      email: 'tester04@klurigo.com',
      quizId: 'e2e00004-0000-4000-8000-000000000004',
      lateJoinQuizId: 'e2e10004-0000-4000-8000-000000000004',
    },
    {
      email: 'tester07@klurigo.com',
      quizId: 'e2e00007-0000-4000-8000-000000000007',
      lateJoinQuizId: 'e2e10007-0000-4000-8000-000000000007',
    },
    {
      email: 'tester10@klurigo.com',
      quizId: 'e2e00010-0000-4000-8000-000000000010',
      lateJoinQuizId: 'e2e10010-0000-4000-8000-000000000010',
    },
  ],
}

const QUIZ_TITLE = 'E2E Game Session Quiz'
const LATE_JOIN_QUIZ_TITLE = 'E2E Late Join Quiz'
const QUESTION = 'Which color is associated with a clear daytime sky?'
const CORRECT_ANSWER = 'Blue'
const INCORRECT_ANSWER = 'Green'
const SECOND_QUESTION = 'Which planet is known as the Red Planet?'

test.describe.configure({ mode: 'serial' })

test.describe('Game session: host UI with API player', () => {
  test('completes one Classic game with one simulated player', async ({
    page,
  }, testInfo) => {
    const e2eHost = getE2EHost(testInfo)
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
    const e2eHost = getE2EHost(testInfo)
    const correctPlayerNickname = `ApiCorrect${randomUUID().slice(0, 8)}`
    const incorrectPlayerNickname = `ApiIncorrect${randomUUID().slice(0, 8)}`

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

    const correctPlayer = new GamePlayerClient(API_BASE_URL)
    const incorrectPlayer = new GamePlayerClient(API_BASE_URL)

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

  test('keeps a late Classic joiner behind a scored player', async ({
    page,
  }, testInfo) => {
    const e2eHost = getE2EHost(testInfo)
    const playerANickname = `ApiEarly${randomUUID().slice(0, 8)}`
    const playerBNickname = `ApiLate${randomUUID().slice(0, 8)}`

    await test.step('Authenticate the seeded E2E user', async () => {
      await authenticatePage(
        page,
        API_BASE_URL,
        e2eHost.email,
        E2E_USER_PASSWORD,
      )
      await expect(page).toHaveURL('/')
    })

    await test.step('Open the seeded two-question Classic quiz', async () => {
      await page.goto(`/quiz/details/${e2eHost.lateJoinQuizId}`)
      await expect(page).toHaveURL(`/quiz/details/${e2eHost.lateJoinQuizId}`)
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

    const playerA = new GamePlayerClient(API_BASE_URL)
    const playerB = new GamePlayerClient(API_BASE_URL)
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
    const e2eHost = getE2EHost(testInfo)
    const playerNickname = `ApiPlayer${randomUUID().slice(0, 8)}`
    const gameHost = new GameHostClient(API_BASE_URL)

    try {
      const createdGame =
        await test.step('Create the game through the public quiz game API', () =>
          createGameThroughPublicApi(e2eHost.email, e2eHost.quizId))

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

function getE2EHost(testInfo: TestInfo): {
  email: string
  quizId: string
  lateJoinQuizId: string
} {
  const e2eHost =
    E2E_HOSTS_BY_PROJECT[testInfo.project.name]?.[testInfo.repeatEachIndex]
  if (!e2eHost) {
    throw new Error(
      `No seeded E2E user configured for Playwright project ${testInfo.project.name} and repeat ${testInfo.repeatEachIndex}`,
    )
  }

  return e2eHost
}

async function createGameThroughPublicApi(
  email: string,
  quizId: string,
): Promise<CreateGameResponseDto> {
  const loginResponse = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: E2E_USER_PASSWORD }),
  })

  if (!loginResponse.ok) {
    throw new Error(`Host login failed with HTTP ${loginResponse.status}`)
  }

  const { accessToken } = (await loginResponse.json()) as AuthResponseDto
  const gameResponse = await fetch(
    `${API_BASE_URL}/quizzes/${encodeURIComponent(quizId)}/games`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    },
  )

  if (!gameResponse.ok) {
    throw new Error(`Game creation failed with HTTP ${gameResponse.status}`)
  }

  return (await gameResponse.json()) as CreateGameResponseDto
}
