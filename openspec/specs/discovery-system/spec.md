# Discovery System Specification

## Purpose

Provides algorithmically curated discovery rails for users to browse and find quizzes on the Klurigo platform. Generates and maintains pre-computed snapshots of top quizzes across multiple curation strategies, enabling fast read performance for browsing experiences.

The system computes discovery snapshots on a scheduled basis using BullMQ jobs, storing snapshot data separately from live quiz documents to enable efficient retrieval without expensive runtime aggregations.

## Requirements

### Requirement: Discovery Rails

The system MUST provide multiple distinct discovery rails with different curation algorithms.

#### Scenario: Featured rail

- GIVEN the system computes discovery snapshot
- WHEN the FEATURED rail is populated
- THEN the system selects hand-picked or highest-quality quizzes
- AND places them prominently at top of discovery page
- AND maintains stable ordering across refreshes when possible

#### Scenario: Trending rail

- GIVEN the system populates TRENDING rail
- WHEN computation runs
- THEN the system ranks quizzes by recent-play activity within rolling time window
- AND includes metrics like plays in last 24/48 hours

#### Scenario: Top rated rail

- GIVEN the system computes TOP_RATED rail
- WHEN snapshot is generated
- THEN the system ranks by Bayesian-adjusted average star rating
- AND includes only quizzes with sufficient rating count for statistical validity

#### Scenario: Most played rail

- GIVEN the system populates MOST_PLAYED rail
- WHEN computation runs
- THEN the system ranks by cumulative play count across all time
- AND shows most widely-played quizzes first

#### Scenario: New and noteworthy rail

- GIVEN the system generates NEW_AND_NOTEWORTHY rail
- WHEN snapshot is computed
- THEN the system identifies recently published quizzes that passed quality bar
- AND includes new content with early positive signals

#### Scenario: Category spotlight rail

- GIVEN the system computes CATEGORY_SPOTLIGHT rail
- WHEN snapshot generation runs
- THEN the system rotates spotlight to different quiz category each period
- AND surfaces best quizzes in current spotlighted category

### Requirement: Discovery Response Structure

The system MUST return discovery data in standardized response format.

#### Scenario: Full discovery page request

- GIVEN a client requests complete discovery page
- WHEN the request includes no pagination parameters
- THEN the system returns ordered array of discovery sections
- AND includes generatedAt timestamp indicating when snapshot was computed
- AND each section contains key identifier and ordered quiz cards

#### Scenario: Single rail request

- GIVEN a user requests "see all" view of specific rail
- WHEN the request includes rail key and pagination parameters
- THEN the system returns paginated results for that rail only
- AND includes snapshotTotal (not database total) for page calculation

### Requirement: Quiz Card Data

The system MUST include lightweight quiz representations in discovery responses.

#### Scenario: Required fields

- GIVEN a quiz card is included in discovery response
- WHEN the card is rendered in UI
- THEN the card includes id, title, description, imageCoverURL, category, languageCode
- AND includes mode and numberOfQuestions for filtering

#### Scenario: Aggregated stats

- GIVEN a quiz card includes gameplaySummary
- WHEN displayed to user
- THEN the summary shows count (games played), totalPlayerCount, difficultyPercentage
- AND may include lastPlayed timestamp if available

#### Scenario: Rating info

- GIVEN a quiz card includes ratingSummary
- WHEN displayed to user
- THEN the summary shows stars average and total rating count
- AND comments field indicates how many ratings included written feedback

### Requirement: Pagination Support

The system MUST support offset-based pagination for discovery rails.

#### Scenario: Page request with limit/offset

- GIVEN a client requests specific page of rail results
- WHEN the request includes limit (items per page) and offset (skip count)
- THEN the system returns appropriate subset of quiz cards
- AND includes snapshotTotal, limit, offset in response metadata

#### Scenario: Boundary conditions

- GIVEN pagination request exceeds available data
- WHEN offset is beyond snapshotTotal
- THEN the system returns empty array or partial results
- AND does not error on out-of-range values

### Requirement: Snapshot Computation

The system MUST compute discovery snapshots on scheduled basis.

#### Scenario: Scheduled computation

- GIVEN the discovery scheduler job runs at configured interval
- WHEN execution begins
- THEN the system queries database for all eligible quizzes
- AND computes ranking scores per rail algorithm
- AND stores snapshot in Redis with TTL or permanent storage

#### Scenario: Seed on initialization

- GIVEN a fresh deployment with DISCOVERY_SEED_ON_INIT enabled
- WHEN the application starts
- THEN the system immediately runs initial snapshot computation
- AND populates discovery rails before first user request

### Requirement: Snapshot Data Storage

The system MUST store computed discovery snapshots for efficient retrieval.

#### Scenario: Redis storage

- GIVEN snapshot computation completes
- WHEN data is persisted
- THEN the system stores snapshots in Redis with structured keys per rail
- AND uses appropriate TTL based on configuration (permanent or temporary)

#### Scenario: Snapshot format

- GIVEN a snapshot for single rail
- WHEN stored
- THEN the snapshot includes ordered array of quiz IDs and computed scores
- AND may include cached full quiz data or pointers to main database

### Requirement: Discovery API Endpoints

The system MUST expose RESTful endpoints for discovery consumption.

#### Scenario: Get all discovery sections

- GIVEN a client makes GET request to /discovery endpoint
- WHEN the request includes authentication (optional)
- THEN the system returns complete discovery response with all rails
- AND includes generatedAt timestamp and ordered sections array

#### Scenario: Get single rail page

- GIVEN a client makes GET request to /discovery/:key endpoint
- WHEN the request includes pagination parameters
- THEN the system returns paginated results for that specific rail
- AND includes metadata for pagination UI (snapshotTotal, limit, offset)

### Requirement: Cache Invalidation

The system MUST handle cache invalidation when quizzes change.

#### Scenario: Quiz rating update

- GIVEN a quiz receives new star rating from user
- WHEN the rating is persisted
- THEN the system may trigger re-computation of relevant snapshot(s)
- OR marks snapshot as stale for next scheduled recomputation

#### Scenario: Quiz publish status change

- GIVEN a quiz visibility changes from private to public (or vice versa)
- WHEN the change is processed
- THEN the system updates discovery snapshots accordingly
- AND adds/removes quiz from appropriate rails on next computation
