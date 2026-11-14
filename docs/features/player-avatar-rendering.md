# Player Avatar Rendering Foundation

Phase 0 supplies a local, deterministic Critters renderer, a shared component
catalog/configuration, and an isolated Storybook proof. Phase 1 adds the account
editor and persistence. Phase 2 adds authenticated profile and navigation display.
Game placement remains a later milestone in the
[avatar roadmap](../plans/player-avatars.md).

Phase 3 defines `GameAvatarSnapshot` and optional `JoinGameRequestDto.avatar`.
Nickname-only clients remain compatible. Supplied designs require complete validated
metadata; null, invalid choices, unsupported versions, and extra nested fields are
rejected. `resolveGameAvatarSnapshot` copies supported metadata or the stable default,
excluding persistence internals without modifying the source record. Participant
snapshots are persisted by Phase 4 on the first accepted player join under the
existing game lock. Supplied designs are copied exactly; older account callers
load their signed principal's saved/default design, and older guest callers get
one resolved random design. Retries preserve the original snapshot and do not
look up profiles or randomize again. Joining never writes a user profile. Legacy
participants remain untouched. Display/event integration follows in later phases.

## Source And Ownership

- [`avatar.ts`](../../packages/common/src/models/avatar.ts) exports
  `CrittersAvatarConfigurationV1`, `CRITTERS_V1_PARTS`, and `CRITTERS_V1_COLORS`
  through `@klurigo/common`. There is no rendering dependency in common.
- [`critters/v1/`](../../packages/klurigo-web/src/assets/avatars/critters/v1/)
  contains the byte-exact Critters definition from `@dicebear/styles@10.6.0`,
  provenance, its CC0 license, and the MIT renderer license.
- [`critters-v1.ts`](../../packages/klurigo-web/src/utils/avatar/critters-v1.ts)
  renders the local JSON using the pinned `@dicebear/core@10.6.0` dependency.
  Vite bundles the definition and renderer; no avatar resource is fetched at
  runtime. Metadata URLs are informational.
- [`critters-v1.fixtures.ts`](../../packages/klurigo-web/src/utils/avatar/critters-v1.fixtures.ts)
  provides four reference designs used by the proof and regression snapshots.

## Rendering Contract

The configuration contains `version: 1`, `style: 'critters'`,
`artworkVersion: 'v1'`, explicit body/eye/mouth choices, required-nullable
top/pattern/cheek choices, and body/accent/background colors. Body and accent
must differ. Preserve the complete configuration, including unused colors.

The adapter expects an already valid configuration. The avatar API validates the
complete configuration and rejects unknown fields; TypeScript types alone do
not validate untrusted JSON.

The fixed v1 recipe uses:

- Seed `klurigo-critters-v1`; explicit variants and probabilities `100`/`0`.
- No animation, flip, rotation, or translation; scale `1`, border radius `0`.
- Fixed ink `#1e293b`, solid colors, and the artwork's original 100 × 100 view box.
- A shared, once-constructed `Style` and no SVG ID randomization.

`renderCrittersAvatarV1(configuration)` returns SVG markup for inspection/testing.
`getCrittersAvatarV1DataUri(configuration)` returns an encoded SVG image URI for
an `<img>`. Use the image URI for display: its separate SVG document isolates
internal IDs. Do not repeatedly inline the raw SVG into the same HTML document.
Supply the `<img>` element's accessible `alt` text and desired dimensions.

Treat artwork, catalog, and rendering recipe as a versioned unit. Review any
dependency or artwork update against the existing fixtures. Do not regenerate
golden snapshots simply to make an unexplained appearance change pass.

## Account Editor And Persistence

Signed-in local and Google users can build an avatar in `/profile/settings`.
The editor uses Klurigo's shared controls and supports Body, Face, Head, Pattern,
and Colors, plus Randomize, Save avatar, and Discard changes. Changes remain local
until Save. Discard restores the latest loaded saved design, not a deletion.

`PUT /api/profile/user/avatar` accepts and returns the complete v1 configuration.
It uses user scope, `Authority.User`, and principal-derived ownership. Invalid
metadata returns the existing HTTP 400 error format. `GET /api/profile/user`
returns optional `avatar` metadata, absent until explicitly saved. Other profile
updates and Google account synchronization preserve it.

The editor preserves drafts after failed saves and background refetches, protects
unsupported saved data, and scopes query state to the authenticated account.
Local/Google API integration and a real browser save/reload/fresh-session flow
cover persistence; desktop and 320px/390px mobile inspection covers the UI.

## Profile And Navigation Display

`GET /api/users/:userId/profile` includes optional avatar metadata alongside the
existing public nickname and statistics. It still requires user scope and
`Authority.User`; email, names, authentication-provider details, and other private
account fields are not exposed.

The profile summary uses `PlayerAvatar` at responsive sizes of 96px/112px/128px.
Desktop/tablet navigation shows the current account's avatar in the profile
button. The Profile menu entry shows a 32px avatar on all devices, while mobile
keeps the existing hamburger trigger. Avatars retain their colors instead of
receiving the navigation glyph's white filter.

The current-user snapshot carries avatar metadata. Internally, a null avatar
records confirmed absence; older snapshots without the field are hydrated once
for the current token. Navigation checks the snapshot's account ID before using
it, and missing/unsupported metadata renders `DEFAULT_CRITTERS_AVATAR_V1` locally.
This is the same friendly Critter offered as the editor's initial draft. Profiles,
navigation, and the editor therefore share one consistent default. Displaying it
does not create a saved avatar, overwrite unsupported metadata, or make an API
write; an account still has no persisted avatar until the player explicitly saves.

A successful avatar save updates that snapshot immediately and invalidates the
owner's profile query, retaining the cached quiz data. Details saves preserve a
newer avatar. Older hydration responses cannot overwrite a save, restore a
cleared account, or clear a newer account's snapshot.

Phase 2 verification includes authenticated HTTP tests for exact metadata and
access/privacy boundaries, plus desktop/mobile browser flows through save,
cached-profile navigation, and fresh login. Chrome DevTools inspection covered
the running application at 1440px, 768px, and 390px, and isolated missing,
unsupported, long-nickname, and multiple-avatar cases at 320px. SVGs remain local
image documents, with no external avatar requests. Temporary test services used
isolated ports and test databases and were stopped after verification.

## Inspect And Verify

Run commands from the repository root:

```sh
yarn workspace @klurigo/common build
yarn workspace @klurigo/klurigo-web storybook
```

Open **Experiments → Avatars → Critters v1 → Local Rendering**, or visit:

```text
http://localhost:6006/iframe.html?id=experiments-avatars-critters-v1--local-rendering&viewMode=story
```

The proof lets developers select reference designs and repeat rendering. It
displays all component variants, explicit None examples, and image sizes from
24px to 180px. These controls are a development laboratory, not a player editor.

```sh
yarn workspace @klurigo/klurigo-web test:unit src/utils/avatar/critters-v1.test.ts
yarn workspace @klurigo/klurigo-web typecheck
yarn workspace @klurigo/klurigo-web lint
yarn workspace @klurigo/klurigo-web build
yarn workspace @klurigo/klurigo-web build-storybook
yarn workspace @klurigo/klurigo-web measure:avatar-bundle
```

The tests verify the original artwork checksum, shared catalog agreement, four
complete SVG snapshots after metadata round-trip, every variant, all eight
optional-feature combinations, every valid body/accent pair, all backgrounds,
latent color preservation, and rendering without `fetch` or `Math.random`.

## Phase 0 Measurements And Browser Verification

Verified on 2026-11-14 with Node.js 24.18.0, Vite 8.3.6, and Chromium 156:

- The standalone production measurement contains the renderer, local definition,
  adapter, and tree-shaken shared imports: **261,548 bytes / 34,332 bytes gzip**.
  The measurement config builds in memory and leaves application entries alone.
  This is a standalone cost, not a measured application bundle delta.
- Artwork alone is **53,270 bytes / 4,975 bytes gzip**.
- After 100 warm-up renders, five batches of 1,000 mixed-body renders using the
  built module took a median **0.16 ms per SVG + encoded image URI** in desktop
  Chromium. The equivalent Node.js probe measured about **0.21 ms**. These omit
  DOM layout/image decoding and are observations, not mobile performance limits.
- The production Storybook proof was visually inspected at **1440 × 1000**,
  **390 × 844**, and **320 × 740**. Checked preview, small-size legibility,
  mixed-avatar display, variant grids, labels, focus, and overflow. Corrected a
  Storybook width constraint and preview alignment during inspection.
- All **93** proof images decoded successfully as local data URIs. Reference
  switching and repeat rendering worked with Chromium's network set to Offline
  after initial page load. Keyboard Tab/Enter activated the repeat control with
  visible focus, and the image URI remained identical.
- Network inspection showed only local Storybook resources and SVG data URIs;
  console inspection found no errors or warnings in the final proof session.

The foundation reuses the style instance but introduces no persistent thumbnail
cache. Measure real editor and game-list workloads before adding caching or
virtualization. When integrating into a deployment with a content security
policy, ensure its image policy permits the chosen `data:image/svg+xml` path;
this verification covered the local production build, not a production system.
