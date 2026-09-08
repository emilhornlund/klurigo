# Deployment

This page describes the deployment hand-offs defined in
[`.github/workflows`](../../.github/workflows). Beta and production use the
same reusable deployment mechanics but have different triggers, GitHub Actions
environments, and Portainer webhook secrets.

## Deployment Paths

### Beta

A push to `main` runs the following jobs in dependency order:

1. `build` runs the reusable build workflow, including Playwright.
2. `docker-build-and-push` builds and publishes the web and service images.
3. `deploy-beta` calls the reusable deployment workflow with `target_env: beta`
   and the Docker workflow's short SHA output.
4. `sentry-release` runs after beta deployment for the `beta` environment.

The `main` workflow cancels an older in-progress run in its `main` concurrency
group. The reusable deployment job itself uses the `beta` GitHub Actions
environment and does not cancel an in-progress deployment for that environment.

### Production

The `prod-deploy.yml` workflow is started only by `workflow_dispatch`. Its jobs
run in this dependency order:

1. `build` runs the reusable build workflow, including Playwright.
2. `docker-build-and-push` builds and publishes the web and service images.
3. `deploy-production` calls the reusable deployment workflow with
   `target_env: prod` and the Docker workflow's short SHA output.
4. `sentry-release` runs after production deployment for the `prod` environment.

The manual workflow uses the `prod-deploy` concurrency group and does not cancel
an in-progress run. The reusable deployment job uses the `prod` GitHub Actions
environment and also does not cancel an in-progress deployment for that
environment.

## Image Publishing

The Docker workflow runs on `self-hosted` runners after `build` succeeds. It
publishes these images to the configured private registry host
`emils-nuc-server:5000`:

- `emils-nuc-server:5000/klurigo-web:<short-sha>`
- `emils-nuc-server:5000/klurigo-service:<short-sha>`

The tag is the output of `git rev-parse --short HEAD`. The deployment workflow
receives that output and uses the same tag for both image references. No semver
image tag is configured in the checked-in workflows.

## Deploy Mechanics

The reusable [`deploy.yml`](../../.github/workflows/deploy.yml) workflow runs
on a `self-hosted` runner with an environment selected by `target_env`. For
each matrix service, `klurigo-web` and `klurigo-service`, it:

1. Checks out `emilhornlund/infra` into the `infra` directory at its `main` ref.
2. Updates the environment-specific Compose file
   `infra/stacks/<service>/docker-compose.<env>.yaml` with the image
   `emils-nuc-server:5000/<service>:<tag>`.
3. Sets the `services.<env>-<service>.image` value in that file with `yq`.
4. Commits changed infrastructure with
   `deploy(<env>-<service>): <tag>` and pushes the change. If there is no Git
   diff, it skips the commit and push.
5. Sends a POST notification to the matching environment-specific Portainer
   webhook and logs the returned HTTP code.

The beta notification references these secrets:

- `KLURIGO_PORTAINER_BETA_WEBHOOK`
- `KLURIGO_SERVICE_PORTAINER_BETA_WEBHOOK`

The production notification references these secrets:

- `KLURIGO_PORTAINER_PRODUCTION_WEBHOOK`
- `KLURIGO_SERVICE_PORTAINER_PRODUCTION_WEBHOOK`

The infrastructure checkout requires `INFRA_REPO_PAT`. Image publishing uses
`REGISTRY_USER` and `REGISTRY_PASS`. The Sentry release hand-off uses
`SENTRY_AUTH_TOKEN` and `SENTRY_ORG`; the image build also requires
`SENTRY_KLURIGO_DSN` and `SENTRY_KLURIGO_SERVICE_DSN`. These names are listed
only to identify workflow inputs. No secret values belong in this repository or
in this documentation.

## Boundaries And Limits

The checked-in Dockerfiles define application image behavior, while the
production application environment files contribute application-side
configuration. GitHub Actions builds those images and updates only the image
references in the external infrastructure repository. The external
repository's Compose files, services, networks, volumes, runtime credentials,
and Portainer configuration are not checked in here.

The root [`docker-compose.yml`](../../docker-compose.yml) provides local
MongoDB and Redis services, including their local ports, health checks, and
named volumes. It is used for development and test prerequisites; it is not the
production infrastructure definition and does not verify how the external
stacks run.

This repository verifies the workflow hand-off only. It does not establish the
external infrastructure's health checks, deployment completion semantics,
credentials, service topology, or operational access. It also contains no
verified rollback procedure. Do not infer those details from the image build,
the infrastructure repository path, or the Portainer webhook POST.
