# Development Commands

This is the canonical command reference for the Klurigo Yarn workspaces. Run
commands from the repository root unless a command is explicitly shown with a
workspace name.

## Prerequisites And Installation

The repository requires Node.js `>=24 <25` (`.nvmrc` selects Node.js `v24`)
and Yarn Classic `1.22.22`. The CI workflow installs that exact Yarn version.
Docker with Compose is also required for the MongoDB and Redis services used by
the backend development and end-to-end workflows.

Install the supported Yarn version, then install the locked workspace
dependencies:

```sh
npm install --global yarn@1.22.22
yarn install --frozen-lockfile
```

`--frozen-lockfile` prevents Yarn from changing `yarn.lock`. Reinstall
dependencies after changing the lockfile or package manifests.

## Development And Serving

Start the MongoDB and Redis development services before starting the backend:

```sh
docker compose up -d --wait
```

Start the backend and frontend together:

```sh
yarn dev
```

The root development command runs the backend and frontend concurrently. The
frontend startup waits for `http://localhost:8080/health`; it does not start
Storybook. With the checked-in development environment, the frontend is at
`http://localhost:3000` and the backend health endpoint is at
`http://localhost:8080/health`.

Run the applications separately when needed:

```sh
yarn workspace @klurigo/klurigo-service dev
yarn workspace @klurigo/klurigo-web dev
```

The backend requires MongoDB and Redis. The workspace frontend command starts
Vite directly and does not perform the root command's backend health wait. The
root aliases `yarn klurigo-service:dev` and `yarn klurigo-web:dev` are the two
commands used by `yarn dev`.

Serve built applications:

```sh
yarn build
yarn serve
yarn workspace @klurigo/klurigo-service serve
yarn workspace @klurigo/klurigo-web serve
```

`yarn serve` runs the backend's `dist/main` and the frontend's Vite preview.
Build first so those generated artifacts exist.

## Building And Cleaning

Build all build-capable workspaces with the root orchestration command:

```sh
yarn build
```

This builds `@klurigo/common`, then builds the service and web applications plus
the MongoDB migrator in parallel. The build-capable workspaces also expose these
scoped commands:

```sh
yarn workspace @klurigo/common build
yarn workspace @klurigo/klurigo-service build
yarn workspace @klurigo/klurigo-service build:app
yarn workspace @klurigo/klurigo-web build
yarn workspace @klurigo/klurigo-web build:app
yarn workspace mongodb-migrator build
```

The service and web `build` commands build the common package first. Their
internal `build:app` commands skip that dependency build and are used by the
root `build` command after common has been built.

Remove application build artifacts:

```sh
yarn clean
yarn workspace @klurigo/common clean
yarn workspace @klurigo/klurigo-service clean
yarn workspace @klurigo/klurigo-web clean
```

The root clean command removes the common, service, and web artifacts. It does
not build or clean the workspace tools.

Build output is written to package `dist/` directories. The service clean also
removes its TypeScript build-info files. Test coverage and Playwright reports
are generated separately as described below.

## Linting And Formatting

Run linting across the application packages and workspace tools:

```sh
yarn lint
```

The root command covers `@klurigo/common`, `@klurigo/klurigo-service`,
`@klurigo/klurigo-web`, `@klurigo/e2e-fixtures`, and `mongodb-migrator`.
Autofix supported workspace lint rules with:

```sh
yarn lint:fix
```

The root autofix command runs each workspace's `lint:fix` script. All five
workspaces provide that script:

```sh
yarn workspace @klurigo/common lint:fix
yarn workspace @klurigo/klurigo-service lint:fix
yarn workspace @klurigo/klurigo-web lint:fix
yarn workspace @klurigo/e2e-fixtures lint:fix
yarn workspace mongodb-migrator lint:fix
```

Run Prettier across all code-bearing workspaces, or validate formatting without
writing files:

```sh
yarn format
yarn format:check
```

`yarn format` writes formatted files. `yarn format:check` exits nonzero when a
file needs formatting. Both commands honor the repository `.gitignore`, so
generated `dist/`, coverage, and test-report files are not formatted. The
corresponding workspace commands are available for all five workspaces:

```sh
yarn workspace @klurigo/common format
yarn workspace @klurigo/klurigo-service format:check
yarn workspace @klurigo/klurigo-web format:check
yarn workspace @klurigo/e2e-fixtures format:check
yarn workspace mongodb-migrator format:check
```

## Type Checking

Check TypeScript across all TypeScript workspaces:

```sh
yarn typecheck
```

Run a narrower check with the corresponding workspace command:

```sh
yarn workspace @klurigo/common typecheck
yarn workspace @klurigo/klurigo-service typecheck
yarn workspace @klurigo/klurigo-web typecheck
yarn workspace @klurigo/e2e-fixtures typecheck
yarn workspace mongodb-migrator typecheck
```

The service check covers its application and specification TypeScript
projects. The web check covers its application and Playwright TypeScript
projects.

## TypeScript Configuration

All workspace projects inherit shared type-safety, interop, library-checking,
and casing defaults from the root `tsconfig.base.json`. Runtime-specific
projects keep their own target, library, module-resolution, emit, and file
scope settings:

- `packages/common/tsconfig.json` uses NodeNext settings and retains its
  distributable declaration and source-map output.
- `packages/klurigo-service/tsconfig.json` is the application base for its
  build and test projects. Its relaxed strictness is intentional for existing
  NestJS code; strict null checks remain enabled. The build project inherits
  application output settings, while the spec project is test-only and
  non-emitting.
- `packages/klurigo-web/tsconfig.base.json` contains the shared Vite bundler,
  syntax, non-emitting, and checking settings. `tsconfig.app.json` adds the
  browser/React target for the app, e2e, and Storybook projects, while
  `tsconfig.node.json` separately covers Vite configuration with Node types.
  The e2e and Storybook projects override only their type scopes and file sets.
- `tools/*/tsconfig.json` retain NodeNext resolution, Node type libraries, and
  tool-specific source and output roots.

## Unit And Aggregate Tests

Run the common package, backend unit, and frontend package unit tests in
parallel:

```sh
yarn test
```

The root `test` command delegates to `test:unit`, so it does not require
MongoDB or Redis.

Run the explicit root unit command or individual unit suites:

```sh
yarn test:unit
yarn workspace @klurigo/common test:unit
yarn workspace @klurigo/klurigo-service test:unit
yarn workspace @klurigo/klurigo-web test:unit
```

The common suite and frontend suite use Vitest. Backend unit tests use Jest and
do not require the test databases.

Useful frontend development variants are:

```sh
yarn workspace @klurigo/klurigo-web test:watch
yarn workspace @klurigo/klurigo-web test:update
```

## Backend End-To-End Tests

Run only the backend Jest end-to-end suite after starting MongoDB and Redis:

```sh
docker compose up -d --wait mongodb redis
yarn workspace @klurigo/klurigo-service test:e2e
```

The test environment uses MongoDB database `klurigo_service_test` and Redis
database `1`. Backend e2e tests reset shared test state and run with one Jest
worker. Never point the test configuration at data that must be retained.

The backend aggregate command includes unit tests and backend e2e tests:

```sh
yarn workspace @klurigo/klurigo-service test
```

## Playwright Browser Tests

Install the browsers used by local Playwright projects:

```sh
yarn workspace @klurigo/klurigo-web test:e2e:install
```

This installs Chromium and Firefox. The equivalent package-local Playwright
command is:

```sh
yarn workspace @klurigo/klurigo-web playwright install chromium firefox
```

Run the frontend browser suite from the repository root:

```sh
docker compose up -d --wait mongodb redis
yarn workspace @klurigo/klurigo-web test:e2e
```

Playwright's configuration starts the Vite frontend with `yarn dev` and the
test-mode backend with
`yarn workspace @klurigo/klurigo-service dev:e2e`. Its global setup invokes
the backend `e2e:setup` command to reset and seed test databases, and its global
teardown invokes `e2e:teardown` to clear them.

Local runs use Chromium and Firefox, zero retries, and reuse already-running
servers. The WebKit project is CI-only. CI sets `CI=true`, enables two retries,
does not reuse servers, and installs all configured browsers plus Linux system
dependencies with:

```sh
yarn workspace @klurigo/klurigo-web playwright install chromium firefox webkit --with-deps
```

The CI workflow then runs the same `test:e2e` package script. Do not assume
WebKit or its system dependencies are available on a local machine after the
local browser installation command. The configured HTML reporter writes a
Playwright report under `playwright-report/`.

## Coverage

Run unit coverage for all test packages:

```sh
yarn test:unit:coverage
```

Run package-specific coverage when a narrower report is needed:

```sh
yarn workspace @klurigo/common test:unit:coverage
yarn workspace @klurigo/klurigo-service test:unit:coverage
yarn workspace @klurigo/klurigo-service test:e2e:coverage
yarn workspace @klurigo/klurigo-web test:unit:coverage
```

Common and web coverage is written under their package `coverage/` directory.
Backend unit and e2e reports are written under
`packages/klurigo-service/coverage/unit` and
`packages/klurigo-service/coverage/e2e`.

## Storybook

Start the web workspace Storybook server on port `6006`:

```sh
yarn workspace @klurigo/klurigo-web storybook
```

The root alias is also available:

```sh
yarn klurigo-web:storybook
```

Build a static Storybook site with:

```sh
yarn workspace @klurigo/klurigo-web build-storybook
```

The static site is generated under the web workspace's Storybook output
directory.

## E2E Database Setup And Teardown

Run the standalone lifecycle scripts against the configured test MongoDB and
Redis databases:

```sh
yarn workspace @klurigo/klurigo-service e2e:setup
yarn workspace @klurigo/klurigo-service e2e:teardown
```

`e2e:setup` clears the test databases and seeds the shared fixture manifest.
`e2e:teardown` clears both stores. These operations are destructive to the
configured test state. The reset helper rejects MongoDB database names that do
not contain `_test`; still verify the environment before running either
command.

## Docker Compose Data And Cleanup

The infrastructure guide has the service ports and database details. The
supported Compose lifecycle commands are:

```sh
docker compose up -d --wait
docker compose up -d --wait mongodb redis
docker compose ps
docker compose logs --follow mongodb redis
docker compose stop
docker compose down
docker compose down -v
```

The infrastructure guide explains which commands retain or delete local
service data. In particular, `docker compose down -v` is destructive and must
only be used when the named MongoDB and Redis volumes are disposable; see the
[local infrastructure guide](../getting-started/local-infrastructure.md).

## Repository Validation

Run the checks used by the repository's static CI job, plus the aggregate test
suite, before submitting a change:

```sh
yarn build
yarn typecheck
yarn lint
yarn workspace @klurigo/klurigo-service check-circular-deps
yarn test
```

The circular-dependency check analyzes the service entry point with Madge. The
aggregate test command requires MongoDB and Redis because it includes backend
e2e tests.
