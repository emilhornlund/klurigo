import { randomUUID } from 'node:crypto'

import { GameEventType, GameMode, QuestionType } from '@klurigo/common'
import { expect, test } from '@playwright/test'

import { GameHostClient } from '../support/api/game-host-client'
import { GamePlayerClient } from '../support/api/game-player-client'
import { authenticatePageThroughApi } from '../support/browser/authenticate-page-through-api'
import { startHostGame } from '../support/browser/start-host-game'
import { E2E_API_BASE_URL, E2E_USER_PASSWORD } from '../support/e2e-runtime'
import { getGameSessionFixture } from '../support/fixtures/game-session-fixtures'

test.describe.configure({ mode: 'serial' })

test.describe('Game session: Zero to One Hundred', () => {
  test('completes a Zero to One Hundred game with two simulated players', async ({
    page,
  }, testInfo) => {
    const e2eHost = getGameSessionFixture(testInfo)
    const quiz = e2eHost.quizzes.zeroToOneHundred
    const question = quiz.questions[0]
    if (question?.type !== QuestionType.Range) {
      throw new Error('Expected the seeded question to be range')
    }
    const exactAnswer = question.correct
    const approximateAnswer = 75
    const precisePlayerNickname = `ApiPrecise${randomUUID().slice(0, 8)}`
    const approximatePlayerNickname = `ApiApprox${randomUUID().slice(0, 8)}`

    await test.step('Authenticate the seeded E2E user', async () => {
      await authenticatePageThroughApi(page, e2eHost.email)
      await expect(page).toHaveURL('/')
    })

    await test.step('Open the seeded Zero to One Hundred quiz', async () => {
      await page.goto(`/quiz/details/${quiz.id}`)
      await expect(page).toHaveURL(`/quiz/details/${quiz.id}`)
      await expect(page.getByText(quiz.title, { exact: true })).toBeVisible()
    })

    const gamePIN = await test.step('Create and open the host game', () =>
      startHostGame(page))

    const precisePlayer = new GamePlayerClient(E2E_API_BASE_URL)
    const approximatePlayer = new GamePlayerClient(E2E_API_BASE_URL)
    const gameHost = new GameHostClient(E2E_API_BASE_URL)

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
        const [preciseIdentity, approximateIdentity] = await Promise.all([
          precisePlayer.authenticateAndJoin({ gamePIN }, precisePlayerNickname),
          approximatePlayer.authenticateAndJoin(
            { gamePIN },
            approximatePlayerNickname,
          ),
        ])
        expect(preciseIdentity.gameId).toBe(hostIdentity.gameId)

        expect(preciseIdentity.gameId).toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
        )
        expect(approximateIdentity.gameId).toBe(preciseIdentity.gameId)

        await Promise.all([
          precisePlayer.connect(),
          approximatePlayer.connect(),
        ])
        const joinedLobby = await joinedLobbyPromise
        expect(
          joinedLobby.players.map(({ nickname }) => nickname).sort(),
        ).toEqual([precisePlayerNickname, approximatePlayerNickname].sort())
        await expect(
          page.getByText(precisePlayerNickname, { exact: true }),
        ).toBeVisible()
        await expect(
          page.getByText(approximatePlayerNickname, { exact: true }),
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
        const preciseQuestionPromise = precisePlayer.waitForEvent(
          GameEventType.GameQuestionPlayer,
          (event) => event.pagination.current === 1,
        )
        const approximateQuestionPromise = approximatePlayer.waitForEvent(
          GameEventType.GameQuestionPlayer,
          (event) => event.pagination.current === 1,
        )

        await page.locator('#start-game-button').click()
        await hostBeginPromise
        const hostPreview = await hostPreviewPromise
        const hostQuestion = await hostQuestionPromise
        const [preciseQuestion, approximateQuestion] = await Promise.all([
          preciseQuestionPromise,
          approximateQuestionPromise,
        ])

        expect(hostPreview.question).toEqual({
          type: QuestionType.Range,
          question: question.text,
          points: question.points,
        })
        expect(hostQuestion.question).toEqual({
          type: QuestionType.Range,
          question: question.text,
          min: question.min,
          max: question.max,
          step: question.step,
          duration: question.duration,
        })
        expect(hostQuestion.submissions).toEqual({ current: 0, total: 2 })
        await expect(
          page.getByText(question.text, { exact: true }),
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
        const hostResultPromise = gameHost.waitForEvent(
          GameEventType.GameResultHost,
          (event) => event.pagination.current === 1,
        )

        await Promise.all([
          precisePlayer.submitAnswer({
            type: QuestionType.Range,
            value: exactAnswer,
          }),
          approximatePlayer.submitAnswer({
            type: QuestionType.Range,
            value: approximateAnswer,
          }),
        ])

        const [preciseResult, approximateResult, hostResult] =
          await Promise.all([
            preciseResultPromise,
            approximateResultPromise,
            hostResultPromise,
          ])

        expect(hostResult.results).toEqual({
          type: QuestionType.Range,
          distribution: [
            {
              value: exactAnswer,
              count: 1,
              correct: true,
            },
            {
              value: approximateAnswer,
              count: 1,
              correct: true,
            },
          ],
        })
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
        await expect(questionResults).toContainText(`${exactAnswer}`)
        await expect(questionResults).toContainText(`${approximateAnswer}`)
      })

      await test.step('Progress to and verify the final podium ordering', async () => {
        const preciseGameOverPromise = precisePlayer.waitForEvent(
          GameEventType.GameOverPlayer,
          (event) => event.player.nickname === precisePlayerNickname,
        )
        const approximateGameOverPromise = approximatePlayer.waitForEvent(
          GameEventType.GameOverPlayer,
          (event) => event.player.nickname === approximatePlayerNickname,
        )
        const podiumPromise = gameHost.waitForEvent(
          GameEventType.GamePodiumHost,
          (event) => event.game.name === quiz.title,
        )
        await page.locator('#next-button').click()
        const [preciseGameOver, approximateGameOver, podium] =
          await Promise.all([
            preciseGameOverPromise,
            approximateGameOverPromise,
            podiumPromise,
          ])
        expect(podium.game.name).toBe(quiz.title)
        expect(podium.leaderboard).toEqual([
          expect.objectContaining({
            position: 1,
            nickname: precisePlayerNickname,
            score: -10,
          }),
          expect.objectContaining({
            position: 2,
            nickname: approximatePlayerNickname,
            score: 25,
          }),
        ])
        expect(preciseGameOver.player).toEqual(
          expect.objectContaining({
            nickname: precisePlayerNickname,
            rank: 1,
            totalPlayers: 2,
          }),
        )
        expect(approximateGameOver.player).toEqual(
          expect.objectContaining({
            nickname: approximatePlayerNickname,
            rank: 2,
            totalPlayers: 2,
          }),
        )
        await expect(
          page.getByRole('button', { name: 'View Full Results' }),
        ).toBeVisible()
        await expect(page.getByText(quiz.title, { exact: true })).toBeVisible()

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
      gameHost.close()
      precisePlayer.close()
      approximatePlayer.close()
    }
  })

  test('rounds a late Zero to One Hundred joiner score and ranks it correctly', async ({
    page,
  }, testInfo) => {
    const e2eHost = getGameSessionFixture(testInfo)
    const quiz = e2eHost.quizzes.zeroToOneHundredLateJoin
    const firstQuestion = quiz.questions[0]
    const secondQuestion = quiz.questions[1]
    if (
      firstQuestion?.type !== QuestionType.Range ||
      secondQuestion?.type !== QuestionType.Range
    ) {
      throw new Error('Expected the seeded late-join range questions')
    }
    const firstCorrectAnswer = firstQuestion.correct
    const fractionalAnswer = 83.33333333333333
    const secondExactAnswer = secondQuestion.correct
    const playerANickname = `ApiEarly${randomUUID().slice(0, 8)}`
    const playerBNickname = `ApiLate${randomUUID().slice(0, 8)}`

    await test.step('Authenticate the seeded E2E user', async () => {
      await authenticatePageThroughApi(page, e2eHost.email)
      await expect(page).toHaveURL('/')
    })

    await test.step('Open the seeded late-join Zero to One Hundred quiz', async () => {
      await page.goto(`/quiz/details/${quiz.id}`)
      await expect(page).toHaveURL(`/quiz/details/${quiz.id}`)
      await expect(
        page.getByText(quiz.title, {
          exact: true,
        }),
      ).toBeVisible()
    })

    const gamePIN = await test.step('Create and open the host game', () =>
      startHostGame(page))

    const playerA = new GamePlayerClient(E2E_API_BASE_URL)
    const playerB = new GamePlayerClient(E2E_API_BASE_URL)
    const gameHost = new GameHostClient(E2E_API_BASE_URL)
    const playerACompletedQuestionScores: number[] = []

    try {
      const playerAGameId =
        await test.step('Join and connect Player A before the game starts', async () => {
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

        expect(hostPreview.question).toEqual({
          type: QuestionType.Range,
          question: firstQuestion.text,
          points: firstQuestion.points,
        })
        expect(hostQuestion.pagination).toEqual({ current: 1, total: 2 })
        expect(hostQuestion.submissions).toEqual({ current: 0, total: 1 })
        expect(hostQuestion.question).toEqual({
          type: QuestionType.Range,
          question: firstQuestion.text,
          min: firstQuestion.min,
          max: firstQuestion.max,
          step: firstQuestion.step,
          duration: firstQuestion.duration,
        })
        await expect(
          page.getByText(firstQuestion.text, { exact: true }),
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
        const hostResultPromise = gameHost.waitForEvent(
          GameEventType.GameResultHost,
          (event) => event.pagination.current === 1,
        )

        await playerA.submitAnswer({
          type: QuestionType.Range,
          value: fractionalAnswer,
        })
        const [result, hostResult] = await Promise.all([
          resultPromise,
          hostResultPromise,
        ])
        const expectedQuestionScore = Math.abs(
          fractionalAnswer - firstCorrectAnswer,
        )

        expect(result.game.mode).toBe(GameMode.ZeroToOneHundred)
        expect(result.player.score.correct).toBe(true)
        expect(result.player.score.last).toBe(expectedQuestionScore)
        expect(result.player.score.total).toBe(expectedQuestionScore)
        expect(hostResult.results).toEqual({
          type: QuestionType.Range,
          distribution: [
            {
              value: fractionalAnswer,
              count: 1,
              correct: true,
            },
            {
              value: firstCorrectAnswer,
              count: 0,
              correct: true,
            },
          ],
        })
        playerACompletedQuestionScores.push(result.player.score.last)
        await expect(page.getByTestId('question-results')).toBeVisible()
      })

      await test.step('Advance to the active leaderboard after question 1', async () => {
        const leaderboardPromise = gameHost.waitForEvent(
          GameEventType.GameLeaderboardHost,
          (event) => event.pagination.current === 1,
        )
        await page.locator('#next-button').click()
        const leaderboard = await leaderboardPromise
        expect(leaderboard.game).toEqual({
          mode: GameMode.ZeroToOneHundred,
          pin: gamePIN,
        })
        expect(leaderboard.leaderboard).toEqual([
          expect.objectContaining({ nickname: playerANickname, position: 1 }),
        ])
        await expect(
          page.getByText('Leaderboard', { exact: true }),
        ).toBeVisible()
      })

      const lateJoinResultPromise =
        await test.step('Join and connect Player B from the active leaderboard', async () => {
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

      await test.step('Assert the rounded late-join score and rank', async () => {
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
          type: QuestionType.Range,
          question: secondQuestion.text,
          min: secondQuestion.min,
          max: secondQuestion.max,
          step: secondQuestion.step,
          duration: secondQuestion.duration,
        })

        await expect(
          page.getByText(secondQuestion.text, {
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
        const hostResultPromise = gameHost.waitForEvent(
          GameEventType.GameResultHost,
          (event) => event.pagination.current === 2,
        )

        await playerA.submitAnswer({
          type: QuestionType.Range,
          value: secondExactAnswer,
        })
        await expect(page.locator('#skip-button')).toBeVisible()
        await page.locator('#skip-button').click()

        const [playerAResult, playerBResult, hostResult] = await Promise.all([
          playerAResultPromise,
          playerBResultPromise,
          hostResultPromise,
        ])
        const playerAFinalScore = playerACompletedQuestionScores[0] - 10

        expect(playerAResult.player.score.last).toBe(-10)
        expect(playerAResult.player.score.total).toBe(playerAFinalScore)
        expect(playerBResult.player.score.last).toBe(100)
        expect(playerBResult.player.score.total).toBe(
          Math.round(playerACompletedQuestionScores[0]) + 100,
        )
        expect(hostResult.results).toEqual({
          type: QuestionType.Range,
          distribution: [
            {
              value: secondExactAnswer,
              count: 1,
              correct: true,
            },
          ],
        })
        playerACompletedQuestionScores.push(playerAResult.player.score.last)
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
