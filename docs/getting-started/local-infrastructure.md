# Local Infrastructure

The local application requires MongoDB and Redis. The repository's
`docker-compose.yml` provides both services with the ports, health checks, and
named volumes expected by the development configuration.

## Development Services

| Service | Compose service | Image         | Host port | Development setting        |
| ------- | --------------- | ------------- | --------- | -------------------------- |
| MongoDB | `mongodb`       | `mongo:8.0.9` | `27017`   | Database `klurigo_service` |
| Redis   | `redis`         | `redis:8.0.1` | `6379`    | Database `0`               |

The backend development environment connects to MongoDB at
`localhost:27017` and Redis at `localhost:6379`. MongoDB data is stored in the
`mongodb` named volume, and Redis data is stored in the `redis` named volume.

## Docker Compose Workflow

See the [development command reference](../development/commands.md) for the
canonical Compose startup, inspection, logging, stop, and cleanup commands.
Use `docker compose down -v` only when the local service data can be deleted;
it removes the named MongoDB and Redis volumes as well as the containers and
network.

## Development And Test Data

Normal local development uses the values in
`packages/klurigo-service/.env.development`:

- MongoDB database: `klurigo_service`
- Redis database: `0`

Backend end-to-end tests use the values in
`packages/klurigo-service/.env.test`:

- MongoDB database: `klurigo_service_test`
- Redis database: `1`

The Compose file does not create separate test containers. Development and
backend test runs use the same MongoDB and Redis service ports but separate
logical databases. Backend e2e tests reset their configured test state, so do
not point test configuration at a database containing data you need to keep.

Start both Compose services before running backend e2e or complete backend
test commands. Frontend Playwright tests also use the test MongoDB and Redis
configuration and reset and seed that test state as part of their workflow.
