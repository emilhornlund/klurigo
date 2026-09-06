import { expect, type Page } from '@playwright/test'

export async function startHostGame(page: Page): Promise<string> {
  await page.locator('#host-game-button').click()
  await page.getByRole('button', { name: 'Confirm', exact: true }).click()
  await expect(page).toHaveURL('/game')
  await expect(page.getByText('Game PIN', { exact: true })).toBeVisible()
  await expect(page.getByTestId('game-event-stream-ready')).toBeAttached()

  const gamePINElement = page
    .getByText('Game PIN', { exact: true })
    .locator('..')
    .getByText(/^[1-9]\d{5}$/)
  await expect(gamePINElement).toBeVisible()
  const gamePIN = (await gamePINElement.textContent())?.trim()

  if (!gamePIN) {
    throw new Error('Host lobby did not expose a game PIN')
  }
  if (!/^[1-9]\d{5}$/.test(gamePIN)) {
    throw new Error('Host lobby exposed an invalid game PIN')
  }

  return gamePIN
}
