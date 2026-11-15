# mongodb-migrator

A CLI tool for parsing, transforming, and rewriting MongoDB `.bson` and `.metadata.json` dump files. This tool is useful when migrating data between schema versions or renaming collections prior to import with `mongorestore`.

`mongodb-migrator` is a private repository workspace tool, not a published
package. Building it creates `dist/index.js`, the entry point used by both the
workspace package and its `mongodb-migrator` command.

## ✨ Features

- Parses raw `.bson` files from a MongoDB dump
- Applies custom transformations to documents
- Supports collection renaming
- Generates `mongorestore`-compatible outputs
- CLI-based for use in pipelines or dev scripts

## 🛠 Usage

Run these commands from the repository root:

### Build the CLI

```bash
yarn workspace mongodb-migrator build
```

### Run directly with ts-node (for development)

```bash
yarn workspace mongodb-migrator start -- --inputDir ./input --outputDir ./output
```

> Note: the second `--` passes arguments to the CLI, not to Yarn.

### Link for global use (optional)

Run the link command from the migrator workspace:

```bash
cd tools/mongodb-migrator
yarn link
```

Now you can use `mongodb-migrator` anywhere:

```bash
mongodb-migrator --inputDir ./input/path/to/mongodb-dump --outputDir ./output/path/to/mongodb-dump
```

You can also specify the output database name:

```bash
mongodb-migrator --inputDir ./input --outputDir ./output --dbName my_database
```

## 📂 Input Structure

Expected files in the input directory:

```
input/
├── players.bson
├── players.metadata.json
├── games.bson
├── games.metadata.json
```

## 📤 Output Structure

Generated output (by default under `output/klurigo/`):

```
output/
└── klurigo/
    ├── users.bson
    ├── users.metadata.json
    ├── games.bson
    ├── games.metadata.json
```

This structure is compatible with:

```bash
mongorestore --dir=output
```

## 🔁 Document Transformations

Documents are transformed collection-by-collection. Example:

- Collection `players` → `users`
- Transformed with default fields like `givenName`, `authProvider`, `createdAt`, etc.

If a collection is not handled explicitly, it will be skipped.

You can extend the `transformOriginalDocument()` function in `src/index.ts` to add your own rules.

## Avatar Backfill

The **existing migration command** preserves avatars through its normal
collection transformers and cleanup. A temporary missing-avatar patch runs after
those steps for the initial backfill. There is no separate migration command.

```bash
yarn workspace mongodb-migrator build
node tools/mongodb-migrator/dist/index.js --inputDir ./input --outputDir ./output
```

The patch covers:

- `users.avatar`, for accounts and legacy anonymous user records.
- `games.participants[].avatar`, including hosts and players.
- Avatar snapshots in current and previous question-result, leaderboard, and
  podium tasks.
- `game_results.hostAvatar` and `game_results.players[].avatar`.
- `quiz_ratings.author.avatar` for anonymous authors. Account-authored ratings
  keep their existing user reference and resolve avatars through that account.

**Only absent fields are filled.** Existing avatar values—including explicit
`null`, incomplete metadata, and unsupported versions—are preserved. The patch
does not replace these fields. Permanent transformer mappings copy existing
avatar values unchanged, and cleanup leaves avatar metadata intact so explicit
null choices cannot be dropped. Other transformation behavior remains unchanged.

After the initial migration, remove the temporary import, backfill call, and its
statistics log from `src/index.ts`, then delete
`src/patches/missing-avatars.patch.ts` and its temporary
`tests/avatar-backfill.test.mjs`. Keep `src/transformers/avatar.transformers.ts`,
the avatar mappings in the collection transformers, and the avatar-preserving
cleanup in `src/utils/bson.utils.ts`. These preserve future avatar data without
generating any new avatars.
The permanent regression tests in `tests/avatar-transformers.test.mjs` do not
depend on the temporary patch and should remain.

### Historical Consistency

An existing supported account avatar is preferred when filling missing history.
If the account has no supported avatar, an existing historical snapshot can
anchor its missing preference and other history. One lookup per user/player ID
is used for every missing field across all collections. Existing conflicting
snapshots are never overwritten to force uniformity.

When no supported existing design is available, the patch generates complete
Critters v1 choices using SHA-512-derived, identity-seeded randomization. The
same identity receives the same generated design across users, games, results,
and reviews, independently of document order or repeated migration runs. The
complete configuration is written to BSON; rendering does not depend on this
seed. Body and accent colors are distinct, and optional parts retain explicit
nulls.

Identity matching uses stored IDs, including equivalent UUID/ObjectId string
and BSON references. Nicknames and email addresses are not used to guess links.
Different anonymous participant IDs remain different identities. Missing fields
without a usable identity are left untouched and reported in the CLI's skipped
count. The CLI also prints the number of avatar fields added per collection.

### Verification

Build the shared package first when its artifacts are not already available:

```bash
yarn workspace @klurigo/common build
yarn workspace mongodb-migrator build
node --test tools/mongodb-migrator/tests/*.test.mjs
```

The tests cover missing-only updates, preservation of existing metadata,
cross-game identity reuse, existing preference precedence, deterministic
generation, repeat runs, and the existing BSON CLI pipeline. They also verify
that normal transformers and cleanup retain migrated avatars with the temporary
backfill disabled.

## 🧱 Metadata

The tool auto-generates metadata for known collections like:

- `users`
- `games`
- `quizzes`
- `quiz_ratings`
- `tokens`
- `game_results`
- `discovery_snapshots`

UUIDs and index definitions are embedded in `getMetadata()`.

## 📦 Development

All core logic lives in `src/index.ts`.

To extend the tool:

- Add collection mappings in `getTargetCollectionName()`
- Add document transformers in `transformOriginalDocument()`
- Add metadata in `getMetadata()`

## ❓ Example

```bash
mongodb-migrator \
  --inputDir ./input/mongo-dump \
  --outputDir ./output/migrated-dump \
  --dbName quiz_app
```
