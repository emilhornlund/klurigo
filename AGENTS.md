# Agent Guidance

Klurigo is a Yarn workspace monorepo. Its application packages are:

- `@klurigo/common` - shared domain contracts and utilities
- `@klurigo/klurigo-web` - the frontend application
- `@klurigo/klurigo-service` - the backend application

Work from the repository root by default. The [documentation index](docs/README.md)
is the canonical entry point for current project knowledge; use it instead of
duplicating detailed guidance here.

## Documentation

- Architecture: [overview](docs/architecture/overview.md) and
  [monorepo organization](docs/architecture/monorepo.md)
- Development: [commands](docs/development/commands.md) and
  [local development](docs/getting-started/development.md)
- Local services: [local infrastructure](docs/getting-started/local-infrastructure.md)
- Testing: [testing](docs/development/testing.md),
  [backend testing](docs/development/backend-testing.md), and
  [end-to-end testing](docs/development/end-to-end-testing.md)
- Operations: [CI/CD](docs/operations/ci-cd.md) and
  [deployment](docs/operations/deployment.md)

Plans under [`docs/plans/`](docs/plans/) are proposals or historical notes, not
authoritative sources for current shipped behavior.

## Operating Rules

- Keep changes scoped to the request. Follow established patterns, avoid
  unnecessary abstractions, and do not include unrelated formatting or
  refactoring.
- Preserve strong TypeScript typing and existing test coverage. Update tests
  when behavior changes, and have a deliberate reason for any coverage loss.
- Validate changed code with the relevant repository checks. Keep documentation
  and links accurate when behavior or guidance changes.
- Never commit secrets, API keys, or sensitive configuration.
