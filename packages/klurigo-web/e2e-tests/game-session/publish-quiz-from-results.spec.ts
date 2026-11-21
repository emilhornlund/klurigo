import { randomUUID } from 'node:crypto'

import {
  type AuthResponseDto,
  GameEventType,
  GameMode,
  LanguageCode,
  QuestionType,
  QuizCategory,
  type QuizRequestDto,
  type QuizResponseDto,
  QuizVisibility,
} from '@klurigo/common'
import { expect } from '@playwright/test'

import { authenticatePageThroughApi } from '../support/browser/authenticate-page-through-api'
import { startHostGame } from '../support/browser/start-host-game'
import { E2E_API_BASE_URL, E2E_USER_PASSWORD } from '../support/e2e-runtime'
import { test } from '../support/fixtures/game-session-fixtures'

for (const [device, viewport] of [
  ['desktop', { width: 1440, height: 900 }],
  ['mobile', { width: 390, height: 640 }],
] as const) {
  test(`reviews and publishes a private quiz from full results on ${device}`, async ({
    page,
    request,
    gameSessionFixture,
    gameHost,
    createGamePlayer,
  }) => {
    await page.setViewportSize(viewport)
    const email = gameSessionFixture.email
    const suffix = randomUUID().slice(0, 8)
    const quizRequest = {
      title: `Review visibility ${suffix}`,
      mode: GameMode.Classic,
      visibility: QuizVisibility.Private,
      category: QuizCategory.Science,
      languageCode: LanguageCode.English,
      questions: [
        {
          type: QuestionType.TrueFalse,
          question: 'Does Earth orbit the Sun?',
          correct: true,
          duration: 10,
          points: 1000,
        },
      ],
    } satisfies QuizRequestDto

    // Use a separate quiz so publishing does not mutate a shared fixture.
    const login = { email, password: E2E_USER_PASSWORD }
    const loginResponse = await request.post(`${E2E_API_BASE_URL}/auth/login`, {
      data: login,
    })
    expect(loginResponse.ok()).toBe(true)
    const { accessToken } = (await loginResponse.json()) as AuthResponseDto
    const createResponse = await request.post(`${E2E_API_BASE_URL}/quizzes`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      data: quizRequest,
    })
    expect(createResponse.ok()).toBe(true)
    const quiz = (await createResponse.json()) as QuizResponseDto

    await authenticatePageThroughApi(page, email)
    await page.goto(`/quiz/details/${quiz.id}`)
    const gamePIN = await startHostGame(page)
    const { gameId } = await gameHost.authenticate(login, { gamePIN })
    await gameHost.connect()
    const player = createGamePlayer()
    const nickname = `Player${suffix}`
    await player.authenticateAndJoin({ gamePIN }, nickname)
    await player.connect()
    await expect(page.getByText(nickname, { exact: true })).toBeVisible()

    const question = player.waitForEvent(GameEventType.GameQuestionPlayer)
    await gameHost.completeCurrentTask()
    await question
    const result = gameHost.waitForEvent(GameEventType.GameResultHost)
    await player.submitAnswer({ type: QuestionType.TrueFalse, value: true })
    await result
    await gameHost.completeCurrentTask()

    const review = page.getByRole('button', { name: 'Review quiz visibility' })
    const replay = page.getByRole('button', { name: /play again/i })
    const dialog = page.getByRole('dialog', { name: 'Make this quiz public?' })
    const publish = dialog.getByRole('button', { name: 'Make public' })
    const resultsPath = `/game/results/${gameId}`

    await page.getByRole('button', { name: 'View Full Results' }).click()
    await expect(page).toHaveURL(resultsPath)
    await expect(review).toBeVisible()
    await expect(replay).toBeEnabled()

    await review.click()
    await expect(page).toHaveURL(resultsPath)
    await expect(dialog).toBeVisible()
    await expect(publish).toBeInViewport({ ratio: 1 })
    await dialog.getByRole('button', { name: 'Cancel' }).click()
    await expect(dialog).toHaveCount(0)
    await expect(review).toBeFocused()
    await expect(page).toHaveURL(resultsPath)
    const unchanged = await request.get(
      `${E2E_API_BASE_URL}/quizzes/${quiz.id}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    )
    expect(unchanged.ok()).toBe(true)
    expect(await unchanged.json()).toMatchObject({
      visibility: QuizVisibility.Private,
    })

    await review.click()
    const saved = page.waitForResponse(
      (response) =>
        response.request().method() === 'PATCH' &&
        new URL(response.url()).pathname.endsWith(`/quizzes/${quiz.id}`),
    )
    await publish.click()
    const savedResponse = await saved
    expect(savedResponse.ok()).toBe(true)
    expect(savedResponse.request().postDataJSON()).toEqual({
      visibility: QuizVisibility.Public,
    })
    expect(await savedResponse.json()).toMatchObject({
      id: quiz.id,
      visibility: QuizVisibility.Public,
    })
    await expect(dialog).toHaveCount(0)
    await expect(review).toHaveCount(0)
    await expect(replay).toBeFocused()
    await expect(page).toHaveURL(resultsPath)

    const refreshed = page.waitForResponse(
      (response) =>
        response.request().method() === 'GET' &&
        new URL(response.url()).pathname.endsWith(`/games/${gameId}/results`),
    )
    await page.reload()
    const refreshedResponse = await refreshed
    expect(refreshedResponse.ok()).toBe(true)
    expect(await refreshedResponse.json()).toMatchObject({
      quiz: { canPublishQuiz: false },
    })
    await expect(page).toHaveURL(resultsPath)
    await expect(replay).toBeEnabled()
    await expect(review).toHaveCount(0)
  })
}
