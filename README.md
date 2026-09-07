<img src="https://github.com/emilhornlund/klurigo/blob/main/.github/screenshot.png" alt="klurigo banner" align="center" />

# Klurigo – formerly “Quiz”

[![Main](https://github.com/emilhornlund/klurigo/actions/workflows/main.yml/badge.svg)](https://github.com/emilhornlund/klurigo/actions/workflows/main.yml)
[![codecov](https://codecov.io/gh/emilhornlund/klurigo/graph/badge.svg?token=TO2S69Y1MZ)](https://codecov.io/gh/emilhornlund/klurigo)

> • **Website:** [https://klurigo.com](https://klurigo.com) | **Public Beta:** [https://beta.klurigo.com](https://beta.klurigo.com)

A full‑stack quiz game platform built with a modern monorepo setup. It features a shared type system, a NestJS backend, and a Vite‑powered React frontend.

---

## Documentation

See the [documentation index](./docs/README.md) for implementation plans and other repository documentation.

## Prerequisites

Before you get started, make sure you have the following installed on your machine:

- **Node.js** v24 (Active LTS) or higher
  We recommend using [nvm](https://github.com/nvm-sh/nvm) (Node Version Manager) to manage your Node versions.

- **Yarn** v1.22.22 or higher
  Install via `npm install --global yarn` if you don’t already have it.

- **Git**
  To clone and manage the repository.

- **Docker & Docker Compose** (optional)
  If you prefer to run your database and cache in containers.

## Monorepo Structure

This project uses [Yarn Workspaces](https://classic.yarnpkg.com/en/docs/workspaces/) to manage multiple packages:

```text
klurigo/
├── packages/
│   ├── common          # Shared models and utilities
│   └── klurigo-service # Backend service (NestJS)
│   ├── klurigo-web     # Frontend app (Vite + React)
```

## Scripts

The root `package.json` contains orchestration scripts for development, building, and testing:

**Scripts:**

- `yarn dev` – Run frontend, backend, and Storybook in parallel.
- `yarn serve` – Serve both frontend and backend builds.
- `yarn build` – Build all packages.
- `yarn clean` – Clean all packages.
- `yarn lint` / `yarn lint:fix` – Run linting across all packages.
- `yarn test` – Run all tests concurrently.

## Packages

### [`@klurigo/common`](./packages/common)

Shared models and validation logic between the backend and frontend.

- Outputs both CommonJS and ESM modules.
- Consumed by `@klurigo/klurigo-web` and `@klurigo/klurigo-service`.

**Scripts:**

- `yarn build` – Clean and compile.
- `yarn lint` / `yarn lint:fix` – Lint the codebase.

### [`@klurigo/klurigo-web`](./packages/klurigo-web)

Frontend application built with **React**, **Vite**, and **Storybook**.

**Features:**

- Vite dev server and production builds.
- Component testing with Vitest.
- Storybook integration for UI components.

**Scripts:**

- `yarn dev` – Start the Vite dev server.
- `yarn build` – Production build.
- `yarn serve` – Preview the built app.
- `yarn test` / `test:watch` / `test:update` – Run tests.
- `yarn storybook` / `build-storybook` – Start or build Storybook.
- `yarn lint` / `lint:fix` – Lint the codebase.

### [`@klurigo/klurigo-service`](./packages/klurigo-service)

Backend API built with **NestJS**, using SSE for real‑time updates.

**Features:**

- Game state and lifecycle management.
- Shared types from `@klurigo/common`.
- Jest-based test suite.
- Circular dependency detection.

**Scripts:**

- `yarn dev` – Start the NestJS app in watch mode.
- `yarn build` – Compile for production.
- `yarn serve` – Run the compiled app.
- `yarn check-circular-deps` – Check for circular imports.
- `yarn lint` / `lint:fix` – Lint the codebase.

**Backend test structure and lifecycle:**

- Unit specs end in `*.spec.ts`. E2e specs end in `*.e2e-spec.ts`; the unit Jest
  configuration explicitly excludes e2e specs even though they also contain the
  `spec.ts` suffix.
- Unit tests use focused Nest testing modules rather than the fully configured
  application. They do not require or use real MongoDB or Redis, so they can use
  Jest's normal worker parallelism.
- Backend e2e tests use `createTestApp`, real test MongoDB and Redis services,
  and the serial Jest configuration (`maxWorkers: 1`). Start both services,
  for example with `docker compose up -d`, before any command that runs e2e
  tests.
- Use the shared typed builders in
  `packages/klurigo-service/test-utils/data`. Prefer their deterministic
  defaults, apply partial typed overrides for scenario-specific values, and use
  explicit IDs or date offsets when fixtures must be distinct or have a temporal
  relationship.
- For a stateful e2e suite, initialize one fully configured Nest application per
  suite. Before each stateful test, reset all MongoDB collections and the
  configured Redis database, then create that test's fixtures. During suite
  cleanup, reset shared state and close every application resource. Cleanup must
  still attempt shutdown when reset fails and must preserve actionable
  diagnostics for MongoDB reset, Redis reset, application, and Redis shutdown
  failures.
- Stateful e2e tests must use only the configured test MongoDB and Redis
  databases. They must not depend on state left by another test or suite.

Run the backend suites from the repository root with these workspace commands:

```sh
yarn workspace @klurigo/klurigo-service test:unit
yarn workspace @klurigo/klurigo-service test:e2e
yarn workspace @klurigo/klurigo-service test
yarn workspace @klurigo/klurigo-service test:unit:coverage
yarn workspace @klurigo/klurigo-service test:e2e:coverage
yarn workspace @klurigo/klurigo-service test:coverage
```

The complete test and coverage commands include the e2e suite, so they also
require MongoDB and Redis to be running. Unit and e2e coverage remain separate
under `packages/klurigo-service/coverage/unit` and
`packages/klurigo-service/coverage/e2e`; coverage should preserve or improve
the existing scenario coverage. Use the repository's existing Codecov policy in
`codecov.yml` rather than introducing a backend-specific threshold. CI uploads
the reports separately with the `klurigo-service-unit` and
`klurigo-service-e2e` flags.

Test-infrastructure refactoring must not remove scenarios or weaken existing
assertions unless there is a deliberate, documented reason. Such a change
requires review of the affected coverage. Preserve normal Jest termination,
diagnostics, and resource cleanup; do not suppress open-handle failures or add
forced process exits. If a test leaves a handle behind, rerun the relevant
command with `--detectOpenHandles` to identify the resource.

Use `yarn e2e:setup` before frontend Playwright tests when the e2e database
needs to be reset and seeded, and `yarn e2e:teardown` afterward to clear it.
These standalone scripts connect directly to the test MongoDB and Redis
services and do not require a Nest application instance.

---

## Development

Clone the repo and install dependencies:

```sh
git clone git@github.com:emilhornlund/klurigo.git
cd klurigo
yarn install
```

To start everything in dev mode:

```sh
yarn dev
```

### Running individual workspaces

```sh
# Backend
yarn workspace @klurigo/klurigo-service dev

# Frontend
yarn workspace @klurigo/klurigo-web dev

# Storybook
yarn workspace @klurigo/klurigo-web storybook
```

### Local infrastructure helpers

Spin up **MongoDB** and **Redis** containers the quick way:

```sh
docker compose up -d
```

The default `docker-compose.yml` provides sensible development‑only images with exposed ports matching the backend configuration.

---

## End-to-End Tests (Playwright)

The frontend application includes end-to-end tests written with **Playwright**. These tests run against the real frontend and backend, using a dedicated test database and Redis instance that is automatically reset and seeded before execution.

### Prerequisites

Playwright requires browser binaries to be installed once on your machine.

```sh
yarn workspace @klurigo/klurigo-web playwright install
```

On Linux (for example in CI), system dependencies may also be required:

```sh
yarn workspace @klurigo/klurigo-web playwright install --with-deps
```

### Run locally

```sh
yarn workspace @klurigo/klurigo-web test:e2e
```

This will:
- Start the frontend (Vite dev server)
- Start the backend in test mode
- Reset and seed MongoDB and Redis
- Run Playwright tests across Chromium, Firefox, and WebKit

### CI behavior

End-to-end tests are **disabled by default** in CI and are only executed for selected workflows (for example on `main` and production deploys).

---

## CI/CD & Deployment

All build, test, release, and deployment steps are now handled automatically by **GitHub Actions**. On every push and pull request the pipeline validates the codebase, and on merges to `main` it:

1. Builds the frontend and backend Docker images.
2. Runs the test suites.
3. Tags the images with the current commit SHA and a semver tag (on release).
4. Pushes artefacts to the configured container registry.
5. Updates the production environment via the deployment workflow.

---

## License

This project is source-available and licensed for non-commercial use only.

You are free to read, learn from, and modify the code for personal or
educational purposes. Commercial use, including offering the software
as a hosted or SaaS service, is not permitted without explicit written
permission from the author.

If you are interested in using this project commercially, please
contact the author to discuss licensing options.

[See the LICENSE file for full terms.](./LICENSE)

---

## Contributing

By submitting a pull request, you agree to the Contributor License Agreement in `CLA.md`.
