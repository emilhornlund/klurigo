# Local Development

This guide covers the local application workflow. For MongoDB, Redis, and the
provided Docker Compose setup, see the [local infrastructure guide](./local-infrastructure.md).
For the complete root and workspace command inventory, see the
[development command reference](../development/commands.md).

## Prerequisites

Install the following before starting development:

- Node.js matching the repository engine constraint: `>=24 <25`.
- Yarn Classic `1.22.22`. Install the repository's supported version with
  `npm install --global yarn@1.22.22`.
- Git, to clone the repository.
- MongoDB and Redis. Docker and Docker Compose can provide both services using
  the workflow in the [local infrastructure guide](./local-infrastructure.md).

## Clone And Install

Clone the repository and install all workspace dependencies from the repository
root:

```sh
git clone git@github.com:emilhornlund/klurigo.git
cd klurigo
yarn install --frozen-lockfile
```

The development environment files are already included in the service and web
workspaces. The backend loads `packages/klurigo-service/.env.development` by
default, and the frontend loads `packages/klurigo-web/.env.development` when
running in development mode.

## Start The Development Stack

Start MongoDB and Redis first, for example with:

```sh
docker compose up -d --wait
```

Then start the backend and frontend together:

```sh
yarn dev
```

The root `yarn dev` script starts only the backend and frontend. It waits for
the backend health endpoint before starting the frontend; it does not start
Storybook.

With the default development environment, the applications are available at:

- Frontend: <http://localhost:3000>
- Backend health endpoint: <http://localhost:8080/health>

Start Storybook separately when needed. It listens on port 6006:

```sh
yarn workspace @klurigo/klurigo-web storybook
```

## Run Workspaces Individually

Run workspace-specific development commands from the repository root in their
own terminals. The command reference lists the backend, frontend, and
Storybook commands. MongoDB and Redis must be running before starting the
backend.

The frontend development server uses port 3000 and proxies API requests to the
backend on port 8080 using the checked-in development environment defaults.
