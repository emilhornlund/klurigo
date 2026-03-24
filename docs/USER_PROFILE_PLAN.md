# User Profile Feature Plan

## Overview

This plan describes the v1 implementation of a public user profile feature across the Klurigo monorepo. Any authenticated user with `Authority.User` can view another user's public profile and public quizzes. The profile includes basic account information plus public quiz, hosted game, and played game counts. The frontend adds dedicated profile and quizzes pages, a "My Profile" menu item, and profile links from supported nickname surfaces.

The feature touches three packages:

- **`@klurigo/common`** — shared DTO definitions used by backend transport classes
- **`@klurigo/klurigo-service`** — two new REST endpoints implemented in a dedicated `UserProfileApiModule`
- **`@klurigo/klurigo-web`** — two new pages, a new menu item, nickname-to-profile link updates, and quiz-response-to-card mapping

---

## Scope

### Shared (`@klurigo/common`)

- Add `PublicUserProfileResponseDto`
- Add `UserQuizzesPageFilterDto`
- `PublicUserProfileResponseDto.createdAt` MUST be `Date` to match existing repository conventions
- Shared DTOs are the source contracts for any new backend request/response classes introduced for this feature

### Backend

- `GET /api/users/{userId}/profile` — public user profile with `id`, `nickname`, `quizzesCount`, `hostedGamesCount`, `playedGamesCount`, and `createdAt`
- `GET /api/users/{userId}/quizzes` — paginated list of the user's public quizzes with v1 query params: `sort`, `order`, `limit`, and `offset`
- Both endpoints require `Authority.User`
- All new backend request/response classes for this feature MUST:
  - implement shared DTOs from `@klurigo/common`
  - use Swagger decorators such as `@ApiProperty`
  - include field-level documentation following existing repository conventions
- All controller methods for this feature MUST:
  - include Swagger operation and response documentation
  - follow the same documentation patterns used elsewhere in the repository
- `GET /api/users/{userId}/quizzes` MUST reuse the existing paginated quiz response classes in `packages/klurigo-service/src/modules/quiz-api/controllers/models/paginated-quiz.response.ts`
- Do NOT introduce a new paginated response structure for user quizzes

### Frontend

- New page: `/users/:userId/profile` — user profile with summary stats and a public quizzes rail
- New page: `/users/:userId/quizzes` — full paginated list of the user's public quizzes
- New menu item in `Page` — "My Profile" linking to the logged-in user's own profile
- Nickname linking — wherever both `userId` and `nickname` are present in the approved surfaces, render a link to the profile page
- The frontend MUST map backend quiz responses to `QuizDiscoveryCard` through a dedicated mapper/adapter
- Do NOT change the backend response shape to match `QuizDiscoveryCard`

---

## Contracts

### Shared DTOs

**`PublicUserProfileResponseDto`**
- `readonly id: string`
- `readonly nickname: string`
- `readonly quizzesCount: number`
- `readonly hostedGamesCount: number`
- `readonly playedGamesCount: number`
- `readonly createdAt: Date`

**`UserQuizzesPageFilterDto`**
- `readonly sort?: 'title' | 'created' | 'updated'`
- `readonly order?: 'asc' | 'desc'`
- `readonly limit: number`
- `readonly offset: number`

Defaults:
- `sort` defaults to `'title'`
- `order` defaults to `'asc'`

### Backend transport contract

- `PublicUserProfileResponse` MUST implement `PublicUserProfileResponseDto`
- `UserQuizzesPageFilter` MUST implement `UserQuizzesPageFilterDto`
- Any new backend request/response class added for this feature MUST implement its corresponding shared DTO from `@klurigo/common`
- All such classes MUST include Swagger decorators and field documentation

### Quizzes response contract

- `GET /api/users/{userId}/quizzes` MUST return the existing paginated quiz response contract already defined by `packages/klurigo-service/src/modules/quiz-api/controllers/models/paginated-quiz.response.ts`
- The user-quizzes endpoint is a filtered reuse of the existing quiz pagination contract
- No feature-specific paginated response DTO or response wrapper is introduced for this endpoint

### Frontend quiz card contract

- `UserProfilePage` and `UserQuizzesPage` MUST adapt the backend quiz response items into the `QuizDiscoveryCard` shape through a frontend mapper/adapter
- Backend contracts remain aligned with backend/shared DTO conventions, not with `QuizDiscoveryCard` props

---

## Implementation Tasks

Tasks are ordered linearly so each task can be completed once the previous one is finished.

---

### Task 1 — Add shared DTOs to `@klurigo/common` [DONE]

**Package:** `@klurigo/common`

Add and export the shared DTO definitions used by this feature.

Requirements:
- add `PublicUserProfileResponseDto`
- add `UserQuizzesPageFilterDto`
- set `PublicUserProfileResponseDto.createdAt` to `Date`
- follow existing DTO conventions in `packages/common/src/models/`: `readonly` fields, JSDoc on public properties, and consistent naming/export patterns
- model `UserQuizzesPageFilterDto.sort` and `UserQuizzesPageFilterDto.order` with the same allowed values and defaults as `PublicQuizPageFilter`:
  - `sort?: 'title' | 'created' | 'updated'` with default `'title'`
  - `order?: 'asc' | 'desc'` with default `'asc'`

**Affected files:**
- `packages/common/src/models/user.ts` (or a new profile DTO file)
- `packages/common/src/models/quiz.dto.ts`
- `packages/common/src/index.ts`

---

### Task 2 — Add public quiz and game count repository methods [DONE]

**Package:** `@klurigo/klurigo-service`

Add repository methods required by the profile endpoint:

- `QuizRepository.countPublicQuizzesByOwnerId(ownerId: string): Promise<number>`
- `GameResultRepository.countHostedGamesByUserId(userId: string): Promise<number>`
- `GameResultRepository.countPlayedGamesByUserId(userId: string): Promise<number>`

Use MongoDB `countDocuments` with the existing persisted fields:

- public quizzes: owner user id field already used by quiz ownership queries
- hosted games: `hostParticipantId === userId`
- played games: `players[].participantId === userId`

For this feature, the user `_id` is the participant id in game results.

**Affected files:**
- `packages/klurigo-service/src/modules/quiz-core/repositories/quiz.repository.ts`
- `packages/klurigo-service/src/modules/game-result/repositories/game-result.repository.ts`
- Any related module export file if required

---

### Task 3 — Add public profile aggregation service [DONE]

**Package:** `@klurigo/klurigo-service`

Create a dedicated `UserProfileService` inside a new `UserProfileApiModule`.

Add:
- `findPublicUserProfile(userId: string): Promise<PublicUserProfileResponseDto>`

Implementation should:
- load user via `UserService`
- fetch quiz counts via `QuizRepository`
- fetch game counts via `GameResultRepository`
- map the profile result to `PublicUserProfileResponseDto`

The `UserProfileApiModule` should import:
- `UserModule`
- `QuizCoreModule`
- `GameResultModule`

This module is responsible for cross-domain aggregation and avoids circular dependencies in `UserModule`.

---

### Task 4 — Add public user quizzes service method [DONE]

**Package:** `@klurigo/klurigo-service`

Add `findPublicQuizzesByUserId` to `UserProfileService` as a thin wrapper around the existing quiz paging/query logic.

Implementation should:
- query public quizzes for the requested user via quiz-core repository/query layer
- reuse existing pagination and sorting behavior already used by quiz API
- return the existing paginated quiz response contract used by quiz API
- avoid depending on `QuizApiModule` or `QuizService`

Requirements:
- restrict results to the requested user's quizzes
- hard-code `visibility` to `PUBLIC`
- support only `sort`, `order`, `limit`, and `offset`
- do not include search or additional filters in v1
- return the existing paginated quiz response contract used by quiz API
- do not create a new paginated response structure for this feature
- use the same sort/order surface as `PublicQuizPageFilter`
- allowed `sort` values: `title`, `created`, `updated`
- allowed `order` values: `asc`, `desc`
- default `sort` is `title`
- default `order` is `asc`

**Affected files:**
- `packages/klurigo-service/src/modules/user-profile-api/services/user-profile.service.ts`

---

### Task 5 — Create backend DTO classes for profile and quiz filters [DONE]

**Package:** `@klurigo/klurigo-service`

Create the backend transport classes required by the new endpoints.

Requirements:
- add `PublicUserProfileResponse` implementing `PublicUserProfileResponseDto`
- add `UserQuizzesPageFilter` implementing `UserQuizzesPageFilterDto`
- add Swagger decorators such as `@ApiProperty` and query-property decorators as appropriate
- add field-level Swagger documentation on every exposed property following existing repository conventions
- keep `createdAt` typed as `Date` in the shared DTO contract and document it appropriately in Swagger
- do not create a new paginated user-quizzes response class; reuse the existing paginated quiz response classes
- model `UserQuizzesPageFilter` sorting/ordering the same way as `PublicQuizPageFilter`
- use the same validation and Swagger shape for:
  - `sort?: 'title' | 'created' | 'updated'`
  - `order?: 'asc' | 'desc'`
- document the same defaults:
  - `sort: 'title'`
  - `order: 'asc'`

**Affected files:**
- `packages/klurigo-service/src/modules/user-profile-api/controllers/responses/public-user-profile.response.ts`
- `packages/klurigo-service/src/modules/user-profile-api/controllers/filters/user-quizzes-page.filter.ts`
- Relevant barrel files

---

### Task 6 — Create `PublicUserController` with full Swagger documentation [DONE]

**Package:** `@klurigo/klurigo-service`

Create and register the controller for both endpoints.

Controller requirements:
- create `PublicUserController` inside `UserProfileApiModule`
- register it in `UserProfileApiModule`
- apply `@RequiresScopes(TokenScope.User)`
- apply `@RequiredAuthorities(Authority.User)`
- `GET /api/users/:userId/profile` delegates to `userProfileService.findPublicUserProfile`
- `GET /api/users/:userId/quizzes` delegates to `userProfileService.findPublicQuizzesByUserId`
- add Swagger operation, param, query, success-response, and error-response documentation following existing controller patterns
- document the quizzes endpoint with the existing paginated quiz response classes from `paginated-quiz.response.ts`

**Affected files:**
- `packages/klurigo-service/src/modules/user-profile-api/controllers/public-user.controller.ts`
- `packages/klurigo-service/src/modules/user-profile-api/user-profile-api.module.ts`
- Relevant barrel files

---

### Task 7 — Add backend e2e coverage for the new endpoints

**Package:** `@klurigo/klurigo-service`

Create e2e tests for `PublicUserController` following the existing service test setup.

Coverage should include:
- profile success response with `id`, `nickname`, `quizzesCount`, `hostedGamesCount`, `playedGamesCount`, and `createdAt`
- quiz list success response with public quizzes only, using the existing paginated quiz response contract
- pagination behavior for `sort`, `order`, `limit`, and `offset`
- `404` for unknown users
- `401` without a token
- `403` when the token lacks `Authority.User`
- presence of the expected Swagger-wired DTO/controller behavior where covered by existing test patterns

**Affected files:**
- `packages/klurigo-service/src/modules/user-profile-api/controllers/public-user.controller.e2e-spec.ts`

---

### Task 8 — Add frontend API resource methods

**Package:** `@klurigo/klurigo-web`

Add API client methods for the new backend endpoints and expose them through `useKlurigoServiceClient`.

Methods:
- `getUserPublicProfile(userId: string)`
- `getUserPublicQuizzes(userId: string, options)` where `options` only includes `sort`, `order`, `limit`, and `offset`

Requirements:
- reuse the existing API resource and error-notification patterns
- keep the quizzes API contract aligned with the existing backend paginated quiz response shape

**Affected files:**
- `packages/klurigo-web/src/api/resources/user.resource.ts` (new or updated)
- `packages/klurigo-web/src/api/useKlurigoServiceClient.tsx`

---

### Task 9 — Implement the frontend quiz-response mapper

**Package:** `@klurigo/klurigo-web`

Create a dedicated mapper/adapter from the backend paginated quiz response items to the `QuizDiscoveryCard` input shape.

Requirements:
- map backend quiz response items to `QuizDiscoveryCard`
- reuse the mapper in both `UserProfilePage` and `UserQuizzesPage`
- do not change backend response contracts to fit the card component

**Affected files:**
- frontend page/component support files near the user profile/quizzes pages or existing quiz mapping utilities

---

### Task 10 — Add frontend routes for user profile pages

**Package:** `@klurigo/klurigo-web`

Add protected routes for:

- `/users/:userId/profile`
- `/users/:userId/quizzes`

Place them alongside the existing authenticated routes.

**Affected files:**
- `packages/klurigo-web/src/main.tsx`

---

### Task 11 — Implement `UserProfilePage`

**Package:** `@klurigo/klurigo-web`

Create the profile page and supporting UI.

Requirements:
- fetch the public profile by `userId`
- fetch the first page of public quizzes for the rail
- display `nickname`, `createdAt`, `quizzesCount`, `hostedGamesCount`, and `playedGamesCount`
- map quiz response items through the frontend quiz-response mapper before rendering `QuizDiscoveryCard`
- render a public quizzes rail with a "See all" link to `/users/:userId/quizzes`
- include loading, empty, and not-found/error states consistent with existing pages

**Affected files:**
- `packages/klurigo-web/src/pages/UserProfilePage/`
- `packages/klurigo-web/src/pages/index.ts`

---

### Task 12 — Implement `UserQuizzesPage`

**Package:** `@klurigo/klurigo-web`

Create the paginated quizzes page for a user.

Requirements:
- read `userId` from the route
- load public quizzes with the supported v1 query parameters
- use the existing paginated quiz response contract from the backend
- map quiz response items through the frontend quiz-response mapper before rendering `QuizDiscoveryCard`
- use the existing responsive pagination/infinite-offset patterns where appropriate
- render loading, empty, error, and load-more states consistent with discovery pages

**Affected files:**
- `packages/klurigo-web/src/pages/UserQuizzesPage/`
- `packages/klurigo-web/src/pages/index.ts`

---

### Task 13 — Add "My Profile" to the profile menu

**Package:** `@klurigo/klurigo-web`

Update `Page` so the logged-in user can navigate directly to `/users/{currentUserId}/profile` from the profile menu.

Add the item before the existing profile-related entries and use the current authenticated user's id from the existing frontend auth/user state.

**Affected files:**
- `packages/klurigo-web/src/components/Page/Page.tsx`

---

### Task 14 — Link supported nickname surfaces to profile pages

**Package:** `@klurigo/klurigo-web`

Add profile links where both `userId` and `nickname` are already available and navigation is appropriate.

Initial scope:
- `QuizDiscoveryCard` author name
- supported nickname surfaces in `GameResultsPage`

Do not add links in editable forms or active gameplay contexts.

**Affected files:**
- `packages/klurigo-web/src/components/QuizDiscoveryCard/QuizDiscoveryCard.tsx`
- relevant files under `packages/klurigo-web/src/pages/GameResultsPage/`

---

### Task 15 — Add frontend tests and run validation

**Package:** `@klurigo/klurigo-web` and repository root

Add focused frontend tests for the new pages/components, then run the standard validation commands for the touched packages and the repository.

Coverage should include:
- `UserProfilePage` loading, populated, empty, and not-found/error states
- display of `hostedGamesCount` and `playedGamesCount`
- successful mapping of backend quiz data to `QuizDiscoveryCard`
- `UserQuizzesPage` pagination behavior using `sort`, `order`, `limit`, and `offset`
- nickname link rendering in `QuizDiscoveryCard`

Validation commands:
- `yarn workspace @klurigo/klurigo-service test`
- `yarn workspace @klurigo/klurigo-web test`
- `yarn check-types`
- `yarn lint`

---

## Testing

### Backend

- Add e2e tests for `GET /api/users/:userId/profile` covering the full response shape: `id`, `nickname`, `quizzesCount`, `hostedGamesCount`, `playedGamesCount`, and `createdAt`
- Add e2e tests for `GET /api/users/:userId/quizzes` covering pagination with `sort`, `order`, `limit`, and `offset`
- Verify the quizzes endpoint returns only public quizzes authored by the requested user using the existing paginated quiz response contract
- Verify both endpoints require `Authority.User` and return `403` when that authority is missing
- Verify both endpoints return `401` without authentication and `404` for unknown users

### Frontend

- Add component/page tests for `UserProfilePage` covering loading, populated, empty rail, and not-found/error states
- Explicitly assert that profile stats render `hostedGamesCount` and `playedGamesCount`
- Add tests for `UserQuizzesPage` covering pagination behavior and supported query parameter usage (`sort`, `order`, `limit`, `offset`)
- Add tests that the frontend quiz-response mapper produces `QuizDiscoveryCard`-compatible data from backend quiz responses
- Add a test for `QuizDiscoveryCard` to confirm the author nickname renders as a profile link

### Run commands

```bash
# Backend e2e tests only
yarn workspace @klurigo/klurigo-service jest public-user.controller.e2e-spec.ts

# All backend tests
yarn workspace @klurigo/klurigo-service test

# Frontend tests
yarn workspace @klurigo/klurigo-web test

# All tests
yarn test

# Type check
yarn check-types
```

---

## Acceptance Criteria

- `GET /api/users/{userId}/profile` returns `200` with `{ id, nickname, quizzesCount, hostedGamesCount, playedGamesCount, createdAt }` for a valid authenticated request
- `createdAt` is defined in the shared DTO contract as `Date`
- `GET /api/users/{userId}/profile` and `GET /api/users/{userId}/quizzes` both require `Authority.User`
- `GET /api/users/{userId}/profile` returns `404` for an unknown `userId`
- `GET /api/users/{userId}/quizzes` returns a paginated list containing only public quizzes authored by the user
- `GET /api/users/{userId}/quizzes` reuses the existing paginated quiz response classes from `packages/klurigo-service/src/modules/quiz-api/controllers/models/paginated-quiz.response.ts`
- `GET /api/users/{userId}/quizzes` supports `sort: title | created | updated` and `order: asc | desc`, with defaults `sort=title` and `order=asc`
- No new paginated response structure is introduced for `GET /api/users/{userId}/quizzes`
- All new backend request/response classes for this feature implement shared DTOs from `@klurigo/common`
- All new backend request/response classes for this feature include Swagger decorators and field-level documentation following existing conventions
- All controller methods for this feature include Swagger operation and response documentation following existing repository patterns
- The frontend route `/users/:userId/profile` renders the user's nickname, join date, `quizzesCount`, `hostedGamesCount`, `playedGamesCount`, and a rail of public quizzes with a "See all" link
- The frontend route `/users/:userId/quizzes` renders the user's public quizzes with pagination/load-more behavior
- The frontend maps backend quiz response items to `QuizDiscoveryCard` through a dedicated mapper/adapter
- The backend response shape is not changed to match `QuizDiscoveryCard`
- The `Page` profile dropdown includes a "My Profile" item that navigates to the logged-in user's own profile page
- Quiz author nicknames in `QuizDiscoveryCard` link to the author's profile page
- Game result participant nicknames link to profile pages where a user id is available and navigation is appropriate
- Existing tests continue to pass, and `yarn check-types` plus `yarn lint` pass after implementation

---

## Risks / Notes

### Module boundaries and aggregation
Cross-domain aggregation is handled in `UserProfileApiModule` to avoid circular dependencies between `UserModule`, `QuizModule`, and `GameResultModule`.
This module composes data from multiple domains and should remain the only place where such aggregation occurs.

### Profile endpoint query cost
The profile endpoint performs one user lookup plus three aggregate counts. That is acceptable for v1. If this becomes hot-path traffic later, the counts can be parallelised or cached without changing the API contract.

### Nickname link scope
Nickname links are intentionally limited to surfaces where navigation is expected and safe. Keep active gameplay and editable form contexts out of scope for this feature.

### Authenticated-only access
These endpoints remain authenticated-only in v1. Public profiles are visible to authenticated users with `Authority.User`, not to anonymous sessions.

### Query parameter scope
The public user quizzes endpoint intentionally excludes search and additional filters in v1. If filtering is needed later, it should be added as a separate follow-up change rather than folded into this implementation.
