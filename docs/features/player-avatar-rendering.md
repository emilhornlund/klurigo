# Player Avatars

Klurigo uses locally rendered Critters avatars for account profiles, game
participants, rankings, results, and quiz author identities. A complete versioned
configuration determines the appearance; displaying an avatar never requires an
external image service.

## Configuration And Rendering

[`avatar.ts`](../../packages/common/src/models/avatar.ts) defines
`CrittersAvatarConfigurationV1`, `CRITTERS_V1_PARTS`, and `CRITTERS_V1_COLORS`.
The shared package contains contracts and validation utilities, not a renderer.

Every supported configuration contains:

- `version: 1`, `style: 'critters'`, and `artworkVersion: 'v1'`.
- Explicit body, eye, and mouth choices.
- Required-nullable head decoration, pattern, and cheeks. Null means None;
  omission does not mean random.
- Explicit body, accent, and background colors. Body and accent must differ,
  including when the accent is not visible in the selected artwork.

New HTTP writes require complete supported metadata and reject unknown fields,
unsupported versions, invalid catalog entries, and conflicting colors. Shared
request validation and Swagger metadata live under
[`app/shared/avatar`](../../packages/klurigo-service/src/app/shared/avatar/).

The byte-exact Critters definition from `@dicebear/styles@10.6.0`, provenance,
CC0 artwork license, and MIT renderer license are kept in
[`critters/v1`](../../packages/klurigo-web/src/assets/avatars/critters/v1/).
The [local adapter](../../packages/klurigo-web/src/utils/avatar/critters-v1.ts)
uses pinned `@dicebear/core@10.6.0` with a fixed recipe:

- Seed `klurigo-critters-v1` and explicit variant probabilities of 100 or 0.
- No animation, flip, rotation, or translation; scale 1 and SVG border radius 0.
- Fixed ink `#1e293b`, solid colors, and the original 100 × 100 view box.
- A shared style instance and deterministic SVG fragment IDs.

`renderCrittersAvatarV1` returns SVG markup for inspection and testing.
`getCrittersAvatarV1DataUri` supplies an encoded SVG image URI for display.
[`PlayerAvatar`](../../packages/klurigo-web/src/components/PlayerAvatar/) uses
an `<img>` so each SVG document isolates its internal fragment IDs. It supplies
intrinsic dimensions and requires accessible alternative text; an empty `alt`
is appropriate when adjacent text already names the person.

Frame thickness follows the responsive avatar dimensions, keeping compact
portraits visible while capping large frames at 3px. The shared avatar sizing
mixin keeps responsive geometry and frame calculation aligned. Consumer styles
retain ownership of layout and responsive dimensions.

Treat artwork, catalogs, and recipe as an immutable versioned unit. Review
changes against the existing golden fixtures rather than regenerating snapshots
to conceal unexplained appearance changes. Rendering performs no network fetch
or random selection. Animation is a separate proposal in the
[avatar roadmap](../plans/player-avatars.md).

## Defaults And Historical Data

`DEFAULT_CRITTERS_AVATAR_V1` is the stable starter and display fallback.
`resolveGameAvatarSnapshot` copies supported public fields or returns a copy of
that default. It strips persistence internals without modifying the source.

Historical participant, task, result, and anonymous-review storage may omit
avatar metadata or contain unsupported versions. Read boundaries resolve these
values to a complete supported design. No backfill or read-time rewrite is
performed. Version-tolerant snapshot storage also prevents unrelated game
updates from failing on an older or unsupported avatar.

Every identity response includes a complete avatar, including account creation,
account profiles, and public profiles. Missing or unsupported stored preferences
return the stable default without creating or rewriting a saved preference.

## Account Settings And Public Profiles

Local and Google accounts can customize their avatar in `/profile/settings`.
The controlled editor offers Body, Face, Head, Pattern, Colors, and Randomize.
The form owns its draft, Save avatar, and Discard changes. Discard restores the
latest loaded saved design; it does not delete the preference.

`PUT /api/profile/user/avatar` accepts and returns the complete configuration.
It requires user scope and `Authority.User`, derives ownership from the signed
principal, and uses the existing HTTP 400 validation format. Other profile
updates and Google account synchronization preserve the saved avatar.

The settings page reconciles the initiating account's profile cache and
current-user snapshot after a successful save. It cancels stale profile reads,
preserves sibling form drafts, and ignores responses after account changes or
unmounting. Failed saves retain the exact draft for retry. Details saves retain
a newer avatar rather than restoring stale response metadata. Current-user
hydration cannot overwrite a newer save or restore a cleared account.

`GET /api/profile/user` exposes the resolved account avatar.
`GET /api/users/:userId/profile` exposes the resolved avatar alongside
the existing public nickname and statistics. Public responses do not include
email, private names, or authentication-provider details; their existing scope
and authority requirements remain in place.

The profile summary uses responsive 96px/112px/128px portraits.
Desktop/tablet navigation displays the current account's avatar in its profile
button. The Profile menu entry includes a 32px avatar, while mobile retains the
hamburger trigger. Navigation verifies the cached account ID before using its
avatar. Newly hydrated current-user snapshots always contain the resolved
configuration; older snapshots without the field are hydrated through the
existing profile request. Avatar images retain their colors instead of receiving
icon filters.

## Joining And Account Preferences

The join page previews the design submitted alongside the nickname in the
existing game-join request. **Every new join requires a complete avatar.**
There is no separate profile-avatar save request or save-before-join workflow.

Accounts start from their saved/default design; guests start from a valid random
draft. Applied drafts are stored by game, participant, and account/guest context
and retained across reloads and failed joins. The original join form, nickname
validation, login prompt, and error handling remain the surrounding flow.

The 160px/176px/192px responsive portrait is the customization trigger. Its
dialog uses the shared editor on a neutral surface. Part/color edits and
Randomize remain local until Use design applies them to the join draft.
Discard, Escape, and backdrop dismissal leave the applied draft unchanged;
closing restores focus to the trigger. Editing does not join the game or write
an account preference.

On the first accepted join, the existing game lock protects the copied
participant snapshot. Repeated joins and reconnects preserve that accepted
identity. The existing player-join listener saves nickname and avatar preferences
for Local/Google accounts on a best-effort basis. Anonymous participants do not
write account avatar preferences. Preference-update failure does not undo an
accepted game snapshot. The frontend updates its matching current-user snapshot
after successful joining.

Game details expose only the requesting participant's accepted identity, when
present, so the join page can resume an existing game. Game credentials do not
gain profile-write permissions. Existing IDs, role checks, nickname uniqueness,
capacity, and game access rules remain unchanged.

## Game-Time Identities And Durable Results

Game creation copies the host's saved/default avatar into the host participant.
Player acceptance copies the submitted design. Later profile changes affect
future games and account-facing surfaces, not those accepted game identities.
Hosts retain their existing ownership role and remain outside player scoring.

REST player lists and identity-bearing SSE events provide complete resolved
avatars. Live publication and initial/reconnect recovery use the same event
builders. Player-visible events preserve their existing identity boundaries;
avatars do not expose additional account identifiers or private profile data.

Question-result and leaderboard task entries retain their own avatar snapshots.
Historical task entries resolve the accepted participant snapshot when available,
otherwise the stable default. Recovery does not require current profile lookups.
Existing ranking, ties, top-five limits, and mode-specific scoring remain intact.

Avatars appear beside existing identities in:

- Host lobby and active-game player management, with visible removal controls.
- Player lobby, game start, result footer, and player-ahead indicator.
- Leaderboard rows, occupied podium positions, and participant game-over views.
- Result summary podium/rankings, host detail, metric winners, and player rows.

The lobbies do not fabricate a host nickname or add a separate host identity
chip. Other-player visibility remains the existing player-count presentation
where applicable. Results player portraits are 40px, matching the desktop
leaderboard. Narrow layouts truncate names while retaining portraits and controls.

Result generation copies accepted host and player avatars into durable storage.
Result responses use those copies, independently of active-game cleanup,
participant removal, or later profile changes, in both game modes. Historical
results resolve missing or unsupported metadata without modifying storage.
History cards retain their existing navigation into the result view.

## Quiz Authors And Reviews

Quiz details and discovery cards include the owner's current account avatar in
their existing author identity. The backend resolves it from the owner already
loaded for the response; the frontend does not fetch profiles for each author.

Review author responses also contain complete resolved avatars. Account reviews
use the current populated account profile, matching their current nickname.
Anonymous reviews capture the accepted participant avatar alongside the stored
nickname and remain renderable after the game is deleted. Historical missing or
unsupported metadata resolves to the stable default without a rewrite.

## Development And Verification

Start Storybook using the [documented commands](../development/commands.md).
Useful isolated surfaces include:

- **Experiments → Avatars → Critters v1 → Local Rendering**: reference designs,
  repeat rendering, all variants, explicit None examples, and size samples.
- **Inputs → AvatarEditor**: controlled customization, color conflicts,
  Randomize, saving, neutral dialog, and undecorated designs.
- Join, profile settings, lobbies, leaderboard, podium, results, quiz details,
  and review stories for integration and constrained-layout inspection.

Golden tests verify the original artwork checksum, shared catalog agreement,
complete metadata round-trips, every variant, optional-feature combinations,
body/accent combinations, backgrounds, and latent color preservation. Backend
tests cover strict writes, ownership/privacy, stable acceptance/reconnects,
durable snapshots, and read-only historical fallbacks. Browser flows cover guest
and account joining, profile saving, failure retry, and fresh-session persistence.

Follow [browser verification](../development/browser-verification.md) at desktop,
tablet, mobile, and constrained widths. Inspect actual images, clipping, controls,
keyboard focus, reduced motion, console errors, and network failures. Run
`yarn validate`, the applicable backend HTTP suites, frontend browser flows, and
the Storybook build as described in the command reference.

### Renderer Measurements

The initial standalone production probe with Node.js 24.18.0, Vite 8.3.6, and
Chromium 156 measured 261,548 bytes / 34,332 bytes gzip for the renderer, local
definition, adapter, and tree-shaken shared imports. Artwork alone measured
53,270 bytes / 4,975 bytes gzip. This is a standalone cost, not an application
bundle delta. Run `yarn workspace @klurigo/klurigo-web measure:avatar-bundle`
to repeat the bundle probe.

After 100 warm-up renders, five batches of 1,000 mixed-body renders took a
median 0.16ms per SVG plus encoded URI in desktop Chromium, and about 0.21ms in
Node.js. These observations omit layout and image decoding. The renderer reuses
the style instance without a persistent thumbnail cache; measure actual editor
and game-list workloads before introducing caching or virtualization.
