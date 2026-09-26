import { defineConfig, devices } from '@playwright/test'
import { loadEnv } from 'vite'

import { validateGameSessionFixtureCapacity } from './e2e-tests/support/fixtures/game-session-fixture-capacity'

const env = loadEnv('development', process.cwd(), '')
const SERVER_PORT = env.SERVER_PORT || '3000'
const KLURIGO_SERVICE_PROXY =
  env.KLURIGO_SERVICE_PROXY || 'http://localhost:8080/api'

const apiUrl = new URL(KLURIGO_SERVICE_PROXY)
apiUrl.pathname = '/health/ready'

const GAME_SESSION_TEST_MATCH = '**/game-session/**/*.spec.ts'
const GAME_SESSION_EXPECT_TIMEOUT = 15_000
const GAME_SESSION_TEST_TIMEOUT = 90_000
const GAME_SESSION_WORKERS = 3
const GAME_SESSION_REPEAT_EACH = 1

const GAME_SESSION_PROJECT = {
  name: 'chromium-game-session',
  testMatch: GAME_SESSION_TEST_MATCH,
  expect: { timeout: GAME_SESSION_EXPECT_TIMEOUT },
  timeout: GAME_SESSION_TEST_TIMEOUT,
  workers: GAME_SESSION_WORKERS,
  repeatEach: GAME_SESSION_REPEAT_EACH,
  use: { ...devices['Desktop Chrome'] },
}

validateGameSessionFixtureCapacity({
  workerCount: GAME_SESSION_WORKERS,
  repeatCount: GAME_SESSION_REPEAT_EACH,
})

export default defineConfig({
  testDir: './e2e-tests',
  fullyParallel: true,
  // parallelIndex is shared across projects; keep every worker within the seeded fixture slots.
  workers: GAME_SESSION_WORKERS,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'html',
  globalSetup: require.resolve('./playwright.global-setup.ts'),
  globalTeardown: require.resolve('./playwright.global-teardown.ts'),
  use: {
    baseURL: `http://localhost:${SERVER_PORT}`,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      testIgnore: GAME_SESSION_TEST_MATCH,
      use: { ...devices['Desktop Chrome'] },
    },
    GAME_SESSION_PROJECT,
  ],
  webServer: [
    {
      // Vite dev server (front-end)
      command: 'yarn dev',
      url: `http://localhost:${SERVER_PORT}`,
      reuseExistingServer: !process.env.CI,
      stdout: 'pipe',
      stderr: 'pipe',
      timeout: 30_000,
    },
    {
      // API dev server (back-end)
      command: 'yarn workspace @klurigo/klurigo-service dev:e2e',
      url: apiUrl.toString(),
      reuseExistingServer: !process.env.CI,
      stdout: 'pipe',
      stderr: 'pipe',
      timeout: 30_000,
    },
  ],
})
