import { randomUUID } from 'node:crypto'

import { GameEventType, QuestionType } from '@klurigo/common'
import { expect, test } from '@playwright/test'

import { GameHostClient } from '../support/api/game-host-client'
import { GamePlayerClient } from '../support/api/game-player-client'
import { authenticatePageThroughApi } from '../support/browser/authenticate-page-through-api'
import { startHostGame } from '../support/browser/start-host-game'
import { E2E_API_BASE_URL, E2E_USER_PASSWORD } from '../support/e2e-runtime'
import { getGameSessionFixture } from '../support/fixtures/game-session-fixtures'

test.describe.configure({ mode: 'serial' })

test.describe('Game session: Classic late joining', () => {
  test('keeps a late Classic joiner behind a scored player', async ({
    page,
  }, testInfo) => {
    const e2eHost = getGameSessionFixture(testInfo)
    const quiz = e2eHost.quizzes.classicLateJoin
    const firstQuestion = quiz.questions[0]
    const secondQuestion = quiz.questions[1]
    if (
      firstQuestion?.type !== QuestionType.MultiChoice ||
      secondQuestion?.type !== QuestionType.TrueFalse
    ) {
      throw new Error('Expected the seeded late-join questions')
    }
    const correctAnswer = firstQuestion.options[0]?.value
    const incorrectAnswer = firstQuestion.options[1]?.value
    if (!correctAnswer || !incorrectAnswer) {
      throw new Error('Expected two seeded multi-choice answers')
    }
    const playerANickname = `ApiEarly${randomUUID().slice(0, 8)}`
    const playerBNickname = `ApiLate${randomUUID().slice(0, 8)}`

    await test.step('Authenticate the seeded E2E user', async () => {
      await authenticatePageThroughApi(page, e2eHost.email)
      await expect(page).toHaveURL('/')
    })

    await test.step('Open the seeded two-question Classic quiz', async () => {
      await page.goto(`/quiz/details/${quiz.id}`)
      await expect(page).toHaveURL(`/quiz/details/${quiz.id}`)
      await expect(page.getByText(quiz.title, { exact: true })).toBeVisible()
    })

    const gamePIN = await test.step('Create and open the host game', () =>
      startHostGame(page))

    const playerA = new GamePlayerClient(E2E_API_BASE_URL)
    const playerB = new GamePlayerClient(E2E_API_BASE_URL)
    const gameHost = new GameHostClient(E2E_API_BASE_URL)

    try {
      const playerAGameId =
        await test.step('Join Player A before the game starts', async () => {
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
              event.players.some(
                ({ nickname }) => nickname === playerANickname,
              ),
          )
          const identity = await playerA.authenticateAndJoin(
            { gamePIN },
            playerANickname,
          )
          expect(identity.gameId).toBe(hostIdentity.gameId)
          expect(identity.gameId).toMatch(
            /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
          )
          await playerA.connect()
          await joinedLobbyPromise
          await expect(
            page.getByText(playerANickname, { exact: true }),
          ).toBeVisible()
          return identity.gameId
        })

      await test.step('Start the game and receive question 1', async () => {
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
        const questionPromise = playerA.waitForEvent(
          GameEventType.GameQuestionPlayer,
          (event) => event.pagination.current === 1,
        )

        await page.locator('#start-game-button').click()
        await hostBeginPromise
        const hostPreview = await hostPreviewPromise
        const hostQuestion = await hostQuestionPromise
        const question = await questionPromise

        expect(hostPreview.pagination).toEqual({ current: 1, total: 2 })
        expect(hostPreview.question).toEqual({
          type: QuestionType.MultiChoice,
          question: firstQuestion.text,
          points: firstQuestion.points,
        })
        expect(hostQuestion.submissions).toEqual({ current: 0, total: 1 })
        expect(hostQuestion.pagination).toEqual({ current: 1, total: 2 })
        expect(hostQuestion.question).toEqual({
          type: QuestionType.MultiChoice,
          question: firstQuestion.text,
          answers: [{ value: correctAnswer }, { value: incorrectAnswer }],
          duration: firstQuestion.duration,
        })
        await expect(
          page.getByText(firstQuestion.text, { exact: true }),
        ).toBeVisible()
        expect(question.pagination.total).toBe(2)
        if (question.question.type !== QuestionType.MultiChoice) {
          throw new Error('Expected question 1 to be multi-choice')
        }
        expect(question.question.answers).toEqual([
          { value: correctAnswer },
          { value: incorrectAnswer },
        ])
      })

      await test.step('Submit Player A answer and wait for question 1 result', async () => {
        const resultPromise = playerA.waitForEvent(
          GameEventType.GameResultPlayer,
          (event) =>
            event.pagination.current === 1 &&
            event.player.nickname === playerANickname,
        )
        const hostResultPromise = gameHost.waitForEvent(
          GameEventType.GameResultHost,
          (event) => event.pagination.current === 1,
        )

        await playerA.submitAnswer({
          type: QuestionType.MultiChoice,
          optionIndex: 0,
        })
        const [result, hostResult] = await Promise.all([
          resultPromise,
          hostResultPromise,
        ])

        expect(hostResult.results).toEqual({
          type: QuestionType.MultiChoice,
          distribution: [
            { index: 0, value: correctAnswer, count: 1, correct: true },
          ],
        })
        expect(result.player.score.correct).toBe(true)
        await expect(page.getByTestId('question-results')).toBeVisible()
      })

      const lateJoin =
        await test.step('Connect Player B after question 1 and register the late-join result', async () => {
          const identity = await playerB.authenticateAndJoin(
            { gamePIN },
            playerBNickname,
          )
          expect(identity.gameId).toBe(playerAGameId)

          await playerB.connect()
          return playerB.waitForEvent(
            GameEventType.GameResultPlayer,
            (event) =>
              event.pagination.current === 1 &&
              event.player.nickname === playerBNickname,
          )
        })

      await test.step('Assert Player B starts with zero points in second place', async () => {
        const lateJoinResult = await lateJoin

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
        const leaderboardPromise = gameHost.waitForEvent(
          GameEventType.GameLeaderboardHost,
          (event) => event.pagination.current === 1,
        )
        await page.locator('#next-button').click()
        const leaderboard = await leaderboardPromise
        expect(
          leaderboard.leaderboard.map(({ nickname, position, score }) => ({
            nickname,
            position,
            score,
          })),
        ).toEqual([
          {
            nickname: playerANickname,
            position: 1,
            score: expect.any(Number),
          },
          { nickname: playerBNickname, position: 2, score: 0 },
        ])
        expect(leaderboard.leaderboard[0].score).toBeGreaterThan(0)
        expect(leaderboard.leaderboard[0].score).toBeLessThanOrEqual(1000)
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

      await test.step('Progress the True/False question 2 to the final podium', async () => {
        const hostQuestionPromise = gameHost.waitForEvent(
          GameEventType.GameQuestionHost,
          (event) => event.pagination.current === 2,
        )
        const playerAQuestionPromise = playerA.waitForEvent(
          GameEventType.GameQuestionPlayer,
          (event) => event.pagination.current === 2,
        )
        const playerBQuestionPromise = playerB.waitForEvent(
          GameEventType.GameQuestionPlayer,
          (event) => event.pagination.current === 2,
        )

        await page.locator('#next-button').click()
        const hostQuestion = await hostQuestionPromise
        const [playerAQuestion, playerBQuestion] = await Promise.all([
          playerAQuestionPromise,
          playerBQuestionPromise,
        ])
        expect(hostQuestion.pagination).toEqual({ current: 2, total: 2 })
        expect(hostQuestion.submissions).toEqual({ current: 0, total: 2 })
        expect(hostQuestion.question).toEqual({
          type: QuestionType.TrueFalse,
          question: secondQuestion.text,
          duration: secondQuestion.duration,
        })

        await expect(
          page.getByText(secondQuestion.text, { exact: true }),
        ).toBeVisible()
        for (const question of [playerAQuestion, playerBQuestion]) {
          expect(question.pagination).toEqual({ current: 2, total: 2 })
          expect(question.question).toEqual({
            type: QuestionType.TrueFalse,
            question: secondQuestion.text,
            duration: secondQuestion.duration,
          })
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
        const hostResultPromise = gameHost.waitForEvent(
          GameEventType.GameResultHost,
          (event) => event.pagination.current === 2,
        )
        await expect(page.locator('#skip-button')).toBeVisible()
        await page.locator('#skip-button').click()
        const [playerAResult, playerBResult, hostResult] = await Promise.all([
          playerAResultPromise,
          playerBResultPromise,
          hostResultPromise,
        ])

        expect(hostResult.results).toEqual({
          type: secondQuestion.type,
          distribution: [
            { value: secondQuestion.correct, count: 0, correct: true },
          ],
        })
        expect(playerAResult.player.score).toEqual(
          expect.objectContaining({ correct: false, last: 0 }),
        )
        expect(playerBResult.player.score).toEqual({
          correct: false,
          last: 0,
          total: 0,
          position: 2,
          streak: 0,
        })
        await expect(page.getByTestId('question-results')).toBeVisible()

        const podiumPromise = gameHost.waitForEvent(
          GameEventType.GamePodiumHost,
          (event) => event.game.name === quiz.title,
        )
        const playerAGameOverPromise = playerA.waitForEvent(
          GameEventType.GameOverPlayer,
          (event) => event.player.nickname === playerANickname,
        )
        const playerBGameOverPromise = playerB.waitForEvent(
          GameEventType.GameOverPlayer,
          (event) => event.player.nickname === playerBNickname,
        )
        await page.locator('#next-button').click()
        const [playerAGameOver, playerBGameOver, podium] = await Promise.all([
          playerAGameOverPromise,
          playerBGameOverPromise,
          podiumPromise,
        ])
        expect(podium.game.name).toBe(quiz.title)
        expect(podium.leaderboard).toEqual([
          expect.objectContaining({ nickname: playerANickname, position: 1 }),
          expect.objectContaining({ nickname: playerBNickname, position: 2 }),
        ])
        expect(playerAGameOver.player).toEqual(
          expect.objectContaining({
            nickname: playerANickname,
            rank: 1,
            totalPlayers: 2,
          }),
        )
        expect(playerBGameOver.player).toEqual(
          expect.objectContaining({
            nickname: playerBNickname,
            rank: 2,
            totalPlayers: 2,
          }),
        )
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
      gameHost.close()
      playerA.close()
      playerB.close()
    }
  })
})
