# Documentation

This directory is the entry point for current repository documentation. The
root [README](../README.md) is the project landing page, while
[CONTRIBUTING.md](../CONTRIBUTING.md) owns the contribution process. The
coding-agent rules in [AGENTS.md](../AGENTS.md) are separate and are not
contributor or application documentation.

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
  workspace-scoped command reference and command-specific safety notes.

## Testing

- [Testing](./development/testing.md) - test layers, their boundaries, and
  links to detailed backend and Playwright guidance.
- [Backend testing](./development/backend-testing.md) - Jest suites, test
  infrastructure, lifecycle cleanup, isolation, and coverage.
- [End-to-end testing](./development/end-to-end-testing.md) - Playwright
  setup, seeded fixtures, browser projects, GameSession execution, and CI.

## Operations

- [CI/CD](./operations/ci-cd.md) - workflow triggers, build checks, coverage,
  Playwright, image publishing, and Sentry releases.
- [Deployment](./operations/deployment.md) - beta and production deployment
  paths, infrastructure hand-off, and verified operational boundaries.

## Features

There are no standalone current feature pages in this repository yet. Feature
proposals and implementation notes are kept under
[`plans/`](./plans/) and must not be used as the authority for shipped
behavior.

## Technical Reference

- [MongoDB migrator](../tools/mongodb-migrator/README.md) - CLI usage and
  supported dump transformation collections.

## Plans

The `plans/` directory contains implementation plans, phased proposals, and
historical plan notes:

- [Anonymous Player Rating](./plans/anonymous-player-rating.md)
- [Discovery Rails](./plans/discovery-rails.md)
- [User Profile](./plans/user-profile.md)

New documentation filenames should use lowercase kebab-case, such as
`feature-overview.md`.
