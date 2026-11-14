# Player Avatars: Small-Task Roadmap

> **Status:** Phases 0–9 and the default-Critter fix are complete. Remaining game integration,
> guest customization, and animation are required upcoming work, not optional extras.
> This is a plan; [feature documentation](../features/player-avatar-rendering.md)
> describes delivered behavior. Future phases below replace the previous large
> game-integration and optional-extension phases.

## Product Rules

- Keep Critters artwork in this repository and render locally. Reuse the existing
  editor, renderer, validation, and Klurigo components/tokens.
- Avatar appearance is not player identity. Preserve participant IDs, nickname
  uniqueness, capacity, scoring, and existing access rules.
- **Every player has an avatar**, including guests, anonymous players, and hosts.
  New game records contain complete metadata; legacy/missing/unsupported stored data
  displays the stable default Critter without rewriting historical records.
  Keep rollout fields additive/optional until their producers are updated;
  resolved display identities always supply an avatar. No forced backfill.
- **Account players:** load the joining account's saved avatar, or the default
  Critter if none is saved. The first accepted join stores a full, immutable copy
  on the game participant. Later profile edits affect future joins, not that game.
- **Guests:** propose a random valid avatar once when preparing a new join. Show
  it before joining and allow editing or explicit Randomize. Preserve the draft
  across reloads for the same game/participant; do not randomize on every render.
- **Account edits during joining:** commit only when Join is submitted. Save an
  edited design through the existing user-authenticated avatar API, await its
  acknowledgement, then join with exactly that metadata. An unchanged default
  does not need to become a saved account avatar. Guests never write user profiles.
- If profile saving fails, keep the draft and offer retry before joining. If the
  profile save succeeds but joining fails, explain that the account design was
  saved and retain it for retry. Do not pretend these two operations are atomic.
- After acceptance, retries, refreshes, and reconnects reuse that participant's
  snapshot. Late joiners receive their own first snapshot under the same rules.
  A duplicate join must not replace an avatar, randomize again, or duplicate a
  participant. Do not repeat acknowledged profile saves on join retry; a lost
  save acknowledgement may require an idempotent retry of the same metadata.
  Account changes require matching game
  authentication before a fresh join; identity never comes from a body `userId`.
- Persist snapshots into completed-game results. Lobby, player lists,
  leaderboards, podium, and results use game/result snapshots, not current profiles.
  Cover host and participant views and both game modes. Hosts remain outside
  player rankings unless existing rules already include them.
- **Animation is required:** support Off and Critters' speed choices, use a
  gentle default for new animation-enabled designs, and respect reduced motion.
  Preserve all selected parts/colors and the saved motion preference. Rendering
  static for reduced motion must not edit the saved design or send animation
  frames over SSE.
- Preserve the existing static v1 recipe and fixtures. Add a versioned motion
  recipe/configuration rather than silently changing saved v1 behavior. Store
  resolved choices, not SVG, random seeds, probabilities, or arbitrary CSS.

## Implementation Anchors

- Joining is currently two steps: game authentication, then nickname submission.
  See [game authentication](../../packages/klurigo-service/src/modules/game-authentication/services/game-authentication.service.ts),
  [join service](../../packages/klurigo-service/src/modules/game-api/services/game.service.ts),
  and [GameJoinPage](../../packages/klurigo-web/src/pages/GameJoinPage/GameJoinPage.tsx).
- Reuse the [shared avatar contract](../../packages/common/src/models/avatar.ts),
  `AvatarEditor`, `PlayerAvatar`, and the authenticated profile save operation.
  Game credentials alone must never authorize account-profile writes.
- Active identities live in [participant schemas](../../packages/klurigo-service/src/modules/game-core/repositories/models/schemas/participant.schema.ts);
  durable identities must also survive in [game results](../../packages/klurigo-service/src/modules/game-result/repositories/models/schemas/game-result.schema.ts).
- The local Critters definition supports `none`, `slowest`, `slow`, `medium`,
  `fast`, and `fastest`. The current renderer explicitly selects `none`.

## Small Phases

Each upcoming phase is one reviewable task touching a single boundary or surface.
Implement its dependencies first; do not bundle all remaining work into one change.
Animation phases 19–22 can progress independently of the game UI track; phase 23
connects motion settings to the completed join flows.
Every phase includes its own focused tests and applicable quality checks.

### Phase 0 — Local Rendering Foundation

**Status:** Complete · **Depends on:** None

- **Work:** Repository-owned artwork, deterministic v1 renderer, catalogs, and fixtures.
- **Done when:** Local rendering and visual/browser compatibility are verified.

### Phase 1 — Account Editor And Persistence

**Status:** Complete · **Depends on:** 0

- **Work:** Account settings editor, validated metadata API, and exact persistence.
- **Done when:** Local/Google accounts can save and reopen their designs exactly.

### Phase 2 — Profile And Navigation Display

**Status:** Complete · **Depends on:** 1

- **Work:** Authenticated profile/navigation avatars, state refresh, and default Critter.
- **Done when:** Saved and missing-avatar accounts display consistently after saves.

### Phase 3 — Game Avatar Contracts

**Status:** Complete · **Depends on:** 2

- **Work:** Define shared join/snapshot metadata, validation, and legacy resolution.
- **Done when:** Contracts support accounts and guests, reject invalid choices, and resolve missing data to a valid avatar. Keep old join callers compatible.
- **Verified:** 146 common tests and 19 join-request tests pass; common/service types,
  lint, and builds pass. Complete nested metadata is validated, nickname-only requests
  remain valid, and legacy resolution copies a stable default without writes.

### Phase 4 — Player Join Snapshots

**Status:** Complete · **Depends on:** 3

- **Work:** Persist the exact chosen avatar on first accepted player join. Resolve account defaults from trusted identity and assign missing guest avatars once.
- **Done when:** Account/guest joins, concurrent retries, and late joins preserve one snapshot; duplicate joins never replace it or regenerate randomness.
- **Verified:** 60 focused service/helper unit tests and 20 real HTTP join tests pass,
  including concurrent account/default/guest/chosen/late joins, rejected metadata,
  persistence, and profile-edit/retry stability. Common/service/web types and lint,
  common/service builds, and shared/editor randomization tests pass.

### Phase 5 — Host Snapshots

**Status:** Complete · **Depends on:** 3

- **Work:** Snapshot host identity when the host participant is created, including account, anonymous, and no-saved-avatar cases supported by existing flows.
- **Done when:** Hosts have a stable avatar without changing ownership, roles, or scoring.
- **Verified:** All 9 game-creation HTTP tests pass, including exact saved/default
  host persistence and stability after profile edits; service types, lint, and build
  pass. Existing creation requires an account; no anonymous host-creation flow is
  introduced. Legacy host identities use the shared stable resolver on read.

### Phase 6 — Game Identity REST Responses

**Status:** Complete · **Depends on:** 4, 5

- **Work:** Expose resolved snapshots in existing game/participant-list responses.
- **Done when:** Every returned identity has an avatar, including legacy records, with existing authorization and private-field exclusions preserved.
- **Verified:** All 100 game HTTP tests and 48 service unit tests pass; common/service
  lint and builds and service/web types pass. Host-only player lists resolve snapshots;
  game details expose only the caller's accepted identity. Legacy reads do not backfill,
  and profile changes do not affect returned snapshots.

### Phase 7 — Lobby And Self-Identity Events

**Status:** Complete · **Depends on:** 6

- **Work:** Carry host/player avatars through lobby and current-participant SSE payloads and their initial/reconnect snapshots.
- **Done when:** New connections and reconnects receive identical accepted identities without fresh profile lookups or rerandomization.
- **Verified:** 365 event unit tests and 3 real MongoDB/Redis stream tests pass.
  Initial, live, and reconnect lobby payloads retain host/player snapshots after
  profile edits; legacy reads stay non-persisting. Self snapshots cover every
  identity-bearing task in both modes. Common/service lint, service/web types,
  and service build pass.

### Phase 8 — Ranking And Podium Events

**Status:** Complete · **Depends on:** 7

- **Work:** Add participant snapshots to existing leaderboard, question-result ranking, and podium payloads/recovery mappings.
- **Done when:** Host and participant streams retain avatar identity through ranking transitions and recovery without changing score visibility or ranking rules.
- **Verified:** All 1,646 service unit tests pass. Five real MongoDB/Redis stream tests
  cover lobby, question results, leaderboard, and podium initial/live/recovery payloads,
  both modes and viewer roles, guest/account snapshots, and profile-edit isolation.
  Task snapshots survive removed participants. Service types/lint/build, common lint,
  and web types pass.

### Phase 9 — Join Preview And Defaults

**Status:** Complete · **Depends on:** 4, 6

- **Work:** Preview the saved/default account avatar or one random guest draft on the join page and submit complete metadata. Scope drafts to game and participant.
- **Done when:** The preview matches the accepted snapshot; reloads/retries retain it, and existing members resume instead of creating a new design.
- **Verified:** 43 focused web tests and two real account/guest Playwright flows pass,
  including preview/request/persisted-metadata equality, reloads, failed joins, and
  accepted-member resume. Types, lint, and production build pass. Chrome inspection
  covered 1440px, 768px, 390px, and 320px, reduced motion, guest joining, and saved
  account previews. Removed the redundant hero icon and moved the login prompt below
  the form to keep joining prominent. Final console/network checks were clean.

### Phase 10 — Guest Join Editor

**Status:** Planned · **Depends on:** 9

- **Work:** Reuse the avatar editor for guest/anonymous join drafts, including explicit Randomize and discard behavior.
- **Done when:** Guests can edit before joining without an account, profile writes, or draft leakage between games/participants.

### Phase 11 — Account Join Editor And Save

**Status:** Planned · **Depends on:** 9

- **Work:** Reuse the editor for account join drafts; save edited metadata through user scope before submitting the game join, then refresh account state.
- **Done when:** The join snapshot and acknowledged account design match; the next join starts with that design. Cancel, save/join failures, retries, and account switches follow the product rules.

### Phase 12 — Durable Result Snapshots

**Status:** Planned · **Depends on:** 4, 5

- **Work:** Preserve host/player snapshots in existing result storage/conversion and result API responses, reusing embedded game identity where appropriate.
- **Done when:** Account and guest avatars survive active-game cleanup and later profile edits; old results use stable defaults.

### Phase 13 — Host Lobby Display

**Status:** Planned · **Depends on:** 7

- **Work:** Display snapshot avatars in the host lobby's existing host/player identity surfaces.
- **Done when:** Account and guest players remain visually consistent through joining, leaving, and reconnecting on desktop/mobile layouts.

### Phase 14 — Participant Lobby Display

**Status:** Planned · **Depends on:** 7

- **Work:** Display snapshot avatars in participant lobby/self-identity surfaces.
- **Done when:** Participants see the same identities as the host, with usable small-size and fallback rendering.

### Phase 15 — Gameplay Player Lists

**Status:** Planned · **Depends on:** 6, 7

- **Work:** Add avatars beside existing in-game player identities/lists outside the lobby, in host and participant views.
- **Done when:** Lists retain snapshot identity through updates and reconnects without introducing new player/score visibility.

### Phase 16 — Leaderboard Display

**Status:** Planned · **Depends on:** 8

- **Work:** Extend the existing leaderboard presentation for snapshot avatars in host and participant views.
- **Done when:** Rank changes, ties, long names, and both game modes remain correct and readable with avatars.

### Phase 17 — Podium Display

**Status:** Planned · **Depends on:** 8

- **Work:** Add snapshot avatars to existing podium presentations for both viewer roles.
- **Done when:** Winners, fewer-than-three-player games, fallbacks, and reconnects render correctly without changing placement rules.

### Phase 18 — Game Results Display

**Status:** Planned · **Depends on:** 12

- **Work:** Display host/player snapshot avatars on applicable host and participant results/history views under existing access rules.
- **Done when:** Guests and account players keep their game-time appearance after reload, cleanup, and subsequent account-avatar edits.

### Phase 19 — Local Animation Proof

**Status:** Planned · **Depends on:** 0

- **Work:** Verify the local Critters motion variants in image-isolated SVGs, select a gentle default, and define the motion-capable recipe/version boundary.
- **Done when:** Actual browser inspection confirms animation, static/reduced-motion rendering, and acceptable multi-avatar performance without remote resources.

### Phase 20 — Versioned Motion Metadata

**Status:** Planned · **Depends on:** 19

- **Work:** Add explicit motion choices to a new supported configuration/recipe version and extend validation, storage, and already-delivered profile/game/result contracts.
- **Done when:** Static v1 remains readable and unchanged; motion metadata round-trips exactly. Readers/writers are compatible before the UI emits the new version.

### Phase 21 — Motion-Aware Rendering

**Status:** Planned · **Depends on:** 20

- **Work:** Dispatch supported static/animated recipes in `PlayerAvatar`, with an explicit static option and reduced-motion handling for every display surface.
- **Done when:** Saved identity is unchanged across animation frames, reduced motion is static without changing preferences, and many avatars remain usable.

### Phase 22 — Animation Editor Controls

**Status:** Planned · **Depends on:** 1, 21

- **Work:** Add Off/speed choices to the shared editor and persist supported motion settings through account settings.
- **Done when:** Profile previews, saves, and reloads retain the motion preference; old v1 designs upgrade only through an explicit edit/save.

### Phase 23 — Join Animation Preferences

**Status:** Planned · **Depends on:** 10, 11, 22

- **Work:** Apply the gentle motion default to new guest drafts, load account motion preferences, and carry edited motion through profile saving and game snapshots.
- **Done when:** Guests can select motion, account join edits retain it for next time, and accepted motion settings survive retries/reconnects without changing existing snapshots.

## Quality Gate For Every Upcoming Phase

- Test accounts, guests, default/random avatars, invalid metadata, and applicable
  retry/account-switch/legacy cases. Compare complete configurations, not just images.
- For game transport/storage changes, verify live events, initial SSE recovery,
  late joining, completed results, and snapshot stability after profile edits.
- Follow existing architecture and styles; reuse components and use mobile,
  tablet, and desktop helpers with the corresponding tokens.
- Run relevant tests, lint, types, and builds. Inspect changed UI with Chrome
  DevTools at all breakpoints, including constrained layouts and reduced motion.
- Use isolated test databases/ports, preserve development data, and stop temporary
  verification servers. Mark only the implemented and verified phase complete.

## Separate Backlog

Avatar deletion/reset, multiple saved designs, uploads/downloads, additional
artwork styles, and guest-to-account draft transfer are not prerequisites for
the required game, guest-editor, or animation tracks above.
