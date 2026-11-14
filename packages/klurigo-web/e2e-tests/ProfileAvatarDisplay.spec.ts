import { randomUUID } from 'node:crypto'

import { DEFAULT_CRITTERS_AVATAR_V1 } from '@klurigo/common'
import { expect, test } from '@playwright/test'

import { authenticatePageThroughApi } from './support/browser/authenticate-page-through-api'
import { E2E_API_BASE_URL, E2E_USER_PASSWORD } from './support/e2e-runtime'

test('saved avatars update account navigation and a previously cached profile on desktop and mobile', async ({
  page,
  request,
  browser,
}) => {
  test.setTimeout(60_000)
  const email = `avatar-display-${randomUUID()}@example.com`
  const created = await request.post(`${E2E_API_BASE_URL}/users`, {
    data: {
      email,
      password: E2E_USER_PASSWORD,
      defaultNickname: 'AvatarDisplay',
    },
  })
  expect(created.status()).toBe(201)
  const { id } = await created.json()
  const external: string[] = []
  await page.route(
    /https?:\/\/([^/]*dicebear\.com|cdn\.hopjs\.net)\//,
    (route) => {
      external.push(route.request().url())
      return route.abort()
    },
  )
  await authenticatePageThroughApi(page, email)
  const unsavedProfile = page.waitForResponse(
    (response) =>
      response.url().endsWith(`/users/${id}/profile`) &&
      response.request().resourceType() === 'fetch' &&
      response.request().method() === 'GET',
  )
  await page.goto(`/users/${id}/profile`)
  expect(await (await unsavedProfile).json()).not.toHaveProperty('avatar')
  const profileAvatar = page.getByRole('img', {
    name: "AvatarDisplay's avatar",
  })
  await expect(profileAvatar).toHaveAttribute(
    'src',
    /^data:image\/svg\+xml;charset=utf-8,/,
  )
  const defaultSource = await profileAvatar.getAttribute('src')
  expect(decodeURIComponent(defaultSource!)).toContain(
    '<dc:title>Critters</dc:title>',
  )
  const navigationAvatar = page
    .getByRole('button', { name: 'Profile', expanded: false })
    .locator('img')
  await expect(navigationAvatar).toHaveAttribute('src', defaultSource!)

  await page.goto('/profile/settings')
  await expect(page.getByAltText('Your avatar preview')).toHaveAttribute(
    'src',
    defaultSource!,
  )
  await page.getByText('Block', { exact: true }).click()
  const savedResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith('/profile/user/avatar') &&
      response.request().method() === 'PUT',
  )
  await page.getByRole('button', { name: 'Save avatar' }).click()
  expect(await (await savedResponse).json()).toEqual({
    ...DEFAULT_CRITTERS_AVATAR_V1,
    body: 'block',
  })
  await expect(navigationAvatar).toHaveAttribute('src', /^data:image\/svg\+xml/)
  const source = await page
    .getByAltText('Your avatar preview')
    .getAttribute('src')
  await expect(navigationAvatar).toHaveAttribute('src', source!)

  // A client-side navigation must refresh the profile cached before the save.
  await page.getByRole('button', { name: 'Profile', expanded: false }).click()
  await page
    .getByRole('button', { name: 'Profile', expanded: true })
    .locator('..')
    .getByRole('button', { name: 'Profile', exact: true })
    .filter({ hasText: 'Profile' })
    .click()
  await expect(page).toHaveURL(`/users/${id}/profile`)
  await expect(
    page.getByRole('img', { name: "AvatarDisplay's avatar" }),
  ).toHaveAttribute('src', source!)
  await expect(navigationAvatar).toHaveAttribute('src', source!)

  const fresh = await browser.newContext({
    baseURL: new URL(page.url()).origin,
    viewport: { width: 390, height: 844 },
  })
  try {
    const mobile = await fresh.newPage()
    await authenticatePageThroughApi(mobile, email)
    await mobile.goto(`/users/${id}/profile`)
    await expect(
      mobile.getByRole('img', { name: "AvatarDisplay's avatar" }),
    ).toHaveAttribute('src', source!)
    await mobile.getByRole('button', { name: 'Menu' }).click()
    await expect(
      mobile
        .getByRole('button', { name: 'Profile', exact: true })
        .locator('img'),
    ).toHaveAttribute('src', source!)
    const snapshot = await mobile.evaluate(() =>
      JSON.parse(localStorage.getItem('currentUser')!),
    )
    expect(snapshot.avatar).toEqual({
      ...DEFAULT_CRITTERS_AVATAR_V1,
      body: 'block',
    })
  } finally {
    await fresh.close()
  }
  expect(external).toEqual([])
})
