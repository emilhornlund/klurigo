import {
  E2E_FIXTURE_MANIFEST,
  type GameSessionUserFixture,
} from '@klurigo/e2e-fixtures'
import type { TestInfo } from '@playwright/test'

const GAME_SESSION_PROJECT_TO_FIXTURE_PROJECT: Record<string, string> = {
  chromium: 'chromium',
  'chromium-game-session': 'chromium',
  firefox: 'firefox',
  'firefox-game-session': 'firefox',
  webkit: 'webkit',
  'webkit-game-session': 'webkit',
}

export function getGameSessionFixture(
  testInfo: TestInfo,
): GameSessionUserFixture {
  const fixtureSlots: Record<string, readonly GameSessionUserFixture[]> =
    E2E_FIXTURE_MANIFEST.gameSessionFixtureSlots
  const fixtureProject =
    GAME_SESSION_PROJECT_TO_FIXTURE_PROJECT[testInfo.project.name] ??
    testInfo.project.name
  const fixture = fixtureSlots[fixtureProject]?.[testInfo.repeatEachIndex]

  if (!fixture) {
    throw new Error(
      `No E2E fixture configured for Playwright project "${testInfo.project.name}" and repeatEachIndex ${testInfo.repeatEachIndex}`,
    )
  }

  return fixture
}
