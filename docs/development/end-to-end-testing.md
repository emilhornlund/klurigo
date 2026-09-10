# End-To-End Testing

Frontend end-to-end tests use Playwright against the real Vite frontend and
Nest backend. The configuration is in
`packages/klurigo-web/playwright.config.ts`, and tests live in
`packages/klurigo-web/e2e-tests`.

Use the [development command reference](./commands.md) for the canonical
browser installation and Playwright commands. This guide explains the browser
projects, seeded fixtures, lifecycle hooks, and CI differences.

## Prerequisites

Use Node.js `>=24 <25` and the repository-declared Yarn Classic `1.22.22`.
Run `corepack enable` and `yarn toolchain:check` before installing dependencies.
The test environment uses MongoDB database
`klurigo_service_test` and Redis database `1`, as described in the
[local infrastructure guide](../getting-started/local-infrastructure.md).

The local installation command installs Chromium and Firefox. CI also installs
WebKit and Linux system dependencies; WebKit is only configured for regular CI
tests.

## Local Workflow

Playwright starts both web servers from its `webServer` configuration:

- `yarn dev` starts the Vite frontend at `http://localhost:${SERVER_PORT}`.
  `SERVER_PORT` defaults to `3000`.
- `yarn workspace @klurigo/klurigo-service dev:e2e` starts the backend with
  `NODE_ENV=test`. Its health URL is derived from `KLURIGO_SERVICE_PROXY`,
  which defaults to `http://localhost:8080/api`, with the path changed to
  `/health`.

Existing servers are reused locally and not reused in CI. Each server has a
30-second startup timeout. The Playwright base URL is the Vite URL. The
configured HTML reporter records traces on the first retry. CI forbids focused
tests and uses two retries; local runs use zero retries.

## Reset And Seed Lifecycle

The setup script connects directly to the configured test stores, deletes all
MongoDB collections, flushes Redis database `1`, and seeds the users and quiz
fixtures from `@klurigo/e2e-fixtures`. Each GameSession fixture slot includes
the existing one-question Classic, six-question mixed Classic, late-join, and
Zero to One Hundred quizzes plus dedicated one-question Classic True/False,
Type Answer, Pin, and Puzzle quizzes. The reset
helper refuses MongoDB
databases without `_test` in their name. Treat both the MongoDB and Redis
targets as disposable test state; do not configure them to contain data that
must be kept.

After all projects finish, teardown clears the test MongoDB and Redis state. If
setup or teardown fails, the
hook reports the child command failure; it does not force the test process to
exit successfully.

## Browser Projects

The configuration sets `fullyParallel: true` for ordinary tests and defines
these projects:

- `chromium` runs non-GameSession tests with Desktop Chrome.
- `firefox` runs non-GameSession tests with Desktop Firefox.
- `webkit` runs non-GameSession tests with Desktop Safari only when `CI` is
  set.
- `chromium-game-session` runs GameSession tests with Desktop Chrome, a
  15-second expect timeout, a 90-second test timeout, and one worker.
- `firefox-game-session` has the same GameSession settings with Desktop
  Firefox and one worker.

The ordinary projects exclude `**/game-session/**/*.spec.ts`; the two
dedicated GameSession projects include that pattern. GameSession files also
use Playwright's `test.describe.configure({ mode: 'serial' })` because the
flows exercise shared real-time game state. This project split and the worker
limit are the current isolation behavior; do not merge GameSession tests back
into fully parallel browser projects without changing the underlying
constraints.

There is currently no `webkit-game-session` project. The configuration has a
TODO to re-enable it after the CI-only Server-Sent Events instability can be
reproduced and debugged locally. WebKit coverage in the current setup is
therefore limited to non-GameSession tests in CI.

GameSession fixture lookup maps the two dedicated projects to the matching
browser fixture slots and selects by `testInfo.repeatEachIndex`:

- Chromium projects use the `chromium` slot: `tester02`, `tester05`, and
  `tester08`.
- Firefox projects use the `firefox` slot: `tester03`, `tester06`, and
  `tester09`.
- WebKit projects map to the `webkit` slot: `tester04`, `tester07`, and
  `tester10`; the current configuration only uses that mapping for regular
  WebKit tests because WebKit GameSession execution is not enabled.

The fixture resolver fails when a project and repeat index do not have a
configured fixture. Stateful tests must create their own game data and must
not rely on another test's mutations. The shared fixture manifest is seeded
before the run and is the source for the deterministic users, passwords, and
quizzes used by the browser tests. The GameSession suite covers mixed
six-question Classic progression and dedicated True/False, Type Answer, Pin, and
Puzzle flows through the host UI, typed player SSE
events, answer submission, result evaluation, response distribution, and final
podium. The Pin fixture uses a reachable image URL, normalized correct
coordinates, and a seeded tolerance; its scenario also verifies Pin-specific
question delivery and result rendering. The Puzzle fixture uses distinct seeded
values; its scenario verifies randomized delivery, canonical ordering submission,
and order-sensitive result rendering.

## CI

The reusable workflow `.github/workflows/build.yml` accepts a required boolean
`run_e2e` input. Its Playwright job runs only when that input is true. The
current callers enable it for pull requests, pushes to `main`, and the manual
production deployment workflow.

The CI job runs on Ubuntu with the Node.js version from `.nvmrc`, enables
Corepack, verifies the repository-declared Yarn version, installs dependencies
with the frozen Yarn lockfile, builds the common package, and starts MongoDB and
Redis.

It caches Playwright browsers by the installed `@playwright/test` version and
installs Chromium, Firefox, and WebKit plus Linux system dependencies.

The test step sets `CI=true` and runs `yarn workspace @klurigo/klurigo-web
test:e2e`. The Playwright configuration then enables two retries, adds the
regular WebKit project, and keeps the dedicated Chromium and Firefox
GameSession projects at one worker. Docker Compose is brought down with
`-v` in an `always()` cleanup step.
