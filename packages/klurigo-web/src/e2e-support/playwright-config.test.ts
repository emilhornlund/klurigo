import {
  E2E_FIXTURE_MANIFEST,
  type GameSessionUserFixture,
} from '@klurigo/e2e-fixtures'
import type { TestInfo } from '@playwright/test'
import { describe, expect, it } from 'vitest'

import {
  getGameSessionFixture,
  validateGameSessionFixtureCapacity,
} from '../../e2e-tests/support/fixtures/game-session-fixtures'
import playwrightConfig from '../../playwright.config'

const GAME_SESSION_TEST_MATCH = '**/game-session/**/*.spec.ts'

function testInfo(
  projectName: string,
  parallelIndex: number,
  repeatEachIndex: number,
  repeatEach: number,
): TestInfo {
  return {
    parallelIndex,
    project: { name: projectName, repeatEach },
    repeatEachIndex,
  } as TestInfo
}

function getFixture(
  projectName: string,
  parallelIndex: number,
  repeatEachIndex: number,
  repeatEach: number,
): GameSessionUserFixture {
  return getGameSessionFixture(
    testInfo(projectName, parallelIndex, repeatEachIndex, repeatEach),
  )
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
      workers: 3,
      repeatEach: 1,
    })
  })

  it('supports the configured three-worker, single-repeat capacity', () => {
    expect(() =>
      validateGameSessionFixtureCapacity({
        workerCount: 3,
        repeatCount: 1,
      }),
    ).not.toThrow()
  })

  it('supports one worker with three repeats', () => {
    expect(() =>
      validateGameSessionFixtureCapacity({
        workerCount: 1,
        repeatCount: 3,
      }),
    ).not.toThrow()
  })

  it('rejects worker and repeat combinations above fixture capacity', () => {
    expect(() =>
      validateGameSessionFixtureCapacity({
        workerCount: 3,
        repeatCount: 3,
      }),
    ).toThrow(
      'GameSession fixture capacity is insufficient: configured GameSession worker count: 3; configured repeat count: 3; required fixture-slot count: 9; available fixture-slot count: 3.',
    )
  })

  it('resolves every configured repeatEachIndex for a single Chromium worker', () => {
    const chromiumFixtures =
      E2E_FIXTURE_MANIFEST.gameSessionFixtureSlots.chromium

    for (const projectName of ['chromium', 'chromium-game-session']) {
      for (const [repeatEachIndex, fixture] of chromiumFixtures.entries()) {
        expect(getFixture(projectName, 0, repeatEachIndex, 3)).toBe(fixture)
      }
    }
  })

  it('assigns different fixture slots to concurrent workers', () => {
    const chromiumFixtures =
      E2E_FIXTURE_MANIFEST.gameSessionFixtureSlots.chromium

    const concurrentFixtures = chromiumFixtures.map((_, parallelIndex) =>
      getFixture('chromium-game-session', parallelIndex, 0, 1),
    )

    expect(concurrentFixtures).toEqual(chromiumFixtures)
    expect(new Set(concurrentFixtures.map(({ id }) => id)).size).toBe(
      concurrentFixtures.length,
    )
  })

  it('keeps repeated runs on different fixture slots', () => {
    const chromiumFixtures =
      E2E_FIXTURE_MANIFEST.gameSessionFixtureSlots.chromium

    const allocations = chromiumFixtures.map((_, repeatEachIndex) =>
      getFixture('chromium-game-session', 0, repeatEachIndex, 3),
    )

    expect(allocations).toEqual(chromiumFixtures)
    expect(new Set(allocations.map(({ id }) => id)).size).toBe(
      allocations.length,
    )
  })

  it('keeps actionable errors for unsupported projects and slot combinations', () => {
    expect(() => getFixture('unsupported-project', 0, 0, 1)).toThrow(
      'No E2E fixture configured for Playwright project "unsupported-project", parallelIndex 0, repeatEachIndex 0 (fixture slot 0; 0 slots available)',
    )
    expect(() => getFixture('chromium-game-session', 1, 2, 2)).toThrow(
      'No E2E fixture configured for Playwright project "chromium-game-session", parallelIndex 1, repeatEachIndex 2 (fixture slot 4; 3 slots available)',
    )
  })
})
