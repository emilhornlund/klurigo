import { defineConfig, devices } from '@playwright/test'
import { loadEnv } from 'vite'

const env = loadEnv('development', process.cwd(), '')
const SERVER_PORT = env.SERVER_PORT || '3000'
const KLURIGO_SERVICE_PROXY =
  env.KLURIGO_SERVICE_PROXY || 'http://localhost:8080/api'

const apiUrl = new URL(KLURIGO_SERVICE_PROXY)
apiUrl.pathname = '/health'

const GAME_SESSION_TEST_MATCH = '**/game-session/**/*.spec.ts'
const GAME_SESSION_EXPECT_TIMEOUT = 15_000
const GAME_SESSION_TEST_TIMEOUT = 90_000

export default defineConfig({
  testDir: './e2e-tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
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
    {
      name: 'firefox',
      testIgnore: GAME_SESSION_TEST_MATCH,
      use: { ...devices['Desktop Firefox'] },
    },
    ...(process.env.CI
      ? [
          {
            name: 'webkit',
            testIgnore: GAME_SESSION_TEST_MATCH,
            use: { ...devices['Desktop Safari'] },
          },
        ]
      : []),
    {
      name: 'chromium-game-session',
      testMatch: GAME_SESSION_TEST_MATCH,
      expect: { timeout: GAME_SESSION_EXPECT_TIMEOUT },
      timeout: GAME_SESSION_TEST_TIMEOUT,
      workers: 1,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox-game-session',
      testMatch: GAME_SESSION_TEST_MATCH,
      expect: { timeout: GAME_SESSION_EXPECT_TIMEOUT },
      timeout: GAME_SESSION_TEST_TIMEOUT,
      workers: 1,
      use: { ...devices['Desktop Firefox'] },
    },
    ...(process.env.CI
      ? [
          {
            name: 'webkit-game-session',
            testMatch: GAME_SESSION_TEST_MATCH,
            expect: { timeout: GAME_SESSION_EXPECT_TIMEOUT },
            timeout: GAME_SESSION_TEST_TIMEOUT,
            workers: 1,
            use: { ...devices['Desktop Safari'] },
          },
        ]
      : []),
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
