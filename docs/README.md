# Documentation

This directory is the entry point for repository documentation.

## Getting Started

- [Local development](./getting-started/development.md) - prerequisites,
  installation, and application startup.
- [Local infrastructure](./getting-started/local-infrastructure.md) - MongoDB,
  Redis, and Docker Compose workflows.

## Architecture

- [Architecture overview](./architecture/overview.md) - current system-level
  components, responsibilities, persistence, infrastructure, and communication
  paths.
- [Monorepo organization](./architecture/monorepo.md) - Yarn workspace layout,
  package roles, dependency direction, and workspace tools.

## Development

- [Development commands](./development/commands.md) - canonical root and
  workspace-scoped command reference, prerequisites, and operational safety.
- [Testing](./development/testing.md) - test layers and links to detailed
  backend and Playwright guidance.
- [Backend testing](./development/backend-testing.md) - Jest suites, test
  infrastructure, lifecycle cleanup, isolation, and coverage.
- [End-to-end testing](./development/end-to-end-testing.md) - Playwright
  setup, seeded fixtures, browser projects, GameSession execution, and CI.

## Operations

- [CI/CD](./operations/ci-cd.md) - workflow triggers, build checks, coverage,
  Playwright, image publishing, and Sentry releases.
- [Deployment](./operations/deployment.md) - beta and production deployment
  paths, infrastructure hand-off, and verified operational boundaries.

## Plans

The `plans/` directory is the documentation category that exists today. It contains the repository's implementation plans:

- [Anonymous Player Rating](./plans/anonymous-player-rating.md)
- [Discovery Rails](./plans/discovery-rails.md)
- [User Profile](./plans/user-profile.md)

Additional categories may be introduced in the future as the documentation grows. New documentation filenames should use lowercase kebab-case, such as `feature-overview.md`.
