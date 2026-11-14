# Critters Artwork v1

This directory vendors DiceBear's Critters SVG definition. Application rendering
uses this checked-in file and the bundled renderer, with no runtime requests to
DiceBear. The URLs in its metadata are provenance, not resources to fetch.

- Creator: DiceBear
- Source: <https://www.dicebear.com/styles/critters/>
- Upstream package: `@dicebear/styles@10.6.0`
- Original file: <https://cdn.hopjs.net/npm/@dicebear/styles@10.6.0/dist/critters.min.json>
- Imported: 2026-11-14
- Artwork license: CC0 1.0 Universal; see `LICENSE.txt`.
- Local changes: none; `definition.json` retains the upstream bytes.
- SHA-256: `df67e34f221589c4949d989996008158d6cdfdcd4149ff92297c51077ca59e9e`
- Renderer: `@dicebear/core@10.6.0`, MIT; see `RENDERER-LICENSE.txt`.

The v1 adapter lives in `src/utils/avatar/critters-v1.ts`. Its shared catalog and
configuration are in `@klurigo/common`. Regression tests check the artwork hash,
catalog agreement, optional-feature behavior, and complete SVG fixtures.

Treat this artwork and its rendering recipe as immutable after release. Changes
to artwork, framing, or visual defaults require a new version or demonstrated
backward compatibility. Do not refresh this file as part of install or build.

See [the feature roadmap](../../../../../../../docs/plans/player-avatars.md)
for scope and delivery milestones.
