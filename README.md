<img src="https://github.com/emilhornlund/klurigo/blob/main/.github/screenshot.png" alt="klurigo banner" align="center" />

# Klurigo – formerly “Quiz”

[![Main](https://github.com/emilhornlund/klurigo/actions/workflows/main.yml/badge.svg)](https://github.com/emilhornlund/klurigo/actions/workflows/main.yml)
[![codecov](https://codecov.io/gh/emilhornlund/klurigo/graph/badge.svg?token=TO2S69Y1MZ)](https://codecov.io/gh/emilhornlund/klurigo)

> • **Website:** [https://klurigo.com](https://klurigo.com) | **Public Beta:** [https://beta.klurigo.com](https://beta.klurigo.com)

A full‑stack quiz game platform built with a modern monorepo setup. It features a shared type system, a NestJS backend, and a Vite‑powered React frontend.

---

## Documentation

See the [documentation index](./docs/README.md) for implementation plans and other repository documentation.

## Architecture

Klurigo consists of a React/Vite web application, a NestJS backend, and a
shared TypeScript contract package. See the [architecture overview](./docs/architecture/overview.md)
for system responsibilities and communication paths, and the
[monorepo organization reference](./docs/architecture/monorepo.md) for package
boundaries and dependency direction.

## Quick Start

Install Node.js `>=24 <25`, Yarn Classic `1.22.22`, Git, and Docker with
Compose for the local MongoDB and Redis services. Then clone the repository,
install dependencies, start infrastructure, and start the application:

```sh
git clone git@github.com:emilhornlund/klurigo.git
cd klurigo
yarn install --frozen-lockfile
docker compose up -d --wait
yarn dev
```

For the complete application workflow, see the [development guide](./docs/getting-started/development.md).
For MongoDB, Redis, ports, Compose inspection, and data cleanup, see the
[local infrastructure guide](./docs/getting-started/local-infrastructure.md).

## Development Commands

See the [development command reference](./docs/development/commands.md) for
the verified root and workspace-scoped commands, prerequisites, test services,
generated artifacts, and safety constraints.

## Testing

Detailed testing guidance lives in the [testing overview](./docs/development/testing.md):

- [Backend testing](./docs/development/backend-testing.md) - Jest suites,
  test infrastructure, lifecycle cleanup, isolation, and coverage.
- [End-to-end testing](./docs/development/end-to-end-testing.md) - Playwright
  setup, seeded fixtures, browser projects, GameSession execution, and CI.

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
