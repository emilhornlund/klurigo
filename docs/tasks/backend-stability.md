# Backend Stability Backlog

This is the ordered, executable stability backlog for packages/klurigo-service. The accompanying project OpenCode agent is .opencode/agents/backend-stability-runner.md.

## Goal and operating contract

Improve backend stability through small, testable changes. Work through **exactly one task at a time**, in the order below: **plan → implement → verify and validate → commit → repeat**. Treat this document as the task source of truth; AGENTS.md and docs/development/commands.md remain authoritative for repository conventions and commands.

- Tasks marked [ ] are pending; [x] means implemented (or conclusively verified already implemented), validated, and committed.
- Pick only the first unchecked task. Do not cherry-pick easier tasks or combine tasks in one commit.
- Inspect current source and tests before making changes. A risk described here is a **hypothesis to investigate**, not a verified bug.
- Produce a concise task-specific plan before editing: existing behavior, evidence, proposed files and minimal changes, risks, and test cases.
- Stay inside the current task's requirements. Preserve public endpoints, DTOs, game rules, storage technologies, existing error semantics, and unrelated behavior unless a task explicitly requires a change.
- Prefer regression tests before fixes. Do not introduce sweeping refactors, new infrastructure, or feature work. If a finding needs a large design change, document it and **stop for human review**; never silently enlarge scope.
- Never delete, skip, weaken, or inflate timeouts on existing tests to achieve a pass. Existing test failures must be investigated, not ignored.
- Use the existing test MongoDB/Redis configuration only; do not run destructive cleanup against non-test data.
- Do not push or create a PR automatically. Each finished task gets one **signed Conventional Commit** including the implementation, tests, and this checklist update; never disable signing or amend someone else's work.
- On an ambiguous blocker, failed verification, unavailable signing, or unrelated dirty worktree, **stop** and report the exact obstruction. Do not mark a task complete or start the next one.
- Resume at the first unchecked task after a restart; use repository history and state to validate progress rather than assuming past execution succeeded.

## Required validation for every task

1. Run focused tests while developing, including real Redis/MongoDB integration tests when relevant.
2. Start required **test-only** dependencies following docs/development/backend-testing.md and docs/development/commands.md.
3. Before marking the task complete, run from the repository root:
   - yarn workspace @klurigo/klurigo-service test (both full unit and full backend E2E suites)
   - yarn workspace @klurigo/klurigo-service lint
   - yarn workspace @klurigo/klurigo-service typecheck
   - yarn workspace @klurigo/klurigo-service build
   - yarn workspace @klurigo/klurigo-service check-circular-deps
   - yarn format:check
4. Run additional affected common/frontend or repository-wide checks if the scoped work actually changes those areas.
5. Inspect final changes for correctness, regressions, accidental files, sensitive data, and scope compliance. Report which commands passed.
6. Only after all applicable checks succeed, tick the current task and create the task's single signed commit. Commit message: lowercase conventional subject, hyphen bullets, and a final impact paragraph, following the repository's established style.
7. If no production correction is needed, prove existing compliance with relevant tests. A documentation-only completion must record clear verification evidence; never claim an untested task is done.

## Ordered checklist

- [ ] **BST-01 — Harden game transition recovery and prevent stuck games** (P0)
- [ ] **BST-02 — Add backend resilience and concurrency integration tests** (P0)
- [ ] **BST-03 — Make Redis answer persistence and expiration atomic** (P1)
- [ ] **BST-04 — Improve game event publication reliability** (P1)
- [ ] **BST-05 — Add monitoring and diagnostics for failed background operations** (P1)
- [ ] **BST-06 — Prevent overlapping and indefinitely running scheduled jobs** (P1)
- [ ] **BST-07 — Harden HTTP write operations against timeouts and partial failures** (P1)
- [ ] **BST-08 — Strengthen backend health and readiness checks** (P2)
- [ ] **BST-09 — Optimize terminal-game cleanup and prevent repeated processing** (P2)
- [ ] **BST-10 — Improve authentication and token lifecycle coverage** (P2)

---

## BST-01 — Harden game transition recovery and prevent stuck games

**Priority:** P0 — Critical

**Objective:** Ensure MongoDB state transitions, BullMQ scheduling, Redis answer cleanup, event publishing, and recovery cannot leave games stuck or advance them twice after partial failures.

**Inspect first:**
- packages/klurigo-service/src/modules/game-task/services/game-task-transition-scheduler.ts
- packages/klurigo-service/src/modules/game-task/services/game-task-transition-scheduler.spec.ts
- packages/klurigo-service/src/modules/game-core/repositories/game.repository.ts
- packages/klurigo-service/src/modules/game-core/repositories/game.repository.spec.ts

**Requirements:**
1. Map the existing deferred/immediate transition lifecycle and the persisted pendingTransitionOperations mechanism, including locking, existing job handling, stale detection, and the five-second recovery routine.
2. Reproduce and test interruption after MongoDB persistence but before queue creation, Redis answer cleanup, event publication, and post-transition scheduling.
3. Test worker restart, duplicate recovery, outdated jobs, and jobs exhausting BullMQ retry attempts. Check whether an overdue persisted transition with a missing/failed queue job can be recovered.
4. Fix **only demonstrated gaps**. Ensure pending operations are cleared only after their necessary side effects complete and recovery is idempotent.
5. Preserve existing supported state progressions, transition timings, locks, and public contracts.

**Acceptance criteria:** No double advancement, skipped questions, stale state overwrites, or silently stranded pending work in covered cases. The game either recovers when dependencies return or surfaces an actionable unrecovered failure. Normal progressions and timings remain unchanged.

**Tests:** Deterministic injected failures plus relevant real-infrastructure E2E tests; assert MongoDB state, pending operation IDs, and BullMQ jobs before and after recovery. Full required validation.

**Out of scope:** Replacing BullMQ/Redis/MongoDB/MurLock, new state machine, broker or outbox architecture, frontend changes, unrelated refactoring.

## BST-02 — Add backend resilience and concurrency integration tests

**Priority:** P0 — Critical

**Objective:** Add integration evidence that concurrent game requests and dependency failures preserve persisted invariants. Production fixes require a reproduced defect.

**Inspect first:**
- packages/klurigo-service/src/modules/game-core/repositories/game-answer.repository.spec.ts
- packages/klurigo-service/src/modules/game-api/controllers/game.controller.e2e-spec.ts
- packages/klurigo-service/src/modules/game-task/services/game-task-transition-scheduler.spec.ts
- packages/klurigo-service/test-utils/
- packages/klurigo-service/jest.e2e.config.cjs

**Requirements:**
1. Inventory existing tests and avoid duplicating BST-01 transition-recovery cases or BST-03 Redis TTL tests.
2. Cover same-player concurrent submissions (one winner), different-player concurrency, and the race between answer acceptance and question closure.
3. Cover Redis failure before an answer claim, failure after committed claim, and an applicable queue/persistence interruption with observable final state.
4. Assert HTTP outcomes **and** actual Redis/MongoDB state: no duplicate answers, scoring, or transitions; retry only where the existing contract permits.
5. Keep fault injection deterministic; use real Redis and MongoDB when atomicity/concurrency behavior is the subject. Preserve test isolation and existing assertions.

**Acceptance criteria:** The new tests fail when the described invariants break, pass consistently without arbitrary sleeps, and expose any confirmed defect with a narrow regression fix.

**Tests:** Run cases repeatedly, then full required validation.

**Out of scope:** New testing framework, sweeping shared test refactor, new API or gameplay contract, duplicating other backlog tasks.

## BST-03 — Make Redis answer persistence and expiration atomic

**Priority:** P1 — High

**Objective:** Avoid a successful HSETNX answer claim being followed by failure before HLEN and EXPIRE have completed.

**Inspect first:**
- packages/klurigo-service/src/modules/game-core/repositories/game-answer.respository.ts
- packages/klurigo-service/src/modules/game-core/repositories/game-answer.repository.spec.ts

**Requirements:**
1. Preserve the atomic first-submission-wins behavior, task-scoped hash keys, duplicate return contract, and answer count semantics.
2. Atomically couple acceptance, resulting answer count, and TTL application/refresh using an appropriate Redis-side operation (for example a small Lua script), with clear error handling.
3. Ensure duplicate attempts never replace an accepted answer or unintentionally change state.
4. Verify whether the existing one-hour sliding TTL covers every supported game/question duration; change it only with a demonstrated case and regression test.
5. Preserve the existing implementation filename spelling (game-answer.respository.ts); do not rename as incidental cleanup.

**Acceptance criteria:** Accepted answers are never left without their intended expiration by an interrupted multi-command sequence. Concurrent winners, counts, duplicates, task isolation, and errors match the established contract.

**Tests:** Unit and real-Redis tests for concurrency, rejected duplicates, count and TTL, atomic failures, and expiry safety. Full required validation.

**Out of scope:** Moving answers to MongoDB, changing question types/scoring, public API/DTO changes, unrelated Redis refactoring.

## BST-04 — Improve game event publication reliability

**Priority:** P1 — High

**Objective:** Make participant-specific publishing failures visible and verify missed SSE events recover using existing authoritative snapshots and revisions.

**Inspect first:**
- packages/klurigo-service/src/modules/game-event/services/game-event.publisher.ts
- packages/klurigo-service/src/modules/game-event/services/game-event.publisher.spec.ts
- packages/klurigo-service/src/modules/game-event/services/game-event.subscriber.ts
- packages/klurigo-service/src/modules/game-event/services/game-event.subscriber.spec.ts

**Requirements:**
1. Distinguish intentionally absent events from unexpected participant-event builder failure and Redis publication failure.
2. Ensure a failure affecting one participant does not unnecessarily stop independent participant publications, while failures are accurately reported (not silently counted as success).
3. Retain game ID, participant ID, task, and operation context in safe structured diagnostics; do not log answer payloads or secrets.
4. Verify Redis Pub/Sub missed-event, duplicate-event, out-of-order-event, and reconnect cases against the existing authoritative participant snapshot and revision filtering.
5. Preserve persisted game transitions when a subsequent publication fails; rely on the current recovery mechanisms rather than inventing a new broker.

**Acceptance criteria:** Partial failures are explicit, healthy participants still receive available events, and reconnecting clients recover the newest authorized state without regression.

**Tests:** Publisher/subscriber unit tests and relevant E2E snapshot recovery tests. Full required validation.

**Out of scope:** Replacing Pub/Sub, adding Kafka/RabbitMQ/durable event systems, changing SSE routes/event DTOs, redesigning frontend EventSource, altering game progression.

## BST-05 — Add monitoring and diagnostics for failed background operations

**Priority:** P1 — High

**Objective:** Make terminal job failures and unresolved transition recovery actionable using the current logging and production Sentry integration.

**Inspect first:**
- packages/klurigo-service/src/modules/game-task/services/game-task-transition-scheduler.ts
- packages/klurigo-service/src/modules/game-core/repositories/game.repository.ts
- packages/klurigo-service/src/modules/game-event/services/game-event.publisher.ts
- packages/klurigo-service/src/app/app.module.ts

**Requirements:**
1. Inspect existing structured logging, BullMQ retry policies and failure hooks, and Sentry behavior to avoid duplicate reporting.
2. Report failed/exhausted jobs and repeatedly unresolved pending transition operations with useful, bounded context (game/task/job IDs, attempt, operation, error category).
3. Distinguish transient retry from terminal failure and record successful recovery without routine warning spam.
4. Ensure background errors cannot silently disappear, including error pathways that currently log-and-return.
5. Preserve gameplay, queue retry policies, and existing metrics/observability tooling.

**Acceptance criteria:** Operators can identify and diagnose exhausted retries and stuck recovery from current logs/Sentry; routine successful transitions stay quiet and no secrets or full answer payloads are logged.

**Tests:** Mock relevant logger/Sentry hooks; verify transient, exhausted, repeated failure, and successful recovery behavior. Full required validation.

**Out of scope:** Prometheus/Grafana, dashboards, external alerting, retry policy redesign, new logging framework, changes owned by BST-01.

## BST-06 — Prevent overlapping and indefinitely running scheduled jobs

**Priority:** P1 — High

**Objective:** Verify distributed scheduler lock behavior and eliminate demonstrated unsafe overlap or permanent lockout for discovery refresh and orphaned-image cleanup.

**Inspect first:**
- packages/klurigo-service/src/modules/discovery-api/services/discovery-scheduler.service.ts
- packages/klurigo-service/src/modules/discovery-api/services/discovery-scheduler.service.spec.ts
- packages/klurigo-service/src/modules/media/services/orphaned-image-cleanup.service.ts
- packages/klurigo-service/src/modules/media/services/orphaned-image-cleanup.service.spec.ts

**Requirements:**
1. Confirm installed MurLock's timeout, lease, renewal, and crash-release semantics before changing values.
2. Test concurrent invocation from independent instances, slow operations, dependency failure, and worker/process interruption.
3. Prevent **unsafe** overlapping writes/deletions with minimal localized changes; retain atomic discovery snapshot replacement and orphaned-image reference/symlink/inode safeguards.
4. Ensure later scheduled executions are possible after failure. Preserve existing cron schedules, scoring, retention policy, and normal results.
5. Bound execution only where safe: do not claim cancelled work has stopped if underlying writes are still running.

**Acceptance criteria:** No conflicting discovery refresh or unsafe image deletion; locks do not permanently block future runs; failure paths remain visible.

**Tests:** Deterministic scheduler/lock fault tests and relevant integration tests. Full required validation.

**Out of scope:** Replacing MurLock/Nest scheduling, separate worker architecture, new discovery rules or retention policy, BST-01 transition changes.

## BST-07 — Harden HTTP write operations against timeouts and partial failures

**Priority:** P1 — High

**Objective:** Determine and address real consistency problems when game or quiz creation commits but a subsequent operation or HTTP response fails.

**Inspect first:**
- packages/klurigo-service/src/app/interceptors/timeout.interceptor.ts
- packages/klurigo-service/src/modules/game-api/services/game.service.ts
- packages/klurigo-service/src/modules/quiz-api/services/quiz.service.ts
- packages/klurigo-service/src/modules/game-api/controllers/quiz-game.controller.ts
- packages/klurigo-service/src/modules/quiz-api/controllers/quiz.controller.ts

**Requirements:**
1. Trace creation and any post-persistence side effects; confirm whether timeouts can leave committed writes after an HTTP 408 or other failed response.
2. Add tests for successful persistence followed by publish/side-effect/response failure and retry of the same logical operation under the **existing** API contract.
3. Fix demonstrated internal inconsistencies with localized changes; log accurately whether persistence succeeded.
4. Document unavoidable non-idempotent retry semantics that would require a public contract change; **do not** invent idempotency keys or change response DTOs.
5. Preserve authentication, status codes, timeout defaults, and current game/quiz creation rules.

**Acceptance criteria:** Covered creation paths have predictable persisted outcomes, no accidental repeated side effects, and honest diagnostics; normal flows and public API behavior are unchanged.

**Tests:** Unit and relevant E2E fault tests asserting actual persisted entities/side effects. Full required validation.

**Out of scope:** Global idempotency framework, new mandatory headers, new endpoints, rewriting timeout interceptor/authentication, audit of unrelated writes.

## BST-08 — Strengthen backend health and readiness checks

**Priority:** P2 — Medium

**Objective:** Confirm /health and /health/ready accurately report MongoDB/Redis readiness and /health/live only reports a live process, including outages and recovery.

**Inspect first:**
- packages/klurigo-service/src/modules/health/controllers/health.controller.ts
- packages/klurigo-service/src/modules/health/controllers/health.controller.spec.ts
- packages/klurigo-service/src/modules/health/controllers/health.controller.e2e-spec.ts
- packages/klurigo-service/src/modules/health/indicators/redis-health.indicator.ts

**Requirements:**
1. Verify readiness failure and status 503 on required dependency loss, and automatic readiness recovery when connections return.
2. Ensure dependency ping checks are bounded and cannot hang indefinitely.
3. Keep /health/live independent of external dependencies, so an infrastructure outage does not induce unnecessary process restart loops.
4. Preserve routes, public response shapes, and redaction of sensitive connection details.
5. Only add checks that genuinely represent ability to serve HTTP requests; background job monitoring belongs to BST-05.

**Acceptance criteria:** Prompt, correct ready/unready transitions; stable liveness semantics; safe failure responses.

**Tests:** Unit and E2E failure/recovery tests with isolated test infrastructure. Full required validation.

**Out of scope:** Monitoring platform, new orchestration endpoints, deployment refactor, BullMQ metrics.

## BST-09 — Optimize terminal-game cleanup and prevent repeated processing

**Priority:** P2 — Medium

**Objective:** Prevent the five-minute terminal-game cleanup from querying and reprocessing all historical completed, expired, and terminated games forever.

**Inspect first:**
- packages/klurigo-service/src/modules/game-cleanup/services/game-expiry-scheduler.service.ts
- packages/klurigo-service/src/modules/game-cleanup/services/game-expiry-scheduler.service.spec.ts
- packages/klurigo-service/src/modules/game-core/repositories/game.repository.ts
- packages/klurigo-service/src/modules/game-core/repositories/models/schemas/
- packages/klurigo-service/src/modules/game-core/repositories/game-answer.respository.ts

**Requirements:**
1. Introduce a minimal persisted cleanup-completion indicator after successful Redis state cleanup; document how existing historical terminal games are handled.
2. Query only eligible terminal games not yet marked cleaned, using bounded batches and an index only when justified by the query.
3. On Redis error or completion-marker write error, retain safe eligibility for retry. Verify multiple executions remain idempotent.
4. Preserve the existing completed/expired/terminated lifecycle, game history, results, and cleanup cron schedule.
5. Confirm only terminal game answer state is deleted, never active-question answers.

**Acceptance criteria:** Already cleaned games are not repeatedly processed, work per batch is bounded, and failures recover without losing persisted game history.

**Tests:** Repeated cleanup, partial Redis failure, marker-save failure, more-than-one-batch scenarios, and active-game safety. Full required validation.

**Out of scope:** Deleting game history, changing expiry rules, redesigning answer storage, image cleanup, quiz-deletion cleanup.

## BST-10 — Improve authentication and token lifecycle coverage

**Priority:** P2 — Medium

**Objective:** Improve meaningful regression protection for authentication/token lifecycle error handling, concurrency, and invalid session recovery.

**Inspect first:**
- packages/klurigo-service/src/modules/authentication/services/auth.service.ts
- packages/klurigo-service/src/modules/authentication/services/auth.service.spec.ts
- packages/klurigo-service/src/modules/authentication/controllers/auth.controller.e2e-spec.ts
- packages/klurigo-service/src/modules/token/services/token.service.ts
- packages/klurigo-service/src/modules/token/repositories/token.repository.ts
- packages/klurigo-service/jest.unit.config.cjs
- packages/klurigo-service/jest.e2e.config.cjs

**Requirements:**
1. Capture **before** file-specific statement/branch coverage for auth and token service files; inventory existing tests first.
2. Cover successful/invalid authentication; expired access tokens; valid, expired, revoked and malformed refresh tokens; concurrent refresh attempts; and database failures during refresh/revoke.
3. Verify that invalid/revoked credentials cannot resurrect a session and errors do not leak sensitive information.
4. Fix only reproduced defects with regression tests. Target **at least 90% statements and branches** for the named authentication/token service files.
5. Add narrow Jest thresholds for only the scoped files after achieving the target; preserve existing Codecov policy and project-wide checks.
6. Record before/after file-level coverage and any explicitly uncovered lines.

**Acceptance criteria:** Scoped files meet their statement and branch target with meaningful scenarios; test thresholds enforce the result; existing API/token contracts remain unchanged.

**Tests:** Unit and appropriate auth-controller E2E/coverage runs, followed by full required validation.

**Out of scope:** New authentication methods, JWT format/contract changes, frontend auth flows, global coverage policy changes, deleting source/excluding files or weakening tests to inflate coverage.

---

## Completion notes

For each task, summarize in the OpenCode session before committing:

- Task ID and evidence for the original risk or already-safe behavior.
- Exact implemented changes and regression tests.
- Validation commands and outcomes.
- Commit hash and any residual risks.

Tick only the task that was completed. Do not modify the contents or acceptance criteria of future tasks to make them easier. If another task must change, pause and explain why instead of silently editing it.
