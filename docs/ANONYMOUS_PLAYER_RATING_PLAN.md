# Anonymous Player Rating & Player Game Over State

## Problem Statement

When a game completes, player participants are currently redirected either to
`/game/results/:gameID` (authenticated users) or `/` (everyone else). This
means:

1. **Anonymous players** see nothing after the game ends — they are sent
   straight to the home page.
2. **Logged-in players** skip any player-focused summary and land directly on
   the full results page.
3. **No player can rate the quiz** from the game context — only from the
   results page, which requires a User-scoped token.

This plan introduces a dedicated **PlayerGameOverState** rendered inside
`GamePage` and adds **game-scoped quiz rating** so both anonymous and
authenticated players can rate the quiz they just played.

---

## Proposed Approach

### High-Level Flow

```
Last question result task is completed
  → Backend creates Podium task (pending)
  → Host receives GamePodiumHost event (existing behavior)
  → Players receive new GameOverPlayer event
  → GamePage renders PlayerGameOverState from that event
  → No route change and no revoke happen here
  → Player sees final rank, score, behind info, rating UI, confetti
  → Player can create/update rating with PUT /games/:gameID/ratings
  → Player chooses:
      - Back to Home → revoke game token → /
      - View Full Results (logged-in only) → revoke game token → /game/results/:gameID
  → Host clicks "Game Results"
  → Backend marks game as completed but keeps podium as current task
  → SSE remains subscribable for completed games
  → Host receives GameQuitEvent because the game is completed
  → Players continue to receive GameOverPlayerEvent while reopening/reconnecting
```

**Key design decisions:**

- The player game-over experience stays inside `GamePage` as a normal game
  state — no new route is needed.
- `Podium` becomes the durable final task — no quit task is created on
  completion.
- `GameOverPlayerEvent` is the terminal player-facing event. It carries all
  data the game-over UI needs, so no read endpoints are required.
- `GameQuitEvent` is still used for the host completion flow, unchanged.
- Only one new endpoint: `PUT /games/:gameID/ratings`.

---

## Backend Changes

### 1. Keep SSE Subscriptions Alive for Completed Games [DONE]

**File:** `packages/klurigo-service/src/modules/game-event/services/game-event.subscriber.ts`

**Current behavior:** The `subscribe` method calls `findGameByIDOrThrow` which
defaults to `active = true`, meaning completed games throw a 404. This blocks
both host quit delivery and player reconnect after the game ends.

**Required change:** The `findGameByIDOrThrow` call in `subscribe` (around
line 277) must also accept completed games. The method already has an
`active: boolean = true` parameter — pass `false` to allow both active and
completed games.

**Why this matters:**

- After the host clicks "Game Results" on the podium, the game transitions to
  `GameStatus.Completed`. The host SSE stream needs to stay open to deliver
  the `GameQuitEvent` that triggers the host redirect.
- If a player refreshes or reconnects while the game is completed (and still
  on the podium task), the SSE stream must reopen and deliver the
  `GameOverPlayerEvent` again.

**Additional enrichment needed:** The `subscribe` method must also look up
quiz metadata (title, ID) and the participant's existing rating for the quiz,
so this data can be included in the `GameOverPlayerEvent` payload. This likely
means injecting `QuizRepository` and `QuizRatingRepository` into the
subscriber's constructor and performing these lookups when building podium
events. See §13 for what data the event needs.

**Tip:** Look at how the subscriber currently builds event metadata for other
task types. The enrichment should follow the same pattern — fetch extra data,
attach it to the metadata object that gets passed to the event builder utils.

---

### 2. Add New `GameOverPlayer` Event Type [DONE]

**Files:**

- `packages/common/src/models/game-event-type.enum.ts`
- `packages/common/src/models/game-event.ts`

Add a new value to the `GameEventType` enum:

```typescript
GameOverPlayer = 'GAME_OVER_PLAYER'
```

Place it between `GamePodiumHost` and `GameQuitEvent` to maintain logical
ordering (podium → game over → quit).

Also update `game-event.ts` (see §3 for the event type definition) and ensure
all new types are exported from both `packages/common/src/models/index.ts` and
`packages/common/src/index.ts`.

---

### 3. Define `GameOverPlayerEvent` [DONE]

**File:** `packages/common/src/models/game-event.ts`

This event must carry **everything** the player game-over UI needs so that no
read endpoints are required on mount. Define the following types and add
`GameOverPlayerEvent` to the `GameEvent` union:

```typescript
type GameOverPlayerEventBehind = {
  readonly points: number
  readonly nickname: string
}

type GameOverPlayerEventRating = {
  readonly canRateQuiz: boolean
  readonly stars?: number
  readonly comment?: string
}

type GameOverPlayerEvent = {
  type: GameEventType.GameOverPlayer
  game: {
    id: string
    mode: GameMode
  }
  quiz: {
    id: string
    title: string
  }
  player: {
    nickname: string
    rank: number
    totalPlayers: number
    score: number
    currentStreak: number
    comebackRankGain: number
    behind: GameOverPlayerEventBehind | null
  }
  rating: GameOverPlayerEventRating
}
```

**Field explanations:**

- `game.id` / `game.mode` — needed for the rating API call and for the
  "View Full Results" redirect URL.
- `quiz.id` / `quiz.title` — displayed as the quiz name on the game-over
  screen; quiz ID needed for rating context.
- `player.rank` / `totalPlayers` — "Rank X out of Y players".
- `player.score` — final score displayed prominently.
- `player.currentStreak` / `comebackRankGain` — used for celebration level
  calculation (same logic as `PlayerResultState`).
- `player.behind` — the player directly ahead: their nickname and the point
  gap. `null` when the player is rank 1. This mirrors how `PlayerResultState`
  shows behind info — look at `PointsBehindIndicator` for the UI pattern.
- `rating.canRateQuiz` — `false` if the player is the quiz owner (logged-in
  users who own the quiz should not rate their own content).
- `rating.stars` / `rating.comment` — pre-populated from an existing rating
  if one exists, so the UI shows the current state on mount.

**Follow existing patterns:** Look at how other event types in `game-event.ts`
are defined (e.g., `GameResultPlayerEvent`). Use the same readonly style and
naming conventions.

---

### 4. Emit `GameOverPlayerEvent` During Podium Task [DONE]

**File:** `packages/klurigo-service/src/modules/game-event/utils/game-player-event.utils.ts`

**Current behavior (lines 70–83):** The podium task type is currently grouped
together with `QuestionResult` and `Leaderboard` in the player event builder
switch, and returns `buildGameResultPlayerEvent`. This means players on the
podium just see another result screen.

**Required change:** Extract the `TaskType.Podium` case into its own block.
When the current task is podium, return `buildGameOverPlayerEvent(...)` instead
of `buildGameResultPlayerEvent(...)`.

**New builder function:** Create a new utility file
`packages/klurigo-service/src/modules/game-event/utils/game-over-event.utils.ts`
with a `buildGameOverPlayerEvent` function. This function receives the game
document, the player participant, and enriched metadata (quiz info + existing
rating) and assembles the `GameOverPlayerEvent`. See §13 for the full metadata
enrichment that supplies the rating fields.

Export the new builder from
`packages/klurigo-service/src/modules/game-event/utils/index.ts`.

**Tip:** Reference `buildGameResultPlayerEvent` in
`game-result-event.utils.ts` for how player stats are currently extracted.
Also reference `buildGamePodiumHostEvent` in `game-podium-event.utils.ts`
for the podium-specific data access patterns.

---

### 5. Keep Podium as Current Task When Host Completes the Game [DONE]

**File:** `packages/klurigo-service/src/modules/game-task/services/game-task-transition.service.ts`

**Current behavior (lines 256–270):** `podiumTaskCompletedCallback` does
three things:
1. Pushes the podium task into `previousTasks`.
2. Sets `currentTask = buildQuitTask()`.
3. Marks `status = GameStatus.Completed` and `completedAt = new Date()`.

**Required change:** Remove steps 1 and 2. The podium task must remain as
`currentTask` after the game is marked completed. Only update:

- `gameDocument.status = GameStatus.Completed`
- `gameDocument.completedAt = new Date()`

**Why this is critical:**

- If podium stays as the current task, reconnecting players will re-enter the
  podium code path in the event builder → receive `GameOverPlayerEvent`.
- If podium stays as the current task, the host event builder checks
  `game.status === Completed` on a podium task → returns `GameQuitEvent` for
  the host (see §6).
- No special "suppress quit for players" logic is needed because no quit task
  exists.

**Tip:** The `buildQuitTask()` import and `task-quit.utils.ts` are no longer
used in this callback after the change. Check if they're used elsewhere before
removing unused imports.

---

### 6. Host Quit Event Logic Should Consider Completed Status [DONE]

**File:** `packages/klurigo-service/src/modules/game-event/utils/game-host-event.utils.ts`

**Current behavior (lines 90–103):** The host event builder for podium only
handles the active podium state, returning `GamePodiumHostEvent`. The quit
check (`isQuitTask(game)`) is in a separate branch.

**Required change:** In the podium case for host events, add a check for
`game.status === GameStatus.Completed`. When the game is completed (even
though the current task is still podium), return `buildGameQuitEvent(game.status)`
for the host.

The logic should be:

- Host + podium task + game is `Active` → return `GamePodiumHostEvent`
  (existing behavior).
- Host + podium task + game is `Completed` → return `GameQuitEvent` with
  completed status (triggers the existing host redirect to results page).

**For players:** The player event builder (§4) always returns
`GameOverPlayerEvent` when on the podium task, regardless of game status. This
means players see game-over whether the game is active (just reached podium)
or completed (host already clicked results).

**Keep the existing `isQuitTask` fallback** for backward compatibility with
any games that were already mid-transition when this deploys, or for
non-podium quit scenarios.

---

### 7. Add `QuizRatingAuthorType` Enum to Common Package [DONE]

**Files:**

- `packages/common/src/models/quiz-rating-author-type.enum.ts` (new)
- `packages/common/src/models/index.ts` (modify)
- `packages/common/src/index.ts` (modify)

**Dependency:** None. This is a pure common-package addition.

**Why this must come before §8:** The author subdocument schemas in
`quiz-rating-author.schema.ts` import `QuizRatingAuthorType` from
`@klurigo/common`. The service package cannot build until this enum is in
place. Similarly, the service and subscriber code in §9 and §13 reference this
type.

Create the enum file:

```typescript
export enum QuizRatingAuthorType {
  User = 'USER',
  Anonymous = 'ANONYMOUS',
}
```

Export from `models/index.ts` and `packages/common/src/index.ts`.

---

### 8. Quiz Rating Schema — Author Subdocuments and Updated Rating Schema [DONE]

**Files:**

- `packages/klurigo-service/src/modules/quiz-core/repositories/models/schemas/quiz-rating-author.schema.ts` (new)
- `packages/klurigo-service/src/modules/quiz-core/repositories/models/schemas/quiz-rating.schema.ts` (modify)
- `packages/klurigo-service/src/modules/quiz-core/repositories/models/schemas/index.ts` (modify)

**Dependency:** §7 (`QuizRatingAuthorType` enum must exist in `@klurigo/common`).

The current schema stores `author` as a required `User` reference:

```typescript
@Prop({ type: String, ref: 'User', required: true, index: true })
author: User
```

This only supports logged-in users. To support anonymous players, the author
field is replaced with a **discriminated subdocument** — the same pattern
used throughout the codebase for participants (`ParticipantBase` →
`ParticipantHost` | `ParticipantPlayer`), tasks, and questions.

#### Author Subdocument Schemas

**File:** `packages/klurigo-service/src/modules/quiz-core/repositories/models/schemas/quiz-rating-author.schema.ts`

Define three schema classes following the discriminator pattern used by
`ParticipantBase`/`ParticipantHost`/`ParticipantPlayer` in the codebase:

1. **`QuizRatingAuthorBase`** — Base schema with
   `@Schema({ _id: false, discriminatorKey: 'type' })`. Single `type` prop
   using `QuizRatingAuthorType` enum. This serves as the discriminator root.

2. **`QuizRatingUserAuthor`** — For logged-in users.
   `@Schema({ _id: false })`. Contains only a `user` prop as a `String` ref
   to `'User'`. The `type` field is declared but not decorated (the
   discriminator handles it). Nickname is NOT stored — it is always resolved
   at query time from `User.defaultNickname` via populate. If the user
   changes their display name, all their ratings reflect it immediately.

3. **`QuizRatingAnonymousAuthor`** — For anonymous game participants.
   `@Schema({ _id: false })`. Contains `participantId` (the game session
   participant UUID) and `nickname` (captured at rating time from the game
   participant data). The nickname must be stored because there is no User
   document to resolve from.

Create schemas with `SchemaFactory.createForClass` and export a union type:

```typescript
export type QuizRatingAuthor =
  | (QuizRatingAuthorBase & QuizRatingUserAuthor)
  | (QuizRatingAuthorBase & QuizRatingAnonymousAuthor)
```

**Tip:** Look at `participant.schema.ts` for the exact discriminator setup
pattern — the structure is identical.

#### Updated QuizRating Schema

In `quiz-rating.schema.ts`, replace the flat `author: User` prop with a
`QuizRatingAuthorBase` subdocument prop. Register the discriminators on the
`author` path after creating the schema, just like participant discriminators
are registered.

Export the new schema file from `schemas/index.ts`.

#### Indexes

Replace the existing `author` index with partial unique indexes that enforce
one-rating-per-author-per-quiz for each type independently:

- `{ quizId: 1, 'author.user': 1 }` — unique, partial filter on
  `author.type === 'USER'`. Ensures one rating per logged-in user per quiz.
- `{ quizId: 1, 'author.participantId': 1 }` — unique, partial filter on
  `author.type === 'ANONYMOUS'`. Ensures one rating per anonymous participant
  per quiz.
- Keep existing `{ quizId: 1, created: -1 }` for chronological listing.
- `{ 'author.user': 1, created: -1 }` for user profile rating queries.

#### Why This Design

- **Two distinct author types** — each with exactly the fields it needs.
  No compromise fields, no nullables, no confusing shared columns.
- **User authors** store only a `User` ref. Nickname is always resolved live
  from `User.defaultNickname` — no stale data.
- **Anonymous authors** store `participantId` and `nickname`. Nickname must be
  stored because there is no User document to resolve from.
- **Partial unique indexes** enforce one-rating-per-author-per-quiz for each
  type independently without cross-type collisions.
- **Follows existing codebase patterns** — identical discriminator approach
  used for participants, tasks, questions, and user auth providers.

---

### 9. Update Repository, Service, and DTO Mapping [DONE]

**Dependency:** §8 (author schema classes and `QuizRatingAuthor` type must
exist before repository and service signatures can be updated).

#### Repository Changes

**File:** `packages/klurigo-service/src/modules/quiz-core/repositories/quiz-rating.repository.ts`

The current repository has `findQuizRatingByAuthor(quizId, author: User)`.
This must be split into two type-specific lookup methods:

- **`findQuizRatingByUserAuthor(quizId, userId)`** — queries
  `{ quizId, 'author.type': 'USER', 'author.user': userId }`.
- **`findQuizRatingByAnonymousAuthor(quizId, participantId)`** — queries
  `{ quizId, 'author.type': 'ANONYMOUS', 'author.participantId': participantId }`.

Update `createQuizRating` to accept `QuizRatingAuthor` (the discriminated
subdocument) instead of a flat `User` reference.

Update any `populate` calls that currently populate `author` (as a flat User
ref) to instead populate `author.user` — only relevant when the author type is
`USER`.

**Tip:** Search for all usages of `findQuizRatingByAuthor` across the codebase
to find every call site that needs updating. There are usages in the rating
service and the game result service.

#### Service Changes

**File:** `packages/klurigo-service/src/modules/quiz-rating-api/services/quiz-rating.service.ts`

The `createOrUpdateQuizRating` method currently receives a `User` object.
Change it to receive a `QuizRatingAuthor` subdocument instead. The service
must:

1. Route to the correct repository lookup based on `author.type`:
   - `QuizRatingAuthorType.User` → `findQuizRatingByUserAuthor`
   - `QuizRatingAuthorType.Anonymous` → `findQuizRatingByAnonymousAuthor`
2. Pass the author subdocument to `createQuizRating` for new ratings.
3. Leave update logic (which modifies stars/comment/updated) mostly unchanged.

The `@MurLock` concurrency control should remain. Verify the lock key
generation still works with the new author structure.

#### DTO Mapping

The external DTO shape `QuizRatingAuthorDto = { id, nickname }` remains
**unchanged** — consumers do not need to know whether the author was logged in
or anonymous.

Add a `toQuizRatingAuthorDto` mapping that switches on `author.type`:

- **User author:** `{ id: author.user._id, nickname: author.user.defaultNickname }`
  (nickname resolved at query time from the populated User).
- **Anonymous author:** `{ id: author.participantId, nickname: author.nickname }`
  (nickname stored at rating time).

---

### 10. Adapt Profile Rating Endpoint [DONE]

**File:** `packages/klurigo-service/src/modules/quiz-rating-api/controllers/profile-quiz-rating.controller.ts`

**Dependency:** §9 (`createOrUpdateQuizRating` now accepts `QuizRatingAuthor`
instead of a flat `User`).

`PUT /profile/quizzes/:quizId/ratings` remains unchanged from a product
perspective. Internally, it must now wrap the `User` object in a
`QuizRatingUserAuthor` subdocument before calling the updated service method.

This is a small adapter change — build
`{ type: QuizRatingAuthorType.User, user: authenticatedUser }` and pass it to
`createOrUpdateQuizRating`.

---

### 11. Update Game Result Service [DONE]

**File:** `packages/klurigo-service/src/modules/game-result/services/game-result.service.ts`

**Dependency:** §9 (`findQuizRatingByAuthor` is removed; the type-specific
methods must be used instead).

This service looks up ratings for display on the game results page. It
currently calls `findQuizRatingByAuthor(quizId, user)`. Update this to call
the new `findQuizRatingByUserAuthor(quizId, userId)` method.

This is a straightforward call-site update — the game results page is only
accessible to logged-in users, so it always deals with user-authored ratings.

---

### 12. MongoDB Migrator Update [DONE]

**Files:**

- `tools/mongodb-migrator/src/transformers/quiz-rating.transformers.ts`
- `tools/mongodb-migrator/src/utils/collection.utils.ts`

**Dependency:** §8 (must understand the new discriminated author shape before
writing the transformer).

#### Transformer

All existing ratings are user-authored. The migration transformer must convert
the flat `author` field to the new discriminated subdocument:

```
Before: { author: 'user-id-string', ... }
After:  { author: { type: 'USER', user: 'user-id-string' }, ... }
```

The transformer should be idempotent: if `author` is already an object with a
`type` field, skip the transformation (in case the migration runs twice).

**Tip:** Look at how other transformers in
`tools/mongodb-migrator/src/transformers/` handle document-level
transformations. The pattern is straightforward — map over documents and
restructure the field.

#### Index Updates

In `collection.utils.ts`, the `quiz_ratings` collection indexes must be
updated to reflect the new nested author structure:

- Remove the old `{ author: 1 }` index.
- Add the four new indexes from §8 (the two partial unique indexes, the
  chronological listing index, and the user profile query index).

---

### 13. Enrich Rating Metadata in Subscriber [DONE]

**Files:**

- `packages/klurigo-service/src/modules/game-event/services/game-event.subscriber.ts`
- `packages/klurigo-service/src/modules/game-event/models/game-event-metadata.interface.ts`

**Dependency:** §9 (the subscriber must call `findQuizRatingByUserAuthor` and
`findQuizRatingByAnonymousAuthor`, which are introduced in §9; those methods
cannot be called until the repository is updated).

The existing `buildGameOverPlayerEvent` implementation already builds the event
from game document data plus enriched metadata. At this stage, the missing work
is not the builder itself, but the **subscriber-side enrichment** for the
rating-related metadata that the builder expects.

**Required change:** Extend the metadata enrichment process in the subscriber so
that the metadata passed into `buildGameOverPlayerEvent(...)` includes the
rating-related fields needed for the final player game-over event.

**The enrichment added here must provide:**

| Metadata field        | Purpose                                                       |
|-----------------------|---------------------------------------------------------------|
| `podiumCanRateQuiz`   | Whether the participant is allowed to rate the quiz           |
| `podiumRatingStars`   | Existing rating stars, if the participant has already rated   |
| `podiumRatingComment` | Existing rating comment, if the participant has already rated |

**Scope clarification:** This task only adds the missing metadata enrichment.
Do not rework `buildGameOverPlayerEvent` logic that is already implemented.
Do not move calculations into the subscriber that already belong to the event
builder.

#### Required repository lookups

The subscriber must perform the lookups needed to enrich the podium player
event before calling `buildGameOverPlayerEvent(...)`.

This likely requires injecting:

- `QuizRepository`
- `QuizRatingRepository`

into the subscriber constructor.

These lookups should only be performed when building metadata for podium player
events that will produce `GameOverPlayerEvent`.

#### Quiz ownership lookup

The subscriber must load the quiz using `QuizRepository` so it can determine
whether the current logged-in participant is the quiz owner.

This ownership data is only needed to determine `podiumCanRateQuiz`.

#### Existing rating lookup

The subscriber must also check whether the current participant has already
rated the quiz.

This lookup uses the type-specific methods introduced in §9:

- **Logged-in player:** call `findQuizRatingByUserAuthor(quizId, userId)`
- **Anonymous player:** call `findQuizRatingByAnonymousAuthor(quizId, participantId)`

If a rating exists, enrich metadata with `podiumRatingStars` and
`podiumRatingComment`. If no rating exists, both values should remain absent.

#### Rating eligibility rules

After loading the quiz owner, the subscriber must determine
`podiumCanRateQuiz` using these rules:

- **Anonymous players:** always `true`
- **Logged-in players:** `true` unless the participant `userId` matches the
  quiz owner

This matches the same owner restriction used by the quiz rating flow.

#### Metadata model

The `GameEventMetaData` interface in `game-event-metadata.interface.ts`
already declares `podiumCanRateQuiz`, `podiumRatingStars`, and
`podiumRatingComment`. No model changes are needed — only the subscriber must
be updated to populate these fields.

#### Subscriber responsibilities

The subscriber enrichment flow must:

1. Resolve the current participant
2. Load the quiz using `QuizRepository`
3. Determine whether the participant can rate the quiz
4. Look up any existing rating using the correct `QuizRatingRepository`
   method for the participant type
5. Attach `podiumCanRateQuiz`, `podiumRatingStars`, and `podiumRatingComment`
   to the metadata object
6. Pass that enriched metadata into the existing player event builder flow

The repositories used for these lookups must remain in the subscriber layer,
not in `buildGameOverPlayerEvent(...)`.

---

### 14. Game Rating Service [DONE]

**Dependency:** §9 (updated service signature — `createOrUpdateQuizRating`
accepts the discriminated `QuizRatingAuthor` union).

Create a new service in the `game-api` module that bridges the game context
with the existing `QuizRatingService`. All game-specific resolution logic
(participant → user lookup, author construction, ownership validation) lives
here so neither the controller (§15) nor `QuizRatingService` need to change.

#### Export `QuizRatingService`

**File:** `packages/klurigo-service/src/modules/quiz-rating-api/quiz-rating-api.module.ts` (modify)

`QuizRatingService` is currently not exported. Add it to the module's
`exports` array so the `game-api` module can import and use it:

```ts
exports: [QuizRatingService],
```

#### Service

**File:** `packages/klurigo-service/src/modules/game-api/services/game-rating.service.ts` (new)

Create `GameRatingService` with a single public method:

```ts
public async createOrUpdateRating(
  gameId: string,
  participantId: string,
  stars: number,
  comment?: string,
): Promise<QuizRatingDto>
```

**Injected dependencies** (all already available in `game-api` module):

- `GameRepository` — via `GameCoreModule`.
- `QuizRepository` — via `QuizCoreModule`.
- `UserRepository` — via `UserModule`.
- `QuizRatingService` — via `QuizRatingApiModule` (after the export above).

**Method logic:**

1. Load the game via `GameRepository.findGameByIDOrThrow(gameId, false)`.
2. Resolve the quiz via `QuizRepository.findQuizByIdOrThrow(game.quiz._id)`.
3. Attempt to find a `User` document by `participantId` via
   `UserRepository.findUserById(participantId)`. This is how the system
   determines logged-in vs anonymous — a game token's `sub` claim equals
   the `userId` for authenticated players or a random UUID for anonymous
   ones. There is no `userId` field on the token itself.
4. Determine the author type and validate ownership:
   - If a `User` is found (logged-in player):
     - Verify the user is **not** the quiz owner
       (`String(quiz.owner._id) !== participantId`). Throw
       `ForbiddenException` if they are — quiz owners must not rate their
       own quiz.
     - Build a `QuizRatingUserAuthorWithBase` with the resolved `User`.
   - If no `User` is found (anonymous player):
     - Find the player's nickname from `game.participants` (match on
       `participantId`).
     - Build a `QuizRatingAnonymousAuthorWithBase` with `participantId`
       and the nickname.
5. Delegate to `QuizRatingService.createOrUpdateQuizRating(quizId, author,
   stars, comment)` and return the result.

This pattern mirrors the resolution logic already used by
`enrichPodiumPlayerMetaData` in the game-event subscriber (§13).

**Tip:** Keep this service focused on bridging game context to rating context.
All rating persistence, locking, and summary updates remain in
`QuizRatingService`.

#### Module Registration

**File:** `packages/klurigo-service/src/modules/game-api/game-api.module.ts` (modify)

1. Add `QuizRatingApiModule` to the `imports` array (provides
   `QuizRatingService`).
2. Add `GameRatingService` to the `providers` array.
3. Export the barrel: add `GameRatingService` to
   `packages/klurigo-service/src/modules/game-api/services/index.ts`.

All other required modules (`GameCoreModule`, `QuizCoreModule`, `UserModule`)
are already imported.

---

### 15. Game-Scoped Rating Endpoint [DONE]

**Route:** `PUT /games/:gameID/ratings`

**Dependency:** §14 (`GameRatingService` must exist) and §13 (subscriber
enrichment must be in place so players already have their existing rating data
on the game-over screen before they might submit an update via this endpoint).

This is the only new game-scoped endpoint needed. The
`GET /games/:gameID/player-stats` and `GET /games/:gameID/ratings/me`
endpoints that were in earlier plan iterations have been removed — the
`GameOverPlayerEvent` payload covers all read data.

#### Controller

**File:** `packages/klurigo-service/src/modules/game-api/controllers/game-rating.controller.ts` (new)

Create a new controller in the `game-api` module alongside the existing
`GameController`, `GameSettingsController`, etc.

**Class-level decorators** (game-scoped API surface):

- `@ApiBearerAuth()`
- `@ApiTags('game')`
- `@RequiresScopes(TokenScope.Game)` — restricts to game-scoped JWTs only.
- `@RequiredAuthorities(Authority.Game)` — requires game authority.
- `@Controller('games/:gameID')` — route prefix.

**Single method — `PUT /ratings`:**

- `@Put('/ratings')`
- `@AuthorizedGame(GameParticipantType.PLAYER)` — ensures only players (not
  hosts) can call this, and validates that the game token's `gameId` matches
  the route's `:gameID`.
- `@HttpCode(HttpStatus.OK)`
- Swagger decorators (`@ApiOperation`, `@ApiOkResponse`, etc.) following
  the patterns on the existing rating controllers.

**Method parameters:**

- `@RouteGameIdParam() gameId: string` — extracts and UUID-validates the
  game ID from the route.
- `@PrincipalId() participantId: string` — extracts the `sub` claim from
  the game token (this is the participantId, not a userId).
- `@Body() request: CreateQuizRatingRequest` — the validated request body
  (implements `CreateQuizRatingDto`; contains `stars` and optional
  `comment`). Import from
  `packages/klurigo-service/src/modules/quiz-rating-api/controllers/models/create-quiz-rating.request.ts`.

**Return type:** `Promise<QuizRatingResponse>` (implements `QuizRatingDto`).
Import from
`packages/klurigo-service/src/modules/quiz-rating-api/controllers/models/quiz-rating.response.ts`.

**Body:** Delegates entirely to the game-api service:

```ts
return this.gameRatingService.createOrUpdateRating(
  gameId,
  participantId,
  request.stars,
  request.comment,
)
```

The controller is intentionally thin — all authorization checks beyond "is a
player in this game" are handled by `GameRatingService`.

**Tip:** Follow the same decorator and parameter patterns used by
`GameController` for the game-scoped decorators, and
`ProfileQuizRatingController` for the rating-specific Swagger annotations.

#### Guard

No new guard is needed. The existing `@AuthorizedGame(GameParticipantType.PLAYER)`
decorator applies `GameAuthGuard`, which already:

- Verifies the game token's `gameId` matches the route's `:gameID`.
- Verifies the participant type is `PLAYER` (not `HOST`).

The remaining authorization check — "participant is not the quiz owner" —
requires a database lookup (resolve `participantId` → `User` → compare with
`quiz.owner._id`) and is delegated to `GameRatingService` as described in §14.
This keeps guard logic simple and avoids duplicating the user-resolution
pattern.

#### Module Registration

**File:** `packages/klurigo-service/src/modules/game-api/game-api.module.ts` (modify)

1. Add `GameRatingController` to the `controllers` array.
2. Export the barrel: add `GameRatingController` to
   `packages/klurigo-service/src/modules/game-api/controllers/index.ts`.

`GameRatingService` was already registered as a provider in §14.

---

## Frontend Changes

### 1. Add Rating Write API Function [DONE]

**File:** `packages/klurigo-web/src/api/resources/game.resource.ts`

Add a `createOrUpdateGameRating` function that sends a `PUT` request to
`/games/<gameId>/ratings` with a `CreateQuizRatingDto` body and returns a
`QuizRatingDto`.

**Tip:** Follow the existing pattern in `game.resource.ts` — all functions use
`deps.apiPut` / `deps.apiPost` with `deps.notifyError` callbacks. Match that
style exactly.

---

### 2. Add `PlayerGameOverState` Component [DONE]

**Depends on:** Task 1 (rating API function).

**Location:** `packages/klurigo-web/src/states/PlayerGameOverState/`

```
PlayerGameOverState/
├── PlayerGameOverState.tsx
├── PlayerGameOverState.module.scss
├── PlayerGameOverState.test.tsx
├── RatingCard.tsx
├── RatingCard.test.tsx
└── index.ts
```

This is a new in-game state component rendered by `GamePage`, similar to the
existing `PlayerResultState` and other state components in `src/states/`.

**Props:** The component receives the full `GameOverPlayerEvent` as its
`event` prop.

**Rendering:** The component renders entirely from the `GameOverPlayerEvent`
payload — no API calls on mount. The event is the source of truth for all
displayed data: rank, score, behind info, streak, comeback, quiz title/id,
existing rating, and `canRateQuiz`.

**Behavior:**

- Displays final rank (as a `Badge`), score, behind info with the next
  player's nickname and point difference (using `PointsBehindIndicator` from
  `src/states/common`), quiz title, and a rank-based header message.
- Shows confetti on mount with intensity based on rank. Reference the
  celebration logic in `PlayerResultState` — it uses rank thresholds (e.g.,
  rank 1 = epic, rank 2–3 = major, rank 4–10 = normal, rank > 10 = none).
- Shows a local `RatingCard` (see below) pre-populated with the existing
  rating data from the event payload (`stars`, `comment`, `canRateQuiz`).
- On star/comment change, calls `createOrUpdateGameRating` (from Task 1) to
  persist the rating via `PUT /games/:gameID/ratings`.
- Shows "Back to Home" button always, and "View Full Results" button only for
  logged-in users (check `isUserAuthenticated` from the auth context).

**Exit flow:**

When the player clicks **"Back to Home":**

- Call `revokeGame({ redirectTo: '/' })`.
- This revokes the game-scoped JWT (best-effort), navigates to `/`, and
  clears local auth state.

When the player clicks **"View Full Results"** (logged-in only):

- Call `revokeGame({ redirectTo: '/game/results/<gameID>' })`.
- This revokes the game token, navigates to the results page (which requires
  `TokenScope.User`), and clears game auth state.
- The user's User-scoped token remains valid, so the results page loads
  normally.

**Important:** Revoke only happens when the player explicitly exits. While the
player is on the game-over screen, the game token remains active — enabling
the rating API call and SSE reconnection.

**Tip:** The `revokeGame` function is available from the auth context. Look at
how the existing quit handling in `GamePage` uses it — the same patterns apply.

#### `RatingCard` — Local Sub-Component

A new `RatingCard` component is created inside the `PlayerGameOverState/`
directory. It is **not** shared with `GameResultsPage` — the existing
`RatingCard` in `SummarySection/` remains untouched.

**Why not relocate the existing one?** The existing `RatingCard` in
`SummarySection` has deep styling dependencies on `SummarySection.module.scss`
(it uses the shared `.card` base class alongside five other card variants).
Extracting it cleanly would require either duplicating the base styles or
introducing a fragile shared dependency. Since `RatingCard` is a simple
presentational component (~60 lines of JSX, zero internal state, zero hooks),
creating a fresh version with its own styles is simpler and lower-risk.

**Props:** Same interface as the existing `RatingCard` — `canRateQuiz`,
`stars?`, `comment?`, `onRatingChange`, `onCommentChange`.

**Behavior:** Identical to the existing `RatingCard` — renders a "Rate this
quiz" title, five interactive star buttons, an optional comment textarea (shown
after selecting a rating), and a disabled message when `canRateQuiz` is false.

**Styling:** The new `RatingCard` styles live in
`PlayerGameOverState.module.scss` (or a dedicated `RatingCard.module.scss` if
preferred). Reference the existing rating styles in
`SummarySection.module.scss` for visual consistency (star sizing, colors, hover
states, responsive breakpoints), but adapt the container styling to fit the
game-over layout rather than the card grid layout of the results page.

**Styling:** Reference `PlayerResultState.module.scss` for tone, responsive
patterns, and score display. Use SCSS modules (`.module.scss`).

**Design / UX:**

| Section      | Content                                                                       |
|--------------|-------------------------------------------------------------------------------|
| **Header**   | Rank-based celebration message (e.g., "🏆 You won!", "Game Over!")            |
| **Subtitle** | Quiz title                                                                    |
| **Confetti** | Triggered on mount; intensity based on final rank                             |
| **Rank**     | `Badge` component showing rank number + "out of X players" text               |
| **Score**    | Prominently displayed final score                                             |
| **Behind**   | `PointsBehindIndicator` showing points/nickname of the player directly ahead  |
| **Rating**   | Local `RatingCard`, pre-populated from event payload                          |
| **Actions**  | "Back to Home" always visible; "View Full Results" for logged-in players only |

**Tip:** Look at `PlayerResultState.tsx` closely — the celebration level
calculation, `Badge` usage, `PointsBehindIndicator`, and overall layout are
all directly reusable patterns. The game-over state is essentially a
"terminal" version of the result state with an added rating card and exit
buttons.

---

### 3. Integrate `PlayerGameOverState` into `GamePage`

**Depends on:** Task 2 (`PlayerGameOverState` component).

**File:** `packages/klurigo-web/src/pages/GamePage/GamePage.tsx`

No new route is needed. The player game-over experience is rendered as another
state inside `GamePage`, just like all other state components. The
`GameContextProvider` and auth state remain active — the player is still
"in the game" while viewing the game-over screen. This avoids all issues with
route guards, SSE cleanup, and context provider availability.

**Rendering switch (lines 212–242):**

- Import `PlayerGameOverState` from `../../states/PlayerGameOverState`.
- Add a `case GameEventType.GameOverPlayer:` that returns
  `<PlayerGameOverState event={eventToRender} />`.
- Place the case between `GamePodiumHost` and the default, following the
  existing ordering convention.

**Navigation blocker (lines 158–168):**

Add `GameEventType.GameOverPlayer` to the allowed event types array alongside
`GamePodiumHost` and `GameQuitEvent`, so that when a player on the game-over
screen clicks "Back to Home" or "View Full Results", the programmatic
navigation triggered by `revokeGame` is not blocked.

**Quit handling — no changes needed:**

The existing `GameQuitEvent` `useEffect` (lines 171–183) continues to work
as-is. It handles host-initiated redirects and premature game exits. In the
new flow, players receive `GameOverPlayerEvent` on the podium — they never see
`GameQuitEvent` during the normal completion flow.

---

## Testing Plan

### Backend Tests

| Area                            | Type             | Key Scenarios                                                                        |
|---------------------------------|------------------|--------------------------------------------------------------------------------------|
| SSE subscribe behavior          | Unit/Integration | Completed games can still subscribe successfully                                     |
| `GameOverPlayerEvent` builder   | Unit             | Produces correct rank, score, behind (with nickname), rating snapshot for all cases  |
| Podium event dispatch           | Unit             | Active podium: host gets `GamePodiumHostEvent`, player gets `GameOverPlayerEvent`    |
| Completed podium event dispatch | Unit             | Completed podium: host gets `GameQuitEvent`, player still gets `GameOverPlayerEvent` |
| Podium completion callback      | Unit             | Marks game completed, keeps podium as current task, does NOT create quit task        |
| Quiz rating author schema       | Unit             | User vs Anonymous author discriminators serialize/deserialize correctly              |
| Quiz rating repository          | Unit             | `findByUserAuthor` and `findByAnonymousAuthor` return correct results                |
| Quiz rating service             | Unit             | createOrUpdate works for both author types, routes to correct lookup                 |
| Game-scoped rating endpoint     | Unit/Integration | create/update for anonymous players, create/update for logged-in players             |
| Game rating guard               | Unit             | Rejects hosts, rejects quiz owners, allows valid players, allows anonymous players   |
| Profile rating endpoint         | Regression       | Still creates/updates user-authored ratings correctly with new subdocument           |
| Game result service             | Regression       | Rating lookup works with new `findQuizRatingByUserAuthor` method                     |
| Migration transformer           | Unit             | flat `author: 'user-id'` becomes `{ type: 'USER', user: 'user-id' }`                 |
| DTO mapping                     | Unit             | User author maps to `{ id: userId, nickname: defaultNickname }`                      |
| DTO mapping                     | Unit             | Anonymous author maps to `{ id: participantId, nickname: storedNickname }`           |

### Frontend Tests

| Area                   | Type      | Key Scenarios                                                                     |
|------------------------|-----------|-----------------------------------------------------------------------------------|
| `GamePage` rendering   | Component | `GameOverPlayerEvent` renders `PlayerGameOverState`                               |
| `GamePage` blocker     | Component | Navigation is allowed when event type is `GameOverPlayer`                         |
| `PlayerGameOverState`  | Component | Renders rank badge, score, behind info (nickname + points), quiz title from event |
| Celebration logic      | Component | Confetti intensity: rank 1=epic, rank 2-3=major, rank 4-10=normal, rank >10=none  |
| Header messages        | Component | Rank-based messages display correctly                                             |
| Rating display         | Component | `RatingCard` receives correct initial stars/comment/canRateQuiz from event        |
| Rating disabled        | Component | `canRateQuiz=false` disables rating UI (quiz owner scenario)                      |
| Rating submit          | Component | Star change triggers `PUT /games/:gameID/ratings`, updates local state            |
| Exit - home            | Component | "Back to Home" calls `revokeGame({ redirectTo: '/' })`                            |
| Exit - results         | Component | "View Full Results" calls `revokeGame({ redirectTo: '/game/results/...' })`       |
| Exit - auth visibility | Component | "View Full Results" only visible when `isUserAuthenticated` is true               |
| `RatingCard`           | Component | Renders stars, comment textarea, disabled state; delegates callbacks to parent    |
| Reconnect behavior     | Component | Reopening a completed podium game renders `PlayerGameOverState` again             |

### Common Package Tests

| Area                        | Type | Key Scenarios                                                   |
|-----------------------------|------|-----------------------------------------------------------------|
| `GameOverPlayerEvent` types | Unit | Type definitions compile correctly, event shape is valid        |
| `QuizRatingAuthorType` enum | Unit | Enum values (`USER`, `ANONYMOUS`) are exported and stable       |
| `GameEventType` enum        | Unit | `GameOverPlayer` value is present and correctly placed in union |

---

## File Change Summary

### New Files

| File                                                                                                      | Description                            |
|-----------------------------------------------------------------------------------------------------------|----------------------------------------|
| `packages/common/src/models/quiz-rating-author-type.enum.ts`                                              | Author type enum                       |
| `packages/klurigo-service/src/modules/quiz-core/repositories/models/schemas/quiz-rating-author.schema.ts` | Author discriminator schemas           |
| `packages/klurigo-service/src/modules/game-event/utils/game-over-event.utils.ts`                          | `GameOverPlayerEvent` builder function |
| `packages/klurigo-service/src/modules/game-event/utils/game-over-event.utils.spec.ts`                     | Builder tests                          |
| `packages/klurigo-service/src/modules/game-api/controllers/game-rating.controller.ts`                     | Game-scoped rating endpoint            |
| `packages/klurigo-service/src/modules/game-api/controllers/game-rating.controller.spec.ts`                | Endpoint tests                         |
| `packages/klurigo-service/src/modules/game-api/guards/game-quiz-rating.guard.ts`                          | Rating authorization guard             |
| `packages/klurigo-service/src/modules/game-api/guards/game-quiz-rating.guard.spec.ts`                     | Guard tests                            |
| `packages/klurigo-web/src/states/PlayerGameOverState/PlayerGameOverState.tsx`                             | New player game-over state component   |
| `packages/klurigo-web/src/states/PlayerGameOverState/PlayerGameOverState.module.scss`                     | Styles                                 |
| `packages/klurigo-web/src/states/PlayerGameOverState/PlayerGameOverState.test.tsx`                        | Tests                                  |
| `packages/klurigo-web/src/states/PlayerGameOverState/RatingCard.tsx`                                      | Local rating card sub-component        |
| `packages/klurigo-web/src/states/PlayerGameOverState/RatingCard.test.tsx`                                 | Rating card tests                      |
| `packages/klurigo-web/src/states/PlayerGameOverState/index.ts`                                            | Barrel export                          |

### Modified Files

| File                                                                                                 | Change                                                                      |
|------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------|
| `packages/common/src/models/game-event-type.enum.ts`                                                 | Add `GameOverPlayer`                                                        |
| `packages/common/src/models/game-event.ts`                                                           | Add `GameOverPlayerEvent` and sub-types, update `GameEvent` union           |
| `packages/common/src/models/index.ts`                                                                | Export new types, enum, and author type                                     |
| `packages/common/src/index.ts`                                                                       | Export new types and enum                                                   |
| `packages/klurigo-service/src/modules/game-event/services/game-event.subscriber.ts`                  | Allow subscriptions for completed games, enrich podium metadata             |
| `packages/klurigo-service/src/modules/game-event/utils/game-player-event.utils.ts`                   | Extract podium case, route to `buildGameOverPlayerEvent`                    |
| `packages/klurigo-service/src/modules/game-event/utils/game-host-event.utils.ts`                     | Add completed-status check for host quit in podium block                    |
| `packages/klurigo-service/src/modules/game-event/utils/index.ts`                                     | Export new builder                                                          |
| `packages/klurigo-service/src/modules/game-event/models/game-event-metadata.interface.ts`            | Already has `podiumCanRateQuiz`, `podiumRatingStars`, `podiumRatingComment` |
| `packages/klurigo-service/src/modules/game-task/services/game-task-transition.service.ts`            | Keep podium as current task when marking game completed                     |
| `packages/klurigo-service/src/modules/quiz-core/repositories/models/schemas/quiz-rating.schema.ts`   | Replace flat author with discriminated subdocument                          |
| `packages/klurigo-service/src/modules/quiz-core/repositories/quiz-rating.repository.ts`              | Split author lookup into type-specific methods, update create and populate  |
| `packages/klurigo-service/src/modules/quiz-rating-api/services/quiz-rating.service.ts`               | Accept `QuizRatingAuthor`, route lookups by type, update DTO mapping        |
| `packages/klurigo-service/src/modules/quiz-rating-api/controllers/profile-quiz-rating.controller.ts` | Build `QuizRatingUserAuthor` subdocument before calling service             |
| `packages/klurigo-service/src/modules/game-result/services/game-result.service.ts`                   | Update rating lookup to `findQuizRatingByUserAuthor`                        |
| `packages/klurigo-service/src/modules/game-api/game-api.module.ts`                                   | Register new controller, guard, and service imports                         |
| `tools/mongodb-migrator/src/transformers/quiz-rating.transformers.ts`                                | Migrate flat author to discriminated author subdocument                     |
| `tools/mongodb-migrator/src/utils/collection.utils.ts`                                               | Update rating indexes for nested author structure                           |
| `packages/klurigo-web/src/pages/GamePage/GamePage.tsx`                                               | Add `GameOverPlayer` case to rendering switch and navigation blocker        |
| `packages/klurigo-web/src/api/resources/game.resource.ts`                                            | Add `createOrUpdateGameRating` function                                     |

