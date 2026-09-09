# Monorepo Organization

Klurigo is a private Yarn workspace. The root workspace configuration includes
both `packages/*` and `tools/*`:

```text
klurigo/
├── packages/
│   ├── common/
│   ├── klurigo-service/
│   └── klurigo-web/
├── tools/
│   ├── e2e-fixtures/
│   └── mongodb-migrator/
└── package.json
```

The three directories under `packages/` are the application packages. The
directories under `tools/` are workspace tools used by repository workflows;
they are not additional application layers. This page records their package
boundaries without attempting to document each tool's implementation.

## Dependency Direction

The verified application dependency direction is:

```text
@klurigo/klurigo-web  ─┐
                       ├──>  @klurigo/common
@klurigo/klurigo-service ─┘

mongodb-migrator ─────────>  @klurigo/common
```

`@klurigo/klurigo-web` and `@klurigo/klurigo-service` do not directly depend
on one another. Runtime communication between them happens through the
backend's configured HTTP API and game-event SSE endpoints, not through a
workspace package import.

## Application Packages

### `@klurigo/common`

Location: [`packages/common`](../../packages/common)

This pure TypeScript package is the shared contract and utility layer. Its
public exports include:

- Models and enums for users, authentication, quizzes, questions, games,
  participants, results, media, and game events.
- Request and response DTOs used by the web and service packages.
- Constants, type guards, and general-purpose utilities.

Both application packages declare `@klurigo/common` as a dependency and import
from its package entry point. The migrator uses the same shared package for its
CLI contracts. The root build produces common output first, then safely builds
the two applications and migrator in parallel.

### `@klurigo/klurigo-web`

Location: [`packages/klurigo-web`](../../packages/klurigo-web)

This is the React frontend, built and served with Vite. It uses the shared
models, enums, DTOs, and game-event types from `@klurigo/common`.

The frontend communicates with the service through its configured
`VITE_KLURIGO_SERVICE_URL`. Regular application operations use the API client;
game sessions open an authenticated SSE connection at
`/games/:gameID/events`. It does not import NestJS service code or connect to
MongoDB or Redis directly.

### `@klurigo/klurigo-service`

Location: [`packages/klurigo-service`](../../packages/klurigo-service)

This is the NestJS backend. It exposes the application API and game-event SSE
streams, coordinates its backend modules, and imports shared contracts from
`@klurigo/common`.

The service uses Mongoose schemas and repositories for MongoDB persistence. It
also connects to Redis for the verified cache, transient game-answer state,
BullMQ game-task jobs, distributed locks, request throttling, and cross-instance
game-event Pub/Sub. Redis is not the backend's primary persistent datastore.

Game events are published to Redis and consumed by each service instance. A
local event emitter then routes matching events to that instance's SSE
connections. The client-facing real-time protocol is SSE, not WebSocket.

## Workspace Tools

`tools/*` contains workspace members that support repository workflows:

- `@klurigo/e2e-fixtures` provides shared typed test fixture helpers. It is
  private and its `src/index.ts` entry point is consumed directly by the web
  and service test tooling.
- `mongodb-migrator` is a private repository CLI for transforming MongoDB dump
  data. Its build produces `dist/index.js`, which is both its package entry
  point and its `mongodb-migrator` command.

The workspace tools may depend on `@klurigo/common` for shared contracts and
utilities, but do not depend on either application package. The service and web
packages consume `@klurigo/e2e-fixtures` only for development and end-to-end
testing; this test-support dependency does not add an application runtime edge.

The root scripts include these workspace tools in the relevant linting and
type-checking commands. They are separate from the three application packages
and do not change the application dependency direction described above.

`@klurigo/e2e-fixtures` is intentionally not part of the build graph. Its
package entry points directly at `src/index.ts`, and the service and web test
tooling consumes that source entry without a generated `dist/` directory.

## Root Commands

The root `package.json` provides orchestration for the application packages,
including development, serving, building, linting, type checking, and tests.
The build command runs common first, runs the independent consumers in parallel,
and validates their generated entry points afterward. Every build-capable
workspace has a clean-before-build script so stale modules and TypeScript
incremental metadata cannot satisfy a later build. Package-specific commands
remain available through Yarn workspace commands; direct service or web builds
build the common package first, while root orchestration invokes their
consumer-only build steps after the shared build succeeds.
See the [development guide](../getting-started/development.md) for the local
workflow and the [documentation index](../README.md) for other repository
guides.
