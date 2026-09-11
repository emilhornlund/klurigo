import {
  E2E_FIXTURE_MANIFEST,
  type GameSessionUserFixture,
} from '@klurigo/e2e-fixtures'
import type { TestInfo } from '@playwright/test'
import { describe, expect, it } from 'vitest'

import { getGameSessionFixture } from '../../e2e-tests/support/fixtures/game-session-fixtures'
import playwrightConfig from '../../playwright.config'

const GAME_SESSION_TEST_MATCH = '**/game-session/**/*.spec.ts'

function testInfo(projectName: string, repeatEachIndex: number): TestInfo {
  return {
    project: { name: projectName },
    repeatEachIndex,
  } as TestInfo
}

function getFixture(
  projectName: string,
  repeatEachIndex: number,
): GameSessionUserFixture {
  return getGameSessionFixture(testInfo(projectName, repeatEachIndex))
}

describe('frontend Playwright configuration', () => {
  it('discovers only the ordinary and GameSession Chromium projects', () => {
    const projects = playwrightConfig.projects ?? []

    expect(projects.map(({ name }) => name)).toEqual([
      'chromium',
      'chromium-game-session',
    ])
    expect(projects.map(({ use }) => use?.defaultBrowserType)).toEqual([
      'chromium',
      'chromium',
    ])
    expect(projects[0]).toMatchObject({
      name: 'chromium',
      testIgnore: GAME_SESSION_TEST_MATCH,
    })
    expect(projects[1]).toMatchObject({
      name: 'chromium-game-session',
      testMatch: GAME_SESSION_TEST_MATCH,
      expect: { timeout: 15_000 },
      timeout: 90_000,
      workers: 1,
    })
  })

  it('resolves every configured Chromium repeatEachIndex for both projects', () => {
    const chromiumFixtures =
      E2E_FIXTURE_MANIFEST.gameSessionFixtureSlots.chromium

    for (const projectName of ['chromium', 'chromium-game-session']) {
      for (const [repeatEachIndex, fixture] of chromiumFixtures.entries()) {
        expect(getFixture(projectName, repeatEachIndex)).toBe(fixture)
      }
    }
  })

  it('keeps actionable errors for unsupported projects and repeat indices', () => {
    expect(() => getFixture('unsupported-project', 0)).toThrow(
      'No E2E fixture configured for Playwright project "unsupported-project" and repeatEachIndex 0',
    )
    expect(() =>
      getFixture(
        'chromium-game-session',
        E2E_FIXTURE_MANIFEST.gameSessionFixtureSlots.chromium.length,
      ),
    ).toThrow(
      'No E2E fixture configured for Playwright project "chromium-game-session" and repeatEachIndex 3',
    )
  })
})
