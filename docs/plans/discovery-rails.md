# Discovery Rails — Phased Implementation Plan

## Problem Statement

The current `/discover` page is a single vertical paginated table backed by `GET /quizzes`
with client-side filter/sort controls. The goal is to replace it with multiple **horizontal
scrollable rails** (sections), each surfacing a curated subset of public quizzes, computed
server-side on a fixed schedule. The old page remains functional until the new experience
is explicitly cut over, at which point the old page and all associated code are removed.

---

## Phase 1 (PR): Shared Contracts in `@klurigo/common`

### Goal
Establish the TypeScript contracts (enums + DTOs) that the backend and frontend will
both depend on. Shipping this first keeps later PRs lean and decoupled.

### Scope
**Included:**
- `DiscoverySectionKey` enum (one value per rail: `FEATURED`, `TRENDING`, `TOP_RATED`,
  `MOST_PLAYED`, `NEW_AND_NOTEWORTHY`, `CATEGORY_SPOTLIGHT`)
- `DiscoveryQuizCardDto` — lightweight quiz card payload (`id`, `title`, `description`,
  `imageCoverURL`, `category`, `languageCode`, `mode`, `numberOfQuestions`, `author`,
  `gameplaySummary`, `ratingSummary`, `created`)
- `DiscoverySectionDto` — `{ key: DiscoverySectionKey; title: string; description?: string; quizzes: DiscoveryQuizCardDto[] }`
- `DiscoveryResponseDto` — `{ sections: DiscoverySectionDto[]; generatedAt: Date | null }`
- `DiscoverySectionPageResponseDto` — offset-paginated "see all":
  `{ key: DiscoverySectionKey; title: string; results: DiscoveryQuizCardDto[]; snapshotTotal: number; limit: number; offset: number }`
  *(field named `results` to match `PaginatedQuizResponseDto` convention; `snapshotTotal`
  reflects the number of scored entries stored in the snapshot for that rail — bounded by
  `DISCOVERY_RAIL_CAP_FEATURED` for the `FEATURED` rail and `DISCOVERY_RAIL_CAP_STANDARD`
  for all others (see Phase 3) — it is NOT the total number of eligible quizzes in the
  database)*

**Excluded:** Any backend or frontend implementation.

### Backend Changes
None.

### Frontend Changes
None.

### Common (`@klurigo/common`) Changes
- `packages/common/src/models/discovery.dto.ts` — new file containing all types listed
  above; every exported type **must** have a JSDoc block comment describing its purpose,
  all fields documented with `@remarks` / `@example` where helpful
- `packages/common/src/index.ts` — re-export new file
- Unit tests: `discovery.dto.spec.ts` (enum value guards, DTO field-shape type tests)

### Documentation Tasks
- [x] JSDoc block on `DiscoverySectionKey` describing the purpose of each enum value
- [x] JSDoc blocks on all five DTO types (`DiscoveryQuizCardDto`, `DiscoverySectionDto`,
  `DiscoveryResponseDto`, `DiscoverySectionPageResponseDto`) — fields, constraints, examples;
  document that `snapshotTotal` in `DiscoverySectionPageResponseDto` is bounded by snapshot
  capacity constants (`DISCOVERY_RAIL_CAP_FEATURED` / `DISCOVERY_RAIL_CAP_STANDARD`) and
  is not a database row count

### Tests
- [x] Vitest unit tests validating enum values and DTO shape type guards
  (32 tests in `discovery.dto.spec.ts`: enum value guards with exact-count + membership
  assertions, per-key `it.each` checks, and field-shape tests for all four DTO types)

### Migration / Rollout Notes
- Pure additive change; no runtime impact. Safe to merge at any time.

### Acceptance Criteria
- [x] `DiscoverySectionKey` enum exported from `@klurigo/common` with all six keys
- [x] `DiscoverySectionPageResponseDto` uses `results`, `snapshotTotal`, `limit`, `offset`
  (no cursor fields, no database-count `total` field)
- [x] All DTO types exported and importable in both backend and frontend workspaces
- [x] All public types have JSDoc documentation
- [x] Unit tests pass (`yarn workspace @klurigo/common test`)
- [x] No breaking changes to existing exports

### Risks
- **None.** Pure additions.

### Implementation Notes (Phase 1)
- `DiscoveryQuizCardDto` reuses `QuizAuthorResponseDto`, `QuizGameplaySummaryDto`, and
  `QuizRatingSummaryDto` from `quiz.dto.ts` to avoid duplicating field definitions.
- Test approach uses object literals typed as each DTO (`const x: FooDto = { ... }`) to
  express field-shape intent at compile time; runtime assertions confirm key field values.
  `it.each` is used for per-enum-value membership tests.
- No HTML tags used in any JSDoc comment.

---

## Phase 2 (PR): Backend — Discovery Eligibility Predicate & Quality Scoring Utilities

### Goal
Introduce the pure, well-tested scoring logic that all later rail computation will rely
on. This phase fixes two issues from the original draft: (a) trending scoring is now
genuinely activity-based using real recent-play data rather than a simplistic recency
heuristic, and (b) quality scoring sub-scores are made explicit and comprehensive.

### Scope
**Included:**
- `isDiscoveryEligible(quiz)` predicate — all thresholds exported as named constants:
  - `visibility === PUBLIC` — note: in this system `PUBLIC` visibility is the only
    published state; drafts are stored as non-public, so this single check excludes
    both drafts and hidden quizzes. If a separate `isDraft` field is ever introduced,
    an additional clause must be added here.
  - `imageCoverURL` is set and non-empty (`MIN_COVER_REQUIRED = true`)
  - `description` is non-empty and `>= MIN_DESCRIPTION_LENGTH` chars (`MIN_DESCRIPTION_LENGTH = 20`)
  - `questions.length >= MIN_QUESTION_COUNT` (`MIN_QUESTION_COUNT = 10`)

- `computeQualityScore(quiz, globalMean, minRatingCount)` → `number` (0–100):
  This function accepts `globalMean` and `minRatingCount` explicitly because it
  incorporates a Bayesian-adjusted rating sub-score (via `computeBayesianRatingScore`).
  Passing these values as parameters — rather than reading from global state — keeps the
  function **deterministic and pure**: given the same inputs it always returns the same
  result, making it trivially unit-testable.
  Weighted sum of the following explicit sub-scores, normalized to [0, 100]:
  - **Cover sub-score** (weight 10): `imageCoverURL` set → 10, absent → 0
  - **Description quality sub-score** (weight 15): bucketed by length —
    20–49 chars → 4, 50–99 → 8, 100–199 → 12, 200+ chars → 15
  - **Question count sub-score** (weight 15): bucketed —
    10–14 → 4, 15–19 → 8, 20–29 → 12, 30+ → 15
  - **Play engagement sub-score** (weight 30): derived from `gameplaySummary.count`
    (total plays) using log-scaling: `min(30, 30 * log10(count + 1) / log10(PLAY_SCALE_MAX))`
    where `PLAY_SCALE_MAX = 10000`
  - **Unique player sub-score** (weight 15): same log-scale pattern as plays,
    using `gameplaySummary.totalPlayerCount`, capped at 15
  - **Rating sub-score** (weight 15): `computeBayesianRatingScore(quiz, globalMean, minRatingCount)`
    mapped to [0, 15] — `bayesianRating * (15 / 5)`
  - All weight constants exported (e.g. `QUALITY_WEIGHT_COVER`, `QUALITY_WEIGHT_DESCRIPTION`,
    etc.) so they can be tuned independently

- `computeBayesianRatingScore(quiz, globalMean, minCount)` → `number` (0–5):
  `(count / (count + minCount)) * avg + (minCount / (count + minCount)) * globalMean`

- `computeTrendingScore(recentStats: RecentActivityStats)` → `number` (0–100):
  Replaced the previous "days since last played" heuristic with a proper
  **recent-window play score**:
  ```typescript
  type RecentActivityStats = {
    readonly recentPlayCount: number   // plays in last TRENDING_WINDOW_DAYS days
  }
  ```
  - Score = `normalize(recentStats.recentPlayCount * TRENDING_PLAY_WEIGHT)`
  - `TRENDING_PLAY_WEIGHT`, `TRENDING_WINDOW_DAYS` (default 7), and `TRENDING_SCALE_MAX`
    exported as constants
  - The `recentStats` are gathered by `DiscoveryComputeService` during the compute run
    (see Phase 4) by querying the games collection for games completed within the window.
  - This makes the function **deterministic and pure** — it receives precomputed stats
    and applies only arithmetic. Unit tests can inject any stats values.
  - **Future enhancement:** incorporate unique-player counts once supported by the data
    model (e.g., `recentUniquePlayerCount` and a corresponding `TRENDING_PLAYER_WEIGHT`).

- All placed under `packages/klurigo-service/src/modules/quiz-core/utils/discovery/`

**Excluded:** Scheduler, snapshot schema, API endpoints, frontend, recent-activity
  aggregation (that is the compute service's job in Phase 4).

### Backend Changes
- New file: `discovery-eligibility.utils.ts` + `.spec.ts`
- New file: `discovery-scoring.utils.ts` + `.spec.ts`
  (exports `computeQualityScore`, `computeBayesianRatingScore`, `computeTrendingScore`,
  `RecentActivityStats` type, and all weight/threshold constants)
- Export from `quiz-core/utils/index.ts`

### Frontend Changes
None.

### Documentation Tasks
- [x] JSDoc on `isDiscoveryEligible`: describe every predicate clause, document each
  threshold constant, add the draft-visibility note
- [x] JSDoc on `computeQualityScore`: explain why `globalMean` and `minRatingCount` are
  explicit parameters (Bayesian rating sub-score requires them; keeps the function
  deterministic and free of hidden global state); list all six sub-scores and their weights;
  document the normalization formula
- [x] JSDoc on `computeBayesianRatingScore`: document the formula inline; describe
  why `minCount` pulls low-rating-count quizzes toward the mean
- [x] JSDoc on `computeTrendingScore`: document `RecentActivityStats`, the score formula,
  `TRENDING_PLAY_WEIGHT`, `TRENDING_WINDOW_DAYS`, `TRENDING_SCALE_MAX`, and that
  stats are provided by the compute service; include the future-enhancement note
  about unique-player support
- [x] JSDoc on every exported constant explaining what it controls and its default value

### Tests
- [x] Jest unit tests covering:
  - `isDiscoveryEligible`: boundary cases (missing cover, short description, 9 vs 10 questions,
    non-public visibility)
  - `computeQualityScore`: monotonicity (more plays → higher score); Bayesian pull at low
    rating count; verify each sub-score bucket boundary; verify that changing `globalMean`
    or `minRatingCount` produces different results (confirms parameters are used)
  - `computeBayesianRatingScore`: low-count quiz pulled toward global mean; high-count
    quiz stays near its own average
  - `computeTrendingScore`: higher `recentPlayCount` → higher score; zero recent plays
    → score 0; score scales linearly with `TRENDING_PLAY_WEIGHT`

### Migration / Rollout Notes
- No schema changes. Safe to merge independently.

### Acceptance Criteria
- [x] `isDiscoveryEligible` returns `false` for any quiz missing cover, with description
  shorter than 20 chars, or with fewer than **10** questions
- [x] `MIN_QUESTION_COUNT` constant equals `10`
- [x] `computeTrendingScore` accepts `RecentActivityStats` with only `recentPlayCount`;
  does not use "days since last played" and does not reference unique-player counts
- [x] `computeQualityScore` accepts `globalMean` and `minRatingCount` as explicit
  parameters; computes all six sub-scores; result is within [0, 100]
- [x] All weight/threshold constants are exported with JSDoc
- [x] All unit tests pass (`yarn workspace @klurigo/klurigo-service test`)

### Risks
- **Score calibration** — thresholds and weights are conservative for v1; validate against
  real content before enabling the scheduler in Phase 5.
- **Mitigation:** All thresholds and weights are named exported constants; tuning requires
  no function-signature changes.

### Phase 2 Implementation Notes

- Files were placed under
  `packages/klurigo-service/src/modules/quiz-core/utils/discovery/` as specified, with a
  barrel `index.ts` re-exporting both utility modules. `utils/index.ts` was updated to
  `export * from './discovery'`.
- `computeTrendingScore` normalises linearly (not logarithmically) because the plan's
  formula `normalize(recentPlayCount * TRENDING_PLAY_WEIGHT)` implies a simple
  `min(100, weighted / TRENDING_SCALE_MAX * 100)` expression; this keeps the function
  purely arithmetic and deterministic.
- `PLAYER_SCALE_MAX` was added as a named constant for the unique-player log-scaling, mirroring
  `PLAY_SCALE_MAX`. The plan described the same pattern for both fields; a separate export
  makes independent tuning possible without a signature change.
- The `Quiz` type used in function signatures is the Mongoose DAO class from
  `quiz-core/repositories/models/schemas`, consistent with how all other `quiz-core` utilities
  operate. No DTO or common type alias was introduced for Phase 2.
- 62 Jest tests pass across the two spec files
  (`discovery-eligibility.utils.spec.ts`, `discovery-scoring.utils.spec.ts`).

---

## Phase 3 (PR): Backend — `discovery-api` Module Schema, Repository, Featured Field & Stub Endpoint

### Goal
Stand up the Mongoose schema, the singleton-snapshot repository, the quiz
`discovery.featuredRank` field (enabling real featured curation), and a skeleton
`GET /discover` endpoint that returns a valid (but empty) response. This is the
smallest shippable backend slice — no compute, no scheduler — and also wires
`tools/mongodb-migrator` to be aware of the new schema from day one.

Snapshot capacity constants are declared here (alongside the schema they govern)
and referenced by all subsequent phases.

### Scope
**Included:**

**Snapshot capacity constants:**
Declare in `discovery-api/constants/discovery.constants.ts` (exported from the module):
- `DISCOVERY_RAIL_CAP_FEATURED = 20` — maximum entries stored per snapshot for the
  `FEATURED` rail; FEATURED is manually curated so a smaller cap is appropriate
- `DISCOVERY_RAIL_CAP_STANDARD = 200` — maximum entries stored per snapshot for all
  other rails; large enough to give "see all" meaningful depth
- `DISCOVERY_RAIL_PREVIEW_SIZE = 10` — number of entries sliced from the snapshot to
  populate the rail card row in `GET /discover`

**Quiz schema extension — `discovery.featuredRank`:**
- Add an optional embedded object to the existing Quiz Mongoose schema:
  ```
  discovery?: {
    featuredRank?: number   // lower value = higher priority in FEATURED rail
  }
  ```
  This field is intentionally **not** exposed in `QuizResponseDto` / `@klurigo/common`;
  it is an internal compute field only.
- **Management in v1 (no admin UI):** a lightweight admin script
  `packages/klurigo-service/scripts/set-featured-rank.ts` is included in this PR.
  It accepts a quiz ID and a rank value (or `--unset`) and updates the document directly
  via Mongoose. Example usage:
  ```
  ts-node set-featured-rank.ts --quizId <id> --rank 1
  ts-node set-featured-rank.ts --quizId <id> --unset
  ```
  The script is documented in `packages/klurigo-service/scripts/README.md`.

**Snapshot schema — enriched entries with scores:**
- New NestJS module: `packages/klurigo-service/src/modules/discovery-api/`
  with module file, barrel exports, and registration in `AppModule`
- Mongoose schema: `DiscoverySnapshotSchema`
  ```
  {
    _id: 'latest'                  // singleton sentinel key
    generatedAt: Date
    sections: [{
      key: DiscoverySectionKey
      entries: [{
        quizId: string             // quiz document _id
        score: number              // score used to rank this entry (for observability)
      }]
      // entries are ordered descending by score at write time
      // capacity: ≤ DISCOVERY_RAIL_CAP_STANDARD per section;
      //           ≤ DISCOVERY_RAIL_CAP_FEATURED for the FEATURED section
    }]
  }
  ```
  Collection: `discovery_snapshots`. The `score` field is stored for **observability**:
  it lets developers inspect why a quiz ranked where it did without re-running compute.
  Hydration simply follows the stored array order (no re-sort at read time).
- `DiscoverySnapshotRepository` with methods:
  - `findLatest(): Promise<DiscoverySnapshotDocument | null>`
  - `upsertLatest(snapshot): Promise<void>`
- `DiscoveryController` (`@Controller('discover')`) — `GET /discover` stub:
  - Loads latest snapshot; if none exists returns `{ sections: [], generatedAt: null }`
  - Hydration and section content left for Phase 5 (stub returns empty sections array)
  - Endpoint is **public** (no auth required)
- Swagger/OpenAPI documentation on `DiscoveryController`:
  - `@ApiTags('discovery')`
  - `@ApiOperation` with `summary` and `description` on each handler
  - `@ApiOkResponse` referencing response model class
  - `@ApiExtraModels` where nested types require it
- `quiz-core/repositories/quiz.repository.ts`:
  - Add `findManyByIds(ids: string[]): Promise<QuizDocument[]>` (needed in Phase 5)

**Excluded:** Compute service, scheduler, section endpoint, frontend.

### Backend Changes
- `discovery-api/` module skeleton: `discovery-api.module.ts`, `discovery.controller.ts`,
  `discovery-snapshot.repository.ts`, `discovery-snapshot.schema.ts`
- `discovery-api/constants/discovery.constants.ts` — declares `DISCOVERY_RAIL_CAP_FEATURED`,
  `DISCOVERY_RAIL_CAP_STANDARD`, `DISCOVERY_RAIL_PREVIEW_SIZE`
- `app.module.ts` — import `DiscoveryApiModule`
- `quiz-core/schemas/quiz.schema.ts` — add `discovery?: { featuredRank?: number }` field
- `packages/klurigo-service/scripts/set-featured-rank.ts` — admin management script
- `packages/klurigo-service/scripts/README.md` — document the script and its usage
- `quiz-core/repositories/quiz.repository.ts` — add `findManyByIds`

### Frontend Changes
None.

### Documentation Tasks
- [x] JSDoc on `DISCOVERY_RAIL_CAP_FEATURED`: value, which rail it applies to, why smaller
  than the standard cap
- [x] JSDoc on `DISCOVERY_RAIL_CAP_STANDARD`: value, which rails it applies to
- [x] JSDoc on `DISCOVERY_RAIL_PREVIEW_SIZE`: value, where it is applied (the rail card row
  in `GET /discover`)
- [x] JSDoc on `DiscoverySnapshotRepository`: class-level description + method-level
  docs for `findLatest` and `upsertLatest`; document that `upsertLatest` replaces the
  singleton document atomically and preserves `_id: 'latest'`
- [x] JSDoc on the `DiscoverySnapshotSchema` subdocument `entries`: explain `quizId` +
  `score` fields, ordering invariant (desc by score), capacity limits expressed via
  the named constants
- [x] JSDoc on `DiscoveryController` class and `GET /discover` stub handler
- [x] Swagger `@ApiOperation`, `@ApiOkResponse`, `@ApiTags('discovery')` on controller
- [x] JSDoc on `findManyByIds` in `QuizRepository`
- [x] JSDoc on `discovery.featuredRank` schema field: what it controls, how it's managed,
  and that lower values rank higher

### Tests
- Unit: `DiscoverySnapshotRepository.upsertLatest` — second call replaces first document;
  `_id` remains `'latest'`
- Unit: `DiscoverySnapshotRepository.findLatest` — returns `null` when collection is empty
- Unit: `DiscoverySnapshotRepository.findLatest` — returns document with `entries` array shape
  `[{ quizId: string; score: number }]` (verify stored schema)
- e2e: `GET /discover` returns `200` with `{ sections: [], generatedAt: null }` when no snapshot exists

### Migration / Rollout Notes
- On first deploy, snapshot collection is empty; `GET /discover` returns `sections: []`.
  This is safe — the old `/discover` frontend page is still active.
- No indexes needed beyond the singleton `_id: 'latest'` (covered by the default `_id` index).

### MongoDB Migrator Tasks
*(Phase 3 introduces the transformer; Phase 5 adds tests and README — see Phase 5 for those)*
- [x] Register `discovery_snapshots` in the collection manifest of `tools/mongodb-migrator`
  so it is included in all export/import runs
- [x] Add `transformDiscoverySnapshotDocument` in
  `tools/mongodb-migrator/src/transformers/discovery-snapshot.transformers.ts` following
  the pattern of `transformQuizDocument`:
  - Preserve `_id: 'latest'` sentinel
  - Extract and validate `generatedAt` as `Date`
  - Extract `sections[]` with `key` (string), and `entries[]` with `quizId` (string)
    and `score` (number)
- [x] Export new transformer from `tools/mongodb-migrator/src/transformers/index.ts`

### Acceptance Criteria
- [x] `GET /discover` responds `200` with `DiscoveryResponseDto` shape (empty sections)
- [x] `DiscoverySnapshotRepository` unit tests pass including the `entries` shape test
- [x] `DISCOVERY_RAIL_CAP_FEATURED`, `DISCOVERY_RAIL_CAP_STANDARD`, and
  `DISCOVERY_RAIL_PREVIEW_SIZE` constants are declared, exported, and JSDoc-documented
- [x] Quiz schema contains `discovery.featuredRank?: number` field
- [ ] `set-featured-rank.ts` script exists and is documented in `scripts/README.md`
  *(deferred — see Change Notes below)*
- [x] `discovery_snapshots` collection transformer exists in `mongodb-migrator` and handles
  `entries: [{ quizId, score }]`
- [x] Swagger UI shows `GET /discover` with correct operation metadata and response schema
- [x] All tests pass (`yarn workspace @klurigo/klurigo-service test`)

### Risks
- **Singleton correctness** — `upsertLatest` must use `{ upsert: true }` with `_id: 'latest'`
  filter. **Mitigation:** covered by repository unit test.
- **Schema migration on existing environments** — `discovery.featuredRank` is fully optional;
  no migration script needed for the quiz collection.

### Implementation Notes (Phase 3)

- The discovery snapshot uses a true singleton document identified by
  `DISCOVERY_SNAPSHOT_SINGLETON_ID = '00000000-0000-0000-0000-000000000000'`. This replaces
  the earlier `'latest'` sentinel everywhere it was referenced (schema default, repository
  filter, tests, and migrator validation).
- `DiscoverySnapshot` is defined with `_id: true` (top-level document). Subdocuments
  (`DiscoverySnapshotSection`, `DiscoverySnapshotEntry`) remain `_id: false` to avoid unnecessary
  ObjectId noise in nested arrays.
- Swagger response typing is implemented via dedicated response models that implement the
  shared DTO contracts from `@klurigo/common` (`DiscoveryResponse`, `DiscoverySectionResponse`,
  `DiscoveryQuizCardResponse`) and are referenced from the controller using
  `@ApiOkResponse({ type: DiscoveryResponse })`.
- `tools/mongodb-migrator` registers the `discovery_snapshots` collection and validates/normalizes
  its shape via `transformDiscoverySnapshotDocument`, including:
  - strict singleton `_id` enforcement
  - `generatedAt` conversion to `Date`
  - `sections[].entries[]` extraction as `{ quizId: string, score: number }`
- Repository tests use `DiscoverySectionKey.TRENDING` directly (no `'TRENDING' as never` casts).

**Excluded:**
- Admin tooling for managing `discovery.featuredRank` (`scripts/set-featured-rank.ts` +
  `scripts/README.md`) is deferred to a later phase/PR.

---

## Phase 4 (PR): Backend — `DiscoveryComputeService` (Featured, Trending, Dedupe Policy, Snapshot Capacity)

### Goal
Introduce the compute service that builds a complete snapshot: scoring all rails, applying
the explicit per-rail dedupe policy, gathering real recent-activity data for trending from
`GameRepository`, and respecting `discovery.featuredRank` for the featured rail. Stores up
to `DISCOVERY_RAIL_CAP_STANDARD` scored entries per section (up to `DISCOVERY_RAIL_CAP_FEATURED`
for `FEATURED`) so "see all" can paginate consistently from the snapshot.

### Scope
**Included:**
- `DiscoveryComputeService.compute(): Promise<void>` — full pipeline:

  **Step 1 — Fetch eligible quizzes:**
  Paginate through all eligible public quizzes via `findEligiblePublicQuizzes(offset, limit)`
  in batches of 500 until exhausted.

  **Step 2 — Gather recent-activity stats for trending:**
  Call `GameRepository.findRecentGameStats(TRENDING_WINDOW_DAYS)` to obtain, per quiz,
  the number of plays completed within the trailing `TRENDING_WINDOW_DAYS` days.
  Build a `Map<quizId, RecentActivityStats>` for O(1) lookup per quiz.
  Quizzes with no recent activity receive `{ recentPlayCount: 0 }`.

  **Step 3 — Compute global Bayesian mean:**
  Compute mean star rating across all eligible quizzes (for `computeBayesianRatingScore`
  inside `computeQualityScore`).

  **Step 4 — Score all quizzes per rail:**
  For each `DiscoverySectionKey`, produce a ranked list of `{ quizId, score }` using:
  - `FEATURED`: primary sort by `discovery.featuredRank` ascending (quizzes with this
    field set rank first; ties broken by quality score); quizzes without `featuredRank`
    fill remaining slots ranked by `computeQualityScore`. Cap at
    `DISCOVERY_RAIL_CAP_FEATURED`.
  - `TRENDING`: `computeTrendingScore(recentStats)` for each quiz. Cap at
    `DISCOVERY_RAIL_CAP_STANDARD`.
  - `TOP_RATED`: `computeBayesianRatingScore` descending. Cap at
    `DISCOVERY_RAIL_CAP_STANDARD`.
  - `MOST_PLAYED`: `gameplaySummary.count` descending (total all-time plays). Cap at
    `DISCOVERY_RAIL_CAP_STANDARD`.
  - `NEW_AND_NOTEWORTHY`: `created` descending (most recent eligible quizzes first),
    secondary sort by `computeQualityScore`. Cap at `DISCOVERY_RAIL_CAP_STANDARD`.
  - `CATEGORY_SPOTLIGHT`: pick the `QuizCategory` with the most eligible quizzes;
    rank within that category by `computeQualityScore`. Cap at
    `DISCOVERY_RAIL_CAP_STANDARD`.

  **Step 5 — Apply explicit per-rail dedupe policy:**

  **Hard-exclusive rails** (`FEATURED`, `TRENDING`, `TOP_RATED`):
  A quiz in any of these three rails is **excluded from all other rails**. Processing
  order determines priority when a quiz would qualify for multiple exclusive rails:
  `FEATURED` → `TRENDING` → `TOP_RATED`. After claiming, remove those quiz IDs from
  the candidate sets for all remaining rails.

  **Soft-deduped rails** (`MOST_PLAYED`, `NEW_AND_NOTEWORTHY`, `CATEGORY_SPOTLIGHT`):
  Quizzes already claimed by an exclusive rail are removed. These three rails may
  contain overlapping quiz IDs with each other — no further deduplication is applied
  between them. This intentional overlap is acceptable because the "see all" pages are
  distinct per key, and the rail previews each show only `DISCOVERY_RAIL_PREVIEW_SIZE`
  entries from the snapshot.

  Rationale: hard dedup across all 6 rails would restrict the total number of distinct
  quizzes shown on the main page, which is too aggressive for a small corpus. Soft dedup
  on the lower rails maximises variety at the top while tolerating some overlap in the
  secondary sections.

  **Step 6 — Persist:**
  `DiscoverySnapshotRepository.upsertLatest({ generatedAt: new Date(), sections })`.

- `quiz-core/repositories/quiz.repository.ts`:
  - Add `findEligiblePublicQuizzes(offset: number, limit: number): Promise<QuizDocument[]>`
- `GameRepository` (games persistence module):
  - Add `findRecentGameStats(windowDays: number): Promise<RecentGameStatEntry[]>`
    where `RecentGameStatEntry = { quizId: string; playCount: number }`.
    Queries the `games` collection; groups by `quizId`; counts documents whose
    `completedAt` (or equivalent timestamp) falls within the last `windowDays` days.

**Excluded:** Cron scheduler (Phase 5), REST endpoint hydration changes, frontend.

### Backend Changes
- `discovery-api/services/discovery-compute.service.ts` + `.spec.ts`
- `quiz-core/repositories/quiz.repository.ts` — add `findEligiblePublicQuizzes`
- `game` module repository (exact file path determined by module structure) — add
  `findRecentGameStats`

### Frontend Changes
None.

### Documentation Tasks
- [x] JSDoc on `DiscoveryComputeService`: class-level description covering all 6 pipeline
  steps; document the per-rail dedupe policy and its rationale
- [x] JSDoc on `compute()`: step-by-step description; side effects (upserts snapshot)
- [x] JSDoc on the `FEATURED` rail logic: document `featuredRank` sort, fallback to
  quality score, cap at `DISCOVERY_RAIL_CAP_FEATURED`
- [x] JSDoc on the trending aggregation: document `TRENDING_WINDOW_DAYS`, the
  `GameRepository.findRecentGameStats` call, and the O(1) Map lookup pattern; include
  future-enhancement note about unique-player support matching the note in Phase 2
- [x] JSDoc on `findEligiblePublicQuizzes`: `offset`, `limit`, which filters are applied
- [x] JSDoc on `GameRepository.findRecentGameStats`: `windowDays` parameter, aggregation
  logic (`games` collection grouped by `quizId`), return shape
  `[{ quizId: string; playCount: number }]`

### Tests
- [x] Unit: `FEATURED` section — quizzes with `featuredRank` appear first, sorted by rank asc;
  quizzes without `featuredRank` fill remaining slots by quality score; result capped at
  `DISCOVERY_RAIL_CAP_FEATURED`
- [x] Unit: `FEATURED` section — a quiz with `featuredRank` is not re-assigned to `TRENDING`
  or any other rail (hard-exclusive)
- [x] Unit: `TRENDING` — higher `recentPlayCount` → higher rank; quiz in `TRENDING` excluded
  from `MOST_PLAYED` (hard-exclusive)
- [x] Unit: soft-dedupe — a quiz excluded from `FEATURED`/`TRENDING`/`TOP_RATED` may appear
  in both `MOST_PLAYED` and `NEW_AND_NOTEWORTHY`; verify this is intentional and correct
- [x] Unit: cap — `FEATURED` ≤ `DISCOVERY_RAIL_CAP_FEATURED` entries; all other sections ≤
  `DISCOVERY_RAIL_CAP_STANDARD` entries
- [x] Unit: `entries` array is ordered descending by `score` within each section
- [x] Unit: `findEligiblePublicQuizzes` — pagination offset/limit forwarded correctly to query
- [x] Unit: `GameRepository.findRecentGameStats` — returns empty array for quizzes
  with no games in the window; compute treats missing as playCount 0

### Migration / Rollout Notes
- After deploying Phase 4, run `compute()` once via an admin script or bootstrap flag
  to seed the first snapshot before the scheduler is wired up in Phase 5.
- If no quizzes have `discovery.featuredRank` set yet, the `FEATURED` rail is populated
  entirely by quality score — this is the graceful fallback and is correct behaviour.

### Acceptance Criteria
- [x] `DiscoveryComputeService.compute()` produces a snapshot with ≤ `DISCOVERY_RAIL_CAP_FEATURED`
  entries for `FEATURED` and ≤ `DISCOVERY_RAIL_CAP_STANDARD` entries for all other sections
- [x] `FEATURED` rail uses `discovery.featuredRank` (ascending) as primary sort,
  quality score as fallback
- [x] `computeTrendingScore` is called with `RecentActivityStats` (containing only
  `recentPlayCount`) gathered from `GameRepository.findRecentGameStats` — not from
  `QuizRepository` and not using "days since last played"
- [x] Hard-exclusive rails (`FEATURED`, `TRENDING`, `TOP_RATED`): a quiz ID does not
  appear in any other rail once claimed
- [x] Soft-deduped rails (`MOST_PLAYED`, `NEW_AND_NOTEWORTHY`, `CATEGORY_SPOTLIGHT`):
  quizzes from exclusive rails are excluded; cross-overlap among the three is permitted
- [x] Each section's `entries` array is ordered descending by `score`
- [x] All compute service unit tests pass

### Risks
- **Recent-activity aggregation performance** — querying `games` by date range on every
  compute run. **Mitigation:** query is bounded by `TRENDING_WINDOW_DAYS`; add a compound
  index `{ quizId: 1, completedAt: 1 }` on the `games` collection.
- **Small corpus** — with few eligible quizzes, some sections may be short or empty.
  **Mitigation:** graceful — sections with 0 entries are omitted from the snapshot
  `sections` array; `GET /discover` returns only non-empty sections.
- **`featuredRank` gaps** — e.g. ranks 1, 3, 5 are set but 2, 4 are not. **Mitigation:**
  sort is by raw value ascending, not by contiguous rank, so gaps are fine.

### Implementation Notes (Phase 4)

- **Files added:**
  - `discovery-api/services/discovery-compute.service.ts` — full compute pipeline
  - `discovery-api/services/discovery-compute.service.spec.ts` — 10 unit tests
  - `discovery-api/services/index.ts` — barrel export

- **Files changed:**
  - `quiz-core/repositories/quiz.repository.ts` — added `findEligiblePublicQuizzes(offset, limit)`
    using Mongoose query filter mirroring `isDiscoveryEligible` predicates
  - `quiz-core/repositories/quiz.repository.spec.ts` — 2 new tests for offset/limit forwarding
  - `game-core/repositories/game.repository.ts` — added `findRecentGameStats(windowDays)` using
    Mongoose aggregation pipeline (`$match` → `$group` → `$project`)
  - `game-core/repositories/game.repository.spec.ts` — 3 new tests (empty result, data shape,
    match-stage date filtering)
  - `quiz-core/utils/discovery/discovery-scoring.utils.ts` — added `MIN_RATING_COUNT = 10` constant
  - `discovery-api/discovery-api.module.ts` — registered `DiscoveryComputeService`, imported
    `QuizCoreModule` and `GameCoreModule`

- **FEATURED score mapping:** To reconcile FEATURED's `featuredRank`-ascending ordering with
  the snapshot invariant (entries stored descending by score), ranked entries receive a
  synthetic score of `FEATURED_RANK_BASE_SCORE (10000) - featuredRank`. Unranked entries
  use their raw quality score (0–100). This ensures ranked entries always sort ahead of
  unranked, and lower ranks produce higher scores.

- **Game completion timestamp:** The `Game` schema includes a dedicated `completedAt`
  field (optional `Date`). It is set in every code path that transitions a game to
  `Completed`: `podiumTaskCompletedCallback` (via `new Date()`) and
  `updateCompletedGames` (via `$$NOW` in the `$set` aggregation stage). No other
  mutation path sets `status: Completed`. `findRecentGameStats` filters exclusively on
  `completedAt` (not `updated`).

- **Compound index:** `{ status: 1, completedAt: 1 }` on the `games` collection.
  The aggregation matches on equality (`status: Completed`) then range
  (`completedAt >= cutoff`), so `status` leads for selectivity and `completedAt`
  follows for the range seek. The previous `{ quiz: 1, completedAt: 1 }` index was
  replaced because `quiz` is not part of the `$match` stage.

- **Eligibility filter:** The `findEligiblePublicQuizzes` query is both trim-aware and
  null-safe. `imageCoverURL` and `description` are guarded with `{ $exists: true, $ne: null }`
  to short-circuit null values before the `$expr` evaluation. The `$expr` block uses
  `$trim` + `$strLenCP` to reject whitespace-only cover URLs (length > 0) and enforce
  a minimum trimmed description length (≥ 20 chars).

- **Test coverage:** Tests were added or updated in the following spec files:
  - `discovery-compute.service.spec.ts`
  - `quiz.repository.spec.ts`
  - `game.repository.spec.ts`
  - `game-task-transition.service.spec.ts`

---

## Phase 5 (PR): Backend — Scheduler + Snapshot Hydration + Section Endpoint + Swagger Finalization

### Goal
Complete the backend pipeline: wire up the cron scheduler, hydrate `GET /discover`
with real card payloads from the latest snapshot, and deliver the offset-paginated
`GET /discover/section/:key` endpoint. Crucially, the section endpoint paginates
**directly from the snapshot's stored entries** — not from a re-query — guaranteeing
that the "see all" ordering is always consistent with what the rail preview showed.
Also finalizes all Swagger documentation and adds the remaining MongoDB migrator tests.

### Scope
**Included:**
- `DiscoverySchedulerService`:
  - `@Cron('0 0 6,18 * * *')` (06:00 and 18:00 UTC)
  - `@MurLock(30000, 'discovery_snapshot_lock')` — single-instance guard
  - Calls `DiscoveryComputeService.compute()` on each trigger

- `DiscoveryController` — upgrade `GET /discover`:
  - Load latest snapshot; for each section present, slice
    `entries[0..DISCOVERY_RAIL_PREVIEW_SIZE - 1]` (first `DISCOVERY_RAIL_PREVIEW_SIZE`
    entries); batch-fetch quiz docs for those IDs via `findManyByIds`; map to
    `DiscoveryQuizCardDto`
  - **Section ordering is deterministic and fixed:** sections are returned in the order
    `FEATURED`, `TRENDING`, `TOP_RATED`, `MOST_PLAYED`, `NEW_AND_NOTEWORTHY`,
    `CATEGORY_SPOTLIGHT` — skipping any sections that are absent from the snapshot or
    have zero entries
  - The order of `quizzes` within each `DiscoverySectionDto` follows the snapshot's
    `entries` array order (already sorted by score descending at write time — no re-sort)
  - Graceful empty state unchanged: `{ sections: [], generatedAt: null }` if no snapshot

- `DiscoveryController` — add `GET /discover/section/:key`:
  - Accepts query params `limit` (default 20, max 50) and `offset` (default 0)
  - Load latest snapshot; find section by `key`; apply
    `entries.slice(offset, offset + limit)`; batch-fetch quiz docs for the sliced IDs;
    map to `DiscoveryQuizCardDto`
  - `snapshotTotal` in the response = `entries.length` for the matching section in the
    snapshot (≤ `DISCOVERY_RAIL_CAP_STANDARD` for standard rails; ≤
    `DISCOVERY_RAIL_CAP_FEATURED` for `FEATURED`)
  - If the key is not found in the snapshot (unknown key or section has 0 entries),
    return `{ results: [], snapshotTotal: 0, limit, offset }`
  - **Why snapshot-based, not re-query:** The stored `entries` already encode the
    computed ranking with scores. Re-querying the DB with a sort would produce a
    different ordering if data changed between the compute run and the page request.
    Paginating from the snapshot ensures the "see all" page is a faithful extension
    of the rail preview the user saw.

- Complete Swagger/OpenAPI annotations on all `DiscoveryController` handlers:
  - `@ApiOperation` with `summary` + `description`
  - `@ApiOkResponse` with explicit response class
  - `@ApiQuery` decorators for `limit` and `offset` with `minimum`, `maximum`, `default`
  - `@ApiParam` for `:key` (enum values from `DiscoverySectionKey`)
  - `@ApiBadRequestResponse` where applicable

**Excluded:** Frontend.

### Backend Changes
- `discovery-api/services/discovery-scheduler.service.ts` + `.spec.ts`
- `discovery-api/controllers/discovery.controller.ts` — hydration + section endpoint
- `discovery-api/controllers/models/paginated-discovery-section.response.ts` — NestJS
  response class implementing `DiscoverySectionPageResponseDto` with `@ApiProperty`
  decorators on all fields (`results`, `snapshotTotal`, `limit`, `offset`)

### Frontend Changes
None.

### Documentation Tasks
- [x] JSDoc on `DiscoverySchedulerService`: class-level description, cron expression,
  lock key name and timeout purpose
- [x] JSDoc on the `GET /discover` hydration handler: document the
  `DISCOVERY_RAIL_PREVIEW_SIZE` slice, the fixed section ordering
  (`FEATURED` → `TRENDING` → `TOP_RATED` → `MOST_PLAYED` → `NEW_AND_NOTEWORTHY` →
  `CATEGORY_SPOTLIGHT`), batch-fetch pattern, and ordering-preservation guarantee
- [x] JSDoc on `GET /discover/section/:key` handler: document snapshot-based pagination,
  the `snapshotTotal` semantics (bounded by `DISCOVERY_RAIL_CAP_FEATURED` or
  `DISCOVERY_RAIL_CAP_STANDARD`; not a database row count), the empty-section behaviour
- [x] `@ApiProperty` on all fields of `PaginatedDiscoverySectionResponse` (description,
  example, `minimum`/`maximum` where applicable) — aligned with `PaginatedQuizResponse`
  style; `snapshotTotal` property must document that it is bounded by snapshot capacity
  and is not the total eligible quiz count in the database
- [x] Finalize all `@ApiOperation`, `@ApiOkResponse`, `@ApiQuery`, `@ApiParam`
  decorators on `DiscoveryController`

### MongoDB Migrator Tasks
*(additive only — transformer introduced in Phase 3; this phase adds tests + docs)*
- [ ] Add `discovery-snapshot.transformers.spec.ts` with fixture documents:
  - A minimal snapshot: one section, one entry `{ quizId: 'q1', score: 42.5 }`
  - A full snapshot: all six section keys, multiple entries each with `score` values
  - Verify transformer round-trips `generatedAt` as `Date`, preserves `_id: 'latest'`,
    and correctly handles the `entries: [{ quizId, score }]` array
  *(deferred — see Implementation Notes below)*
- [x] Update `tools/mongodb-migrator/README.md` to list `discovery_snapshots` in the
  collections table with: collection name, singleton pattern note, entry schema summary

### Tests
- [x] Unit: `DiscoverySchedulerService` — fires `compute()` on cron tick (mock `DiscoveryComputeService`)
- [x] Unit: `GET /discover` handler — slices `entries[0..DISCOVERY_RAIL_PREVIEW_SIZE - 1]` and
  calls `findManyByIds` with those IDs (mock repository)
- [x] Unit: `GET /discover` handler — output `quizzes` array preserves snapshot entry order
- [x] Unit: `GET /discover` handler — sections are returned in the fixed order `FEATURED`,
  `TRENDING`, `TOP_RATED`, `MOST_PLAYED`, `NEW_AND_NOTEWORTHY`, `CATEGORY_SPOTLIGHT`;
  empty sections are skipped
- [x] Unit: `GET /discover/section/TOP_RATED?limit=10&offset=0` — slices entries, returns
  `{ results, snapshotTotal, limit: 10, offset: 0 }`
- [x] Unit: `GET /discover/section/TOP_RATED?limit=10&offset=10` — offset applied; returns
  entries 10–19 from snapshot
- [x] Unit: `GET /discover/section/TOP_RATED` — `snapshotTotal` equals `entries.length` in
  snapshot (e.g. 150), not the total count of quizzes in the database
- [x] Unit: unknown section key returns `{ results: [], snapshotTotal: 0, ... }`
- [x] e2e: `GET /discover/section/TOP_RATED?limit=10&offset=20` — offset applied correctly

### Migration / Rollout Notes
- Scheduler begins firing within 12 hours of deploy; no manual seeding required
  (Phase 4 seeded the first snapshot).
- `GET /discover/section/:key` returns data only if the latest snapshot contains
  that section; an empty snapshot returns empty results rather than an error.

### Acceptance Criteria
- [x] `GET /discover` returns populated `DiscoveryResponseDto` with each section's
  `quizzes` ordered by snapshot `entries` order (descending by score)
- [x] `GET /discover` returns sections in fixed order: `FEATURED`, `TRENDING`,
  `TOP_RATED`, `MOST_PLAYED`, `NEW_AND_NOTEWORTHY`, `CATEGORY_SPOTLIGHT` (empty sections
  skipped)
- [x] `GET /discover/section/TOP_RATED?limit=10&offset=0` returns
  `DiscoverySectionPageResponseDto` with `results`, `snapshotTotal`, `limit`, `offset`
- [x] `snapshotTotal` in section response equals the number of stored entries in the
  snapshot (not the DB count); bounded at ≤ `DISCOVERY_RAIL_CAP_STANDARD` for standard
  rails, ≤ `DISCOVERY_RAIL_CAP_FEATURED` for `FEATURED`
- [x] Section response ordering is consistent with the rail preview ordering (snapshot-based)
- [x] Scheduler fires at 06:00 and 18:00 UTC (verified via mocked Cron test)
- [x] Swagger UI shows both endpoints with complete metadata, query-param descriptions,
  and response schemas; `snapshotTotal` is described in the response schema
- [ ] Migrator transformer tests pass *(deferred — see Implementation Notes below)*
- [x] `tools/mongodb-migrator/README.md` lists `discovery_snapshots`
- [x] All unit and e2e tests pass

### Risks
- **Stale section data** — users can see "see all" results from the previous compute
  run. **Mitigation:** `generatedAt` is returned in `GET /discover` for transparency;
  the scheduler refreshes every 12 hours.
- **Large `entries` array in section response** — the batch hydration query fetches at
  most `limit` docs (bounded at 50). **Mitigation:** `limit` max is 50; batch query is
  bounded regardless of `DISCOVERY_RAIL_CAP_STANDARD`.

### Implementation Notes (Phase 5)

- **Files added:**
  - `discovery-api/services/discovery-scheduler.service.ts` — cron scheduler with
    `@Cron('0 0 6,18 * * *')` and `@MurLock(30000, 'discovery_snapshot_lock')`
  - `discovery-api/services/discovery-scheduler.service.spec.ts` — 2 unit tests
  - `discovery-api/controllers/discovery.controller.spec.ts` — 10 unit tests
  - `discovery-api/controllers/models/paginated-discovery-section.response.ts` — NestJS
    response class implementing `DiscoverySectionPageResponseDto`
  - `discovery-api/constants/discovery-section-metadata.constants.ts` — section title/
    description mapping and fixed display order array

- **Files changed:**
  - `discovery-api/controllers/discovery.controller.ts` — hydrated `GET /discover` with
    snapshot slicing, batch-fetch, and card mapping; added `GET /discover/section/:key`
    with offset pagination; full Swagger annotations on both handlers
  - `discovery-api/controllers/discovery.controller.e2e-spec.ts` — added e2e test for
    section endpoint
  - `discovery-api/discovery-api.module.ts` — registered `DiscoverySchedulerService`
  - `discovery-api/services/index.ts` — barrel export for scheduler service
  - `discovery-api/controllers/models/index.ts` — barrel export for paginated response
  - `discovery-api/constants/index.ts` — barrel export for section metadata constants
  - `tools/mongodb-migrator/README.md` — listed `discovery_snapshots` in collections

- **Quiz-to-card mapping:** The controller maps Quiz documents to `DiscoveryQuizCardDto`
  using the same field mapping pattern as `QuizService.mapQuizToResponseDto`. The
  `gameplaySummary.difficultyPercentage` is computed via the existing
  `toQuizGameplaySummaryDifficultyPercentage` utility. Author data is derived from the
  populated `owner` document (`owner._id`, `owner.defaultNickname`).

- **Snapshot entry order preservation:** `findManyByIds` returns documents in arbitrary
  Mongo order. The controller builds a `Map<id, Quiz>` and iterates the snapshot's entry
  array to produce the output `quizzes`/`results` array, guaranteeing the ordering
  matches the snapshot (descending by score at compute time).

- **Section metadata:** A `DISCOVERY_SECTION_METADATA` record maps each
  `DiscoverySectionKey` to `{ title, description? }`. A separate `DISCOVERY_SECTION_ORDER`
  array defines the fixed display order for `GET /discover`.

- **Limit clamping:** The section endpoint clamps `limit` to [1, 50] and `offset` to
  [0, ∞) server-side, avoiding invalid slice arguments.

**Excluded:**
- Migrator transformer tests (`discovery-snapshot.transformers.spec.ts`) are deferred
  (the migrator tool has no test runner configured).

---

## Phase 6 (PR): Frontend — Discovery Rails Page (New Route, No Cutover)

### Goal
Ship the new horizontal-rails UI at `/discover/rails` so it can be QA'd and reviewed
without disrupting the current `/discover` experience. Users can navigate to it
directly but it is not yet the default.

### Scope
**Included:**
- New route: `/discover/rails` in `main.tsx` (kept behind `ProtectedRoute`)
- `DiscoverRailsPage` container — React Query `useQuery(['discover'])`, calls new
  `getDiscovery()` API function
- `DiscoverRailsPageUI` — renders title/subtitle + ordered list of
  `DiscoveryRailSection` components + graceful empty state
- `DiscoveryRailSection` component:
  - Section `title` + optional `description`
  - Horizontal scrollable list of `QuizDiscoveryCard` components (CSS scroll snap)
  - "See all →" link → `/discover/section/:key`
  - Skeleton loading state (`DISCOVERY_RAIL_PREVIEW_SIZE` placeholder cards)
- `QuizDiscoveryCard` component:
  - Cover image (fallback SVG), title, author name, question count,
    play count, star rating chip
  - Clicking navigates to quiz details page
  - SCSS module styling; reuses existing typography tokens
- API resource: `getDiscovery()` added to `quiz.resource.ts`; exposed on
  `useKlurigoServiceClient`
- Storybook stories for `DiscoveryRailSection` and `QuizDiscoveryCard`

**Excluded:** Section "see all" page (Phase 7), route cutover (Phase 8).

### Frontend Changes
- `packages/klurigo-web/src/pages/DiscoverRailsPage/` — new page
- `packages/klurigo-web/src/pages/DiscoverRailsPage/components/DiscoverRailsPageUI/`
- `packages/klurigo-web/src/pages/DiscoverRailsPage/components/DiscoverRailsPageUI/components/DiscoveryRailSection`
- `packages/klurigo-web/src/components/QuizDiscoveryCard/` — new shared component
- `packages/klurigo-web/src/api/resources/quiz.resource.ts` — add `getDiscovery()`
- `packages/klurigo-web/src/api/useKlurigoServiceClient.tsx` — expose `getDiscovery`
- `packages/klurigo-web/src/main.tsx` — add `/discover/rails` route

### Backend Changes
None.

### Documentation Tasks
- [x] TSDoc on `DiscoverRailsPage`: describe props, data flow, query key
- [x] TSDoc on `DiscoveryRailSection`: describe all props (`key`, `title`, `description`,
  `quizzes`, `isLoading`), scroll/keyboard accessibility notes
- [x] TSDoc on `QuizDiscoveryCard`: describe all props, fallback behaviour for missing cover
- [x] TSDoc on `getDiscovery()` API resource function: URL, return type, error handling

### Tests
- Vitest unit: `DiscoverRailsPageUI` renders correct number of sections
- Vitest unit: `DiscoveryRailSection` renders skeleton when `isLoading`; renders
  cards when data is present
- Vitest unit: `QuizDiscoveryCard` renders cover fallback when no `imageCoverURL`
- Vitest unit: `getDiscovery()` API resource calls correct URL
- Snapshot tests for `DiscoverRailsPageUI`

### Migration / Rollout Notes
- No routing change yet; purely additive.
- If snapshot has not been seeded (empty sections), the page renders an empty state
  message ("More quizzes coming soon — check back later!").

### Acceptance Criteria
- [x] `/discover/rails` renders all sections returned by `GET /discover`
- [x] Each section shows a horizontal scrollable row of quiz cards
- [x] Skeleton displayed while loading
- [x] "See all" link visible but navigates to `/discover/section/:key`
  (may 404 until Phase 7)
- [x] Empty state renders without error when `sections` is empty
- [x] All public components and API functions have TSDoc documentation
- [x] All unit tests pass

### Risks
- **API shape mismatch** — mitigated by shared `@klurigo/common` DTOs from Phase 1.
- **Scroll accessibility** — ensure horizontal list is keyboard-navigable
  (tabIndex on cards, overflow-x with visible focus ring).

### Implementation Notes (Phase 6)
- `QuizDiscoveryCard` renders cover image with `faImage` FontAwesome fallback SVG when
  `imageCoverURL` is absent; cards are keyboard-accessible via `tabIndex={0}` with
  Enter/Space key handlers and visible focus ring via `:focus-visible`.
- `DiscoveryRailSection` uses CSS `scroll-snap-type: x mandatory` on the rail container
  with `scroll-snap-align: start` on each card for horizontal scroll snapping.
- Skeleton loading uses 10 placeholder cards (`DISCOVERY_RAIL_SKELETON_COUNT`) matching
  the backend `DISCOVERY_RAIL_PREVIEW_SIZE`; shimmer animation via CSS `@keyframes`.
- `DiscoverRailsPageUI` renders 3 skeleton rail sections during loading to approximate
  the page layout before data arrives.
- `getDiscovery()` added to `quiz.resource.ts` calling `GET /discover`; automatically
  exposed via `useKlurigoServiceClient` through the existing spread pattern.
- React Query key: `['discover']`.
- Empty state message: "More quizzes coming soon — check back later!"
- Route `/discover/rails` added behind `ProtectedRoute`; legacy `/discover` unchanged.
- Storybook stories added for `QuizDiscoveryCard` (4 variants) and
  `DiscoveryRailSection` (4 variants) and `DiscoverRailsPageUI` (3 variants).
- 40 new Vitest tests across 5 test files (all passing).

---

## Phase 7 (PR): Frontend — "See All" Section Page

### Goal
Complete the navigation story by delivering the dedicated per-section page
(`/discover/section/:key`) that shows the full ordered list of quizzes for a rail,
with offset-based pagination. Ordering is guaranteed consistent with the rail preview
because both draw from the same snapshot data (see Phase 5).

### Scope
**Included:**
- New route: `/discover/section/:key` in `main.tsx`
- `DiscoverSectionPage` container — reads `:key` from route params; React Query
  `useQuery(['discoverSection', key, limit, offset])`, calls
  `getSectionQuizzes(key, { limit, offset })`
- `DiscoverSectionPageUI` — vertical list of `QuizDiscoveryCard` (grid layout),
  section title/description, back link to `/discover/rails`
- Offset-based pagination: "Load more" button increments `offset` by `limit`;
  button hidden when `offset + results.length >= snapshotTotal`
- API resource: `getSectionQuizzes(key, { limit, offset })` added to `quiz.resource.ts`
  — passes `limit` and `offset` as query params; returns `DiscoverySectionPageResponseDto`

**Excluded:** Route cutover (Phase 8).

### Frontend Changes
- `packages/klurigo-web/src/pages/DiscoverSectionPage/` — new page
- `packages/klurigo-web/src/api/resources/quiz.resource.ts` — add `getSectionQuizzes()`
- `packages/klurigo-web/src/main.tsx` — add `/discover/section/:key` route

### Backend Changes
None (endpoint shipped in Phase 5).

### Documentation Tasks
- [x] TSDoc on `DiscoverSectionPage`: describe route param `key`, query key structure,
  pagination state (`limit`, `offset`, `snapshotTotal`); note that ordering matches the
  rail preview and that `snapshotTotal` is bounded by snapshot capacity (not a DB count)
- [x] TSDoc on `getSectionQuizzes()`: document `key`, `limit`, `offset` params, return
  type; note the `snapshotTotal` field semantics

### Tests
- [x] Vitest unit: `DiscoverSectionPage` renders section title from route key
- [x] Vitest unit: "Load more" button increments offset and appends results
- [x] Vitest unit: "Load more" hidden when `offset + results.length >= snapshotTotal`
- [x] Vitest unit: unknown section key shows graceful empty/error state

### Migration / Rollout Notes
- "See all" links from Phase 6 now resolve correctly.

### Acceptance Criteria
- [x] `/discover/section/TOP_RATED` renders the top-rated quiz list in snapshot order
- [x] Offset pagination ("Load more") works against `GET /discover/section/:key`
- [x] `getSectionQuizzes` passes `limit` and `offset` as query params (no cursor params)
- [x] "Load more" visibility is controlled by `snapshotTotal` from the response
- [x] Ordering on the "see all" page matches the ordering of quizzes shown in the rail
  preview (both sourced from the same snapshot)
- [x] Unknown key renders graceful empty/error state
- [x] Back navigation returns to `/discover/rails`
- [x] All unit tests pass

### Risks
- **Section key validation** — `DiscoverySectionKey` enum used for type-checking in
  API layer; unknown keys return empty result from backend (not a 500).

### Implementation Notes (Phase 7)
- Route `/discover/section/:key` added to `main.tsx` behind `ProtectedRoute`, alongside
  the existing `/discover/rails` route.
- `getSectionQuizzes(key, { limit, offset })` added to `quiz.resource.ts`; calls
  `GET /discover/section/:key` with limit/offset as query params; returns
  `DiscoverySectionPageResponseDto`.
- `DiscoverSectionPage` container manages `offset` state and accumulates quiz results
  across pages in local state. React Query key: `['discoverSection', key, limit, offset]`.
  Default page size is 20. "Load more" increments offset by the default limit and appends
  results to the accumulated list.
- `DiscoverSectionPageUI` renders a back link to `/discover/rails`, the section title,
  a responsive grid of `QuizDiscoveryCard` components, and a "Load more" button that is
  hidden when `offset + allQuizzes.length >= snapshotTotal`.
- Error/unknown key handling: when the API call fails or the key is empty, a graceful
  empty state message is shown instead of crashing.
- Tests: 5 Vitest tests in `DiscoverSectionPage.test.tsx` (title rendering, load more
  appending, load more hidden, error state, back link) and 2 tests added to
  `quiz.resource.test.ts` (success and error paths for `getSectionQuizzes`).
- All 1403 frontend tests pass; lint is clean.

---

## Phase 8 (PR): Cutover — `/discover` Replaced by Discovery Rails; Old Page Removed

### Goal
Make the discovery rails the primary experience by pointing `/discover` at
`DiscoverRailsPage`, then fully removing the old discover page component,
its route, all associated API calls, dead styles, and any tests that covered
it exclusively. No legacy route is preserved.

### Scope
**Included:**
- Point `/discover` route at `DiscoverRailsPage`
- Remove the `/discover/rails` shadow route (it was only a staging alias)
- Delete `QuizDiscoverPage` component and all sub-components
  (e.g., `QuizDiscoverPageUI`, any filter/sort table components used only there)
- Remove the old discover API call(s) used exclusively by `QuizDiscoverPage`
  (e.g., the `GET /quizzes` filter-oriented call if it is not used elsewhere)
- Remove dead SCSS module files associated only with the old page
- Delete unit and snapshot tests that covered the removed page exclusively
- Update any in-app navigation links (`Page` nav, `HomePage` CTA, breadcrumbs)
  that referenced `/discover`
- Update page `<title>` and `<meta description>` for SEO on the new page
- Ensure `DiscoverRailsPage` receives the correct nav-active state from `Page`

**Excluded:** Any new features; the scope is purely cutover + cleanup.

### Frontend Changes
- `packages/klurigo-web/src/main.tsx` — remove old discover route; point `/discover`
  at `DiscoverRailsPage`; remove `/discover/rails` alias
- `packages/klurigo-web/src/pages/QuizDiscoverPage/` — **delete entire directory**
- Any shared components that were only consumed by `QuizDiscoverPage` — **delete**
- Any API resource functions only called by `QuizDiscoverPage` — **delete**
- Any SCSS module files only used by the deleted page/components — **delete**
- All component/snapshot tests exclusively covering removed code — **delete**
- Nav and CTA components — update hrefs (no change needed for `/discover` itself
  since it is preserved as the canonical path)

### Backend Changes
None.

### Tests
- E2E (Playwright): navigate to `/discover`, assert rails are rendered
- E2E: assert `/discover/search` and `/discover/rails` return 404 or redirect
  (neither legacy route exists)
- Snapshot update for any nav component tests that render `/discover` links

### Migration / Rollout Notes
- This is a breaking UX change: users who bookmarked `/discover` now land on
  discovery rails (intended). No legacy fallback is provided.
- No backend changes; purely a routing flip and dead-code removal.
- **Rollback plan:** revert this PR alone to restore the old behaviour instantly.

### Acceptance Criteria
- [x] `/discover` renders `DiscoverRailsPage`
- [x] `/discover/rails` no longer exists as a separate route
- [x] `QuizDiscoverPage` directory and all exclusively-associated components deleted
- [x] No dead discover-specific SCSS files remain
- [x] No discover-only API resource functions remain
- [x] No exclusively-old-discover unit/snapshot tests remain
- [x] All existing navigation links pointing at `/discover` work correctly
- [x] E2E Playwright tests updated and passing
- [x] `yarn build` and `yarn lint` pass with zero warnings related to removed code

### Risks
- **Inadvertent deletion of shared code** — review component usage before deleting;
  `QuizDiscoveryCard` introduced in Phase 6 is shared and must be kept.
- **SEO** — no server-side rendering in this stack, so no HTTP redirect needed;
  the canonical path `/discover` remains unchanged.

### Implementation Notes (Phase 8)
- `main.tsx`: `/discover` route now renders `DiscoverRailsPage`; `/discover/rails` alias
  removed entirely. `QuizDiscoverPage` import removed.
- `pages/index.ts`: `QuizDiscoverPage` re-export removed.
- `pages/QuizDiscoverPage/` directory deleted in full (container, `QuizDiscoverPageUI`
  presentational component, snapshot, Storybook story, unit test, barrel files).
- `quiz.resource.ts`: `getPublicQuizzes` function removed (was the only caller of
  `GET /quizzes` with filter params). `PaginatedQuizResponseDto` import kept because
  `getProfileQuizzes` still uses it.
- `quiz.resource.test.ts`: Two `getPublicQuizzes` test cases removed; 21 remaining tests
  pass.
- Shared components verified before deletion: `QuizTable`, `QuizTableFilter`, and
  `useQuizzesSearchOptions` are still used by `ProfileQuizzesPage` and were kept.
  `QuizDiscoveryCard` (introduced in Phase 6) is used by `DiscoverRailsPage` and kept.
- Navigation links in `Page.tsx` already pointed to `/discover` (unchanged canonical path);
  `DiscoverRailsPageUI` already used `<Page discover profile>` so nav active state works.
- No `<title>` / `<meta description>` mechanism exists in the app (no react-helmet,
  no `document.title` usage); no SEO metadata changes were needed.
- New Playwright e2e test `e2e-tests/Discovery.spec.ts` added: asserts `/discover`
  renders discovery rails page and `/discover/rails` shows the error page.

---

## Phase Sequencing Rationale

| # | Phase                                                    | Why this order                                                                                                                                                                                               |
|---|----------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| 1 | Common contracts                                         | Both backend and frontend depend on these types. Shipping first ensures all sides agree on the API shape (offset pagination, `snapshotTotal` semantics) before any implementation is written.                |
| 2 | Scoring utilities (eligibility + quality + trending)     | Pure functions with no infrastructure dependencies. Validates algorithm correctness — including the play-count-based trending model and explicit quality sub-scores — before any data flows through them.    |
| 3 | Backend schema + repository + quiz featured field + stub | Smallest deployable backend slice. Declares capacity constants. Establishes the `entries: [{quizId, score}]` snapshot schema, the `discovery.featuredRank` quiz field, and the MongoDB migrator transformer. |
| 4 | Compute service (featured, trending, dedupe policy)      | Adds the algorithm on top of the schema. First real snapshot seeded manually. Trending uses real recent-play data from `GameRepository`; dedupe policy is explicit per rail.                                 |
| 5 | Scheduler + hydration + section endpoint + Swagger       | Completes the backend. Fixed section ordering guaranteed. Snapshot-based section endpoint guarantees ordering consistency. Swagger finalized. Migrator tests and README updated (additive-only).             |
| 6 | Rails UI (shadow route)                                  | Completely additive frontend; zero risk to the live UX. QA happens in production before touching `/discover`.                                                                                                |
| 7 | "See all" page                                           | Completes navigation. Depends on Phase 5 endpoint and Phase 6 card component; ordering consistency and `snapshotTotal` semantics flow naturally from the shared snapshot source.                             |
| 8 | Cutover + cleanup                                        | Deliberately last. All pieces verified independently. The flip is a route swap; the cleanup removes all dead code so no legacy path or component remains.                                                    |

This ordering ensures:
- **No "big bang" moment** — every intermediate phase ships a working system.
- **Backend validated before frontend lands** — ops verify snapshot computation and
  real trending data before any user sees the new UI.
- **Each PR is independently revertable** — Phases 1–7 are additive; only Phase 8
  changes existing behaviour and can be reverted atomically.
- **No legacy `/discover/search` route** — the old page is removed entirely at cutover.
- **Ordering consistency** — the "see all" page always shows the same ranking as the
  rail preview because both read from the same snapshot entries.

---

## Additional Changes & Improvements

This section tracks incremental changes made after the main phased plan was drafted.
Each entry describes the change, the motivation, and any open considerations.

### Startup seed via `DISCOVERY_SEED_ON_INIT`

**Change:** `DiscoverySchedulerService` now implements `OnModuleInit`. When the
`DISCOVERY_SEED_ON_INIT` environment variable is set to `true`, a one-time
`DiscoveryComputeService.compute()` call is executed at application startup,
before the first scheduled cron tick fires.

**Motivation:** After deploying a fresh environment the `discovery_snapshots`
collection is empty. The `GET /discover` endpoint returns an empty sections
array until the scheduler fires at 06:00 or 18:00 UTC. Setting
`DISCOVERY_SEED_ON_INIT=true` on first deploy seeds the snapshot immediately
without manual intervention or a separate admin script.

**Usage:** Set `DISCOVERY_SEED_ON_INIT=true` in the environment (e.g. `.env.production`)
for a single deploy. Remove or set to `false` once the scheduler takes over.

**Files changed:**
- `packages/klurigo-service/src/app/config/environment.ts` — added `DISCOVERY_SEED_ON_INIT: boolean`
- `packages/klurigo-service/src/modules/discovery-api/services/discovery-scheduler.service.ts` — added `OnModuleInit`, injected `ConfigService`
- `packages/klurigo-service/src/modules/discovery-api/services/discovery-scheduler.service.spec.ts` — added 2 new tests for `onModuleInit`

**Open considerations:**
- In a multi-instance deployment, `DISCOVERY_SEED_ON_INIT` will trigger compute on
  every pod that starts. If this is a concern, extend `onModuleInit` to acquire the
  same `discovery_snapshot_lock` used by `refreshSnapshot`.

### Remove `title` and `description` from section DTOs

**Change:** Removed the `title` (string) and `description` (optional string) fields from
`DiscoverySectionDto` and removed `title` from `DiscoverySectionPageResponseDto` in
`@klurigo/common`. Correspondingly removed those fields from the NestJS response
classes (`DiscoverySectionResponse`, `PaginatedDiscoverySectionResponse`), the
controller mapping logic, and the `DISCOVERY_SECTION_METADATA` constant (which
is now deleted; only `DISCOVERY_SECTION_ORDER` remains in that file).

**Motivation:** The frontend already maintains its own key-to-label mapping via
`DISCOVERY_SECTION_TITLES` and `DISCOVERY_SECTION_DESCRIPTIONS` utilities and
does not consume the backend-supplied strings. Shipping redundant display strings
in every API response adds unnecessary payload and creates a dual source of truth
for UI copy.

**Files changed:**
- `packages/common/src/models/discovery.dto.ts` — removed `title`/`description` from `DiscoverySectionDto`; removed `title` from `DiscoverySectionPageResponseDto`
- `packages/common/src/models/discovery.dto.spec.ts` — removed corresponding field tests
- `packages/klurigo-service/src/modules/discovery-api/controllers/models/discovery-section.response.ts` — removed `title`/`description` fields
- `packages/klurigo-service/src/modules/discovery-api/controllers/models/paginated-discovery-section.response.ts` — removed `title` field
- `packages/klurigo-service/src/modules/discovery-api/controllers/discovery.controller.ts` — removed `DISCOVERY_SECTION_METADATA` import and usage
- `packages/klurigo-service/src/modules/discovery-api/constants/discovery-section-metadata.constants.ts` — removed `SectionMetadata` type and `DISCOVERY_SECTION_METADATA` constant
- `packages/klurigo-service/src/modules/discovery-api/controllers/discovery.controller.spec.ts` — removed `title` assertion
- `packages/klurigo-service/src/modules/discovery-api/controllers/discovery.controller.e2e-spec.ts` — removed `title` assertion
- `packages/klurigo-web/src/pages/DiscoverRailsPage/DiscoverRailsPage.test.tsx` — removed `title`/`description` from mock section fixture
- `packages/klurigo-web/src/pages/DiscoverRailsPage/components/DiscoverRailsPageUI/DiscoverRailsPageUI.stories.tsx` — removed `title`/`description` from story fixtures
- `packages/klurigo-web/src/pages/DiscoverSectionPage/DiscoverSectionPage.test.tsx` — removed `title` from mock response fixtures

### Remove `isDiscoveryEligible` utility and related constants

**Change:** Deleted `discovery-eligibility.utils.ts` and its test file
`discovery-eligibility.utils.spec.ts`. Removed the re-export from
`utils/discovery/index.ts`. Updated the JSDoc on
`QuizRepository.findEligiblePublicQuizzes` to inline the eligibility
criteria directly (removing the reference to the now-deleted function
and its `MIN_*` constants).

**Motivation:** `isDiscoveryEligible` was dead code in production — it was
never called outside of tests. The eligibility logic is fully expressed as a
Mongoose query filter in `findEligiblePublicQuizzes`, which is the only place
the criteria are enforced at runtime. Keeping a parallel in-memory utility
created a dual source of truth with no practical benefit.

**Files changed:**
- `packages/klurigo-service/src/modules/quiz-core/utils/discovery/discovery-eligibility.utils.ts` — deleted
- `packages/klurigo-service/src/modules/quiz-core/utils/discovery/discovery-eligibility.utils.spec.ts` — deleted
- `packages/klurigo-service/src/modules/quiz-core/utils/discovery/index.ts` — removed re-export of deleted file
- `packages/klurigo-service/src/modules/quiz-core/repositories/quiz.repository.ts` — updated JSDoc to inline criteria (removed `isDiscoveryEligible`/`MIN_*` references)

### Relax discovery eligibility filter — include quizzes without cover/description

**Change:** Removed the `imageCoverURL` and `description` hard-filter conditions from
`QuizRepository.findEligiblePublicQuizzes`. The query now includes any public quiz with
at least 10 questions, regardless of whether a cover image or description is present.
The two corresponding unit tests (asserting `imageCoverURL` null-guards and the
trim-aware `$expr` filter) were removed from `quiz.repository.spec.ts`.

**Motivation:** The previous filter was too strict for a small quiz corpus — sections
were left empty or severely under-populated when few quizzes had both a cover image
and a description. Quizzes without these fields are not excluded; instead they
naturally receive lower quality sub-scores:

- Missing cover image: **−10 pts** (`QUALITY_WEIGHT_COVER`)
- Missing / too-short description: **−15 pts** (`QUALITY_WEIGHT_DESCRIPTION`)

This means an incomplete quiz can score at most 75/100 quality, while a fully-populated
quiz can reach 100/100. All discovery rails therefore still surface complete, high-quality
quizzes first while guaranteeing content in every section even when the corpus is small.

**Files changed:**
- `packages/klurigo-service/src/modules/quiz-core/repositories/quiz.repository.ts` —
  removed `imageCoverURL` and `description` filter conditions and `$expr` block;
  updated JSDoc to document the relaxed criteria and explain the score-penalty approach
- `packages/klurigo-service/src/modules/quiz-core/repositories/quiz.repository.spec.ts` —
  removed `'uses a trim-aware filter for imageCoverURL via $expr'` and
  `'applies null guards on imageCoverURL and description'` tests

### Fix discovery compute: TRENDING exclusivity starves soft rails; TOP_RATED shows unrated quizzes

**Problem:** With a small quiz corpus (e.g. 63 quizzes), two bugs caused most rails to
be missing from every snapshot:

1. **TRENDING claimed all quizzes with zero recent activity.** `scoreTrending` included
   every eligible quiz regardless of score. Quizzes with no recent plays received
   `computeTrendingScore` = 0. Since TRENDING is a hard-exclusive rail processed before
   TOP_RATED, all 43 quizzes remaining after FEATURED were claimed by TRENDING even though
   none actually had any recent activity — leaving nothing for TOP_RATED, MOST_PLAYED,
   NEW_AND_NOTEWORTHY, and CATEGORY_SPOTLIGHT.

2. **`applyDedupePolicy` claimed all cap-many entries, not just the preview row.** Even
   after fixing the TRENDING zero-score issue, TOP_RATED claimed up to 200 entries
   exclusively. With ≤63 quizzes this consumed the entire corpus, again starving soft rails.

3. **TOP_RATED surfaced unrated quizzes.** Bayesian scoring pulls quizzes with zero
   ratings toward `globalMean`. When the global mean is above 0 (set by the few quizzes
   that do have ratings), unrated quizzes score exactly at the mean — ranking higher than
   quizzes with a below-average rating. The section therefore displayed quizzes with no
   ratings at all.

**Fix:**
- `scoreTrending`: added `.filter((e) => e.score > 0)` before `.slice()` — quizzes with
  no recent plays are excluded from TRENDING entirely (they should not occupy exclusive
  slots when they have no trending signal).
- `scoreTopRated`: added `.filter((quiz) => (quiz.ratingSummary?.count ?? 0) > 0)` before
  mapping to Bayesian scores — only quizzes that have been rated at least once appear in
  TOP_RATED.
- `applyDedupePolicy`: each hard-exclusive rail now only claims the first
  `DISCOVERY_RAIL_PREVIEW_SIZE` (10) entries into the `claimed` set instead of all entries
  up to the cap. The full scored list is still stored in the snapshot for "see all"
  pagination; only the homepage preview row needs to be truly exclusive. This caps the
  maximum exclusive consumption at `3 × DISCOVERY_RAIL_PREVIEW_SIZE = 30` quizzes,
  leaving ample supply for soft rails even on small corpora.
- Two unit tests in `discovery-compute.service.spec.ts` updated to reflect the new
  behaviour (zero-score quizzes excluded from TRENDING; `quizWithoutStats` not present in
  TRENDING rather than present with score 0).

**Files changed:**
- `packages/klurigo-service/src/modules/discovery-api/services/discovery-compute.service.ts`
  — `scoreTrending` filter, `scoreTopRated` rating filter, `applyDedupePolicy` preview-size
  claim limit, added `DISCOVERY_RAIL_PREVIEW_SIZE` import
- `packages/klurigo-service/src/modules/discovery-api/services/discovery-compute.service.spec.ts`
  — updated two tests: "missing recent stats" and "trending stats influence"

### Secure discovery endpoints with new `DISCOVERY` authority

**Change:** The discovery endpoints (`GET /api/discover` and `GET /api/discover/section/:key`)
were previously decorated with `@Public()`, making them accessible without authentication.
They are now secured behind a new `Authority.Discovery` authority, consistent with the
pattern used by other protected endpoints (e.g. `GET /api/quizzes`).

A new `Discovery = 'DISCOVERY'` value was added to the `Authority` enum in `@klurigo/common`
and automatically included in `DEFAULT_USER_AUTHORITIES`, so every user token receives it
on sign-in without any action required from existing users.

The discovery controller now carries class-level `@ApiBearerAuth()`,
`@RequiresScopes(TokenScope.User)`, and `@RequiredAuthorities(Authority.Discovery)`
decorators (mirroring `QuizController`), and the per-endpoint `@Public()` calls were removed.

The two discovery e2e tests were updated to authenticate with a valid user token before
calling the endpoints.

**Files changed:**
- `packages/common/src/models/authority.enum.ts` — added `Discovery = 'DISCOVERY'` with JSDoc
- `packages/klurigo-service/src/app/shared/token/token.constants.ts` — added `Authority.Discovery`
  to `DEFAULT_USER_AUTHORITIES`
- `packages/klurigo-service/src/modules/discovery-api/controllers/discovery.controller.ts` —
  removed `@Public()` and `Public` import; added `@ApiBearerAuth()`,
  `@RequiresScopes(TokenScope.User)`, `@RequiredAuthorities(Authority.Discovery)` at class level;
  updated class JSDoc
- `packages/klurigo-service/src/modules/discovery-api/controllers/discovery.controller.e2e-spec.ts` —
  updated both tests to authenticate via `createDefaultUserAndAuthenticate`

### Search & Filter on Discovery Rails Page

**Implemented:** Search and filter capability added directly to the discovery rails page (`/discover`).

**Summary:**
The `DiscoverRailsPage` now includes a `QuizTableFilter` bar (search field + category, language, mode, sort filters) at the top of the page. When a filter is active, the curated rails are replaced with a live search-results grid backed by the existing `GET /quizzes` API. A "Back to discovery" button clears the filter and restores the rails view.

**Behaviour:**
- Typing a search term or selecting any filter triggers `GET /quizzes` with the corresponding query params.
- Results are displayed in a responsive grid identical in layout to the section "See All" page (`DiscoverSectionPageUI`), using `QuizDiscoveryCard` for each result.
- A "Load more" button appears when `total > currentlyLoaded`, appending the next page.
- Clearing the filter (via "Back to discovery" button or the inline "clear the filter" link in the empty-state message) resets all filter state and returns to the curated rails view.
- While a filter is active, the rails React Query fetch is disabled to avoid unnecessary backend calls.

**Files changed:**
- `packages/klurigo-web/src/api/resources/quiz.resource.ts` — re-added `getPublicQuizzes` (removed in commit `5a2730e0`) supporting `search`, `mode`, `category`, `languageCode`, `sort`, `order`, `limit`, `offset` params
- `packages/klurigo-web/src/pages/DiscoverRailsPage/DiscoverRailsPage.tsx` — added `FilterOptions` state, `searchOffset`/`allSearchResults`/`searchTotal` pagination state; conditionally fetches public quizzes when filter is active; passes all filter + search props to UI
- `packages/klurigo-web/src/pages/DiscoverRailsPage/components/DiscoverRailsPageUI/DiscoverRailsPageUI.tsx` — added `QuizTableFilter`, conditional grid/rails rendering, "Back to discovery" button, and inline "clear" link in empty-state
- `packages/klurigo-web/src/pages/DiscoverRailsPage/components/DiscoverRailsPageUI/DiscoverRailsPageUI.module.scss` — added `.filterBar`, `.grid`, `.loadMoreContainer`, `.clearLink` styles
- `packages/klurigo-web/src/pages/DiscoverRailsPage/components/DiscoverRailsPageUI/DiscoverRailsPageUI.test.tsx` — updated all existing tests for new required props; added tests for search grid, search empty-state, clear filter callback, and "Load more" button
- `packages/klurigo-web/src/pages/DiscoverRailsPage/components/DiscoverRailsPageUI/DiscoverRailsPageUI.stories.tsx` — updated all stories with new required props

### Rail Scroll Polish — Edge Fades & Arrow Navigation

**Implemented:** Visual polish update to `DiscoveryRailSection` adding subtle scroll-direction cues and keyboard-friendly arrow navigation for the horizontal quiz card rails.

**Summary:**
Each rail now has a lightweight scroll wrapper (`railWrapper`) that tracks scroll state and renders:

1. **Edge fade shadows** — CSS pseudo-elements (`::before` / `::after`) on the wrapper overlay a short gradient that fades from the page background colour (`$blue-2`) to transparent at both horizontal edges. The left fade is shown only when the rail has scrolled past the start; the right fade is shown only when more content remains to the right. Both fade in/out with a CSS transition keyed on the `.hasScrollLeft` / `.hasScrollRight` classes toggled by React state.

2. **Prev / Next arrow buttons** — Absolutely positioned circle buttons (`.arrowPrev`, `.arrowNext`) sit inside the wrapper at z-index 2, above the fades. They are hidden on mobile and tablet (`display: none`) and invisible by default on desktop (`opacity: 0 / pointer-events: none`). On desktop they become visible (`opacity: 1 / pointer-events: auto`) only while the parent `<section>` is hovered *and* the wrapper carries the corresponding `.hasScrollLeft` or `.hasScrollRight` class — achieved with two targeted CSS descendant rules rather than JS event listeners. Clicking an arrow calls `el.scrollBy({ left: ±clientWidth, behavior: 'smooth' })` to page the rail by one visible viewport width.

3. **Scroll state tracking** — A `useEffect` attaches a passive `scroll` listener and a `ResizeObserver` to the rail `<div>` (via `railRef`). Both call `updateScrollState` to keep `canScrollLeft` / `canScrollRight` in sync. The effect also re-runs when `quizzes` or `isLoading` change so the state is correct after content loads.

**Accessibility:** Arrow buttons carry descriptive `aria-label` attributes (`"Scroll left"` / `"Scroll right"`) and `tabIndex={-1}` to keep them out of the tab order (the rail itself is natively keyboard-scrollable). All existing card links and keyboard navigation behaviour are unaffected.

**Files changed:**
- `packages/klurigo-web/src/pages/DiscoverRailsPage/components/DiscoverRailsPageUI/components/DiscoveryRailSection/DiscoveryRailSection.tsx` — converted from stateless FC to a hooks-based component; added `railRef`, `canScrollLeft`/`canScrollRight` state, `updateScrollState` callback, `scroll` helper, `railWrapper` div with conditional `hasScrollLeft`/`hasScrollRight` classes, and two arrow `<button>` elements
- `packages/klurigo-web/src/pages/DiscoverRailsPage/components/DiscoverRailsPageUI/components/DiscoveryRailSection/DiscoveryRailSection.module.scss` — added `.railWrapper` (position: relative, `::before`/`::after` fade pseudo-elements, `.hasScrollLeft`/`.hasScrollRight` opacity transitions), `.arrowButton` (desktop-only, circular, hover-reveal via `.section:hover` descendant selector), `.arrowPrev`/`.arrowNext` positioning
- `packages/klurigo-web/src/pages/DiscoverRailsPage/components/DiscoverRailsPageUI/components/DiscoveryRailSection/DiscoveryRailSection.test.tsx` — added five new tests: arrow buttons rendered, correct aria-labels, prev/next `scrollBy` calls, and absence of scroll classes when layout is flat (jsdom)

### Remove inter-rail deduplication & filter MOST_PLAYED to played quizzes

**Problem:**
Two issues were identified in the discovery compute pipeline on small corpora (63 quizzes):

1. **TRENDING rail missing.** Hard-exclusive deduplication in `applyDedupePolicy` claimed the
   top-10 FEATURED entries before TRENDING was evaluated. Because quality score rewards total
   play count, the quizzes with the strongest trending signal (most recent plays) were
   simultaneously the highest-quality quizzes — and therefore claimed by FEATURED. With only
   63 quizzes this meant TRENDING was consistently empty.

2. **MOST_PLAYED surfaced unplayed quizzes.** `scoreMostPlayed` did not filter out quizzes
   where `gameplaySummary.count == 0`, so quizzes that had never been played appeared in the
   "Most Played" rail (score 0, sorted to the bottom but still present).

**Fix:**
- `applyDedupePolicy`: Removed all inter-rail deduplication. The `claimed` set, the
  `exclusiveKeys` / `softKeys` split, and the preview-size claim logic were deleted. The
  method now simply converts the scored sections map to an ordered `DiscoverySnapshotSection[]`
  with no filtering. Each rail independently surfaces its best candidates; a quiz appearing in
  both FEATURED and TRENDING is valid and expected.
- `scoreMostPlayed`: Added `.filter((e) => e.score > 0)` before `.slice()` — identical to the
  existing pattern in `scoreTrending`. Quizzes with zero plays are excluded from MOST_PLAYED.
- Removed the now-unused `DISCOVERY_RAIL_PREVIEW_SIZE` import from the compute service.
- Updated unit tests:
  - Replaced "exclusive dedupe" describe block (two tests) with "no inter-rail deduplication"
    (two tests asserting quizzes *can* appear in multiple rails simultaneously).
  - Replaced "soft dedupe overlap" describe block with a simplified version of the same idea.
  - Simplified "missing recent stats" and "trending stats influence" tests: removed the
    FEATURED-filler quizzes that were only needed to prevent the test quiz from being claimed
    by the old dedup policy.
  - Added "MOST_PLAYED filtering" describe block with a test that a quiz with 0 plays is
    excluded while a played quiz is included.

**Files changed:**
- `packages/klurigo-service/src/modules/discovery-api/services/discovery-compute.service.ts`
  — removed `DISCOVERY_RAIL_PREVIEW_SIZE` import; simplified `applyDedupePolicy`; added
  `.filter((e) => e.score > 0)` in `scoreMostPlayed`; updated JSDoc for `compute()` step 5
- `packages/klurigo-service/src/modules/discovery-api/services/discovery-compute.service.spec.ts`
  — replaced exclusive/soft-dedup tests with no-dedup tests; simplified missing-stats and
  trending-stats tests; added MOST_PLAYED filtering test (11 tests total, all passing)

### Add Question Media Density & Type Variety Sub-Scores to Quality Scoring

**Change:** Added two new sub-scores to `computeQualityScore` and redistributed
existing weights so the maximum total quality score remains **100 pts**.

**New sub-scores:**

- **Question media density** (`QUALITY_WEIGHT_QUESTION_MEDIA = 10`): Proportion of
  questions that have any associated media attachment (image, audio, or video).
  Formula: `(questionsWithMedia / totalQuestions) * 10`. A quiz where every question
  has media receives the full weight; a quiz with no question media receives 0.
  Any `MediaType` (Image, Audio, Video) qualifies — presence of the `media` field
  is sufficient.

- **Question type variety** (`QUALITY_WEIGHT_QUESTION_VARIETY = 10`): Proportion of
  distinct question types used across the quiz out of the total possible
  (`TOTAL_QUESTION_TYPES = 6`).
  Formula: `(uniqueTypeCount / 6) * 10`. A quiz using only one type (e.g. all
  MultiChoice) receives ~1.67 pts; a quiz using all six types receives 10 pts.

**Weight redistribution (total stays 100):**

| Sub-score              | Old weight | New weight |
|------------------------|------------|------------|
| Questions count        | 15         | 10 (−5)    |
| Play engagement        | 30         | 25 (−5)    |
| Unique players         | 15         | 10 (−5)    |
| Rating                 | 15         | 10 (−5)    |
| Question media density | —          | 10 (new)   |
| Question type variety  | —          | 10 (new)   |

The question count bucket values were also adjusted to fit the new weight ceiling:
10–14 → 4, 15–19 → 6, 20–29 → 8, 30+ → 10.

**Motivation:** Discovery rails should surface quizzes that are more engaging to
play. Quizzes where questions have associated media (images, audio clips, videos)
offer a richer experience than text-only quizzes. Similarly, quizzes that mix
question types (MultiChoice, Range, TrueFalse, TypeAnswer, Pin, Puzzle) keep
players more engaged than single-type quizzes. These signals are independent of
engagement or rating data and reward quiz creator effort at authoring time.

**New constants exported:**
- `QUALITY_WEIGHT_QUESTION_MEDIA = 10`
- `QUALITY_WEIGHT_QUESTION_VARIETY = 10`
- `TOTAL_QUESTION_TYPES = Object.keys(QuestionType).length` (evaluates to 6)

**Files changed:**
- `packages/klurigo-service/src/modules/quiz-core/utils/discovery/discovery-scoring.utils.ts` —
  added `QuestionType` import; added `QUALITY_WEIGHT_QUESTION_MEDIA`,
  `QUALITY_WEIGHT_QUESTION_VARIETY`, `TOTAL_QUESTION_TYPES` constants with JSDoc;
  reduced `QUALITY_WEIGHT_QUESTIONS` (15→10), `QUALITY_WEIGHT_PLAYS` (30→25),
  `QUALITY_WEIGHT_PLAYERS` (15→10), `QUALITY_WEIGHT_RATING` (15→10); updated question
  count bucket values; added sub-scores 7 and 8 to `computeQualityScore`; updated JSDoc
- `packages/klurigo-service/src/modules/quiz-core/utils/discovery/discovery-scoring.utils.spec.ts` —
  added `QuestionType`, `QUALITY_WEIGHT_QUESTION_MEDIA`, `QUALITY_WEIGHT_QUESTION_VARIETY`,
  `TOTAL_QUESTION_TYPES` imports; updated constant assertions for all changed weights;
  updated question count bucket expected values; updated "maximum possible score" fixture
  to use 30 questions (5 of each type, all with media); added "question media density
  sub-score" describe block (5 tests) and "question type variety sub-score" describe
  block (3 tests); restructured bucket boundary test to use a 1-question typed baseline
  so the variety sub-score does not leak into the question-count diff
