import { randomUUID } from 'node:crypto'

import {
  DEFAULT_CRITTERS_AVATAR_V1,
  isCrittersAvatarConfigurationV1,
} from '@klurigo/common'
import { E2E_USERS } from '@klurigo/e2e-fixtures'
import { expect, test } from '@playwright/test'

import { authenticatePageThroughApi } from './support/browser/authenticate-page-through-api'
import { startHostGame } from './support/browser/start-host-game'
import { E2E_API_BASE_URL, E2E_USER_PASSWORD } from './support/e2e-runtime'

for (const account of [false, true]) {
  test(`join preview preserves the accepted ${account ? 'account' : 'guest'} snapshot`, async ({
    page,
    browser,
    request,
    baseURL,
  }) => {
    test.setTimeout(60_000)
    const hostContext = await browser.newContext({ baseURL })
    try {
      const host = await hostContext.newPage()
      await authenticatePageThroughApi(host, E2E_USERS.tester02.email)
      await host.goto(`/quiz/details/${E2E_USERS.tester02.quizzes.classic.id}`)
      const pin = await startHostGame(host)
      const saved = { ...DEFAULT_CRITTERS_AVATAR_V1, body: 'block', top: null }
      if (account) {
        const email = `join-avatar-${randomUUID()}@example.com`
        expect(
          (
            await request.post(`${E2E_API_BASE_URL}/users`, {
              data: {
                email,
                password: E2E_USER_PASSWORD,
                defaultNickname: 'JoinAccount',
              },
            })
          ).status(),
        ).toBe(201)
        await authenticatePageThroughApi(page, email)
        const token = await page.evaluate(
          () =>
            JSON.parse(localStorage.getItem('auth')!).USER.ACCESS
              .token as string,
        )
        expect(
          (
            await request.put(`${E2E_API_BASE_URL}/profile/user/avatar`, {
              headers: { Authorization: `Bearer ${token}` },
              data: saved,
            })
          ).status(),
        ).toBe(200)
      } else await page.goto('/')
      await page.getByPlaceholder('Game PIN').fill(pin)
      await page.getByRole('button', { name: /join the game/i }).click()
      await expect(page).toHaveURL('/join')
      const preview = page.getByAltText('Your game avatar preview')
      await expect(preview).toBeVisible()
      if (!account) {
        const profileWrites: string[] = []
        page.on('request', (req) => {
          if (
            req.method() === 'PUT' &&
            req.url().endsWith('/profile/user/avatar')
          )
            profileWrites.push(req.url())
        })
        await page.getByRole('button', { name: 'Customize avatar' }).click()
        await page.getByText('Block', { exact: true }).click()
        await page.getByLabel('Customize', { exact: true }).selectOption('Head')
        await page.getByText('None', { exact: true }).click()
        await page.getByRole('button', { name: 'Use design' }).click()
        const chosen = await preview.getAttribute('src')
        await page.getByRole('button', { name: 'Customize avatar' }).click()
        await page.getByRole('button', { name: 'Randomize' }).click()
        await page.getByRole('button', { name: 'Discard changes' }).click()
        await expect(preview).toHaveAttribute('src', chosen!)
        expect(profileWrites).toEqual([])
      }
      const source = await preview.getAttribute('src')
      const draft = await page.evaluate(() =>
        JSON.parse(
          localStorage.getItem(
            Object.keys(localStorage).find((key) =>
              key.startsWith('klurigo:join-avatar:'),
            )!,
          )!,
        ),
      )
      expect(isCrittersAvatarConfigurationV1(draft)).toBe(true)
      if (account) expect(draft).toEqual(saved)
      else expect(draft).toMatchObject({ body: 'block', top: null })
      await page.reload()
      await expect(preview).toHaveAttribute('src', source!)
      await page.getByPlaceholder('Nickname').fill('JoinPreview')
      await page.route(
        '**/games/*/players',
        (route) =>
          route.fulfill({
            status: 503,
            contentType: 'application/json',
            body: JSON.stringify({ message: 'Retry join' }),
          }),
        { times: 1 },
      )
      await page.getByRole('button', { name: 'OK, Go!' }).click()
      await expect(page.getByRole('button', { name: 'OK, Go!' })).toBeEnabled()
      await expect(preview).toHaveAttribute('src', source!)
      const submitted = page.waitForRequest(
        (req) =>
          req.method() === 'POST' && /\/games\/[^/]+\/players$/.test(req.url()),
      )
      await page.getByRole('button', { name: 'OK, Go!' }).click()
      expect((await submitted).postDataJSON()).toEqual({
        nickname: 'JoinPreview',
        avatar: draft,
      })
      await expect(page).toHaveURL('/game')
      const identity = await page.evaluate(
        () =>
          JSON.parse(localStorage.getItem('auth')!).GAME.ACCESS as {
            token: string
            gameId: string
          },
      )
      const details = await request.get(
        `${E2E_API_BASE_URL}/games/${identity.gameId}`,
        { headers: { Authorization: `Bearer ${identity.token}` } },
      )
      expect((await details.json()).participant.avatar).toEqual(draft)
      await page.goto('/join')
      await expect(page).toHaveURL('/game')
    } finally {
      await hostContext.close()
    }
  })
}
