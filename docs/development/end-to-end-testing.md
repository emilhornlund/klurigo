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

The local installation command installs Chromium. CI installs Chromium with
Linux system dependencies.

## Local Workflow

Playwright starts both web servers from its `webServer` configuration:

- `yarn dev` starts the Vite frontend at `http://localhost:${SERVER_PORT}`.
  `SERVER_PORT` defaults to `3000`.
- `yarn workspace @klurigo/klurigo-service dev:e2e` starts the backend with
  `NODE_ENV=test`. Its health URL is derived from `KLURIGO_SERVICE_PROXY`,
  which defaults to `http://localhost:8080/api`, with the path changed to
  `/health` (the dependency readiness endpoint).

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
these Chromium-only projects:

- `chromium` runs non-GameSession tests with Desktop Chrome.
- `chromium-game-session` runs GameSession tests with Desktop Chrome, a
  15-second expect timeout, a 90-second test timeout, and one worker.

The ordinary project excludes `**/game-session/**/*.spec.ts`; the dedicated
GameSession project includes that pattern. GameSession files also use
Playwright's `test.describe.configure({ mode: 'serial' })` because the flows
exercise shared real-time game state. This project split and the worker limit
are the current isolation behavior; do not merge GameSession tests back into
the fully parallel ordinary project without changing the underlying
constraints.

GameSession fixture lookup maps both Chromium projects to the `chromium` slot
and selects by `testInfo.repeatEachIndex`:

- Chromium projects use the three supported `chromium` entries: `tester02`,
  `tester05`, and `tester08`.

The fixture resolver fails when a project and repeat index do not have a
configured fixture. Stateful tests must create their own game data and must
not rely on another test's mutations. The shared fixture manifest is seeded
before the run and is the source for the deterministic users, passwords,
quizzes, and question expectations used by the browser tests. Each GameSession
test reads its selected user's quiz and question data from the fixture returned
for the current project and `testInfo.repeatEachIndex`; it does not assume the
`tester02` slot. The GameSession directory contains 11 logical Playwright tests
and covers the six supported
`QuestionType` values as follows:

| Scenario                    | Mode and question types                                            | Behavioral coverage                                                                                        |
| --------------------------- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| Mixed Classic               | `MultiChoice`, `Range`, `TrueFalse`, `TypeAnswer`, `Pin`, `Puzzle` | Sequential typed delivery, correct submissions, per-type result distributions, leaderboards, and game-over |
| Host/player Classic         | `MultiChoice`                                                      | Real host/player UI boundaries and correct/incorrect scoring distribution                                  |
| Classic late join           | `MultiChoice`, `TrueFalse`                                         | Scored early player, zero-score late joiner, unanswered progression, and rank preservation                 |
| Dedicated Classic scenarios | `TrueFalse`, `TypeAnswer`, `Pin`, `Puzzle`                         | Type-specific payload, answer submission, result rendering, and final podium                               |
| Zero to One Hundred         | `Range`                                                            | Exact and approximate precision scores plus fractional late-join rounding and ranking                      |

The Pin fixture uses a reachable image URL, normalized correct coordinates, and a
seeded tolerance; its scenario also verifies Pin-specific question delivery and
result rendering. The Puzzle fixture uses distinct seeded values; its scenario
verifies randomized delivery, canonical and reversed order submissions, and
order-sensitive result rendering.

## Game Session Recovery

GameSession scenarios should exercise recovery through the real authenticated
SSE stream rather than replaying browser-side events. A newly opened or retried
stream first receives the current participant-specific snapshot, so refresh and
temporary connection interruption are supported during the lobby, question,
question-result, host leaderboard, and normal completed-game states. Player
snapshots include an already submitted answer when the backend has one; host
snapshots include current submission counts and rankings.

Use the authenticated test-only stream interruption control for interruption and
`page.reload()` while the persisted Game-scope token is still valid. The control
closes the active server-side SSE observable, allowing the browser to receive a
real transport error and retry. Assert the replacement stream and visible state
after recovery, then continue the same game progression. Keep these checks in
the existing serial GameSession files and project isolation.
The frontend displays reconnecting and reconnect-failed diagnostics while a
retry is pending or exhausted. Expired, unavailable, and host-terminated games
remain negative cases: they must follow existing authorization, quit, or
unavailable-session handling rather than resume from stale browser state.

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
installs Chromium plus Linux system dependencies.

The test step sets `CI=true` and runs `yarn workspace @klurigo/klurigo-web
test:e2e`. The Playwright configuration then enables two retries and keeps the
dedicated Chromium GameSession project at one worker. Docker Compose is brought
down with `-v` in an `always()` cleanup step.
