# Player Avatars: Design And Roadmap

> **Status:** Phases 0 and 1 completed; profile/navigation and game integration
> remain planned. See [current rendering documentation](../features/player-avatar-rendering.md)
> for the delivered foundation and verification results.
>
> **Plan boundary:** This document records the agreed direction, investigation
> findings, proposed implementation, and future milestones. It does not describe
> shipped avatar behavior. Use the [documentation index](../README.md) and source
> code for current behavior. Update milestone status as work is delivered.

## Goal And Agreed Direction

Let players build cute, customizable avatars and persist their designs exactly
so they can reopen and edit them later. Begin with one saved avatar per signed-in
account, then integrate avatars into profile and game surfaces in later phases.

The agreed direction is:

- Use **DiceBear Critters**, the preferred visual style from the investigation.
- Check a fixed copy of the artwork definition into the Klurigo repository.
- Render from local assets in the frontend. Editing and display must not fetch
  artwork, scripts, or generated images from DiceBear or another avatar service.
- Persist explicit component and color metadata in Klurigo's database.
- Preserve the player's exact design across reloads, sign-ins, devices, and
  future application updates.
- Support local and Google accounts in the first delivery milestone.
- Deliver the editor and account persistence first; wider display integration
  follows separately.

Paths, DTO names, endpoint details, and phase ordering below are proposals unless
explicitly identified as agreed requirements. Later phases are roadmap items,
not commitments to implement every extension.

## Readiness And Implementation Gates

The pre-implementation audit confirmed that the local-rendering approach is
feasible. Phase 0 subsequently completed the local integration proof. These gates
track the boundary before persisting production avatar configurations:

1. **Frontend integration — verified in Phase 0:** local JSON imports with
   `resolveJsonModule`, strict TypeScript compilation, application and Storybook
   production builds, and actual `<img>` rendering passed. Check deployed image
   restrictions when integrating into a deployment.
2. **Versioned recipe — delivered in Phase 0:** the exact artwork, shared catalog,
   pinned renderer, fixed options/seed, and regression fixtures now live together
   in the repository. Phase 1 must reuse this adapter for both editor preview and
   saved-avatar display.
3. **Complete validated persistence:** settle required-nullable field semantics
   and the concrete request class before exposing the save endpoint. Save the
   editor's complete configuration, never the renderer's resolved output.
4. **Account and draft isolation:** scope the self-profile cache by authenticated
   user ID and define draft synchronization before wiring editor state to queries.
   A background profile refetch must not silently replace unsaved choices.

Phase 0 below owns the frontend and rendering proof. Phase 1 owns the persistence
and editor integration gates. Future game snapshot semantics and guest behavior
do not block the account-editor milestone.

## Investigation Findings

### Existing Klurigo Integration Points

At the time of investigation:

- The user schema and shared profile DTOs have no avatar field.
- `/profile/settings` edits the authenticated user's details. Local and Google
  accounts have different permitted profile fields.
- The self-profile API uses `GET` and `PUT /api/profile/user`, requires user scope
  and `Authority.User`, and derives the target account from the principal.
- The general profile update service also invokes email-verification logic.
  A dedicated avatar save operation can avoid coupling avatar edits to that flow.
- The frontend loads self-profile settings with the `['myUserProfile']` query key.
- `UserContextProvider` stores a selected subset of profile fields in browser
  storage. That snapshot is not the authoritative persistence mechanism for an
  avatar, and extending it is only necessary when a consuming surface needs it.
- The desktop profile-menu button uses a static `avatar.svg`.
- The user-profile page displays nickname and statistics without an avatar.
- The API called the public-profile API is authenticated; its name does not imply
  anonymous access. Adding avatars must preserve that access boundary.

Relevant source references:

| Area                         | Source                                                                                                                                                                                                                                                                                                                                           |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Shared profile contracts     | [`common/src/models/user.ts`](../../packages/common/src/models/user.ts)                                                                                                                                                                                                                                                                          |
| Backend user contracts       | [`user.types.ts`](../../packages/klurigo-service/src/app/shared/user/user.types.ts)                                                                                                                                                                                                                                                              |
| Persistence                  | [`user.schema.ts`](../../packages/klurigo-service/src/modules/user/repositories/models/schemas/user.schema.ts), [`user.repository.ts`](../../packages/klurigo-service/src/modules/user/repositories/user.repository.ts)                                                                                                                          |
| Self-profile API and mapping | [`user-profile.controller.ts`](../../packages/klurigo-service/src/modules/user/controllers/user-profile.controller.ts), [`user.service.ts`](../../packages/klurigo-service/src/modules/user/services/user.service.ts), [`user-profile.response.ts`](../../packages/klurigo-service/src/modules/user/controllers/models/user-profile.response.ts) |
| Settings                     | [`ProfileSettingsPage`](../../packages/klurigo-web/src/pages/ProfileSettingsPage/)                                                                                                                                                                                                                                                               |
| Self-profile client          | [`auth.resource.ts`](../../packages/klurigo-web/src/api/resources/auth.resource.ts)                                                                                                                                                                                                                                                              |
| Current-user snapshot        | [`UserContextProvider.tsx`](../../packages/klurigo-web/src/context/user/UserContextProvider.tsx)                                                                                                                                                                                                                                                 |
| Profile menu                 | [`Page.tsx`](../../packages/klurigo-web/src/components/Page/Page.tsx)                                                                                                                                                                                                                                                                            |
| Profile display              | [`UserProfilePageUI.tsx`](../../packages/klurigo-web/src/pages/UserProfilePage/components/UserProfilePageUI/UserProfilePageUI.tsx)                                                                                                                                                                                                               |

### Critters Capabilities

The investigation inspected the Critters definition published with DiceBear
styles `10.6.0`. Phase 0 vendors that definition unchanged and pins the core
renderer to `10.6.0`; the styles package is not a runtime dependency.

| Feature                 | Choices in the inspected definition                             |
| ----------------------- | --------------------------------------------------------------- |
| Body                    | 14 shapes, including round, blob, dome, block, and bell         |
| Head decoration (`top`) | 15 variants, including horns, ears, antennae, crown, and sprout |
| Eyes                    | 19 variants                                                     |
| Mouth                   | 19 variants                                                     |
| Pattern                 | 10 variants                                                     |
| Cheeks                  | 3 variants: blush, large blush, and freckles                    |
| Colors                  | Body, accent, background, and a fixed ink color                 |

Head decorations, patterns, and cheeks can be absent. The definition uses
probabilities for their default presence, so merely saving their variant names
does not reliably preserve a design. Explicit presence or absence is required.
The accent palette declares that accent and body colors should differ; the
editor and backend should enforce the same rule for explicit selections.

Critters also supports animation. The initial proposal disables animation and
fixes ink color, framing, and transformations rather than exposing them as
player choices.

The artwork is **CC0 1.0**. Preserve its provenance and license locally. The core
rendering library has its own license; retain the applicable dependency notices
when selecting and distributing it.

Other investigated directions included Adventurer and Big Smile cartoon people,
Bottts robots, and bespoke Klurigo characters. Critters was selected by the user;
multiple avatar styles and original artwork are not first-phase requirements.

### Pre-Implementation Audit Evidence

A temporary Node.js probe outside the repository tested `@dicebear/core@10.6.0`
with the inspected Critters definition. No application dependency or artwork was
added as part of that probe.

- The core package is MIT-licensed, pure ESM, has no declared runtime dependencies,
  and requires Node.js 22 or newer, compatible with Klurigo's Node.js 24 toolchain.
- The inspected minified definition is 53,270 bytes (4,975 bytes gzipped). This is
  artwork size only, not the final frontend bundle cost.
- Its SHA-256 is
  `df67e34f221589c4949d989996008158d6cdfdcd4149ff92297c51077ca59e9e`.
  Record the actual imported file's checksum separately if formatting changes it.
- The probe covered 233 configurations: the example design, every component
  variant independently, all eight optional-feature presence combinations, all
  132 distinct body/accent palette pairs, and all 12 background palette choices.
- Each configuration was rendered with three seeds and repeated with the same
  options. Component selections and used colors matched the inputs. Output was
  identical for a fixed recipe; changing the seed changed internal SVG ID
  suffixes but not the normalized component markup in these cases.
- The probe disabled `fetch` after loading the definition, before constructing
  the style and rendering. The definition's `$schema` and provenance URLs did
  not trigger fetches. Inspected content uses local SVG fragment references;
  tested static output emitted no animation styles, image, script, or
  foreign-object elements.

This is evidence for the adapter strategy, not exhaustive testing of all
combinations, a browser/network audit, a Vite build, or a completed Phase 0.
Repository-owned regression fixtures must reproduce the important checks during
implementation.

Two renderer behaviors are particularly important:

- Use v10's `Style`/`Avatar` API and scalar `bodyVariant`, `eyesVariant`, and
  equivalent options. Set component probabilities explicitly to `100` or `0`,
  select `animationVariant: 'none'`, and fix ink color and transformations. Use a
  fixed internal seed such as `klurigo-critters-v1` and disable ID randomization
  for the image-isolated recipe. Do not infer the v10 API from older DiceBear
  examples.
- `Avatar.toJSON().options` is diagnostic output, not a supported round-trip
  configuration. It includes internal transform fields and can omit a color
  when no selected component uses it. Save latent choices such as accent color
  even while their associated decoration is hidden, so toggling a feature back
  on restores the player's choice.

## Local Artwork And Rendering

Proposed asset layout:

```text
packages/klurigo-web/src/assets/avatars/critters/v1/
  definition.json
  LICENSE.txt
  README.md
```

The definition contains the SVG components, palettes, and assembly rules. Record
the upstream version, source URL, import date, and local modifications in the
adjacent README. Commit the actual definition, not a URL that the application
resolves at runtime.

Use a pinned DiceBear core dependency bundled into the frontend to assemble the
local definition. Installing a build dependency is distinct from fetching avatar
content at runtime. Import only the local Critters definition; do not depend on
the styles package to supply changing artwork or load a remote script/CDN.

Keep a small Klurigo-owned adapter between the saved configuration and the
renderer. It must explicitly select each component, force optional-feature
presence to on/off, and fix all other visual defaults. Prefer an image generated
from the local SVG, such as an `<img>` with a data URI, to isolate SVG IDs across
multiple avatars. Verify compatibility with the application's image policy.

Keep framework-independent DTOs and allowed-value catalogs in `@klurigo/common`.
Keep SVG artwork and rendering code in the web package; the backend needs to
validate metadata, not render images. Avoid duplicating component catalogs
without a consistency check against the checked-in artwork.

No image upload, object store, generated-image service, or external avatar API is
needed for the first phase.

## Persistence And Exact Reproduction

### Proposed Configuration

Store a typed optional `avatar` subdocument on the user record. An illustrative
configuration is:

```json
{
  "version": 1,
  "style": "critters",
  "artworkVersion": "v1",
  "body": "round",
  "top": "horns",
  "eyes": "happy",
  "mouth": "tinySmile",
  "pattern": "dots",
  "cheeks": "blush",
  "bodyColor": "#c4b5fd",
  "accentColor": "#fcd34d",
  "backgroundColor": "#4338ca"
}
```

This is a proposed Klurigo contract, not DiceBear's raw options format.

- `version` identifies the metadata contract; `artworkVersion` identifies the
  immutable artwork and rendering recipe used to interpret it.
- Every configurable field is required within a saved configuration. Use `null`
  for absent `top`, `pattern`, or `cheeks`; omission must not mean “random.”
- Use explicit variant identifiers and canonical colors from the supported
  catalog. Validate color relationships as well as individual allowed values.
- Do not accept arbitrary SVG, image URLs, renderer option bags, probabilities,
  or weighted/random variant arrays as persisted player input.
- A seed is not a substitute for the selected parts. If the renderer still needs
  one internally, use a deterministic recipe and verify that no visible choice
  remains seed-dependent for this contract.
- Randomize resolves a complete valid configuration in the editor. Save those
  resolved choices, not a seed or an instruction to randomize again.
- Keep the complete editor configuration as the source of truth, including
  colors unused by the currently visible parts. Do not reconstruct it from SVG
  output or `Avatar.toJSON()`.

An account without a saved avatar remains valid. Render a stable placeholder and
offer a starting design in the editor, without silently saving it. The optional
field should avoid a required backfill for existing users.

### Compatibility Rules

The exact-design requirement covers the selected components, colors, presence,
framing, and static appearance. It does not require byte-identical SVG output or
identical anti-aliasing across browser engines.

1. Treat shipped artwork versions as immutable. New artwork creates a new
   version; existing avatars retain access to their original assets.
2. Preserve the corresponding rendering recipe, including fixed defaults.
   Versioning metadata alone does not preserve appearance.
3. Pin the renderer dependency and review upgrades with representative saved
   configurations and visual-regression fixtures. Keep a compatible rendering
   path if a new renderer cannot reproduce an older recipe.
4. Do not automatically migrate saved avatars just because artwork or dependency
   versions change. Any future migration must explicitly address appearance and
   continued editability.
5. Reject unsupported versions on writes. On reads, preserve unknown saved data
   and display a fallback/unavailable state without replacing the saved design.
6. Coordinate frontend/backend rollout so the editor only offers versions the
   backend accepts and the deployed frontend can render.

### Proposed API

- Extend `GET /api/profile/user` to return the optional avatar configuration.
- Add `PUT /api/profile/user/avatar` to replace the authenticated user's complete
  avatar configuration and return the saved configuration.
- Require the existing user scope and `Authority.User`; derive ownership from
  the principal rather than accepting a target user ID in the request body.
- Validate the nested contract, style/version, every variant, colors, and
  optional-feature semantics. Follow existing Swagger and transport DTO patterns.
- Use a concrete request class in the controller. Klurigo's global validation
  pipe skips `Object` metatypes, so an interface/union-only body would not provide
  the required validation. The pipe validates a transformed copy but returns the
  original payload; do not rely on transformations to normalize saved colors.
  Require canonical palette values or normalize explicitly in the avatar flow.
- For `top`, `pattern`, and `cheeks`, accept `null` but reject a missing field.
  `@IsOptional()` alone would skip both null and missing values; validate the
  required-nullable distinction deliberately. Document nullability in Swagger.
- Update only the avatar and normal update timestamp. Other profile edits and
  Google sign-in synchronization must preserve the saved avatar.
- Put the optional avatar on the base user schema shared by authentication
  discriminators. Use an explicit subdocument without an autogenerated `_id` or
  default empty object. Replace the whole avatar atomically while preserving
  null component values. Omit `avatar` from unrelated updates: the repository
  explicitly converts `undefined` update fields into `$unset` operations.
- Refresh/update the self-profile query after save. Extend current-user context
  only when needed, ensuring profile-field replacement does not drop the avatar.
- Replace the account-agnostic settings key with a user-scoped key such as
  `['myUserProfile', userId]`; enable it only for the matching authenticated user.
  Reset editor state on account changes and scope save completion/cache updates
  to the account that initiated them.

The proposed initial concurrency policy is last successful save wins for the
whole configuration. There should be no partial merging of different designs.
Avatar removal and a corresponding API operation remain open product decisions;
discarding an editor draft is not deletion of a saved avatar.

## Editor Experience

Place an Avatar section on `/profile/settings`, with an independent save action
available to both local and Google accounts.

- Show a large live preview and visual categories: Body, Face, Head, Pattern,
  and Colors. Group cheeks with face controls.
- Use thumbnails showing choices on the current character, explicit None
  choices for optional components, and a curated color palette.
- Prevent equal body/accent combinations without silently changing another
  selected color; for example, disable the conflicting swatch with an explanation.
  Randomize must choose a valid pair, and both editor and backend must enforce
  the same constraint.
- Provide Randomize, Save avatar, and Discard changes. Changing one part must
  preserve the others; randomization is an explicit action.
- Keep draft state separate from the saved configuration. Editing does not write
  to the server until Save; discard restores the saved design.
- Initialize the draft when the account's saved configuration loads. Background
  refetches may refresh an untouched draft, but must not overwrite a dirty draft.
  A successful save establishes a new baseline; Discard uses the latest loaded
  saved configuration. Resetting a draft must not leak choices between accounts.
- Disable duplicate saves while saving. Show success only after persistence
  succeeds, and retain the draft with a retry path after failure.
- Handle initial loading and load failures explicitly rather than opening an
  empty editor that could overwrite an existing design.
- On desktop, place preview beside controls. On mobile, place it above them and
  keep actions reachable without clipping or horizontal overflow.
- Support labeled keyboard-operable choices, visible focus and selected states,
  and color labels that do not rely on color alone.

## Delivery Roadmap

### Phase 0 — Local Rendering And Compatibility Proof

**Status:** completed on 2026-11-14. This prepares the first user-facing milestone.

- Import the versioned artwork with local license and provenance records.
- Verify the pinned core renderer with the repository's Vite/TypeScript setup.
- Verify explicit component selection, presence/absence, palette constraints,
  fixed framing, and disabled animation.
- Measure the actual bundle impact with only Critters imported; evaluate preview
  and thumbnail rendering cost before choosing memoization or lazy loading.
- Establish the versioned catalog, adapter recipe, and representative fixtures.

**Exit:** the same complete configuration renders predictably from repository
assets, including when external avatar domains are blocked.

Delivered artifacts:

- Local immutable Critters v1 definition, licenses, provenance, and checksum.
- Shared `CrittersAvatarConfigurationV1` and component/palette catalogs, without
  adding avatar fields to user-profile contracts.
- A fixed local renderer and image-URI adapter, plus four SVG golden fixtures.
- Ten focused regression tests covering catalogs, round-trips, every variant,
  optional components, palettes, and local deterministic rendering.
- A production-built Storybook proof inspected at desktop and mobile sizes,
  including 320px constrained layouts and offline rendering interactions.
- A reproducible standalone bundle measurement command; measured about 34 KB
  gzipped and about 0.16 ms per generated image URI in desktop Chromium.

See [player avatar rendering](../features/player-avatar-rendering.md) for exact
source paths, commands, measurement conditions, browser results, and remaining
deployment considerations. Phase 1 completed on 2026-11-14.

### Phase 1 — Account Editor And Persistence

**Status:** completed on 2026-11-14. This is the first user-facing milestone.

- Add shared contracts/catalogs, backend user types/schema, response mapping,
  validated save endpoint, and client API support.
- Build reusable `PlayerAvatar` and `AvatarEditor` components and integrate them
  into settings with draft, save, discard, randomize, and recovery states.
- Cover existing accounts without avatars and both supported sign-in providers.
- Verify persistence after reload, sign-out/sign-in, and a fresh browser session.

**Exit:** a signed-in player can design a Critter, save it, and reopen exactly
that design for editing from another authenticated session/device. Its first
display surface is settings; broader profile/game display is a later milestone.

### Phase 2 — Profile And Navigation Display

**Status:** future proposal; follows the editor/persistence milestone.

- Add avatars to the user-profile summary and appropriate navigation surfaces.
- Extend the authenticated public-profile response with the avatar configuration,
  preserving the existing access boundary and excluding private profile data.
- Decide which desktop/mobile navigation surfaces benefit from avatar display.
- Update shared current-user state/query invalidation as needed for immediate
  refresh after saving, plus stable placeholders for users without avatars.
- Verify small-size legibility, fallback states, and multiple SVGs on one page.

**Exit:** supported profile/navigation surfaces consistently render the saved
design and update after a successful save.

### Phase 3 — Game Identity Integration

**Status:** future proposal; contracts and behavior require a separate audit.

- Identify approved surfaces such as the lobby, player lists, leaderboards,
  podium, and game results, including host and participant views.
- Decide whether games snapshot the avatar at join time or follow profile edits.
  Prefer an explicit decision before changing participant persistence or events;
  historical results and in-progress games may need different semantics.
- Carry the necessary configuration through game models, API responses, and SSE
  events/snapshots. Verify reconnect/reload behavior and payload cost.
- Retain usable placeholders for guest players and old games without avatar data.

**Exit:** the selected game surfaces render identities consistently through join,
reconnect, completion, and later result viewing under the chosen snapshot policy.

### Phase 4 — Optional Extensions

**Status:** exploratory backlog; requires product prioritization.

- Guest editing and browser-persisted designs, including transfer to an account.
- Explicit avatar removal/reset and any desired reset-to-default behavior.
- Additional artwork versions or customization choices, with compatibility rules.
- Animation, only after motion preferences, performance, and game readability
  have been considered.

Multiple saved avatars, uploads, downloadable images, and a bespoke Klurigo style
are not requirements established by this investigation.

## Validation And Acceptance

For implementation, follow the repository's [testing guidance](../development/testing.md),
[development commands](../development/commands.md), and required
[browser verification](../development/browser-verification.md).

- **Contracts:** test allowed variants/colors, invalid versions, invalid nested
  payloads, missing versus null components, unknown fields, canonical color
  handling, and catalog consistency with local artwork.
- **Rendering:** test complete deterministic configurations and optional-feature
  on/off behavior; maintain meaningful visual fixtures for upgrade review.
- **Persistence/API:** test authorization and ownership, exact save/load
  round-tripping, absent avatars, preservation through unrelated profile updates
  and Google sign-in, and no email-verification side effects from avatar saves.
- **Editor:** test independent part changes, complete valid randomization,
  latent color preservation, discard, save-in-flight behavior, load errors,
  background-refetch draft preservation, account changes, and failed-save retries.
- **End to end:** save, reload, reopen, and authenticate in a fresh session;
  verify account isolation and saved-design equality.
- **Runtime independence:** block DiceBear and external avatar/CDN requests while
  editing, displaying, saving, and reopening. Inspect the network panel to
  confirm the avatar feature makes no such requests.
- **Visual/accessibility:** inspect actual desktop and mobile UI, including
  constrained widths, keyboard navigation, overflow, focus, palette selection,
  and reachable controls. Inspect console errors and failed requests.
- Run the relevant workspace lint, type checks, and tests. Browser inspection is
  an additional quality gate, not a substitute for these checks.

As phases ship, add current-system documentation under `docs/features/` and link
it from the index. Keep this document as design history and the remaining
roadmap rather than treating unfinished proposals as current behavior.

## Decisions Still Needed

- Phase 1 request/response DTO names and endpoint details. Phase 0 established
  the v1 configuration, local asset layout, renderer version, and recipe.
- Initial palette and starting presets; whether to expose all inspected variants.
- Whether saved-avatar removal belongs in the first milestone or a later phase.
- Exact profile/navigation and game display surfaces.
- Game snapshot versus live-profile semantics and historical-results behavior.
- Whether and when guest editing, multiple designs, or animation are valuable.

## External Research References

These are provenance and investigation references, not runtime dependencies:

- [Critters style and license](https://www.dicebear.com/styles/critters/)
- [Inspected Critters definition, styles 10.6.0](https://cdn.hopjs.net/npm/@dicebear/styles@10.6.0/dist/critters.min.json)
- [DiceBear JavaScript renderer](https://www.dicebear.com/integrations/javascript/)
- [Style option descriptors](https://www.dicebear.com/customize/style-options/)
- [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/)
