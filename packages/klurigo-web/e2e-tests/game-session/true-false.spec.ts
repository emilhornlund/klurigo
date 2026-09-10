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

test.describe('Game session: Classic True/False', () => {
  test('completes a Classic True/False game with one simulated player', async ({
    page,
  }, testInfo) => {
    const e2eHost = getGameSessionFixture(testInfo)
    const quiz = e2eHost.quizzes.classicTrueFalse
    const question = quiz.questions[0]
    if (question?.type !== QuestionType.TrueFalse) {
      throw new Error('Expected the seeded question to be true/false')
    }
    const playerNickname = `ApiTrueFalse${randomUUID().slice(0, 8)}`

    await test.step('Authenticate the seeded E2E user', async () => {
      await authenticatePageThroughApi(page, e2eHost.email)
      await expect(page).toHaveURL('/')
    })

    await test.step('Open the seeded True/False Classic quiz', async () => {
      await page.goto(`/quiz/details/${quiz.id}`)
      await expect(page).toHaveURL(`/quiz/details/${quiz.id}`)
      await expect(page.getByText(quiz.title, { exact: true })).toBeVisible()
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

      await test.step('Start the game and verify the typed player question', async () => {
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
          type: QuestionType.TrueFalse,
          question: question.text,
          points: question.points,
        })
        expect(hostQuestion.question).toEqual({
          type: QuestionType.TrueFalse,
          question: question.text,
          duration: question.duration,
        })
        expect(hostQuestion.submissions).toEqual({ current: 0, total: 1 })
        await expect(
          page.getByText(question.text, { exact: true }),
        ).toBeVisible()
        expect(playerQuestion.pagination).toEqual({ current: 1, total: 1 })
        expect(playerQuestion.player).toEqual({
          nickname: playerNickname,
          score: { total: 0 },
        })
        expect(playerQuestion.question).toEqual(
          expect.objectContaining({
            type: QuestionType.TrueFalse,
            question: question.text,
            duration: question.duration,
          }),
        )
      })

      await test.step('Submit the seeded True/False answer and verify the player result', async () => {
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
          type: QuestionType.TrueFalse,
          value: question.correct,
        })
        const [playerResult, hostResult] = await Promise.all([
          playerResultPromise,
          hostResultPromise,
        ])

        expect(hostResult).toEqual(
          expect.objectContaining({
            game: { pin: gamePIN },
            question: expect.objectContaining({
              type: QuestionType.TrueFalse,
              question: question.text,
            }),
            pagination: { current: 1, total: 1 },
          }),
        )
        expect(hostResult.results).toEqual({
          type: QuestionType.TrueFalse,
          distribution: [{ value: question.correct, count: 1, correct: true }],
        })
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

      await test.step('Verify the host result count for False', async () => {
        const questionResults = page.getByTestId('question-results')
        await expect(questionResults).toBeVisible()
        await expect(questionResults.locator(':scope > div')).toHaveCount(1)
        await expect(questionResults).toContainText('False')
        await expect(questionResults).toContainText('1')
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
    } finally {
      gameHost.close()
      gamePlayer.close()
    }
  })
})
