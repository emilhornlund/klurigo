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

## Frontend Browser Verification

Chrome DevTools MCP is available to development agents for browser-based inspection of the Klurigo frontend.

For changes affecting the appearance, layout, responsiveness, or interaction of components in `packages/klurigo-web`,
browser verification is required when the application can be started in the execution environment.

- Follow [browser verification](docs/development/browser-verification.md) to start the application and inspect it with
  Chrome DevTools MCP.
- Inspect the actual rendered UI rather than relying exclusively on source code, component structure, or automated
  tests.
- Check affected pages at desktop and mobile viewport sizes, including constrained layouts when relevant.
- Inspect screenshots and page structure for visual regressions, spacing, alignment, clipping, overflow, and
  inaccessible controls.
- Exercise the affected interactions and inspect relevant browser console errors and failed network requests.
- Correct issues discovered during inspection and verify the affected UI again.
- Use Storybook for isolated component inspection when appropriate, and the running application for integration and
  user-flow verification.
- Treat visual inspection as an additional quality gate. It does not replace unit tests, Playwright tests, type
  checking, linting, or other required validation.
- Never claim browser verification succeeded unless the affected UI was actually inspected.
- Report any environmental limitations that prevent browser verification instead of silently skipping it.

Keep browser activity scoped to the task. Do not modify unrelated application state or access production systems during
verification.
