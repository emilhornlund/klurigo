import {
  E2E_FIXTURE_MANIFEST,
  type GameSessionUserFixture,
} from '@klurigo/e2e-fixtures'
import type { TestInfo } from '@playwright/test'

export function getGameSessionFixture(
  testInfo: TestInfo,
): GameSessionUserFixture {
  const fixtureSlots: Record<string, readonly GameSessionUserFixture[]> =
    E2E_FIXTURE_MANIFEST.gameSessionFixtureSlots
  const fixture =
    fixtureSlots[testInfo.project.name]?.[testInfo.repeatEachIndex]

  if (!fixture) {
    throw new Error(
      `No E2E fixture configured for Playwright project "${testInfo.project.name}" and repeatEachIndex ${testInfo.repeatEachIndex}`,
    )
  }

  return fixture
}
