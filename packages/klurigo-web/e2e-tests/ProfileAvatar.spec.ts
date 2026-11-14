import { randomUUID } from 'node:crypto'

import { DEFAULT_CRITTERS_AVATAR_V1 } from '@klurigo/common'
import { expect, test } from '@playwright/test'

import { authenticatePageThroughApi } from './support/browser/authenticate-page-through-api'
import { E2E_API_BASE_URL, E2E_USER_PASSWORD } from './support/e2e-runtime'

test('account avatar saves exactly, survives a fresh session, and retains failed drafts', async ({
  page,
  request,
  browser,
}) => {
  test.setTimeout(60_000)
  const email = `avatar-${randomUUID()}@example.com`
  const created = await request.post(`${E2E_API_BASE_URL}/users`, {
    data: {
      email,
      password: E2E_USER_PASSWORD,
      defaultNickname: 'AvatarTester',
    },
  })
  expect(created.status()).toBe(201)
  const external: string[] = []
  await page.route(
    /https?:\/\/([^/]*dicebear\.com|cdn\.hopjs\.net)\//,
    (route) => {
      external.push(route.request().url())
      return route.abort()
    },
  )
  await authenticatePageThroughApi(page, email)
  await page.goto('/profile/settings')
  await expect(
    page.getByRole('heading', { name: 'Your quiz avatar' }),
  ).toBeVisible()
  await page.getByPlaceholder('Default Nickname').fill('UnsavedNickname')
  await page.getByText('Block', { exact: true }).click()
  const savedResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith('/profile/user/avatar') &&
      response.request().method() === 'PUT',
  )
  await page.getByRole('button', { name: 'Save avatar' }).click()
  const saved = await (await savedResponse).json()
  expect(saved).toEqual({ ...DEFAULT_CRITTERS_AVATAR_V1, body: 'block' })
  await expect(page.getByPlaceholder('Default Nickname')).toHaveValue(
    'UnsavedNickname',
  )
  await page.reload()
  await expect(page.getByRole('radio', { name: 'Body: Block' })).toBeChecked()
  const source = await page
    .getByAltText('Your avatar preview')
    .getAttribute('src')

  const freshContext = await browser.newContext({
    baseURL: new URL(page.url()).origin,
  })
  try {
    const freshPage = await freshContext.newPage()
    await authenticatePageThroughApi(freshPage, email)
    await freshPage.goto('/profile/settings')
    await expect(
      freshPage.getByRole('radio', { name: 'Body: Block' }),
    ).toBeChecked()
    await expect(freshPage.getByAltText('Your avatar preview')).toHaveAttribute(
      'src',
      source!,
    )
  } finally {
    await freshContext.close()
  }

  await page.getByText('Blob', { exact: true }).click()
  await page.route('**/profile/user/avatar', (route) =>
    route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Temporarily unavailable' }),
    }),
  )
  await page.getByRole('button', { name: 'Save avatar' }).click()
  await expect(
    page.getByRole('alert').filter({ hasText: 'Your design is still here' }),
  ).toBeVisible()
  await expect(page.getByRole('radio', { name: 'Body: Blob' })).toBeChecked()
  await page.unroute('**/profile/user/avatar')
  const retryResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith('/profile/user/avatar') &&
      response.request().method() === 'PUT',
  )
  await page.getByRole('button', { name: 'Save avatar' }).click()
  expect(await (await retryResponse).json()).toEqual({ ...saved, body: 'blob' })
  expect(external).toEqual([])
})
