# CI/CD

This page describes the automation currently defined in
[`.github/workflows`](../../.github/workflows). It documents the repository's
verified checks and hand-offs; it does not prescribe infrastructure or release
procedures that are not checked in here.

## Workflow Triggers

| Workflow | Trigger | Job order or result |
| --- | --- | --- |
| Pull-Request | `pull_request` targeting any branch | `build` |
| Main | Push to `main` | `build` -> `docker-build-and-push` -> `deploy-beta` -> `sentry-release` |
| Prod Deploy | Manual `workflow_dispatch` | `build` -> `docker-build-and-push` -> `deploy-production` -> `sentry-release` |

The pull-request workflow uses the concurrency group
`pr-${{ github.event.pull_request.number || github.ref }}` and cancels an
older run in that group. The `main` workflow uses the `main` group and also
cancels an older run. Production dispatches use the `prod-deploy` group and do
not cancel an in-progress run. The reusable deployment workflow has a separate
per-environment group, `deploy-infra-${{ inputs.target_env }}`, that also does
not cancel an in-progress deployment.

Both pull requests and the two deployment paths call the reusable build
workflow with `run_e2e: true`. The pull-request workflow only performs the
reusable build checks; it does not call the Docker, deployment, or Sentry
workflows.

## Build Checks

The reusable build workflow runs its static-build, unit-coverage,
backend-e2e-coverage, and frontend-e2e jobs on `ubuntu-latest`. Each job checks
out the repository with a shallow checkout, sets up Node.js 24 with Yarn
caching, installs Yarn Classic `1.22.22`, and runs
`yarn install --frozen-lockfile`.

The static-build job then runs these root or workspace commands in order:

1. `yarn build`
2. `yarn check-types`
3. `yarn lint`
4. `yarn workspace @klurigo/klurigo-service check-circular-deps`

The root build builds `@klurigo/common` before the web and service application
builds. Type checking and linting include the application packages and the
workspace tools configured by the root `package.json`. The circular-dependency
check analyzes the service entry point with Madge. These static checks do not
start the Compose services.

## Unit Coverage

The unit-coverage job uses `ubuntu-latest`, Node.js 24, the frozen Yarn
lockfile, and first builds `@klurigo/common`. It then runs:

```sh
yarn test:unit:coverage
```

This covers common, backend unit, and frontend unit tests. It does not start
MongoDB or Redis. The three following Codecov uploads use explicit files and do
not search for additional reports:

| Upload | File | Flag and name |
| --- | --- | --- |
| Common | `./packages/common/coverage/lcov.info` | `common` |
| Web | `./packages/klurigo-web/coverage/lcov.info` | `klurigo-web` |
| Service unit | `./packages/klurigo-service/coverage/unit/lcov.info` | `klurigo-service-unit` |

Each upload has `disable_search: true`, `verbose: true`, and
`fail_ci_if_error: true`, so a Codecov action error fails the job. The upload
steps have no `always()` condition; a preceding failed coverage step therefore
does not proceed to those uploads under the workflow's normal step behavior.

## Backend E2E Coverage

The backend-e2e-coverage job builds `@klurigo/common`, starts the Compose
`mongodb` and `redis` services, and runs:

```sh
yarn workspace @klurigo/klurigo-service test:e2e:coverage
```

It always runs `docker compose down -v` during cleanup, then uploads
`./packages/klurigo-service/coverage/e2e/lcov.info` with the
`klurigo-service-e2e` flag. Backend E2E coverage therefore remains separate
from the unit-coverage job while preserving its Codecov report and flag.

The repository Codecov policy is in [`codecov.yml`](../../codecov.yml). Pull
requests receive non-informational project and patch statuses: the project
target is automatic with a `1%` threshold, and the patch target is `80%`.
Both use an automatic base and apply only to pull requests. The Codecov comment
does not require a coverage change, and the component project and patch
statuses are informational.

## Frontend E2E

The Frontend E2E Tests job is conditional on the reusable workflow's
`run_e2e` input.
Its current callers all enable it: pull requests, pushes to `main`, and manual
production deployment. It runs on `ubuntu-latest`, installs dependencies with
the frozen lockfile, builds `@klurigo/common`, and starts the Compose MongoDB
and Redis services.

The job caches browsers using the installed `@playwright/test` version and the
runner OS and architecture. It installs Chromium, Firefox, and WebKit with
Linux system dependencies:

```sh
yarn workspace @klurigo/klurigo-web playwright install chromium firefox webkit --with-deps
```

The test step sets `CI=true` and runs
`yarn workspace @klurigo/klurigo-web test:e2e`. In CI, Playwright uses two
retries, does not reuse existing web servers, and records a trace on the first
retry. Compose is cleaned up with `docker compose down -v` in an `always()`
step.

The Playwright configuration separates ordinary browser tests from
GameSession tests:

- Chromium and Firefox run ordinary tests and exclude
  `**/game-session/**/*.spec.ts`.
- WebKit is added only when `CI` is set and runs ordinary tests only.
- `chromium-game-session` and `firefox-game-session` include the GameSession
  pattern, use one worker, a 15-second expect timeout, and a 90-second test
  timeout.
- Ordinary tests are fully parallel; GameSession tests use the dedicated
  single-worker projects because they exercise shared real-time state.

There is no WebKit GameSession project. WebKit coverage in CI is therefore
currently limited to non-GameSession tests.

## Docker Images

The Docker workflow is called only after the reusable build succeeds on the
`main` and manual production paths. Its `prepare` job and its matrix image
build job run on `self-hosted` runners. The matrix builds these two images:

- `klurigo-web` from `packages/klurigo-web/Dockerfile`
- `klurigo-service` from `packages/klurigo-service/Dockerfile`

The configured private registry host is `emils-nuc-server:5000`. The workflow
logs in with the `REGISTRY_USER` and `REGISTRY_PASS` secrets and tags each image
only as:

```text
emils-nuc-server:5000/<service>:<short-sha>
```

The short tag is produced by `git rev-parse --short HEAD`. The Docker build
passes these Sentry arguments:

- `SENTRY_DSN`, selected from `SENTRY_KLURIGO_DSN` for the web project or
  `SENTRY_KLURIGO_SERVICE_DSN` for the service project.
- `SENTRY_RELEASE`, set to `<sentry-project>@<full-github-sha>`.

The checked-in Dockerfiles wire these arguments to the corresponding web
`VITE_SENTRY_*` or service `SENTRY_*` environment variables. No other image
tag or registry is configured by this workflow.

## Releases

The static-build job uploads source-map artifacts only when the ref is
`refs/heads/main` or starts with `refs/tags/`:

- `klurigo-sentry-artifacts` from `packages/klurigo-web/dist/assets/**/*.map`
- `klurigo-service-sentry-artifacts` from `packages/klurigo-service/dist/**/*.map`

After beta or production deployment, the corresponding Sentry workflow runs on
a `self-hosted` runner in the `beta` or `prod` GitHub Actions environment. For
each of the `klurigo` and `klurigo-service` projects it downloads the matching
artifact, creates a release named `<project>@<github.sha>`, associates commits,
uploads source maps, finalizes the release, and records a deployment with
environment `beta` or `prod` and name `GitHub Actions`.

The repository does not configure semver image release tags. The verified image
tag is the short commit SHA described above.

## Boundaries

GitHub Actions performs the checked-in build, test, image publishing, artifact,
and hand-off steps. The application-side behavior comes from the checked-in
package configuration, production environment files, and Dockerfiles. The
deployment workflow does not edit those application files; it passes the image
tag to the external infrastructure repository described in
[deployment documentation](./deployment.md).

The root [`docker-compose.yml`](../../docker-compose.yml) is the local
MongoDB-and-Redis Compose configuration used by tests and development. It is
not the production infrastructure definition.
