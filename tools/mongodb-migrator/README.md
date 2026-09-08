# mongodb-migrator

A CLI tool for parsing, transforming, and rewriting MongoDB `.bson` and `.metadata.json` dump files. This tool is useful when migrating data between schema versions or renaming collections prior to import with `mongorestore`.

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

* Collection `players` → `users`
* Transformed with default fields like `givenName`, `authProvider`, `createdAt`, etc.

If a collection is not handled explicitly, it will be skipped.

You can extend the `transformOriginalDocument()` function in `src/index.ts` to add your own rules.

## 🧱 Metadata

The tool auto-generates metadata for known collections like:

* `users`
* `games`
* `quizzes`
* `quiz_ratings`
* `tokens`
* `game_results`
* `discovery_snapshots`

UUIDs and index definitions are embedded in `getMetadata()`.

## 📦 Development

All core logic lives in `src/index.ts`.

To extend the tool:

* Add collection mappings in `getTargetCollectionName()`
* Add document transformers in `transformOriginalDocument()`
* Add metadata in `getMetadata()`

## ❓ Example

```bash
mongodb-migrator \
  --inputDir ./input/mongo-dump \
  --outputDir ./output/migrated-dump \
  --dbName quiz_app
```
