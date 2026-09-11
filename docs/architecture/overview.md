# Architecture Overview

This document is the system-level entry point for the current Klurigo
architecture. It describes the behavior and boundaries visible in the
repository today. For the workspace and package layout, see the
[monorepo reference](./monorepo.md).

## System Shape

Klurigo is organized around a browser application and a backend service:

```text
Browser
  |
  | HTTP API requests and authenticated SSE subscriptions
  v
@klurigo/klurigo-web (React + Vite)
  |
  v
@klurigo/klurigo-service (NestJS)
  |                         |
  | Mongoose                | Redis clients, queues, locks,
  v                         | cache, throttling, and Pub/Sub
MongoDB                     v
                       Redis
```

The service is the boundary for application API operations, game state, and
game-event streams. The web package does not call backend modules directly;
it uses the configured service URL for API requests and game-event streams.
Both packages use `@klurigo/common` for shared contracts and utilities. The
frontend and backend do not directly depend on one another.

## Frontend

`@klurigo/klurigo-web` is the React application in
[`packages/klurigo-web`](../../packages/klurigo-web). Vite provides the
development server and production build. The application uses its configured
`VITE_KLURIGO_SERVICE_URL` as the base for backend API requests and for
authenticated game-event subscriptions.

The browser opens an `EventSource` connection to
`/games/:gameID/events`. The client consumes the stream as server-sent events,
filters heartbeat events, and reconnects when a connection fails. The stream
is not a WebSocket connection.

## Backend

`@klurigo/klurigo-service` is the NestJS application in
[`packages/klurigo-service`](../../packages/klurigo-service). Its root module
assembles API and domain modules for authentication, users, quizzes, games,
game tasks and results, discovery, media, health, tokens, and game events.
Those module-level details are intentionally outside this system overview.

The service exposes the HTTP API and the game-event SSE endpoint. It validates
and authorizes requests, coordinates backend modules, persists application
documents, schedules game transitions, and publishes participant-specific
game events.

## Shared Contracts

`@klurigo/common` is the shared TypeScript package in
[`packages/common`](../../packages/common). It exports the models, enums,
request and response DTOs, game-event types, constants, and utility functions
used by both application packages. It contains no dependency on the web or
service package, so it is the shared dependency rather than an application
layer between them.

## Persistence And Infrastructure

### MongoDB

MongoDB is the backend's persistent document datastore. The service connects
to MongoDB through `@nestjs/mongoose` and registers Mongoose schemas in its
domain modules. The checked-in local Compose configuration provides MongoDB on
port `27017`; the development and test configurations use separate logical
databases.

### Redis

Redis is an infrastructure service, not the primary application datastore.
The current service uses Redis for these responsibilities:

- Cache storage through the Nest cache manager and Keyv Redis.
- BullMQ-backed job infrastructure for scheduled game-task transitions.
- Distributed locks used by selected scheduled and concurrent operations.
- Redis-backed request throttling outside the test environment.
- Cross-instance game-event Pub/Sub on the `events` channel.

The service also uses Redis-backed storage for current game-question answer
state. This is transient game state, distinct from MongoDB's persistent
document storage.

Within a service instance, a Nest event emitter fans distributed game events
out to matching SSE subscriptions. It is not a replacement for Redis Pub/Sub:
Redis distributes events between instances, while the in-process emitter
delivers them to connections owned by the current instance.

## Communication Paths

### HTTP API

The web application sends API requests to the configured service base URL.
NestJS controllers expose operations for authentication, users, quizzes,
games, discovery, media, profiles, and health. Request and response shapes
shared between the client and service come from `@klurigo/common` where the
contract is shared.

### Game Events

Game state changes are converted into participant-specific game-event
payloads by the service. The publisher sends those payloads to Redis Pub/Sub.
Every service instance subscribes to the `events` channel, converts received
messages into local in-process events, and relays matching events through its
SSE connections. A game client therefore receives real-time updates from the
service instance holding its connection, even when the state change was
handled by another instance.

The service builds an authoritative participant-specific snapshot from the
current game document and transient answer state whenever an SSE subscription
is opened, including after a client retry or page refresh. The snapshot uses the
existing `GameEvent` shapes, so it includes the current question and submitted
answer where applicable, result distributions, scores, leaderboards, podium, or
completed-game state. Snapshot construction must succeed before the stream is
considered established; a heartbeat is not a recovery substitute. The frontend
treats the first non-heartbeat event as the recovery boundary and keeps the
previous rendered state only while a transient retry is pending.

Heartbeats keep long-lived connections healthy but are not game state updates.
Active and normally completed sessions can be recovered while the persisted
game token remains valid. Expired or host-terminated sessions continue to return
their existing authorization/unavailable behavior and are not made resumable by
client state.

## Scope

This page documents current package and system responsibilities evidenced by
the workspace manifests, source code, checked-in environment configuration,
and local infrastructure documentation. It does not prescribe a future
deployment topology, enumerate every NestJS module, or describe behavior not
represented in those sources.
