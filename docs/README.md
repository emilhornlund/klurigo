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

## Plans

The `plans/` directory is the documentation category that exists today. It contains the repository's implementation plans:

- [Anonymous Player Rating](./plans/anonymous-player-rating.md)
- [Discovery Rails](./plans/discovery-rails.md)
- [User Profile](./plans/user-profile.md)

Additional categories may be introduced in the future as the documentation grows. New documentation filenames should use lowercase kebab-case, such as `feature-overview.md`.
