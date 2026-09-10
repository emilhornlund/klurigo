import { GameEventType, GameMode, QuestionType } from '@klurigo/common'
import { expect, test } from '@playwright/test'

import { GameHostClient } from '../support/api/game-host-client'
import { GamePlayerClient } from '../support/api/game-player-client'
import { authenticatePageThroughApi } from '../support/browser/authenticate-page-through-api'
import { startHostGame } from '../support/browser/start-host-game'
import { E2E_API_BASE_URL, E2E_USER_PASSWORD } from '../support/e2e-runtime'
import { getGameSessionFixture } from '../support/fixtures/game-session-fixtures'

test.describe.configure({ mode: 'serial' })

test.describe('Game session: Classic Puzzle', () => {
  test('completes a Classic Puzzle game with correct and incorrect simulated players', async ({
    page,
  }, testInfo) => {
    const e2eHost = getGameSessionFixture(testInfo)
    const quiz = e2eHost.quizzes.classicPuzzle
    const question = quiz.questions[0]
    if (question?.type !== QuestionType.Puzzle) {
      throw new Error('Expected the seeded question to be Puzzle')
    }
    const correctPlayerNickname = 'PuzzleCorrect'
    const incorrectPlayerNickname = 'PuzzleIncorrect'
    const correctPlayer = new GamePlayerClient(E2E_API_BASE_URL)
    const incorrectPlayer = new GamePlayerClient(E2E_API_BASE_URL)

    await test.step('Authenticate the seeded E2E user', async () => {
      await authenticatePageThroughApi(page, e2eHost.email)
      await expect(page).toHaveURL('/')
    })

    await test.step('Open the seeded Puzzle Classic quiz', async () => {
      await page.goto(`/quiz/details/${quiz.id}`)
      await expect(page).toHaveURL(`/quiz/details/${quiz.id}`)
      await expect(page.getByText(quiz.title, { exact: true })).toBeVisible()
    })

    const gamePIN = await test.step('Create and open the host game', () =>
      startHostGame(page))
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

      await test.step('Start the game and verify the shuffled player question', async () => {
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

        expect(hostPreview).toEqual(
          expect.objectContaining({
            game: { mode: GameMode.Classic, pin: gamePIN },
            question: {
              type: QuestionType.Puzzle,
              question: question.text,
              points: question.points,
            },
            pagination: { current: 1, total: 1 },
          }),
        )
        expect(hostQuestion.question).toEqual(
          expect.objectContaining({
            type: QuestionType.Puzzle,
            question: question.text,
            duration: question.duration,
          }),
        )
        if (hostQuestion.question.type !== QuestionType.Puzzle) {
          throw new Error('Expected the host question to be a Puzzle')
        }
        expect([...hostQuestion.question.values].sort()).toEqual(
          [...question.values].sort(),
        )
        expect(hostQuestion.submissions).toEqual({ current: 0, total: 2 })
        await expect(
          page.getByText(question.text, { exact: true }),
        ).toBeVisible()
        for (const playerQuestion of [correctQuestion, incorrectQuestion]) {
          expect(playerQuestion.pagination).toEqual({ current: 1, total: 1 })
          if (playerQuestion.question.type !== QuestionType.Puzzle) {
            throw new Error('Expected the simulated player to receive a Puzzle')
          }

          expect(playerQuestion.question).toEqual(
            expect.objectContaining({
              type: QuestionType.Puzzle,
              question: question.text,
              duration: question.duration,
            }),
          )
          expect([...playerQuestion.question.values].sort()).toEqual(
            [...question.values].sort(),
          )
          expect(playerQuestion.question.values).not.toEqual(question.values)
        }
      })

      await test.step('Submit correct and incorrect orderings and verify both results', async () => {
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
        const hostResultPromise = gameHost.waitForEvent(
          GameEventType.GameResultHost,
          (event) => event.pagination.current === 1,
        )

        await Promise.all([
          correctPlayer.submitAnswer({
            type: QuestionType.Puzzle,
            values: [...question.values],
          }),
          incorrectPlayer.submitAnswer({
            type: QuestionType.Puzzle,
            values: [...question.values].reverse(),
          }),
        ])
        const [correctResult, incorrectResult, hostResult] = await Promise.all([
          correctResultPromise,
          incorrectResultPromise,
          hostResultPromise,
        ])

        expect(hostResult).toEqual(
          expect.objectContaining({
            game: { pin: gamePIN },
            question: expect.objectContaining({
              type: QuestionType.Puzzle,
              question: question.text,
            }),
            pagination: { current: 1, total: 1 },
          }),
        )
        if (hostResult.results.type !== QuestionType.Puzzle) {
          throw new Error('Expected the host result to be a Puzzle')
        }
        expect(hostResult.results.values).toEqual(question.values)
        expect(hostResult.results.distribution).toEqual([
          expect.objectContaining({
            value: question.values,
            count: 1,
            correct: true,
          }),
          expect.objectContaining({ count: 1, correct: false }),
        ])
        expect(correctResult.game.mode).toBe(GameMode.Classic)
        expect(correctResult.player.score).toEqual(
          expect.objectContaining({
            correct: true,
            position: 1,
          }),
        )
        expect(correctResult.player.score.total).toBeGreaterThan(0)
        expect(incorrectResult.game.mode).toBe(GameMode.Classic)
        expect(incorrectResult.player.score).toEqual(
          expect.objectContaining({ correct: false, total: 0 }),
        )
      })

      await test.step('Verify the host Puzzle result count and target ordering', async () => {
        const puzzleResults = page.locator('[class*="puzzleQuestionResults"]')
        await expect(puzzleResults).toBeVisible()
        await expect(puzzleResults.locator('[class*="green"]')).toContainText(
          '1',
        )
        await expect(puzzleResults.locator('[class*="red"]')).toContainText('1')

        const resultValues = puzzleResults.locator(
          '[class*="sortableTable"] [class*="item"]',
        )
        await expect(resultValues).toHaveCount(question.values.length)
        expect(
          (await resultValues.allTextContents()).map((value) => value.trim()),
        ).toEqual(question.values)
      })

      await test.step('Progress to and verify the final podium', async () => {
        const gameOverPromise = correctPlayer.waitForEvent(
          GameEventType.GameOverPlayer,
          (event) => event.player.nickname === correctPlayerNickname,
        )
        const incorrectGameOverPromise = incorrectPlayer.waitForEvent(
          GameEventType.GameOverPlayer,
          (event) => event.player.nickname === incorrectPlayerNickname,
        )
        const podiumPromise = gameHost.waitForEvent(
          GameEventType.GamePodiumHost,
          (event) => event.game.name === quiz.title,
        )

        await page.locator('#next-button').click()
        const [gameOver, incorrectGameOver, podium] = await Promise.all([
          gameOverPromise,
          incorrectGameOverPromise,
          podiumPromise,
        ])

        expect(podium.game.name).toBe(quiz.title)
        expect(podium.leaderboard).toEqual([
          expect.objectContaining({
            position: 1,
            nickname: correctPlayerNickname,
          }),
          expect.objectContaining({
            position: 2,
            nickname: incorrectPlayerNickname,
          }),
        ])
        expect(gameOver.game.mode).toBe(GameMode.Classic)
        expect(gameOver.quiz).toEqual({
          id: quiz.id,
          title: quiz.title,
        })
        expect(gameOver.player).toEqual(
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
        await expect(page.getByText(quiz.title, { exact: true })).toBeVisible()
        await expect(
          page.getByText(correctPlayerNickname, { exact: true }),
        ).toBeVisible()
        await expect(
          page.getByText(incorrectPlayerNickname, { exact: true }),
        ).toBeVisible()
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
