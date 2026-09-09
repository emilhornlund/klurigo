<img src="https://github.com/emilhornlund/klurigo/blob/main/.github/screenshot.png" alt="klurigo banner" align="center" />

# Klurigo

[![Main](https://github.com/emilhornlund/klurigo/actions/workflows/main.yml/badge.svg)](https://github.com/emilhornlund/klurigo/actions/workflows/main.yml)
[![codecov](https://codecov.io/gh/emilhornlund/klurigo/graph/badge.svg?token=TO2S69Y1MZ)](https://codecov.io/gh/emilhornlund/klurigo)
[![License](https://img.shields.io/badge/License-Source--Available-blue.svg)](LICENSE)
[![Node.js 24](https://img.shields.io/badge/Node.js-24-339933?logo=node.js&logoColor=white)](docs/getting-started/development.md)
[![Yarn 1.22.22](https://img.shields.io/badge/Yarn-1.22.22-2C8EBB?logo=yarn&logoColor=white)](package.json)

> • **Website:** [https://klurigo.com](https://klurigo.com) | **Public Beta:** [https://beta.klurigo.com](https://beta.klurigo.com)

A full-stack quiz platform for creating and playing engaging quizzes. Klurigo
is built as a TypeScript monorepo with a React/Vite frontend, a NestJS backend,
and shared contracts and utilities.

---

## Repository Overview

The application is organized into three primary packages:

- `@klurigo/common` - shared TypeScript contracts and utilities.
- `@klurigo/klurigo-service` - the NestJS backend service.
- `@klurigo/klurigo-web` - the React/Vite frontend application.

Repository tools, including the end-to-end fixture and MongoDB migrator
workspaces, are documented in the [monorepo organization guide](./docs/architecture/monorepo.md).

## Quick Start

Install the documented prerequisites first: Node.js `>=24 <25` (selected by
`.nvmrc`), Corepack, Git, and Docker with Compose. The repository declares Yarn
Classic `1.22.22` in `package.json`; the Compose services provide the local
MongoDB and Redis dependencies. Then run:

```sh
git clone git@github.com:emilhornlund/klurigo.git
cd klurigo
corepack enable
yarn toolchain:check
yarn install --frozen-lockfile
docker compose up -d --wait
yarn dev
```

See the [getting-started documentation](./docs/getting-started/development.md)
for prerequisites and the complete local workflow, including infrastructure
details.

## Documentation

The [documentation index](./docs/README.md) is the entry point for the full
repository documentation, including architecture, development, testing,
operations, deployment, and implementation plans.

---

## License

This project is source-available and licensed for non-commercial use only.

You may read, learn from, and modify the code for personal or educational
purposes. Commercial use, including hosting it as a service, requires explicit
written permission from the author. See [`LICENSE`](./LICENSE) for the complete
terms.

## Contributing

Interested in improving Klurigo? Read the [contribution guide](./CONTRIBUTING.md)
for the development and pull request process. By submitting a pull request, you
agree to the [Contributor License Agreement](./CLA.md).
