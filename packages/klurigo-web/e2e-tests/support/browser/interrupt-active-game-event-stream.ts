import type { Page } from '@playwright/test'

import { E2E_API_BASE_URL } from '../e2e-runtime'

type StoredGameAuth = {
  GAME?: {
    ACCESS?: {
      gameId?: string
      token?: string
    }
  }
}

const GAME_EVENT_STREAM_CONNECTION_ID_STORAGE_KEY =
  'klurigo.game-event-stream-connection-id'

export async function interruptActiveGameEventStream(
  page: Page,
): Promise<void> {
  const status = await page.evaluate(async (apiBaseUrl) => {
    const storedAuth = window.localStorage.getItem('auth')
    if (!storedAuth) throw new Error('Game auth state is missing')

    const gameAuth = (JSON.parse(storedAuth) as StoredGameAuth).GAME?.ACCESS
    if (!gameAuth?.gameId || !gameAuth.token) {
      throw new Error('Active game auth state is missing')
    }
    const connectionId = window.sessionStorage.getItem(
      GAME_EVENT_STREAM_CONNECTION_ID_STORAGE_KEY,
    )
    if (!connectionId) throw new Error('Active game event stream is missing')

    const response = await fetch(
      `${apiBaseUrl.replace(/\/+$/, '')}/games/${encodeURIComponent(gameAuth.gameId)}/events/interrupt?connectionId=${encodeURIComponent(connectionId)}`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${gameAuth.token}` },
      },
    )
    return response.status
  }, E2E_API_BASE_URL)

  if (status !== 204) {
    throw new Error(`SSE interruption failed with HTTP ${status}`)
  }
}
