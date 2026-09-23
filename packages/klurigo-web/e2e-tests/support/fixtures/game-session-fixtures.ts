import {
  E2E_FIXTURE_MANIFEST,
  type GameSessionUserFixture,
} from '@klurigo/e2e-fixtures'
import { test as base, type TestInfo } from '@playwright/test'

import { GameHostClient } from '../api/game-host-client'
import { GamePlayerClient } from '../api/game-player-client'
import { E2E_API_BASE_URL } from '../e2e-runtime'

const GAME_SESSION_PROJECT_TO_FIXTURE_PROJECT: Record<string, string> = {
  chromium: 'chromium',
  'chromium-game-session': 'chromium',
}

export function getGameSessionFixture(
  testInfo: TestInfo,
): GameSessionUserFixture {
  const fixtureProject =
    GAME_SESSION_PROJECT_TO_FIXTURE_PROJECT[testInfo.project.name] ??
    testInfo.project.name
  const fixture =
    E2E_FIXTURE_MANIFEST.gameSessionFixtureSlots[
      fixtureProject as keyof typeof E2E_FIXTURE_MANIFEST.gameSessionFixtureSlots
    ]?.[testInfo.repeatEachIndex]

  if (!fixture) {
    throw new Error(
      `No E2E fixture configured for Playwright project "${testInfo.project.name}" and repeatEachIndex ${testInfo.repeatEachIndex}`,
    )
  }

  return fixture
}

type GameSessionFixtures = {
  gameSessionFixture: GameSessionUserFixture
  gameHost: GameHostClient
  createGamePlayer: () => GamePlayerClient
}

export const test = base.extend<GameSessionFixtures>({
  gameSessionFixture: async ({ browserName }, use, testInfo) => {
    void browserName
    await use(getGameSessionFixture(testInfo))
  },

  gameHost: async ({ browserName }, use) => {
    void browserName
    const gameHost = new GameHostClient(E2E_API_BASE_URL)

    try {
      await use(gameHost)
    } finally {
      gameHost.close()
    }
  },

  createGamePlayer: async ({ browserName }, use) => {
    void browserName
    const gamePlayers: GamePlayerClient[] = []
    const createGamePlayer = (): GamePlayerClient => {
      const gamePlayer = new GamePlayerClient(E2E_API_BASE_URL)
      gamePlayers.push(gamePlayer)
      return gamePlayer
    }

    try {
      await use(createGamePlayer)
    } finally {
      for (const gamePlayer of gamePlayers) {
        gamePlayer.close()
      }
    }
  },
})
