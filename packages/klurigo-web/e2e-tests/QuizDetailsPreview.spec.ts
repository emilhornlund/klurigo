import { E2E_USERS } from '@klurigo/e2e-fixtures'
import { expect, test } from '@playwright/test'

import { authenticatePageThroughApi } from './support/browser/authenticate-page-through-api'

test('retries the sample prompts on quiz details without creating a game', async ({
  page,
}) => {
  const { email, quizzes } = E2E_USERS.tester02
  const quiz = quizzes.classicMixed
  await authenticatePageThroughApi(page, email)

  const gameCreationRequests: string[] = []
  page.on('request', (request) => {
    if (
      request.method() === 'POST' &&
      request.url().endsWith(`/quizzes/${quiz.id}/games`)
    ) {
      gameCreationRequests.push(request.url())
    }
  })
  await page.route(
    `**/api/quizzes/${quiz.id}/questions/preview`,
    (route) => route.fulfill({ status: 503, json: { message: 'Unavailable' } }),
    { times: 1 },
  )

  await page.goto(`/quiz/details/${quiz.id}`)
  const samples = page.getByRole('region', { name: 'Sample questions' })
  const toggle = samples.getByRole('button', { name: 'Sample questions' })
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
  await toggle.press('Enter')
  await expect(samples.getByRole('status')).toHaveText(
    'Oops! The sample questions didn’t load.',
  )
  const host = page.getByRole('button', { name: 'Host Game' })
  await host.click()
  const dialog = page.getByRole('dialog', { name: 'Host Game' })
  await expect(dialog.getByRole('button', { name: 'Confirm' })).toBeEnabled()
  await dialog.getByRole('button', { name: 'Close', exact: true }).click()

  await samples.getByRole('button', { name: 'Try again' }).click()
  const items = samples.getByRole('listitem')
  await expect(items).toHaveCount(3)
  for (const [index, question] of quiz.questions.slice(0, 3).entries()) {
    await expect(items.nth(index)).toContainText(question.text)
  }
  await expect(samples.getByRole('button', { name: 'Try again' })).toHaveCount(
    0,
  )
  await expect(toggle).toHaveAccessibleDescription('3 questions from this quiz')
  await toggle.press('Space')
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
  await expect(samples.getByRole('list')).toBeHidden()
  expect(gameCreationRequests).toEqual([])
})
