# Backend Stability Backlog

An ordered, implementation-ready reliability backlog for `packages/klurigo-service` in Klurigo.

**Execution:** Select the first unchecked task and repeat **Plan → Implement → Verify and validate → Commit** until all tasks are complete. The OpenCode agent in `.opencode/agents/backend-stability-runner.md` owns this workflow.

## Global agent instructions

1. Read `AGENTS.md`, `docs/development/commands.md`, `docs/development/backend-testing.md`, and the current task before acting. Inspect actual code and tests; treat described weaknesses as hypotheses until verified, not automatically confirmed bugs.
2. Work on exactly **one task** at a time, in the order below. Do not mix requirements from later tasks into the current implementation. If a task is already satisfied, prove it with meaningful tests and documented evidence instead of manufacturing changes.
3. **Plan:** summarize existing behavior, identify reproducible gaps, name affected files, state minimal changes, identify invariants, and define relevant regression tests. Do not exceed the task's stated scope.
4. **Implement:** prefer tests demonstrating the issue before a small, focused correction. Preserve existing routes, request/response contracts, game rules, persistence layers, security properties, and unrelated behavior.
5. **Verify and validate:** run focused tests during development; then run **all required checks** below before marking anything complete. Validate persisted state and negative/failure cases, not merely return codes. Do not skip, delete, weaken, or increase test timeouts to hide failures.
6. **Commit:** only after checks pass, change exactly the current task's checkbox from `[ ]` to `[x]`, stage only scoped source/test changes and this document, and create **one signed Conventional Commit**. Use a lowercase subject, hyphen bullets, and a final impact paragraph. Do not disable GPG signing to make a commit succeed.
7. **Repeat:** after confirming a successful signed commit, select the next unchecked task. Resume safely after interruption by reconciling the checklist, working tree, and Git history.
8. If a requirement needs a public API change, domain redesign, new broker, sweeping refactor, or work excluded by the task, **stop for approval**. Never silently expand the scope or alter future tasks' acceptance criteria.
9. If any validation fails, signing is unavailable, a prerequisite cannot be safely met, or the working tree contains unrelated modifications, **stop and report the exact blocker**. Never tick the task or advance to the next one.
10. **Do not push, merge, open PRs, or edit Git configuration.** Implementation stays on the user-selected work branch unless explicitly instructed otherwise. Never use development or production data for destructive E2E test resets.

### Mandatory full-repository validation for **every** task

All commands below are mandatory **before each task is marked complete or committed**, not merely at the end of the backlog. Run from the repository root using the actual repository scripts. Backend changes can regress browser game-session flows, so the **complete frontend Playwright E2E suite is required for every task**, even if only backend files changed.

Verify test configuration targets only isolated MongoDB and Redis test databases before any E2E setup, reset or teardown; start the documented test dependencies using `docker compose up -d --wait mongodb redis` only when safe. Follow `docs/development/commands.md`. In particular, `yarn test` is **unit-only** and does **not** run backend E2E or Playwright E2E tests.

```sh
yarn test:validate
yarn dependency:hygiene
yarn test:unit
yarn workspace @klurigo/klurigo-service test:e2e
yarn workspace @klurigo/klurigo-web test:e2e
yarn lint
yarn typecheck
yarn format:check
yarn build
yarn workspace @klurigo/klurigo-service check-circular-deps
```

- Run **all** Playwright projects and game-session tests using the unfiltered `test:e2e` command. Do not pass `--project`, `--grep`, `--workers`, or other arguments to reduce coverage as a workaround; use documented configuration.
- Record the exit result of every command. All must pass on the **final implementation** before checking the task off or committing. After fixing a failure, rerun the impacted checks and the full mandatory gate.
- If any test fails, determine whether the current task introduced it; fix in-scope regressions, but **stop and report** unrelated failures rather than modifying unrelated code or falsely claiming success. Environment/setup problems are blockers, not passes.
- Never skip, quarantine, remove, or weaken tests; relax timeouts or assertions; update snapshots blindly; or bypass GPG signing. Validate the current task's acceptance criteria and inspect staged changes before committing.
- If coverage thresholds are part of the current task's acceptance criteria, also run the relevant dedicated coverage commands and evaluate actual reports. Coverage runs do not replace any checks above.

## Ordered task checklist

- [x] **BST-01 — Harden game-transition recovery and prevent stuck games** — P0
- [x] **BST-02 — Expand resilience and concurrency integration testing** — P0
- [x] **BST-03 — Make Redis answer persistence and TTL atomic** — P1
- [x] **BST-04 — Strengthen game-event publication and SSE recovery** — P1
- [ ] **BST-05 — Add actionable background-operation diagnostics** — P1
- [ ] **BST-06 — Harden distributed scheduled-job execution** — P1
- [ ] **BST-07 — Handle HTTP creation timeouts and partial failures** — P1
- [ ] **BST-08 — Validate health/readiness under dependency failure** — P2
- [ ] **BST-09 — Scale terminal-game cleanup without repeated work** — P2
- [ ] **BST-10 — Strengthen authentication and token lifecycle coverage** — P2

---

## BST-01 — Harden game-transition recovery and prevent stuck games

**Priority:** P0 — Critical
**Objective:** Guarantee correct game progression and recoverability when a transition is interrupted between MongoDB, BullMQ, Redis answer cleanup, and event publication.

**Inspect:**

- `src/modules/game-task/services/game-task-transition-scheduler.ts`
- `src/modules/game-task/services/game-task-transition-scheduler.spec.ts`
- `src/modules/game-core/repositories/game.repository.ts`
- `src/modules/game-core/repositories/game.repository.spec.ts`

Paths above are relative to `packages/klurigo-service`.

**Requirements:**

1. Trace deferred/immediate transition scheduling, persistence of `pendingTransitionOperations`, locks, stale-job checks, retries, and the periodic recovery cycle.
2. Reproduce interruption after MongoDB save but before queue insertion; after transition persistence but before Redis answer cleanup; after persistence but before event publication; and before post-transition scheduling.
3. Test repeated recovery, concurrent workers, worker restarts, outdated jobs, and jobs after their last BullMQ retry. Verify how overdue transitions recover when a scheduled job is absent or permanently failed.
4. Correct only demonstrated deficiencies. Ensure recovery is idempotent, required effects are not falsely marked complete, and stale jobs cannot advance a newer task.
5. Preserve supported transitions, current timing rules, distributed locking, event DTOs, and public endpoints.

**Acceptance criteria:** No double-advanced tasks, missing/skipped questions, state rollback, or silently stranded pending operations in covered scenarios. After dependency recovery, a game recovers correctly or exposes an actionable unrecovered failure. Existing normal gameplay remains unchanged.

**Tests:** Inject failures at boundaries with deterministic mocks; where necessary, add real MongoDB/Redis/BullMQ E2E assertions about persisted game state, pending operation IDs, and queue jobs. Complete mandatory validation.

**Out of scope:** New state machine, distributed transaction framework, Redis/BullMQ/MongoDB/MurLock replacement, frontend redesign, API/DTO changes, unrelated game logic.

## BST-02 — Expand resilience and concurrency integration testing

**Priority:** P0 — Critical
**Objective:** Demonstrate stable behavior under concurrency and dependency failures using the existing Jest + real MongoDB/Redis E2E infrastructure.

**Inspect:**

- `packages/klurigo-service/src/modules/game-core/repositories/game-answer.repository.spec.ts`
- `packages/klurigo-service/src/modules/game-api/controllers/game.controller.e2e-spec.ts`
- `packages/klurigo-service/src/modules/game-task/services/game-task-transition-scheduler.spec.ts`
- `packages/klurigo-service/test-utils/`
- `packages/klurigo-service/jest.e2e.config.cjs`

**Requirements:**

1. Inventory existing coverage first; avoid duplicating BST-01's transition recovery and BST-03's atomic TTL tests.
2. Verify competing submissions from the same player (one accepted), different players (correct counts), and an answer racing question closure (correct task-boundary behavior).
3. Simulate Redis failure before answer claim, failure after a committed claim, and a relevant queue/persistence interruption. Assert both HTTP/error behavior and actual stored state.
4. Verify retries do not duplicate answers, scoring, or advancement. Correct a production defect only when demonstrated by a failing regression test.
5. Keep fixtures isolated and deterministic; don't use arbitrary sleeps, global timeouts, or tests dependent on suite execution order.

**Acceptance criteria:** Tests prove the stated invariants through persisted-state checks, pass repeatedly, and fail when the behavior breaks. Any actual production fix is narrowly scoped and tested.

**Tests:** Run new tests repeatedly, then full mandatory validation.

**Out of scope:** Replacing Jest/test infrastructure, redefining the answer API, gameplay refactoring, broad test utility rewrites, requirements assigned to other tasks.

## BST-03 — Make Redis answer persistence and TTL atomic

**Priority:** P1 — High
**Objective:** Avoid a committed first answer without its intended expiration after a failure between Redis commands.

**Inspect:**

- `packages/klurigo-service/src/modules/game-core/repositories/game-answer.respository.ts`
- `packages/klurigo-service/src/modules/game-core/repositories/game-answer.repository.spec.ts`

**Requirements:**

1. Review the `HSETNX` → `HLEN` → `EXPIRE` sequence and its partial-failure semantics.
2. Implement a minimal Redis-atomic operation (for example a small Lua script) covering first-submission acceptance, accepted-answer count, and TTL handling.
3. Preserve first-writer-wins, duplicate answer outcomes, participant/task isolation, error contracts, and existing answer serialization.
4. Review the one-hour sliding TTL against supported gameplay duration. Change it only for a verified supported scenario, with a regression test.
5. Keep the existing source filename `game-answer.respository.ts`; correcting its spelling is unrelated to this task.

**Acceptance criteria:** Accepted entries have the intended bounded TTL, no partial acceptance/count/expiration result exists, concurrent duplicate submissions cannot overwrite one another, counts remain correct, and supported games do not lose answers prematurely.

**Tests:** Unit and real-Redis concurrency, duplicate, TTL, count, and atomic failure tests. Full mandatory validation.

**Out of scope:** Moving answers to MongoDB, new storage architecture, gameplay/scoring changes, new endpoints/DTOs, unrelated Redis rewrites.

## BST-04 — Strengthen game-event publication and SSE recovery

**Priority:** P1 — High
**Objective:** Detect partial failures in participant-specific event generation/publication and verify authoritative SSE reconnection behavior.

**Inspect:**

- `packages/klurigo-service/src/modules/game-event/services/game-event.publisher.ts`
- `packages/klurigo-service/src/modules/game-event/services/game-event.publisher.spec.ts`
- `packages/klurigo-service/src/modules/game-event/services/game-event.subscriber.ts`
- `packages/klurigo-service/src/modules/game-event/services/game-event.subscriber.spec.ts`

**Requirements:**

1. Distinguish intentionally absent participant events, builder exceptions, and failed Redis publication. Don't silently classify actual failures as success.
2. Keep independent participants' delivery from being unnecessarily blocked by a failure for one recipient; surface actionable, safe failure context.
3. Verify that a client missing a Redis Pub/Sub event recovers from the authoritative participant snapshot after reconnect. Test duplicate and delayed versioned events.
4. Preserve the persisted game transition even if subsequent publication fails, using the existing recovery behavior.
5. Preserve existing event DTOs, routes, revision ordering, and participant authorization.

**Acceptance criteria:** Participant failures are explicit, unaffected events are sent, reconnecting clients get the newest authorized state, and old events cannot regress it.

**Tests:** Publisher/subscriber tests plus targeted SSE reconnect E2E scenarios where suitable. Full mandatory validation.

**Out of scope:** New durable broker, Kafka/RabbitMQ, frontend EventSource rewrite, changing event payloads/endpoints, new global outbox system, game progression changes.

## BST-05 — Add actionable background-operation diagnostics

**Priority:** P1 — High
**Objective:** Make failed/stuck BullMQ transitions and persisted recovery operations visible through existing logs and production Sentry.

**Inspect:**

- `packages/klurigo-service/src/modules/game-task/services/game-task-transition-scheduler.ts`
- `packages/klurigo-service/src/modules/game-core/repositories/game.repository.ts`
- `packages/klurigo-service/src/modules/game-event/services/game-event.publisher.ts`
- `packages/klurigo-service/src/app/app.module.ts`

**Requirements:**

1. Review current structured logging, queue failure callbacks, existing retry policy, and Sentry wiring; avoid repeated alerts for the same failure.
2. Identify terminally failed jobs (exhausted attempts) and long-unresolved pending transition operations with operation/task/game/job IDs, attempts, and bounded error categories.
3. Distinguish transient retries from terminal failures; record recovery success without warning noise on healthy operations.
4. Cover previously logged-and-swallowed background errors where that would otherwise hide required intervention.
5. Protect secrets, credentials, answer payloads, and personal data from logs.

**Acceptance criteria:** An operator can identify and investigate stuck or exhausted transitions from existing observability tools without new infrastructure. Successful ordinary execution remains low-noise and unchanged.

**Tests:** Structured logging and error-reporting unit tests for retry, terminal failure, repeated failure, and recovery. Full mandatory validation.

**Out of scope:** New metrics platform or dashboard, changing retry counts, infrastructure deployment changes, implementing BST-01's transition logic again.

## BST-06 — Harden distributed scheduled-job execution

**Priority:** P1 — High
**Objective:** Prevent unsafe overlapping discovery and orphaned-image cleanup work, and ensure failures do not block future scheduled runs.

**Inspect:**

- `packages/klurigo-service/src/modules/discovery-api/services/discovery-scheduler.service.ts`
- `packages/klurigo-service/src/modules/discovery-api/services/discovery-scheduler.service.spec.ts`
- `packages/klurigo-service/src/modules/media/services/orphaned-image-cleanup.service.ts`
- `packages/klurigo-service/src/modules/media/services/orphaned-image-cleanup.service.spec.ts`

**Requirements:**

1. Verify actual lock acquisition, expiration, renewal, and crash behavior for the installed MurLock version before changing duration values.
2. Simulate concurrent calls, slow processing, dependency failure, and process interruption.
3. Fix only demonstrated unsafe overlap or permanent lockout. Retain atomic discovery replacement and current image-reference, inode, symlink, and retention safeguards.
4. Ensure a failed run can be retried later and is clearly logged. Don't claim cancellation occurred if in-flight writes continue.
5. Preserve current cron schedules and intended outcomes.

**Acceptance criteria:** No conflicting snapshot writes or unsafe image deletions, no permanent lockout after errors, and no normal-behavior changes.

**Tests:** Deterministic scheduler/locking tests, plus relevant integration tests. Full mandatory validation.

**Out of scope:** Replacing schedulers/locks, separate worker service, changing ranking or retention, changing unrelated scheduled jobs.

## BST-07 — Handle HTTP creation timeouts and partial failures

**Priority:** P1 — High
**Objective:** Prove and correct internal inconsistencies when game/quiz creation writes complete but downstream work or HTTP response fails.

**Inspect:**

- `packages/klurigo-service/src/app/interceptors/timeout.interceptor.ts`
- `packages/klurigo-service/src/modules/game-api/services/game.service.ts`
- `packages/klurigo-service/src/modules/quiz-api/services/quiz.service.ts`
- `packages/klurigo-service/src/modules/game-api/controllers/quiz-game.controller.ts`
- `packages/klurigo-service/src/modules/quiz-api/controllers/quiz.controller.ts`

**Requirements:**

1. Trace game and quiz creation's writes and subsequent side effects. Check how the five-second timeout interacts with continued asynchronous operations.
2. Reproduce committed writes followed by failed publication/side effect/response, plus retry behavior under the **existing** contract.
3. Fix demonstrated internal inconsistencies with localized changes. Log whether a write failed or actually succeeded before response failure.
4. Document any unavoidable non-idempotent client retry behavior requiring a public contract change, without adding new headers or keys.
5. Preserve routes, DTOs, response codes, auth, and normal timeout behavior.

**Acceptance criteria:** Tested partial failures have predictable persisted state and no unintended repeated internal side effects, with accurate diagnostics and unchanged successful request behavior.

**Tests:** Unit and targeted E2E checks that inspect MongoDB state and side effects. Full mandatory validation.

**Out of scope:** Global idempotency solution, changing public API or error codes, timeout framework rewrite, frontend session changes, unrelated endpoints.

## BST-08 — Validate health/readiness under dependency failure

**Priority:** P2 — Medium
**Objective:** Verify /health and /health/ready reflect required MongoDB/Redis dependency health while /health/live only reflects the running process.

**Inspect:**

- `packages/klurigo-service/src/modules/health/controllers/health.controller.ts`
- `packages/klurigo-service/src/modules/health/controllers/health.controller.spec.ts`
- `packages/klurigo-service/src/modules/health/controllers/health.controller.e2e-spec.ts`
- `packages/klurigo-service/src/modules/health/indicators/redis-health.indicator.ts`

**Requirements:**

1. Test failed MongoDB and Redis pings, expected unready HTTP 503 responses, and readiness restoration after dependencies return.
2. Confirm dependency probes are bounded, rather than hanging indefinitely.
3. Ensure /health/live does not fail solely because an external dependency is unavailable.
4. Preserve routes, external response schema, and credential redaction. Add only checks needed for HTTP readiness.

**Acceptance criteria:** Correct live/ready distinction, prompt failure and recovery reporting, no leaked infrastructure secrets, and unchanged endpoint contracts.

**Tests:** Unit/E2E dependency failure and recovery tests using only isolated infrastructure. Full mandatory validation.

**Out of scope:** New monitoring platform, Kubernetes changes, BullMQ failure metrics, deployment redesign.

## BST-09 — Scale terminal-game cleanup without repeated work

**Priority:** P2 — Medium
**Objective:** Avoid re-querying and reprocessing every historical terminal game every five minutes just to repeat Redis answer cleanup.

**Inspect:**

- `packages/klurigo-service/src/modules/game-cleanup/services/game-expiry-scheduler.service.ts`
- `packages/klurigo-service/src/modules/game-cleanup/services/game-expiry-scheduler.service.spec.ts`
- `packages/klurigo-service/src/modules/game-core/repositories/game.repository.ts`
- `packages/klurigo-service/src/modules/game-core/repositories/models/schemas/`
- `packages/klurigo-service/src/modules/game-core/repositories/game-answer.respository.ts`

**Requirements:**

1. Introduce a minimal completion marker for transient answer cleanup. Specify how existing terminal documents without the marker are treated.
2. Select only terminal games still requiring cleanup and process them in bounded batches. Add an index only if justified by the query pattern.
3. Mark completion **after** successful Redis deletion. On deletion or marker-persistence failure, keep retries safe and eligible.
4. Ensure repeated runs are idempotent and active games are never targeted.
5. Preserve terminal statuses, results/history, retention, and the current cron schedule.

**Acceptance criteria:** Cleaned terminal games are not repeatedly scanned/processed, per-batch memory/work are bounded, failed operations retry safely, and active state/results are preserved.

**Tests:** Multiple batches, repeated cleanup, Redis failures, marker write failures, active-game protection. Full mandatory validation.

**Out of scope:** Deleting game history, different game expiration thresholds, image/quiz deletion cleanup, new Redis storage model.

## BST-10 — Strengthen authentication and token lifecycle coverage

**Priority:** P2 — Medium
**Objective:** Add meaningful tests and enforce focused coverage for backend authentication and token services.

**Inspect:**

- `packages/klurigo-service/src/modules/authentication/services/auth.service.ts`
- `packages/klurigo-service/src/modules/authentication/services/auth.service.spec.ts`
- `packages/klurigo-service/src/modules/authentication/controllers/auth.controller.e2e-spec.ts`
- `packages/klurigo-service/src/modules/token/services/token.service.ts`
- `packages/klurigo-service/src/modules/token/repositories/token.repository.ts`
- `packages/klurigo-service/jest.unit.config.cjs`
- `packages/klurigo-service/jest.e2e.config.cjs`

**Requirements:**

1. Record initial per-file statement/branch coverage and identify missing branches for the named auth/token services.
2. Test valid and invalid authentication, expired access/refresh tokens, revoked/invalid refresh tokens, concurrent refresh attempts, and database errors during refresh or revocation.
3. Verify unauthorized sessions cannot be reestablished using invalid/revoked tokens and errors don't expose secrets.
4. Fix only confirmed defects. Target **≥90% statement and branch coverage** for the scoped authentication and token service files.
5. After achieving the target, add file-specific Jest thresholds without weakening or altering existing Codecov policy; document before/after coverage.

**Acceptance criteria:** Meaningful regression assertions meet both scoped coverage targets, future coverage regressions fail the configured check, and existing auth/token contracts are unchanged except confirmed fixes.

**Tests:** Run scoped coverage, relevant controller E2E, and full mandatory validation.

**Out of scope:** New auth schemes, JWT format changes, frontend auth redesign, repo-wide threshold change, coverage inflation by excluding code or weakening tests.

---

## Per-task completion record

Before committing each completed task, report in the agent session:

- Task ID, investigated hypothesis, and evidence of the issue or established safety.
- Precisely which files changed and why.
- Regression tests added or extended.
- Exact validation commands and results.
- Commit SHA after the signed commit succeeds, plus any remaining risks.

Update **only the completed task's checklist entry** to `[x]`. Do not edit later requirements to make completion easier. The next task may begin only after the previous task is committed successfully.
