# Backend Testing

Backend tests live under `packages/klurigo-service/src` and use Jest with
`ts-jest`. The package separates isolated unit tests from tests that exercise
the configured Nest application and its external state.

## Suites And Naming

- Unit test files use the `*.spec.ts` suffix.
- Backend end-to-end test files use the `*.e2e-spec.ts` suffix.
- `jest.config.cjs` includes both patterns. `jest.unit.config.cjs` explicitly
  excludes `*.e2e-spec.ts`, because those files also contain the `spec.ts`
  suffix. `jest.e2e.config.cjs` includes only `*.e2e-spec.ts`.
- The package scripts define the suite boundaries:

  ```sh
  yarn workspace @klurigo/klurigo-service test:unit
  yarn workspace @klurigo/klurigo-service test:e2e
  yarn workspace @klurigo/klurigo-service test
  ```

  `test` runs unit tests followed by backend e2e tests.

## Unit Tests

Unit tests should create focused `@nestjs/testing` modules containing the
providers or controllers under test. They should mock external services and
avoid importing the fully configured `AppModule` when the behavior does not
require it. This keeps unit tests independent of MongoDB and Redis and allows
Jest's normal worker parallelism.

## End-To-End Infrastructure

Backend e2e tests use `createTestApp` from
`packages/klurigo-service/test-utils/utils/bootstrap.ts`. It builds the real
`AppModule`, applies the normal application configuration, and initializes a
Nest application. External media and Google authentication providers are
replaced with deterministic test doubles, while MongoDB and Redis remain real
test infrastructure.

The test configuration is split across these files:

- `packages/klurigo-service/jest.config.cjs` contains the shared TypeScript
  transform, source roots, coverage exclusions, Node test environment,
  `jest-extended` setup, and `detectOpenHandles: true`.
- `packages/klurigo-service/jest.unit.config.cjs` extends the shared config,
  selects non-e2e `*.spec.ts` files, and writes coverage to
  `packages/klurigo-service/coverage/unit`.
- `packages/klurigo-service/jest.e2e.config.cjs` extends the shared config,
  selects `*.e2e-spec.ts` files, writes coverage to
  `packages/klurigo-service/coverage/e2e`, and sets `maxWorkers: 1`.

The e2e worker limit is intentional. E2e specs reset shared MongoDB and Redis
state during their lifecycle, so running them concurrently would create
cross-test interference.

## MongoDB And Redis

The test environment is defined in
`packages/klurigo-service/.env.test`:

- MongoDB runs at `localhost:27017` in the logical database
  `klurigo_service_test`.
- Redis runs at `localhost:6379` using logical database `1`.

The Compose file provides the same MongoDB and Redis containers used for local
development; the test run selects separate logical databases rather than
separate containers. Start both services before backend e2e or complete
backend test commands:

```sh
docker compose up -d --wait mongodb redis
```

Destructive e2e reset helpers must target test infrastructure only. The
standalone reset helper in `scripts/e2e/e2e-db.ts` refuses to wipe a MongoDB
URI whose database name does not contain `_test`, and defaults to
`klurigo_service_test`. Redis is selected from `REDIS_DB`, defaulting to `1`;
do not point that setting at the development Redis database or at data that
must be retained. These helpers do not create separate containers.

## State And Isolation

Stateful tests must not depend on state left by another test or suite. Before
creating scenario fixtures, reset both configured stores:

- `resetTestState` drops all MongoDB collections and flushes the configured
  Redis database.
- The reset is commonly performed in `beforeEach` for a suite that keeps one
  initialized application for its tests. Other e2e suites create and clean up
  an application per test; follow the lifecycle used by the suite being
  changed.
- Shared typed builders and fixture helpers live under
  `packages/klurigo-service/test-utils/data`. Use their deterministic defaults
  and typed partial overrides. Use explicit IDs or date offsets when scenarios
  need distinct records or temporal relationships.

`cleanupTestApp` attempts the state reset and application shutdown separately.
If reset fails, it still attempts to close the Nest application and its Redis
connection, then reports the reset and shutdown failures. `closeTestApp`
closes the application and explicitly quits Redis while preserving actionable
errors. `createTestApp` also attempts cleanup if initialization fails.

When changing test infrastructure, preserve the existing scenarios and
assertions. Do not remove a scenario, weaken an assertion, or make tests pass
by relying on prior state. Review the resulting coverage for any intentional
change in behavior.

## Coverage And Diagnostics

Run separate backend coverage reports with:

```sh
yarn workspace @klurigo/klurigo-service test:unit:coverage
yarn workspace @klurigo/klurigo-service test:e2e:coverage
yarn workspace @klurigo/klurigo-service test:coverage
```

The first two commands write to `coverage/unit` and `coverage/e2e` under the
service package. `test:coverage` runs both commands in sequence. The root
`yarn test:coverage` command also runs common and frontend coverage and, like
the backend aggregate command, requires MongoDB and Redis for the e2e portion.

CI uploads the service reports separately with Codecov flags
`klurigo-service-unit` and `klurigo-service-e2e`. The upload paths are the two
`lcov.info` files in those directories. Codecov's repository policy is in
`codecov.yml`; it uses an auto project target with a 1% threshold and an 80%
patch target for pull requests. There is no separate backend Jest threshold
to document or introduce.

The shared Jest configuration already enables `detectOpenHandles`. If a test
leaves an open connection or another resource, rerun the relevant Jest command
with `--detectOpenHandles` and fix the owning resource. Do not hide the issue
with forced process exits or by suppressing normal Jest termination.

## Standalone Database Lifecycle

Playwright's global hooks and the standalone scripts use these package
commands:

```sh
yarn workspace @klurigo/klurigo-service e2e:setup
yarn workspace @klurigo/klurigo-service e2e:teardown
```

`e2e:setup` resets the test MongoDB and Redis databases and seeds the shared
fixture manifest. `e2e:teardown` clears both databases. The scripts connect
directly to the configured stores and do not initialize a Nest application.
